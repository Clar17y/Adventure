import { describe, it, expect } from 'vitest';
import { filterAndWeightMobsByTier, selectTierWithBleedthrough } from './mobTierFilter';

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

  // --- negative / edge cases ---

  it('returns empty array for empty mobs input', () => {
    const result = filterAndWeightMobsByTier([], 50, defaultTiers);
    expect(result).toEqual([]);
  });

  it('returns empty array for negative exploration percent', () => {
    const mobs = [makeMob('a', 1)];
    const result = filterAndWeightMobsByTier(mobs, -10, defaultTiers);
    expect(result).toEqual([]);
  });

  it('treats exploration percent above 100 the same as 100', () => {
    const mobs = [makeMob('a', 1), makeMob('b', 4)];
    const result = filterAndWeightMobsByTier(mobs, 999, defaultTiers);
    expect(result).toHaveLength(2);
  });

  it('excludes mobs whose tier is not in the tiers map', () => {
    const mobs = [makeMob('a', 1), makeMob('b', 5)];
    const result = filterAndWeightMobsByTier(mobs, 100, defaultTiers);
    expect(result.map(m => m.id)).toEqual(['a']);
  });

  it('returns empty array when tiers map is empty', () => {
    const mobs = [makeMob('a', 1), makeMob('b', 2)];
    const result = filterAndWeightMobsByTier(mobs, 50, {});
    expect(result).toEqual([]);
  });

  it('preserves zero encounter weight without boosting', () => {
    const mobs = [makeMob('a', 1, 0), makeMob('b', 2, 0)];
    const result = filterAndWeightMobsByTier(mobs, 30, defaultTiers);
    expect(result.find(m => m.id === 'a')!.encounterWeight).toBe(0);
    expect(result.find(m => m.id === 'b')!.encounterWeight).toBe(0);
  });

  it('does not boost when all filtered mobs share the same tier', () => {
    const mobs = [makeMob('a', 2, 100), makeMob('b', 2, 100)];
    const tiers = { '2': 0 };
    const result = filterAndWeightMobsByTier(mobs, 50, tiers);
    expect(result.every(m => m.encounterWeight === 100)).toBe(true);
  });

  it('preserves extra properties on mob objects', () => {
    const mob = { id: 'a', explorationTier: 1, encounterWeight: 100, name: 'Rat', level: 3 };
    const result = filterAndWeightMobsByTier([mob], 10, defaultTiers);
    expect(result[0]!.name).toBe('Rat');
    expect(result[0]!.level).toBe(3);
  });
});

describe('selectTierWithBleedthrough', () => {
  const defaultTiers = { '1': 0, '2': 25, '3': 50, '4': 75 };

  it('returns current tier when rng < 0.75', () => {
    expect(selectTierWithBleedthrough(1, defaultTiers, () => 0.5)).toBe(1);
  });

  it('returns tier+1 when rng is between 0.75 and 0.95', () => {
    expect(selectTierWithBleedthrough(1, defaultTiers, () => 0.85)).toBe(2);
  });

  it('returns tier+2 when rng >= 0.95', () => {
    expect(selectTierWithBleedthrough(1, defaultTiers, () => 0.96)).toBe(3);
  });

  it('caps at max tier in zone', () => {
    expect(selectTierWithBleedthrough(1, { '1': 0, '2': 25 }, () => 0.96)).toBe(2);
  });

  it('caps tier+1 at max tier when already at highest tier', () => {
    expect(selectTierWithBleedthrough(4, defaultTiers, () => 0.85)).toBe(4);
  });

  it('returns current tier for single-tier zone', () => {
    expect(selectTierWithBleedthrough(1, { '1': 0 }, () => 0.96)).toBe(1);
  });

  it('uses default tiers when zoneTiers is null', () => {
    expect(selectTierWithBleedthrough(1, null, () => 0.85)).toBe(2);
  });
});
