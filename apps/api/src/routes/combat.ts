import { Router } from 'express';
import { z } from 'zod';
import { Prisma, prisma } from '@adventure/database';
import { applyMobPrefix, buildPlayerCombatStats, runCombat, calculateFleeResult, rollMobPrefix } from '@adventure/game-engine';
import { COMBAT_CONSTANTS, getMobPrefixDefinition, type LootDrop, type MobTemplate, type SkillType } from '@adventure/shared';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { rollAndGrantLoot } from '../services/lootService';
import { spendPlayerTurns } from '../services/turnBankService';
import { grantSkillXp } from '../services/xpService';
import { degradeEquippedDurability } from '../services/durabilityService';
import { getHpState, setHp, enterRecoveringState } from '../services/hpService';
import { getEquipmentStats } from '../services/equipmentService';

export const combatRouter = Router();

combatRouter.use(authenticate);

const prismaAny = prisma as unknown as any;

const attackSkillSchema = z.enum(['melee', 'ranged', 'magic']);
type AttackSkill = z.infer<typeof attackSkillSchema>;
type LootDropWithName = LootDrop & { itemName: string | null };

const lootDropWithNameSchema = z.object({
  itemTemplateId: z.string().min(1),
  quantity: z.number().int().min(1),
  itemName: z.string().nullable().optional(),
});

const startSchema = z.object({
  pendingEncounterId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  mobTemplateId: z.string().uuid().optional(),
  attackSkill: attackSkillSchema.optional(),
}).refine((v) => Boolean(v.pendingEncounterId || v.zoneId), {
  message: 'pendingEncounterId or zoneId is required',
});

const listPendingQuerySchema = z.object({
  zoneId: z.string().uuid().optional(),
  mobTemplateId: z.string().uuid().optional(),
  sort: z.enum(['recent', 'expires']).default('expires'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
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
 * GET /api/v1/combat/pending?page=1&pageSize=10&zoneId=...&mobTemplateId=...&sort=expires
 * List pending encounters for the current player with pagination and filters.
 */
combatRouter.get('/pending', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const now = new Date();
    const parsedQuery = listPendingQuerySchema.safeParse({
      zoneId: req.query.zoneId,
      mobTemplateId: req.query.mobTemplateId,
      sort: req.query.sort,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    if (!parsedQuery.success) {
      throw new AppError(400, 'Invalid pending encounter query parameters', 'INVALID_QUERY');
    }
    const query = parsedQuery.data;

    await prismaAny.pendingEncounter.deleteMany({
      where: { playerId, expiresAt: { lte: now } },
    });

    const baseWhere = {
      playerId,
      expiresAt: { gt: now },
    };
    const where = {
      ...baseWhere,
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.mobTemplateId ? { mobTemplateId: query.mobTemplateId } : {}),
    };
    const offset = (query.page - 1) * query.pageSize;

    const [total, pending, distinctZones, distinctMobs] = await Promise.all([
      prismaAny.pendingEncounter.count({ where }),
      prismaAny.pendingEncounter.findMany({
        where,
        orderBy: query.sort === 'recent'
          ? [{ createdAt: 'desc' }]
          : [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
        skip: offset,
        take: query.pageSize,
        include: {
          zone: { select: { name: true } },
          mobTemplate: { select: { id: true, name: true } },
        },
      }),
      prismaAny.pendingEncounter.groupBy({
        where: baseWhere,
        by: ['zoneId'],
      }),
      prismaAny.pendingEncounter.groupBy({
        where: baseWhere,
        by: ['mobTemplateId'],
      }),
    ]);

    const zoneIds = distinctZones.map((row: { zoneId: string }) => row.zoneId);
    const mobTemplateIds = distinctMobs.map((row: { mobTemplateId: string }) => row.mobTemplateId);

    const [zoneRows, mobRows] = await Promise.all([
      zoneIds.length > 0
        ? prisma.zone.findMany({
            where: { id: { in: zoneIds } },
            select: { id: true, name: true },
          })
        : [],
      mobTemplateIds.length > 0
        ? prisma.mobTemplate.findMany({
            where: { id: { in: mobTemplateIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const zones = zoneRows.sort((a, b) => a.name.localeCompare(b.name));
    const mobs = mobRows.sort((a, b) => a.name.localeCompare(b.name));
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

    res.json({
      pendingEncounters: pending.map((p: any) => {
        const prefixDefinition = getMobPrefixDefinition(p.mobPrefix);
        const mobDisplayName = prefixDefinition ? `${prefixDefinition.displayName} ${p.mobTemplate.name}` : p.mobTemplate.name;
        return {
          encounterId: p.id,
          zoneId: p.zoneId,
          zoneName: p.zone.name,
          mobTemplateId: p.mobTemplateId,
          mobName: p.mobTemplate.name,
          mobPrefix: p.mobPrefix ?? null,
          mobDisplayName,
          turnOccurred: p.turnOccurred,
          createdAt: p.createdAt.toISOString(),
          expiresAt: p.expiresAt.toISOString(),
        };
      }),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrevious: query.page > 1,
      },
      filters: {
        zones,
        mobs,
      },
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
    let mobPrefix = null as string | null;
    let consumedPendingEncounterId = null as null | string;

    if (body.pendingEncounterId) {
      const pending = await prismaAny.pendingEncounter.findFirst({
        where: { id: body.pendingEncounterId, playerId },
        select: { id: true, zoneId: true, mobTemplateId: true, mobPrefix: true, expiresAt: true },
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
      mobPrefix = pending.mobPrefix ?? null;
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

    if (!body.pendingEncounterId) {
      mobPrefix = rollMobPrefix();
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
      hpState.maxHp,
      {
        attack: attackLevel,
        defence: defenceLevel,
        vitality: vitalityLevel,
        evasion: evasionLevel,
      },
      equipmentStats
    );

    const baseMob: MobTemplate = {
      ...mob,
      spellPattern: Array.isArray(mob.spellPattern) ? (mob.spellPattern as MobTemplate['spellPattern']) : [],
    };
    const prefixedMob = applyMobPrefix(baseMob, mobPrefix);
    mobPrefix = prefixedMob.mobPrefix;

    const combatResult = runCombat(playerStats, prefixedMob);

    let loot: LootDrop[] = [];
    let xpGrant = null as null | Awaited<ReturnType<typeof grantSkillXp>>;
    const durabilityLost = await degradeEquippedDurability(playerId);
    let fleeResult = null as null | ReturnType<typeof calculateFleeResult>;

    // Grant secondary skill XP (defence/evasion) regardless of outcome
    const secondaryXpGrants: Array<Awaited<ReturnType<typeof grantSkillXp>>> = [];
    const { secondarySkillXp } = combatResult;
    if (secondarySkillXp.defence.xpGained > 0) {
      secondaryXpGrants.push(await grantSkillXp(playerId, 'defence', secondarySkillXp.defence.xpGained));
    }
    if (secondarySkillXp.evasion.xpGained > 0) {
      secondaryXpGrants.push(await grantSkillXp(playerId, 'evasion', secondarySkillXp.evasion.xpGained));
    }

    if (combatResult.outcome === 'victory') {
      // Update HP to remaining amount after combat
      await setHp(playerId, combatResult.playerHpRemaining);
      loot = await rollAndGrantLoot(playerId, prefixedMob.id, prefixedMob.dropChanceMultiplier);
      xpGrant = await grantSkillXp(playerId, attackSkill, combatResult.xpGained);
    } else if (combatResult.outcome === 'defeat') {
      // Player lost - calculate flee outcome based on evasion vs mob level
      fleeResult = calculateFleeResult({
        evasionLevel: evasionLevel,
        mobLevel: prefixedMob.level,
        maxHp: hpState.maxHp,
        currentGold: 0, // TODO: implement gold system
      });

      if (fleeResult.outcome === 'knockout') {
        await enterRecoveringState(playerId, hpState.maxHp);
      } else {
        await setHp(playerId, fleeResult.remainingHp);
      }
    }

    const lootWithNames = await enrichLootWithNames(loot);

    await prisma.playerBestiary.upsert({
      where: { playerId_mobTemplateId: { playerId, mobTemplateId: prefixedMob.id } },
      create: {
        playerId,
        mobTemplateId: prefixedMob.id,
        kills: combatResult.outcome === 'victory' ? 1 : 0,
      },
      update: combatResult.outcome === 'victory' ? { kills: { increment: 1 } } : {},
    });

    if (mobPrefix) {
      await prismaAny.playerBestiaryPrefix.upsert({
        where: {
          playerId_mobTemplateId_prefix: {
            playerId,
            mobTemplateId: prefixedMob.id,
            prefix: mobPrefix,
          },
        },
        create: {
          playerId,
          mobTemplateId: prefixedMob.id,
          prefix: mobPrefix,
          kills: combatResult.outcome === 'victory' ? 1 : 0,
        },
        update: combatResult.outcome === 'victory' ? { kills: { increment: 1 } } : {},
      });
    }

    const combatLog = await prisma.activityLog.create({
      data: {
        playerId,
        activityType: 'combat',
        turnsSpent: COMBAT_CONSTANTS.ENCOUNTER_TURN_COST,
        result: {
          zoneId,
          zoneName: zone.name,
          mobTemplateId: prefixedMob.id,
          mobName: baseMob.name,
          mobPrefix,
          mobDisplayName: prefixedMob.mobDisplayName,
          pendingEncounterId: consumedPendingEncounterId,
          attackSkill,
          outcome: combatResult.outcome,
          playerMaxHp: combatResult.playerMaxHp,
          mobMaxHp: combatResult.mobMaxHp,
          log: combatResult.log,
          rewards: {
            xp: combatResult.xpGained,
            loot: lootWithNames,
            durabilityLost,
            skillXp: xpGrant
              ? {
                  skillType: xpGrant.skillType,
                  ...xpGrant.xpResult,
                  newTotalXp: xpGrant.newTotalXp,
                  newDailyXpGained: xpGrant.newDailyXpGained,
                }
              : null,
            secondarySkillXp: {
              defence: secondarySkillXp.defence,
              evasion: secondarySkillXp.evasion,
              grants: secondaryXpGrants.map((g) => ({
                skillType: g.skillType,
                ...g.xpResult,
                newTotalXp: g.newTotalXp,
                newDailyXpGained: g.newDailyXpGained,
              })),
            },
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
        mobTemplateId: prefixedMob.id,
        mobPrefix,
        mobDisplayName: prefixedMob.mobDisplayName,
        pendingEncounterId: consumedPendingEncounterId,
        attackSkill,
        outcome: combatResult.outcome,
        playerMaxHp: combatResult.playerMaxHp,
        mobMaxHp: combatResult.mobMaxHp,
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
        loot: lootWithNames,
        durabilityLost,
        skillXp: xpGrant
          ? {
              skillType: xpGrant.skillType,
              ...xpGrant.xpResult,
              newTotalXp: xpGrant.newTotalXp,
              newDailyXpGained: xpGrant.newDailyXpGained,
            }
          : null,
        secondarySkillXp: {
          defence: secondarySkillXp.defence,
          evasion: secondarySkillXp.evasion,
          grants: secondaryXpGrants.map((g) => ({
            skillType: g.skillType,
            ...g.xpResult,
            newTotalXp: g.newTotalXp,
            newDailyXpGained: g.newDailyXpGained,
          })),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

const logParamsSchema = z.object({
  id: z.string().uuid(),
});

const listLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  outcome: z.enum(['victory', 'defeat', 'fled']).optional(),
  zoneId: z.string().uuid().optional(),
  mobTemplateId: z.string().uuid().optional(),
  sort: z.enum(['recent', 'xp']).default('recent'),
  search: z.string().trim().min(1).max(64).optional(),
});

interface CombatHistoryCountRow {
  total: bigint;
}

async function enrichLootWithNames(
  loot: Array<{ itemTemplateId: string; quantity: number; itemName?: string | null }>
): Promise<LootDropWithName[]> {
  if (loot.length === 0) return [];

  const templateIdsMissingName = Array.from(
    new Set(
      loot
        .filter((drop) => !drop.itemName)
        .map((drop) => drop.itemTemplateId)
    )
  );

  let templateNameById = new Map<string, string>();
  if (templateIdsMissingName.length > 0) {
    const templates = await prisma.itemTemplate.findMany({
      where: { id: { in: templateIdsMissingName } },
      select: { id: true, name: true },
    });
    templateNameById = new Map(templates.map((template) => [template.id, template.name]));
  }

  return loot.map((drop) => ({
    itemTemplateId: drop.itemTemplateId,
    quantity: drop.quantity,
    itemName: drop.itemName ?? templateNameById.get(drop.itemTemplateId) ?? null,
  }));
}

interface CombatHistoryListRow {
  id: string;
  createdAt: Date;
  zoneId: string | null;
  zoneName: string | null;
  mobTemplateId: string | null;
  mobName: string | null;
  mobDisplayName: string | null;
  outcome: string | null;
  xpGained: number;
  roundCount: number;
}

interface CombatHistoryFilterRow {
  id: string | null;
  name: string | null;
}

/**
 * GET /api/v1/combat/logs
 * Fetch paginated combat history with filters.
 */
combatRouter.get('/logs', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const query = listLogsQuerySchema.parse({
      page: req.query.page,
      pageSize: req.query.pageSize,
      outcome: req.query.outcome,
      zoneId: req.query.zoneId,
      mobTemplateId: req.query.mobTemplateId,
      sort: req.query.sort,
      search: req.query.search,
    });

    const whereParts: Prisma.Sql[] = [
      Prisma.sql`"player_id" = ${playerId}`,
      Prisma.sql`"activity_type" = 'combat'`,
    ];

    if (query.outcome) {
      whereParts.push(Prisma.sql`("result"->>'outcome') = ${query.outcome}`);
    }
    if (query.zoneId) {
      whereParts.push(Prisma.sql`("result"->>'zoneId') = ${query.zoneId}`);
    }
    if (query.mobTemplateId) {
      whereParts.push(Prisma.sql`("result"->>'mobTemplateId') = ${query.mobTemplateId}`);
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      whereParts.push(
        Prisma.sql`(
          ("result"->>'zoneName') ILIKE ${pattern}
          OR ("result"->>'mobName') ILIKE ${pattern}
          OR ("result"->>'mobDisplayName') ILIKE ${pattern}
        )`
      );
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(whereParts, ' AND ')}`;
    const offset = (query.page - 1) * query.pageSize;
    const listRowsQuery = query.sort === 'xp'
      ? Prisma.sql`
          SELECT
            "id",
            "created_at" AS "createdAt",
            ("result"->>'zoneId') AS "zoneId",
            ("result"->>'zoneName') AS "zoneName",
            ("result"->>'mobTemplateId') AS "mobTemplateId",
            ("result"->>'mobName') AS "mobName",
            COALESCE(("result"->>'mobDisplayName'), ("result"->>'mobName')) AS "mobDisplayName",
            ("result"->>'outcome') AS "outcome",
            COALESCE(NULLIF("result"->'rewards'->>'xp', '')::int, 0) AS "xpGained",
            COALESCE((
              SELECT MAX(
                CASE
                  WHEN jsonb_typeof(log_entry->'round') = 'number'
                    THEN (log_entry->>'round')::int
                  ELSE 0
                END
              )
              FROM jsonb_array_elements(COALESCE("result"->'log', '[]'::jsonb)) AS log_entry
            ), 0) AS "roundCount"
          FROM "activity_logs"
          ${whereClause}
          ORDER BY COALESCE(NULLIF("result"->'rewards'->>'xp', '')::int, 0) DESC, "created_at" DESC
          LIMIT ${query.pageSize}
          OFFSET ${offset}
        `
      : Prisma.sql`
          SELECT
            "id",
            "created_at" AS "createdAt",
            ("result"->>'zoneId') AS "zoneId",
            ("result"->>'zoneName') AS "zoneName",
            ("result"->>'mobTemplateId') AS "mobTemplateId",
            ("result"->>'mobName') AS "mobName",
            COALESCE(("result"->>'mobDisplayName'), ("result"->>'mobName')) AS "mobDisplayName",
            ("result"->>'outcome') AS "outcome",
            COALESCE(NULLIF("result"->'rewards'->>'xp', '')::int, 0) AS "xpGained",
            COALESCE((
              SELECT MAX(
                CASE
                  WHEN jsonb_typeof(log_entry->'round') = 'number'
                    THEN (log_entry->>'round')::int
                  ELSE 0
                END
              )
              FROM jsonb_array_elements(COALESCE("result"->'log', '[]'::jsonb)) AS log_entry
            ), 0) AS "roundCount"
          FROM "activity_logs"
          ${whereClause}
          ORDER BY "created_at" DESC
          LIMIT ${query.pageSize}
          OFFSET ${offset}
        `;

    const [countRows, listRows, zoneRows, mobRows] = await Promise.all([
      prisma.$queryRaw<CombatHistoryCountRow[]>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS "total"
          FROM "activity_logs"
          ${whereClause}
        `
      ),
      prisma.$queryRaw<CombatHistoryListRow[]>(listRowsQuery),
      prisma.$queryRaw<CombatHistoryFilterRow[]>(
        Prisma.sql`
          SELECT DISTINCT
            ("result"->>'zoneId') AS "id",
            ("result"->>'zoneName') AS "name"
          FROM "activity_logs"
          WHERE "player_id" = ${playerId}
            AND "activity_type" = 'combat'
            AND ("result"->>'zoneId') IS NOT NULL
            AND ("result"->>'zoneName') IS NOT NULL
          ORDER BY "name" ASC
        `
      ),
      prisma.$queryRaw<CombatHistoryFilterRow[]>(
        Prisma.sql`
          SELECT DISTINCT
            ("result"->>'mobTemplateId') AS "id",
            ("result"->>'mobName') AS "name"
          FROM "activity_logs"
          WHERE "player_id" = ${playerId}
            AND "activity_type" = 'combat'
            AND ("result"->>'mobTemplateId') IS NOT NULL
            AND ("result"->>'mobName') IS NOT NULL
          ORDER BY "name" ASC
        `
      ),
    ]);

    const total = Number(countRows[0]?.total ?? 0n);
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

    res.json({
      logs: listRows.map((row) => ({
        logId: row.id,
        createdAt: row.createdAt.toISOString(),
        zoneId: row.zoneId,
        zoneName: row.zoneName,
        mobTemplateId: row.mobTemplateId,
        mobName: row.mobName,
        mobDisplayName: row.mobDisplayName ?? row.mobName,
        outcome: row.outcome,
        roundCount: row.roundCount,
        xpGained: row.xpGained,
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrevious: query.page > 1,
      },
      filters: {
        zones: zoneRows.filter((row) => row.id && row.name).map((row) => ({ id: row.id!, name: row.name! })),
        mobs: mobRows.filter((row) => row.id && row.name).map((row) => ({ id: row.id!, name: row.name! })),
      },
    });
  } catch (err) {
    next(err);
  }
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

    let combat = log.result;
    if (combat && typeof combat === 'object' && !Array.isArray(combat)) {
      const combatRecord = combat as Record<string, unknown>;
      const rewards = combatRecord.rewards;

      if (rewards && typeof rewards === 'object' && !Array.isArray(rewards)) {
        const rewardsRecord = rewards as Record<string, unknown>;
        const lootUnknown = rewardsRecord.loot;
        if (Array.isArray(lootUnknown)) {
          const parsedLoot = lootUnknown
            .map((entry) => lootDropWithNameSchema.safeParse(entry))
            .filter((entry): entry is { success: true; data: z.infer<typeof lootDropWithNameSchema> } => entry.success)
            .map((entry) => entry.data);

          const lootWithNames = await enrichLootWithNames(parsedLoot);
          combat = {
            ...combatRecord,
            rewards: {
              ...rewardsRecord,
              loot: lootWithNames,
            },
          } as unknown as Prisma.JsonValue;
        }
      }
    }

    res.json({
      logId: log.id,
      createdAt: log.createdAt.toISOString(),
      combat,
    });
  } catch (err) {
    next(err);
  }
});
