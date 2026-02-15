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
  raidPoolHp: number | null;
  raidPoolMax: number | null;
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
    raidPoolHp: row.raidPoolHp,
    raidPoolMax: row.raidPoolMax,
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

  const zoneTier = encounter.event.zone?.difficulty ?? 1;
  const tierIndex = Math.max(0, Math.min(4, zoneTier - 1));
  const participantCount = signups.length;

  // Boss scales once per attempt based on founding party size (M5: intentional design)
  if (!encounter.scaledAt) {
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

  // M3: batch all participant stat lookups in parallel
  const participantData = await Promise.all(
    signups.map(async (signup) => {
      const [hpState, equipStats, progression] = await Promise.all([
        getHpState(signup.playerId),
        getEquipmentStats(signup.playerId),
        getPlayerProgressionState(signup.playerId),
      ]);

      if (signup.role === 'attacker') {
        const mainHandSkill = await getMainHandAttackSkill(signup.playerId);
        const attackSkill = mainHandSkill ?? 'melee';
        const attackSkillLevel = await getSkillLevel(signup.playerId, attackSkill);
        return { signup, hpState, equipStats, progression, role: 'attacker' as const, attackSkill, attackSkillLevel };
      } else {
        const magicLevel = await getSkillLevel(signup.playerId, 'magic');
        return { signup, hpState, equipStats, progression, role: 'healer' as const, magicLevel };
      }
    }),
  );

  let raidPoolMax = 0;
  let totalDefence = 0;

  for (const pd of participantData) {
    raidPoolMax += pd.hpState.maxHp;
    totalDefence += pd.equipStats.armor;

    if (pd.role === 'attacker') {
      const stats = buildPlayerCombatStats(
        pd.hpState.maxHp, pd.hpState.maxHp,
        { attackStyle: pd.attackSkill, skillLevel: pd.attackSkillLevel, attributes: pd.progression.attributes },
        pd.equipStats,
      );
      const turnMultiplier = 1 + pd.signup.turnsCommitted * WORLD_EVENT_CONSTANTS.ATTACKER_TURN_SCALING;
      stats.damageMin = Math.round(stats.damageMin * turnMultiplier);
      stats.damageMax = Math.round(stats.damageMax * turnMultiplier);
      attackers.push({ playerId: pd.signup.playerId, stats });
    } else {
      const healAmount = Math.floor(
        pd.signup.turnsCommitted * (1 + pd.magicLevel * WORLD_EVENT_CONSTANTS.HEALER_MAGIC_SCALING),
      );
      healers.push({ playerId: pd.signup.playerId, healAmount });
    }
  }

  const avgDefence = signups.length > 0 ? totalDefence / signups.length : 0;

  // M2: use mob-specific stats with tier constants as fallback
  const tierDefence = WORLD_EVENT_CONSTANTS.BOSS_DEFENCE_BY_TIER[tierIndex]!;
  const mobAoe = encounter.mobTemplate.bossAoeDmg ?? WORLD_EVENT_CONSTANTS.BOSS_AOE_PER_PLAYER_BY_TIER[tierIndex]!;
  const bossStats: BossStats = {
    defence: encounter.mobTemplate.defence ?? tierDefence,
    magicDefence: encounter.mobTemplate.magicDefence ?? Math.round(tierDefence * 0.7),
    dodge: encounter.mobTemplate.evasion ?? Math.round(zoneTier * 3),
    aoeDamage: mobAoe * participantCount,
    avgParticipantDefence: avgDefence,
  };

  // Compute raid pool HP: use persisted percentage applied to current raidPoolMax
  let currentRaidPool: number;
  if (encounter.raidPoolHp !== null && encounter.raidPoolMax !== null && encounter.raidPoolMax > 0) {
    // Apply stored percentage to current participant pool
    const poolPercent = encounter.raidPoolHp / encounter.raidPoolMax;
    currentRaidPool = Math.round(poolPercent * raidPoolMax);
  } else {
    currentRaidPool = raidPoolMax;
  }

  const result = resolveBossRoundLogic({
    bossHp: encounter.currentHp,
    bossMaxHp: encounter.maxHp,
    boss: bossStats,
    attackers,
    healers,
    raidPool: currentRaidPool,
    raidPoolMax,
  });

  // Update encounter
  const nextNextRoundAt = result.bossDefeated
    ? null
    : new Date(Date.now() + WORLD_EVENT_CONSTANTS.BOSS_ROUND_INTERVAL_MINUTES * 60 * 1000);

  // M6: find top cumulative damage dealer across all rounds for killedBy
  let killedBy: string | null = null;
  if (result.bossDefeated) {
    const allParticipantsForKill = await prisma.bossParticipant.findMany({
      where: { encounterId },
      select: { playerId: true, totalDamage: true },
    });
    const cumulativeDamage = new Map<string, number>();
    for (const p of allParticipantsForKill) {
      cumulativeDamage.set(p.playerId, (cumulativeDamage.get(p.playerId) ?? 0) + p.totalDamage);
    }
    // Also add this round's damage (not yet persisted to DB)
    for (const ar of result.attackerResults) {
      if (ar.damage > 0) {
        cumulativeDamage.set(ar.playerId, (cumulativeDamage.get(ar.playerId) ?? 0) + ar.damage);
      }
    }
    let topDamage = 0;
    for (const [playerId, dmg] of cumulativeDamage) {
      if (dmg > topDamage) {
        topDamage = dmg;
        killedBy = playerId;
      }
    }
  }

  // Optimistic lock: only update if roundNumber hasn't changed (C2 concurrency fix)
  const updated = await prisma.bossEncounter.updateMany({
    where: { id: encounterId, roundNumber: encounter.roundNumber },
    data: {
      currentHp: result.bossHpAfter,
      roundNumber: nextRound,
      nextRoundAt: nextNextRoundAt,
      status: result.bossDefeated ? 'defeated' : 'in_progress',
      killedBy,
      raidPoolHp: result.raidPoolAfter,
      raidPoolMax: raidPoolMax,
    },
  });

  // Another process already resolved this round — bail out
  if (updated.count === 0) return null;

  // M3: batch participant damage/healing updates in parallel
  await Promise.all([
    ...result.attackerResults
      .filter((ar) => ar.damage > 0)
      .map((ar) =>
        prisma.bossParticipant.updateMany({
          where: { encounterId, playerId: ar.playerId, roundNumber: nextRound },
          data: { totalDamage: { increment: ar.damage } },
        }),
      ),
    ...result.healerResults
      .filter((hr) => hr.healAmount > 0)
      .map((hr) =>
        prisma.bossParticipant.updateMany({
          where: { encounterId, playerId: hr.playerId, roundNumber: nextRound },
          data: { totalHealing: { increment: hr.healAmount } },
        }),
      ),
  ]);

  // Handle raid wipe
  if (result.raidWiped) {
    // M3: batch flee rolls in parallel (reuse participantData from above)
    await Promise.all(
      participantData.map(async (pd) => {
        const fleeResult = calculateFleeResult({
          evasionLevel: pd.progression.attributes.evasion,
          mobLevel: encounter.mobTemplate.level ?? 1,
          maxHp: pd.hpState.maxHp,
          currentGold: 0,
        });
        if (fleeResult.outcome === 'knockout') {
          await enterRecoveringState(pd.signup.playerId, pd.hpState.maxHp);
        } else {
          await setHp(pd.signup.playerId, fleeResult.remainingHp);
        }
      }),
    );

    // Persist boss HP and reset scaling for next attempt (don't reset roundNumber — C1 fix)
    await prisma.bossEncounter.update({
      where: { id: encounterId },
      data: {
        currentHp: result.bossHpAfter,
        nextRoundAt: new Date(Date.now() + WORLD_EVENT_CONSTANTS.BOSS_ROUND_INTERVAL_MINUTES * 60 * 1000),
        status: 'waiting',
        scaledAt: null,
        raidPoolHp: null,
        raidPoolMax: null,
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
