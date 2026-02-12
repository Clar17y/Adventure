import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CombatantStats, MobTemplate } from '@adventure/shared';
import { runCombat } from './combatEngine';

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
    };

    const mob: MobTemplate = {
      id: 'mob-1',
      name: 'Rat',
      zoneId: 'zone-1',
      level: 1,
      hp: 10,
      accuracy: 1,
      defence: 0,
      evasion: 0,
      damageMin: 1,
      damageMax: 1,
      xpReward: 1,
      encounterWeight: 1,
      spellPattern: [],
    };

    const result = runCombat(player, mob);
    const playerHit = result.log.find((entry) => entry.actor === 'player' && entry.damage !== undefined);

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
    };

    const mob: MobTemplate = {
      id: 'mob-2',
      name: 'Wolf',
      zoneId: 'zone-1',
      level: 3,
      hp: 50,
      accuracy: 3,
      defence: 0,
      evasion: 0,
      damageMin: 5,
      damageMax: 5,
      xpReward: 3,
      encounterWeight: 1,
      spellPattern: [],
    };

    const result = runCombat(player, mob);
    const mobHit = result.log.find((entry) => entry.actor === 'mob' && entry.damage !== undefined);

    expect(mobHit?.isCritical).toBe(true);
    expect(mobHit?.critMultiplier).toBeCloseTo(1.5);
  });
});
