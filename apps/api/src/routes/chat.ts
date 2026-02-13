import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { getChannelHistory } from '../services/chatService';

export const chatRouter = Router();

chatRouter.use(authenticate);

const historyQuerySchema = z.object({
  channelType: z.enum(['world', 'zone', 'guild']),
  channelId: z.string().min(1).max(64),
});

chatRouter.get('/history', async (req, res, next) => {
  try {
    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Invalid query', code: 'VALIDATION_ERROR' } });
      return;
    }

    const { channelType, channelId } = parsed.data;
    const messages = await getChannelHistory(channelType, channelId);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});
