import { FLEE_CONSTANTS } from '@adventure/shared';
import type { FleeOutcome } from '@adventure/shared';

export interface FleeInput {
  evasionLevel: number;
  maxHp: number;
  currentGold: number;
}

export interface FleeCalculationResult {
  outcome: FleeOutcome;
  remainingHp: number;
  goldLost: number;
  recoveryCost: number | null;
}

export function calculateFleeChance(evasionLevel: number): number {
  return Math.min(
    0.95,
    FLEE_CONSTANTS.BASE_FLEE_CHANCE +
      evasionLevel * FLEE_CONSTANTS.FLEE_CHANCE_PER_EVASION
  );
}

export function determineFleeOutcome(
  roll: number,
  fleeChance: number
): FleeOutcome {
  const normalizedRoll = roll / fleeChance;

  if (normalizedRoll >= FLEE_CONSTANTS.HIGH_SUCCESS_THRESHOLD) {
    return 'clean_escape';
  }
  if (normalizedRoll >= FLEE_CONSTANTS.PARTIAL_SUCCESS_THRESHOLD) {
    return 'wounded_escape';
  }
  return 'knockout';
}

export function calculateFleeResult(
  input: FleeInput,
  roll: number = Math.random()
): FleeCalculationResult {
  const fleeChance = calculateFleeChance(input.evasionLevel);
  const outcome = determineFleeOutcome(roll, fleeChance);

  let remainingHp: number;
  let goldLossPercent: number;
  let recoveryCost: number | null = null;

  switch (outcome) {
    case 'clean_escape':
      remainingHp = Math.max(
        1,
        Math.floor(input.maxHp * FLEE_CONSTANTS.HIGH_SUCCESS_HP_PERCENT)
      );
      goldLossPercent = FLEE_CONSTANTS.GOLD_LOSS_MINOR;
      break;
    case 'wounded_escape':
      remainingHp = FLEE_CONSTANTS.PARTIAL_SUCCESS_HP;
      goldLossPercent = FLEE_CONSTANTS.GOLD_LOSS_MODERATE;
      break;
    case 'knockout':
      remainingHp = 0;
      goldLossPercent = FLEE_CONSTANTS.GOLD_LOSS_SEVERE;
      recoveryCost = input.maxHp; // 1 turn per max HP
      break;
  }

  const goldLost = Math.floor(input.currentGold * goldLossPercent);

  return {
    outcome,
    remainingHp,
    goldLost,
    recoveryCost,
  };
}
