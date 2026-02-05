export interface HpState {
  currentHp: number;
  maxHp: number;
  regenPerSecond: number;
  lastHpRegenAt: string;
  isRecovering: boolean;
  recoveryCost: number | null;
}

export interface RestResult {
  previousHp: number;
  healedAmount: number;
  currentHp: number;
  maxHp: number;
  turnsSpent: number;
}

export interface RecoveryResult {
  previousState: 'recovering';
  currentHp: number;
  maxHp: number;
  turnsSpent: number;
}

export type FleeOutcome = 'clean_escape' | 'wounded_escape' | 'knockout';

export interface FleeResult {
  outcome: FleeOutcome;
  remainingHp: number;
  goldLost: number;
  isRecovering: boolean;
  recoveryCost: number | null;
}
