import { describe, it, expect } from 'vitest';
import { calculateEloChange } from './eloService';

describe('calculateEloChange', () => {
  it('equal ratings: winner gains ~16, loser loses ~16', () => {
    const result = calculateEloChange(1000, 1000, 32);
    expect(result.winnerDelta).toBe(16);
    expect(result.loserDelta).toBe(-16);
  });

  it('underdog wins: gains more points', () => {
    const result = calculateEloChange(800, 1200, 32);
    expect(result.winnerDelta).toBeGreaterThan(16);
  });

  it('favorite wins: gains fewer points', () => {
    const result = calculateEloChange(1200, 800, 32);
    expect(result.winnerDelta).toBeLessThan(16);
  });

  it('rating never goes below 0', () => {
    const result = calculateEloChange(1200, 10, 32);
    expect(result.loserDelta).toBeGreaterThanOrEqual(-10);
  });
});
