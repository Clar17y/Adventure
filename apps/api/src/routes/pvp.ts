import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import {
  getLadder,
  getOrCreateRating,
  scoutOpponent,
  challenge,
  getHistory,
  getNotifications,
} from '../services/pvpService';

export const pvpRouter = Router();
pvpRouter.use(authenticate);

const scoutSchema = z.object({
  targetId: z.string().uuid(),
});

const challengeSchema = z.object({
  targetId: z.string().uuid(),
  attackStyle: z.enum(['melee', 'ranged', 'magic']),
});

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * GET /api/v1/pvp/ladder
 * Returns opponents in the player's rating bracket.
 */
pvpRouter.get('/ladder', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const result = await getLadder(playerId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/pvp/rating
 * Returns the player's PvP rating.
 */
pvpRouter.get('/rating', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const rating = await getOrCreateRating(playerId);
    res.json({
      rating: rating.rating,
      wins: rating.wins,
      losses: rating.losses,
      winStreak: rating.winStreak,
      bestRating: rating.bestRating,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/pvp/scout
 * Scout an opponent for 100 turns.
 */
pvpRouter.post('/scout', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = scoutSchema.parse(req.body);
    const result = await scoutOpponent(playerId, body.targetId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/pvp/challenge
 * Challenge an opponent. Costs 500 turns (or 250 for revenge).
 */
pvpRouter.post('/challenge', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const body = challengeSchema.parse(req.body);
    const result = await challenge(playerId, body.targetId, body.attackStyle);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/pvp/history
 * Paginated match history.
 */
pvpRouter.get('/history', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const query = historyQuerySchema.parse({
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    const result = await getHistory(playerId, query.page, query.pageSize);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/pvp/notifications
 * Unread attack results (marks them as read).
 */
pvpRouter.get('/notifications', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;
    const result = await getNotifications(playerId);
    res.json({ notifications: result });
  } catch (err) {
    next(err);
  }
});
