import {
  CombatState,
  CombatLogEntry,
  CombatResult,
  CombatOutcome,
  CombatantStats,
  MobTemplate,
  LootDrop,
} from '@adventure/shared';
import {
  rollD20,
  rollDamage,
  doesAttackHit,
  doesTargetEvade,
  isCriticalHit,
  calculateFinalDamage,
  rollInitiative,
} from './damageCalculator';

const MAX_ROUNDS = 100;

/**
 * Run a complete combat encounter.
 * Pure function - no side effects, fully deterministic given same random seed.
 */
export function runCombat(
  playerStats: CombatantStats,
  mob: MobTemplate
): CombatResult {
  const mobStats: CombatantStats = {
    hp: mob.hp,
    maxHp: mob.hp,
    attack: mob.attack,
    defence: mob.defence,
    evasion: mob.evasion,
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

  // Determine turn order
  const playerInit = rollInitiative(playerStats.speed);
  const mobInit = rollInitiative(mobStats.speed);
  const playerGoesFirst = playerInit >= mobInit;

  state.log.push({
    round: 0,
    actor: 'player',
    action: 'attack',
    roll: playerInit,
    message: `Combat begins! Initiative: Player ${playerInit}, ${mob.name} ${mobInit}`,
  });

  // Combat loop
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

  // Timeout = defeat
  if (state.outcome === null) {
    state.outcome = 'defeat';
    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'attack',
      message: 'Combat timed out. You retreat in exhaustion.',
    });
  }

  return {
    outcome: state.outcome,
    log: state.log,
    xpGained: state.outcome === 'victory' ? mob.xpReward : 0,
    loot: [], // Loot is rolled separately by the service layer
    durabilityLost: [], // Durability is handled by the service layer
    turnsSpent: 0, // Set by the service layer
  };
}

function executePlayerAttack(
  state: CombatState,
  playerStats: CombatantStats,
  mobStats: CombatantStats,
  mobName: string
): void {
  const attackRoll = rollD20();
  const hits = doesAttackHit(attackRoll, playerStats.attack, mobStats.defence);

  if (!hits) {
    state.log.push({
      round: state.round,
      actor: 'player',
      action: 'attack',
      roll: attackRoll,
      message: `You swing at the ${mobName} but miss!`,
    });
    return;
  }

  // Check evasion
  if (doesTargetEvade(mobStats.evasion)) {
    state.log.push({
      round: state.round,
      actor: 'player',
      action: 'attack',
      roll: attackRoll,
      evaded: true,
      message: `The ${mobName} dodges your attack!`,
    });
    return;
  }

  // Calculate damage
  const rawDamage = rollDamage(playerStats.damageMin, playerStats.damageMax);
  const crit = isCriticalHit();
  const finalDamage = calculateFinalDamage(rawDamage, mobStats.defence, crit);

  state.mobHp -= finalDamage;

  const critText = crit ? ' CRITICAL HIT!' : '';
  state.log.push({
    round: state.round,
    actor: 'player',
    action: 'attack',
    roll: attackRoll,
    damage: finalDamage,
    message: `You strike the ${mobName} for ${finalDamage} damage!${critText}`,
  });

  if (state.mobHp <= 0) {
    state.outcome = 'victory';
    state.log.push({
      round: state.round,
      actor: 'player',
      action: 'attack',
      message: `The ${mobName} falls defeated!`,
    });
  }
}

function executeMobAttack(
  state: CombatState,
  mobStats: CombatantStats,
  playerStats: CombatantStats,
  mob: MobTemplate
): void {
  // Check for spell pattern
  const spellAction = mob.spellPattern.find(s => s.round === state.round);
  if (spellAction) {
    executeMobSpell(state, spellAction, mob.name);
    return;
  }

  const attackRoll = rollD20();
  const hits = doesAttackHit(attackRoll, mobStats.attack, playerStats.defence);

  if (!hits) {
    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'attack',
      roll: attackRoll,
      message: `The ${mob.name} attacks but misses!`,
    });
    return;
  }

  // Check evasion
  if (doesTargetEvade(playerStats.evasion)) {
    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'attack',
      roll: attackRoll,
      evaded: true,
      message: `You dodge the ${mob.name}'s attack!`,
    });
    return;
  }

  // Calculate damage
  const rawDamage = rollDamage(mobStats.damageMin, mobStats.damageMax);
  const crit = isCriticalHit();
  const finalDamage = calculateFinalDamage(rawDamage, playerStats.defence, crit);

  state.playerHp -= finalDamage;

  const critText = crit ? ' CRITICAL HIT!' : '';
  state.log.push({
    round: state.round,
    actor: 'mob',
    action: 'attack',
    roll: attackRoll,
    damage: finalDamage,
    message: `The ${mob.name} hits you for ${finalDamage} damage!${critText}`,
  });

  if (state.playerHp <= 0) {
    state.outcome = 'defeat';
    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'attack',
      message: `You have been defeated by the ${mob.name}!`,
    });
  }
}

function executeMobSpell(
  state: CombatState,
  spell: { action: string; damage?: number; effect?: string },
  mobName: string
): void {
  if (spell.damage) {
    state.playerHp -= spell.damage;
    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'spell',
      damage: spell.damage,
      message: `The ${mobName} casts ${spell.action} for ${spell.damage} damage!`,
    });

    if (state.playerHp <= 0) {
      state.outcome = 'defeat';
      state.log.push({
        round: state.round,
        actor: 'mob',
        action: 'spell',
        message: `You have been defeated by the ${mobName}!`,
      });
    }
  }
}
