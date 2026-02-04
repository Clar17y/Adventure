import { Router } from 'express';
import { prisma } from '@adventure/database';
import { authenticate } from '../middleware/auth';

export const zonesRouter = Router();

zonesRouter.use(authenticate);

/**
 * GET /api/v1/zones
 * Returns zones, marking which are discovered for the current player.
 */
zonesRouter.get('/', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;

    const zones = await prisma.zone.findMany({
      orderBy: [{ isStarter: 'desc' }, { difficulty: 'asc' }, { name: 'asc' }],
    });

    const logs = await prisma.activityLog.findMany({
      where: {
        playerId,
        activityType: { in: ['exploration', 'combat'] },
      },
      select: { result: true },
    });

    const discoveredZoneIds = new Set<string>();
    for (const zone of zones) {
      if (zone.isStarter) discoveredZoneIds.add(zone.id);
    }

    for (const log of logs) {
      const result = log.result as { zoneId?: unknown } | null;
      const zoneId = result?.zoneId;
      if (typeof zoneId === 'string') {
        discoveredZoneIds.add(zoneId);
      }
    }

    res.json({
      zones: zones.map(z => ({
        id: z.id,
        name: discoveredZoneIds.has(z.id) ? z.name : '???',
        description: discoveredZoneIds.has(z.id) ? z.description : null,
        difficulty: z.difficulty,
        travelCost: z.travelCost,
        isStarter: z.isStarter,
        discovered: discoveredZoneIds.has(z.id),
      })),
    });
  } catch (err) {
    next(err);
  }
});

