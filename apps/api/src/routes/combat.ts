import { Router } from 'express';
import { z } from 'zod';
import { Prisma, prisma } from '@adventure/database';
import {
  applyMobPrefix,
  buildPlayerCombatStats,
  runCombat,
  calculateFleeResult,
  rollMobPrefix,
} from '@adventure/game-engine';
import {
  COMBAT_CONSTANTS,
  EXPLORATION_CONSTANTS,
  getMobPrefixDefinition,
  type CombatOptions,
  type LootDrop,
  type MobTemplate,
  type SkillType,
} from '@adventure/shared';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { rollAndGrantLoot } from '../services/lootService';
import { spendPlayerTurnsTx } from '../services/turnBankService';
import { grantSkillXp } from '../services/xpService';
import { degradeEquippedDurability } from '../services/durabilityService';
import { getHpState, setHp, enterRecoveringState } from '../services/hpService';
import { getEquipmentStats } from '../services/equipmentService';
import { getPlayerProgressionState } from '../services/attributesService';
import { respawnToHomeTown } from '../services/zoneDiscoveryService';
import { grantEncounterSiteChestRewardsTx } from '../services/chestService';
import { buildPotionPool, deductConsumedPotions } from '../services/potionService';

export const combatRouter = Router();

combatRouter.use(authenticate);

const prismaAny = prisma as unknown as any;

const attackSkillSchema = z.enum(['melee', 'ranged', 'magic']);
type AttackSkill = z.infer<typeof attackSkillSchema>;
type LootDropWithName = LootDrop & { itemName: string | null };
type EncounterSiteSize = 'small' | 'medium' | 'large';

const lootDropWithNameSchema = z.object({
  itemTemplateId: z.string().min(1),
  quantity: z.number().int().min(1),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).optional(),
  itemName: z.string().nullable().optional(),
});

const startSchema = z.object({
  encounterSiteId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  mobTemplateId: z.string().uuid().optional(),
  attackSkill: attackSkillSchema.optional(),
}).refine((v) => Boolean(v.encounterSiteId || v.zoneId), {
  message: 'encounterSiteId or zoneId is required',
});

const listEncounterSitesQuerySchema = z.object({
  zoneId: z.string().uuid().optional(),
  mobFamilyId: z.string().uuid().optional(),
  sort: z.enum(['recent', 'danger']).default('danger'),
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

function toEncounterSiteSize(value: string): EncounterSiteSize {
  if (value === 'small' || value === 'medium' || value === 'large') return value;
  return 'small';
}

type EncounterMobRole = 'trash' | 'elite' | 'boss';
type EncounterMobStatus = 'alive' | 'defeated' | 'decayed';

interface EncounterMobState {
  slot: number;
  mobTemplateId: string;
  role: EncounterMobRole;
  prefix: string | null;
  status: EncounterMobStatus;
}

function parseEncounterSiteMobs(raw: unknown): EncounterMobState[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const value = (raw as { mobs?: unknown }).mobs;
  if (!Array.isArray(value)) return [];

  const parsed: EncounterMobState[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const slot = typeof row.slot === 'number' ? Math.floor(row.slot) : null;
    const mobTemplateId = typeof row.mobTemplateId === 'string' ? row.mobTemplateId : null;
    const role = row.role === 'trash' || row.role === 'elite' || row.role === 'boss' ? row.role : null;
    const status = row.status === 'alive' || row.status === 'defeated' || row.status === 'decayed' ? row.status : null;
    const prefix = typeof row.prefix === 'string' ? row.prefix : null;
    if (slot === null || !mobTemplateId || !role || !status) continue;

    parsed.push({
      slot,
      mobTemplateId,
      role,
      prefix,
      status,
    });
  }

  return parsed.sort((a, b) => a.slot - b.slot);
}

function serializeEncounterSiteMobs(mobs: EncounterMobState[]): Prisma.InputJsonObject {
  return { mobs } as unknown as Prisma.InputJsonObject;
}

function countEncounterSiteState(mobs: EncounterMobState[]): {
  total: number;
  alive: number;
  defeated: number;
  decayed: number;
} {
  let alive = 0;
  let defeated = 0;
  let decayed = 0;
  for (const mob of mobs) {
    if (mob.status === 'alive') alive++;
    if (mob.status === 'defeated') defeated++;
    if (mob.status === 'decayed') decayed++;
  }
  return { total: mobs.length, alive, defeated, decayed };
}

function roleOrder(role: EncounterMobRole): number {
  if (role === 'trash') return 0;
  if (role === 'elite') return 1;
  return 2;
}

function getNextEncounterMob(mobs: EncounterMobState[]): EncounterMobState | null {
  const alive = mobs.filter((mob) => mob.status === 'alive');
  if (alive.length === 0) return null;
  alive.sort((a, b) => {
    const roleDiff = roleOrder(a.role) - roleOrder(b.role);
    if (roleDiff !== 0) return roleDiff;
    return a.slot - b.slot;
  });
  return alive[0] ?? null;
}

function applyEncounterSiteDecayInMemory(mobs: EncounterMobState[], discoveredAt: Date, now: Date): {
  mobs: EncounterMobState[];
  changed: boolean;
} {
  const elapsedMs = Math.max(0, now.getTime() - discoveredAt.getTime());
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const decayTarget = Math.max(0, Math.floor(elapsedHours * EXPLORATION_CONSTANTS.ENCOUNTER_SITE_DECAY_RATE_PER_HOUR));
  const currentDecayed = mobs.filter((mob) => mob.status === 'decayed').length;
  const toDecay = Math.max(0, decayTarget - currentDecayed);
  if (toDecay <= 0) return { mobs, changed: false };

  const next = mobs.map((mob) => ({ ...mob }));
  let decayed = 0;
  for (const mob of next) {
    if (mob.status !== 'alive') continue;
    mob.status = 'decayed';
    decayed++;
    if (decayed >= toDecay) break;
  }

  return { mobs: next, changed: decayed > 0 };
}

async function applyEncounterSiteDecayAndPersist(
  site: {
    id: string;
    playerId: string;
    discoveredAt: Date;
    mobs: unknown;
  },
  now: Date
): Promise<{
  mobs: EncounterMobState[];
  state: { total: number; alive: number; defeated: number; decayed: number };
  nextMob: EncounterMobState | null;
} | null> {
  const parsed = parseEncounterSiteMobs(site.mobs);
  if (parsed.length === 0) {
    await prismaAny.encounterSite.deleteMany({ where: { id: site.id, playerId: site.playerId } });
    return null;
  }

  const decayed = applyEncounterSiteDecayInMemory(parsed, site.discoveredAt, now);
  if (decayed.changed) {
    const postDecay = countEncounterSiteState(decayed.mobs);
    if (postDecay.alive <= 0) {
      await prismaAny.encounterSite.deleteMany({ where: { id: site.id, playerId: site.playerId } });
      return null;
    }

    await prismaAny.encounterSite.update({
      where: { id: site.id },
      data: { mobs: serializeEncounterSiteMobs(decayed.mobs) },
    });
  }

  const state = countEncounterSiteState(decayed.mobs);
  if (state.alive <= 0) {
    await prismaAny.encounterSite.deleteMany({ where: { id: site.id, playerId: site.playerId } });
    return null;
  }

  return {
    mobs: decayed.mobs,
    state,
    nextMob: getNextEncounterMob(decayed.mobs),
  };
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
 * GET /api/v1/combat/sites?page=1&pageSize=10&zoneId=...&mobFamilyId=...&sort=danger
 * List encounter sites for the current player with pagination and filters.
 */
combatRouter.get('/sites', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const parsedQuery = listEncounterSitesQuerySchema.safeParse({
      zoneId: req.query.zoneId,
      mobFamilyId: req.query.mobFamilyId,
      sort: req.query.sort,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    if (!parsedQuery.success) {
      throw new AppError(400, 'Invalid encounter site query parameters', 'INVALID_QUERY');
    }
    const query = parsedQuery.data;
    const now = new Date();

    const sites = await prismaAny.encounterSite.findMany({
      where: {
        playerId,
        ...(query.zoneId ? { zoneId: query.zoneId } : {}),
        ...(query.mobFamilyId ? { mobFamilyId: query.mobFamilyId } : {}),
      },
      include: {
        zone: { select: { name: true } },
        mobFamily: { select: { id: true, name: true } },
      },
      orderBy: [{ discoveredAt: 'desc' }],
    });

    const activeSites: Array<{
      encounterSiteId: string;
      zoneId: string;
      zoneName: string;
      mobFamilyId: string;
      mobFamilyName: string;
      siteName: string;
      size: string;
      totalMobs: number;
      aliveMobs: number;
      defeatedMobs: number;
      decayedMobs: number;
      nextMobTemplateId: string | null;
      nextMobPrefix: string | null;
      discoveredAt: string;
    }> = [];

    for (const site of sites) {
      const decayed = await applyEncounterSiteDecayAndPersist({
        id: site.id,
        playerId: site.playerId,
        discoveredAt: site.discoveredAt,
        mobs: site.mobs,
      }, now);
      if (!decayed) continue;

      activeSites.push({
        encounterSiteId: site.id,
        zoneId: site.zoneId,
        zoneName: site.zone.name,
        mobFamilyId: site.mobFamilyId,
        mobFamilyName: site.mobFamily.name,
        siteName: site.name,
        size: site.size,
        totalMobs: decayed.state.total,
        aliveMobs: decayed.state.alive,
        defeatedMobs: decayed.state.defeated,
        decayedMobs: decayed.state.decayed,
        nextMobTemplateId: decayed.nextMob?.mobTemplateId ?? null,
        nextMobPrefix: decayed.nextMob?.prefix ?? null,
        discoveredAt: site.discoveredAt.toISOString(),
      });
    }

    const nextMobTemplateIds = Array.from(
      new Set(activeSites.map((site) => site.nextMobTemplateId).filter((id): id is string => Boolean(id)))
    );
    const nextMobRows = nextMobTemplateIds.length > 0
      ? await prisma.mobTemplate.findMany({
          where: { id: { in: nextMobTemplateIds } },
          select: { id: true, name: true },
        })
      : [];
    const nextMobNameById = new Map(nextMobRows.map((row) => [row.id, row.name]));

    activeSites.sort((a, b) => {
      if (query.sort === 'danger') {
        if (b.aliveMobs !== a.aliveMobs) return b.aliveMobs - a.aliveMobs;
      }
      return new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime();
    });

    const total = activeSites.length;
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const offset = (query.page - 1) * query.pageSize;
    const pageItems = activeSites.slice(offset, offset + query.pageSize);
    const zones = Array.from(new Map(activeSites.map((site) => [site.zoneId, site.zoneName])).entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const mobFamilies = Array.from(new Map(activeSites.map((site) => [site.mobFamilyId, site.mobFamilyName])).entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      encounterSites: pageItems.map((site) => {
        const nextMobName = site.nextMobTemplateId ? nextMobNameById.get(site.nextMobTemplateId) ?? null : null;
        const prefixDefinition = getMobPrefixDefinition(site.nextMobPrefix);
        const nextMobDisplayName = nextMobName
          ? (prefixDefinition ? `${prefixDefinition.displayName} ${nextMobName}` : nextMobName)
          : null;

        return {
          encounterSiteId: site.encounterSiteId,
          zoneId: site.zoneId,
          zoneName: site.zoneName,
          mobFamilyId: site.mobFamilyId,
          mobFamilyName: site.mobFamilyName,
          siteName: site.siteName,
          size: site.size,
          totalMobs: site.totalMobs,
          aliveMobs: site.aliveMobs,
          defeatedMobs: site.defeatedMobs,
          decayedMobs: site.decayedMobs,
          nextMobTemplateId: site.nextMobTemplateId,
          nextMobName,
          nextMobPrefix: site.nextMobPrefix,
          nextMobDisplayName,
          discoveredAt: site.discoveredAt,
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
        mobFamilies,
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
 * POST /api/v1/combat/sites/abandon
 * Abandon encounter sites (optionally by zone).
 */
combatRouter.post('/sites/abandon', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = abandonSchema.parse(req.body ?? {});

    const result = await prismaAny.encounterSite.deleteMany({
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
    let consumedEncounterSiteId = null as null | string;
    let consumedEncounterMobSlot = null as null | number;
    let encounterSiteCleared = false;
    let siteCompletionRewards = null as null | Awaited<ReturnType<typeof grantEncounterSiteChestRewardsTx>>;

    if (body.encounterSiteId) {
      const site = await prismaAny.encounterSite.findFirst({
        where: { id: body.encounterSiteId, playerId },
        include: {
          zone: { select: { id: true } },
        },
      });

      if (!site) {
        throw new AppError(404, 'Encounter site not found', 'NOT_FOUND');
      }

      const decayed = await applyEncounterSiteDecayAndPersist({
        id: site.id,
        playerId: site.playerId,
        discoveredAt: site.discoveredAt,
        mobs: site.mobs,
      }, new Date());
      if (!decayed || !decayed.nextMob) {
        throw new AppError(410, 'Encounter site has decayed', 'SITE_DECAYED');
      }

      consumedEncounterSiteId = site.id;
      consumedEncounterMobSlot = decayed.nextMob.slot;
      zoneId = site.zoneId;
      mobTemplateId = decayed.nextMob.mobTemplateId;
      mobPrefix = decayed.nextMob.prefix ?? null;
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

    if (!body.encounterSiteId) {
      mobPrefix = rollMobPrefix();
    }

    const requestedAttackSkill: AttackSkill | null = body.attackSkill ?? null;
    const mainHandAttackSkill = await getMainHandAttackSkill(playerId);
    const attackSkill: AttackSkill = mainHandAttackSkill ?? requestedAttackSkill ?? 'melee';
    const [attackLevel, progression] = await Promise.all([
      getSkillLevel(playerId, attackSkill),
      getPlayerProgressionState(playerId),
    ]);

    const equipmentStats = await getEquipmentStats(playerId);
    const playerStats = buildPlayerCombatStats(
      hpState.currentHp,
      hpState.maxHp,
      {
        attackStyle: attackSkill,
        skillLevel: attackLevel,
        attributes: progression.attributes,
      },
      equipmentStats
    );

    const baseMob: MobTemplate = {
      ...mob,
      spellPattern: Array.isArray(mob.spellPattern) ? (mob.spellPattern as MobTemplate['spellPattern']) : [],
    };
    const prefixedMob = applyMobPrefix(baseMob, mobPrefix);
    mobPrefix = prefixedMob.mobPrefix;

    // Auto-potion setup
    const playerRecord = await prismaAny.player.findUnique({
      where: { id: playerId },
      select: { autoPotionThreshold: true },
    });
    const autoPotionThreshold = playerRecord?.autoPotionThreshold ?? 0;

    let combatOptions: CombatOptions | undefined;
    if (autoPotionThreshold > 0) {
      const potions = await buildPotionPool(playerId, hpState.maxHp);
      combatOptions = { autoPotionThreshold, potions };
    }

    const combatResult = runCombat(playerStats, prefixedMob, combatOptions);
    const turnSpend = await prisma.$transaction(async (tx) => {
      const txAny = tx as unknown as any;
      const spent = await spendPlayerTurnsTx(tx, playerId, COMBAT_CONSTANTS.ENCOUNTER_TURN_COST);

      if (consumedEncounterSiteId && combatResult.outcome === 'victory') {
        const site = await txAny.encounterSite.findFirst({
          where: { id: consumedEncounterSiteId, playerId },
          select: {
            id: true,
            playerId: true,
            mobFamilyId: true,
            size: true,
            discoveredAt: true,
            mobs: true,
          },
        });
        if (!site) {
          throw new AppError(409, 'Encounter site is no longer available', 'ENCOUNTER_SITE_UNAVAILABLE');
        }

        const decayed = applyEncounterSiteDecayInMemory(parseEncounterSiteMobs(site.mobs), site.discoveredAt, new Date());
        const mobs = decayed.mobs.map((mob) => ({ ...mob }));
        const target = mobs.find((mob) => mob.slot === consumedEncounterMobSlot);
        if (!target || target.status !== 'alive') {
          throw new AppError(409, 'Encounter site target is no longer available', 'ENCOUNTER_SITE_TARGET_UNAVAILABLE');
        }

        target.status = 'defeated';
        const counts = countEncounterSiteState(mobs);
        if (counts.alive <= 0) {
          siteCompletionRewards = await grantEncounterSiteChestRewardsTx(tx, {
            playerId,
            mobFamilyId: site.mobFamilyId,
            size: toEncounterSiteSize(site.size),
          });
          await txAny.encounterSite.deleteMany({ where: { id: consumedEncounterSiteId, playerId } });
          encounterSiteCleared = true;
        } else {
          await txAny.encounterSite.update({
            where: { id: consumedEncounterSiteId },
            data: { mobs: serializeEncounterSiteMobs(mobs) },
          });
        }
      }

      await deductConsumedPotions(playerId, combatResult.potionsConsumed, tx);

      return spent;
    });

    let loot: LootDrop[] = [];
    let xpGrant = null as null | Awaited<ReturnType<typeof grantSkillXp>>;
    const durabilityLost = await degradeEquippedDurability(playerId);
    let fleeResult = null as null | ReturnType<typeof calculateFleeResult>;
    let respawnedTo: { townId: string; townName: string } | null = null;

    const baseXp = combatResult.outcome === 'victory' ? combatResult.xpGained : 0;
    const xpAwarded = Math.max(0, baseXp);

    if (combatResult.outcome === 'victory') {
      // Update HP to remaining amount after combat
      await setHp(playerId, combatResult.playerHpRemaining);
      loot = await rollAndGrantLoot(playerId, prefixedMob.id, prefixedMob.level, prefixedMob.dropChanceMultiplier);
      xpGrant = await grantSkillXp(playerId, attackSkill, xpAwarded);
    } else if (combatResult.outcome === 'defeat') {
      // Player lost - calculate flee outcome based on evasion vs mob level
      fleeResult = calculateFleeResult({
        evasionLevel: progression.attributes.evasion,
        mobLevel: prefixedMob.level,
        maxHp: hpState.maxHp,
        currentGold: 0, // TODO: implement gold system
      });

      if (fleeResult.outcome === 'knockout') {
        await enterRecoveringState(playerId, hpState.maxHp);
        respawnedTo = await respawnToHomeTown(playerId);
      } else {
        await setHp(playerId, fleeResult.remainingHp);
      }
    }

    const lootWithNames = await enrichLootWithNames(loot);
    const siteCompletionWithNames = siteCompletionRewards
      ? {
          chestRarity: siteCompletionRewards.chestRarity,
          materialRolls: siteCompletionRewards.materialRolls,
          loot: await enrichLootWithNames(siteCompletionRewards.loot),
          recipeUnlocked: siteCompletionRewards.recipeUnlocked,
        }
      : null;

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
          source: consumedEncounterSiteId ? 'encounter_site' : 'zone_combat',
          encounterSiteId: consumedEncounterSiteId,
          encounterSiteCleared,
          attackSkill,
          outcome: combatResult.outcome,
          playerMaxHp: combatResult.playerMaxHp,
          mobMaxHp: combatResult.mobMaxHp,
          log: combatResult.log,
          potionsConsumed: combatResult.potionsConsumed,
          rewards: {
            xp: xpAwarded,
            baseXp,
            loot: lootWithNames,
            siteCompletion: siteCompletionWithNames,
            durabilityLost,
            skillXp: xpGrant
              ? {
                  skillType: xpGrant.skillType,
                  ...xpGrant.xpResult,
                  newTotalXp: xpGrant.newTotalXp,
                  newDailyXpGained: xpGrant.newDailyXpGained,
                  characterXpGain: xpGrant.characterXpGain,
                  characterXpAfter: xpGrant.characterXpAfter,
                  characterLevelBefore: xpGrant.characterLevelBefore,
                  characterLevelAfter: xpGrant.characterLevelAfter,
                  attributePointsAfter: xpGrant.attributePointsAfter,
                  characterLeveledUp: xpGrant.characterLeveledUp,
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
        zoneId,
        mobTemplateId: prefixedMob.id,
        mobPrefix,
        mobDisplayName: prefixedMob.mobDisplayName,
        encounterSiteId: consumedEncounterSiteId,
        encounterSiteCleared,
        attackSkill,
        outcome: combatResult.outcome,
        playerMaxHp: combatResult.playerMaxHp,
        mobMaxHp: combatResult.mobMaxHp,
        log: combatResult.log,
        playerHpRemaining: combatResult.playerHpRemaining,
        potionsConsumed: combatResult.potionsConsumed,
        fleeResult: fleeResult
          ? {
              outcome: fleeResult.outcome,
              remainingHp: fleeResult.remainingHp,
              goldLost: fleeResult.goldLost,
              isRecovering: fleeResult.outcome === 'knockout',
              recoveryCost: fleeResult.recoveryCost,
            }
          : null,
        ...(respawnedTo ? { respawnedTo } : {}),
      },
      rewards: {
        xp: xpAwarded,
        loot: lootWithNames,
        siteCompletion: siteCompletionWithNames,
        durabilityLost,
        skillXp: xpGrant
          ? {
              skillType: xpGrant.skillType,
              ...xpGrant.xpResult,
              newTotalXp: xpGrant.newTotalXp,
              newDailyXpGained: xpGrant.newDailyXpGained,
              characterXpGain: xpGrant.characterXpGain,
              characterXpAfter: xpGrant.characterXpAfter,
              characterLevelBefore: xpGrant.characterLevelBefore,
              characterLevelAfter: xpGrant.characterLevelAfter,
              attributePointsAfter: xpGrant.attributePointsAfter,
              characterLeveledUp: xpGrant.characterLeveledUp,
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
  loot: Array<{
    itemTemplateId: string;
    quantity: number;
    rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    itemName?: string | null;
  }>
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
    rarity: drop.rarity,
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
  source: string | null;
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
            COALESCE(
              NULLIF(("result"->>'source'), ''),
              CASE
                WHEN COALESCE(("result"->>'encounterSiteId'), '') <> '' THEN 'encounter_site'
                ELSE 'zone_combat'
              END
            ) AS "source",
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
            COALESCE(
              NULLIF(("result"->>'source'), ''),
              CASE
                WHEN COALESCE(("result"->>'encounterSiteId'), '') <> '' THEN 'encounter_site'
                ELSE 'zone_combat'
              END
            ) AS "source",
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
        source: row.source,
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
        const siteCompletionUnknown = rewardsRecord.siteCompletion;
        let nextRewards = rewardsRecord;
        if (Array.isArray(lootUnknown)) {
          const parsedLoot = lootUnknown
            .map((entry) => lootDropWithNameSchema.safeParse(entry))
            .filter((entry): entry is { success: true; data: z.infer<typeof lootDropWithNameSchema> } => entry.success)
            .map((entry) => entry.data);

          const lootWithNames = await enrichLootWithNames(parsedLoot);
          nextRewards = {
            ...nextRewards,
            loot: lootWithNames,
          };
        }

        if (siteCompletionUnknown && typeof siteCompletionUnknown === 'object' && !Array.isArray(siteCompletionUnknown)) {
          const siteCompletionRecord = siteCompletionUnknown as Record<string, unknown>;
          const chestLootUnknown = siteCompletionRecord.loot;
          if (Array.isArray(chestLootUnknown)) {
            const parsedChestLoot = chestLootUnknown
              .map((entry) => lootDropWithNameSchema.safeParse(entry))
              .filter((entry): entry is { success: true; data: z.infer<typeof lootDropWithNameSchema> } => entry.success)
              .map((entry) => entry.data);

            const chestLootWithNames = await enrichLootWithNames(parsedChestLoot);
            nextRewards = {
              ...nextRewards,
              siteCompletion: {
                ...siteCompletionRecord,
                loot: chestLootWithNames,
              },
            };
          }
        }

        combat = {
          ...combatRecord,
          rewards: nextRewards,
        } as unknown as Prisma.JsonValue;
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
