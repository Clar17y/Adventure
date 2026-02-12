import { EXPLORATION_CONSTANTS } from '@adventure/shared';

export type ExplorationOutcomeType =
  | 'ambush'
  | 'encounter_site'
  | 'resource_node'
  | 'hidden_cache'
  | 'zone_exit';

export interface ExplorationOutcome {
  type: ExplorationOutcomeType;
  turnOccurred: number;
}

export interface ExplorationEstimate {
  turns: number;
  ambushChance: number;
  encounterSiteChance: number;
  resourceNodeChance: number;
  hiddenCacheChance: number;
  zoneExitChance: number;
  expectedAmbushes: number;
  expectedEncounterSites: number;
}

/**
 * Calculate cumulative probability for an event occurring
 * over N turns, given per-turn probability p.
 *
 * Formula: 1 - (1 - p)^n
 */
export function cumulativeProbability(perTurnChance: number, turns: number): number {
  if (turns <= 0) return 0;
  if (perTurnChance <= 0) return 0;
  if (perTurnChance >= 1) return 1;

  return 1 - Math.pow(1 - perTurnChance, turns);
}

/**
 * Estimate outcomes for a given number of exploration turns.
 */
export function estimateExploration(turns: number, zoneExitChance: number | null = null): ExplorationEstimate {
  return {
    turns,
    ambushChance: cumulativeProbability(
      EXPLORATION_CONSTANTS.AMBUSH_CHANCE_PER_TURN,
      turns
    ),
    encounterSiteChance: cumulativeProbability(
      EXPLORATION_CONSTANTS.ENCOUNTER_SITE_CHANCE_PER_TURN,
      turns
    ),
    resourceNodeChance: cumulativeProbability(
      EXPLORATION_CONSTANTS.RESOURCE_NODE_CHANCE,
      turns
    ),
    hiddenCacheChance: cumulativeProbability(
      EXPLORATION_CONSTANTS.HIDDEN_CACHE_CHANCE,
      turns
    ),
    zoneExitChance: zoneExitChance != null && zoneExitChance > 0
      ? cumulativeProbability(zoneExitChance, turns)
      : 0,
    expectedAmbushes: turns * EXPLORATION_CONSTANTS.AMBUSH_CHANCE_PER_TURN,
    expectedEncounterSites: turns * EXPLORATION_CONSTANTS.ENCOUNTER_SITE_CHANCE_PER_TURN,
  };
}

/**
 * Simulate exploration and determine what was discovered.
 * Returns list of outcomes in order they occurred.
 */
export function simulateExploration(
  turns: number,
  zoneExitChance: number | null = null
): ExplorationOutcome[] {
  const outcomes: ExplorationOutcome[] = [];
  let canDiscoverZoneExit = zoneExitChance != null && zoneExitChance > 0;

  for (let t = 1; t <= turns; t++) {
    if (Math.random() < EXPLORATION_CONSTANTS.AMBUSH_CHANCE_PER_TURN) {
      outcomes.push({ type: 'ambush', turnOccurred: t });
    }

    if (Math.random() < EXPLORATION_CONSTANTS.ENCOUNTER_SITE_CHANCE_PER_TURN) {
      outcomes.push({ type: 'encounter_site', turnOccurred: t });
    }

    if (Math.random() < EXPLORATION_CONSTANTS.RESOURCE_NODE_CHANCE) {
      outcomes.push({ type: 'resource_node', turnOccurred: t });
    }

    if (Math.random() < EXPLORATION_CONSTANTS.HIDDEN_CACHE_CHANCE) {
      outcomes.push({ type: 'hidden_cache', turnOccurred: t });
    }

    if (canDiscoverZoneExit && Math.random() < zoneExitChance!) {
      outcomes.push({ type: 'zone_exit', turnOccurred: t });
      canDiscoverZoneExit = false;
    }
  }

  return outcomes.sort((a, b) => a.turnOccurred - b.turnOccurred);
}

export interface TravelAmbushOutcome {
  turnOccurred: number;
}

export function simulateTravelAmbushes(turns: number): TravelAmbushOutcome[] {
  const outcomes: TravelAmbushOutcome[] = [];
  for (let t = 1; t <= turns; t++) {
    if (Math.random() < EXPLORATION_CONSTANTS.TRAVEL_AMBUSH_CHANCE_PER_TURN) {
      outcomes.push({ turnOccurred: t });
    }
  }
  return outcomes;
}

/**
 * Validate exploration turn amount.
 */
export function validateExplorationTurns(turns: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(turns)) {
    return { valid: false, error: 'Turn amount must be an integer' };
  }
  if (turns < EXPLORATION_CONSTANTS.MIN_EXPLORATION_TURNS) {
    return {
      valid: false,
      error: `Minimum exploration is ${EXPLORATION_CONSTANTS.MIN_EXPLORATION_TURNS} turns`,
    };
  }
  if (turns > EXPLORATION_CONSTANTS.MAX_EXPLORATION_TURNS) {
    return {
      valid: false,
      error: `Maximum exploration is ${EXPLORATION_CONSTANTS.MAX_EXPLORATION_TURNS} turns`,
    };
  }
  return { valid: true };
}
