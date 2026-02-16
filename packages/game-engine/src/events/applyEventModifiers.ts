import type { ActiveZoneModifiers, MobTemplate } from '@adventure/shared';

/**
 * Apply active zone mob modifiers to a mob template (damage/hp multipliers).
 * Returns a modified copy — does not mutate the original.
 */
export function applyMobEventModifiers(
  mob: MobTemplate,
  modifiers: ActiveZoneModifiers,
): MobTemplate {
  if (
    modifiers.mobDamageMultiplier === 1 &&
    modifiers.mobHpMultiplier === 1
  ) {
    return mob;
  }

  const hpMult = Math.max(0.1, modifiers.mobHpMultiplier);
  const dmgMult = Math.max(0.1, modifiers.mobDamageMultiplier);

  return {
    ...mob,
    hp: Math.max(1, Math.round(mob.hp * hpMult)),
    damageMin: Math.max(1, Math.round(mob.damageMin * dmgMult)),
    damageMax: Math.max(1, Math.round(mob.damageMax * dmgMult)),
  };
}

/**
 * Apply active zone resource modifiers to a base yield.
 * Returns the modified yield.
 */
export function applyResourceEventModifiers(
  baseYield: number,
  modifiers: ActiveZoneModifiers,
): number {
  return Math.max(1, Math.round(baseYield * modifiers.resourceYieldMultiplier));
}
