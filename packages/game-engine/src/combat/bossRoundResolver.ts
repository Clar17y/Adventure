import {
  WORLD_EVENT_CONSTANTS,
  type CombatantStats,
} from '@adventure/shared';
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
}

export interface BossRoundAttacker {
  playerId: string;
  stats: CombatantStats;
  currentHp: number;
}

export interface BossRoundHealer {
  playerId: string;
  healAmount: number;
  currentHp: number;
}

export interface BossRoundInput {
  bossHp: number;
  bossMaxHp: number;
  boss: BossStats;
  attackers: BossRoundAttacker[];
  healers: BossRoundHealer[];
}

export interface AttackerResult {
  playerId: string;
  hit: boolean;
  damage: number;
  isCritical: boolean;
}

export interface HealerResult {
  playerId: string;
  targets: Array<{ playerId: string; healAmount: number }>;
}

export interface BossRoundResult {
  bossHpAfter: number;
  bossDefeated: boolean;
  attackerResults: AttackerResult[];
  aoeDamage: number;
  healerResults: HealerResult[];
  participantHpAfter: Map<string, number>;
  knockouts: string[];
}

/**
 * Resolve a single boss round. Pure function.
 *
 * 1. Attackers deal damage to boss
 * 2. Boss AOE damage to all participants
 * 3. Healers heal lowest-HP participants
 */
export function resolveBossRoundLogic(
  input: BossRoundInput,
  roll?: () => number,
): BossRoundResult {
  const rollFn = roll ?? rollD20;
  let bossHp = input.bossHp;
  const hpMap = new Map<string, number>();
  const maxHpMap = new Map<string, number>();

  // Initialize HP tracking for all participants
  for (const a of input.attackers) {
    hpMap.set(a.playerId, a.currentHp);
    maxHpMap.set(a.playerId, a.stats.maxHp);
  }
  for (const h of input.healers) {
    hpMap.set(h.playerId, h.currentHp);
    // Healers don't have full CombatantStats, so store their current HP as max
    if (!maxHpMap.has(h.playerId)) {
      maxHpMap.set(h.playerId, h.currentHp);
    }
  }

  // 1. Attackers deal damage
  const attackerResults: AttackerResult[] = [];
  for (const attacker of input.attackers) {
    const attackRoll = rollFn();
    const hits = doesAttackHit(
      attackRoll,
      attacker.stats.accuracy,
      input.boss.dodge,
      0,
    );

    if (!hits) {
      attackerResults.push({
        playerId: attacker.playerId,
        hit: false,
        damage: 0,
        isCritical: false,
      });
      continue;
    }

    const rawDmg = rollDamage(attacker.stats.damageMin, attacker.stats.damageMax);
    const crit = isCriticalHit(attacker.stats.critChance ?? 0);
    const effectiveDefence = attacker.stats.damageType === 'magic'
      ? input.boss.magicDefence
      : input.boss.defence;
    const { damage } = calculateFinalDamage(rawDmg, effectiveDefence, crit, attacker.stats.critDamage ?? 0);

    bossHp -= damage;
    attackerResults.push({
      playerId: attacker.playerId,
      hit: true,
      damage,
      isCritical: crit,
    });
  }

  const bossDefeated = bossHp <= 0;

  // 2. Boss AOE damage (only if boss still alive)
  const aoeDamage = bossDefeated ? 0 : input.boss.aoeDamage;
  if (!bossDefeated) {
    for (const [playerId, hp] of hpMap) {
      hpMap.set(playerId, hp - aoeDamage);
    }
  }

  // 3. Healers heal lowest-HP participants
  const healerResults: HealerResult[] = [];
  for (const healer of input.healers) {
    const targets: Array<{ playerId: string; healAmount: number }> = [];

    // Get living participants sorted by HP ascending
    const living = Array.from(hpMap.entries())
      .filter(([, hp]) => hp > 0)
      .sort((a, b) => a[1] - b[1]);

    const maxTargets = WORLD_EVENT_CONSTANTS.HEALER_MAX_TARGETS;
    for (let i = 0; i < Math.min(maxTargets, living.length); i++) {
      const [targetId, currentHp] = living[i]!;
      const maxHp = maxHpMap.get(targetId) ?? currentHp;
      const healed = Math.min(healer.healAmount, maxHp - currentHp);
      if (healed > 0) {
        hpMap.set(targetId, currentHp + healed);
        targets.push({ playerId: targetId, healAmount: healed });
        // Update the living array entry for subsequent healer iterations
        living[i] = [targetId, currentHp + healed];
      }
    }

    healerResults.push({ playerId: healer.playerId, targets });
  }

  // Determine knockouts
  const knockouts: string[] = [];
  for (const [playerId, hp] of hpMap) {
    if (hp <= 0) knockouts.push(playerId);
  }

  return {
    bossHpAfter: Math.max(0, bossHp),
    bossDefeated,
    attackerResults,
    aoeDamage,
    healerResults,
    participantHpAfter: hpMap,
    knockouts,
  };
}
