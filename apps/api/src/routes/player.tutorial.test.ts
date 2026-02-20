import { describe, it, expect } from 'vitest';

/** Mirrors the validation logic in PATCH /player/tutorial */
function isValidTutorialAdvance(currentStep: number, requestedStep: number): boolean {
  const isSkip = requestedStep === -1;
  const isNextStep = requestedStep === currentStep + 1;
  if (!isSkip && !isNextStep) return false;
  if (currentStep >= 8 && !isSkip) return false;
  return true;
}

describe('tutorial step validation', () => {
  it('accepts valid forward step (current + 1)', () => {
    expect(isValidTutorialAdvance(2, 3)).toBe(true);
  });

  it('accepts skip (-1)', () => {
    expect(isValidTutorialAdvance(2, -1)).toBe(true);
  });

  it('rejects skipping steps', () => {
    expect(isValidTutorialAdvance(2, 5)).toBe(false);
  });

  it('rejects going backwards', () => {
    expect(isValidTutorialAdvance(5, 3)).toBe(false);
  });

  it('rejects updating already completed tutorial', () => {
    expect(isValidTutorialAdvance(8, 9)).toBe(false);
  });
});
