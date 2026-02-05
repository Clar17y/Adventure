import {
  CombatState,
  CombatLogEntry,
  CombatResult,
  CombatOutcome,
  CombatantStats,
  MobTemplate,
  LootDrop,
  COMBAT_XP_CONSTANTS,
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

interface CombatCounters {
  defenceEvents: number;
  evasionEvents: number;
}

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

  const counters: CombatCounters = { defenceEvents: 0, evasionEvents: 0 };

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
    ...hpSnapshot(state),
  });

  // Combat loop
  while (state.round < MAX_ROUNDS && state.outcome === null) {
    state.round++;

    if (playerGoesFirst) {
      executePlayerAttack(state, playerStats, mobStats, mob.name);
      if (state.outcome) break;
      executeMobAttack(state, mobStats, playerStats, mob, counters);
    } else {
      executeMobAttack(state, mobStats, playerStats, mob, counters);
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
      ...hpSnapshot(state),
    });
  }

  return {
    outcome: state.outcome,
    log: state.log,
    xpGained: state.outcome === 'victory' ? mob.xpReward : 0,
    loot: [],
    durabilityLost: [],
    turnsSpent: 0,
    playerHpRemaining: Math.max(0, state.playerHp),
    secondarySkillXp: {
      defence: {
        events: counters.defenceEvents,
        xpGained: counters.defenceEvents * COMBAT_XP_CONSTANTS.DEFENCE_XP_PER_HIT_TAKEN,
      },
      evasion: {
        events: counters.evasionEvents,
        xpGained: counters.evasionEvents * COMBAT_XP_CONSTANTS.EVASION_XP_PER_DODGE,
      },
    },
  };
}

function computeArmorReduction(armor: number): number {
  return armor / (armor + 100);
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
      attackModifier: playerStats.attack,
      targetDefence: mobStats.defence,
      message: `You swing at the ${mobName} but miss!`,
      ...hpSnapshot(state),
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
      attackModifier: playerStats.attack,
      targetDefence: mobStats.defence,
      message: `The ${mobName} dodges your attack!`,
      ...hpSnapshot(state),
    });
    return;
  }

  // Calculate damage
  const rawDamage = rollDamage(playerStats.damageMin, playerStats.damageMax);
  const crit = isCriticalHit();
  const finalDamage = calculateFinalDamage(rawDamage, mobStats.defence, crit);
  const armorReduction = Math.floor(rawDamage * (crit ? 1.5 : 1) * computeArmorReduction(mobStats.defence));

  state.mobHp -= finalDamage;

  const critText = crit ? ' CRITICAL HIT!' : '';
  state.log.push({
    round: state.round,
    actor: 'player',
    action: 'attack',
    roll: attackRoll,
    damage: finalDamage,
    attackModifier: playerStats.attack,
    targetDefence: mobStats.defence,
    rawDamage,
    armorReduction,
    isCritical: crit,
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
  mob: MobTemplate,
  counters: CombatCounters
): void {
  // Check for spell pattern
  const spellAction = mob.spellPattern.find(s => s.round === state.round);
  if (spellAction) {
    executeMobSpell(state, spellAction, mob.name, counters);
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
      attackModifier: mobStats.attack,
      targetDefence: playerStats.defence,
      message: `The ${mob.name} attacks but misses!`,
      ...hpSnapshot(state),
    });
    return;
  }

  // Check evasion - player dodges mob attack
  if (doesTargetEvade(playerStats.evasion)) {
    counters.evasionEvents++;
    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'attack',
      roll: attackRoll,
      evaded: true,
      attackModifier: mobStats.attack,
      targetDefence: playerStats.defence,
      message: `You dodge the ${mob.name}'s attack!`,
      ...hpSnapshot(state),
    });
    return;
  }

  // Mob hits player - defence event
  counters.defenceEvents++;

  // Calculate damage
  const rawDamage = rollDamage(mobStats.damageMin, mobStats.damageMax);
  const crit = isCriticalHit();
  const finalDamage = calculateFinalDamage(rawDamage, playerStats.defence, crit);
  const armorReduction = Math.floor(rawDamage * (crit ? 1.5 : 1) * computeArmorReduction(playerStats.defence));

  state.playerHp -= finalDamage;

  const critText = crit ? ' CRITICAL HIT!' : '';
  state.log.push({
    round: state.round,
    actor: 'mob',
    action: 'attack',
    roll: attackRoll,
    damage: finalDamage,
    attackModifier: mobStats.attack,
    targetDefence: playerStats.defence,
    rawDamage,
    armorReduction,
    isCritical: crit,
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
  counters: CombatCounters
): void {
  if (spell.damage) {
    counters.defenceEvents++;
    state.playerHp -= spell.damage;
    state.log.push({
      round: state.round,
      actor: 'mob',
      action: 'spell',
      damage: spell.damage,
      rawDamage: spell.damage,
      message: `The ${mobName} casts ${spell.action} for ${spell.damage} damage!`,
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
