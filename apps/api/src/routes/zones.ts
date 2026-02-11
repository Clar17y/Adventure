import { Router } from 'express';
import { prisma } from '@adventure/database';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ensureStarterDiscoveries, getDiscoveredZoneIds } from '../services/zoneDiscoveryService';

const db = prisma as unknown as any;

export const zonesRouter = Router();

zonesRouter.use(authenticate);

/**
 * GET /api/v1/zones
 * Returns zones with discovery state, connections between discovered zones, and currentZoneId.
 */
zonesRouter.get('/', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;

    // Lazy-init starter discoveries for this player
    await ensureStarterDiscoveries(playerId);

    // Fetch all data in parallel
    const [zones, connections, discoveredZoneIds, player] = await Promise.all([
      db.zone.findMany({
        orderBy: [{ isStarter: 'desc' }, { difficulty: 'asc' }, { name: 'asc' }],
      }),
      db.zoneConnection.findMany({ select: { fromId: true, toId: true } }),
      getDiscoveredZoneIds(playerId),
      prisma.player.findUnique({ where: { id: playerId }, select: { currentZoneId: true } }),
    ]);

    if (zones.length === 0) {
      throw new AppError(500, 'No zones configured. Run database seed.', 'NO_ZONES_CONFIGURED');
    }

    // Lazy-init currentZoneId if null (existing players from before this feature)
    let currentZoneId = player?.currentZoneId ?? null;
    if (!currentZoneId) {
      const starterZone = await db.zone.findFirst({ where: { isStarter: true } });
      if (starterZone) {
        currentZoneId = starterZone.id;
        await prisma.player.update({
          where: { id: playerId },
          data: { currentZoneId: starterZone.id, homeTownId: starterZone.id },
        });
      }
    }

    // Only include connections where both endpoints are discovered
    const filteredConnections = connections.filter(
      (c: { fromId: string; toId: string }) =>
        discoveredZoneIds.has(c.fromId) && discoveredZoneIds.has(c.toId),
    );

    res.json({
      zones: zones.map((z: { id: string; name: string; description: string | null; difficulty: number; travelCost: number; isStarter: boolean; zoneType: string; zoneExitChance: number | null }) => {
        const discovered = discoveredZoneIds.has(z.id);
        return {
          id: z.id,
          name: discovered ? z.name : '???',
          description: discovered ? z.description : null,
          difficulty: discovered ? z.difficulty : 0,
          travelCost: discovered ? z.travelCost : 0,
          isStarter: z.isStarter,
          discovered,
          zoneType: z.zoneType,
          zoneExitChance: discovered ? z.zoneExitChance : null,
        };
      }),
      connections: filteredConnections.map((c: { fromId: string; toId: string }) => ({
        fromId: c.fromId,
        toId: c.toId,
      })),
      currentZoneId,
    });
  } catch (err) {
    next(err);
  }
});

