import { Router } from 'express';
import { z } from 'zod';
import { Prisma, prisma } from '@adventure/database';
import { GATHERING_CONSTANTS, type SkillType } from '@adventure/shared';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { spendPlayerTurns } from '../services/turnBankService';
import { addStackableItem } from '../services/inventoryService';
import { grantSkillXp } from '../services/xpService';
import { getHpState } from '../services/hpService';

export const gatheringRouter = Router();

gatheringRouter.use(authenticate);

const nodesQuerySchema = z.object({
  zoneId: z.string().uuid().optional(),
  resourceType: z.string().trim().toLowerCase().regex(/^[a-z0-9_]+$/).max(32).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

function getNodeSizeName(remaining: number, maxCapacity: number): string {
  const ratio = remaining / maxCapacity;
  if (ratio <= 0.25) return 'Tiny';
  if (ratio <= 0.5) return 'Small';
  if (ratio <= 0.75) return 'Medium';
  if (ratio <= 0.9) return 'Large';
  return 'Huge';
}

function getResourceTypeCategory(resourceType: string): string {
  const normalized = resourceType.trim().toLowerCase();
  const parts = normalized.split('_').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1]! : normalized;
}

/**
 * GET /api/v1/gathering/nodes?zoneId=...&resourceType=...&page=...&pageSize=...
 * List player's discovered resource nodes with remaining capacity, pagination, and filter metadata.
 */
gatheringRouter.get('/nodes', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const query = nodesQuerySchema.parse(req.query);

    const resourceNodeWhere: Prisma.ResourceNodeWhereInput = {};
    if (query.zoneId) {
      resourceNodeWhere.zoneId = query.zoneId;
    }
    if (query.resourceType) {
      resourceNodeWhere.OR = [
        { resourceType: query.resourceType },
        { resourceType: { endsWith: `_${query.resourceType}` } },
      ];
    }

    const where: Prisma.PlayerResourceNodeWhereInput = {
      playerId,
      ...(Object.keys(resourceNodeWhere).length > 0 ? { resourceNode: resourceNodeWhere } : {}),
    };

    const offset = (query.page - 1) * query.pageSize;

    const [total, playerNodes, templatesForFilters] = await Promise.all([
      prisma.playerResourceNode.count({ where }),
      prisma.playerResourceNode.findMany({
        where,
        include: {
          resourceNode: {
            include: { zone: true },
          },
        },
        orderBy: [{ discoveredAt: 'desc' }],
        skip: offset,
        take: query.pageSize,
      }),
      prisma.resourceNode.findMany({
        where: { playerNodes: { some: { playerId } } },
        select: {
          zoneId: true,
          resourceType: true,
          zone: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const zoneById = new Map<string, string>();
    const resourceTypeSet = new Set<string>();
    for (const template of templatesForFilters) {
      zoneById.set(template.zoneId, template.zone.name);
      resourceTypeSet.add(getResourceTypeCategory(template.resourceType));
    }

    const zones = Array.from(zoneById.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const resourceTypes = Array.from(resourceTypeSet).sort((a, b) => a.localeCompare(b));
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

    res.json({
      nodes: playerNodes.map((pn: typeof playerNodes[number]) => {
        const template = pn.resourceNode;
        return {
          id: pn.id, // PlayerResourceNode ID (what frontend uses to mine)
          templateId: template.id,
          zoneId: template.zoneId,
          zoneName: template.zone.name,
          resourceType: template.resourceType,
          resourceTypeCategory: getResourceTypeCategory(template.resourceType),
          skillRequired: template.skillRequired,
          levelRequired: template.levelRequired,
          baseYield: template.baseYield,
          remainingCapacity: pn.remainingCapacity,
          maxCapacity: template.maxCapacity,
          sizeName: getNodeSizeName(pn.remainingCapacity, template.maxCapacity),
          discoveredAt: pn.discoveredAt.toISOString(),
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
        resourceTypes,
      },
    });
  } catch (err) {
    next(err);
  }
});

const mineSchema = z.object({
  playerNodeId: z.string().uuid(),
  turns: z.number().int().positive(),
  currentZoneId: z.string().uuid(),
});

function toResourceTemplateKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_');
}

async function getResourceTemplateId(resourceType: string): Promise<string> {
  const templates = await prisma.itemTemplate.findMany({
    where: { itemType: 'resource' },
    select: { id: true, name: true },
  });

  const match = templates.find((t: typeof templates[number]) => toResourceTemplateKey(t.name) === resourceType);
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
 * Mine from a discovered resource node, depleting its capacity.
 */
gatheringRouter.post('/mine', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = mineSchema.parse(req.body);

    // Check if player is recovering
    const hpState = await getHpState(playerId);
    if (hpState.isRecovering) {
      throw new AppError(400, 'Cannot gather while recovering', 'IS_RECOVERING');
    }

    // Find the player's discovered node
    const playerNode = await prisma.playerResourceNode.findUnique({
      where: { id: body.playerNodeId },
      include: {
        resourceNode: {
          include: { zone: true },
        },
      },
    });

    if (!playerNode || playerNode.playerId !== playerId) {
      throw new AppError(404, 'Resource node not found', 'NOT_FOUND');
    }

    const template = playerNode.resourceNode;

    // Validate player is in the correct zone
    if (template.zoneId !== body.currentZoneId) {
      throw new AppError(400, 'You must travel to this zone to gather this resource', 'WRONG_ZONE');
    }

    const skillRequired = template.skillRequired as SkillType;
    const level = await getSkillLevel(playerId, skillRequired);
    if (level < template.levelRequired) {
      throw new AppError(400, 'Insufficient level to gather this resource', 'INSUFFICIENT_LEVEL');
    }

    if (body.turns < GATHERING_CONSTANTS.BASE_TURN_COST) {
      throw new AppError(400, `Minimum is ${GATHERING_CONSTANTS.BASE_TURN_COST} turns`, 'INVALID_TURNS');
    }

    // Calculate how many actions we can do (limited by turns AND remaining capacity)
    const maxActionsByTurns = Math.floor(body.turns / GATHERING_CONSTANTS.BASE_TURN_COST);

    // Linear yield scaling: +10% per level above requirement
    const levelsAbove = Math.max(0, level - template.levelRequired);
    const yieldMultiplier = 1 + levelsAbove * GATHERING_CONSTANTS.YIELD_MULTIPLIER_PER_LEVEL;
    const baseYield = Math.max(template.baseYield, GATHERING_CONSTANTS.BASE_YIELD);
    const yieldPerAction = Math.floor(baseYield * yieldMultiplier);

    // Cap actions by remaining capacity
    const maxActionsByCapacity = Math.ceil(playerNode.remainingCapacity / yieldPerAction);
    const actions = Math.min(maxActionsByTurns, maxActionsByCapacity);

    if (actions <= 0) {
      throw new AppError(400, 'Node is depleted', 'NODE_DEPLETED');
    }

    const turnsSpent = actions * GATHERING_CONSTANTS.BASE_TURN_COST;
    const totalYield = Math.min(actions * yieldPerAction, playerNode.remainingCapacity);

    const turnSpend = await spendPlayerTurns(playerId, turnsSpent);

    // Deplete the node
    const newCapacity = playerNode.remainingCapacity - totalYield;
    const nodeDepleted = newCapacity <= 0;

    if (nodeDepleted) {
      // Remove the depleted node
      await prisma.playerResourceNode.delete({
        where: { id: playerNode.id },
      });
    } else {
      // Update remaining capacity
      await prisma.playerResourceNode.update({
        where: { id: playerNode.id },
        data: { remainingCapacity: newCapacity },
      });
    }

    const resourceTemplateId = await getResourceTemplateId(template.resourceType);
    const stack = await addStackableItem(playerId, resourceTemplateId, totalYield);

    // XP: 5 XP per action
    const rawXp = actions * 5;
    const xpGrant = await grantSkillXp(playerId, skillRequired, rawXp);

    const log = await prisma.activityLog.create({
      data: {
        playerId,
        activityType: skillRequired,
        turnsSpent,
        result: {
          zoneId: template.zoneId,
          zoneName: template.zone.name,
          playerNodeId: playerNode.id,
          resourceNodeId: template.id,
          resourceType: template.resourceType,
          actions,
          baseYield,
          yieldMultiplier,
          totalYield,
          remainingCapacity: nodeDepleted ? 0 : newCapacity,
          nodeDepleted,
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
        id: playerNode.id,
        templateId: template.id,
        zoneId: template.zoneId,
        zoneName: template.zone.name,
        resourceType: template.resourceType,
        levelRequired: template.levelRequired,
        remainingCapacity: nodeDepleted ? 0 : newCapacity,
        nodeDepleted,
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
