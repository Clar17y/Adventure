import { prisma } from '@adventure/database';
import { calculateCurrentTurns, calculateTimeToCapMs, spendTurns } from '@adventure/game-engine';
import { AppError } from '../middleware/errorHandler';

export interface TurnState {
  currentTurns: number;
  timeToCapMs: number | null;
  lastRegenAt: string;
}

export async function getTurnState(playerId: string, now: Date = new Date()): Promise<TurnState> {
  const turnBank = await prisma.turnBank.findUnique({ where: { playerId } });

  if (!turnBank) {
    throw new AppError(404, 'Turn bank not found', 'NOT_FOUND');
  }

  const currentTurns = calculateCurrentTurns(turnBank.currentTurns, turnBank.lastRegenAt, now);
  const timeToCapMs = calculateTimeToCapMs(currentTurns);

  return {
    currentTurns,
    timeToCapMs,
    lastRegenAt: turnBank.lastRegenAt.toISOString(),
  };
}

export interface SpendTurnsResult {
  previousTurns: number;
  spent: number;
  currentTurns: number;
  lastRegenAt: string;
  timeToCapMs: number | null;
}

export async function spendPlayerTurns(
  playerId: string,
  amount: number,
  now: Date = new Date()
): Promise<SpendTurnsResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new AppError(400, 'Turn spend amount must be a positive integer', 'INVALID_TURNS');
  }

  const turnBank = await prisma.turnBank.findUnique({ where: { playerId } });

  if (!turnBank) {
    throw new AppError(404, 'Turn bank not found', 'NOT_FOUND');
  }

  const previousTurns = calculateCurrentTurns(turnBank.currentTurns, turnBank.lastRegenAt, now);
  const newBalance = spendTurns(previousTurns, amount);

  if (newBalance === null) {
    throw new AppError(400, 'Insufficient turns', 'INSUFFICIENT_TURNS');
  }

  const updated = await prisma.turnBank.update({
    where: { playerId },
    data: {
      currentTurns: newBalance,
      lastRegenAt: now,
    },
  });

  const timeToCapMs = calculateTimeToCapMs(newBalance);

  return {
    previousTurns,
    spent: amount,
    currentTurns: newBalance,
    lastRegenAt: updated.lastRegenAt.toISOString(),
    timeToCapMs,
  };
}
