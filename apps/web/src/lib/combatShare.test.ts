import { describe, expect, it } from 'vitest';
import {
  resolvePlayerMaxHp,
  resolveMobMaxHp,
  formatCombatShareText,
  type ShareCombatLogEntry,
  type CombatShareInput,
} from './combatShare';

describe('resolvePlayerMaxHp', () => {
  it('returns explicit value when provided and > 0', () => {
    expect(resolvePlayerMaxHp([], 100)).toBe(100);
  });

  it('returns undefined for explicit value of 0', () => {
    expect(resolvePlayerMaxHp([], 0)).toBeUndefined();
  });

  it('returns undefined for negative explicit value', () => {
    expect(resolvePlayerMaxHp([], -5)).toBeUndefined();
  });

  it('extracts max from log entries when no explicit', () => {
    const log: ShareCombatLogEntry[] = [
      { round: 1, actor: 'player', playerHpAfter: 80 },
      { round: 2, actor: 'mob', playerHpAfter: 100 },
      { round: 3, actor: 'player', playerHpAfter: 60 },
    ];
    expect(resolvePlayerMaxHp(log)).toBe(100);
  });

  it('returns undefined for empty log', () => {
    expect(resolvePlayerMaxHp([])).toBeUndefined();
  });

  it('returns undefined when log has no playerHpAfter values', () => {
    const log: ShareCombatLogEntry[] = [
      { round: 1, actor: 'player' },
    ];
    expect(resolvePlayerMaxHp(log)).toBeUndefined();
  });
});

describe('resolveMobMaxHp', () => {
  it('returns explicit value when provided', () => {
    expect(resolveMobMaxHp([], 50)).toBe(50);
  });

  it('extracts max from log entries', () => {
    const log: ShareCombatLogEntry[] = [
      { round: 1, actor: 'player', mobHpAfter: 40 },
      { round: 2, actor: 'mob', mobHpAfter: 50 },
    ];
    expect(resolveMobMaxHp(log)).toBe(50);
  });

  it('returns undefined for empty log', () => {
    expect(resolveMobMaxHp([])).toBeUndefined();
  });
});

describe('formatCombatShareText', () => {
  it('formats full combat share text', () => {
    const input: CombatShareInput = {
      outcome: 'victory',
      mobName: 'Goblin',
      zoneName: 'Dark Forest',
      log: [
        { round: 1, actor: 'player', damage: 10, playerHpAfter: 90, mobHpAfter: 40 },
        { round: 1, actor: 'mob', damage: 5, playerHpAfter: 85, mobHpAfter: 40 },
      ],
      rewards: {
        xp: 100,
        skillXp: { skillType: 'melee', xpAfterEfficiency: 50 },
        loot: [{ itemTemplateId: 'gold-coin', quantity: 10, itemName: 'Gold Coin' }],
      },
      playerMaxHp: 100,
      mobMaxHp: 50,
    };

    const text = formatCombatShareText(input);
    expect(text).toContain('Adventure Combat Log');
    expect(text).toContain('Outcome: victory');
    expect(text).toContain('Mob: Goblin');
    expect(text).toContain('Zone: Dark Forest');
    expect(text).toContain('R1 You 10 dmg');
    expect(text).toContain('XP: 100');
    expect(text).toContain('melee: +50 XP');
    expect(text).toContain('Gold Coin x10');
  });

  it('handles evaded attacks', () => {
    const input: CombatShareInput = {
      outcome: 'victory',
      log: [
        { round: 1, actor: 'mob', evaded: true, playerHpAfter: 100, mobHpAfter: 30 },
      ],
      rewards: { xp: 50, loot: [] },
    };

    const text = formatCombatShareText(input);
    expect(text).toContain('Dodged');
  });

  it('handles misses', () => {
    const input: CombatShareInput = {
      outcome: 'victory',
      log: [
        { round: 1, actor: 'player', roll: 3, playerHpAfter: 100, mobHpAfter: 50 },
      ],
      rewards: { xp: 50, loot: [] },
    };

    const text = formatCombatShareText(input);
    expect(text).toContain('Miss');
  });

  it('handles no loot', () => {
    const input: CombatShareInput = {
      outcome: 'victory',
      log: [],
      rewards: { xp: 50, loot: [] },
    };

    const text = formatCombatShareText(input);
    expect(text).not.toContain('Loot:');
  });

  it('uses itemTemplateId when itemName is null', () => {
    const input: CombatShareInput = {
      outcome: 'victory',
      log: [],
      rewards: {
        xp: 50,
        loot: [{ itemTemplateId: 'tpl-ore', quantity: 1, itemName: null }],
      },
    };

    const text = formatCombatShareText(input);
    expect(text).toContain('tpl-ore');
  });
});
