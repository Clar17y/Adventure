import { Router } from 'express';
import { z } from 'zod';
import { Prisma, prisma } from '@adventure/database';
import { buildPlayerCombatStats, runCombat, calculateFleeResult } from '@adventure/game-engine';
import { COMBAT_CONSTANTS, type LootDrop, type MobTemplate, type SkillType } from '@adventure/shared';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { rollAndGrantLoot } from '../services/lootService';
import { spendPlayerTurns } from '../services/turnBankService';
import { grantSkillXp } from '../services/xpService';
import { degradeEquippedDurability } from '../services/durabilityService';
import { getHpState, setHp, enterRecoveringState } from '../services/hpService';

export const combatRouter = Router();

combatRouter.use(authenticate);

const prismaAny = prisma as unknown as any;

const attackSkillSchema = z.enum(['melee', 'ranged', 'magic']);
type AttackSkill = z.infer<typeof attackSkillSchema>;

const startSchema = z.object({
  pendingEncounterId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  mobTemplateId: z.string().uuid().optional(),
  attackSkill: attackSkillSchema.optional(),
}).refine((v) => Boolean(v.pendingEncounterId || v.zoneId), {
  message: 'pendingEncounterId or zoneId is required',
});

function attackSkillFromRequiredSkill(value: SkillType | null | undefined): AttackSkill | null {
  if (value === 'melee' || value === 'ranged' || value === 'magic') return value;
  return null;
}

function pickWeighted<T extends { encounterWeight: number }>(items: T[]): T | null {
  const totalWeight = items.reduce((sum, item) => sum + item.encounterWeight, 0);
  if (totalWeight <= 0) return null;

  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= item.encounterWeight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1] ?? null;
}

async function getEquipmentStats(playerId: string): Promise<{
  attack: number;
  armor: number;
  health: number;
  evasion: number;
}> {
  const equipped = await prisma.playerEquipment.findMany({
    where: { playerId },
    include: {
      item: {
        include: { template: true },
      },
    },
  });

  let attack = 0;
  let armor = 0;
  let health = 0;
  let evasion = 0;

  for (const slot of equipped) {
    const baseStats = slot.item?.template?.baseStats as Record<string, unknown> | null | undefined;
    if (!baseStats) continue;

    if (typeof baseStats.attack === 'number') attack += baseStats.attack;
    if (typeof baseStats.armor === 'number') armor += baseStats.armor;
    if (typeof baseStats.health === 'number') health += baseStats.health;
    if (typeof baseStats.evasion === 'number') evasion += baseStats.evasion;
  }

  return { attack, armor, health, evasion };
}

async function getMainHandAttackSkill(playerId: string): Promise<AttackSkill | null> {
  const mainHand = await prisma.playerEquipment.findUnique({
    where: { playerId_slot: { playerId, slot: 'main_hand' } },
    include: { item: { include: { template: true } } },
  });

  const requiredSkill = mainHand?.item?.template?.requiredSkill as SkillType | null | undefined;
  return attackSkillFromRequiredSkill(requiredSkill);
}

async function getSkillLevel(playerId: string, skillType: SkillType): Promise<number> {
  const skill = await prisma.playerSkill.findUnique({
    where: { playerId_skillType: { playerId, skillType } },
    select: { level: true },
  });

  return skill?.level ?? 1;
}

/**
 * GET /api/v1/combat/pending
 * List pending encounters for the current player.
 */
combatRouter.get('/pending', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const now = new Date();

    await prismaAny.pendingEncounter.deleteMany({
      where: { playerId, expiresAt: { lte: now } },
    });

    const pending = await prismaAny.pendingEncounter.findMany({
      where: { playerId, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        zone: { select: { name: true } },
        mobTemplate: { select: { name: true } },
      },
    });

    res.json({
      pendingEncounters: pending.map((p: any) => ({
        encounterId: p.id,
        zoneId: p.zoneId,
        zoneName: p.zone.name,
        mobTemplateId: p.mobTemplateId,
        mobName: p.mobTemplate.name,
        turnOccurred: p.turnOccurred,
        createdAt: p.createdAt.toISOString(),
        expiresAt: p.expiresAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

const abandonSchema = z.object({
  zoneId: z.string().uuid().optional(),
});

/**
 * POST /api/v1/combat/pending/abandon
 * Abandon pending encounters (optionally by zone).
 */
combatRouter.post('/pending/abandon', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = abandonSchema.parse(req.body ?? {});

    const result = await prismaAny.pendingEncounter.deleteMany({
      where: {
        playerId,
        ...(body.zoneId ? { zoneId: body.zoneId } : {}),
      },
    });

    res.json({ success: true, abandoned: result.count ?? 0 });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/combat/start
 * Spend turns and run a single combat encounter.
 */
combatRouter.post('/start', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = startSchema.parse(req.body);

    // Check if player can fight
    const hpState = await getHpState(playerId);
    if (hpState.isRecovering) {
      throw new AppError(400, 'Cannot fight while recovering. Spend recovery turns first.', 'IS_RECOVERING');
    }
    if (hpState.currentHp <= 0) {
      throw new AppError(400, 'Cannot fight with 0 HP. Rest to recover health.', 'NO_HP');
    }

    let zoneId = body.zoneId ?? null;
    let mobTemplateId = body.mobTemplateId ?? null;
    let consumedPendingEncounterId = null as null | string;

    if (body.pendingEncounterId) {
      const pending = await prismaAny.pendingEncounter.findFirst({
        where: { id: body.pendingEncounterId, playerId },
        select: { id: true, zoneId: true, mobTemplateId: true, expiresAt: true },
      });

      if (!pending) {
        throw new AppError(404, 'Pending encounter not found', 'NOT_FOUND');
      }

      if (pending.expiresAt && pending.expiresAt < new Date()) {
        await prismaAny.pendingEncounter.deleteMany({ where: { id: pending.id, playerId } });
        throw new AppError(410, 'Pending encounter expired', 'ENCOUNTER_EXPIRED');
      }

      consumedPendingEncounterId = pending.id;
      zoneId = pending.zoneId;
      mobTemplateId = pending.mobTemplateId;
    }

    if (!zoneId) {
      throw new AppError(400, 'zoneId is required', 'INVALID_REQUEST');
    }

    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      throw new AppError(404, 'Zone not found', 'NOT_FOUND');
    }

    let mob = null as null | (MobTemplate & { spellPattern: unknown });

    if (mobTemplateId) {
      const found = await prisma.mobTemplate.findUnique({ where: { id: mobTemplateId } });
      if (!found || found.zoneId !== zoneId) {
        throw new AppError(400, 'Invalid mobTemplateId for this zone', 'INVALID_MOB');
      }
      mob = found as unknown as MobTemplate & { spellPattern: unknown };
    } else {
      const mobs = await prisma.mobTemplate.findMany({ where: { zoneId } });
      const picked = pickWeighted(mobs);
      if (!picked) {
        throw new AppError(400, 'No mobs available for this zone', 'NO_MOBS');
      }
      mob = picked as unknown as MobTemplate & { spellPattern: unknown };
    }

    const turnSpend = await spendPlayerTurns(playerId, COMBAT_CONSTANTS.ENCOUNTER_TURN_COST);

    const requestedAttackSkill: AttackSkill | null = body.attackSkill ?? null;
    const mainHandAttackSkill = await getMainHandAttackSkill(playerId);
    const attackSkill: AttackSkill = mainHandAttackSkill ?? requestedAttackSkill ?? 'melee';
    const [attackLevel, defenceLevel, vitalityLevel, evasionLevel] = await Promise.all([
      getSkillLevel(playerId, attackSkill),
      getSkillLevel(playerId, 'defence'),
      getSkillLevel(playerId, 'vitality'),
      getSkillLevel(playerId, 'evasion'),
    ]);

    const equipmentStats = await getEquipmentStats(playerId);
    const playerStats = buildPlayerCombatStats(
      hpState.currentHp,
      {
        attack: attackLevel,
        defence: defenceLevel,
        vitality: vitalityLevel,
        evasion: evasionLevel,
      },
      equipmentStats
    );

    const combatResult = runCombat(playerStats, {
      ...mob,
      spellPattern: Array.isArray(mob.spellPattern) ? (mob.spellPattern as MobTemplate['spellPattern']) : [],
    });

    let loot: LootDrop[] = [];
    let xpGrant = null as null | Awaited<ReturnType<typeof grantSkillXp>>;
    const durabilityLost = await degradeEquippedDurability(playerId);
    let fleeResult = null as null | ReturnType<typeof calculateFleeResult>;

    if (combatResult.outcome === 'victory') {
      // Update HP to remaining amount after combat
      await setHp(playerId, combatResult.playerHpRemaining);
      loot = await rollAndGrantLoot(playerId, mob.id);
      xpGrant = await grantSkillXp(playerId, attackSkill, combatResult.xpGained);
    } else if (combatResult.outcome === 'defeat') {
      // Player lost - calculate flee outcome based on evasion vs mob level
      fleeResult = calculateFleeResult({
        evasionLevel: evasionLevel,
        mobLevel: mob.level,
        maxHp: hpState.maxHp,
        currentGold: 0, // TODO: implement gold system
      });

      if (fleeResult.outcome === 'knockout') {
        await enterRecoveringState(playerId, hpState.maxHp);
      } else {
        await setHp(playerId, fleeResult.remainingHp);
      }
    }

    await prisma.playerBestiary.upsert({
      where: { playerId_mobTemplateId: { playerId, mobTemplateId: mob.id } },
      create: {
        playerId,
        mobTemplateId: mob.id,
        kills: combatResult.outcome === 'victory' ? 1 : 0,
      },
      update: combatResult.outcome === 'victory' ? { kills: { increment: 1 } } : {},
    });

    const combatLog = await prisma.activityLog.create({
      data: {
        playerId,
        activityType: 'combat',
        turnsSpent: COMBAT_CONSTANTS.ENCOUNTER_TURN_COST,
        result: {
          zoneId,
          zoneName: zone.name,
          mobTemplateId: mob.id,
          mobName: mob.name,
          pendingEncounterId: consumedPendingEncounterId,
          attackSkill,
          outcome: combatResult.outcome,
          log: combatResult.log,
          rewards: {
            xp: combatResult.xpGained,
            loot,
            durabilityLost,
            skillXp: xpGrant
              ? {
                  skillType: xpGrant.skillType,
                  ...xpGrant.xpResult,
                  newTotalXp: xpGrant.newTotalXp,
                  newDailyXpGained: xpGrant.newDailyXpGained,
                }
              : null,
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });

    if (consumedPendingEncounterId) {
      await prismaAny.pendingEncounter
        .delete({ where: { id: consumedPendingEncounterId } })
        .catch(() => null);
    }

    res.json({
      logId: combatLog.id,
      turns: turnSpend,
      combat: {
        zoneId,
        mobTemplateId: mob.id,
        pendingEncounterId: consumedPendingEncounterId,
        attackSkill,
        outcome: combatResult.outcome,
        log: combatResult.log,
        playerHpRemaining: combatResult.playerHpRemaining,
        fleeResult: fleeResult
          ? {
              outcome: fleeResult.outcome,
              remainingHp: fleeResult.remainingHp,
              goldLost: fleeResult.goldLost,
              isRecovering: fleeResult.outcome === 'knockout',
              recoveryCost: fleeResult.recoveryCost,
            }
          : null,
      },
      rewards: {
        xp: combatResult.xpGained,
        loot,
        durabilityLost,
        skillXp: xpGrant
          ? {
              skillType: xpGrant.skillType,
              ...xpGrant.xpResult,
              newTotalXp: xpGrant.newTotalXp,
              newDailyXpGained: xpGrant.newDailyXpGained,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

const logParamsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * GET /api/v1/combat/logs/:id
 * Fetch combat playback data for a previous encounter.
 */
combatRouter.get('/logs/:id', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const params = logParamsSchema.parse(req.params);

    const log = await prisma.activityLog.findFirst({
      where: {
        id: params.id,
        playerId,
        activityType: 'combat',
      },
      select: {
        id: true,
        result: true,
        createdAt: true,
      },
    });

    if (!log) {
      throw new AppError(404, 'Combat log not found', 'NOT_FOUND');
    }

    res.json({
      logId: log.id,
      createdAt: log.createdAt.toISOString(),
      combat: log.result,
    });
  } catch (err) {
    next(err);
  }
});
