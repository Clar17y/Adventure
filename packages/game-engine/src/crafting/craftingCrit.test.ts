import { describe, expect, it } from 'vitest';
import {
  calculateCraftingCrit,
  calculateCritChance,
  getEligibleBonusStats,
  rollBonusStat,
} from './craftingCrit';

describe('calculateCritChance', () => {
  it('returns base crit chance at exact recipe level', () => {
    expect(calculateCritChance(10, 10, 0)).toBeCloseTo(0.05);
  });

  it('scales with level advantage and luck', () => {
    expect(calculateCritChance(20, 10, 10)).toBeCloseTo(0.17);
  });

  it('clamps to min and max bounds', () => {
    expect(calculateCritChance(1, 50, 0)).toBeCloseTo(0.01);
    expect(calculateCritChance(100, 1, 500)).toBeCloseTo(0.5);
  });
});

describe('getEligibleBonusStats', () => {
  it('returns weapon stat pool', () => {
    expect(getEligibleBonusStats('weapon')).toEqual([
      'attack',
      'magicPower',
      'rangedPower',
      'evasion',
      'luck',
    ]);
  });

  it('returns armor stat pool', () => {
    expect(getEligibleBonusStats('armor')).toEqual([
      'armor',
      'health',
      'evasion',
      'luck',
    ]);
  });

  it('returns empty pool for non-equipment types', () => {
    expect(getEligibleBonusStats('resource')).toEqual([]);
    expect(getEligibleBonusStats('consumable')).toEqual([]);
  });
});

describe('rollBonusStat', () => {
  it('rolls stat from available base-stat pool and computes percentage bonus', () => {
    const result = rollBonusStat(
      ['attack', 'magicPower', 'rangedPower', 'evasion', 'luck'],
      { attack: 50, luck: 10 },
      { statRoll: 0.7, bonusPercentRoll: 0.5 }
    );

    expect(result).toEqual({ stat: 'luck', value: 2 });
  });

  it('guarantees minimum bonus even for low or missing base stat', () => {
    const withZero = rollBonusStat(['attack'], { attack: 0 }, { statRoll: 0, bonusPercentRoll: 0 });
    const withMissing = rollBonusStat(['attack'], {}, { statRoll: 0, bonusPercentRoll: 0 });

    expect(withZero).toEqual({ stat: 'attack', value: 1 });
    expect(withMissing).toEqual({ stat: 'attack', value: 1 });
  });
});

describe('calculateCraftingCrit', () => {
  it('returns non-crit for non-equipment item types', () => {
    const result = calculateCraftingCrit({
      skillLevel: 20,
      requiredLevel: 1,
      luckStat: 20,
      itemType: 'resource',
      baseStats: {},
    }, {
      critRoll: 0,
    });

    expect(result.isCrit).toBe(false);
    expect(result.critChance).toBeCloseTo(0.28);
    expect(result.bonusStat).toBeNull();
    expect(result.bonusValue).toBeNull();
  });

  it('returns deterministic crit result when rolls are provided', () => {
    const result = calculateCraftingCrit({
      skillLevel: 25,
      requiredLevel: 5,
      luckStat: 10,
      itemType: 'weapon',
      baseStats: { attack: 50, evasion: 20 },
    }, {
      critRoll: 0.01,
      statRoll: 0.9,
      bonusPercentRoll: 0.5,
    });

    expect(result.isCrit).toBe(true);
    expect(result.critChance).toBeCloseTo(0.27);
    expect(result.bonusStat).toBe('evasion');
    expect(result.bonusValue).toBe(4);
  });
});
