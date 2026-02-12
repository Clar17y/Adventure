import { Router } from 'express';
import { z } from 'zod';
import { Prisma, prisma } from '@adventure/database';
import {
  buildPlayerCombatStats,
  runCombat,
  applyMobPrefix,
  rollMobPrefix,
  simulateTravelAmbushes,
  calculateFleeResult,
} from '@adventure/game-engine';
import type { MobTemplate, SkillType } from '@adventure/shared';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { spendPlayerTurns, refundPlayerTurns } from '../services/turnBankService';
import { getHpState, enterRecoveringState, setHp } from '../services/hpService';
import { getEquipmentStats } from '../services/equipmentService';
import { getPlayerProgressionState } from '../services/attributesService';
import { grantSkillXp } from '../services/xpService';
import { rollAndGrantLoot } from '../services/lootService';
import { degradeEquippedDurability } from '../services/durabilityService';
import {
  ensureStarterDiscoveries,
  getDiscoveredZoneIds,
  discoverZonesFromTown,
  respawnToHomeTown,
} from '../services/zoneDiscoveryService';

const db = prisma as unknown as any;

export const zonesRouter = Router();

zonesRouter.use(authenticate);

/**
 * GET /api/v1/zones
 * Returns zones with discovery state, connections between discovered zones, and currentZoneId.
 */
zonesRouter.get('/', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;

    // Lazy-init starter discoveries for this player
    await ensureStarterDiscoveries(playerId);

    // Fetch all data in parallel
    const [zones, connections, discoveredZoneIds, player] = await Promise.all([
      db.zone.findMany({
        orderBy: [{ isStarter: 'desc' }, { difficulty: 'asc' }, { name: 'asc' }],
      }),
      db.zoneConnection.findMany({ select: { fromId: true, toId: true } }),
      getDiscoveredZoneIds(playerId),
      prisma.player.findUnique({ where: { id: playerId }, select: { currentZoneId: true } }),
    ]);

    if (zones.length === 0) {
      throw new AppError(500, 'No zones configured. Run database seed.', 'NO_ZONES_CONFIGURED');
    }

    // Lazy-init currentZoneId if null (existing players from before this feature)
    let currentZoneId = player?.currentZoneId ?? null;
    if (!currentZoneId) {
      const starterZone = await db.zone.findFirst({ where: { isStarter: true } });
      if (starterZone) {
        currentZoneId = starterZone.id;
        await prisma.player.update({
          where: { id: playerId },
          data: { currentZoneId: starterZone.id, homeTownId: starterZone.id },
        });
      }
    }

    // Only include connections where both endpoints are discovered
    const filteredConnections = connections.filter(
      (c: { fromId: string; toId: string }) =>
        discoveredZoneIds.has(c.fromId) && discoveredZoneIds.has(c.toId),
    );

    res.json({
      zones: zones.map((z: { id: string; name: string; description: string | null; difficulty: number; travelCost: number; isStarter: boolean; zoneType: string; zoneExitChance: number | null }) => {
        const discovered = discoveredZoneIds.has(z.id);
        return {
          id: z.id,
          name: discovered ? z.name : '???',
          description: discovered ? z.description : null,
          difficulty: discovered ? z.difficulty : 0,
          travelCost: discovered ? z.travelCost : 0,
          isStarter: z.isStarter,
          discovered,
          zoneType: z.zoneType,
          zoneExitChance: discovered ? z.zoneExitChance : null,
        };
      }),
      connections: filteredConnections.map((c: { fromId: string; toId: string }) => ({
        fromId: c.fromId,
        toId: c.toId,
      })),
      currentZoneId,
    });
  } catch (err) {
    next(err);
  }
});

const travelSchema = z.object({
  zoneId: z.string().uuid(),
});

type AttackSkill = 'melee' | 'ranged' | 'magic';

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

interface TravelEvent {
  turn: number;
  type: string;
  description: string;
  details?: Record<string, unknown>;
}

/**
 * POST /api/v1/zones/travel
 * Travel between discovered, connected zones. Costs turns and may trigger ambushes in the wild.
 */
zonesRouter.post('/travel', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = travelSchema.parse(req.body);
    const destinationId = body.zoneId;

    // 1. Get player with zone info
    const player = await db.player.findUniqueOrThrow({
      where: { id: playerId },
      select: {
        currentZoneId: true,
        lastTravelledFromZoneId: true,
        homeTownId: true,
      },
    });

    if (!player.currentZoneId) {
      throw new AppError(400, 'Player has no current zone', 'NO_CURRENT_ZONE');
    }

    const currentZoneId: string = player.currentZoneId;

    // 2. Can't travel to where you already are
    if (destinationId === currentZoneId) {
      throw new AppError(400, 'Already in this zone', 'ALREADY_IN_ZONE');
    }

    // 3. Can't travel while recovering or at 0 HP
    const hpState = await getHpState(playerId);
    if (hpState.isRecovering || hpState.currentHp <= 0) {
      throw new AppError(400, 'Cannot travel while recovering', 'IS_RECOVERING');
    }

    // 4. Validate destination is discovered
    const discovery = await db.playerZoneDiscovery.findUnique({
      where: { playerId_zoneId: { playerId, zoneId: destinationId } },
    });
    if (!discovery) {
      throw new AppError(400, 'Zone not discovered', 'ZONE_NOT_DISCOVERED');
    }

    // 5. Validate connection exists
    const connection = await db.zoneConnection.findUnique({
      where: { fromId_toId: { fromId: currentZoneId, toId: destinationId } },
    });
    if (!connection) {
      throw new AppError(400, 'No path to that zone', 'NO_CONNECTION');
    }

    // 6. Get current zone and destination zone data
    const [currentZone, destinationZone] = await Promise.all([
      db.zone.findUniqueOrThrow({ where: { id: currentZoneId } }),
      db.zone.findUniqueOrThrow({ where: { id: destinationId } }),
    ]);

    // Helper to fetch current turn state for the response
    const getTurnSnapshot = async () => {
      const turnBank = await prisma.turnBank.findUnique({ where: { playerId } });
      if (!turnBank) return null;
      return {
        currentTurns: turnBank.currentTurns,
        timeToCapMs: null,
        lastRegenAt: turnBank.lastRegenAt.toISOString(),
      };
    };

    // 7. BREADCRUMB RETURN: free travel back to where you came from
    if (destinationId === player.lastTravelledFromZoneId) {
      await db.player.update({
        where: { id: playerId },
        data: {
          currentZoneId: destinationId,
          lastTravelledFromZoneId: currentZoneId,
        },
      });

      let newDiscoveries: Array<{ id: string; name: string }> = [];
      if (destinationZone.zoneType === 'town') {
        await db.player.update({
          where: { id: playerId },
          data: { homeTownId: destinationId },
        });
        const discoveredIds = await discoverZonesFromTown(playerId, destinationId);
        const discoveredZones = await db.zone.findMany({
          where: { id: { in: discoveredIds } },
          select: { id: true, name: true },
        });
        newDiscoveries = discoveredZones;
      }

      return res.json({
        zone: { id: destinationZone.id, name: destinationZone.name, zoneType: destinationZone.zoneType },
        turns: await getTurnSnapshot(),
        travelCost: 0,
        breadcrumbReturn: true,
        events: [],
        aborted: false,
        refundedTurns: 0,
        respawnedTo: null,
        newDiscoveries,
      });
    }

    // 8. Determine travel cost
    // Town departure: destination's travelCost, no ambushes
    // Wild traversal: current zone's travelCost, ambushes from current zone
    const isTownDeparture = currentZone.zoneType === 'town';
    const travelCost: number = isTownDeparture ? destinationZone.travelCost : currentZone.travelCost;

    // 9. Spend turns
    await spendPlayerTurns(playerId, travelCost);

    const events: TravelEvent[] = [];

    // 10. Run travel ambushes (only for wild traversal)
    if (!isTownDeparture) {
      const ambushes = simulateTravelAmbushes(travelCost);

      if (ambushes.length > 0) {
        // Get player combat stats (same pattern as combat route)
        const mainHandAttackSkill = await getMainHandAttackSkill(playerId);
        const attackSkill: AttackSkill = mainHandAttackSkill ?? 'melee';
        const [attackLevel, progression, equipmentStats] = await Promise.all([
          getSkillLevel(playerId, attackSkill),
          getPlayerProgressionState(playerId),
          getEquipmentStats(playerId),
        ]);

        // Get mob pool from current zone
        const mobTemplates = await prisma.mobTemplate.findMany({ where: { zoneId: currentZoneId } });

        let currentHp = hpState.currentHp;

        for (const ambush of ambushes) {
          if (mobTemplates.length === 0) break;

          // Pick random mob
          const rawMob = mobTemplates[Math.floor(Math.random() * mobTemplates.length)]!;
          const baseMob: MobTemplate = {
            ...(rawMob as unknown as MobTemplate),
            spellPattern: Array.isArray(rawMob.spellPattern) ? (rawMob.spellPattern as unknown as MobTemplate['spellPattern']) : [],
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
            equipmentStats,
          );

          const combatResult = runCombat(playerStats, prefixedMob);
          currentHp = combatResult.playerHpRemaining;

          const durabilityLost = await degradeEquippedDurability(playerId);

          if (combatResult.outcome === 'victory') {
            const loot = await rollAndGrantLoot(playerId, prefixedMob.id, prefixedMob.level, prefixedMob.dropChanceMultiplier);
            const xpGrant = await grantSkillXp(playerId, attackSkill, combatResult.xpGained);
            const xpGain = xpGrant.xpResult.xpAfterEfficiency;
            await setHp(playerId, currentHp);

            // Update bestiary
            await prisma.playerBestiary.upsert({
              where: { playerId_mobTemplateId: { playerId, mobTemplateId: prefixedMob.id } },
              create: { playerId, mobTemplateId: prefixedMob.id, kills: 1 },
              update: { kills: { increment: 1 } },
            });
            if (prefixedMob.mobPrefix) {
              await db.playerBestiaryPrefix.upsert({
                where: {
                  playerId_mobTemplateId_prefix: {
                    playerId, mobTemplateId: prefixedMob.id, prefix: prefixedMob.mobPrefix,
                  },
                },
                create: { playerId, mobTemplateId: prefixedMob.id, prefix: prefixedMob.mobPrefix, kills: 1 },
                update: { kills: { increment: 1 } },
              });
            }

            await prisma.activityLog.create({
              data: {
                playerId,
                activityType: 'combat',
                turnsSpent: 0,
                result: {
                  zoneId: currentZoneId,
                  zoneName: currentZone.name,
                  mobTemplateId: prefixedMob.id,
                  mobName: baseMob.name,
                  mobPrefix: prefixedMob.mobPrefix,
                  mobDisplayName: prefixedMob.mobDisplayName,
                  source: 'travel_ambush',
                  encounterSiteId: null,
                  attackSkill,
                  outcome: combatResult.outcome,
                  playerMaxHp: combatResult.playerMaxHp,
                  mobMaxHp: combatResult.mobMaxHp,
                  log: combatResult.log,
                  rewards: {
                    xp: combatResult.xpGained,
                    baseXp: combatResult.xpGained,
                    loot,
                    durabilityLost,
                    skillXp: {
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
                    },
                  },
                } as unknown as Prisma.InputJsonValue,
              },
            });

            events.push({
              turn: ambush.turnOccurred,
              type: 'ambush_victory',
              description: `Ambushed by ${prefixedMob.mobDisplayName}! You defeated it. (+${xpGain} XP)`,
              details: {
                mobName: prefixedMob.mobDisplayName,
                mobDisplayName: prefixedMob.mobDisplayName,
                outcome: combatResult.outcome,
                playerMaxHp: combatResult.playerMaxHp,
                mobMaxHp: combatResult.mobMaxHp,
                log: combatResult.log,
                xp: xpGain,
                loot,
                durabilityLost,
              },
            });
          } else {
            // Player lost — calculate flee result
            const fleeResult = calculateFleeResult({
              evasionLevel: progression.attributes.evasion,
              mobLevel: prefixedMob.level,
              maxHp: hpState.maxHp,
              currentGold: 0,
            });

            if (fleeResult.outcome === 'knockout') {
              currentHp = 0;
              await enterRecoveringState(playerId, hpState.maxHp);
              const respawn = await respawnToHomeTown(playerId);

              await prisma.activityLog.create({
                data: {
                  playerId,
                  activityType: 'combat',
                  turnsSpent: 0,
                  result: {
                    zoneId: currentZoneId,
                    zoneName: currentZone.name,
                    mobTemplateId: prefixedMob.id,
                    mobName: baseMob.name,
                    mobPrefix: prefixedMob.mobPrefix,
                    mobDisplayName: prefixedMob.mobDisplayName,
                    source: 'travel_ambush',
                    encounterSiteId: null,
                    attackSkill,
                    outcome: combatResult.outcome,
                    playerMaxHp: combatResult.playerMaxHp,
                    mobMaxHp: combatResult.mobMaxHp,
                    log: combatResult.log,
                    rewards: {
                      xp: 0,
                      baseXp: 0,
                      loot: [],
                      durabilityLost,
                      skillXp: null,
                    },
                  } as unknown as Prisma.InputJsonValue,
                },
              });

              events.push({
                turn: ambush.turnOccurred,
                type: 'ambush_defeat',
                description: `Ambushed by ${prefixedMob.mobDisplayName}! You were knocked out.`,
                details: {
                  mobName: prefixedMob.mobDisplayName,
                  mobDisplayName: prefixedMob.mobDisplayName,
                  outcome: combatResult.outcome,
                  playerMaxHp: combatResult.playerMaxHp,
                  mobMaxHp: combatResult.mobMaxHp,
                  log: combatResult.log,
                  fleeResult: { outcome: fleeResult.outcome, remainingHp: fleeResult.remainingHp },
                  durabilityLost,
                },
              });

              // Refund remaining turns
              const refundAmount = travelCost - ambush.turnOccurred;
              if (refundAmount > 0) {
                await refundPlayerTurns(playerId, refundAmount);
              }

              const discoveredIds = await discoverZonesFromTown(playerId, respawn.townId);
              const discoveredZones = await db.zone.findMany({
                where: { id: { in: discoveredIds } },
                select: { id: true, name: true },
              });

              return res.json({
                zone: { id: respawn.townId, name: respawn.townName, zoneType: 'town' },
                turns: await getTurnSnapshot(),
                travelCost,
                breadcrumbReturn: false,
                events,
                aborted: true,
                refundedTurns: refundAmount,
                respawnedTo: respawn,
                newDiscoveries: discoveredZones,
              });
            } else {
              // Fled — abort travel, stay in current zone
              currentHp = fleeResult.remainingHp;
              await setHp(playerId, currentHp);

              await prisma.activityLog.create({
                data: {
                  playerId,
                  activityType: 'combat',
                  turnsSpent: 0,
                  result: {
                    zoneId: currentZoneId,
                    zoneName: currentZone.name,
                    mobTemplateId: prefixedMob.id,
                    mobName: baseMob.name,
                    mobPrefix: prefixedMob.mobPrefix,
                    mobDisplayName: prefixedMob.mobDisplayName,
                    source: 'travel_ambush',
                    encounterSiteId: null,
                    attackSkill,
                    outcome: combatResult.outcome,
                    playerMaxHp: combatResult.playerMaxHp,
                    mobMaxHp: combatResult.mobMaxHp,
                    log: combatResult.log,
                    rewards: {
                      xp: 0,
                      baseXp: 0,
                      loot: [],
                      durabilityLost,
                      skillXp: null,
                    },
                  } as unknown as Prisma.InputJsonValue,
                },
              });

              events.push({
                turn: ambush.turnOccurred,
                type: 'ambush_defeat',
                description: `Ambushed by ${prefixedMob.mobDisplayName}! You escaped with ${currentHp} HP.`,
                details: {
                  mobName: prefixedMob.mobDisplayName,
                  mobDisplayName: prefixedMob.mobDisplayName,
                  outcome: combatResult.outcome,
                  playerMaxHp: combatResult.playerMaxHp,
                  mobMaxHp: combatResult.mobMaxHp,
                  log: combatResult.log,
                  remainingHp: currentHp,
                  fleeResult: { outcome: fleeResult.outcome, remainingHp: fleeResult.remainingHp },
                  durabilityLost,
                },
              });

              // Refund remaining turns
              const refundAmount = travelCost - ambush.turnOccurred;
              if (refundAmount > 0) {
                await refundPlayerTurns(playerId, refundAmount);
              }

              return res.json({
                zone: { id: currentZoneId, name: currentZone.name, zoneType: currentZone.zoneType },
                turns: await getTurnSnapshot(),
                travelCost,
                breadcrumbReturn: false,
                events,
                aborted: true,
                refundedTurns: refundAmount,
                respawnedTo: null,
                newDiscoveries: [],
              });
            }
          }
        }
      }
    }

    // 11. Successful arrival
    const updateData: Record<string, unknown> = {
      currentZoneId: destinationId,
      lastTravelledFromZoneId: currentZoneId,
    };

    let newDiscoveries: Array<{ id: string; name: string }> = [];
    if (destinationZone.zoneType === 'town') {
      updateData.homeTownId = destinationId;
      const discoveredIds = await discoverZonesFromTown(playerId, destinationId);
      const discoveredZones = await db.zone.findMany({
        where: { id: { in: discoveredIds } },
        select: { id: true, name: true },
      });
      newDiscoveries = discoveredZones;
    }

    await db.player.update({
      where: { id: playerId },
      data: updateData,
    });

    return res.json({
      zone: { id: destinationZone.id, name: destinationZone.name, zoneType: destinationZone.zoneType },
      turns: await getTurnSnapshot(),
      travelCost,
      breadcrumbReturn: false,
      events,
      aborted: false,
      refundedTurns: 0,
      respawnedTo: null,
      newDiscoveries,
    });
  } catch (err) {
    next(err);
  }
});

