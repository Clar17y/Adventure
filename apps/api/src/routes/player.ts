import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@adventure/database';
import { ATTRIBUTE_TYPES, type AttributeType, ACHIEVEMENTS_BY_ID } from '@adventure/shared';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ensureEquipmentSlots } from '../services/equipmentService';
import {
  allocateAttributePoints,
  getPlayerProgressionState,
  normalizePlayerAttributes,
} from '../services/attributesService';

export const playerRouter = Router();
const prismaAny = prisma as unknown as any;

playerRouter.use(authenticate);

/**
 * GET /api/v1/player
 * Get current player profile
 */
playerRouter.get('/', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;

    const player = await prismaAny.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        lastActiveAt: true,
        characterXp: true,
        characterLevel: true,
        attributePoints: true,
        attributes: true,
        autoPotionThreshold: true,
        activeTitle: true,
      },
    });

    if (!player) {
      throw new AppError(404, 'Player not found', 'NOT_FOUND');
    }

    const titleDef = player.activeTitle ? ACHIEVEMENTS_BY_ID.get(player.activeTitle) : null;

    res.json({
      player: {
        ...player,
        characterXp: Number(player.characterXp),
        attributes: normalizePlayerAttributes(player.attributes),
        activeTitle: titleDef?.titleReward ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/player/skills
 * Get all player skills with levels and XP
 */
playerRouter.get('/skills', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;

    const skills = await prisma.playerSkill.findMany({
      where: { playerId },
      select: {
        skillType: true,
        level: true,
        xp: true,
        dailyXpGained: true,
        lastXpResetAt: true,
      },
    });

    // Convert BigInt to number for JSON serialization
    const serializedSkills = skills.map((skill: typeof skills[number]) => ({
      ...skill,
      xp: Number(skill.xp),
    }));

    res.json({ skills: serializedSkills });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/player/attributes
 * Get character level progression and current attribute allocation.
 */
playerRouter.get('/attributes', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const progression = await getPlayerProgressionState(playerId);
    res.json(progression);
  } catch (err) {
    next(err);
  }
});

const allocateAttributesSchema = z.object({
  attribute: z.custom<AttributeType>((value) => ATTRIBUTE_TYPES.includes(value as AttributeType), {
    message: 'Invalid attribute type',
  }),
  points: z.number().int().positive().default(1),
});

/**
 * POST /api/v1/player/attributes
 * Spend unallocated attribute points.
 */
playerRouter.post('/attributes', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = allocateAttributesSchema.parse(req.body);
    const progression = await allocateAttributePoints(playerId, body.attribute, body.points);
    res.json(progression);
  } catch (err) {
    next(err);
  }
});

const settingsSchema = z.object({
  autoPotionThreshold: z.number().int().min(0).max(100),
});

/**
 * PATCH /api/v1/player/settings
 * Update player settings (e.g. auto-potion threshold).
 */
playerRouter.patch('/settings', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = settingsSchema.parse(req.body);

    await prismaAny.player.update({
      where: { id: playerId },
      data: { autoPotionThreshold: body.autoPotionThreshold },
    });

    res.json({ autoPotionThreshold: body.autoPotionThreshold });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/player/equipment
 * Get currently equipped items
 */
playerRouter.get('/equipment', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;

    await ensureEquipmentSlots(playerId);

    const equipment = await prisma.playerEquipment.findMany({
      where: { playerId },
      include: {
        item: {
          include: {
            template: true,
          },
        },
      },
    });

    res.json({ equipment });
  } catch (err) {
    next(err);
  }
});
