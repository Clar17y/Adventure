import { TIER_BLEED_CONSTANTS, ZONE_EXPLORATION_CONSTANTS } from '@adventure/shared';

interface MobWithTier {
  id: string;
  explorationTier: number;
  encounterWeight: number;
  [key: string]: unknown;
}

export function filterAndWeightMobsByTier<T extends MobWithTier>(
  mobs: T[],
  explorationPercent: number,
  zoneTiers: Record<string, number> | null,
): (T & { encounterWeight: number })[] {
  const tiers = zoneTiers ?? ZONE_EXPLORATION_CONSTANTS.DEFAULT_TIERS;

  let highestUnlockedTier = 0;
  for (const [tierStr, threshold] of Object.entries(tiers)) {
    const tier = Number(tierStr);
    if (explorationPercent >= threshold && tier > highestUnlockedTier) {
      highestUnlockedTier = tier;
    }
  }

  if (highestUnlockedTier === 0) return [];

  const filtered = mobs.filter(m => {
    const tierThreshold = tiers[String(m.explorationTier)];
    return tierThreshold !== undefined && explorationPercent >= tierThreshold;
  });

  if (filtered.length === 0) return [];

  const hasMultipleTiers = new Set(filtered.map(m => m.explorationTier)).size > 1;
  const multiplier = ZONE_EXPLORATION_CONSTANTS.NEWEST_TIER_WEIGHT_MULTIPLIER;

  return filtered.map(m => ({
    ...m,
    encounterWeight: hasMultipleTiers && m.explorationTier === highestUnlockedTier
      ? m.encounterWeight * multiplier
      : m.encounterWeight,
  }));
}

export function selectTierWithBleedthrough(
  currentTier: number,
  zoneTiers: Record<string, number> | null,
  rng: () => number = Math.random,
): number {
  const tiers = zoneTiers ?? ZONE_EXPLORATION_CONSTANTS.DEFAULT_TIERS;
  const maxTier = Math.max(...Object.keys(tiers).map(Number).filter(n => !isNaN(n)), 0);
  if (maxTier <= 0) return currentTier;

  const roll = rng();
  let selectedTier: number;

  if (roll < TIER_BLEED_CONSTANTS.CURRENT_TIER_WEIGHT) {
    selectedTier = currentTier;
  } else if (roll < TIER_BLEED_CONSTANTS.CURRENT_TIER_WEIGHT + TIER_BLEED_CONSTANTS.PLUS_ONE_TIER_WEIGHT) {
    selectedTier = currentTier + 1;
  } else {
    selectedTier = currentTier + 2;
  }

  return Math.min(selectedTier, maxTier);
}
