import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import {
  getAllActiveEvents,
  getActiveEventsForZone,
  getEventById,
} from '../services/worldEventService';
import { checkAndSpawnEvents } from '../services/eventSchedulerService';
import { getIo } from '../socket';

export const worldEventsRouter = Router();

worldEventsRouter.use(authenticate);

/**
 * GET /api/v1/events
 * List all active world events (triggers lazy spawn check).
 */
worldEventsRouter.get('/', async (_req, res, next) => {
  try {
    await checkAndSpawnEvents(getIo());
    const events = await getAllActiveEvents();
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

const zoneIdSchema = z.object({ zoneId: z.string().uuid() });

/**
 * GET /api/v1/events/zone/:zoneId
 * Active events for a specific zone (must be registered before /:id).
 */
worldEventsRouter.get('/zone/:zoneId', async (req, res, next) => {
  try {
    const { zoneId } = zoneIdSchema.parse(req.params);
    const events = await getActiveEventsForZone(zoneId);
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

const eventIdSchema = z.object({ id: z.string().uuid() });

/**
 * GET /api/v1/events/:id
 * Single event detail.
 */
worldEventsRouter.get('/:id', async (req, res, next) => {
  try {
    const { id } = eventIdSchema.parse(req.params);
    const event = await getEventById(id);
    if (!event) {
      throw new AppError(404, 'Event not found', 'NOT_FOUND');
    }
    res.json({ event });
  } catch (err) {
    next(err);
  }
});
