import {
  ActiveEffect,
  CombatState,
  CombatLogEntry,
  CombatOptions,
  CombatPotion,
  CombatResult,
  CombatantStats,
  MobTemplate,
  POTION_CONSTANTS,
  PotionConsumed,
  SpellAction,
} from '@adventure/shared';
import {
  rollD20,
  rollDamage,
  doesAttackHit,
  isCriticalHit,
  calculateFinalDamage,
  calculateDefenceReduction,
  rollInitiative,
} from './damageCalculator';

const MAX_ROUNDS = 100;

function hpSnapshot(state: CombatState): Pick<CombatLogEntry, 'playerHpAfter' | 'mobHpAfter'> {
  return {
    playerHpAfter: Math.max(0, state.playerHp),
    mobHpAfter: Math.max(0, state.mobHp),
  };
}

function tickEffects(state: CombatState): void {
  const expired: ActiveEffect[] = [];
  const remaining: ActiveEffect[] = [];

  for (const effect of state.activeEffects) {
    effect.remainingRounds--;
    if (effect.remainingRounds <= 0) {
      expired.push(effect);
    } else {
      remaining.push(effect);
    }
  }

  state.activeEffects = remaining;

  // Group expired effects by spell name for cleaner log
  const expiredNames = new Map<string, { target: 'player' | 'mob' }>();
  for (const e of expired) {
    if (!expiredNames.has(e.name)) {
      expiredNames.set(e.name, { target: e.target });
    }
  }

  if (expiredNames.size > 0) {
    // Derive actor: if all expired effects targeted the player, the actor is player
    const targets = Array.from(expiredNames.values()).map(e => e.target);
    const actor = targets.every(t => t === 'player') ? 'player' : 'mob';

    state.log.push({
      round: state.round,
      actor,
      action: 'spell',
      message: Array.from(expiredNames.keys()).map(n => `${n} wore off.`).join(' '),
      effectsExpired: Array.from(expiredNames.entries()).map(([name, { target }]) => ({ name, target })),
      ...hpSnapshot(state),
    });
  }
}

function getEffectiveStats(baseStats: CombatantStats, activeEffects: ActiveEffect[], target: 'player' | 'mob'): CombatantStats {
  const effective = { ...baseStats };

  for (const effect of activeEffects) {
    if (effect.target !== target) continue;

    switch (effect.stat) {
      case 'attack':
        // attack modifies the damage range (damageMin/damageMax)
        // since those are derived from the attack stat at build time
        effective.damageMin += effect.modifier;
        effective.damageMax += effect.modifier;
        break;
      case 'accuracy': effective.accuracy += effect.modifier; break;
      case 'defence': effective.defence += effect.modifier; break;
      case 'magicDefence': effective.magicDefence += effect.modifier; break;
      case 'dodge': effective.dodge += effect.modifier; break;
      case 'evasion': effective.evasion += effect.modifier; break;
      case 'speed': effective.speed += effect.modifier; break;
      case 'critChance': effective.critChance = (effective.critChance ?? 0) + effect.modifier; break;
      case 'damageMin': effective.damageMin += effect.modifier; break;
      case 'damageMax': effective.damageMax += effect.modifier; break;
    }
  }

  effective.defence = Math.max(0, effective.defence);
  effective.magicDefence = Math.max(0, effective.magicDefence);
  effective.dodge = Math.max(0, effective.dodge);
  effective.evasion = Math.max(0, effective.evasion);
  effective.damageMin = Math.max(1, effective.damageMin);
  effective.damageMax = Math.max(effective.damageMin, effective.damageMax);

  return effective;
}

function tryAutoPotion(
  state: CombatState,
  availablePotions: CombatPotion[],
  potionsConsumed: PotionConsumed[],
  threshold: number,
): boolean {
  if (threshold <= 0 || availablePotions.length === 0) return false;

  const hpPercent = (state.playerHp / state.playerMaxHp) * 100;
  if (hpPercent >= threshold) return false;

  // Check for Potion Sickness active effect
  const hasSickness = state.activeEffects.some(
    e => e.target === 'player' && e.stat === 'potionSickness'
  );
  if (hasSickness) return false;

  // Smart selection: pick weakest potion whose healAmount >= deficit
  const deficit = Math.floor(state.playerMaxHp * (threshold / 100)) - state.playerHp;
  let chosenIndex = -1;

  // Ensure ascending sort for weakest-sufficient selection
  availablePotions.sort((a, b) => a.healAmount - b.healAmount);

  for (let i = 0; i < availablePotions.length; i++) {
    if (availablePotions[i].healAmount >= deficit) {
      chosenIndex = i;
      break;
    }
  }

  // If none fully covers the deficit, pick the strongest available (last one)
  if (chosenIndex === -1) {
    chosenIndex = availablePotions.length - 1;
  }

  const potion = availablePotions[chosenIndex];
  const hpBefore = state.playerHp;
  state.playerHp = Math.min(state.playerMaxHp, state.playerHp + potion.healAmount);
  const actualHeal = state.playerHp - hpBefore;

  // Remove used potion from pool
  availablePotions.splice(chosenIndex, 1);

  // Record consumption
  potionsConsumed.push({
    templateId: potion.templateId,
    name: potion.name,
    healAmount: actualHeal,
    round: state.round,
  });

  // Apply Potion Sickness cooldown
  const sicknessEffect: ActiveEffect = {
    name: 'Potion Sickness',
    target: 'player',
    stat: 'potionSickness',
    modifier: 0,
    remainingRounds: POTION_CONSTANTS.AUTO_POTION_SICKNESS_DURATION,
  };
  state.activeEffects.push(sicknessEffect);

  // Log the potion use
  state.log.push({
    round: state.round,
    actor: 'player',
    action: 'potion',
    spellName: potion.name,
    healAmount: actualHeal,
    message: `You drink a ${potion.name}! +${actualHeal} HP`,
    effectsApplied: [{
      stat: 'potionSickness',
      modifier: 0,
      duration: POTION_CONSTANTS.AUTO_POTION_SICKNESS_DURATION,
      target: 'player',
    }],
    ...hpSnapshot(state),
  });

  return true;
}

/**
 * Run a complete combat encounter.
 * Pure function - no side effects, fully deterministic given same random seed.
 */
export function runCombat(
  playerStats: CombatantStats,
  mob: MobTemplate & { currentHp?: number; maxHp?: number },
  options?: CombatOptions,
): CombatResult {
  const mobMaxHp = typeof mob.maxHp === 'number' ? mob.maxHp : mob.hp;
  const mobCurrentHp = typeof mob.currentHp === 'number' ? mob.currentHp : mob.hp;

  const mobStats: CombatantStats = {
    hp: mobCurrentHp,
    maxHp: mobMaxHp,
    attack: mob.accuracy,
    accuracy: mob.accuracy,
    defence: mob.defence,
    magicDefence: mob.magicDefence,
    dodge: mob.evasion,
    evasion: 0,
    damageMin: mob.damageMin,
    damageMax: mob.damageMax,
    speed: 0,
    damageType: mob.damageType,
  };

  const availablePotions = options?.potions ? [...options.potions] : [];
  const threshold = options?.autoPotionThreshold ?? 0;
  const potionsConsumed: PotionConsumed[] = [];

  const state: CombatState = {
    playerHp: playerStats.hp,
    playerMaxHp: playerStats.maxHp,
    mobHp: mobStats.hp,
    mobMaxHp: mobStats.maxHp,
    round: 0,
    log: [],
    outcome: null,
    activeEffects: [],
  };

  const playerInit = rollInitiative(playerStats.speed);
  const mobInit = rollInitiative(mobStats.speed);
  const playerGoesFirst = playerInit >= mobInit;

  state.log.push({
    round: 0,
    actor: playerGoesFirst ? 'player' : 'mob',
    action: 'attack',
    roll: playerInit,
    message: `Combat begins! Initiative: Player ${playerInit}, ${mob.name} ${mobInit}`,
    ...hpSnapshot(state),
  });

  while (state.round < MAX_ROUNDS && state.outcome === null) {
    state.round++;

    const effectivePlayerStats = getEffectiveStats(playerStats, state.activeEffects, 'player');
    const effectiveMobStats = getEffectiveStats(mobStats, state.activeEffects, 'mob');

    if (playerGoesFirst) {
      const usedPotion = tryAutoPotion(state, availablePotions, potionsConsumed, threshold);
      if (!usedPotion) {
        executePlayerAttack(state, effectivePlayerStats, effectiveMobStats, mob.name);
      }
      if (state.outcome) break;
      executeMobAttack(state, effectiveMobStats, effectivePlayerStats, mob);
    } else {
      executeMobAttack(state, effectiveMobStats, effectivePlayerStats, mob);
      if (state.outcome) break;
      const usedPotion = tryAutoPotion(state, availablePotions, potionsConsumed, threshold);
      if (!usedPotion) {
        executePlayerAttack(state, effectivePlayerStats, effectiveMobStats, mob.name);
      }
    }

    // Tick effects after round resolves so duration N means N full rounds of benefit
    tickEffects(state);
  }

  if (state.outcome === null) {
    state.outcome = 'defeat';
    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'attack',
      message: 'Combat timed out. You retreat in exhaustion.',
      ...hpSnapshot(state),
    });
  }

  return {
    outcome: state.outcome,
    log: state.log,
    playerMaxHp: state.playerMaxHp,
    mobMaxHp: state.mobMaxHp,
    xpGained: state.outcome === 'victory' ? mob.xpReward : 0,
    loot: [],
    durabilityLost: [],
    turnsSpent: 0,
    playerHpRemaining: Math.max(0, state.playerHp),
    potionsConsumed,
  };
}

function executePlayerAttack(
  state: CombatState,
  playerStats: CombatantStats,
  mobStats: CombatantStats,
  mobName: string
): void {
  const attackRoll = rollD20();
  const hits = doesAttackHit(
    attackRoll,
    playerStats.accuracy,
    mobStats.dodge,
    mobStats.evasion
  );

  if (!hits) {
    const wouldHitWithoutAvoidance = doesAttackHit(
      attackRoll,
      playerStats.accuracy,
      0,
      0
    );

    state.log.push({
      round: state.round,
      actor: 'player',
      action: 'attack',
      roll: attackRoll,
      evaded: wouldHitWithoutAvoidance,
      attackModifier: playerStats.attack,
      accuracyModifier: playerStats.accuracy,
      targetDodge: mobStats.dodge,
      targetEvasion: mobStats.evasion,
      message: wouldHitWithoutAvoidance
        ? `The ${mobName} avoids your attack!`
        : `You swing at the ${mobName} but miss!`,
      ...hpSnapshot(state),
    });
    return;
  }

  const rawDamage = rollDamage(playerStats.damageMin, playerStats.damageMax);
  const crit = isCriticalHit(playerStats.critChance ?? 0);
  const effectiveDefence = playerStats.damageType === 'magic' ? mobStats.magicDefence : mobStats.defence;
  const { damage: finalDamage, actualMultiplier } = calculateFinalDamage(rawDamage, effectiveDefence, crit, playerStats.critDamage ?? 0);
  const armorReduction = Math.floor(rawDamage * actualMultiplier * calculateDefenceReduction(effectiveDefence));

  state.mobHp -= finalDamage;

  const critText = crit ? ' CRITICAL HIT!' : '';
  state.log.push({
    round: state.round,
    actor: 'player',
    action: 'attack',
    roll: attackRoll,
    damage: finalDamage,
    attackModifier: playerStats.attack,
    accuracyModifier: playerStats.accuracy,
    targetDodge: mobStats.dodge,
    targetEvasion: mobStats.evasion,
    targetDefence: playerStats.damageType === 'magic' ? undefined : mobStats.defence,
    targetMagicDefence: playerStats.damageType === 'magic' ? mobStats.magicDefence : undefined,
    rawDamage,
    armorReduction: playerStats.damageType === 'magic' ? undefined : armorReduction,
    magicDefenceReduction: playerStats.damageType === 'magic' ? armorReduction : undefined,
    isCritical: crit,
    ...(crit ? { critMultiplier: actualMultiplier } : {}),
    message: `You strike the ${mobName} for ${finalDamage} damage!${critText}`,
    ...hpSnapshot(state),
  });

  if (state.mobHp <= 0) {
    state.outcome = 'victory';
    state.log.push({
      round: state.round,
      actor: 'player',
      action: 'attack',
      message: `The ${mobName} falls defeated!`,
      ...hpSnapshot(state),
    });
  }
}

function executeMobAttack(
  state: CombatState,
  mobStats: CombatantStats,
  playerStats: CombatantStats,
  mob: MobTemplate
): void {
  const spellAction = mob.spellPattern.find((s) => s.round === state.round);
  if (spellAction) {
    executeSpell(state, spellAction, 'mob', mobStats, playerStats, mob.name);
    return;
  }

  const attackRoll = rollD20();
  const hits = doesAttackHit(
    attackRoll,
    mobStats.accuracy,
    playerStats.dodge,
    playerStats.evasion
  );

  if (!hits) {
    const wouldHitWithoutAvoidance = doesAttackHit(
      attackRoll,
      mobStats.accuracy,
      0,
      0
    );

    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'attack',
      roll: attackRoll,
      attackModifier: mobStats.attack,
      accuracyModifier: mobStats.accuracy,
      targetDodge: playerStats.dodge,
      targetEvasion: playerStats.evasion,
      evaded: wouldHitWithoutAvoidance,
      message: wouldHitWithoutAvoidance
        ? `You avoid the ${mob.name}'s attack!`
        : `The ${mob.name} attacks but misses!`,
      ...hpSnapshot(state),
    });
    return;
  }

  const rawDamage = rollDamage(mobStats.damageMin, mobStats.damageMax);
  const crit = isCriticalHit(0);
  const effectiveDefence = mobStats.damageType === 'magic' ? playerStats.magicDefence : playerStats.defence;
  const { damage: finalDamage, actualMultiplier: mobCritMultiplier } = calculateFinalDamage(rawDamage, effectiveDefence, crit, 0);
  const armorReduction = Math.floor(rawDamage * mobCritMultiplier * calculateDefenceReduction(effectiveDefence));

  state.playerHp -= finalDamage;

  const critText = crit ? ' CRITICAL HIT!' : '';
  state.log.push({
    round: state.round,
    actor: 'mob',
    action: 'attack',
    roll: attackRoll,
    damage: finalDamage,
    attackModifier: mobStats.attack,
    accuracyModifier: mobStats.accuracy,
    targetDodge: playerStats.dodge,
    targetEvasion: playerStats.evasion,
    targetDefence: mobStats.damageType === 'magic' ? undefined : playerStats.defence,
    targetMagicDefence: mobStats.damageType === 'magic' ? playerStats.magicDefence : undefined,
    rawDamage,
    armorReduction: mobStats.damageType === 'magic' ? undefined : armorReduction,
    magicDefenceReduction: mobStats.damageType === 'magic' ? armorReduction : undefined,
    isCritical: crit,
    ...(crit ? { critMultiplier: mobCritMultiplier } : {}),
    message: `The ${mob.name} hits you for ${finalDamage} damage!${critText}`,
    ...hpSnapshot(state),
  });

  if (state.playerHp <= 0) {
    state.outcome = 'defeat';
    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'attack',
      message: `You have been knocked out by the ${mob.name}!`,
      ...hpSnapshot(state),
    });
  }
}

function executeSpell(
  state: CombatState,
  spell: SpellAction,
  caster: 'player' | 'mob',
  casterStats: CombatantStats,
  targetStats: CombatantStats,
  casterName: string
): void {
  let finalDamage = 0;
  let healAmount = 0;
  const appliedEffects: CombatLogEntry['effectsApplied'] = [];

  // 1. Damage (mitigated by target's magicDefence)
  if (spell.damage) {
    const reduction = calculateDefenceReduction(targetStats.magicDefence);
    const mitigated = Math.floor(spell.damage * reduction);
    finalDamage = Math.max(1, spell.damage - mitigated);

    if (caster === 'mob') {
      state.playerHp -= finalDamage;
    } else {
      state.mobHp -= finalDamage;
    }
  }

  // 2. Heal (capped at caster's maxHp)
  if (spell.heal) {
    if (caster === 'mob') {
      const before = state.mobHp;
      state.mobHp = Math.min(state.mobMaxHp, state.mobHp + spell.heal);
      healAmount = state.mobHp - before;
    } else {
      const before = state.playerHp;
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + spell.heal);
      healAmount = state.playerHp - before;
    }
  }

  // 3. Effects (positive modifier = buff on caster, negative = debuff on opponent)
  if (spell.effects) {
    for (const effect of spell.effects) {
      const target = effect.modifier >= 0 ? caster : (caster === 'player' ? 'mob' : 'player');
      state.activeEffects.push({
        name: spell.name,
        target,
        stat: effect.stat,
        modifier: effect.modifier,
        remainingRounds: effect.duration,
      });
      appliedEffects.push({
        stat: effect.stat,
        modifier: effect.modifier,
        duration: effect.duration,
        target,
      });
    }
  }

  // Build log message
  const parts: string[] = [];
  if (caster === 'mob') {
    parts.push(`The ${casterName} casts ${spell.name}`);
  } else {
    parts.push(`You cast ${spell.name}`);
  }

  if (finalDamage > 0) {
    parts[0] += ` for ${finalDamage} damage`;
  }
  if (healAmount > 0) {
    if (finalDamage > 0) {
      parts.push(`Heals ${healAmount} HP`);
    } else {
      parts[0] += `! +${healAmount} HP`;
    }
  }
  if (appliedEffects.length > 0 && finalDamage === 0 && healAmount === 0) {
    const effectDesc = appliedEffects.map(e =>
      `${e.stat} ${e.modifier > 0 ? '+' : ''}${e.modifier}, ${e.duration} rds`
    ).join('; ');
    parts[0] += `! (${effectDesc})`;
  }

  const message = parts.length > 1 ? parts[0] + '! ' + parts.slice(1).join('. ') + '.' : parts[0] + '!';

  state.log.push({
    round: state.round,
    actor: caster,
    action: 'spell',
    damage: finalDamage > 0 ? finalDamage : undefined,
    rawDamage: spell.damage,
    targetMagicDefence: spell.damage ? targetStats.magicDefence : undefined,
    magicDefenceReduction: spell.damage ? Math.floor(spell.damage * calculateDefenceReduction(targetStats.magicDefence)) : undefined,
    spellName: spell.name,
    healAmount: healAmount > 0 ? healAmount : undefined,
    effectsApplied: appliedEffects.length > 0 ? appliedEffects : undefined,
    message,
    ...hpSnapshot(state),
  });

  // Check for knockout
  if (state.playerHp <= 0) {
    state.outcome = 'defeat';
    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'spell',
      message: `You have been knocked out by the ${caster === 'mob' ? casterName : 'your own spell'}!`,
      ...hpSnapshot(state),
    });
  } else if (state.mobHp <= 0) {
    state.outcome = 'victory';
    state.log.push({
      round: state.round,
      actor: 'player',
      action: 'spell',
      message: `The ${caster === 'mob' ? casterName : 'enemy'} falls defeated!`,
      ...hpSnapshot(state),
    });
  }
}
