import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Combatant, CombatantStats, MobTemplate } from '@adventure/shared';
import { runCombat } from './combatEngine';
import { mobToCombatantStats } from './damageCalculator';

function wrapPlayer(stats: CombatantStats): Combatant {
  return { id: 'player1', name: 'Player', stats };
}

function wrapMob(mob: MobTemplate & { currentHp?: number; maxHp?: number }): Combatant {
  return { id: mob.id, name: mob.name, stats: mobToCombatantStats(mob), spells: mob.spellPattern };
}

describe('runCombat crit multiplier logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs player critMultiplier using player bonus crit damage', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.95) // player initiative roll (20)
      .mockReturnValueOnce(0.0) // mob initiative roll (1)
      .mockReturnValueOnce(0.95) // player attack roll (20)
      .mockReturnValueOnce(0.3) // player damage roll
      .mockReturnValueOnce(0.0); // player crit roll (crit)

    const player: CombatantStats = {
      hp: 100,
      maxHp: 100,
      attack: 10,
      accuracy: 5,
      defence: 5,
      magicDefence: 0,
      dodge: 0,
      evasion: 0,
      damageMin: 10,
      damageMax: 10,
      speed: 5,
      critChance: 0,
      critDamage: 0.3,
      damageType: 'physical' as const,
    };

    const mob: MobTemplate = {
      id: 'mob-1',
      name: 'Rat',
      zoneId: 'zone-1',
      level: 1,
      hp: 10,
      accuracy: 1,
      defence: 0,
      magicDefence: 0,
      evasion: 0,
      damageMin: 1,
      damageMax: 1,
      xpReward: 1,
      encounterWeight: 1,
      spellPattern: [],
      damageType: 'physical' as const,
    };

    const result = runCombat(wrapPlayer(player), wrapMob(mob));
    const playerHit = result.log.find((entry) => entry.actor === 'combatantA' && entry.damage !== undefined);

    expect(playerHit?.isCritical).toBe(true);
    expect(playerHit?.critMultiplier).toBeCloseTo(1.8);
  });

  it('logs mob critMultiplier at base 1.5x with no mob gear bonuses', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.0) // player initiative roll (1)
      .mockReturnValueOnce(0.95) // mob initiative roll (20)
      .mockReturnValueOnce(0.95) // mob attack roll (20)
      .mockReturnValueOnce(0.2) // mob damage roll
      .mockReturnValueOnce(0.0); // mob crit roll (crit)

    const player: CombatantStats = {
      hp: 5,
      maxHp: 5,
      attack: 1,
      accuracy: 0,
      defence: 0,
      magicDefence: 0,
      dodge: 0,
      evasion: 0,
      damageMin: 1,
      damageMax: 1,
      speed: 0,
      critChance: 0,
      critDamage: 0.8,
      damageType: 'physical' as const,
    };

    const mob: MobTemplate = {
      id: 'mob-2',
      name: 'Wolf',
      zoneId: 'zone-1',
      level: 3,
      hp: 50,
      accuracy: 3,
      defence: 0,
      magicDefence: 0,
      evasion: 0,
      damageMin: 5,
      damageMax: 5,
      xpReward: 3,
      encounterWeight: 1,
      spellPattern: [],
      damageType: 'physical' as const,
    };

    const result = runCombat(wrapPlayer(player), wrapMob(mob));
    const mobHit = result.log.find((entry) => entry.actor === 'combatantB' && entry.damage !== undefined);

    expect(mobHit?.isCritical).toBe(true);
    expect(mobHit?.critMultiplier).toBeCloseTo(1.5);
  });
});

describe('magic damageType defence selection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makePlayer(overrides: Partial<CombatantStats> = {}): Combatant {
    return wrapPlayer({
      hp: 100, maxHp: 100, attack: 10, accuracy: 20,
      defence: 50, magicDefence: 0, dodge: 0, evasion: 0,
      damageMin: 10, damageMax: 10, speed: 10,
      critChance: 0, critDamage: 0, damageType: 'physical',
      ...overrides,
    });
  }

  function makeMob(overrides: Partial<MobTemplate> = {}): Combatant {
    const mob: MobTemplate = {
      id: 'mob-1', name: 'Test Mob', zoneId: 'zone-1', level: 1,
      hp: 200, accuracy: 1, defence: 50, magicDefence: 0,
      evasion: 0, damageMin: 10, damageMax: 10,
      xpReward: 1, encounterWeight: 1, spellPattern: [],
      damageType: 'physical',
      ...overrides,
    };
    return wrapMob(mob);
  }

  it('player magic attack uses mob magicDefence (not defence)', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.95)  // player initiative (high)
      .mockReturnValueOnce(0.0)   // mob initiative (low)
      .mockReturnValueOnce(0.95)  // player attack roll = 20 (auto-hit)
      .mockReturnValueOnce(0.0)   // player damage roll = damageMin
      .mockReturnValueOnce(0.99); // player crit roll = no crit

    const player = makePlayer({ damageType: 'magic' });
    const mob = makeMob({ defence: 50, magicDefence: 0, hp: 200 });

    const result = runCombat(player, mob);
    const playerHit = result.log.find(e => e.actor === 'combatantA' && e.damage !== undefined);

    expect(playerHit?.damage).toBe(10);
  });

  it('player physical attack uses mob defence (not magicDefence)', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.95)
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.95)
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.99);

    const player = makePlayer({ damageType: 'physical' });
    const mob = makeMob({ defence: 0, magicDefence: 50, hp: 200 });

    const result = runCombat(player, mob);
    const playerHit = result.log.find(e => e.actor === 'combatantA' && e.damage !== undefined);

    expect(playerHit?.damage).toBe(10);
  });

  it('mob magic auto-attack uses player magicDefence', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.0)   // player initiative (low)
      .mockReturnValueOnce(0.95)  // mob initiative (high)
      .mockReturnValueOnce(0.95)  // mob attack roll = 20
      .mockReturnValueOnce(0.0)   // mob damage roll
      .mockReturnValueOnce(0.99); // no crit

    const player = makePlayer({ defence: 50, magicDefence: 0 });
    const mob = makeMob({ damageType: 'magic', hp: 200 });

    const result = runCombat(player, mob);
    const mobHit = result.log.find(e => e.actor === 'combatantB' && e.damage !== undefined);

    expect(mobHit?.damage).toBe(10);
  });

  it('mob physical auto-attack uses player defence', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.95)
      .mockReturnValueOnce(0.95)
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.99);

    const player = makePlayer({ defence: 0, magicDefence: 50 });
    const mob = makeMob({ damageType: 'physical', hp: 200 });

    const result = runCombat(player, mob);
    const mobHit = result.log.find(e => e.actor === 'combatantB' && e.damage !== undefined);

    expect(mobHit?.damage).toBe(10);
  });
});
