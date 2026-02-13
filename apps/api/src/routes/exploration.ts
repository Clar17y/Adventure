import { Router } from 'express';
import { z } from 'zod';
import { Prisma, prisma } from '@adventure/database';
import {
  applyMobPrefix,
  buildPlayerCombatStats,
  calculateFleeResult,
  estimateExploration,
  mobToCombatantStats,
  rollMobPrefix,
  runCombat,
  simulateExploration,
  validateExplorationTurns,
} from '@adventure/game-engine';
import {
  EXPLORATION_CONSTANTS,
  type Combatant,
  type MobTemplate,
  type SkillType,
} from '@adventure/shared';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { refundPlayerTurns, spendPlayerTurns } from '../services/turnBankService';
import { enterRecoveringState, getHpState, setHp } from '../services/hpService';
import { rollAndGrantLoot } from '../services/lootService';
import { grantSkillXp } from '../services/xpService';
import { degradeEquippedDurability } from '../services/durabilityService';
import { getEquipmentStats } from '../services/equipmentService';
import { getPlayerProgressionState } from '../services/attributesService';
import { discoverZone, getUndiscoveredNeighborZones, respawnToHomeTown } from '../services/zoneDiscoveryService';

export const explorationRouter = Router();

explorationRouter.use(authenticate);

const prismaAny = prisma as unknown as any;

const estimateQuerySchema = z.object({
  turns: z.coerce.number().int(),
  zoneId: z.string().uuid().optional(),
});

const startSchema = z.object({
  zoneId: z.string().uuid(),
  turns: z.number().int(),
});

type AttackSkill = 'melee' | 'ranged' | 'magic';
type EncounterSiteSize = 'small' | 'medium' | 'large';
type EncounterMobRole = 'trash' | 'elite' | 'boss';
type EncounterMobStatus = 'alive' | 'defeated' | 'decayed';
type NarrativeEventType =
  | 'ambush_victory'
  | 'ambush_defeat'
  | 'encounter_site'
  | 'resource_node'
  | 'hidden_cache'
  | 'zone_exit';

interface EncounterMobSlot {
  slot: number;
  mobTemplateId: string;
  role: EncounterMobRole;
  prefix: string | null;
  status: EncounterMobStatus;
}

interface NarrativeEvent {
  turn: number;
  type: NarrativeEventType;
  description: string;
  details?: Record<string, unknown>;
}

interface ZoneFamilyMember {
  role: string;
  mobTemplate: {
    id: string;
    name: string;
    zoneId: string;
  };
}

interface ZoneFamilyRow {
  zoneId: string;
  mobFamilyId: string;
  discoveryWeight: number;
  minSize: string;
  maxSize: string;
  mobFamily: {
    id: string;
    name: string;
    siteNounSmall: string;
    siteNounMedium: string;
    siteNounLarge: string;
    members: ZoneFamilyMember[];
  };
}

interface PendingResourceDiscovery {
  turnOccurred: number;
  resourceNodeId: string;
  resourceType: string;
  capacity: number;
  sizeName: string;
}

interface PendingEncounterSiteDiscovery {
  turnOccurred: number;
  mobFamilyId: string;
  siteName: string;
  size: EncounterSiteSize;
  mobs: EncounterMobSlot[];
}

interface PendingAmbushCombatLog {
  turnsSpent: number;
  result: Prisma.InputJsonValue;
}

function attackSkillFromRequiredSkill(value: SkillType | null | undefined): AttackSkill | null {
  if (value === 'melee' || value === 'ranged' || value === 'magic') return value;
  return null;
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

function pickWeighted<T>(
  items: T[],
  weightKey: string,
  defaultWeight = 100
): T | null {
  const getWeight = (item: T): number => {
    const value = (item as Record<string, unknown>)[weightKey];
    return typeof value === 'number' && Number.isFinite(value) ? value : defaultWeight;
  };

  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, getWeight(item)), 0);
  if (totalWeight <= 0) return null;

  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= Math.max(0, getWeight(item));
    if (roll <= 0) return item;
  }
  return items[items.length - 1] ?? null;
}

function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getNodeSizeName(capacity: number, maxCapacity: number): string {
  const ratio = capacity / maxCapacity;
  if (ratio <= 0.25) return 'Tiny';
  if (ratio <= 0.5) return 'Small';
  if (ratio <= 0.75) return 'Medium';
  if (ratio <= 0.9) return 'Large';
  return 'Huge';
}

const ENCOUNTER_SIZE_ORDER: EncounterSiteSize[] = ['small', 'medium', 'large'];

function toEncounterSize(value: string): EncounterSiteSize | null {
  if (value === 'small' || value === 'medium' || value === 'large') return value;
  return null;
}

function pickEncounterSize(minRaw: string, maxRaw: string): EncounterSiteSize {
  const minSize = toEncounterSize(minRaw) ?? 'small';
  const maxSize = toEncounterSize(maxRaw) ?? 'large';
  const minIndex = ENCOUNTER_SIZE_ORDER.indexOf(minSize);
  const maxIndex = ENCOUNTER_SIZE_ORDER.indexOf(maxSize);
  const start = Math.max(0, Math.min(minIndex, maxIndex));
  const end = Math.max(0, Math.max(minIndex, maxIndex));
  const allowed = ENCOUNTER_SIZE_ORDER.slice(start, end + 1);
  return allowed[randomIntInclusive(0, allowed.length - 1)] ?? 'small';
}

function getEncounterRange(size: EncounterSiteSize): { min: number; max: number } {
  if (size === 'small') return EXPLORATION_CONSTANTS.ENCOUNTER_SIZE_SMALL;
  if (size === 'medium') return EXPLORATION_CONSTANTS.ENCOUNTER_SIZE_MEDIUM;
  return EXPLORATION_CONSTANTS.ENCOUNTER_SIZE_LARGE;
}

function getSiteName(
  familyName: string,
  size: EncounterSiteSize,
  nouns: { siteNounSmall: string; siteNounMedium: string; siteNounLarge: string }
): string {
  if (size === 'small') return `Small ${familyName} ${nouns.siteNounSmall}`;
  if (size === 'medium') return `${familyName} ${nouns.siteNounMedium}`;
  return `Large ${familyName} ${nouns.siteNounLarge}`;
}

function pickFamilyMemberByRole(
  members: ZoneFamilyMember[],
  role: EncounterMobRole,
  fallback: EncounterMobRole[] = []
): ZoneFamilyMember | null {
  const byRole = members.filter((member) => member.role === role);
  if (byRole.length > 0) {
    return byRole[randomIntInclusive(0, byRole.length - 1)] ?? null;
  }

  for (const fbRole of fallback) {
    const fallbackMembers = members.filter((member) => member.role === fbRole);
    if (fallbackMembers.length > 0) {
      return fallbackMembers[randomIntInclusive(0, fallbackMembers.length - 1)] ?? null;
    }
  }

  if (members.length === 0) return null;
  return members[randomIntInclusive(0, members.length - 1)] ?? null;
}

function buildEncounterSiteMobs(
  family: ZoneFamilyRow['mobFamily'],
  size: EncounterSiteSize,
  zoneId: string
): EncounterMobSlot[] {
  const zoneMembers = family.members.filter((member) => member.mobTemplate.zoneId === zoneId);
  if (zoneMembers.length === 0) return [];

  const { min, max } = getEncounterRange(size);
  const total = randomIntInclusive(min, max);

  let bossCount = 0;
  let eliteCount = 0;
  if (size === 'medium') {
    eliteCount = 1;
  } else if (size === 'large') {
    bossCount = 1;
    eliteCount = 2;
  }

  let trashCount = Math.max(0, total - eliteCount - bossCount);
  if (size === 'small' && trashCount < 2) {
    trashCount = Math.max(2, total);
  }

  const mobs: EncounterMobSlot[] = [];
  let slot = 0;

  for (let i = 0; i < trashCount; i++) {
    const member = pickFamilyMemberByRole(zoneMembers, 'trash', ['elite', 'boss']);
    if (!member) continue;
    mobs.push({
      slot: slot++,
      mobTemplateId: member.mobTemplate.id,
      role: 'trash',
      prefix: rollMobPrefix(),
      status: 'alive',
    });
  }

  for (let i = 0; i < eliteCount; i++) {
    const member = pickFamilyMemberByRole(zoneMembers, 'elite', ['trash', 'boss']);
    if (!member) continue;
    mobs.push({
      slot: slot++,
      mobTemplateId: member.mobTemplate.id,
      role: 'elite',
      prefix: rollMobPrefix(),
      status: 'alive',
    });
  }

  for (let i = 0; i < bossCount; i++) {
    const member = pickFamilyMemberByRole(zoneMembers, 'boss', ['elite', 'trash']);
    if (!member) continue;
    mobs.push({
      slot: slot++,
      mobTemplateId: member.mobTemplate.id,
      role: 'boss',
      prefix: rollMobPrefix(),
      status: 'alive',
    });
  }

  if (mobs.length === 0 && zoneMembers.length > 0) {
    const member = zoneMembers[0]!;
    mobs.push({
      slot: 0,
      mobTemplateId: member.mobTemplate.id,
      role: 'trash',
      prefix: rollMobPrefix(),
      status: 'alive',
    });
  }

  return mobs;
}

/**
 * GET /api/v1/exploration/estimate?turns=123
 * Returns probability preview for exploration outcomes.
 */
explorationRouter.get('/estimate', async (req, res, next) => {
  try {
    const query = estimateQuerySchema.parse(req.query);

    const validation = validateExplorationTurns(query.turns);
    if (!validation.valid) {
      throw new AppError(400, validation.error ?? 'Invalid turns', 'INVALID_TURNS');
    }

    let zoneExitChance: number | null = null;
    if (query.zoneId) {
      const zone = await prisma.zone.findUnique({
        where: { id: query.zoneId },
        select: { zoneExitChance: true },
      });
      if (zone) {
        zoneExitChance = zone.zoneExitChance;
      }
    }

    res.json({ estimate: estimateExploration(query.turns, zoneExitChance) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/exploration/start
 * Spend turns to explore a zone and return discovered outcomes.
 */
explorationRouter.post('/start', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = startSchema.parse(req.body);

    const hpState = await getHpState(playerId);
    if (hpState.isRecovering) {
      throw new AppError(400, 'Cannot explore while recovering', 'IS_RECOVERING');
    }
    if (hpState.currentHp <= 0) {
      throw new AppError(400, 'Cannot explore with 0 HP. Rest before exploring.', 'NO_HP');
    }

    const validation = validateExplorationTurns(body.turns);
    if (!validation.valid) {
      throw new AppError(400, validation.error ?? 'Invalid turns', 'INVALID_TURNS');
    }

    const zone = await prisma.zone.findUnique({ where: { id: body.zoneId } });
    if (!zone) {
      throw new AppError(404, 'Zone not found', 'NOT_FOUND');
    }
    if (zone.zoneType === 'town') {
      throw new AppError(400, 'Cannot explore in towns. Travel to a wild zone first.', 'TOWN_ZONE');
    }

    const [mobTemplates, resourceNodes, zoneFamilies, progression, equipmentStats, mainHandAttackSkill] = await Promise.all([
      prisma.mobTemplate.findMany({ where: { zoneId: body.zoneId } }),
      prisma.resourceNode.findMany({ where: { zoneId: body.zoneId } }),
      prismaAny.zoneMobFamily.findMany({
        where: { zoneId: body.zoneId },
        include: {
          mobFamily: {
            include: {
              members: {
                include: {
                  mobTemplate: {
                    select: { id: true, name: true, zoneId: true },
                  },
                },
              },
            },
          },
        },
      }) as Promise<ZoneFamilyRow[]>,
      getPlayerProgressionState(playerId),
      getEquipmentStats(playerId),
      getMainHandAttackSkill(playerId),
    ]);

    const attackSkill: AttackSkill = mainHandAttackSkill ?? 'melee';
    const attackLevel = await getSkillLevel(playerId, attackSkill);

    const undiscoveredNeighbors = await getUndiscoveredNeighborZones(playerId, body.zoneId);
    const effectiveExitChance = undiscoveredNeighbors.length > 0 ? zone.zoneExitChance : null;

    const turnSpend = await spendPlayerTurns(playerId, body.turns);

    const outcomes = simulateExploration(body.turns, effectiveExitChance);

    const pendingResources: PendingResourceDiscovery[] = [];
    const pendingSites: PendingEncounterSiteDiscovery[] = [];
    const pendingCombatLogs: PendingAmbushCombatLog[] = [];
    const events: NarrativeEvent[] = [];

    const hiddenCaches: Array<{ turnOccurred: number }> = [];
    let zoneExitDiscovered = false;

    let currentHp = hpState.currentHp;
    let aborted = false;
    let abortedAtTurn: number | null = null;
    let respawnedTo: { townId: string; townName: string } | null = null;

    for (const outcome of outcomes) {
      if (aborted) break;

      if (outcome.type === 'ambush' && mobTemplates.length > 0) {
        const mob = pickWeighted(mobTemplates, 'encounterWeight') as typeof mobTemplates[number] | null;
        if (!mob) continue;

        const baseMob: MobTemplate = {
          ...(mob as unknown as MobTemplate),
          spellPattern: Array.isArray((mob as { spellPattern: unknown }).spellPattern)
            ? ((mob as { spellPattern: unknown }).spellPattern as MobTemplate['spellPattern'])
            : [],
        };

        const prefixedMob = applyMobPrefix(baseMob, rollMobPrefix());
        const playerStats = buildPlayerCombatStats(
          currentHp,
          hpState.maxHp,
          {
            attackStyle: attackSkill,
            skillLevel: attackLevel,
            attributes: progression.attributes,
          },
          equipmentStats
        );

        const combatantA: Combatant = {
          id: playerId,
          name: req.player!.username,
          stats: playerStats,
        };
        const combatantB: Combatant = {
          id: prefixedMob.id,
          name: prefixedMob.mobDisplayName ?? prefixedMob.name,
          stats: mobToCombatantStats(prefixedMob),
          spells: prefixedMob.spellPattern,
        };
        const combatResult = runCombat(combatantA, combatantB);

        const durabilityLost = await degradeEquippedDurability(playerId);
        let loot: Array<{ itemTemplateId: string; quantity: number; rarity?: string }> = [];
        let xpGain = 0;
        let xpGrant: Awaited<ReturnType<typeof grantSkillXp>> | null = null;

        if (combatResult.outcome === 'victory') {
          currentHp = combatResult.combatantAHpRemaining;
          await setHp(playerId, currentHp);

          loot = await rollAndGrantLoot(playerId, prefixedMob.id, prefixedMob.level, prefixedMob.dropChanceMultiplier);
          xpGrant = await grantSkillXp(playerId, attackSkill, prefixedMob.xpReward);
          xpGain = xpGrant.xpResult.xpAfterEfficiency;

          await prisma.playerBestiary.upsert({
            where: { playerId_mobTemplateId: { playerId, mobTemplateId: prefixedMob.id } },
            create: {
              playerId,
              mobTemplateId: prefixedMob.id,
              kills: 1,
            },
            update: { kills: { increment: 1 } },
          });

          if (prefixedMob.mobPrefix) {
            await prismaAny.playerBestiaryPrefix.upsert({
              where: {
                playerId_mobTemplateId_prefix: {
                  playerId,
                  mobTemplateId: prefixedMob.id,
                  prefix: prefixedMob.mobPrefix,
                },
              },
              create: {
                playerId,
                mobTemplateId: prefixedMob.id,
                prefix: prefixedMob.mobPrefix,
                kills: 1,
              },
              update: { kills: { increment: 1 } },
            });
          }

          const skillXpReward = xpGrant
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
            : null;

          pendingCombatLogs.push({
            turnsSpent: 0,
            result: {
              zoneId: body.zoneId,
              zoneName: zone.name,
              mobTemplateId: prefixedMob.id,
              mobName: baseMob.name,
              mobPrefix: prefixedMob.mobPrefix,
              mobDisplayName: prefixedMob.mobDisplayName,
              source: 'exploration_ambush',
              encounterSiteId: null,
              attackSkill,
              outcome: combatResult.outcome,
              playerMaxHp: combatResult.combatantAMaxHp,
              mobMaxHp: combatResult.combatantBMaxHp,
              log: combatResult.log,
              rewards: {
                xp: prefixedMob.xpReward,
                baseXp: prefixedMob.xpReward,
                loot,
                durabilityLost,
                skillXp: skillXpReward,
              },
            } as unknown as Prisma.InputJsonValue,
          });

          events.push({
            turn: outcome.turnOccurred,
            type: 'ambush_victory',
            description: `A ${prefixedMob.mobDisplayName} ambushed you - you defeated it! (+${xpGain} XP)`,
            details: {
              mobTemplateId: prefixedMob.id,
              mobName: baseMob.name,
              mobPrefix: prefixedMob.mobPrefix,
              mobDisplayName: prefixedMob.mobDisplayName,
              outcome: combatResult.outcome,
              playerMaxHp: combatResult.combatantAMaxHp,
              mobMaxHp: combatResult.combatantBMaxHp,
              log: combatResult.log,
              playerHpRemaining: currentHp,
              xp: xpGain,
              loot,
              durabilityLost,
            },
          });
        } else {
          const fleeResult = calculateFleeResult({
            evasionLevel: progression.attributes.evasion,
            mobLevel: prefixedMob.level,
            maxHp: hpState.maxHp,
            currentGold: 0, // TODO: wire gold when economy is implemented
          });

          if (fleeResult.outcome === 'knockout') {
            currentHp = 0;
            await enterRecoveringState(playerId, hpState.maxHp);
            respawnedTo = await respawnToHomeTown(playerId);
          } else {
            currentHp = fleeResult.remainingHp;
            await setHp(playerId, currentHp);
          }

          const defeatDescription = fleeResult.outcome === 'knockout'
            ? `A ${prefixedMob.mobDisplayName} ambushed you - you were defeated and knocked out!`
            : `A ${prefixedMob.mobDisplayName} ambushed you - you were defeated but escaped with ${fleeResult.remainingHp} HP.`;

          pendingCombatLogs.push({
            turnsSpent: 0,
            result: {
              zoneId: body.zoneId,
              zoneName: zone.name,
              mobTemplateId: prefixedMob.id,
              mobName: baseMob.name,
              mobPrefix: prefixedMob.mobPrefix,
              mobDisplayName: prefixedMob.mobDisplayName,
              source: 'exploration_ambush',
              encounterSiteId: null,
              attackSkill,
              outcome: combatResult.outcome,
              playerMaxHp: combatResult.combatantAMaxHp,
              mobMaxHp: combatResult.combatantBMaxHp,
              log: combatResult.log,
              rewards: {
                xp: 0,
                baseXp: 0,
                loot: [],
                durabilityLost,
                skillXp: null,
              },
            } as unknown as Prisma.InputJsonValue,
          });

          events.push({
            turn: outcome.turnOccurred,
            type: 'ambush_defeat',
            description: defeatDescription,
            details: {
              mobTemplateId: prefixedMob.id,
              mobName: baseMob.name,
              mobPrefix: prefixedMob.mobPrefix,
              mobDisplayName: prefixedMob.mobDisplayName,
              outcome: combatResult.outcome,
              playerMaxHp: combatResult.combatantAMaxHp,
              mobMaxHp: combatResult.combatantBMaxHp,
              log: combatResult.log,
              playerHpRemaining: currentHp,
              fleeResult: {
                outcome: fleeResult.outcome,
                remainingHp: fleeResult.remainingHp,
                goldLost: fleeResult.goldLost,
                recoveryCost: fleeResult.recoveryCost,
              },
              durabilityLost,
            },
          });

          aborted = true;
          abortedAtTurn = outcome.turnOccurred;
        }

        continue;
      }

      if (outcome.type === 'encounter_site' && zoneFamilies.length > 0) {
        const pickedFamily = pickWeighted(zoneFamilies, 'discoveryWeight') as ZoneFamilyRow | null;
        if (!pickedFamily) continue;

        const size = pickEncounterSize(pickedFamily.minSize, pickedFamily.maxSize);
        const mobs = buildEncounterSiteMobs(pickedFamily.mobFamily, size, body.zoneId);
        if (mobs.length === 0) continue;

        const siteName = getSiteName(pickedFamily.mobFamily.name, size, pickedFamily.mobFamily);

        pendingSites.push({
          turnOccurred: outcome.turnOccurred,
          mobFamilyId: pickedFamily.mobFamilyId,
          siteName,
          size,
          mobs,
        });

        events.push({
          turn: outcome.turnOccurred,
          type: 'encounter_site',
          description: `You stumbled into a ${siteName} (${mobs.length} mobs inside).`,
          details: {
            mobFamilyId: pickedFamily.mobFamilyId,
            mobFamilyName: pickedFamily.mobFamily.name,
            siteName,
            size,
            totalMobs: mobs.length,
          },
        });

        continue;
      }

      if (outcome.type === 'resource_node' && resourceNodes.length > 0) {
        const nodeTemplate = pickWeighted(resourceNodes, 'discoveryWeight') as typeof resourceNodes[number] | null;
        if (!nodeTemplate) continue;

        const capacity = randomIntInclusive(nodeTemplate.minCapacity, nodeTemplate.maxCapacity);
        const sizeName = getNodeSizeName(capacity, nodeTemplate.maxCapacity);

        pendingResources.push({
          turnOccurred: outcome.turnOccurred,
          resourceNodeId: nodeTemplate.id,
          resourceType: nodeTemplate.resourceType,
          capacity,
          sizeName,
        });

        events.push({
          turn: outcome.turnOccurred,
          type: 'resource_node',
          description: `You discovered a ${sizeName} ${nodeTemplate.resourceType.replace(/_/g, ' ')} node (${capacity} capacity).`,
          details: {
            resourceNodeId: nodeTemplate.id,
            resourceType: nodeTemplate.resourceType,
            sizeName,
            capacity,
          },
        });

        continue;
      }

      if (outcome.type === 'hidden_cache') {
        hiddenCaches.push({ turnOccurred: outcome.turnOccurred });
        events.push({
          turn: outcome.turnOccurred,
          type: 'hidden_cache',
          description: 'You found a hidden cache.',
          details: {},
        });
        continue;
      }

      if (outcome.type === 'zone_exit' && undiscoveredNeighbors.length > 0) {
        const neighborIndex = randomIntInclusive(0, undiscoveredNeighbors.length - 1);
        const neighbor = undiscoveredNeighbors[neighborIndex]!;
        await discoverZone(playerId, neighbor.id);
        // Remove so subsequent zone_exit rolls pick a different neighbor
        undiscoveredNeighbors.splice(neighborIndex, 1);

        zoneExitDiscovered = true;
        events.push({
          turn: outcome.turnOccurred,
          type: 'zone_exit',
          description: `You discovered a path leading to **${neighbor.name}**.`,
          details: {
            discoveredZoneId: neighbor.id,
            discoveredZoneName: neighbor.name,
          },
        });
      }
    }

    const refundAmount = aborted && abortedAtTurn ? Math.max(0, body.turns - abortedAtTurn) : 0;
    const refundedTurns = refundAmount > 0 ? await refundPlayerTurns(playerId, refundAmount) : null;

    const persisted = await prisma.$transaction(async (tx) => {
      const txAny = tx as unknown as any;
      const createdResourceDiscoveries: Array<{
        turnOccurred: number;
        playerNodeId: string;
        resourceNodeId: string;
        resourceType: string;
        capacity: number;
        sizeName: string;
      }> = [];

      for (const discovery of pendingResources) {
        const playerNode = await tx.playerResourceNode.create({
          data: {
            playerId,
            resourceNodeId: discovery.resourceNodeId,
            remainingCapacity: discovery.capacity,
            decayedCapacity: 0,
          },
          select: { id: true },
        });

        createdResourceDiscoveries.push({
          turnOccurred: discovery.turnOccurred,
          playerNodeId: playerNode.id,
          resourceNodeId: discovery.resourceNodeId,
          resourceType: discovery.resourceType,
          capacity: discovery.capacity,
          sizeName: discovery.sizeName,
        });
      }

      const createdEncounterSites: Array<{
        turnOccurred: number;
        encounterSiteId: string;
        mobFamilyId: string;
        siteName: string;
        size: EncounterSiteSize;
        totalMobs: number;
        discoveredAt: string;
      }> = [];

      for (const discovery of pendingSites) {
        const site = await txAny.encounterSite.create({
          data: {
            playerId,
            zoneId: body.zoneId,
            mobFamilyId: discovery.mobFamilyId,
            name: discovery.siteName,
            size: discovery.size,
            mobs: { mobs: discovery.mobs },
          },
          select: {
            id: true,
            discoveredAt: true,
          },
        });

        createdEncounterSites.push({
          turnOccurred: discovery.turnOccurred,
          encounterSiteId: site.id,
          mobFamilyId: discovery.mobFamilyId,
          siteName: discovery.siteName,
          size: discovery.size,
          totalMobs: discovery.mobs.length,
          discoveredAt: site.discoveredAt.toISOString(),
        });
      }

      for (const combatLog of pendingCombatLogs) {
        await tx.activityLog.create({
          data: {
            playerId,
            activityType: 'combat',
            turnsSpent: combatLog.turnsSpent,
            result: combatLog.result,
          },
        });
      }

      const explorationLog = await tx.activityLog.create({
        data: {
          playerId,
          activityType: 'exploration',
          turnsSpent: body.turns,
          result: {
            zoneId: body.zoneId,
            zoneName: zone.name,
            aborted,
            abortedAtTurn,
            refundedTurns: refundAmount,
            events,
            resourceDiscoveries: createdResourceDiscoveries,
            encounterSites: createdEncounterSites,
            hiddenCaches,
            zoneExitDiscovered,
            finalHp: currentHp,
          } as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });

      return {
        logId: explorationLog.id,
        resourceDiscoveries: createdResourceDiscoveries,
        encounterSites: createdEncounterSites,
      };
    });

    if (events.length === 0) {
      events.push({
        turn: body.turns,
        type: 'hidden_cache',
        description: `You explored the ${zone.name} for ${body.turns} turns but found nothing of interest.`,
        details: {},
      });
    }

    res.json({
      logId: persisted.logId,
      zone: {
        id: zone.id,
        name: zone.name,
        difficulty: zone.difficulty,
      },
      turns: refundAmount > 0 && refundedTurns ? refundedTurns : turnSpend,
      aborted,
      refundedTurns: refundAmount,
      events,
      encounterSites: persisted.encounterSites,
      resourceDiscoveries: persisted.resourceDiscoveries,
      hiddenCaches,
      zoneExitDiscovered,
      ...(respawnedTo ? { respawnedTo } : {}),
    });
  } catch (err) {
    next(err);
  }
});
