import { Router } from 'express';
import { prisma } from '@adventure/database';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const playerRouter = Router();

playerRouter.use(authenticate);

/**
 * GET /api/v1/player
 * Get current player profile
 */
playerRouter.get('/', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    if (!player) {
      throw new AppError(404, 'Player not found', 'NOT_FOUND');
    }

    res.json({ player });
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
    const serializedSkills = skills.map(skill => ({
      ...skill,
      xp: Number(skill.xp),
    }));

    res.json({ skills: serializedSkills });
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
