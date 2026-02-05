import { prisma } from '@adventure/database';
import { AppError } from '../middleware/errorHandler';

export async function addStackableItem(
  playerId: string,
  itemTemplateId: string,
  quantity: number
): Promise<{ itemId: string; quantity: number }> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError(400, 'Quantity must be a positive integer', 'INVALID_QUANTITY');
  }

  const template = await prisma.itemTemplate.findUnique({ where: { id: itemTemplateId } });
  if (!template) {
    throw new AppError(404, 'Item template not found', 'NOT_FOUND');
  }

  if (!template.stackable) {
    throw new AppError(400, 'Template is not stackable', 'NOT_STACKABLE');
  }

  const existing = await prisma.item.findFirst({
    where: { ownerId: playerId, templateId: itemTemplateId },
    select: { id: true, quantity: true },
  });

  if (existing) {
    const updated = await prisma.item.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
      select: { id: true, quantity: true },
    });
    return { itemId: updated.id, quantity: updated.quantity };
  }

  const created = await prisma.item.create({
    data: {
      ownerId: playerId,
      templateId: itemTemplateId,
      quantity,
      maxDurability: null,
      currentDurability: null,
    },
    select: { id: true, quantity: true },
  });
  return { itemId: created.id, quantity: created.quantity };
}

export async function getTotalQuantityByTemplate(
  playerId: string,
  itemTemplateId: string
): Promise<number> {
  const items = await prisma.item.findMany({
    where: { ownerId: playerId, templateId: itemTemplateId },
    select: { quantity: true },
  });
  return items.reduce((sum: number, item: typeof items[number]) => sum + item.quantity, 0);
}

export async function consumeItemsByTemplate(
  playerId: string,
  itemTemplateId: string,
  quantity: number
): Promise<void> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError(400, 'Quantity must be a positive integer', 'INVALID_QUANTITY');
  }

  const items = await prisma.item.findMany({
    where: { ownerId: playerId, templateId: itemTemplateId },
    orderBy: [{ createdAt: 'asc' }],
    select: { id: true, quantity: true },
  });

  let remaining = quantity;
  for (const item of items) {
    if (remaining <= 0) break;
    if (item.quantity > remaining) {
      await prisma.item.update({
        where: { id: item.id },
        data: { quantity: item.quantity - remaining },
      });
      remaining = 0;
      break;
    }

    remaining -= item.quantity;
    await prisma.item.delete({ where: { id: item.id } });
  }

  if (remaining > 0) {
    throw new AppError(400, 'Insufficient materials', 'INSUFFICIENT_ITEMS');
  }
}

