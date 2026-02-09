import { Router } from 'express';
import { z } from 'zod';
import { Prisma, prisma } from '@adventure/database';
import { estimateExploration, rollMobPrefix, simulateExploration, validateExplorationTurns } from '@adventure/game-engine';
import { getMobPrefixDefinition } from '@adventure/shared';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { spendPlayerTurnsTx } from '../services/turnBankService';
import { getHpState } from '../services/hpService';

export const explorationRouter = Router();

explorationRouter.use(authenticate);
const PENDING_ENCOUNTER_TTL_SECONDS = (() => {
  const raw = process.env.PENDING_ENCOUNTER_TTL_SECONDS ?? '3600';
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3600;
})();

const estimateQuerySchema = z.object({
  turns: z.coerce.number().int(),
});

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

    res.json({ estimate: estimateExploration(query.turns) });
  } catch (err) {
    next(err);
  }
});

const startSchema = z.object({
  zoneId: z.string().uuid(),
  turns: z.number().int(),
});

function pickWeighted<T>(
  items: T[],
  weightKey: 'encounterWeight' | 'discoveryWeight' = 'encounterWeight'
): T | null {
  const getWeight = (item: T): number => {
    const value = (item as Record<string, unknown>)[weightKey];
    return typeof value === 'number' ? value : 100;
  };

  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);
  if (totalWeight <= 0) return null;

  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= getWeight(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1] ?? null;
}

function randomCapacity(min: number, max: number): number {
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

/**
 * POST /api/v1/exploration/start
 * Spend turns to explore a zone and return discovered outcomes.
 */
explorationRouter.post('/start', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = startSchema.parse(req.body);

    // Check if player is recovering
    const hpState = await getHpState(playerId);
    if (hpState.isRecovering) {
      throw new AppError(400, 'Cannot explore while recovering', 'IS_RECOVERING');
    }

    const validation = validateExplorationTurns(body.turns);
    if (!validation.valid) {
      throw new AppError(400, validation.error ?? 'Invalid turns', 'INVALID_TURNS');
    }

    const zone = await prisma.zone.findUnique({ where: { id: body.zoneId } });
    if (!zone) {
      throw new AppError(404, 'Zone not found', 'NOT_FOUND');
    }

    const outcomes = simulateExploration(body.turns, true);

    const mobTemplates = await prisma.mobTemplate.findMany({
      where: { zoneId: body.zoneId },
    });
    const resourceNodes = await prisma.resourceNode.findMany({
      where: { zoneId: body.zoneId },
    });

    const mobEncounters: Array<{
      turnOccurred: number;
      mobTemplateId: string;
      mobName: string;
      mobPrefix: string | null;
      mobDisplayName: string;
    }> = [];

    const pendingResourceDiscoveries: Array<{
      turnOccurred: number;
      resourceNodeId: string;
      resourceType: string;
      capacity: number;
      sizeName: string;
    }> = [];

    for (const outcome of outcomes) {
      if (outcome.type === 'mob_encounter' && mobTemplates.length > 0) {
        const mob = pickWeighted(mobTemplates, 'encounterWeight') as typeof mobTemplates[number] | null;
        if (mob) {
          const mobPrefix = rollMobPrefix();
          const prefixDefinition = getMobPrefixDefinition(mobPrefix);
          const mobDisplayName = prefixDefinition ? `${prefixDefinition.displayName} ${mob.name}` : mob.name;
          mobEncounters.push({
            turnOccurred: outcome.turnOccurred,
            mobTemplateId: mob.id,
            mobName: mob.name,
            mobPrefix,
            mobDisplayName,
          });
        }
      }

      if (outcome.type === 'resource_node' && resourceNodes.length > 0) {
        const nodeTemplate = pickWeighted(resourceNodes, 'discoveryWeight') as typeof resourceNodes[number] | null;
        if (nodeTemplate) {
          // Create a player-specific node instance with random capacity
          const capacity = randomCapacity(nodeTemplate.minCapacity, nodeTemplate.maxCapacity);
          const sizeName = getNodeSizeName(capacity, nodeTemplate.maxCapacity);

          pendingResourceDiscoveries.push({
            turnOccurred: outcome.turnOccurred,
            resourceNodeId: nodeTemplate.id,
            resourceType: nodeTemplate.resourceType,
            capacity,
            sizeName,
          });
        }
      }
    }

    const hiddenCaches = outcomes.filter((o) => o.type === 'hidden_cache');
    const zoneExitDiscovered = outcomes.some((o) => o.type === 'zone_exit');

    const { turnSpend, explorationLogId, resourceDiscoveries, pendingEncounters } = await prisma.$transaction(async (tx) => {
      const txAny = tx as unknown as any;
      const spent = await spendPlayerTurnsTx(tx, playerId, body.turns);

      const createdResourceDiscoveries: Array<{
        turnOccurred: number;
        playerNodeId: string;
        resourceNodeId: string;
        resourceType: string;
        capacity: number;
        sizeName: string;
      }> = [];

      for (const discovery of pendingResourceDiscoveries) {
        const playerNode = await tx.playerResourceNode.create({
          data: {
            playerId,
            resourceNodeId: discovery.resourceNodeId,
            remainingCapacity: discovery.capacity,
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

      const explorationLog = await tx.activityLog.create({
        data: {
          playerId,
          activityType: 'exploration',
          turnsSpent: body.turns,
          result: {
            zoneId: body.zoneId,
            zoneName: zone.name,
            outcomes,
            mobEncounters,
            resourceDiscoveries: createdResourceDiscoveries,
            hiddenCaches,
            zoneExitDiscovered,
          } as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });

      const createdPending = await Promise.all(
        mobEncounters.map((m) =>
          txAny.pendingEncounter.create({
            data: {
              playerId,
              zoneId: body.zoneId,
              mobTemplateId: m.mobTemplateId,
              mobPrefix: m.mobPrefix,
              turnOccurred: m.turnOccurred,
              sourceLogId: explorationLog.id,
              expiresAt: new Date(Date.now() + PENDING_ENCOUNTER_TTL_SECONDS * 1000),
            },
            select: { id: true, createdAt: true, expiresAt: true },
          })
        )
      );

      return {
        turnSpend: spent,
        explorationLogId: explorationLog.id,
        resourceDiscoveries: createdResourceDiscoveries,
        pendingEncounters: createdPending,
      };
    });

    res.json({
      logId: explorationLogId,
      zone: {
        id: zone.id,
        name: zone.name,
        difficulty: zone.difficulty,
      },
      turns: turnSpend,
      outcomes,
      mobEncounters: mobEncounters.map((m, idx) => ({
        ...m,
        encounterId: pendingEncounters[idx]!.id,
        zoneId: body.zoneId,
        zoneName: zone.name,
        createdAt: pendingEncounters[idx]!.createdAt.toISOString(),
        expiresAt: pendingEncounters[idx]!.expiresAt.toISOString(),
      })),
      resourceDiscoveries,
      hiddenCaches,
      zoneExitDiscovered,
    });
  } catch (err) {
    next(err);
  }
});
