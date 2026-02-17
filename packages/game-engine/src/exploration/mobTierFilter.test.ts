import { describe, it, expect } from 'vitest';
import { filterAndWeightMobsByTier } from './mobTierFilter';

const makeMob = (id: string, tier: number, weight = 100) => ({
  id,
  explorationTier: tier,
  encounterWeight: weight,
});

describe('filterAndWeightMobsByTier', () => {
  const defaultTiers = { '1': 0, '2': 25, '3': 50, '4': 75 };

  it('returns only tier 1 mobs at 0% explored', () => {
    const mobs = [makeMob('a', 1), makeMob('b', 2), makeMob('c', 3)];
    const result = filterAndWeightMobsByTier(mobs, 0, defaultTiers);
    expect(result.map(m => m.id)).toEqual(['a']);
  });

  it('returns tier 1+2 mobs at 25% explored', () => {
    const mobs = [makeMob('a', 1), makeMob('b', 2), makeMob('c', 3)];
    const result = filterAndWeightMobsByTier(mobs, 25, defaultTiers);
    expect(result.map(m => m.id)).toEqual(['a', 'b']);
  });

  it('returns all mobs at 100% explored', () => {
    const mobs = [makeMob('a', 1), makeMob('b', 2), makeMob('c', 3), makeMob('d', 4)];
    const result = filterAndWeightMobsByTier(mobs, 100, defaultTiers);
    expect(result).toHaveLength(4);
  });

  it('applies 2x weight boost to highest unlocked tier', () => {
    const mobs = [makeMob('a', 1, 100), makeMob('b', 2, 100)];
    const result = filterAndWeightMobsByTier(mobs, 30, defaultTiers);
    expect(result.find(m => m.id === 'a')!.encounterWeight).toBe(100);
    expect(result.find(m => m.id === 'b')!.encounterWeight).toBe(200);
  });

  it('does not boost when only tier 1 is unlocked', () => {
    const mobs = [makeMob('a', 1, 100)];
    const result = filterAndWeightMobsByTier(mobs, 10, defaultTiers);
    expect(result[0]!.encounterWeight).toBe(100);
  });

  it('returns empty array when no mobs match', () => {
    const mobs = [makeMob('a', 2)];
    const result = filterAndWeightMobsByTier(mobs, 0, defaultTiers);
    expect(result).toEqual([]);
  });

  it('handles null explorationTiers by using default thresholds', () => {
    const mobs = [makeMob('a', 1), makeMob('b', 2)];
    const result = filterAndWeightMobsByTier(mobs, 0, null);
    expect(result.map(m => m.id)).toEqual(['a']);
  });

  it('handles custom per-zone tier thresholds', () => {
    const customTiers = { '1': 0, '2': 10, '3': 30, '4': 60 };
    const mobs = [makeMob('a', 1), makeMob('b', 2), makeMob('c', 3)];
    const result = filterAndWeightMobsByTier(mobs, 15, customTiers);
    expect(result.map(m => m.id)).toEqual(['a', 'b']);
  });
});
