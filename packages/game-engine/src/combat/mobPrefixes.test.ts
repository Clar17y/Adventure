import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MobTemplate } from '@adventure/shared';
import { applyMobPrefix, generatePrefixSpells, rollMobPrefix } from './mobPrefixes';

describe('rollMobPrefix', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when roll lands in the no-prefix bucket', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollMobPrefix()).toBeNull();
  });

  it('returns a prefix key when roll lands in a prefix bucket', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    expect(rollMobPrefix()).toBe('weak');
  });
});

describe('generatePrefixSpells', () => {
  it('creates repeated spell actions up to round 100', () => {
    const spells = generatePrefixSpells(
      {
        startRound: 3,
        interval: 3,
        damageFormula: 'avg',
        damageMultiplier: 1.2,
        actionName: 'Shamanic Bolt',
      },
      4,
      10
    );

    expect(spells[0]).toEqual({ round: 3, action: 'Shamanic Bolt', damage: 8 });
    expect(spells[1]).toEqual({ round: 6, action: 'Shamanic Bolt', damage: 8 });
    expect(spells[spells.length - 1]).toEqual({ round: 99, action: 'Shamanic Bolt', damage: 8 });
  });
});

describe('applyMobPrefix', () => {
  const baseMob: MobTemplate = {
    id: 'mob-1',
    name: 'Forest Rat',
    zoneId: 'zone-1',
    level: 1,
    hp: 15,
    accuracy: 8,
    defence: 3,
    evasion: 2,
    damageMin: 1,
    damageMax: 4,
    xpReward: 10,
    encounterWeight: 120,
    spellPattern: [{ round: 3, action: 'Base Spell', damage: 3 }],
  };

  it('returns base mob metadata when prefix is missing', () => {
    const result = applyMobPrefix(baseMob, null);
    expect(result.mobPrefix).toBeNull();
    expect(result.mobDisplayName).toBe('Forest Rat');
    expect(result.dropChanceMultiplier).toBe(1);
    expect(result.name).toBe('Forest Rat');
  });

  it('applies multipliers, display name, and prefix spell merging', () => {
    const result = applyMobPrefix(baseMob, 'shaman');

    expect(result.mobPrefix).toBe('shaman');
    expect(result.mobDisplayName).toBe('Shaman Forest Rat');
    expect(result.name).toBe('Shaman Forest Rat');
    expect(result.accuracy).toBe(6);
    expect(result.defence).toBe(2);
    expect(result.damageMin).toBe(1);
    expect(result.damageMax).toBe(3);
    expect(result.xpReward).toBe(15);
    expect(result.dropChanceMultiplier).toBe(1.3);
    expect(result.spellPattern[0]).toEqual({ round: 3, action: 'Shamanic Bolt', damage: 2 });
  });
});
