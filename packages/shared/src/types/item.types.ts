import { EquipmentSlot, SkillType } from './player.types';

export interface ItemTemplate {
  id: string;
  name: string;
  itemType: ItemType;
  slot: EquipmentSlot | null;
  tier: number;
  baseStats: ItemStats;
  requiredSkill: SkillType | null;
  requiredLevel: number;
  maxDurability: number;
  stackable: boolean;
}

export interface Item {
  id: string;
  templateId: string;
  ownerId: string;
  currentDurability: number | null;
  maxDurability: number | null;
  quantity: number;
  bonusStats: ItemStats | null;
  createdAt: Date;
}

export type ItemType = 'weapon' | 'armor' | 'resource' | 'consumable';

export interface ItemStats {
  attack?: number;
  magicPower?: number;
  rangedPower?: number;
  armor?: number;
  health?: number;
  evasion?: number;
  luck?: number;
}

export interface DropTableEntry {
  id: string;
  mobTemplateId: string;
  itemTemplateId: string;
  dropChance: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface CraftingRecipe {
  id: string;
  skillType: SkillType;
  requiredLevel: number;
  resultTemplateId: string;
  turnCost: number;
  materials: CraftingMaterial[];
  xpReward: number;
}

export interface CraftingMaterial {
  templateId: string;
  quantity: number;
}
