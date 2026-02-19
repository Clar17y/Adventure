import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@adventure/database', () => import('../__mocks__/database.js'));
import { prisma } from '@adventure/database';
import { checkAchievements, claimReward, setActiveTitle, getPlayerAchievements } from './achievementService';

const mockPrisma = prisma as unknown as Record<string, any>;

describe('achievementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAchievements', () => {
    it('returns empty when no achievements are newly met', async () => {
      mockPrisma.playerStats.findUnique.mockResolvedValue({ playerId: 'p1', totalKills: 5 });
      mockPrisma.playerFamilyStats.findMany.mockResolvedValue([]);
      mockPrisma.playerAchievement.findMany.mockResolvedValue([]);

      const result = await checkAchievements('p1', { statKeys: ['totalKills'] });
      expect(result).toEqual([]);
    });

    it('unlocks achievement when threshold met', async () => {
      mockPrisma.playerStats.findUnique.mockResolvedValue({ playerId: 'p1', totalKills: 100 });
      mockPrisma.playerFamilyStats.findMany.mockResolvedValue([]);
      mockPrisma.playerAchievement.findMany.mockResolvedValue([]);
      mockPrisma.playerAchievement.create.mockResolvedValue({
        playerId: 'p1',
        achievementId: 'combat_kills_100',
        rewardClaimed: false,
      });

      const result = await checkAchievements('p1', { statKeys: ['totalKills'] });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe('combat_kills_100');
    });

    it('skips already-unlocked achievements', async () => {
      mockPrisma.playerStats.findUnique.mockResolvedValue({ playerId: 'p1', totalKills: 100 });
      mockPrisma.playerFamilyStats.findMany.mockResolvedValue([]);
      mockPrisma.playerAchievement.findMany.mockResolvedValue([
        { playerId: 'p1', achievementId: 'combat_kills_100', rewardClaimed: false },
      ]);

      const result = await checkAchievements('p1', { statKeys: ['totalKills'] });
      expect(result).toEqual([]);
    });

    it('checks family achievements when familyId provided', async () => {
      mockPrisma.playerStats.findUnique.mockResolvedValue({ playerId: 'p1', totalKills: 1 });
      mockPrisma.playerFamilyStats.findMany.mockResolvedValue([
        { playerId: 'p1', mobFamilyId: 'wolves-id', kills: 100 },
      ]);
      mockPrisma.mobFamily.findUnique.mockResolvedValue({ id: 'wolves-id', name: 'Wolves' });
      mockPrisma.playerAchievement.findMany.mockResolvedValue([]);
      mockPrisma.playerAchievement.create.mockResolvedValue({
        playerId: 'p1',
        achievementId: 'family_wolves_100',
        rewardClaimed: false,
      });

      const result = await checkAchievements('p1', { statKeys: ['totalKills'], familyId: 'wolves-id' });
      expect(result.some((a) => a.id === 'family_wolves_100')).toBe(true);
    });
  });

  describe('claimReward', () => {
    it('marks achievement as claimed and returns rewards', async () => {
      mockPrisma.playerAchievement.findUnique.mockResolvedValue({
        playerId: 'p1',
        achievementId: 'combat_kills_1000',
        rewardClaimed: false,
      });
      mockPrisma.playerAchievement.update.mockResolvedValue({
        playerId: 'p1',
        achievementId: 'combat_kills_1000',
        rewardClaimed: true,
      });
      mockPrisma.player.update.mockResolvedValue({});

      const result = await claimReward('p1', 'combat_kills_1000');
      expect(result.success).toBe(true);
      expect(result.rewards).toBeDefined();
    });

    it('throws if achievement not unlocked', async () => {
      mockPrisma.playerAchievement.findUnique.mockResolvedValue(null);

      await expect(claimReward('p1', 'combat_kills_1000')).rejects.toThrow();
    });

    it('throws if reward already claimed', async () => {
      mockPrisma.playerAchievement.findUnique.mockResolvedValue({
        playerId: 'p1',
        achievementId: 'combat_kills_1000',
        rewardClaimed: true,
      });

      await expect(claimReward('p1', 'combat_kills_1000')).rejects.toThrow();
    });
  });

  describe('setActiveTitle', () => {
    it('sets active title from unlocked achievement', async () => {
      mockPrisma.playerAchievement.findUnique.mockResolvedValue({
        playerId: 'p1',
        achievementId: 'combat_kills_500',
      });
      mockPrisma.player.update.mockResolvedValue({ activeTitle: 'combat_kills_500' });

      const result = await setActiveTitle('p1', 'combat_kills_500');
      expect(result.activeTitle).toBe('combat_kills_500');
    });

    it('clears title when null passed', async () => {
      mockPrisma.player.update.mockResolvedValue({ activeTitle: null });

      const result = await setActiveTitle('p1', null);
      expect(result.activeTitle).toBeNull();
    });

    it('throws if achievement not unlocked', async () => {
      mockPrisma.playerAchievement.findUnique.mockResolvedValue(null);

      await expect(setActiveTitle('p1', 'combat_kills_500')).rejects.toThrow();
    });
  });
});
