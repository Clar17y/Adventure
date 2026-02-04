import { describe, expect, it } from 'vitest';
import { shouldResetWindowCap } from './xpCalculator';

describe('shouldResetWindowCap', () => {
  it('does not reset within the same 3-hour window', () => {
    const lastResetAt = new Date(2026, 1, 4, 1, 0, 0); // Feb 4, 01:00 local
    const now = new Date(2026, 1, 4, 2, 59, 59); // still window 0
    expect(shouldResetWindowCap(lastResetAt, now)).toBe(false);
  });

  it('resets when crossing a 3-hour window boundary', () => {
    const lastResetAt = new Date(2026, 1, 4, 2, 59, 59);
    const now = new Date(2026, 1, 4, 3, 0, 0); // window 1
    expect(shouldResetWindowCap(lastResetAt, now)).toBe(true);
  });

  it('resets when the day changes', () => {
    const lastResetAt = new Date(2026, 1, 3, 23, 59, 59);
    const now = new Date(2026, 1, 4, 0, 0, 0);
    expect(shouldResetWindowCap(lastResetAt, now)).toBe(true);
  });

  it('does not immediately re-reset after updating lastResetAt to the current time', () => {
    const now = new Date(2026, 1, 4, 13, 0, 0);
    const updatedLastResetAt = new Date(2026, 1, 4, 13, 0, 0);
    const laterSameWindow = new Date(2026, 1, 4, 14, 0, 0);
    expect(shouldResetWindowCap(updatedLastResetAt, laterSameWindow)).toBe(false);
  });
});

