/**
 * Central game constants - all tunable values in one place.
 * Change these to adjust game balance without touching logic.
 */

// =============================================================================
// TURN ECONOMY
// =============================================================================

export const TURN_CONSTANTS = {
  /** Turns regenerated per second */
  REGEN_RATE: 1,

  /** Maximum turns that can be banked (18 hours) */
  BANK_CAP: 64_800,

  /** Starting turns for new players (24 hours) */
  STARTING_TURNS: 86_400,
} as const;

// =============================================================================
// COMBAT
// =============================================================================

export const COMBAT_CONSTANTS = {
  /** Base chance to hit (before modifiers) */
  BASE_HIT_CHANCE: 0.7,

  /** Critical hit chance */
  CRIT_CHANCE: 0.05,

  /** Critical hit damage multiplier */
  CRIT_MULTIPLIER: 1.5,

  /** Minimum damage that can be dealt (after armor) */
  MIN_DAMAGE: 1,

  /** Turn cost for a single encounter */
  ENCOUNTER_TURN_COST: 50,
} as const;

// =============================================================================
// SKILLS & XP
// =============================================================================

export const SKILL_CONSTANTS = {
  /** Base XP needed for level 2 */
  XP_BASE: 100,

  /** Exponent for XP curve: xp_for_level = base * (level ^ exponent) */
  XP_EXPONENT: 1.5,

  /** Maximum level */
  MAX_LEVEL: 100,

  /** XP window duration in hours (efficiency resets each window) */
  XP_WINDOW_HOURS: 3,

  /** Daily XP cap for combat skills (divided by 8 windows = per-window cap) */
  DAILY_CAP_COMBAT: 20_000,

  /** Daily XP cap for gathering skills (divided by 8 windows = per-window cap) */
  DAILY_CAP_GATHERING: 30_000,

  /** Daily XP cap for crafting skills (divided by 8 windows = per-window cap) */
  DAILY_CAP_CRAFTING: 30_000,

  /** Power for diminishing returns curve: efficiency = max(0, 1 - (xp/cap)^power) */
  EFFICIENCY_DECAY_POWER: 2,
} as const;

// =============================================================================
// EXPLORATION
// =============================================================================

export const EXPLORATION_CONSTANTS = {
  /** Per-turn chance to encounter a mob */
  MOB_ENCOUNTER_CHANCE: 0.001,

  /** Per-turn chance to discover a resource node */
  RESOURCE_NODE_CHANCE: 0.0005,

  /** Per-turn chance to find a hidden cache */
  HIDDEN_CACHE_CHANCE: 0.0001,

  /** Per-turn chance to discover zone exit (first time only) */
  ZONE_EXIT_CHANCE: 0.002,

  /** Minimum turns to spend on exploration */
  MIN_EXPLORATION_TURNS: 10,

  /** Maximum turns in single exploration batch */
  MAX_EXPLORATION_TURNS: 10_000,
} as const;

// =============================================================================
// DURABILITY
// =============================================================================

export const DURABILITY_CONSTANTS = {
  /** Durability lost per combat (per equipped item) */
  COMBAT_DEGRADATION: 1,

  /** Turn cost to repair an item */
  REPAIR_TURN_COST: 100,

  /** Max durability lost per repair */
  REPAIR_MAX_DECAY: 5,

  /** Minimum max durability before item is destroyed */
  MIN_MAX_DURABILITY: 10,
} as const;

// =============================================================================
// GATHERING
// =============================================================================

export const GATHERING_CONSTANTS = {
  /** Base turns per gathering action */
  BASE_TURN_COST: 30,

  /** Base resource yield per action */
  BASE_YIELD: 1,

  /** Yield multiplier bonus per level above requirement (0.1 = +10% per level) */
  YIELD_MULTIPLIER_PER_LEVEL: 0.1,
} as const;

// =============================================================================
// CRAFTING
// =============================================================================

export const CRAFTING_CONSTANTS = {
  /** Base turns per crafting action */
  BASE_TURN_COST: 50,

  /** Durability bonus per 10 levels above requirement (%) */
  DURABILITY_BONUS_PER_10_LEVELS: 5,
} as const;

// =============================================================================
// ZONES
// =============================================================================

export const ZONE_CONSTANTS = {
  /** Base travel cost in turns */
  BASE_TRAVEL_COST: 100,

  /** Multiplier for difficult terrain */
  DIFFICULT_TERRAIN_MULTIPLIER: 2,
} as const;
