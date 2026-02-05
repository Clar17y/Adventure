import { describe, expect, it } from 'vitest';
import { shouldResetWindowCap } from './xpCalculator';

describe('shouldResetWindowCap', () => {
  it('does not reset within the rolling 6-hour window', () => {
    const lastResetAt = new Date(2026, 1, 4, 1, 0, 0); // Feb 4, 01:00 local
    const now = new Date(2026, 1, 4, 6, 59, 59); // 5:59:59 elapsed
    expect(shouldResetWindowCap(lastResetAt, now)).toBe(false);
  });

  it('resets when the rolling 6-hour window duration elapses', () => {
    const lastResetAt = new Date(2026, 1, 4, 1, 0, 0);
    const now = new Date(2026, 1, 4, 7, 0, 0); // 6:00:00 elapsed
    expect(shouldResetWindowCap(lastResetAt, now)).toBe(true);
  });

  it('does not reset just because the day changes (rolling windows)', () => {
    const lastResetAt = new Date(2026, 1, 3, 23, 0, 0);
    const now = new Date(2026, 1, 4, 0, 30, 0); // 1:30 elapsed
    expect(shouldResetWindowCap(lastResetAt, now)).toBe(false);
  });

  it('does not immediately re-reset after updating lastResetAt to the current time', () => {
    const now = new Date(2026, 1, 4, 13, 0, 0);
    const updatedLastResetAt = new Date(2026, 1, 4, 13, 0, 0);
    const laterSameWindow = new Date(2026, 1, 4, 18, 59, 59);
    expect(shouldResetWindowCap(updatedLastResetAt, laterSameWindow)).toBe(false);
  });
});
