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
  targetDefence: number
): boolean {
  // Natural 20 always hits
  if (attackRoll === 20) return true;
  // Natural 1 always misses
  if (attackRoll === 1) return false;

  const totalAttack = attackRoll + attackBonus;
  const hitThreshold = 10 + targetDefence;
  return totalAttack >= hitThreshold;
}

/**
 * Check if target evades the attack.
 */
export function doesTargetEvade(evasionChance: number): boolean {
  const roll = Math.random() * 100;
  return roll < evasionChance;
}

/**
 * Check if attack is a critical hit.
 */
export function isCriticalHit(): boolean {
  return Math.random() < COMBAT_CONSTANTS.CRIT_CHANCE;
}

/**
 * Calculate final damage after armor reduction.
 */
export function calculateFinalDamage(
  rawDamage: number,
  armor: number,
  isCrit: boolean
): number {
  let damage = rawDamage;

  // Apply crit multiplier
  if (isCrit) {
    damage = Math.floor(damage * COMBAT_CONSTANTS.CRIT_MULTIPLIER);
  }

  // Apply armor reduction (diminishing returns)
  const reduction = armor / (armor + 100);
  damage = Math.floor(damage * (1 - reduction));

  // Minimum damage
  return Math.max(COMBAT_CONSTANTS.MIN_DAMAGE, damage);
}

/**
 * Calculate initiative for turn order.
 */
export function rollInitiative(speed: number): number {
  return rollD20() + speed;
}

/**
 * Build combatant stats from player equipment and skills.
 * This is a placeholder - actual implementation will aggregate from equipment.
 */
export function buildPlayerCombatStats(
  baseHp: number,
  skillLevels: { attack: number; defence: number; vitality: number; evasion: number },
  equipmentStats: { attack: number; armor: number; health: number; evasion: number }
): CombatantStats {
  return {
    hp: baseHp + equipmentStats.health + skillLevels.vitality * 5,
    maxHp: baseHp + equipmentStats.health + skillLevels.vitality * 5,
    attack: skillLevels.attack + equipmentStats.attack,
    defence: skillLevels.defence + equipmentStats.armor,
    evasion: skillLevels.evasion + equipmentStats.evasion,
    damageMin: 1 + Math.floor(skillLevels.attack / 5),
    damageMax: 5 + Math.floor(skillLevels.attack / 2),
    speed: Math.floor(skillLevels.evasion / 10),
  };
}
