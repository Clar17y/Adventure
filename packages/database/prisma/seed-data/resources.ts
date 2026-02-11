import { randomUUID } from 'crypto';
import { IDS } from './ids';

const z = IDS.zones;

type ResNode = {
  zoneId: string;
  resourceType: string;
  skillRequired: string;
  levelRequired: number;
  baseYield: number;
  discoveryChance: number;
  minCapacity: number;
  maxCapacity: number;
  discoveryWeight?: number;
};

function rn(r: ResNode) {
  return {
    id: randomUUID(),
    zoneId: r.zoneId,
    resourceType: r.resourceType,
    skillRequired: r.skillRequired,
    levelRequired: r.levelRequired,
    baseYield: r.baseYield,
    discoveryChance: r.discoveryChance,
    minCapacity: r.minCapacity,
    maxCapacity: r.maxCapacity,
    discoveryWeight: r.discoveryWeight ?? 100,
  };
}

export function getAllResourceNodes() {
  return [
    // Forest Edge (diff 1) — skill req 1
    rn({ zoneId: z.forestEdge, resourceType: 'Copper Ore', skillRequired: 'mining', levelRequired: 1, baseYield: 1, discoveryChance: 0.35, minCapacity: 15, maxCapacity: 80 }),
    rn({ zoneId: z.forestEdge, resourceType: 'Oak Log', skillRequired: 'mining', levelRequired: 1, baseYield: 1, discoveryChance: 0.35, minCapacity: 15, maxCapacity: 80 }),
    rn({ zoneId: z.forestEdge, resourceType: 'Forest Sage', skillRequired: 'mining', levelRequired: 1, baseYield: 1, discoveryChance: 0.25, minCapacity: 15, maxCapacity: 80 }),

    // Deep Forest (diff 2) — skill req 5
    rn({ zoneId: z.deepForest, resourceType: 'Tin Ore', skillRequired: 'mining', levelRequired: 5, baseYield: 1, discoveryChance: 0.30, minCapacity: 20, maxCapacity: 100 }),
    rn({ zoneId: z.deepForest, resourceType: 'Maple Log', skillRequired: 'mining', levelRequired: 5, baseYield: 1, discoveryChance: 0.30, minCapacity: 20, maxCapacity: 100 }),
    rn({ zoneId: z.deepForest, resourceType: 'Moonpetal', skillRequired: 'mining', levelRequired: 5, baseYield: 1, discoveryChance: 0.20, minCapacity: 20, maxCapacity: 100 }),

    // Cave Entrance (diff 2) — skill req 5
    rn({ zoneId: z.caveEntrance, resourceType: 'Tin Ore', skillRequired: 'mining', levelRequired: 5, baseYield: 1, discoveryChance: 0.30, minCapacity: 20, maxCapacity: 100 }),
    rn({ zoneId: z.caveEntrance, resourceType: 'Fungal Wood', skillRequired: 'mining', levelRequired: 5, baseYield: 1, discoveryChance: 0.25, minCapacity: 20, maxCapacity: 100 }),
    rn({ zoneId: z.caveEntrance, resourceType: 'Cave Moss', skillRequired: 'mining', levelRequired: 5, baseYield: 1, discoveryChance: 0.20, minCapacity: 20, maxCapacity: 100 }),

    // Ancient Grove (diff 3, dead end) — no mining — skill req 12
    rn({ zoneId: z.ancientGrove, resourceType: 'Elderwood Log', skillRequired: 'mining', levelRequired: 12, baseYield: 1, discoveryChance: 0.25, minCapacity: 25, maxCapacity: 120 }),
    rn({ zoneId: z.ancientGrove, resourceType: 'Starbloom', skillRequired: 'mining', levelRequired: 12, baseYield: 1, discoveryChance: 0.20, minCapacity: 25, maxCapacity: 120 }),

    // Deep Mines (diff 3, dead end) — no woodcutting — skill req 12
    rn({ zoneId: z.deepMines, resourceType: 'Iron Ore', skillRequired: 'mining', levelRequired: 12, baseYield: 1, discoveryChance: 0.25, minCapacity: 25, maxCapacity: 120 }),
    rn({ zoneId: z.deepMines, resourceType: 'Glowcap Mushroom', skillRequired: 'mining', levelRequired: 12, baseYield: 1, discoveryChance: 0.20, minCapacity: 25, maxCapacity: 120 }),

    // Whispering Plains (diff 3) — skill req 12
    rn({ zoneId: z.whisperingPlains, resourceType: 'Sandstone', skillRequired: 'mining', levelRequired: 12, baseYield: 1, discoveryChance: 0.25, minCapacity: 25, maxCapacity: 120 }),
    rn({ zoneId: z.whisperingPlains, resourceType: 'Willow Log', skillRequired: 'mining', levelRequired: 12, baseYield: 1, discoveryChance: 0.25, minCapacity: 25, maxCapacity: 120 }),
    rn({ zoneId: z.whisperingPlains, resourceType: 'Windbloom', skillRequired: 'mining', levelRequired: 12, baseYield: 1, discoveryChance: 0.20, minCapacity: 25, maxCapacity: 120 }),

    // Haunted Marsh (diff 4) — skill req 20
    rn({ zoneId: z.hauntedMarsh, resourceType: 'Dark Iron Ore', skillRequired: 'mining', levelRequired: 20, baseYield: 1, discoveryChance: 0.20, minCapacity: 30, maxCapacity: 150 }),
    rn({ zoneId: z.hauntedMarsh, resourceType: 'Bogwood Log', skillRequired: 'mining', levelRequired: 20, baseYield: 1, discoveryChance: 0.20, minCapacity: 30, maxCapacity: 150 }),
    rn({ zoneId: z.hauntedMarsh, resourceType: 'Gravemoss', skillRequired: 'mining', levelRequired: 20, baseYield: 1, discoveryChance: 0.15, minCapacity: 30, maxCapacity: 150 }),

    // Crystal Caverns (diff 4) — skill req 20
    rn({ zoneId: z.crystalCaverns, resourceType: 'Mithril Ore', skillRequired: 'mining', levelRequired: 20, baseYield: 1, discoveryChance: 0.20, minCapacity: 30, maxCapacity: 150 }),
    rn({ zoneId: z.crystalCaverns, resourceType: 'Crystal Wood', skillRequired: 'mining', levelRequired: 20, baseYield: 1, discoveryChance: 0.20, minCapacity: 30, maxCapacity: 150 }),
    rn({ zoneId: z.crystalCaverns, resourceType: 'Shimmer Fern', skillRequired: 'mining', levelRequired: 20, baseYield: 1, discoveryChance: 0.15, minCapacity: 30, maxCapacity: 150 }),

    // Sunken Ruins (diff 5) — skill req 30
    rn({ zoneId: z.sunkenRuins, resourceType: 'Ancient Ore', skillRequired: 'mining', levelRequired: 30, baseYield: 1, discoveryChance: 0.15, minCapacity: 40, maxCapacity: 200 }),
    rn({ zoneId: z.sunkenRuins, resourceType: 'Petrified Wood', skillRequired: 'mining', levelRequired: 30, baseYield: 1, discoveryChance: 0.15, minCapacity: 40, maxCapacity: 200 }),
    rn({ zoneId: z.sunkenRuins, resourceType: 'Abyssal Kelp', skillRequired: 'mining', levelRequired: 30, baseYield: 1, discoveryChance: 0.12, minCapacity: 40, maxCapacity: 200 }),
  ];
}
