import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildPlayerCombatStats,
  calculateFinalDamage,
  isCriticalHit,
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
});
