import type { WorldEventEffectType, WorldEventType } from '../types/worldEvent.types';

export interface WorldEventTemplate {
  type: WorldEventType;
  title: string;
  description: string;
  effectType: WorldEventEffectType;
  effectValue: number;
  /** If set, only spawn in zones matching this type */
  zoneType?: 'wild' | 'town';
  weight: number;
}

export const WORLD_EVENT_TEMPLATES: WorldEventTemplate[] = [
  // Resource events
  {
    type: 'resource',
    title: 'Bountiful Harvest',
    description: 'Resources in this zone yield more than usual.',
    effectType: 'yield_up',
    effectValue: 0.5,
    zoneType: 'wild',
    weight: 30,
  },
  {
    type: 'resource',
    title: 'Rich Veins',
    description: 'Rare materials are easier to find here.',
    effectType: 'drop_rate_up',
    effectValue: 0.3,
    zoneType: 'wild',
    weight: 20,
  },
  // Mob events
  {
    type: 'mob',
    title: 'Frenzy',
    description: 'Monsters in this zone deal increased damage.',
    effectType: 'damage_up',
    effectValue: 0.25,
    zoneType: 'wild',
    weight: 20,
  },
  {
    type: 'mob',
    title: 'Weakened Foes',
    description: 'Monsters in this zone have reduced health.',
    effectType: 'hp_down',
    effectValue: 0.2,
    zoneType: 'wild',
    weight: 20,
  },
  {
    type: 'mob',
    title: 'Swarming',
    description: 'More monsters roam this zone.',
    effectType: 'spawn_rate_up',
    effectValue: 0.5,
    zoneType: 'wild',
    weight: 15,
  },
  {
    type: 'mob',
    title: 'Fortified Beasts',
    description: 'Monsters in this zone have more health than usual.',
    effectType: 'hp_up',
    effectValue: 0.3,
    zoneType: 'wild',
    weight: 15,
  },
];
