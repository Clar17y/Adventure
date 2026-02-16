import { describe, it, expect } from 'vitest';
import { resolveBossRoundLogic, type BossRoundInput } from './bossRoundResolver';

function makeInput(overrides: Partial<BossRoundInput> = {}): BossRoundInput {
  return {
    bossHp: 1000,
    bossMaxHp: 1000,
    boss: { defence: 10, magicDefence: 5, dodge: 5, aoeDamage: 50, avgParticipantDefence: 10 },
    attackers: [],
    healers: [],
    raidPool: 500,
    raidPoolMax: 500,
    ...overrides,
  };
}

describe('resolveBossRoundLogic', () => {
  it('returns no damage when no attackers', () => {
    const result = resolveBossRoundLogic(makeInput(), () => 1);
    expect(result.bossHpAfter).toBe(1000);
    expect(result.bossDefeated).toBe(false);
    expect(result.raidWiped).toBe(false);
  });

  it('boss deals poolDamage = aoeDamage - avgDefence', () => {
    const result = resolveBossRoundLogic(makeInput(), () => 1); // all miss
    expect(result.poolDamageTaken).toBe(40); // 50 - 10
    expect(result.raidPoolAfter).toBe(460);
  });

  it('boss defeated when HP reaches 0', () => {
    const input = makeInput({
      bossHp: 5,
      attackers: [{
        playerId: 'p1',
        stats: {
          hp: 100, maxHp: 100, attack: 50, accuracy: 100, speed: 10,
          damageMin: 50, damageMax: 50, damageType: 'physical',
          critChance: 0, critDamage: 0, defence: 0, magicDefence: 0, dodge: 0,
          evasion: 0,
        },
      }],
    });
    const result = resolveBossRoundLogic(input, () => 20); // guaranteed hit
    expect(result.bossDefeated).toBe(true);
    expect(result.poolDamageTaken).toBe(0); // boss dead, no AOE
  });

  it('raid wipes when pool reaches 0', () => {
    const input = makeInput({ raidPool: 30 }); // 30 < 40 pool damage
    const result = resolveBossRoundLogic(input, () => 1);
    expect(result.raidWiped).toBe(true);
    expect(result.raidPoolAfter).toBe(0);
  });

  it('healers restore pool HP capped at max', () => {
    const input = makeInput({
      raidPool: 400,
      raidPoolMax: 500,
      healers: [{ playerId: 'h1', healAmount: 200 }],
    });
    const result = resolveBossRoundLogic(input, () => 1); // miss, boss deals 40 AOE
    // Pool after AOE: 400 - 40 = 360. Healer heals min(200, 500-360) = 140
    expect(result.raidPoolAfter).toBe(500);
    expect(result.healerResults[0]!.healAmount).toBe(140);
  });
});
