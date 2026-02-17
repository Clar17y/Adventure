import { describe, it, expect } from 'vitest';
import { calculateEloChange } from './eloService';

describe('calculateEloChange', () => {
  it('equal ratings: winner gains ~16, loser loses ~16', () => {
    const result = calculateEloChange(1000, 1000, 32);
    expect(result.deltaA).toBe(16);
    expect(result.deltaB).toBe(-16);
  });

  it('underdog wins: gains more points', () => {
    const result = calculateEloChange(800, 1200, 32);
    expect(result.deltaA).toBeGreaterThan(16);
  });

  it('favorite wins: gains fewer points', () => {
    const result = calculateEloChange(1200, 800, 32);
    expect(result.deltaA).toBeLessThan(16);
  });

  it('rating never goes below 0', () => {
    const result = calculateEloChange(1200, 10, 32);
    expect(result.deltaB).toBeGreaterThanOrEqual(-10);
  });

  it('draw: both players get small adjustment', () => {
    const result = calculateEloChange(1000, 1000, 32, 0.5);
    expect(result.deltaA).toBe(0);
    expect(result.deltaB).toBe(0);
  });

  it('draw: weaker player gains rating', () => {
    const result = calculateEloChange(800, 1200, 32, 0.5);
    expect(result.deltaA).toBeGreaterThan(0);
  });
});
