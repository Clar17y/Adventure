import { COMBAT_CONSTANTS } from '@adventure/shared';
import {
  rollD20,
  rollDamage,
  doesAttackHit,
  isCriticalHit,
  calculateFinalDamage,
} from './damageCalculator';

export interface BossStats {
  defence: number;
  magicDefence: number;
  dodge: number;
  aoeDamage: number;
  avgParticipantDefence: number;
}

export interface BossRoundAttacker {
  playerId: string;
  stats: import('@adventure/shared').CombatantStats;
}

export interface BossRoundHealer {
  playerId: string;
  healAmount: number;
}

export interface BossRoundInput {
  bossHp: number;
  bossMaxHp: number;
  boss: BossStats;
  attackers: BossRoundAttacker[];
  healers: BossRoundHealer[];
  raidPool: number;
  raidPoolMax: number;
}

export interface AttackerResult {
  playerId: string;
  hit: boolean;
  damage: number;
  isCritical: boolean;
}

export interface HealerResult {
  playerId: string;
  healAmount: number;
}

export interface BossRoundResult {
  bossHpAfter: number;
  bossDefeated: boolean;
  attackerResults: AttackerResult[];
  poolDamageTaken: number;
  healerResults: HealerResult[];
  raidPoolAfter: number;
  raidWiped: boolean;
}

export function resolveBossRoundLogic(
  input: BossRoundInput,
  roll?: () => number,
): BossRoundResult {
  const rollFn = roll ?? rollD20;
  let bossHp = input.bossHp;
  let raidPool = input.raidPool;

  // 1. Attack phase: each attacker rolls against boss
  const attackerResults: AttackerResult[] = [];
  for (const attacker of input.attackers) {
    const attackRoll = rollFn();
    const hits = doesAttackHit(attackRoll, attacker.stats.accuracy, input.boss.dodge, 0);

    if (!hits) {
      attackerResults.push({ playerId: attacker.playerId, hit: false, damage: 0, isCritical: false });
      continue;
    }

    const rawDmg = rollDamage(attacker.stats.damageMin, attacker.stats.damageMax);
    const crit = isCriticalHit(attacker.stats.critChance ?? 0);
    const effectiveDefence = attacker.stats.damageType === 'magic'
      ? input.boss.magicDefence
      : input.boss.defence;
    const { damage } = calculateFinalDamage(rawDmg, effectiveDefence, crit, attacker.stats.critDamage ?? 0);

    bossHp -= damage;
    attackerResults.push({ playerId: attacker.playerId, hit: true, damage, isCritical: crit });
  }

  const bossDefeated = bossHp <= 0;

  // 2. Boss phase: single hit to raid pool, reduced by avg defence
  let poolDamageTaken = 0;
  if (!bossDefeated) {
    poolDamageTaken = Math.max(COMBAT_CONSTANTS.MIN_DAMAGE, input.boss.aoeDamage - input.boss.avgParticipantDefence);
    raidPool -= poolDamageTaken;
  }

  // 3. Heal phase: healers restore pool HP
  const healerResults: HealerResult[] = [];
  for (const healer of input.healers) {
    const healed = Math.min(healer.healAmount, input.raidPoolMax - raidPool);
    if (healed > 0) {
      raidPool += healed;
    }
    healerResults.push({ playerId: healer.playerId, healAmount: Math.max(0, healed) });
  }

  const raidWiped = raidPool <= 0;

  return {
    bossHpAfter: Math.max(0, bossHp),
    bossDefeated,
    attackerResults,
    poolDamageTaken,
    healerResults,
    raidPoolAfter: Math.max(0, raidPool),
    raidWiped,
  };
}
