import { prisma } from '@adventure/database';
import type { EquipmentSlot, SkillType } from '@adventure/shared';
import { ALL_EQUIPMENT_SLOTS, COMBAT_SKILLS, CRAFTING_SKILLS, GATHERING_SKILLS } from '@adventure/shared';
import { AppError } from '../middleware/errorHandler';

export interface EquipmentStats {
  attack: number;
  armor: number;
  health: number;
  evasion: number;
  luck: number;
}

export function isSkillType(value: string): value is SkillType {
  return (
    COMBAT_SKILLS.includes(value as SkillType) ||
    GATHERING_SKILLS.includes(value as SkillType) ||
    CRAFTING_SKILLS.includes(value as SkillType)
  );
}

export async function ensureEquipmentSlots(playerId: string): Promise<void> {
  const existing = await prisma.playerEquipment.findMany({
    where: { playerId },
    select: { slot: true },
  });

  const existingSlots = new Set(existing.map((e: typeof existing[number]) => e.slot));
  const missing = ALL_EQUIPMENT_SLOTS.filter((slot) => !existingSlots.has(slot));
  if (missing.length === 0) return;

  await prisma.playerEquipment.createMany({
    data: missing.map((slot) => ({ playerId, slot, itemId: null })),
  });
}

export async function getEquipmentStats(playerId: string): Promise<EquipmentStats> {
  const equipped = await prisma.playerEquipment.findMany({
    where: { playerId, itemId: { not: null } },
    include: {
      item: {
        include: { template: true },
      },
    },
  });

  let attack = 0;
  let armor = 0;
  let health = 0;
  let evasion = 0;
  let luck = 0;

  for (const slot of equipped) {
    const baseStats = slot.item?.template?.baseStats as Record<string, unknown> | null | undefined;
    const bonusStats = slot.item?.bonusStats as Record<string, unknown> | null | undefined;
    const statSources = [baseStats, bonusStats];

    for (const stats of statSources) {
      if (!stats) continue;
      if (typeof stats.attack === 'number') attack += stats.attack;
      if (typeof stats.armor === 'number') armor += stats.armor;
      if (typeof stats.health === 'number') health += stats.health;
      if (typeof stats.evasion === 'number') evasion += stats.evasion;
      if (typeof stats.luck === 'number') luck += stats.luck;
    }
  }

  return { attack, armor, health, evasion, luck };
}

export async function equipItem(
  playerId: string,
  itemId: string,
  slot: EquipmentSlot
): Promise<void> {
  await ensureEquipmentSlots(playerId);

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { template: true },
  });

  if (!item || item.ownerId !== playerId) {
    throw new AppError(404, 'Item not found', 'NOT_FOUND');
  }

  if (item.template.itemType !== 'weapon' && item.template.itemType !== 'armor') {
    throw new AppError(400, 'Only weapons/armor can be equipped', 'INVALID_ITEM_TYPE');
  }

  if (!item.template.slot) {
    throw new AppError(400, 'Item is not equipable', 'NOT_EQUIPABLE');
  }

  if (item.template.slot !== slot) {
    throw new AppError(400, `Item must be equipped in slot ${item.template.slot}`, 'INVALID_SLOT');
  }

  if (item.quantity !== 1) {
    throw new AppError(400, 'Cannot equip stacked items', 'INVALID_STACK');
  }

  // Validate requirements
  if (item.template.requiredSkill) {
    if (!isSkillType(item.template.requiredSkill)) {
      throw new AppError(400, 'Item template has invalid requiredSkill', 'INVALID_TEMPLATE');
    }

    const skill = await prisma.playerSkill.findUnique({
      where: {
        playerId_skillType: { playerId, skillType: item.template.requiredSkill },
      },
      select: { level: true },
    });

    const level = skill?.level ?? 1;
    if (level < item.template.requiredLevel) {
      throw new AppError(400, 'Insufficient skill level to equip item', 'INSUFFICIENT_LEVEL');
    }
  }

  // Ensure the item isn't equipped in another slot (same player)
  await prisma.playerEquipment.updateMany({
    where: { playerId, itemId },
    data: { itemId: null },
  });

  await prisma.playerEquipment.upsert({
    where: { playerId_slot: { playerId, slot } },
    create: { playerId, slot, itemId },
    update: { itemId },
  });
}

export async function unequipSlot(playerId: string, slot: EquipmentSlot): Promise<void> {
  await ensureEquipmentSlots(playerId);

  await prisma.playerEquipment.update({
    where: { playerId_slot: { playerId, slot } },
    data: { itemId: null },
  });
}

