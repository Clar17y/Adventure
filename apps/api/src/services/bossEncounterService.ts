import type { Server as SocketServer } from 'socket.io';
import { prisma } from '@adventure/database';
import {
  WORLD_EVENT_CONSTANTS,
  type BossEncounterData,
  type BossEncounterStatus,
  type BossParticipantData,
  type BossParticipantRole,
  type BossParticipantStatus,
  type CombatantStats,
} from '@adventure/shared';
import {
  resolveBossRoundLogic,
  type BossRoundAttacker,
  type BossRoundHealer,
  type BossRoundResult,
  type BossStats,
} from '@adventure/game-engine';
import { emitSystemMessage } from './systemMessageService';
import { spendPlayerTurnsTx } from './turnBankService';
import { getEquipmentStats } from './equipmentService';
import { getPlayerProgressionState } from './attributesService';
import { buildPlayerCombatStats } from '@adventure/game-engine';
import { getHpState } from './hpService';
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
      event: { select: { zoneId: true, title: true } },
      mobTemplate: { select: { name: true, level: true, defence: true, magicDefence: true, evasion: true, bossAoeDmg: true } },
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

  // Build attacker/healer lists with full combat stats
  const attackers: BossRoundAttacker[] = [];
  const healers: BossRoundHealer[] = [];

  for (const signup of signups) {
    if (signup.role === 'attacker') {
      const [hpState, equipStats, progression] = await Promise.all([
        getHpState(signup.playerId),
        getEquipmentStats(signup.playerId),
        getPlayerProgressionState(signup.playerId),
      ]);
      const stats: CombatantStats = buildPlayerCombatStats(
        signup.currentHp,
        hpState.maxHp,
        { attackStyle: 'melee', skillLevel: 1, attributes: progression.attributes },
        equipStats,
      );
      attackers.push({ playerId: signup.playerId, stats, currentHp: signup.currentHp });
    } else {
      // Healer: heal = turnsCommitted (simplified)
      healers.push({
        playerId: signup.playerId,
        healAmount: Math.floor(signup.turnsCommitted / 2),
        currentHp: signup.currentHp,
      });
    }
  }

  const bossStats: BossStats = {
    defence: encounter.mobTemplate.defence,
    magicDefence: encounter.mobTemplate.magicDefence,
    dodge: encounter.mobTemplate.evasion,
    aoeDamage: encounter.mobTemplate.bossAoeDmg ?? WORLD_EVENT_CONSTANTS.BOSS_AOE_DAMAGE,
  };

  const result = resolveBossRoundLogic({
    bossHp: encounter.currentHp,
    bossMaxHp: encounter.maxHp,
    boss: bossStats,
    attackers,
    healers,
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
    const totalHealed = hr.targets.reduce((sum, t) => sum + t.healAmount, 0);
    if (totalHealed > 0) {
      await prisma.bossParticipant.updateMany({
        where: { encounterId, playerId: hr.playerId, roundNumber: nextRound },
        data: { totalHealing: { increment: totalHealed } },
      });
    }
  }

  // Update participant HP and knockouts
  for (const [playerId, hp] of result.participantHpAfter) {
    const status = hp <= 0 ? 'knocked_out' : 'alive';
    await prisma.bossParticipant.updateMany({
      where: { encounterId, playerId, roundNumber: nextRound },
      data: { currentHp: Math.max(0, hp), status },
    });
  }

  // HP scaling after round 1 based on participant count
  if (nextRound === 1 && !result.bossDefeated) {
    const totalParticipants = signups.length;
    if (totalParticipants > WORLD_EVENT_CONSTANTS.BOSS_EXPECTED_PARTICIPANTS) {
      const scaleFactor = 1 + (totalParticipants - WORLD_EVENT_CONSTANTS.BOSS_EXPECTED_PARTICIPANTS)
        * WORLD_EVENT_CONSTANTS.BOSS_HP_SCALE_FACTOR;
      const scaledMaxHp = Math.round(encounter.baseHp * scaleFactor);
      const scaledCurrentHp = Math.round(result.bossHpAfter * scaleFactor);
      await prisma.bossEncounter.update({
        where: { id: encounterId },
        data: {
          maxHp: scaledMaxHp,
          currentHp: scaledCurrentHp,
          scaledAt: new Date(),
        },
      });
    }
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

    // Announce boss kill in world chat with killer name
    let killerName = 'unknown';
    if (killedBy) {
      const killer = await prisma.player.findUnique({
        where: { id: killedBy },
        select: { username: true },
      });
      if (killer) killerName = killer.username;
    }
    await emitSystemMessage(
      io,
      'world',
      'world',
      `${encounter.mobTemplate.name} has been slain! ${killerName} dealt the final blow.`,
    );
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
