import { describe, expect, it } from 'vitest';
import { EXPLORATION_CONSTANTS } from '@adventure/shared';
import { calculateExplorationMobXpMultiplier } from './xpScaling';

describe('calculateExplorationMobXpMultiplier', () => {
  it('returns 1 for invalid inputs', () => {
    expect(calculateExplorationMobXpMultiplier({ explorationTurns: 0, mobEncountersInBatch: 1 })).toBe(1);
    expect(calculateExplorationMobXpMultiplier({ explorationTurns: 100, mobEncountersInBatch: 0 })).toBe(1);
  });

  it('can compute a default multiplier from encounter chance', () => {
    const expectedTurnsPerMob = 1 / EXPLORATION_CONSTANTS.MOB_ENCOUNTER_CHANCE;
    const raw = expectedTurnsPerMob / EXPLORATION_CONSTANTS.MOB_XP_NORMALIZER_TURNS;
    const expected = Math.max(1, Math.min(raw, EXPLORATION_CONSTANTS.MOB_XP_MULTIPLIER_MAX));
    expect(calculateExplorationMobXpMultiplier()).toBeCloseTo(expected, 10);
  });

  it('scales with turns-per-mob and never drops below 1', () => {
    const normalizer = EXPLORATION_CONSTANTS.MOB_XP_NORMALIZER_TURNS;
    const maxMultiplier = EXPLORATION_CONSTANTS.MOB_XP_MULTIPLIER_MAX;

    const m1 = calculateExplorationMobXpMultiplier({ explorationTurns: 1000, mobEncountersInBatch: 1 });
    expect(m1).toBeCloseTo(Math.min(1000 / normalizer, maxMultiplier), 10);

    const m2 = calculateExplorationMobXpMultiplier({ explorationTurns: 1000, mobEncountersInBatch: 2 });
    expect(m2).toBeCloseTo(Math.min(500 / normalizer, maxMultiplier), 10);

    const m3 = calculateExplorationMobXpMultiplier({ explorationTurns: 10, mobEncountersInBatch: 1 });
    expect(m3).toBe(1);
  });

  it('caps at the configured maximum', () => {
    const maxMultiplier = EXPLORATION_CONSTANTS.MOB_XP_MULTIPLIER_MAX;
    const m = calculateExplorationMobXpMultiplier({ explorationTurns: 10_000, mobEncountersInBatch: 1 });
    expect(m).toBe(maxMultiplier);
  });
});
