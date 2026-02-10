import { EXPLORATION_CONSTANTS } from '@adventure/shared';

export function calculateExplorationMobXpMultiplier(params?: {
  /**
   * Optional: if provided alongside `mobEncountersInBatch`, scale using the
   * actual turns-per-mob observed in a batch.
   */
  explorationTurns?: number;
  mobEncountersInBatch?: number;
}): number {
  const normalizerTurns = EXPLORATION_CONSTANTS.MOB_XP_NORMALIZER_TURNS;
  const maxMultiplier = EXPLORATION_CONSTANTS.MOB_XP_MULTIPLIER_MAX;
  if (!Number.isFinite(normalizerTurns) || normalizerTurns <= 0) return 1;

  let turnsPerMob: number;

  if (params) {
    const explorationTurns = params.explorationTurns;
    const mobEncountersInBatch = params.mobEncountersInBatch;

    if (typeof explorationTurns !== 'number' || !Number.isFinite(explorationTurns) || explorationTurns <= 0) return 1;
    if (typeof mobEncountersInBatch !== 'number' || !Number.isFinite(mobEncountersInBatch) || mobEncountersInBatch <= 0) return 1;

    turnsPerMob = explorationTurns / mobEncountersInBatch;
  } else {
    turnsPerMob = 1 / EXPLORATION_CONSTANTS.MOB_ENCOUNTER_CHANCE;
  }

  const raw = turnsPerMob / normalizerTurns;
  if (!Number.isFinite(raw) || raw <= 0) return 1;

  const clamped = Math.min(raw, maxMultiplier);
  return Math.max(1, clamped);
}
