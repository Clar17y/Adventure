import { describe, it, expect } from 'vitest';
import { runCombat } from '../combatEngine';
import type { CombatantStats, MobTemplate } from '@adventure/shared';

function makePlayer(overrides: Partial<CombatantStats> = {}): CombatantStats {
  return {
    hp: 100,
    maxHp: 100,
    attack: 10,
    accuracy: 15,
    defence: 10,
    magicDefence: 5,
    dodge: 5,
    evasion: 5,
    damageMin: 5,
    damageMax: 10,
    speed: 10,
    damageType: 'physical',
    ...overrides,
  };
}

function makeMob(
  overrides: Partial<MobTemplate & { currentHp?: number; maxHp?: number }> = {},
): MobTemplate & { currentHp?: number; maxHp?: number } {
  return {
    id: 'test-mob',
    name: 'Test Mob',
    zoneId: 'test-zone',
    level: 5,
    hp: 50,
    accuracy: 10,
    defence: 5,
    magicDefence: 3,
    evasion: 5,
    damageMin: 3,
    damageMax: 6,
    xpReward: 20,
    encounterWeight: 100,
    spellPattern: [],
    damageType: 'physical',
    ...overrides,
  };
}

describe('Spell Effects', () => {
  it('logs damage spell with mitigation', () => {
    const mob = makeMob({
      spellPattern: [{ round: 1, name: 'Fire Bolt', damage: 10 }],
    });
    const result = runCombat(makePlayer(), mob);
    const spellEntry = result.log.find(e => e.spellName === 'Fire Bolt');
    expect(spellEntry).toBeDefined();
    expect(spellEntry!.action).toBe('spell');
    expect(spellEntry!.damage).toBeGreaterThan(0);
    expect(spellEntry!.rawDamage).toBe(10);
  });

  it('logs heal spell and caps at maxHp', () => {
    // Start mob at 30/50 HP so it survives player's first attack, and heal is capped at maxHp
    const mob = makeMob({
      hp: 50,
      currentHp: 30,
      maxHp: 50,
      defence: 50,
      spellPattern: [{ round: 1, name: 'Heal Self', heal: 200 }],
    });
    const result = runCombat(makePlayer(), mob);
    const healEntry = result.log.find(e => e.spellName === 'Heal Self');
    expect(healEntry).toBeDefined();
    expect(healEntry!.healAmount).toBeDefined();
    // Mob started at 30hp, maxHp is 50. Heal of 200 is capped at maxHp.
    expect(healEntry!.mobHpAfter).toBeLessThanOrEqual(50);
  });

  it('logs lifesteal spell (damage + heal)', () => {
    // Start mob below maxHp so heal portion actually heals
    const mob = makeMob({
      hp: 50,
      currentHp: 10,
      maxHp: 50,
      spellPattern: [{ round: 1, name: 'Life Drain', damage: 8, heal: 8 }],
    });
    const result = runCombat(makePlayer(), mob);
    const drainEntry = result.log.find(e => e.spellName === 'Life Drain');
    expect(drainEntry).toBeDefined();
    expect(drainEntry!.damage).toBeGreaterThan(0);
    expect(drainEntry!.healAmount).toBeGreaterThan(0);
  });

  it('applies buff effects to caster', () => {
    const mob = makeMob({
      spellPattern: [{ round: 1, name: 'Howl', effects: [{ stat: 'attack', modifier: 3, duration: 3 }] }],
    });
    const result = runCombat(makePlayer(), mob);
    const buffEntry = result.log.find(e => e.spellName === 'Howl');
    expect(buffEntry).toBeDefined();
    expect(buffEntry!.effectsApplied).toBeDefined();
    expect(buffEntry!.effectsApplied![0].stat).toBe('attack');
    expect(buffEntry!.effectsApplied![0].modifier).toBe(3);
    expect(buffEntry!.effectsApplied![0].target).toBe('mob');
  });

  it('applies debuff effects to opponent', () => {
    const mob = makeMob({
      spellPattern: [{ round: 1, name: 'Web Trap', effects: [{ stat: 'evasion', modifier: -2, duration: 2 }] }],
    });
    const result = runCombat(makePlayer(), mob);
    const debuffEntry = result.log.find(e => e.spellName === 'Web Trap');
    expect(debuffEntry).toBeDefined();
    expect(debuffEntry!.effectsApplied).toBeDefined();
    expect(debuffEntry!.effectsApplied![0].stat).toBe('evasion');
    expect(debuffEntry!.effectsApplied![0].modifier).toBe(-2);
    expect(debuffEntry!.effectsApplied![0].target).toBe('player');
  });

  it('expires effects after duration and logs expiry', () => {
    const mob = makeMob({
      hp: 200,
      spellPattern: [{ round: 1, name: 'Quick Hex', effects: [{ stat: 'accuracy', modifier: -3, duration: 1 }] }],
    });
    const player = makePlayer({ hp: 200, maxHp: 200 });
    const result = runCombat(player, mob);

    const expiryEntry = result.log.find(e => e.effectsExpired && e.effectsExpired.length > 0);
    expect(expiryEntry).toBeDefined();
    expect(expiryEntry!.effectsExpired![0].name).toBe('Quick Hex');
  });
});
