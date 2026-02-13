import { Prisma, prisma } from '@adventure/database';
import { buildPlayerCombatStats, calculateMaxHp, runCombat } from '@adventure/game-engine';
import { PVP_CONSTANTS, type Combatant, type CombatResult, type SkillType } from '@adventure/shared';
import { AppError } from '../middleware/errorHandler';
import { calculateEloChange } from './eloService';
import { getEquipmentStats } from './equipmentService';
import { spendPlayerTurnsTx } from './turnBankService';
import { degradeEquippedDurability } from './durabilityService';
import { normalizePlayerAttributes } from './attributesService';

type AttackStyle = 'melee' | 'ranged' | 'magic';

// Temporary shim for Prisma models not yet recognized by local client
const prismaAny = prisma as unknown as any;

// ---------------------------------------------------------------------------
// getOrCreateRating
// ---------------------------------------------------------------------------

export async function getOrCreateRating(playerId: string) {
  const existing = await prismaAny.pvpRating.findUnique({ where: { playerId } });
  if (existing) return existing;

  return prismaAny.pvpRating.create({
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
  const cooldowns = await prismaAny.pvpCooldown.findMany({
    where: { attackerId: playerId, expiresAt: { gt: new Date() } },
    select: { defenderId: true },
  });
  const cooldownIds = new Set<string>(cooldowns.map((c: { defenderId: string }) => c.defenderId));

  // Find opponents in bracket
  const candidates = await prismaAny.pvpRating.findMany({
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
    .filter((c: { playerId: string }) => !cooldownIds.has(c.playerId))
    .map((c: { playerId: string; rating: number; player: { username: string; characterLevel: number } }) => ({
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
  // Spend turns for scouting
  await prisma.$transaction(async (tx) => {
    await spendPlayerTurnsTx(tx, attackerId, PVP_CONSTANTS.SCOUT_TURN_COST);
  });

  const target = await prismaAny.player.findUnique({
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
  targetId: string,
  attackStyle: AttackStyle,
) {
  // Validation: not self
  if (attackerId === targetId) {
    throw new AppError(400, 'Cannot challenge yourself', 'SELF_CHALLENGE');
  }

  // Validation: attacker in town zone
  const attacker = await prismaAny.player.findUnique({
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
  const cooldown = await prismaAny.pvpCooldown.findUnique({
    where: { attackerId_defenderId: { attackerId, defenderId: targetId } },
  });
  if (cooldown && cooldown.expiresAt > new Date()) {
    throw new AppError(400, 'Opponent is on cooldown', 'ON_COOLDOWN');
  }

  // Validation: target level
  const target = await prismaAny.player.findUnique({
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

  // Check revenge: most recent match where target attacked this player
  const revengeMatch = await prismaAny.pvpMatch.findFirst({
    where: { attackerId: targetId, defenderId: attackerId },
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

  // Get attacker username for combatant naming
  const attackerPlayer = await prisma.player.findUnique({
    where: { id: attackerId },
    select: { username: true },
  });

  const combatantA: Combatant = {
    id: attackerId,
    name: attackerPlayer?.username ?? 'Attacker',
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
    const txAny = tx as unknown as any;

    // Spend turns
    await spendPlayerTurnsTx(tx, attackerId, turnCost, now);

    // Update attacker rating
    const newAttackerRating = Math.max(0, attackerRating.rating + attackerRatingChange);
    await txAny.pvpRating.update({
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
    await txAny.pvpRating.update({
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
    const matchRecord = await txAny.pvpMatch.create({
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
    await txAny.pvpCooldown.upsert({
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
    attackerName: attackerPlayer?.username ?? 'Attacker',
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
    prismaAny.pvpMatch.findMany({
      where,
      include: {
        attacker: { select: { username: true } },
        defender: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prismaAny.pvpMatch.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    matches: matches.map((m: any) => ({
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
// getNotifications
// ---------------------------------------------------------------------------

export async function getNotifications(playerId: string) {
  const unread = await prismaAny.pvpMatch.findMany({
    where: { defenderId: playerId, defenderRead: false },
    include: {
      attacker: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Mark all as read
  if (unread.length > 0) {
    const ids = unread.map((m: { id: string }) => m.id);
    await prismaAny.pvpMatch.updateMany({
      where: { id: { in: ids } },
      data: { defenderRead: true },
    });
  }

  return unread.map((m: any) => ({
    matchId: m.id,
    attackerName: m.attacker.username,
    winnerId: m.winnerId,
    defenderRatingChange: m.defenderRatingChange,
    isRevenge: m.isRevenge,
    createdAt: m.createdAt.toISOString(),
  }));
}
