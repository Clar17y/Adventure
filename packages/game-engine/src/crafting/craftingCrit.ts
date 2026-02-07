import { CRAFTING_CONSTANTS, type ItemStats, type ItemType } from '@adventure/shared';

export type CraftingCritStat = keyof ItemStats;

export interface CalculateCraftingCritInput {
  skillLevel: number;
  requiredLevel: number;
  luckStat: number;
  itemType: ItemType;
  baseStats: ItemStats | null | undefined;
}

export interface CraftingCritRolls {
  critRoll?: number;
  statRoll?: number;
  bonusPercentRoll?: number;
}

export interface CraftingCritResult {
  isCrit: boolean;
  critChance: number;
  bonusStat: CraftingCritStat | null;
  bonusValue: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomUnit(roll?: number): number {
  if (typeof roll === 'number' && Number.isFinite(roll)) {
    return clamp(roll, 0, 0.999999999);
  }
  return Math.random();
}

export function calculateCritChance(
  skillLevel: number,
  requiredLevel: number,
  luckStat: number
): number {
  const levelDelta = skillLevel - requiredLevel;
  const luckBonus = luckStat * CRAFTING_CONSTANTS.LUCK_CRIT_BONUS_PER_POINT;
  const rawChance = CRAFTING_CONSTANTS.BASE_CRIT_CHANCE +
    levelDelta * CRAFTING_CONSTANTS.CRIT_CHANCE_PER_LEVEL +
    luckBonus;

  return clamp(
    rawChance,
    CRAFTING_CONSTANTS.MIN_CRIT_CHANCE,
    CRAFTING_CONSTANTS.MAX_CRIT_CHANCE
  );
}

export function getEligibleBonusStats(itemType: ItemType): CraftingCritStat[] {
  if (itemType === 'weapon') {
    return ['attack', 'magicPower', 'rangedPower', 'evasion', 'luck'];
  }
  if (itemType === 'armor') {
    return ['armor', 'health', 'evasion', 'luck'];
  }
  return [];
}

function selectStatWithBaseWeight(
  eligibleStats: CraftingCritStat[],
  baseStats: ItemStats | null | undefined
): CraftingCritStat[] {
  if (!baseStats || eligibleStats.length === 0) return eligibleStats;

  const withBase = eligibleStats.filter((stat) => {
    const value = baseStats[stat];
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  });

  return withBase.length > 0 ? withBase : eligibleStats;
}

function rollBonusPercent(roll?: number): number {
  const unit = randomUnit(roll);
  const span = CRAFTING_CONSTANTS.MAX_BONUS_PERCENT - CRAFTING_CONSTANTS.MIN_BONUS_PERCENT;
  return CRAFTING_CONSTANTS.MIN_BONUS_PERCENT + unit * span;
}

export function rollBonusStat(
  eligibleStats: CraftingCritStat[],
  baseStats: ItemStats | null | undefined,
  rolls?: Pick<CraftingCritRolls, 'statRoll' | 'bonusPercentRoll'>
): { stat: CraftingCritStat; value: number } | null {
  if (eligibleStats.length === 0) return null;

  const statPool = selectStatWithBaseWeight(eligibleStats, baseStats);
  const statIndex = Math.floor(randomUnit(rolls?.statRoll) * statPool.length);
  const stat = statPool[statIndex]!;

  const baseValueRaw = baseStats?.[stat];
  const baseValue = typeof baseValueRaw === 'number' && Number.isFinite(baseValueRaw)
    ? Math.max(0, baseValueRaw)
    : 0;
  const bonusPercent = rollBonusPercent(rolls?.bonusPercentRoll);
  const scaled = Math.round(baseValue * bonusPercent);
  const value = Math.max(CRAFTING_CONSTANTS.MIN_BONUS_MAGNITUDE, scaled);

  return { stat, value };
}

export function calculateCraftingCrit(
  input: CalculateCraftingCritInput,
  rolls?: CraftingCritRolls
): CraftingCritResult {
  const critChance = calculateCritChance(input.skillLevel, input.requiredLevel, input.luckStat);
  const eligibleStats = getEligibleBonusStats(input.itemType);

  if (eligibleStats.length === 0) {
    return {
      isCrit: false,
      critChance,
      bonusStat: null,
      bonusValue: null,
    };
  }

  const critRoll = randomUnit(rolls?.critRoll);
  if (critRoll >= critChance) {
    return {
      isCrit: false,
      critChance,
      bonusStat: null,
      bonusValue: null,
    };
  }

  const rolledBonus = rollBonusStat(eligibleStats, input.baseStats, {
    statRoll: rolls?.statRoll,
    bonusPercentRoll: rolls?.bonusPercentRoll,
  });

  if (!rolledBonus) {
    return {
      isCrit: false,
      critChance,
      bonusStat: null,
      bonusValue: null,
    };
  }

  return {
    isCrit: true,
    critChance,
    bonusStat: rolledBonus.stat,
    bonusValue: rolledBonus.value,
  };
}
