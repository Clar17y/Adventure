import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MobTemplate } from '@adventure/shared';
import {
  buildPlayerCombatStats,
  calculateFinalDamage,
  doesAttackHit,
  isCriticalHit,
  mobToCombatantStats,
} from './damageCalculator';

describe('isCriticalHit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clamps total crit chance at 100%', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(isCriticalHit(5)).toBe(true);
  });

  it('clamps total crit chance at 0%', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(isCriticalHit(-5)).toBe(false);
  });

  it('treats invalid bonus crit chance as zero bonus', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.04);
    expect(isCriticalHit(Number.NaN)).toBe(true);
  });
});

describe('calculateFinalDamage', () => {
  it('applies crit bonus damage and returns actual multiplier used', () => {
    const result = calculateFinalDamage(10, 0, true, 0.25);
    expect(result.actualMultiplier).toBe(1.75);
    expect(result.damage).toBe(17);
  });

  it('clamps invalid negative crit multiplier to zero', () => {
    const result = calculateFinalDamage(10, 0, true, -10);
    expect(result.actualMultiplier).toBe(0);
    expect(result.damage).toBe(1);
  });

  it('uses multiplier 1 when hit is not critical', () => {
    const result = calculateFinalDamage(10, 0, false, 0.5);
    expect(result.actualMultiplier).toBe(1);
    expect(result.damage).toBe(10);
  });
});

describe('buildPlayerCombatStats', () => {
  it('threads crit stats from equipment', () => {
    const stats = buildPlayerCombatStats(
      80,
      100,
      {
        attackStyle: 'melee',
        skillLevel: 10,
        attributes: {
          vitality: 5,
          strength: 5,
          dexterity: 0,
          intelligence: 0,
          luck: 0,
          evasion: 4,
        },
      },
      {
        attack: 5,
        rangedPower: 0,
        magicPower: 0,
        accuracy: 3,
        armor: 2,
        magicDefence: 1,
        health: 10,
        dodge: 1,
        critChance: 0.2,
        critDamage: 0.35,
      }
    );

    expect(stats.critChance).toBe(0.2);
    expect(stats.critDamage).toBe(0.35);
  });

  it('adds strength-based accuracy for melee', () => {
    const stats = buildPlayerCombatStats(
      80, 100,
      { attackStyle: 'melee', skillLevel: 10, attributes: { vitality: 0, strength: 8, dexterity: 0, intelligence: 0, luck: 0, evasion: 0 } },
      { attack: 5, rangedPower: 0, magicPower: 0, accuracy: 3, armor: 0, magicDefence: 0, health: 0, dodge: 0 }
    );
    // floor(10/2) + 3 equipAccuracy + 8 strength = 16
    expect(stats.accuracy).toBe(16);
  });

  it('adds dexterity-based accuracy for ranged', () => {
    const stats = buildPlayerCombatStats(
      80, 100,
      { attackStyle: 'ranged', skillLevel: 10, attributes: { vitality: 0, strength: 0, dexterity: 8, intelligence: 0, luck: 0, evasion: 0 } },
      { attack: 0, rangedPower: 5, magicPower: 0, accuracy: 3, armor: 0, magicDefence: 0, health: 0, dodge: 0 }
    );
    // floor(10/2) + 3 equipAccuracy + 8 dexterity = 16
    expect(stats.accuracy).toBe(16);
  });

  it('adds intelligence-based accuracy for magic', () => {
    const stats = buildPlayerCombatStats(
      80, 100,
      { attackStyle: 'magic', skillLevel: 10, attributes: { vitality: 0, strength: 0, dexterity: 0, intelligence: 8, luck: 0, evasion: 0 } },
      { attack: 0, rangedPower: 0, magicPower: 5, accuracy: 3, armor: 0, magicDefence: 0, health: 0, dodge: 0 }
    );
    // floor(10/2) + 3 equipAccuracy + 8 intelligence = 16
    expect(stats.accuracy).toBe(16);
  });

  it('does not use off-attribute for accuracy', () => {
    const stats = buildPlayerCombatStats(
      80, 100,
      { attackStyle: 'melee', skillLevel: 10, attributes: { vitality: 0, strength: 0, dexterity: 10, intelligence: 10, luck: 0, evasion: 0 } },
      { attack: 5, rangedPower: 0, magicPower: 0, accuracy: 3, armor: 0, magicDefence: 0, health: 0, dodge: 0 }
    );
    // floor(10/2) + 3 equipAccuracy + 0 (strength is 0, dex/int ignored) = 8
    expect(stats.accuracy).toBe(8);
  });

  it('sets damageType to physical for melee attackStyle', () => {
    const stats = buildPlayerCombatStats(
      80, 100,
      { attackStyle: 'melee', skillLevel: 10, attributes: { vitality: 5, strength: 5, dexterity: 0, intelligence: 0, luck: 0, evasion: 4 } },
      { attack: 5, rangedPower: 0, magicPower: 0, accuracy: 3, armor: 2, magicDefence: 1, health: 10, dodge: 1 }
    );
    expect(stats.damageType).toBe('physical');
  });

  it('sets damageType to physical for ranged attackStyle', () => {
    const stats = buildPlayerCombatStats(
      80, 100,
      { attackStyle: 'ranged', skillLevel: 10, attributes: { vitality: 5, strength: 0, dexterity: 5, intelligence: 0, luck: 0, evasion: 4 } },
      { attack: 0, rangedPower: 5, magicPower: 0, accuracy: 3, armor: 2, magicDefence: 1, health: 10, dodge: 1 }
    );
    expect(stats.damageType).toBe('physical');
  });

  it('sets damageType to magic for magic attackStyle', () => {
    const stats = buildPlayerCombatStats(
      80, 100,
      { attackStyle: 'magic', skillLevel: 10, attributes: { vitality: 5, strength: 0, dexterity: 0, intelligence: 5, luck: 0, evasion: 4 } },
      { attack: 0, rangedPower: 0, magicPower: 5, accuracy: 3, armor: 2, magicDefence: 1, health: 10, dodge: 1 }
    );
    expect(stats.damageType).toBe('magic');
  });
});

describe('mobToCombatantStats', () => {
  const baseMob: MobTemplate = {
    id: 'mob1', name: 'Goblin', zoneId: 'z1', level: 5,
    hp: 50, accuracy: 12, defence: 8, magicDefence: 4, evasion: 6,
    damageMin: 3, damageMax: 7, xpReward: 25, encounterWeight: 1,
    spellPattern: [], damageType: 'physical',
  };

  it('maps MobTemplate fields to CombatantStats', () => {
    const stats = mobToCombatantStats(baseMob);
    expect(stats.hp).toBe(50);
    expect(stats.maxHp).toBe(50);
    expect(stats.attack).toBe(12);
    expect(stats.accuracy).toBe(12);
    expect(stats.defence).toBe(8);
    expect(stats.dodge).toBe(6);
    expect(stats.evasion).toBe(0);
    expect(stats.speed).toBe(0);
    expect(stats.damageType).toBe('physical');
  });

  it('uses currentHp/maxHp overrides when provided', () => {
    const wounded = { ...baseMob, currentHp: 30, maxHp: 60 };
    const stats = mobToCombatantStats(wounded);
    expect(stats.hp).toBe(30);
    expect(stats.maxHp).toBe(60);
  });
});

describe('doesAttackHit', () => {
  it('uses only roll + accuracy against dodge/evasion threshold', () => {
    // roll + accuracy = 10 + 4
    // threshold = 10 + 4 + floor(6 / 2) = 17
    expect(doesAttackHit(10, 4, 4, 6)).toBe(false);
    expect(doesAttackHit(13, 4, 4, 6)).toBe(true);
  });

  it('still applies nat 1 auto-miss and nat 20 auto-hit', () => {
    expect(doesAttackHit(1, 999, 999, 999)).toBe(false);
    expect(doesAttackHit(20, 0, 999, 999)).toBe(true);
  });
});
