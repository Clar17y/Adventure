import { prisma } from '@adventure/database';
import type { LootDrop } from '@adventure/shared';
import { addStackableItem } from './inventoryService';

function randomIntInclusive(min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

export async function rollAndGrantLoot(
  playerId: string,
  mobTemplateId: string
): Promise<LootDrop[]> {
  const entries = await prisma.dropTable.findMany({
    where: { mobTemplateId },
    include: { itemTemplate: true },
  });

  const drops: LootDrop[] = [];

  for (const entry of entries) {
    const chance = entry.dropChance.toNumber();
    if (chance <= 0) continue;

    if (Math.random() >= chance) continue;

    const quantity = randomIntInclusive(entry.minQuantity, entry.maxQuantity);
    if (quantity <= 0) continue;

    drops.push({ itemTemplateId: entry.itemTemplateId, quantity });

    // Create/merge item instances
    if (entry.itemTemplate.stackable) {
      await addStackableItem(playerId, entry.itemTemplateId, quantity);
      continue;
    }

    const needsDurability = entry.itemTemplate.itemType === 'weapon' || entry.itemTemplate.itemType === 'armor';
    const maxDurability = needsDurability ? entry.itemTemplate.maxDurability : null;

    await prisma.item.create({
      data: {
        ownerId: playerId,
        templateId: entry.itemTemplateId,
        quantity,
        maxDurability,
        currentDurability: maxDurability,
      },
    });
  }

  return drops;
}
