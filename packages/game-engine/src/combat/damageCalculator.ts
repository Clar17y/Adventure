import { COMBAT_CONSTANTS, CombatantStats } from '@adventure/shared';

/**
 * Roll a d20 (1-20).
 */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Roll damage within a min-max range.
 */
export function rollDamage(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check if an attack hits.
 */
export function doesAttackHit(
  attackRoll: number,
  attackBonus: number,
  accuracyBonus: number,
  targetDodge: number,
  targetEvasion: number
): boolean {
  // Natural 20 always hits
  if (attackRoll === 20) return true;
  // Natural 1 always misses
  if (attackRoll === 1) return false;

  const totalAttack = attackRoll + attackBonus + accuracyBonus;
  const hitThreshold = 10 + targetDodge + Math.floor(Math.max(0, targetEvasion) / 2);
  return totalAttack >= hitThreshold;
}

/**
 * Check if attack is a critical hit.
 */
export function isCriticalHit(bonusCritChance = 0): boolean {
  return Math.random() < (COMBAT_CONSTANTS.CRIT_CHANCE + bonusCritChance);
}

/**
 * Calculate final damage after armor reduction.
 * Returns { damage, actualMultiplier } so callers can log the actual crit multiplier used.
 */
export function calculateFinalDamage(
  rawDamage: number,
  armor: number,
  isCrit: boolean,
  bonusCritDamage = 0
): { damage: number; actualMultiplier: number } {
  let damage = rawDamage;
  const actualMultiplier = isCrit ? COMBAT_CONSTANTS.CRIT_MULTIPLIER + bonusCritDamage : 1;

  if (isCrit) {
    damage = Math.floor(damage * actualMultiplier);
  }

  // Apply armor reduction (diminishing returns)
  const reduction = armor / (armor + 100);
  damage = Math.floor(damage * (1 - reduction));

  return {
    damage: Math.max(COMBAT_CONSTANTS.MIN_DAMAGE, damage),
    actualMultiplier,
  };
}

/**
 * Calculate initiative for turn order.
 */
export function rollInitiative(speed: number): number {
  return rollD20() + speed;
}

/**
 * Build combatant stats from player equipment and skills.
 */
export function buildPlayerCombatStats(
  currentHp: number,
  maxHp: number,
  skillLevels: { attack: number; defence: number; vitality: number; evasion: number },
  equipmentStats: { attack: number; accuracy: number; armor: number; health: number; dodge: number; critChance?: number; critDamage?: number }
): CombatantStats {
  return {
    hp: Math.min(currentHp, maxHp),
    maxHp,
    attack: skillLevels.attack + equipmentStats.attack,
    accuracy: Math.floor(skillLevels.attack / 2) + equipmentStats.accuracy,
    defence: skillLevels.defence + equipmentStats.armor,
    dodge: equipmentStats.dodge,
    evasion: skillLevels.evasion,
    damageMin: 1 + Math.floor(skillLevels.attack / 5),
    damageMax: 5 + Math.floor(skillLevels.attack / 2),
    speed: Math.floor(skillLevels.evasion / 10),
    critChance: equipmentStats.critChance ?? 0,
    critDamage: equipmentStats.critDamage ?? 0,
  };
}
