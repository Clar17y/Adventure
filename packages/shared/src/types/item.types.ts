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
  rarity: ItemRarity;
  currentDurability: number | null;
  maxDurability: number | null;
  quantity: number;
  bonusStats: ItemStats | null;
  createdAt: Date;
}

export type ItemType = 'weapon' | 'armor' | 'resource' | 'consumable';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ItemStats {
  attack?: number;
  magicPower?: number;
  rangedPower?: number;
  accuracy?: number;
  dodge?: number;
  armor?: number;
  health?: number;
  // Legacy field kept for compatibility; treat as dodge in combat/stat aggregation.
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
