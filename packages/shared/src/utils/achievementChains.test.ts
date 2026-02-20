import { describe, expect, it } from 'vitest';
import type { PlayerAchievementProgress } from '../types/achievement.types';
import { groupAchievementChains } from './achievementChains';

const makeAch = (
  overrides: Partial<PlayerAchievementProgress> & { id: string; threshold: number },
): PlayerAchievementProgress => ({
  category: 'combat',
  title: 'Test',
  description: 'Test',
  progress: 0,
  unlocked: false,
  ...overrides,
});

describe('groupAchievementChains', () => {
  it('groups achievements by statKey into a single chain entry showing the current tier', () => {
    const achievements: PlayerAchievementProgress[] = [
      makeAch({ id: 'kills_100', statKey: 'totalKills', threshold: 100, tier: 1, progress: 100, unlocked: true, rewardClaimed: true }),
      makeAch({ id: 'kills_500', statKey: 'totalKills', threshold: 500, tier: 2, progress: 150, unlocked: false }),
      makeAch({ id: 'kills_1000', statKey: 'totalKills', threshold: 1000, tier: 3, progress: 150, unlocked: false }),
    ];

    const result = groupAchievementChains(achievements);
    const chain = result.find((e) => e.achievement.id === 'kills_500');
    expect(chain).toBeDefined();
    expect(chain!.currentTier).toBe(2);
    expect(chain!.totalTiers).toBe(3);
    expect(chain!.completedTiers).toBe(1);
    expect(result.filter((e) => e.achievement.statKey === 'totalKills')).toHaveLength(1);
  });

  it('shows the highest completed tier when all tiers are done', () => {
    const achievements: PlayerAchievementProgress[] = [
      makeAch({ id: 'a1', statKey: 'totalCrafts', threshold: 1, tier: 1, progress: 1, unlocked: true }),
      makeAch({ id: 'a2', statKey: 'totalCrafts', threshold: 50, tier: 2, progress: 50, unlocked: true }),
    ];

    const result = groupAchievementChains(achievements);
    const chain = result.find((e) => e.achievement.statKey === 'totalCrafts');
    expect(chain!.achievement.id).toBe('a2');
    expect(chain!.completedTiers).toBe(2);
    expect(chain!.allComplete).toBe(true);
  });

  it('treats singleton achievements as their own chain', () => {
    const achievements: PlayerAchievementProgress[] = [
      makeAch({ id: 'secret_death', statKey: 'totalDeaths', threshold: 1, progress: 0, unlocked: false }),
    ];
    const result = groupAchievementChains(achievements);
    expect(result).toHaveLength(1);
    expect(result[0].totalTiers).toBe(1);
  });

  it('groups family achievements by familyKey', () => {
    const achievements: PlayerAchievementProgress[] = [
      makeAch({ id: 'family_wolves_500', category: 'family', familyKey: 'wolves', threshold: 500, tier: 1, progress: 200, unlocked: false }),
      makeAch({ id: 'family_wolves_2500', category: 'family', familyKey: 'wolves', threshold: 2500, tier: 2, progress: 200, unlocked: false }),
      makeAch({ id: 'family_wolves_5000', category: 'family', familyKey: 'wolves', threshold: 5000, tier: 3, progress: 200, unlocked: false }),
    ];

    const result = groupAchievementChains(achievements);
    expect(result.filter((e) => e.achievement.familyKey === 'wolves')).toHaveLength(1);
    expect(result[0].achievement.id).toBe('family_wolves_500');
    expect(result[0].totalTiers).toBe(3);
  });

  it('returns correct total counts across all chains', () => {
    const achievements: PlayerAchievementProgress[] = [
      makeAch({ id: 'a1', statKey: 'totalKills', threshold: 100, tier: 1, progress: 100, unlocked: true }),
      makeAch({ id: 'a2', statKey: 'totalKills', threshold: 500, tier: 2, progress: 150, unlocked: false }),
      makeAch({ id: 'b1', threshold: 1, progress: 1, unlocked: true }),
    ];

    const result = groupAchievementChains(achievements);
    const totalAchievements = result.reduce((sum, e) => sum + e.totalTiers, 0);
    const totalCompleted = result.reduce((sum, e) => sum + e.completedTiers, 0);
    expect(totalAchievements).toBe(3);
    expect(totalCompleted).toBe(2);
  });
});
