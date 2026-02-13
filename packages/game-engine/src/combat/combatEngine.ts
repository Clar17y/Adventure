import {
  ActiveEffect,
  CombatState,
  CombatLogEntry,
  CombatResult,
  CombatantStats,
  MobTemplate,
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
    state.log.push({
      round: state.round,
      actor: 'mob',
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
      case 'attack': effective.attack += effect.modifier; break;
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

/**
 * Run a complete combat encounter.
 * Pure function - no side effects, fully deterministic given same random seed.
 */
export function runCombat(
  playerStats: CombatantStats,
  mob: MobTemplate & { currentHp?: number; maxHp?: number }
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

    tickEffects(state);
    const effectivePlayerStats = getEffectiveStats(playerStats, state.activeEffects, 'player');
    const effectiveMobStats = getEffectiveStats(mobStats, state.activeEffects, 'mob');

    if (playerGoesFirst) {
      executePlayerAttack(state, effectivePlayerStats, effectiveMobStats, mob.name);
      if (state.outcome) break;
      executeMobAttack(state, effectiveMobStats, effectivePlayerStats, mob);
    } else {
      executeMobAttack(state, effectiveMobStats, effectivePlayerStats, mob);
      if (state.outcome) break;
      executePlayerAttack(state, effectivePlayerStats, effectiveMobStats, mob.name);
    }
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
    executeMobSpell(state, spellAction, mob.name, playerStats);
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

function executeMobSpell(
  state: CombatState,
  spell: { action: string; damage?: number; effect?: string },
  mobName: string,
  playerStats: CombatantStats
): void {
  if (!spell.damage) {
    // Non-damaging spell (buff/effect) — still log the action
    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'spell',
      message: `The ${mobName} casts ${spell.action}!`,
      ...hpSnapshot(state),
    });
    return;
  }

  const reduction = calculateDefenceReduction(playerStats.magicDefence);
  const mitigated = Math.floor(spell.damage * reduction);
  const finalDamage = Math.max(1, spell.damage - mitigated);

  state.playerHp -= finalDamage;
  state.log.push({
    round: state.round,
    actor: 'mob',
    action: 'spell',
    damage: finalDamage,
    rawDamage: spell.damage,
    targetMagicDefence: playerStats.magicDefence,
    magicDefenceReduction: mitigated,
    message: `The ${mobName} casts ${spell.action} for ${finalDamage} damage!`,
    ...hpSnapshot(state),
  });

  if (state.playerHp <= 0) {
    state.outcome = 'defeat';
    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'spell',
      message: `You have been knocked out by the ${mobName}!`,
      ...hpSnapshot(state),
    });
  }
}
