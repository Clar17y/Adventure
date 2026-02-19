import { Router } from 'express';
import { prisma } from '@adventure/database';
import { authenticate } from '../middleware/auth';
import {
  getPlayerAchievements,
  claimReward,
  setActiveTitle,
  getUnclaimedCount,
} from '../services/achievementService';

export const achievementsRouter = Router();
achievementsRouter.use(authenticate);

// GET /achievements — all definitions + player progress
achievementsRouter.get('/', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const result = await getPlayerAchievements(playerId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /achievements/unclaimed-count — just the count for badge
achievementsRouter.get('/unclaimed-count', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const count = await getUnclaimedCount(playerId);
    res.json({ unclaimedCount: count });
  } catch (err) {
    next(err);
  }
});

// POST /achievements/:id/claim — claim rewards
achievementsRouter.post('/:id/claim', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const { id } = req.params;
    const result = await claimReward(playerId, id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /achievements/title — get active title
achievementsRouter.get('/title', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { activeTitle: true },
    });
    res.json({ activeTitle: player?.activeTitle ?? null });
  } catch (err) {
    next(err);
  }
});

// PUT /achievements/title — set active title
achievementsRouter.put('/title', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const { achievementId } = req.body;
    const result = await setActiveTitle(playerId, achievementId ?? null);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
