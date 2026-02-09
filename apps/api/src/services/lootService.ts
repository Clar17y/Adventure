import { Prisma, prisma } from '@adventure/database';
import { rollBonusStatsForRarity, rollDropRarity } from '@adventure/game-engine';
import type { EquipmentSlot, ItemStats, ItemType, LootDrop } from '@adventure/shared';
import { addStackableItem } from './inventoryService';

function randomIntInclusive(min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

export async function rollAndGrantLoot(
  playerId: string,
  mobTemplateId: string,
  mobLevel: number,
  dropChanceMultiplier = 1
): Promise<LootDrop[]> {
  const entries = await prisma.dropTable.findMany({
    where: { mobTemplateId },
    include: { itemTemplate: true },
  });

  const drops: LootDrop[] = [];

  for (const entry of entries) {
    const chance = Math.min(1, Math.max(0, entry.dropChance.toNumber()));
    if (chance <= 0) continue;

    if (Math.random() >= chance) continue;

    const quantity = randomIntInclusive(entry.minQuantity, entry.maxQuantity);
    if (quantity <= 0) continue;

    // Create/merge item instances
    if (entry.itemTemplate.stackable) {
      await addStackableItem(playerId, entry.itemTemplateId, quantity);
      drops.push({ itemTemplateId: entry.itemTemplateId, quantity, rarity: 'common' });
      continue;
    }

    const itemType = entry.itemTemplate.itemType as ItemType;
    const isEquipment = itemType === 'weapon' || itemType === 'armor';
    const needsDurability = isEquipment;
    const maxDurability = needsDurability ? entry.itemTemplate.maxDurability : null;
    const templateBaseStats = entry.itemTemplate.baseStats as ItemStats | null | undefined;

    for (let i = 0; i < quantity; i++) {
      const rarity = isEquipment
        ? rollDropRarity(mobLevel, dropChanceMultiplier)
        : 'common';
      const templateSlot = entry.itemTemplate.slot as EquipmentSlot | null;
      const bonusStats = isEquipment
        ? rollBonusStatsForRarity({
            itemType,
            rarity,
            baseStats: templateBaseStats,
            slot: templateSlot,
          })
        : null;

      await prisma.item.create({
        data: {
          ownerId: playerId,
          templateId: entry.itemTemplateId,
          rarity,
          quantity: 1,
          maxDurability,
          currentDurability: maxDurability,
          bonusStats: bonusStats ? (bonusStats as Prisma.InputJsonObject) : undefined,
        } as any,
      });

      drops.push({ itemTemplateId: entry.itemTemplateId, quantity: 1, rarity });
    }
  }

  return drops;
}
