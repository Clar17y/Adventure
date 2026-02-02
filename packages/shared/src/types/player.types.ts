export interface Player {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  lastActiveAt: Date | null;
}

export interface TurnBank {
  playerId: string;
  currentTurns: number;
  lastRegenAt: Date;
}

export interface PlayerSkill {
  id: string;
  playerId: string;
  skillType: SkillType;
  level: number;
  xp: number;
  dailyXpGained: number;
  lastXpResetAt: Date;
}

export type SkillType =
  | 'melee'
  | 'ranged'
  | 'magic'
  | 'defence'
  | 'vitality'
  | 'evasion'
  | 'mining'
  | 'weaponsmithing';

export const COMBAT_SKILLS: SkillType[] = ['melee', 'ranged', 'magic', 'defence', 'vitality', 'evasion'];
export const GATHERING_SKILLS: SkillType[] = ['mining'];
export const CRAFTING_SKILLS: SkillType[] = ['weaponsmithing'];

export interface PlayerEquipment {
  playerId: string;
  slot: EquipmentSlot;
  itemId: string | null;
}

export type EquipmentSlot =
  | 'head'
  | 'neck'
  | 'chest'
  | 'gloves'
  | 'belt'
  | 'legs'
  | 'boots'
  | 'main_hand'
  | 'off_hand'
  | 'ring'
  | 'charm';

export const ALL_EQUIPMENT_SLOTS: EquipmentSlot[] = [
  'head',
  'neck',
  'chest',
  'gloves',
  'belt',
  'legs',
  'boots',
  'main_hand',
  'off_hand',
  'ring',
  'charm',
];
