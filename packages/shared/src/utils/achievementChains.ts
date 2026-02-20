import type { PlayerAchievementProgress } from '../types/achievement.types';

export interface AchievementChainEntry {
  achievement: PlayerAchievementProgress;
  currentTier: number;
  totalTiers: number;
  completedTiers: number;
  allComplete: boolean;
}

export function groupAchievementChains(
  achievements: PlayerAchievementProgress[],
): AchievementChainEntry[] {
  const chains = new Map<string, PlayerAchievementProgress[]>();

  for (const ach of achievements) {
    const key = ach.statKey ?? ach.familyKey ?? `__singleton_${ach.id}`;
    const group = chains.get(key);
    if (group) {
      group.push(ach);
    } else {
      chains.set(key, [ach]);
    }
  }

  const result: AchievementChainEntry[] = [];

  for (const group of chains.values()) {
    group.sort((a, b) => (a.tier ?? a.threshold) - (b.tier ?? b.threshold));

    const completedTiers = group.filter((a) => a.unlocked).length;
    const allComplete = completedTiers === group.length;

    // Priority: unclaimed reward first (so user can claim), then first incomplete, then last
    const unclaimed = group.find((a) => a.unlocked && !a.rewardClaimed && (a.rewards?.length ?? 0) > 0);
    const active = unclaimed ?? group.find((a) => !a.unlocked) ?? group[group.length - 1];
    const currentTier = group.indexOf(active) + 1;

    result.push({
      achievement: active,
      currentTier,
      totalTiers: group.length,
      completedTiers,
      allComplete,
    });
  }

  return result;
}
