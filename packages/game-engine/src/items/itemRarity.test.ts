import { describe, expect, it } from 'vitest';
import {
  calculateDropRarityWeights,
  calculateForgeUpgradeSuccessChance,
  getBonusSlotCount,
  getForgeRerollCost,
  getForgeUpgradeCost,
  getNextRarity,
  rarityFromBonusSlotCount,
  rollBonusStatsForRarity,
  rollDropRarity,
  rollForgeUpgradeSuccess,
} from './itemRarity';

describe('itemRarity', () => {
  it('maps rarity to slot counts and back', () => {
    expect(getBonusSlotCount('common')).toBe(0);
    expect(getBonusSlotCount('legendary')).toBe(4);

    expect(rarityFromBonusSlotCount(0)).toBe('common');
    expect(rarityFromBonusSlotCount(1)).toBe('uncommon');
    expect(rarityFromBonusSlotCount(4)).toBe('legendary');
    expect(rarityFromBonusSlotCount(99)).toBe('legendary');
  });

  it('computes rarity progression', () => {
    expect(getNextRarity('common')).toBe('uncommon');
    expect(getNextRarity('uncommon')).toBe('rare');
    expect(getNextRarity('rare')).toBe('epic');
    expect(getNextRarity('epic')).toBe('legendary');
    expect(getNextRarity('legendary')).toBeNull();
  });

  it('returns forge costs by rarity', () => {
    expect(getForgeUpgradeCost('common')).toBe(100);
    expect(getForgeUpgradeCost('legendary')).toBeNull();
    expect(getForgeRerollCost('common')).toBeNull();
    expect(getForgeRerollCost('legendary')).toBe(600);
  });

  it('applies forge luck bonus with cap', () => {
    expect(calculateForgeUpgradeSuccessChance('common', 0)).toBeCloseTo(0.6);
    expect(calculateForgeUpgradeSuccessChance('common', 50)).toBeCloseTo(0.65);
    expect(calculateForgeUpgradeSuccessChance('common', 500)).toBeCloseTo(0.7);
    expect(calculateForgeUpgradeSuccessChance('legendary', 999)).toBeNull();
  });

  it('rolls forge upgrades deterministically', () => {
    expect(rollForgeUpgradeSuccess('common', 0, 0.59)).toBe(true);
    expect(rollForgeUpgradeSuccess('common', 0, 0.6)).toBe(false);
  });

  it('computes drop weights with mob level and prefix multiplier', () => {
    const level1 = calculateDropRarityWeights(1, 1);
    expect(level1.common).toBeCloseTo(650);
    expect(level1.uncommon).toBeCloseTo(250);
    expect(level1.rare).toBeCloseTo(80);
    expect(level1.epic).toBeCloseTo(18);
    expect(level1.legendary).toBeCloseTo(2);

    const level11Ancient = calculateDropRarityWeights(11, 2);
    expect(level11Ancient.common).toBeCloseTo(630);
    expect(level11Ancient.uncommon).toBeCloseTo(520);
    expect(level11Ancient.rare).toBeCloseTo(172);
    expect(level11Ancient.epic).toBeCloseTo(42);
    expect(level11Ancient.legendary).toBeCloseTo(6);
  });

  it('rolls drop rarity from weighted totals deterministically', () => {
    expect(rollDropRarity(1, 1, 0)).toBe('common');
    expect(rollDropRarity(1, 1, 0.8)).toBe('uncommon');
    expect(rollDropRarity(1, 1, 0.95)).toBe('rare');
    expect(rollDropRarity(1, 1, 0.99)).toBe('epic');
    expect(rollDropRarity(1, 1, 0.999)).toBe('legendary');
  });

  it('allows duplicate stat rolls and stacks their values', () => {
    const rolled = rollBonusStatsForRarity({
      itemType: 'weapon',
      rarity: 'epic',
      baseStats: { attack: 20 },
      statRolls: [0, 0, 0],
      bonusPercentRolls: [0, 0.5, 0.999],
    });

    expect(rolled).not.toBeNull();
    const entries = Object.entries(rolled ?? {});
    expect(entries.length).toBe(1);
    expect(entries[0]?.[0]).toBe('attack');
    expect((rolled?.attack ?? 0)).toBeGreaterThan(0);
  });

  it('uses template-aware weapon pool (primary lane + utility)', () => {
    const rolled = rollBonusStatsForRarity({
      itemType: 'weapon',
      rarity: 'legendary',
      baseStats: { rangedPower: 10 },
      statRolls: [0.999, 0.5, 0.25, 0],
      bonusPercentRolls: [0.1, 0.2, 0.3, 0.4],
    });

    expect(rolled).not.toBeNull();
    const entries = Object.entries(rolled ?? {});
    expect(entries.length).toBeGreaterThan(0);
    const allowed = new Set(['rangedPower', 'dodge', 'accuracy', 'luck']);
    for (const [key, value] of entries) {
      expect(allowed.has(key)).toBe(true);
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(1);
    }
    expect(rolled?.attack ?? 0).toBe(0);
    expect(rolled?.magicPower ?? 0).toBe(0);
  });

  it('returns null bonus stats for non-equipment rarities or no slots', () => {
    expect(
      rollBonusStatsForRarity({
        itemType: 'resource',
        rarity: 'legendary',
        baseStats: null,
      })
    ).toBeNull();

    expect(
      rollBonusStatsForRarity({
        itemType: 'weapon',
        rarity: 'common',
        baseStats: { attack: 100 },
      })
    ).toBeNull();
  });
});
