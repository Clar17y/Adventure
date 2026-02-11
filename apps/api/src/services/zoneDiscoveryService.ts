import { prisma } from '@adventure/database';

// Prisma client may not be regenerated with new zone models yet.
const db = prisma as unknown as any;

/** Ensure starter zone + town-adjacent discoveries exist for a player. */
export async function ensureStarterDiscoveries(playerId: string): Promise<void> {
  const starterZones = await db.zone.findMany({
    where: { isStarter: true },
    select: { id: true },
  });

  if (starterZones.length === 0) return;

  const starterIds: string[] = starterZones.map((z: { id: string }) => z.id);

  // Get all connections from starter zones
  const connections = await db.zoneConnection.findMany({
    where: { fromId: { in: starterIds } },
    select: { toId: true },
  });

  const connectedIds: string[] = connections.map((c: { toId: string }) => c.toId);

  // Combine starter zones + connected zones, deduplicate
  const allZoneIds = [...new Set([...starterIds, ...connectedIds])];

  await db.playerZoneDiscovery.createMany({
    data: allZoneIds.map((zoneId: string) => ({ playerId, zoneId })),
    skipDuplicates: true,
  });
}

/** Auto-discover all zones connected to a town when arriving. Returns discovered zone IDs. */
export async function discoverZonesFromTown(
  playerId: string,
  townZoneId: string,
): Promise<string[]> {
  const connections = await db.zoneConnection.findMany({
    where: { fromId: townZoneId },
    select: { toId: true },
  });

  const connectedIds: string[] = connections.map((c: { toId: string }) => c.toId);
  const allZoneIds = [...new Set([townZoneId, ...connectedIds])];

  await db.playerZoneDiscovery.createMany({
    data: allZoneIds.map((zoneId: string) => ({ playerId, zoneId })),
    skipDuplicates: true,
  });

  return allZoneIds;
}

/** Discover a single specific zone (e.g. when exploration finds a zone exit). */
export async function discoverZone(playerId: string, zoneId: string): Promise<void> {
  await db.playerZoneDiscovery.createMany({
    data: [{ playerId, zoneId }],
    skipDuplicates: true,
  });
}

/** Get all discovered zone IDs for a player. */
export async function getDiscoveredZoneIds(playerId: string): Promise<Set<string>> {
  const discoveries: Array<{ zoneId: string }> = await db.playerZoneDiscovery.findMany({
    where: { playerId },
    select: { zoneId: true },
  });
  return new Set(discoveries.map((d) => d.zoneId));
}

/** Get undiscovered neighbor zones (for zone_exit rolls during exploration). */
export async function getUndiscoveredNeighborZones(
  playerId: string,
  currentZoneId: string,
): Promise<Array<{ id: string; name: string }>> {
  const [connections, discovered] = await Promise.all([
    db.zoneConnection.findMany({
      where: { fromId: currentZoneId },
      select: {
        toId: true,
        toZone: { select: { id: true, name: true } },
      },
    }),
    getDiscoveredZoneIds(playerId),
  ]);

  return connections
    .filter((c: { toId: string }) => !discovered.has(c.toId))
    .map((c: { toZone: { id: string; name: string } }) => c.toZone);
}
