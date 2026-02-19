import { prisma } from '@adventure/database';

type StatsIncrements = Partial<Record<
  | 'totalKills' | 'totalBossKills' | 'totalBossDamage'
  | 'totalPvpWins' | 'totalCrafts' | 'totalRaresCrafted'
  | 'totalEpicsCrafted' | 'totalLegendariesCrafted'
  | 'totalSalvages' | 'totalForgeUpgrades'
  | 'totalGatheringActions' | 'totalTurnsSpent'
  | 'totalZonesDiscovered' | 'totalZonesFullyExplored'
  | 'totalRecipesLearned' | 'totalBestiaryCompleted'
  | 'totalUniqueMonsterKills' | 'totalDeaths',
  number
>>;

type StatsMaxValues = Partial<Record<
  'highestCharacterLevel' | 'highestSkillLevel' | 'bestPvpWinStreak',
  number
>>;

export async function getOrCreateStats(playerId: string) {
  const existing = await prisma.playerStats.findUnique({ where: { playerId } });
  if (existing) return existing;
  return prisma.playerStats.create({ data: { playerId } });
}

export async function incrementStats(playerId: string, increments: StatsIncrements) {
  const createData: Record<string, number> = {};
  const updateData: Record<string, { increment: number }> = {};

  for (const [key, value] of Object.entries(increments)) {
    if (value && value > 0) {
      createData[key] = value;
      updateData[key] = { increment: value };
    }
  }

  return prisma.playerStats.upsert({
    where: { playerId },
    create: { playerId, ...createData },
    update: updateData,
  });
}

export async function setStatsMax(playerId: string, maxValues: StatsMaxValues) {
  const stats = await getOrCreateStats(playerId);
  const updateData: Record<string, number> = {};

  for (const [key, value] of Object.entries(maxValues)) {
    if (value != null && value > (stats as unknown as Record<string, number>)[key]) {
      updateData[key] = value;
    }
  }

  if (Object.keys(updateData).length === 0) return stats;

  return prisma.playerStats.update({
    where: { playerId },
    data: updateData,
  });
}

export async function incrementFamilyKills(playerId: string, mobFamilyId: string, count = 1) {
  return prisma.playerFamilyStats.upsert({
    where: { playerId_mobFamilyId: { playerId, mobFamilyId } },
    create: { playerId, mobFamilyId, kills: count },
    update: { kills: { increment: count } },
  });
}
