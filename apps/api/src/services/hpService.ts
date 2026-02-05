import { prisma } from '@adventure/database';
import {
  calculateMaxHp,
  calculateRegenPerSecond,
  calculateCurrentHp,
  calculateHealPerTurn,
  calculateRestHealing,
  calculateRecoveryCost,
  calculateRecoveryExitHp,
} from '@adventure/game-engine';
import type { HpState, RestResult, RecoveryResult } from '@adventure/shared';
import { AppError } from '../middleware/errorHandler';
import { getEquipmentStats } from './equipmentService';
import { spendPlayerTurns } from './turnBankService';

async function getVitalityLevel(playerId: string): Promise<number> {
  const skill = await prisma.playerSkill.findUnique({
    where: { playerId_skillType: { playerId, skillType: 'vitality' } },
    select: { level: true },
  });
  return skill?.level ?? 1;
}

export async function getHpState(
  playerId: string,
  now: Date = new Date()
): Promise<HpState> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      currentHp: true,
      lastHpRegenAt: true,
      isRecovering: true,
      recoveryCost: true,
    },
  });

  if (!player) {
    throw new AppError(404, 'Player not found', 'NOT_FOUND');
  }

  const vitalityLevel = await getVitalityLevel(playerId);
  const equipmentStats = await getEquipmentStats(playerId);

  const maxHp = calculateMaxHp({
    vitalityLevel,
    equipmentHealthBonus: equipmentStats.health,
  });

  const regenPerSecond = calculateRegenPerSecond(vitalityLevel);

  const currentHp = calculateCurrentHp(
    player.currentHp,
    player.lastHpRegenAt,
    maxHp,
    regenPerSecond,
    player.isRecovering,
    now
  );

  return {
    currentHp,
    maxHp,
    regenPerSecond,
    lastHpRegenAt: player.lastHpRegenAt.toISOString(),
    isRecovering: player.isRecovering,
    recoveryCost: player.recoveryCost,
  };
}

export async function rest(
  playerId: string,
  turnsToSpend: number,
  now: Date = new Date()
): Promise<RestResult> {
  if (!Number.isInteger(turnsToSpend) || turnsToSpend <= 0) {
    throw new AppError(400, 'Turns must be a positive integer', 'INVALID_TURNS');
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      currentHp: true,
      lastHpRegenAt: true,
      isRecovering: true,
      recoveryCost: true,
    },
  });

  if (!player) {
    throw new AppError(404, 'Player not found', 'NOT_FOUND');
  }

  if (player.isRecovering) {
    throw new AppError(400, 'Cannot rest while recovering. Spend recovery turns first.', 'IS_RECOVERING');
  }

  const vitalityLevel = await getVitalityLevel(playerId);
  const equipmentStats = await getEquipmentStats(playerId);

  const maxHp = calculateMaxHp({
    vitalityLevel,
    equipmentHealthBonus: equipmentStats.health,
  });

  const regenPerSecond = calculateRegenPerSecond(vitalityLevel);
  const currentHp = calculateCurrentHp(
    player.currentHp,
    player.lastHpRegenAt,
    maxHp,
    regenPerSecond,
    false,
    now
  );

  if (currentHp >= maxHp) {
    throw new AppError(400, 'Already at full HP', 'FULL_HP');
  }

  const healPerTurn = calculateHealPerTurn(vitalityLevel);
  const healing = calculateRestHealing(currentHp, maxHp, healPerTurn, turnsToSpend);

  // Spend turns (will throw if insufficient)
  await spendPlayerTurns(playerId, healing.turnsUsed, now);

  // Update HP
  await prisma.player.update({
    where: { id: playerId },
    data: {
      currentHp: healing.newHp,
      lastHpRegenAt: now,
    },
  });

  return {
    previousHp: currentHp,
    healedAmount: healing.healedAmount,
    currentHp: healing.newHp,
    maxHp,
    turnsSpent: healing.turnsUsed,
  };
}

export async function recover(
  playerId: string,
  now: Date = new Date()
): Promise<RecoveryResult> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      isRecovering: true,
      recoveryCost: true,
    },
  });

  if (!player) {
    throw new AppError(404, 'Player not found', 'NOT_FOUND');
  }

  if (!player.isRecovering) {
    throw new AppError(400, 'Not in recovering state', 'NOT_RECOVERING');
  }

  const recoveryCost = player.recoveryCost ?? 0;

  // Spend recovery turns (will throw if insufficient)
  await spendPlayerTurns(playerId, recoveryCost, now);

  const vitalityLevel = await getVitalityLevel(playerId);
  const equipmentStats = await getEquipmentStats(playerId);

  const maxHp = calculateMaxHp({
    vitalityLevel,
    equipmentHealthBonus: equipmentStats.health,
  });

  const exitHp = calculateRecoveryExitHp(maxHp);

  // Exit recovering state
  await prisma.player.update({
    where: { id: playerId },
    data: {
      currentHp: exitHp,
      lastHpRegenAt: now,
      isRecovering: false,
      recoveryCost: null,
    },
  });

  return {
    previousState: 'recovering',
    currentHp: exitHp,
    maxHp,
    turnsSpent: recoveryCost,
  };
}

export async function setHp(
  playerId: string,
  newHp: number,
  now: Date = new Date()
): Promise<void> {
  await prisma.player.update({
    where: { id: playerId },
    data: {
      currentHp: Math.max(0, newHp),
      lastHpRegenAt: now,
    },
  });
}

export async function enterRecoveringState(
  playerId: string,
  maxHp: number,
  now: Date = new Date()
): Promise<void> {
  const recoveryCost = calculateRecoveryCost(maxHp);

  await prisma.player.update({
    where: { id: playerId },
    data: {
      currentHp: 0,
      lastHpRegenAt: now,
      isRecovering: true,
      recoveryCost,
    },
  });
}
