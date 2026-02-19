import { Router } from 'express';
import { optionalAuthenticate } from '../middleware/auth';
import { getCategories, getLeaderboard } from '../services/leaderboardService';

export const leaderboardRouter = Router();

leaderboardRouter.use(optionalAuthenticate);

leaderboardRouter.get('/categories', (_req, res) => {
  res.json(getCategories());
});

leaderboardRouter.get('/:category', async (req, res, next) => {
  try {
    const { category } = req.params;
    const aroundMe = req.query.around_me === 'true';
    const playerId = req.player?.playerId;

    const result = await getLeaderboard(category, playerId, aroundMe);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
