import { Router } from 'express';
import { z } from 'zod';
import { Prisma, prisma } from '@adventure/database';
import { estimateExploration, simulateExploration, validateExplorationTurns } from '@adventure/game-engine';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { spendPlayerTurns } from '../services/turnBankService';

export const explorationRouter = Router();

explorationRouter.use(authenticate);

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

/**
 * POST /api/v1/exploration/start
 * Spend turns to explore a zone and return discovered outcomes.
 */
explorationRouter.post('/start', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = startSchema.parse(req.body);

    const validation = validateExplorationTurns(body.turns);
    if (!validation.valid) {
      throw new AppError(400, validation.error ?? 'Invalid turns', 'INVALID_TURNS');
    }

    const zone = await prisma.zone.findUnique({ where: { id: body.zoneId } });
    if (!zone) {
      throw new AppError(404, 'Zone not found', 'NOT_FOUND');
    }

    const turnSpend = await spendPlayerTurns(playerId, body.turns);

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
    }> = [];

    const resourceDiscoveries: Array<{
      turnOccurred: number;
      resourceNodeId: string;
      resourceType: string;
    }> = [];

    for (const outcome of outcomes) {
      if (outcome.type === 'mob_encounter' && mobTemplates.length > 0) {
        const mob = pickWeighted(mobTemplates);
        if (mob) {
          mobEncounters.push({
            turnOccurred: outcome.turnOccurred,
            mobTemplateId: mob.id,
            mobName: mob.name,
          });
        }
      }

      if (outcome.type === 'resource_node' && resourceNodes.length > 0) {
        const node = resourceNodes[Math.floor(Math.random() * resourceNodes.length)];
        if (node) {
          resourceDiscoveries.push({
            turnOccurred: outcome.turnOccurred,
            resourceNodeId: node.id,
            resourceType: node.resourceType,
          });
        }
      }
    }

    const explorationLog = await prisma.activityLog.create({
      data: {
        playerId,
        activityType: 'exploration',
        turnsSpent: body.turns,
        result: {
          zoneId: body.zoneId,
          zoneName: zone.name,
          outcomes,
          mobEncounters,
          resourceDiscoveries,
          hiddenCaches: outcomes.filter(o => o.type === 'hidden_cache'),
          zoneExitDiscovered: outcomes.some(o => o.type === 'zone_exit'),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    res.json({
      logId: explorationLog.id,
      zone: {
        id: zone.id,
        name: zone.name,
        difficulty: zone.difficulty,
      },
      turns: turnSpend,
      outcomes,
      mobEncounters,
      resourceDiscoveries,
      hiddenCaches: outcomes.filter(o => o.type === 'hidden_cache'),
      zoneExitDiscovered: outcomes.some(o => o.type === 'zone_exit'),
    });
  } catch (err) {
    next(err);
  }
});
