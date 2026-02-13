import { describe, expect, it } from 'vitest';
import { rarityFromTier, RARITY_COLORS, RARITY_GLOW, type Rarity } from './rarity';

describe('rarityFromTier', () => {
  it('returns common for tier 0', () => {
    expect(rarityFromTier(0)).toBe('common');
  });

  it('returns common for tier 1', () => {
    expect(rarityFromTier(1)).toBe('common');
  });

  it('returns uncommon for tier 2', () => {
    expect(rarityFromTier(2)).toBe('uncommon');
  });

  it('returns rare for tier 3', () => {
    expect(rarityFromTier(3)).toBe('rare');
  });

  it('returns epic for tier 4', () => {
    expect(rarityFromTier(4)).toBe('epic');
  });

  it('returns legendary for tier 5', () => {
    expect(rarityFromTier(5)).toBe('legendary');
  });

  it('returns legendary for tier > 5', () => {
    expect(rarityFromTier(10)).toBe('legendary');
  });

  it('returns common for negative tier', () => {
    expect(rarityFromTier(-1)).toBe('common');
  });
});

describe('RARITY_COLORS', () => {
  const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  it('has entries for all 5 rarities', () => {
    for (const r of rarities) {
      expect(RARITY_COLORS[r]).toBeDefined();
      expect(typeof RARITY_COLORS[r]).toBe('string');
    }
  });
});

describe('RARITY_GLOW', () => {
  const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  it('has entries for all 5 rarities', () => {
    for (const r of rarities) {
      expect(RARITY_GLOW[r]).toBeDefined();
      expect(typeof RARITY_GLOW[r]).toBe('string');
    }
  });
});
