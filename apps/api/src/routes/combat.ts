import { Router } from 'express';
import { z } from 'zod';
import { Prisma, prisma } from '@adventure/database';
import { buildPlayerCombatStats, runCombat } from '@adventure/game-engine';
import { COMBAT_CONSTANTS, type LootDrop, type MobTemplate, type SkillType } from '@adventure/shared';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { rollAndGrantLoot } from '../services/lootService';
import { spendPlayerTurns } from '../services/turnBankService';
import { grantSkillXp } from '../services/xpService';
import { degradeEquippedDurability } from '../services/durabilityService';

export const combatRouter = Router();

combatRouter.use(authenticate);

const attackSkillSchema = z.enum(['melee', 'ranged', 'magic']);
type AttackSkill = z.infer<typeof attackSkillSchema>;

const startSchema = z.object({
  zoneId: z.string().uuid(),
  mobTemplateId: z.string().uuid().optional(),
  attackSkill: attackSkillSchema.optional(),
});

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

async function getSkillLevel(playerId: string, skillType: SkillType): Promise<number> {
  const skill = await prisma.playerSkill.findUnique({
    where: { playerId_skillType: { playerId, skillType } },
    select: { level: true },
  });

  return skill?.level ?? 1;
}

/**
 * POST /api/v1/combat/start
 * Spend turns and run a single combat encounter.
 */
combatRouter.post('/start', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = startSchema.parse(req.body);

    const zone = await prisma.zone.findUnique({ where: { id: body.zoneId } });
    if (!zone) {
      throw new AppError(404, 'Zone not found', 'NOT_FOUND');
    }

    let mob = null as null | (MobTemplate & { spellPattern: unknown });

    if (body.mobTemplateId) {
      const found = await prisma.mobTemplate.findUnique({ where: { id: body.mobTemplateId } });
      if (!found || found.zoneId !== body.zoneId) {
        throw new AppError(400, 'Invalid mobTemplateId for this zone', 'INVALID_MOB');
      }
      mob = found as unknown as MobTemplate & { spellPattern: unknown };
    } else {
      const mobs = await prisma.mobTemplate.findMany({ where: { zoneId: body.zoneId } });
      const picked = pickWeighted(mobs);
      if (!picked) {
        throw new AppError(400, 'No mobs available for this zone', 'NO_MOBS');
      }
      mob = picked as unknown as MobTemplate & { spellPattern: unknown };
    }

    const turnSpend = await spendPlayerTurns(playerId, COMBAT_CONSTANTS.ENCOUNTER_TURN_COST);

    const attackSkill: AttackSkill = body.attackSkill ?? 'melee';
    const [attackLevel, defenceLevel, vitalityLevel, evasionLevel] = await Promise.all([
      getSkillLevel(playerId, attackSkill),
      getSkillLevel(playerId, 'defence'),
      getSkillLevel(playerId, 'vitality'),
      getSkillLevel(playerId, 'evasion'),
    ]);

    const equipmentStats = await getEquipmentStats(playerId);
    const playerStats = buildPlayerCombatStats(
      100,
      {
        melee: attackLevel,
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

    if (combatResult.outcome === 'victory') {
      loot = await rollAndGrantLoot(playerId, mob.id);
      xpGrant = await grantSkillXp(playerId, attackSkill, combatResult.xpGained);
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
          zoneId: body.zoneId,
          zoneName: zone.name,
          mobTemplateId: mob.id,
          mobName: mob.name,
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

    res.json({
      logId: combatLog.id,
      turns: turnSpend,
      combat: {
        zoneId: body.zoneId,
        mobTemplateId: mob.id,
        outcome: combatResult.outcome,
        log: combatResult.log,
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
