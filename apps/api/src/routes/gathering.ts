import { Router } from 'express';
import { z } from 'zod';
import { Prisma, prisma } from '@adventure/database';
import { GATHERING_CONSTANTS, type SkillType } from '@adventure/shared';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { spendPlayerTurns } from '../services/turnBankService';
import { addStackableItem } from '../services/inventoryService';
import { grantSkillXp } from '../services/xpService';

export const gatheringRouter = Router();

gatheringRouter.use(authenticate);

const nodesQuerySchema = z.object({
  zoneId: z.string().uuid().optional(),
});

/**
 * GET /api/v1/gathering/nodes?zoneId=...
 * List gatherable resource nodes (MVP: not gated by discovery).
 */
gatheringRouter.get('/nodes', async (req, res, next) => {
  try {
    const query = nodesQuerySchema.parse(req.query);

    const nodes = await prisma.resourceNode.findMany({
      where: query.zoneId ? { zoneId: query.zoneId } : undefined,
      include: { zone: true },
      orderBy: [{ levelRequired: 'asc' }],
    });

    res.json({
      nodes: nodes.map((n) => ({
        id: n.id,
        zoneId: n.zoneId,
        zoneName: n.zone.name,
        resourceType: n.resourceType,
        skillRequired: n.skillRequired,
        levelRequired: n.levelRequired,
        baseYield: n.baseYield,
        discoveryChance: n.discoveryChance.toNumber(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

const mineSchema = z.object({
  resourceNodeId: z.string().uuid(),
  turns: z.number().int().positive(),
});

function toResourceTemplateKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

async function getResourceTemplateId(resourceType: string): Promise<string> {
  // MVP convention: item template name -> snake_case matches resourceType (e.g. "Copper Ore" -> "copper_ore")
  const templates = await prisma.itemTemplate.findMany({
    where: { itemType: 'resource' },
    select: { id: true, name: true },
  });

  const match = templates.find(t => toResourceTemplateKey(t.name) === resourceType);
  if (!match) {
    throw new AppError(400, `No resource item template found for resourceType=${resourceType}`, 'MISSING_TEMPLATE');
  }
  return match.id;
}

async function getSkillLevel(playerId: string, skillType: SkillType): Promise<number> {
  const skill = await prisma.playerSkill.findUnique({
    where: { playerId_skillType: { playerId, skillType } },
    select: { level: true },
  });

  return skill?.level ?? 1;
}

/**
 * POST /api/v1/gathering/mine
 * Spend turns at a discovered resource node, gain resources + Mining XP.
 */
gatheringRouter.post('/mine', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = mineSchema.parse(req.body);

    const node = await prisma.resourceNode.findUnique({
      where: { id: body.resourceNodeId },
      include: { zone: true },
    });
    if (!node) {
      throw new AppError(404, 'Resource node not found', 'NOT_FOUND');
    }

    const skillRequired = node.skillRequired as SkillType;
    const level = await getSkillLevel(playerId, skillRequired);
    if (level < node.levelRequired) {
      throw new AppError(400, 'Insufficient level to gather this resource', 'INSUFFICIENT_LEVEL');
    }

    if (body.turns < GATHERING_CONSTANTS.BASE_TURN_COST) {
      throw new AppError(400, `Minimum is ${GATHERING_CONSTANTS.BASE_TURN_COST} turns`, 'INVALID_TURNS');
    }

    const actions = Math.floor(body.turns / GATHERING_CONSTANTS.BASE_TURN_COST);
    const turnsSpent = actions * GATHERING_CONSTANTS.BASE_TURN_COST;

    const turnSpend = await spendPlayerTurns(playerId, turnsSpent);

    // Linear yield scaling: +10% per level above requirement
    const levelsAbove = Math.max(0, level - node.levelRequired);
    const yieldMultiplier = 1 + levelsAbove * GATHERING_CONSTANTS.YIELD_MULTIPLIER_PER_LEVEL;
    const baseYield = Math.max(node.baseYield, GATHERING_CONSTANTS.BASE_YIELD);
    const totalYield = Math.floor(actions * baseYield * yieldMultiplier);

    const resourceTemplateId = await getResourceTemplateId(node.resourceType);
    const stack = await addStackableItem(playerId, resourceTemplateId, totalYield);

    // Simple XP model: 5 XP per action
    const rawXp = actions * 5;
    const xpGrant = await grantSkillXp(playerId, 'mining', rawXp);

    const log = await prisma.activityLog.create({
      data: {
        playerId,
        activityType: 'mining',
        turnsSpent,
        result: {
          zoneId: node.zoneId,
          zoneName: node.zone.name,
          resourceNodeId: node.id,
          resourceType: node.resourceType,
          actions,
          baseYield,
          yieldMultiplier,
          totalYield,
          itemTemplateId: resourceTemplateId,
          itemId: stack.itemId,
          xp: {
            skillType: xpGrant.skillType,
            ...xpGrant.xpResult,
            newTotalXp: xpGrant.newTotalXp,
            newDailyXpGained: xpGrant.newDailyXpGained,
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });

    res.json({
      logId: log.id,
      turns: turnSpend,
      node: {
        id: node.id,
        zoneId: node.zoneId,
        zoneName: node.zone.name,
        resourceType: node.resourceType,
        levelRequired: node.levelRequired,
      },
      results: {
        actions,
        baseYield,
        yieldMultiplier,
        totalYield,
        itemTemplateId: resourceTemplateId,
        itemId: stack.itemId,
      },
      xp: {
        skillType: xpGrant.skillType,
        ...xpGrant.xpResult,
        newTotalXp: xpGrant.newTotalXp,
        newDailyXpGained: xpGrant.newDailyXpGained,
      },
    });
  } catch (err) {
    next(err);
  }
});
