import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@adventure/database', () => import('../__mocks__/database.js'));
import { prisma } from '@adventure/database';
import { incrementStats, incrementFamilyKills, getOrCreateStats } from './statsService';

const mockPrisma = prisma as unknown as Record<string, any>;

describe('statsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateStats', () => {
    it('returns existing stats', async () => {
      const existing = { playerId: 'p1', totalKills: 5 };
      mockPrisma.playerStats.findUnique.mockResolvedValue(existing);

      const result = await getOrCreateStats('p1');
      expect(result).toEqual(existing);
    });

    it('creates stats row if not found', async () => {
      mockPrisma.playerStats.findUnique.mockResolvedValue(null);
      const created = { playerId: 'p1', totalKills: 0 };
      mockPrisma.playerStats.create.mockResolvedValue(created);

      const result = await getOrCreateStats('p1');
      expect(result).toEqual(created);
      expect(mockPrisma.playerStats.create).toHaveBeenCalledWith({
        data: { playerId: 'p1' },
      });
    });
  });

  describe('incrementStats', () => {
    it('upserts stats with increment values', async () => {
      const updated = { playerId: 'p1', totalKills: 6, totalTurnsSpent: 50 };
      mockPrisma.playerStats.upsert.mockResolvedValue(updated);

      const result = await incrementStats('p1', { totalKills: 1, totalTurnsSpent: 50 });
      expect(result).toEqual(updated);
      expect(mockPrisma.playerStats.upsert).toHaveBeenCalledWith({
        where: { playerId: 'p1' },
        create: { playerId: 'p1', totalKills: 1, totalTurnsSpent: 50 },
        update: { totalKills: { increment: 1 }, totalTurnsSpent: { increment: 50 } },
      });
    });
  });

  describe('incrementFamilyKills', () => {
    it('upserts family stats with kill increment', async () => {
      const updated = { playerId: 'p1', mobFamilyId: 'f1', kills: 5 };
      mockPrisma.playerFamilyStats.upsert.mockResolvedValue(updated);

      const result = await incrementFamilyKills('p1', 'f1', 1);
      expect(result).toEqual(updated);
      expect(mockPrisma.playerFamilyStats.upsert).toHaveBeenCalledWith({
        where: { playerId_mobFamilyId: { playerId: 'p1', mobFamilyId: 'f1' } },
        create: { playerId: 'p1', mobFamilyId: 'f1', kills: 1 },
        update: { kills: { increment: 1 } },
      });
    });
  });
});
