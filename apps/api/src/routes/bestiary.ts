import { Router } from 'express';
import { prisma } from '@adventure/database';
import { authenticate } from '../middleware/auth';

export const bestiaryRouter = Router();

bestiaryRouter.use(authenticate);

function rarityFromTier(tier: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
  if (tier >= 5) return 'legendary';
  if (tier === 4) return 'epic';
  if (tier === 3) return 'rare';
  if (tier === 2) return 'uncommon';
  return 'common';
}

/**
 * GET /api/v1/bestiary
 * List all mob templates, with the player's kill counts (discovery).
 */
bestiaryRouter.get('/', async (req, res, next) => {
  try {
    const playerId = req.player!.playerId;

    const [mobTemplates, progress] = await Promise.all([
      prisma.mobTemplate.findMany({
        include: {
          zone: { select: { id: true, name: true, difficulty: true } },
          dropTables: {
            include: {
              itemTemplate: { select: { id: true, name: true, itemType: true, tier: true } },
            },
          },
        },
        orderBy: [{ zoneId: 'asc' }, { name: 'asc' }],
      }),
      prisma.playerBestiary.findMany({
        where: { playerId },
        select: { mobTemplateId: true, kills: true },
      }),
    ]);

    const killsByMobId = new Map<string, number>();
    for (const p of progress) killsByMobId.set(p.mobTemplateId, p.kills);

    res.json({
      mobs: mobTemplates.map((mob) => {
        const kills = killsByMobId.get(mob.id) ?? 0;
        return {
          id: mob.id,
          name: mob.name,
          level: Math.max(1, mob.zone.difficulty * 5),
          isDiscovered: kills > 0,
          killCount: kills,
          stats: {
            hp: mob.hp,
            attack: mob.attack,
            defence: mob.defence,
          },
          zones: [mob.zone.name],
          description: `A creature found in ${mob.zone.name}.`,
          drops: mob.dropTables.map((dt) => ({
            item: dt.itemTemplate,
            rarity: rarityFromTier(dt.itemTemplate.tier),
            dropRate: Math.round(Number(dt.dropChance) * 10000) / 100,
            minQuantity: dt.minQuantity,
            maxQuantity: dt.maxQuantity,
          })),
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

