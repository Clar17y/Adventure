import type { Server as SocketServer } from 'socket.io';
import { prisma } from '@adventure/database';
import {
  WORLD_EVENT_CONSTANTS,
  type BossEncounterData,
  type BossEncounterStatus,
  type BossParticipantData,
  type BossParticipantRole,
  type BossParticipantStatus,
} from '@adventure/shared';
import {
  resolveBossRoundLogic,
  buildPlayerCombatStats,
  calculateFleeResult,
  type BossRoundAttacker,
  type BossRoundHealer,
  type BossRoundResult,
  type BossStats,
} from '@adventure/game-engine';
import { emitSystemMessage } from './systemMessageService';
import { spendPlayerTurnsTx } from './turnBankService';
import { getEquipmentStats } from './equipmentService';
import { getPlayerProgressionState } from './attributesService';
import { getMainHandAttackSkill, getSkillLevel } from './combatStatsService';
import { getHpState, setHp, enterRecoveringState } from './hpService';
import { distributeBossLoot } from './bossLootService';

function toBossEncounterData(row: {
  id: string;
  eventId: string;
  mobTemplateId: string;
  currentHp: number;
  maxHp: number;
  baseHp: number;
  roundNumber: number;
  nextRoundAt: Date | null;
  status: string;
  killedBy: string | null;
}): BossEncounterData {
  return {
    id: row.id,
    eventId: row.eventId,
    mobTemplateId: row.mobTemplateId,
    currentHp: row.currentHp,
    maxHp: row.maxHp,
    baseHp: row.baseHp,
    roundNumber: row.roundNumber,
    nextRoundAt: row.nextRoundAt?.toISOString() ?? null,
    status: row.status as BossEncounterStatus,
    killedBy: row.killedBy,
  };
}

function toBossParticipantData(row: {
  id: string;
  encounterId: string;
  playerId: string;
  role: string;
  roundNumber: number;
  turnsCommitted: number;
  totalDamage: number;
  totalHealing: number;
  currentHp: number;
  status: string;
}): BossParticipantData {
  return {
    id: row.id,
    encounterId: row.encounterId,
    playerId: row.playerId,
    role: row.role as BossParticipantRole,
    roundNumber: row.roundNumber,
    turnsCommitted: row.turnsCommitted,
    totalDamage: row.totalDamage,
    totalHealing: row.totalHealing,
    currentHp: row.currentHp,
    status: row.status as BossParticipantStatus,
  };
}

export async function createBossEncounter(
  eventId: string,
  mobTemplateId: string,
  baseHp: number,
): Promise<BossEncounterData> {
  const nextRoundAt = new Date(
    Date.now() + WORLD_EVENT_CONSTANTS.BOSS_ROUND_INTERVAL_MINUTES * 60 * 1000,
  );

  const row = await prisma.bossEncounter.create({
    data: {
      eventId,
      mobTemplateId,
      currentHp: baseHp,
      maxHp: baseHp,
      baseHp,
      roundNumber: 0,
      nextRoundAt,
      status: 'waiting',
    },
  });

  return toBossEncounterData(row);
}

export async function signUpForBossRound(
  encounterId: string,
  playerId: string,
  role: BossParticipantRole,
  turnsCommitted: number,
  playerMaxHp: number,
): Promise<BossParticipantData> {
  const encounter = await prisma.bossEncounter.findUnique({
    where: { id: encounterId },
  });
  if (!encounter) throw new Error('Boss encounter not found');
  if (encounter.status === 'defeated' || encounter.status === 'expired') {
    throw new Error('Boss encounter is already over');
  }

  const nextRound = encounter.roundNumber + 1;

  // Check for existing signup this round
  const existing = await prisma.bossParticipant.findUnique({
    where: {
      encounterId_playerId_roundNumber: {
        encounterId,
        playerId,
        roundNumber: nextRound,
      },
    },
  });
  if (existing) throw new Error('Already signed up for this round');

  // Deduct turns in transaction
  const row = await prisma.$transaction(async (tx) => {
    await spendPlayerTurnsTx(tx, playerId, turnsCommitted);

    return tx.bossParticipant.create({
      data: {
        encounterId,
        playerId,
        role,
        roundNumber: nextRound,
        turnsCommitted,
        currentHp: playerMaxHp,
        status: 'alive',
      },
    });
  });

  // If this is the first signup and encounter is waiting, start it
  if (encounter.status === 'waiting') {
    await prisma.bossEncounter.update({
      where: { id: encounterId },
      data: { status: 'in_progress' },
    });
  }

  return toBossParticipantData(row);
}

export async function getBossEncounterStatus(encounterId: string): Promise<{
  encounter: BossEncounterData;
  participants: BossParticipantData[];
} | null> {
  const encounter = await prisma.bossEncounter.findUnique({
    where: { id: encounterId },
  });
  if (!encounter) return null;

  const participants = await prisma.bossParticipant.findMany({
    where: { encounterId },
    orderBy: [{ roundNumber: 'asc' }, { totalDamage: 'desc' }],
  });

  return {
    encounter: toBossEncounterData(encounter),
    participants: participants.map(toBossParticipantData),
  };
}

export async function resolveBossRound(
  encounterId: string,
  io: SocketServer | null,
): Promise<{ bossDefeated: boolean; roundResult: BossRoundResult } | null> {
  const encounter = await prisma.bossEncounter.findUnique({
    where: { id: encounterId },
    include: {
      event: { select: { zoneId: true, title: true, zone: { select: { name: true, difficulty: true } } } },
      mobTemplate: { select: { name: true, level: true } },
    },
  });
  if (!encounter || encounter.status === 'defeated' || encounter.status === 'expired') {
    return null;
  }

  const nextRound = encounter.roundNumber + 1;
  const signups = await prisma.bossParticipant.findMany({
    where: { encounterId, roundNumber: nextRound },
  });

  if (signups.length === 0) return null;

  const zoneTier = encounter.event.zone?.difficulty ?? 1;
  const tierIndex = Math.max(0, Math.min(4, zoneTier - 1));
  const participantCount = signups.length;

  // Dynamic scaling on first round transition
  if (encounter.roundNumber === 0) {
    const scaledMaxHp = WORLD_EVENT_CONSTANTS.BOSS_HP_PER_PLAYER_BY_TIER[tierIndex]! * participantCount;
    const hpPercent = encounter.maxHp > 0 ? encounter.currentHp / encounter.maxHp : 1;
    const scaledCurrentHp = Math.round(scaledMaxHp * hpPercent);
    await prisma.bossEncounter.update({
      where: { id: encounterId },
      data: { maxHp: scaledMaxHp, currentHp: scaledCurrentHp, scaledAt: new Date() },
    });
    encounter.maxHp = scaledMaxHp;
    encounter.currentHp = scaledCurrentHp;
  }

  // Build attacker/healer lists with real stats and compute raid pool
  const attackers: BossRoundAttacker[] = [];
  const healers: BossRoundHealer[] = [];

  let raidPoolMax = 0;
  let totalDefence = 0;

  for (const signup of signups) {
    const [hpState, equipStats, progression] = await Promise.all([
      getHpState(signup.playerId),
      getEquipmentStats(signup.playerId),
      getPlayerProgressionState(signup.playerId),
    ]);

    raidPoolMax += hpState.maxHp;
    totalDefence += equipStats.armor;

    if (signup.role === 'attacker') {
      const mainHandSkill = await getMainHandAttackSkill(signup.playerId);
      const attackSkill = mainHandSkill ?? 'melee';
      const skillLevel = await getSkillLevel(signup.playerId, attackSkill);
      const stats = buildPlayerCombatStats(
        hpState.maxHp, hpState.maxHp,
        { attackStyle: attackSkill, skillLevel, attributes: progression.attributes },
        equipStats,
      );
      attackers.push({ playerId: signup.playerId, stats });
    } else {
      const magicLevel = await getSkillLevel(signup.playerId, 'magic');
      const healAmount = Math.floor(
        signup.turnsCommitted * (1 + magicLevel * WORLD_EVENT_CONSTANTS.HEALER_MAGIC_SCALING),
      );
      healers.push({ playerId: signup.playerId, healAmount });
    }
  }

  const avgDefence = signups.length > 0 ? totalDefence / signups.length : 0;

  const bossStats: BossStats = {
    defence: WORLD_EVENT_CONSTANTS.BOSS_DEFENCE_BY_TIER[tierIndex]!,
    magicDefence: Math.round(WORLD_EVENT_CONSTANTS.BOSS_DEFENCE_BY_TIER[tierIndex]! * 0.7),
    dodge: Math.round(zoneTier * 3),
    aoeDamage: WORLD_EVENT_CONSTANTS.BOSS_AOE_PER_PLAYER_BY_TIER[tierIndex]! * participantCount,
    avgParticipantDefence: avgDefence,
  };

  const result = resolveBossRoundLogic({
    bossHp: encounter.currentHp,
    bossMaxHp: encounter.maxHp,
    boss: bossStats,
    attackers,
    healers,
    raidPool: raidPoolMax,
    raidPoolMax,
  });

  // Update encounter
  const nextNextRoundAt = result.bossDefeated
    ? null
    : new Date(Date.now() + WORLD_EVENT_CONSTANTS.BOSS_ROUND_INTERVAL_MINUTES * 60 * 1000);

  // Find top damage dealer for killedBy
  let killedBy: string | null = null;
  if (result.bossDefeated) {
    const topAttacker = result.attackerResults
      .filter((a) => a.hit)
      .sort((a, b) => b.damage - a.damage)[0];
    killedBy = topAttacker?.playerId ?? null;
  }

  await prisma.bossEncounter.update({
    where: { id: encounterId },
    data: {
      currentHp: result.bossHpAfter,
      roundNumber: nextRound,
      nextRoundAt: nextNextRoundAt,
      status: result.bossDefeated ? 'defeated' : 'in_progress',
      killedBy,
    },
  });

  // Update participant damage/healing totals
  for (const ar of result.attackerResults) {
    if (ar.damage > 0) {
      await prisma.bossParticipant.updateMany({
        where: { encounterId, playerId: ar.playerId, roundNumber: nextRound },
        data: { totalDamage: { increment: ar.damage } },
      });
    }
  }
  for (const hr of result.healerResults) {
    if (hr.healAmount > 0) {
      await prisma.bossParticipant.updateMany({
        where: { encounterId, playerId: hr.playerId, roundNumber: nextRound },
        data: { totalHealing: { increment: hr.healAmount } },
      });
    }
  }

  // Handle raid wipe
  if (result.raidWiped) {
    for (const signup of signups) {
      const [hpState, progression] = await Promise.all([
        getHpState(signup.playerId),
        getPlayerProgressionState(signup.playerId),
      ]);
      const fleeResult = calculateFleeResult({
        evasionLevel: progression.attributes.evasion,
        mobLevel: encounter.mobTemplate.level ?? 1,
        maxHp: hpState.maxHp,
        currentGold: 0,
      });
      if (fleeResult.outcome === 'knockout') {
        await enterRecoveringState(signup.playerId, hpState.maxHp);
      } else {
        await setHp(signup.playerId, fleeResult.remainingHp);
      }
    }

    // Persist boss HP percentage and reset for next attempt
    await prisma.bossEncounter.update({
      where: { id: encounterId },
      data: {
        currentHp: result.bossHpAfter,
        roundNumber: 0,
        nextRoundAt: new Date(Date.now() + WORLD_EVENT_CONSTANTS.BOSS_ROUND_INTERVAL_MINUTES * 60 * 1000),
        status: 'waiting',
      },
    });

    const zoneName = encounter.event.zone?.name ?? 'unknown';
    await emitSystemMessage(io, 'world', 'world', `The raid against ${encounter.mobTemplate.name} in ${zoneName} has been wiped!`);
    if (encounter.event.zoneId) {
      await emitSystemMessage(io, 'zone', `zone:${encounter.event.zoneId}`, `The raid against ${encounter.mobTemplate.name} has been wiped! The boss is weakened...`);
    }

    return { bossDefeated: false, roundResult: result };
  }

  // Complete event if boss defeated
  if (result.bossDefeated) {
    await prisma.worldEvent.updateMany({
      where: { id: encounter.eventId, status: 'active' },
      data: { status: 'completed' },
    });

    // Distribute loot to all contributors across all rounds
    const allParticipants = await prisma.bossParticipant.findMany({
      where: { encounterId },
    });
    const contributorMap = new Map<string, { totalDamage: number; totalHealing: number }>();
    for (const p of allParticipants) {
      const existing = contributorMap.get(p.playerId);
      if (existing) {
        existing.totalDamage += p.totalDamage;
        existing.totalHealing += p.totalHealing;
      } else {
        contributorMap.set(p.playerId, { totalDamage: p.totalDamage, totalHealing: p.totalHealing });
      }
    }
    const contributors = Array.from(contributorMap.entries()).map(([playerId, stats]) => ({
      playerId,
      totalDamage: stats.totalDamage,
      totalHealing: stats.totalHealing,
    }));
    await distributeBossLoot(encounter.mobTemplateId, encounter.mobTemplate.level ?? 1, contributors);

    // Announce boss kill in world chat and zone chat with killer name
    let killerName = 'unknown';
    if (killedBy) {
      const killer = await prisma.player.findUnique({
        where: { id: killedBy },
        select: { username: true },
      });
      if (killer) killerName = killer.username;
    }
    const zoneName = encounter.event.zone?.name ?? 'unknown';
    await emitSystemMessage(
      io,
      'world',
      'world',
      `${encounter.mobTemplate.name} in ${zoneName} has been slain! ${killerName} dealt the final blow.`,
    );
    if (encounter.event.zoneId) {
      await emitSystemMessage(
        io,
        'zone',
        `zone:${encounter.event.zoneId}`,
        `${encounter.mobTemplate.name} has been slain! ${killerName} dealt the final blow.`,
      );
    }
  } else {
    const totalDmg = result.attackerResults.reduce((s, a) => s + a.damage, 0);
    const hpPercent = Math.round((result.bossHpAfter / encounter.maxHp) * 100);
    await emitSystemMessage(
      io,
      'zone',
      `zone:${encounter.event.zoneId}`,
      `Boss round ${nextRound}: ${totalDmg} damage dealt to ${encounter.mobTemplate.name} (${hpPercent}% HP remaining)`,
    );
  }

  return { bossDefeated: result.bossDefeated, roundResult: result };
}

export async function checkAndResolveDueBossRounds(io: SocketServer | null): Promise<void> {
  const now = new Date();
  const dueEncounters = await prisma.bossEncounter.findMany({
    where: {
      status: 'in_progress',
      nextRoundAt: { lte: now },
    },
    select: { id: true },
  });

  for (const enc of dueEncounters) {
    await resolveBossRound(enc.id, io);
  }
}

export async function getActiveBossEncounters(): Promise<BossEncounterData[]> {
  const rows = await prisma.bossEncounter.findMany({
    where: { status: { in: ['waiting', 'in_progress'] } },
    orderBy: { nextRoundAt: 'asc' },
  });
  return rows.map(toBossEncounterData);
}
