import { Prisma, prisma } from '@adventure/database';
import { buildPlayerCombatStats, calculateMaxHp, runCombat } from '@adventure/game-engine';
import { PVP_CONSTANTS, type Combatant, type CombatResult, type SkillType } from '@adventure/shared';
import { AppError } from '../middleware/errorHandler';
import { calculateEloChange } from './eloService';
import { getEquipmentStats } from './equipmentService';
import { spendPlayerTurnsTx } from './turnBankService';
import { degradeEquippedDurability } from './durabilityService';
import { normalizePlayerAttributes } from './attributesService';
import { getHpState } from './hpService';

type AttackStyle = 'melee' | 'ranged' | 'magic';

const REVENGE_WINDOW_DAYS = 7;

// ---------------------------------------------------------------------------
// getOrCreateRating
// ---------------------------------------------------------------------------

export async function getOrCreateRating(playerId: string) {
  const existing = await prisma.pvpRating.findUnique({ where: { playerId } });
  if (existing) return existing;

  return prisma.pvpRating.create({
    data: {
      playerId,
      rating: PVP_CONSTANTS.STARTING_RATING,
      bestRating: PVP_CONSTANTS.STARTING_RATING,
    },
  });
}

// ---------------------------------------------------------------------------
// getLadder
// ---------------------------------------------------------------------------

export async function getLadder(playerId: string) {
  const myRating = await getOrCreateRating(playerId);
  const lowerBound = Math.floor(myRating.rating * (1 - PVP_CONSTANTS.BRACKET_RANGE));
  const upperBound = Math.ceil(myRating.rating * (1 + PVP_CONSTANTS.BRACKET_RANGE));

  // Get active cooldowns for this attacker
  const cooldowns = await prisma.pvpCooldown.findMany({
    where: { attackerId: playerId, expiresAt: { gt: new Date() } },
    select: { defenderId: true },
  });
  const cooldownIds = new Set(cooldowns.map((c) => c.defenderId));

  // Find opponents in bracket
  const candidates = await prisma.pvpRating.findMany({
    where: {
      playerId: { not: playerId },
      rating: { gte: lowerBound, lte: upperBound },
      player: { characterLevel: { gte: PVP_CONSTANTS.MIN_CHARACTER_LEVEL } },
    },
    include: {
      player: { select: { username: true, characterLevel: true } },
    },
    orderBy: { rating: 'desc' },
  });

  const opponents = candidates
    .filter((c) => !cooldownIds.has(c.playerId))
    .map((c) => ({
      playerId: c.playerId,
      username: c.player.username,
      rating: c.rating,
      characterLevel: c.player.characterLevel,
    }));

  return {
    myRating: {
      rating: myRating.rating,
      wins: myRating.wins,
      losses: myRating.losses,
      winStreak: myRating.winStreak,
      bestRating: myRating.bestRating,
    },
    opponents,
  };
}

// ---------------------------------------------------------------------------
// scoutOpponent
// ---------------------------------------------------------------------------

export async function scoutOpponent(attackerId: string, targetId: string) {
  // HP/knockout check
  const hpState = await getHpState(attackerId);
  if (hpState.isRecovering) {
    throw new AppError(400, 'Cannot scout while recovering', 'IS_RECOVERING');
  }

  // Spend turns for scouting
  await prisma.$transaction(async (tx) => {
    await spendPlayerTurnsTx(tx, attackerId, PVP_CONSTANTS.SCOUT_TURN_COST);
  });

  const target = await prisma.player.findUnique({
    where: { id: targetId },
    select: {
      characterLevel: true,
      attributes: true,
    },
  });

  if (!target) {
    throw new AppError(404, 'Target player not found', 'NOT_FOUND');
  }

  const targetEquipment = await prisma.playerEquipment.findMany({
    where: { playerId: targetId, itemId: { not: null } },
    include: { item: { include: { template: true } } },
  });

  // Determine attack style from main hand weapon
  const mainHand = targetEquipment.find((e) => e.slot === 'main_hand');
  const weaponSkill = mainHand?.item?.template?.requiredSkill as string | null;
  const attackStyle = weaponSkill === 'ranged' ? 'ranged'
    : weaponSkill === 'magic' ? 'magic'
    : 'melee';

  // Determine armor class from chest armor
  const chest = targetEquipment.find((e) => e.slot === 'chest');
  const weightClass = chest?.item?.template?.weightClass as string | null;
  const armorClass = weightClass ?? 'none';

  // Calculate power rating from equipment stats + combat skill levels
  const equipStats = await getEquipmentStats(targetId);
  const statTotal = equipStats.attack + equipStats.rangedPower + equipStats.magicPower
    + equipStats.armor + equipStats.magicDefence + equipStats.health
    + equipStats.dodge + equipStats.accuracy;

  const combatSkills = await prisma.playerSkill.findMany({
    where: { playerId: targetId, skillType: { in: ['melee', 'ranged', 'magic'] } },
    select: { level: true },
  });
  const skillTotal = combatSkills.reduce((sum, s) => sum + s.level, 0);

  return {
    combatLevel: target.characterLevel,
    attackStyle,
    armorClass,
    powerRating: statTotal + skillTotal,
  };
}

// ---------------------------------------------------------------------------
// challenge
// ---------------------------------------------------------------------------

async function getAttackStyleFromEquipment(playerId: string): Promise<AttackStyle> {
  const mainHand = await prisma.playerEquipment.findUnique({
    where: { playerId_slot: { playerId, slot: 'main_hand' } },
    include: { item: { include: { template: true } } },
  });
  const reqSkill = mainHand?.item?.template?.requiredSkill as string | null;
  if (reqSkill === 'ranged') return 'ranged';
  if (reqSkill === 'magic') return 'magic';
  return 'melee';
}

async function getSkillLevel(playerId: string, skillType: SkillType): Promise<number> {
  const skill = await prisma.playerSkill.findUnique({
    where: { playerId_skillType: { playerId, skillType } },
    select: { level: true },
  });
  return skill?.level ?? 1;
}

export async function challenge(
  attackerId: string,
  attackerUsername: string,
  targetId: string,
  attackStyle: AttackStyle,
) {
  // Validation: not self
  if (attackerId === targetId) {
    throw new AppError(400, 'Cannot challenge yourself', 'SELF_CHALLENGE');
  }

  // HP/knockout check
  const hpState = await getHpState(attackerId);
  if (hpState.isRecovering) {
    throw new AppError(400, 'Cannot challenge while recovering', 'IS_RECOVERING');
  }
  if (hpState.currentHp <= 0) {
    throw new AppError(400, 'Cannot challenge with 0 HP', 'NO_HP');
  }

  // Validation: attacker in town zone
  const attacker = await prisma.player.findUnique({
    where: { id: attackerId },
    select: {
      characterLevel: true,
      attributes: true,
      currentZone: { select: { id: true, zoneType: true } },
    },
  });
  if (!attacker) throw new AppError(404, 'Player not found', 'NOT_FOUND');
  if (attacker.currentZone?.zoneType !== 'town') {
    throw new AppError(400, 'Must be in a town to challenge', 'NOT_IN_TOWN');
  }

  // Validation: character level
  if (attacker.characterLevel < PVP_CONSTANTS.MIN_CHARACTER_LEVEL) {
    throw new AppError(400, `Must be character level ${PVP_CONSTANTS.MIN_CHARACTER_LEVEL}+`, 'INSUFFICIENT_LEVEL');
  }

  // Validation: cooldown
  const cooldown = await prisma.pvpCooldown.findUnique({
    where: { attackerId_defenderId: { attackerId, defenderId: targetId } },
  });
  if (cooldown && cooldown.expiresAt > new Date()) {
    throw new AppError(400, 'Opponent is on cooldown', 'ON_COOLDOWN');
  }

  // Validation: target level
  const target = await prisma.player.findUnique({
    where: { id: targetId },
    select: {
      characterLevel: true,
      attributes: true,
      username: true,
    },
  });
  if (!target) throw new AppError(404, 'Target not found', 'NOT_FOUND');
  if (target.characterLevel < PVP_CONSTANTS.MIN_CHARACTER_LEVEL) {
    throw new AppError(400, 'Target below minimum level', 'TARGET_INSUFFICIENT_LEVEL');
  }

  // Check bracket range
  const attackerRating = await getOrCreateRating(attackerId);
  const defenderRating = await getOrCreateRating(targetId);
  const lowerBound = Math.floor(attackerRating.rating * (1 - PVP_CONSTANTS.BRACKET_RANGE));
  const upperBound = Math.ceil(attackerRating.rating * (1 + PVP_CONSTANTS.BRACKET_RANGE));
  if (defenderRating.rating < lowerBound || defenderRating.rating > upperBound) {
    throw new AppError(400, 'Target is outside your rating bracket', 'OUT_OF_BRACKET');
  }

  // Check revenge: most recent match where target attacked this player, within window
  const revengeWindow = new Date(Date.now() - REVENGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const revengeMatch = await prisma.pvpMatch.findFirst({
    where: {
      attackerId: targetId,
      defenderId: attackerId,
      createdAt: { gte: revengeWindow },
    },
    orderBy: { createdAt: 'desc' },
  });
  const isRevenge = !!revengeMatch;
  const turnCost = isRevenge ? PVP_CONSTANTS.REVENGE_TURN_COST : PVP_CONSTANTS.CHALLENGE_TURN_COST;

  // Build attacker combatant
  const attackerAttributes = normalizePlayerAttributes(attacker.attributes);
  const attackerEquipStats = await getEquipmentStats(attackerId);
  const attackerSkillLevel = await getSkillLevel(attackerId, attackStyle);
  const attackerMaxHp = calculateMaxHp({
    vitalityLevel: attackerAttributes.vitality,
    equipmentHealthBonus: attackerEquipStats.health,
  });
  const attackerStats = buildPlayerCombatStats(
    attackerMaxHp,
    attackerMaxHp,
    { attackStyle, skillLevel: attackerSkillLevel, attributes: attackerAttributes },
    attackerEquipStats,
  );

  // Build defender combatant
  const defenderAttributes = normalizePlayerAttributes(target.attributes);
  const defenderEquipStats = await getEquipmentStats(targetId);
  const defenderStyle = await getAttackStyleFromEquipment(targetId);
  const defenderSkillLevel = await getSkillLevel(targetId, defenderStyle);
  const defenderMaxHp = calculateMaxHp({
    vitalityLevel: defenderAttributes.vitality,
    equipmentHealthBonus: defenderEquipStats.health,
  });
  const defenderStats = buildPlayerCombatStats(
    defenderMaxHp,
    defenderMaxHp,
    { attackStyle: defenderStyle, skillLevel: defenderSkillLevel, attributes: defenderAttributes },
    defenderEquipStats,
  );

  const combatantA: Combatant = {
    id: attackerId,
    name: attackerUsername,
    stats: attackerStats,
  };
  const combatantB: Combatant = {
    id: targetId,
    name: target.username,
    stats: defenderStats,
  };

  const combatResult: CombatResult = runCombat(combatantA, combatantB);
  const attackerWon = combatResult.outcome === 'victory';
  const winnerId = attackerWon ? attackerId : targetId;

  // Calculate Elo changes
  const elo = attackerWon
    ? calculateEloChange(attackerRating.rating, defenderRating.rating, PVP_CONSTANTS.K_FACTOR)
    : calculateEloChange(defenderRating.rating, attackerRating.rating, PVP_CONSTANTS.K_FACTOR);

  const attackerRatingChange = attackerWon ? elo.winnerDelta : elo.loserDelta;
  const defenderRatingChange = attackerWon ? elo.loserDelta : elo.winnerDelta;
  const now = new Date();

  // Execute everything in a transaction
  const match = await prisma.$transaction(async (tx) => {
    // Spend turns
    await spendPlayerTurnsTx(tx, attackerId, turnCost, now);

    // Re-check bracket inside transaction for safety
    const freshAttackerRating = await tx.pvpRating.findUnique({ where: { playerId: attackerId } });
    const freshDefenderRating = await tx.pvpRating.findUnique({ where: { playerId: targetId } });
    if (freshAttackerRating && freshDefenderRating) {
      const freshLower = Math.floor(freshAttackerRating.rating * (1 - PVP_CONSTANTS.BRACKET_RANGE));
      const freshUpper = Math.ceil(freshAttackerRating.rating * (1 + PVP_CONSTANTS.BRACKET_RANGE));
      if (freshDefenderRating.rating < freshLower || freshDefenderRating.rating > freshUpper) {
        throw new AppError(409, 'Target moved outside your rating bracket', 'OUT_OF_BRACKET');
      }
    }

    // Update attacker rating
    const newAttackerRating = Math.max(0, attackerRating.rating + attackerRatingChange);
    await tx.pvpRating.update({
      where: { playerId: attackerId },
      data: {
        rating: newAttackerRating,
        wins: attackerWon ? { increment: 1 } : undefined,
        losses: attackerWon ? undefined : { increment: 1 },
        winStreak: attackerWon ? { increment: 1 } : 0,
        bestRating: Math.max(attackerRating.bestRating, newAttackerRating),
        lastFoughtAt: now,
      },
    });

    // Update defender rating
    const newDefenderRating = Math.max(0, defenderRating.rating + defenderRatingChange);
    await tx.pvpRating.update({
      where: { playerId: targetId },
      data: {
        rating: newDefenderRating,
        wins: attackerWon ? undefined : { increment: 1 },
        losses: attackerWon ? { increment: 1 } : undefined,
        winStreak: attackerWon ? 0 : { increment: 1 },
        bestRating: Math.max(defenderRating.bestRating, newDefenderRating),
        lastFoughtAt: now,
      },
    });

    // Create match record
    const matchRecord = await tx.pvpMatch.create({
      data: {
        attackerId,
        defenderId: targetId,
        attackerRating: attackerRating.rating,
        defenderRating: defenderRating.rating,
        attackerRatingChange,
        defenderRatingChange,
        winnerId,
        combatLog: combatResult as unknown as Prisma.InputJsonValue,
        attackerStyle: attackStyle,
        defenderStyle,
        turnsSpent: turnCost,
        isRevenge,
        attackerRead: true,
        defenderRead: false,
      },
    });

    // Upsert cooldown
    const expiresAt = new Date(now.getTime() + PVP_CONSTANTS.COOLDOWN_HOURS * 60 * 60 * 1000);
    await tx.pvpCooldown.upsert({
      where: { attackerId_defenderId: { attackerId, defenderId: targetId } },
      create: { attackerId, defenderId: targetId, expiresAt },
      update: { expiresAt },
    });

    return matchRecord;
  });

  // Apply durability loss to both players outside transaction
  const [attackerDurability, defenderDurability] = await Promise.all([
    degradeEquippedDurability(attackerId),
    degradeEquippedDurability(targetId),
  ]);

  return {
    matchId: match.id,
    attackerId,
    defenderId: targetId,
    attackerName: attackerUsername,
    defenderName: target.username,
    winnerId,
    isRevenge,
    turnsSpent: turnCost,
    attackerRating: attackerRating.rating,
    defenderRating: defenderRating.rating,
    attackerRatingChange,
    defenderRatingChange,
    attackerStyle: attackStyle,
    defenderStyle,
    combat: combatResult,
    durability: {
      attacker: attackerDurability,
      defender: defenderDurability,
    },
  };
}

// ---------------------------------------------------------------------------
// getHistory
// ---------------------------------------------------------------------------

export async function getHistory(playerId: string, page: number, pageSize: number) {
  const where = {
    OR: [{ attackerId: playerId }, { defenderId: playerId }],
  };

  const [matches, total] = await Promise.all([
    prisma.pvpMatch.findMany({
      where,
      include: {
        attacker: { select: { username: true } },
        defender: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pvpMatch.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    matches: matches.map((m) => ({
      matchId: m.id,
      attackerId: m.attackerId,
      attackerName: m.attacker.username,
      defenderId: m.defenderId,
      defenderName: m.defender.username,
      winnerId: m.winnerId,
      attackerRating: m.attackerRating,
      defenderRating: m.defenderRating,
      attackerRatingChange: m.attackerRatingChange,
      defenderRatingChange: m.defenderRatingChange,
      attackerStyle: m.attackerStyle,
      defenderStyle: m.defenderStyle,
      isRevenge: m.isRevenge,
      turnsSpent: m.turnsSpent,
      createdAt: m.createdAt.toISOString(),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

// ---------------------------------------------------------------------------
// getNotificationCount (read-only, no side effects)
// ---------------------------------------------------------------------------

export async function getNotificationCount(playerId: string) {
  return prisma.pvpMatch.count({
    where: { defenderId: playerId, defenderRead: false },
  });
}

// ---------------------------------------------------------------------------
// getNotifications (read-only)
// ---------------------------------------------------------------------------

export async function getNotifications(playerId: string) {
  return prisma.pvpMatch.findMany({
    where: { defenderId: playerId, defenderRead: false },
    include: {
      attacker: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ---------------------------------------------------------------------------
// markNotificationsRead
// ---------------------------------------------------------------------------

export async function markNotificationsRead(playerId: string, matchIds?: string[]) {
  const where = matchIds
    ? { id: { in: matchIds }, defenderId: playerId }
    : { defenderId: playerId, defenderRead: false };

  await prisma.pvpMatch.updateMany({
    where,
    data: { defenderRead: true },
  });
}
