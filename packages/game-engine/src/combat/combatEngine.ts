import {
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
    magicDefence: 0,
    dodge: mob.evasion,
    evasion: 0,
    damageMin: mob.damageMin,
    damageMax: mob.damageMax,
    speed: 0,
  };

  const state: CombatState = {
    playerHp: playerStats.hp,
    playerMaxHp: playerStats.maxHp,
    mobHp: mobStats.hp,
    mobMaxHp: mobStats.maxHp,
    round: 0,
    log: [],
    outcome: null,
  };

  const playerInit = rollInitiative(playerStats.speed);
  const mobInit = rollInitiative(mobStats.speed);
  const playerGoesFirst = playerInit >= mobInit;

  state.log.push({
    round: 0,
    actor: 'player',
    action: 'attack',
    roll: playerInit,
    message: `Combat begins! Initiative: Player ${playerInit}, ${mob.name} ${mobInit}`,
    ...hpSnapshot(state),
  });

  while (state.round < MAX_ROUNDS && state.outcome === null) {
    state.round++;

    if (playerGoesFirst) {
      executePlayerAttack(state, playerStats, mobStats, mob.name);
      if (state.outcome) break;
      executeMobAttack(state, mobStats, playerStats, mob);
    } else {
      executeMobAttack(state, mobStats, playerStats, mob);
      if (state.outcome) break;
      executePlayerAttack(state, playerStats, mobStats, mob.name);
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
  const { damage: finalDamage, actualMultiplier } = calculateFinalDamage(rawDamage, mobStats.defence, crit, playerStats.critDamage ?? 0);
  const armorReduction = Math.floor(rawDamage * actualMultiplier * calculateDefenceReduction(mobStats.defence));

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
    targetDefence: mobStats.defence,
    rawDamage,
    armorReduction,
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
  const { damage: finalDamage, actualMultiplier: mobCritMultiplier } = calculateFinalDamage(rawDamage, playerStats.defence, crit, 0);
  const armorReduction = Math.floor(rawDamage * mobCritMultiplier * calculateDefenceReduction(playerStats.defence));

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
    targetDefence: playerStats.defence,
    rawDamage,
    armorReduction,
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
  if (spell.damage) {
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
}
