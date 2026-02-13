import { describe, expect, it } from 'vitest';
import { getAllMobPrefixes, getMobPrefixDefinition } from './mobPrefixes';

describe('getAllMobPrefixes', () => {
  it('returns all 10 prefixes', () => {
    expect(getAllMobPrefixes()).toHaveLength(10);
  });

  it('each prefix has required fields', () => {
    for (const p of getAllMobPrefixes()) {
      expect(p.key).toBeTruthy();
      expect(p.displayName).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.weight).toBeGreaterThan(0);
      expect(p.xpMultiplier).toBeGreaterThan(0);
      expect(p.dropChanceMultiplier).toBeGreaterThan(0);
    }
  });

  it('all stat multipliers are in reasonable range', () => {
    for (const p of getAllMobPrefixes()) {
      for (const val of Object.values(p.statMultipliers)) {
        expect(val).toBeGreaterThanOrEqual(0.3);
        expect(val).toBeLessThanOrEqual(3.5);
      }
    }
  });
});

describe('getMobPrefixDefinition', () => {
  const allKeys = getAllMobPrefixes().map(p => p.key);

  it('returns correct definition for each known key', () => {
    for (const key of allKeys) {
      const def = getMobPrefixDefinition(key);
      expect(def).not.toBeNull();
      expect(def!.key).toBe(key);
    }
  });

  it('returns null for undefined', () => {
    expect(getMobPrefixDefinition(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(getMobPrefixDefinition(null)).toBeNull();
  });

  it('returns null for unknown key', () => {
    expect(getMobPrefixDefinition('nonexistent')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getMobPrefixDefinition('')).toBeNull();
  });
});

describe('spell templates', () => {
  it('prefixes with spells have valid intervals', () => {
    for (const p of getAllMobPrefixes()) {
      if (p.spellTemplate) {
        expect(p.spellTemplate.interval).toBeGreaterThan(0);
        expect(p.spellTemplate.startRound).toBeGreaterThan(0);
        expect(p.spellTemplate.damageMultiplier).toBeGreaterThan(0);
        expect(p.spellTemplate.actionName).toBeTruthy();
        expect(['avg', 'min', 'max']).toContain(p.spellTemplate.damageFormula);
      }
    }
  });

  it('at least some prefixes have spells', () => {
    const withSpells = getAllMobPrefixes().filter(p => p.spellTemplate !== null);
    expect(withSpells.length).toBeGreaterThan(0);
  });
});
