import { Prisma, prisma } from '@adventure/database';
import type { CombatPotion, ConsumableEffect, PotionConsumed } from '@adventure/shared';

export async function buildPotionPool(playerId: string, maxHp: number): Promise<CombatPotion[]> {
  const consumables = await prisma.item.findMany({
    where: {
      ownerId: playerId,
      template: { itemType: 'consumable' },
    },
    include: { template: true },
  });

  const potions: CombatPotion[] = [];
  for (const item of consumables) {
    const effect = item.template.consumableEffect as ConsumableEffect | null;
    if (!effect) continue;

    const healAmount = effect.type === 'heal_flat'
      ? effect.value
      : Math.floor(maxHp * effect.value);

    for (let i = 0; i < item.quantity; i++) {
      potions.push({
        name: item.template.name,
        healAmount,
        templateId: item.template.id,
      });
    }
  }
  return potions;
}

export async function deductConsumedPotions(
  playerId: string,
  consumed: PotionConsumed[],
  tx?: Prisma.TransactionClient,
): Promise<void> {
  if (consumed.length === 0) return;

  const db = tx ?? prisma;

  const counts = new Map<string, number>();
  for (const p of consumed) {
    counts.set(p.templateId, (counts.get(p.templateId) ?? 0) + 1);
  }

  for (const [templateId, count] of counts) {
    const item = await db.item.findFirst({
      where: { ownerId: playerId, templateId },
    });
    if (!item) continue;

    if (item.quantity <= count) {
      await db.item.delete({ where: { id: item.id } });
    } else {
      await db.item.update({
        where: { id: item.id },
        data: { quantity: item.quantity - count },
      });
    }
  }
}
