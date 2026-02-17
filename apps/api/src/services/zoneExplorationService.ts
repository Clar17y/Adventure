import { prisma } from '@adventure/database';

const db = prisma as unknown as any;

export async function getExplorationPercent(
  playerId: string,
  zoneId: string,
): Promise<{ turnsExplored: number; percent: number; turnsToExplore: number | null }> {
  const [record, zone] = await Promise.all([
    db.playerZoneExploration.findUnique({
      where: { playerId_zoneId: { playerId, zoneId } },
      select: { turnsExplored: true },
    }),
    db.zone.findUnique({
      where: { id: zoneId },
      select: { turnsToExplore: true },
    }),
  ]);

  const turnsExplored: number = record?.turnsExplored ?? 0;
  const turnsToExplore: number | null = zone?.turnsToExplore ?? null;

  if (!turnsToExplore || turnsToExplore <= 0) {
    return { turnsExplored, percent: 100, turnsToExplore };
  }

  const percent = Math.min(100, (turnsExplored / turnsToExplore) * 100);
  return { turnsExplored, percent, turnsToExplore };
}

export async function addExplorationTurns(
  playerId: string,
  zoneId: string,
  turns: number,
): Promise<void> {
  if (turns <= 0) return;

  await db.playerZoneExploration.upsert({
    where: { playerId_zoneId: { playerId, zoneId } },
    create: { playerId, zoneId, turnsExplored: turns },
    update: { turnsExplored: { increment: turns } },
  });
}
