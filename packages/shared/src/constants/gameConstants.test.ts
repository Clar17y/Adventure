import { describe, expect, it } from 'vitest';
import {
  TURN_CONSTANTS,
  COMBAT_CONSTANTS,
  SKILL_CONSTANTS,
  EXPLORATION_CONSTANTS,
  HP_CONSTANTS,
  FLEE_CONSTANTS,
  DURABILITY_CONSTANTS,
  GATHERING_CONSTANTS,
  CRAFTING_CONSTANTS,
  ITEM_RARITY_CONSTANTS,
  ZONE_CONSTANTS,
  POTION_CONSTANTS,
  CHEST_CONSTANTS,
  CHARACTER_CONSTANTS,
} from './gameConstants';

describe('TURN_CONSTANTS', () => {
  it('has expected critical values', () => {
    expect(TURN_CONSTANTS.REGEN_RATE).toBe(1);
    expect(TURN_CONSTANTS.BANK_CAP).toBe(64_800);
    expect(TURN_CONSTANTS.STARTING_TURNS).toBe(86_400);
  });

  it('bank cap is 18 hours at regen rate', () => {
    expect(TURN_CONSTANTS.BANK_CAP / TURN_CONSTANTS.REGEN_RATE).toBe(64_800);
  });
});

describe('COMBAT_CONSTANTS', () => {
  it('has valid hit chance range', () => {
    expect(COMBAT_CONSTANTS.BASE_HIT_CHANCE).toBeGreaterThan(0);
    expect(COMBAT_CONSTANTS.BASE_HIT_CHANCE).toBeLessThanOrEqual(1);
  });

  it('crit multiplier is greater than 1', () => {
    expect(COMBAT_CONSTANTS.CRIT_MULTIPLIER).toBeGreaterThan(1);
  });

  it('min damage is positive', () => {
    expect(COMBAT_CONSTANTS.MIN_DAMAGE).toBeGreaterThan(0);
  });
});

describe('SKILL_CONSTANTS', () => {
  it('XP curve produces increasing values', () => {
    const xpAtLevel5 = SKILL_CONSTANTS.XP_BASE * Math.pow(5, SKILL_CONSTANTS.XP_EXPONENT);
    const xpAtLevel10 = SKILL_CONSTANTS.XP_BASE * Math.pow(10, SKILL_CONSTANTS.XP_EXPONENT);
    expect(xpAtLevel10).toBeGreaterThan(xpAtLevel5);
  });

  it('max level is reasonable', () => {
    expect(SKILL_CONSTANTS.MAX_LEVEL).toBe(100);
  });

  it('daily caps are positive', () => {
    expect(SKILL_CONSTANTS.DAILY_CAP_COMBAT).toBeGreaterThan(0);
    expect(SKILL_CONSTANTS.DAILY_CAP_GATHERING).toBeGreaterThan(0);
    expect(SKILL_CONSTANTS.DAILY_CAP_PROCESSING).toBeGreaterThan(0);
    expect(SKILL_CONSTANTS.DAILY_CAP_CRAFTING).toBeGreaterThan(0);
  });
});

describe('EXPLORATION_CONSTANTS', () => {
  it('per-turn chances are in (0, 1)', () => {
    expect(EXPLORATION_CONSTANTS.AMBUSH_CHANCE_PER_TURN).toBeGreaterThan(0);
    expect(EXPLORATION_CONSTANTS.AMBUSH_CHANCE_PER_TURN).toBeLessThan(1);
    expect(EXPLORATION_CONSTANTS.ENCOUNTER_SITE_CHANCE_PER_TURN).toBeGreaterThan(0);
    expect(EXPLORATION_CONSTANTS.ENCOUNTER_SITE_CHANCE_PER_TURN).toBeLessThan(1);
  });

  it('min < max exploration turns', () => {
    expect(EXPLORATION_CONSTANTS.MIN_EXPLORATION_TURNS)
      .toBeLessThan(EXPLORATION_CONSTANTS.MAX_EXPLORATION_TURNS);
  });
});

describe('HP_CONSTANTS', () => {
  it('has expected base HP', () => {
    expect(HP_CONSTANTS.BASE_HP).toBe(100);
  });

  it('recovery exit HP is less than 100%', () => {
    expect(HP_CONSTANTS.RECOVERY_EXIT_HP_PERCENT).toBeGreaterThan(0);
    expect(HP_CONSTANTS.RECOVERY_EXIT_HP_PERCENT).toBeLessThan(1);
  });
});

describe('FLEE_CONSTANTS', () => {
  it('min flee < base flee < max flee', () => {
    expect(FLEE_CONSTANTS.MIN_FLEE_CHANCE).toBeLessThan(FLEE_CONSTANTS.BASE_FLEE_CHANCE);
    expect(FLEE_CONSTANTS.BASE_FLEE_CHANCE).toBeLessThan(FLEE_CONSTANTS.MAX_FLEE_CHANCE);
  });

  it('gold loss increases with severity', () => {
    expect(FLEE_CONSTANTS.GOLD_LOSS_MINOR).toBeLessThan(FLEE_CONSTANTS.GOLD_LOSS_MODERATE);
    expect(FLEE_CONSTANTS.GOLD_LOSS_MODERATE).toBeLessThan(FLEE_CONSTANTS.GOLD_LOSS_SEVERE);
  });
});

describe('ITEM_RARITY_CONSTANTS', () => {
  it('has 5 rarity tiers in order', () => {
    expect(ITEM_RARITY_CONSTANTS.ORDER).toEqual([
      'common', 'uncommon', 'rare', 'epic', 'legendary',
    ]);
  });

  it('drop weights are positive', () => {
    const weights = ITEM_RARITY_CONSTANTS.DROP_WEIGHT_BY_RARITY;
    for (const rarity of ITEM_RARITY_CONSTANTS.ORDER) {
      expect(weights[rarity as keyof typeof weights]).toBeGreaterThan(0);
    }
  });

  it('drop weights sum to > 0', () => {
    const weights = ITEM_RARITY_CONSTANTS.DROP_WEIGHT_BY_RARITY;
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0);
  });

  it('bonus slots increase with rarity', () => {
    const slots = ITEM_RARITY_CONSTANTS.BONUS_SLOTS_BY_RARITY;
    expect(slots.common).toBeLessThan(slots.uncommon);
    expect(slots.uncommon).toBeLessThan(slots.rare);
    expect(slots.rare).toBeLessThan(slots.epic);
    expect(slots.epic).toBeLessThan(slots.legendary);
  });
});

describe('DURABILITY_CONSTANTS', () => {
  it('warning threshold is between 0 and 1', () => {
    expect(DURABILITY_CONSTANTS.WARNING_THRESHOLD).toBeGreaterThan(0);
    expect(DURABILITY_CONSTANTS.WARNING_THRESHOLD).toBeLessThan(1);
  });
});

describe('CRAFTING_CONSTANTS', () => {
  it('crit chance bounds are valid', () => {
    expect(CRAFTING_CONSTANTS.MIN_CRIT_CHANCE).toBeLessThan(CRAFTING_CONSTANTS.MAX_CRIT_CHANCE);
    expect(CRAFTING_CONSTANTS.MIN_CRIT_CHANCE).toBeGreaterThan(0);
    expect(CRAFTING_CONSTANTS.MAX_CRIT_CHANCE).toBeLessThanOrEqual(1);
  });
});

describe('POTION_CONSTANTS', () => {
  it('heal amounts increase with tier', () => {
    expect(POTION_CONSTANTS.MINOR_HEALTH_HEAL)
      .toBeLessThan(POTION_CONSTANTS.HEALTH_HEAL);
    expect(POTION_CONSTANTS.HEALTH_HEAL)
      .toBeLessThan(POTION_CONSTANTS.GREATER_HEALTH_HEAL);
  });

  it('recovery percents increase with tier', () => {
    expect(POTION_CONSTANTS.MINOR_RECOVERY_PERCENT)
      .toBeLessThan(POTION_CONSTANTS.RECOVERY_PERCENT);
    expect(POTION_CONSTANTS.RECOVERY_PERCENT)
      .toBeLessThan(POTION_CONSTANTS.GREATER_RECOVERY_PERCENT);
  });
});

describe('CHEST_CONSTANTS', () => {
  it('recipe chance increases with size', () => {
    expect(CHEST_CONSTANTS.CHEST_RECIPE_CHANCE_SMALL)
      .toBeLessThanOrEqual(CHEST_CONSTANTS.CHEST_RECIPE_CHANCE_MEDIUM);
    expect(CHEST_CONSTANTS.CHEST_RECIPE_CHANCE_MEDIUM)
      .toBeLessThan(CHEST_CONSTANTS.CHEST_RECIPE_CHANCE_LARGE);
  });
});

describe('ZONE_CONSTANTS', () => {
  it('has positive travel cost', () => {
    expect(ZONE_CONSTANTS.BASE_TRAVEL_COST).toBeGreaterThan(0);
  });

  it('difficult terrain multiplier > 1', () => {
    expect(ZONE_CONSTANTS.DIFFICULT_TERRAIN_MULTIPLIER).toBeGreaterThan(1);
  });
});

describe('CHARACTER_CONSTANTS', () => {
  it('XP ratio is between 0 and 1', () => {
    expect(CHARACTER_CONSTANTS.XP_RATIO).toBeGreaterThan(0);
    expect(CHARACTER_CONSTANTS.XP_RATIO).toBeLessThanOrEqual(1);
  });
});
