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

export function getEligibleBonusStats(
  itemType: ItemType,
  baseStats?: ItemStats | null | undefined
): CraftingCritStat[] {
  const utility: CraftingCritStat[] = ['dodge', 'accuracy', 'luck'];

  if (itemType === 'weapon') {
    const offensive: CraftingCritStat[] = ['attack', 'magicPower', 'rangedPower'];
    const primary = offensive.filter((stat) => {
      const value = baseStats?.[stat];
      return typeof value === 'number' && Number.isFinite(value) && value > 0;
    });
    return [...(primary.length > 0 ? primary : offensive), ...utility];
  }
  if (itemType === 'armor') {
    const defensive: CraftingCritStat[] = ['armor', 'health'];
    const primary = defensive.filter((stat) => {
      const value = baseStats?.[stat];
      return typeof value === 'number' && Number.isFinite(value) && value > 0;
    });
    return [...(primary.length > 0 ? primary : defensive), ...utility];
  }
  return [];
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

  const statIndex = Math.floor(randomUnit(rolls?.statRoll) * eligibleStats.length);
  const stat = eligibleStats[statIndex]!;

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
  const eligibleStats = getEligibleBonusStats(input.itemType, input.baseStats);

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
