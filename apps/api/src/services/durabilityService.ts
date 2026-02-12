import { Prisma, prisma } from '@adventure/database';
import { DURABILITY_CONSTANTS, type DurabilityLoss } from '@adventure/shared';

export async function degradeEquippedDurability(
  playerId: string,
  amount: number = DURABILITY_CONSTANTS.COMBAT_DEGRADATION
): Promise<DurabilityLoss[]> {
  if (!Number.isInteger(amount) || amount <= 0) return [];

  const equipped = await prisma.playerEquipment.findMany({
    where: { playerId, itemId: { not: null } },
    include: {
      item: { include: { template: true } },
    },
  });

  const losses: DurabilityLoss[] = [];
  const uniqueItems = new Map<string, (typeof equipped)[number]['item']>();
  for (const eq of equipped) {
    if (eq.item) uniqueItems.set(eq.item.id, eq.item);
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const item of uniqueItems.values()) {
      if (!item) continue;

      const template = item.template;
      const hasDurability = template.itemType === 'weapon' || template.itemType === 'armor';
      if (!hasDurability) continue;

      const maxDurability = item.maxDurability ?? template.maxDurability;
      const currentDurability = item.currentDurability ?? maxDurability;

      // Normalize persisted values if missing
      if (item.maxDurability === null || item.currentDurability === null) {
        await tx.item.update({
          where: { id: item.id },
          data: {
            maxDurability,
            currentDurability,
          },
        });
      }

      const newCurrent = Math.max(0, currentDurability - amount);

      const wasBroken = currentDurability <= 0;
      const nowBroken = newCurrent <= 0;
      const warningThreshold = maxDurability * DURABILITY_CONSTANTS.WARNING_THRESHOLD;
      const crossedWarning =
        !nowBroken &&
        currentDurability > warningThreshold &&
        newCurrent <= warningThreshold;

      losses.push({
        itemId: item.id,
        amount,
        itemName: template.name,
        newDurability: newCurrent,
        maxDurability,
        isBroken: nowBroken && !wasBroken,
        crossedWarningThreshold: crossedWarning,
      });

      if (newCurrent === currentDurability) continue;

      await tx.item.update({
        where: { id: item.id },
        data: { currentDurability: newCurrent },
      });
    }
  });

  return losses;
}
