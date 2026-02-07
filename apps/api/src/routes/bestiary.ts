import { Router } from 'express';
import { prisma } from '@adventure/database';
import { getMobPrefixDefinition } from '@adventure/shared';
import { authenticate } from '../middleware/auth';

export const bestiaryRouter = Router();

bestiaryRouter.use(authenticate);
const prismaAny = prisma as unknown as any;

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

    const [mobTemplates, progress, prefixProgress] = await Promise.all([
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
      prismaAny.playerBestiaryPrefix.findMany({
        where: { playerId },
        select: { mobTemplateId: true, prefix: true, kills: true },
      }),
    ]);

    const killsByMobId = new Map<string, number>();
    for (const p of progress) killsByMobId.set(p.mobTemplateId, p.kills);
    const prefixesByMobId = new Map<string, Array<{ prefix: string; displayName: string; kills: number }>>();
    for (const prefixEntry of prefixProgress as Array<{ mobTemplateId: string; prefix: string; kills: number }>) {
      const definition = getMobPrefixDefinition(prefixEntry.prefix);
      const prefixEncounters = prefixesByMobId.get(prefixEntry.mobTemplateId) ?? [];
      prefixEncounters.push({
        prefix: prefixEntry.prefix,
        displayName: definition?.displayName ?? prefixEntry.prefix,
        kills: prefixEntry.kills,
      });
      prefixesByMobId.set(prefixEntry.mobTemplateId, prefixEncounters);
    }

    res.json({
      mobs: mobTemplates.map((mob: typeof mobTemplates[number]) => {
        const kills = killsByMobId.get(mob.id) ?? 0;
        const prefixEncounters = (prefixesByMobId.get(mob.id) ?? [])
          .sort((a, b) => b.kills - a.kills || a.displayName.localeCompare(b.displayName));
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
          drops: mob.dropTables.map((dt: typeof mob.dropTables[number]) => ({
            item: dt.itemTemplate,
            rarity: rarityFromTier(dt.itemTemplate.tier),
            dropRate: Math.round(Number(dt.dropChance) * 10000) / 100,
            minQuantity: dt.minQuantity,
            maxQuantity: dt.maxQuantity,
          })),
          prefixEncounters,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

