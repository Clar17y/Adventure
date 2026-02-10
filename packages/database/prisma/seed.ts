import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const prismaAny = prisma as unknown as any;

const IDS = {
  zones: {
    forestEdge: '11111111-1111-1111-1111-111111111111',
    deepForest: '22222222-2222-2222-2222-222222222222',
  },
  mobs: {
    forestRat: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    wildBoar: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    forestWolf: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    forestSpider: 'dddddddd-1111-1111-1111-111111111111',
    woodlandBandit: 'dddddddd-2222-2222-2222-222222222222',
    forestBear: 'dddddddd-3333-3333-3333-333333333333',
    darkTreant: 'dddddddd-4444-4444-4444-444444444444',
    forestSprite: 'dddddddd-5555-5555-5555-555555555555',
  },
  mobFamilies: {
    forestCritters: 'b0b0b0b0-1111-1111-1111-111111111111',
    forestBandits: 'b0b0b0b0-2222-2222-2222-222222222222',
    deepWilds: 'b0b0b0b0-3333-3333-3333-333333333333',
    deepSpirits: 'b0b0b0b0-4444-4444-4444-444444444444',
  },
  items: {
    copperOre: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    woodenSword: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    leatherCap: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    forestSage: 'abababab-1111-1111-1111-111111111111',
    moonpetal: 'abababab-2222-2222-2222-222222222222',
    oakLog: 'abababab-3333-3333-3333-333333333333',
    mapleLog: 'abababab-4444-4444-4444-444444444444',
    minorHealthPotion: 'abababab-5555-5555-5555-555555555555',
    healthPotion: 'abababab-6666-6666-6666-666666666666',
    oakShortbow: 'abababab-7777-7777-7777-777777777777',
    oakStaff: 'abababab-8888-8888-8888-888888888888',
    ratTail: 'acacacac-1111-1111-1111-111111111111',
    boarTusk: 'acacacac-2222-2222-2222-222222222222',
    spiderSilk: 'acacacac-3333-3333-3333-333333333333',
    banditsPouch: 'acacacac-4444-4444-4444-444444444444',
    wolfPelt: 'acacacac-5555-5555-5555-555555555555',
    bearHide: 'acacacac-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    wolfFang: 'acacacac-6666-6666-6666-666666666666',
    bearClaw: 'acacacac-7777-7777-7777-777777777777',
    ancientBark: 'acacacac-8888-8888-8888-888888888888',
    spriteDust: 'acacacac-9999-9999-9999-999999999999',
    copperIngot: 'aeaeaeae-1111-1111-1111-111111111111',
    ironIngot: 'aeaeaeae-2222-2222-2222-222222222222',
    oakPlank: 'aeaeaeae-3333-3333-3333-333333333333',
    maplePlank: 'aeaeaeae-4444-4444-4444-444444444444',
    wolfLeather: 'aeaeaeae-5555-5555-5555-555555555555',
    bearLeather: 'aeaeaeae-6666-6666-6666-666666666666',
    silkCloth: 'aeaeaeae-7777-7777-7777-777777777777',
    ironPlateCuirass: 'aeaeaeae-8888-8888-8888-888888888888',
    copperDagger: 'adadadad-1111-1111-1111-111111111111',
    boarTuskMace: 'adadadad-2222-2222-2222-222222222222',
    spiderSilkRobe: 'adadadad-3333-3333-3333-333333333333',
    wolfFangDagger: 'adadadad-4444-4444-4444-444444444444',
    antivenomPotion: 'adadadad-5555-5555-5555-555555555555',
    bearHideVest: 'adadadad-6666-6666-6666-666666666666',
    ancientStaff: 'adadadad-7777-7777-7777-777777777777',
  },
  resourceNodes: {
    copperNodeForestEdge: '99999999-9999-9999-9999-999999999999',
    ironNodeDeepForest: '99999999-8888-8888-8888-888888888888',
    forestSageForestEdge: '88888888-1111-1111-1111-111111111111',
    moonpetalDeepForest: '88888888-2222-2222-2222-222222222222',
    oakLogForestEdge: '88888888-3333-3333-3333-333333333333',
    mapleLogDeepForest: '88888888-4444-4444-4444-444444444444',
  },
  items2: {
    ironOre: '11111111-dddd-dddd-dddd-dddddddddddd',
  },
  dropTables: {
    ratTail: '12345678-5555-5555-5555-555555555555',
    ratCopper: '12345678-1111-1111-1111-111111111111',
    boarTusk: '12345678-6666-6666-6666-666666666666',
    boarCopper: '12345678-2222-2222-2222-222222222222',
    boarSword: '12345678-3333-3333-3333-333333333333',
    spiderSilk: '12345678-7777-7777-7777-777777777777',
    spiderPotion: '12345678-8888-8888-8888-888888888888',
    banditPouch: '12345678-9999-9999-9999-999999999999',
    banditCopper: '12345679-1111-1111-1111-111111111111',
    banditSword: '12345679-2222-2222-2222-222222222222',
    wolfPelt: '12345679-3333-3333-3333-333333333333',
    wolfFang: '12345679-4444-4444-4444-444444444444',
    wolfCap: '12345678-4444-4444-4444-444444444444',
    bearClaw: '12345679-5555-5555-5555-555555555555',
    bearPelt: '12345679-6666-6666-6666-666666666666',
    bearHide: '1234567a-5555-5555-5555-555555555555',
    bearPotion: '12345679-7777-7777-7777-777777777777',
    treantBark: '12345679-8888-8888-8888-888888888888',
    treantOak: '12345679-9999-9999-9999-999999999999',
    treantMaple: '1234567a-1111-1111-1111-111111111111',
    spriteDust: '1234567a-2222-2222-2222-222222222222',
    spriteMoonpetal: '1234567a-3333-3333-3333-333333333333',
    spritePotion: '1234567a-4444-4444-4444-444444444444',
  },
  recipes: {
    woodenSword: '77777777-7777-7777-7777-777777777777',
    minorHealthPotion: '66666666-1111-1111-1111-111111111111',
    healthPotion: '66666666-2222-2222-2222-222222222222',
    oakShortbow: '66666666-3333-3333-3333-333333333333',
    oakStaff: '66666666-4444-4444-4444-444444444444',
    copperDagger: '66666666-5555-5555-5555-555555555555',
    boarTuskMace: '66666666-6666-6666-6666-666666666666',
    spiderSilkRobe: '66666666-7777-7777-7777-777777777777',
    wolfFangDagger: '66666666-8888-8888-8888-888888888888',
    antivenomPotion: '66666666-9999-9999-9999-999999999999',
    bearHideVest: '66666667-1111-1111-1111-111111111111',
    ancientStaff: '66666667-2222-2222-2222-222222222222',
    refineCopperIngot: '66666667-3333-3333-3333-333333333333',
    refineIronIngot: '66666667-4444-4444-4444-444444444444',
    refineOakPlank: '66666667-5555-5555-5555-555555555555',
    refineMaplePlank: '66666667-6666-6666-6666-666666666666',
    tanWolfLeather: '66666667-7777-7777-7777-777777777777',
    tanBearLeather: '66666667-8888-8888-8888-888888888888',
    weaveSilkCloth: '66666667-9999-9999-9999-999999999999',
    leatherCap: '66666668-1111-1111-1111-111111111111',
    ironPlateCuirass: '66666668-2222-2222-2222-222222222222',
  },
} as const;

async function seedZones() {
  await prisma.zone.upsert({
    where: { id: IDS.zones.forestEdge },
    create: {
      id: IDS.zones.forestEdge,
      name: 'Forest Edge',
      description: 'A bright woodland border with gentle paths. A safe place to begin.',
      difficulty: 1,
      travelCost: 50,
      isStarter: true,
    },
    update: {
      name: 'Forest Edge',
      description: 'A bright woodland border with gentle paths. A safe place to begin.',
      difficulty: 1,
      travelCost: 50,
      isStarter: true,
    },
  });

  await prisma.zone.upsert({
    where: { id: IDS.zones.deepForest },
    create: {
      id: IDS.zones.deepForest,
      name: 'Deep Forest',
      description: 'Dense and shadowed. Predators stalk between the trees.',
      difficulty: 2,
      travelCost: 150,
      isStarter: false,
    },
    update: {
      name: 'Deep Forest',
      description: 'Dense and shadowed. Predators stalk between the trees.',
      difficulty: 2,
      travelCost: 150,
      isStarter: false,
    },
  });
}

async function seedItemTemplates() {
  await prisma.itemTemplate.upsert({
    where: { id: IDS.items.copperOre },
    create: {
      id: IDS.items.copperOre,
      name: 'Copper Ore',
      itemType: 'resource',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    update: {
      name: 'Copper Ore',
      itemType: 'resource',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
  });

  await prisma.itemTemplate.upsert({
    where: { id: IDS.items.woodenSword },
    create: {
      id: IDS.items.woodenSword,
      name: 'Wooden Sword',
      itemType: 'weapon',
      slot: 'main_hand',
      tier: 1,
      baseStats: { attack: 5 },
      requiredSkill: 'melee',
      requiredLevel: 1,
      maxDurability: 100,
      stackable: false,
    },
    update: {
      name: 'Wooden Sword',
      itemType: 'weapon',
      slot: 'main_hand',
      tier: 1,
      baseStats: { attack: 5 },
      requiredSkill: 'melee',
      requiredLevel: 1,
      maxDurability: 100,
      stackable: false,
    },
  });

  await prisma.itemTemplate.upsert({
    where: { id: IDS.items.leatherCap },
    create: {
      id: IDS.items.leatherCap,
      name: 'Leather Cap',
      itemType: 'armor',
      weightClass: 'medium',
      slot: 'head',
      tier: 1,
      baseStats: { armor: 3, magicDefence: 3 },
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 80,
      stackable: false,
    },
    update: {
      name: 'Leather Cap',
      itemType: 'armor',
      weightClass: 'medium',
      slot: 'head',
      tier: 1,
      baseStats: { armor: 3, magicDefence: 3 },
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 80,
      stackable: false,
    },
  });
}

async function seedMobs() {
  await prisma.mobTemplate.upsert({
    where: { id: IDS.mobs.forestRat },
    create: {
      id: IDS.mobs.forestRat,
      name: 'Forest Rat',
      zoneId: IDS.zones.forestEdge,
      hp: 15,
      attack: 8,
      defence: 3,
      evasion: 2,
      damageMin: 1,
      damageMax: 4,
      xpReward: 10,
      encounterWeight: 120,
      spellPattern: [],
    },
    update: {
      name: 'Forest Rat',
      zoneId: IDS.zones.forestEdge,
      hp: 15,
      attack: 8,
      defence: 3,
      evasion: 2,
      damageMin: 1,
      damageMax: 4,
      xpReward: 10,
      encounterWeight: 120,
      spellPattern: [],
    },
  });

  await prisma.mobTemplate.upsert({
    where: { id: IDS.mobs.wildBoar },
    create: {
      id: IDS.mobs.wildBoar,
      name: 'Wild Boar',
      zoneId: IDS.zones.forestEdge,
      hp: 25,
      attack: 12,
      defence: 8,
      evasion: 1,
      damageMin: 2,
      damageMax: 6,
      xpReward: 20,
      encounterWeight: 80,
      spellPattern: [],
    },
    update: {
      name: 'Wild Boar',
      zoneId: IDS.zones.forestEdge,
      hp: 25,
      attack: 12,
      defence: 8,
      evasion: 1,
      damageMin: 2,
      damageMax: 6,
      xpReward: 20,
      encounterWeight: 80,
      spellPattern: [],
    },
  });

  await prisma.mobTemplate.upsert({
    where: { id: IDS.mobs.forestWolf },
    create: {
      id: IDS.mobs.forestWolf,
      name: 'Forest Wolf',
      zoneId: IDS.zones.deepForest,
      hp: 35,
      attack: 18,
      defence: 12,
      evasion: 5,
      damageMin: 4,
      damageMax: 9,
      xpReward: 40,
      encounterWeight: 100,
      spellPattern: [],
    },
    update: {
      name: 'Forest Wolf',
      zoneId: IDS.zones.deepForest,
      hp: 35,
      attack: 18,
      defence: 12,
      evasion: 5,
      damageMin: 4,
      damageMax: 9,
      xpReward: 40,
      encounterWeight: 100,
      spellPattern: [],
    },
  });

  await prisma.mobTemplate.upsert({
    where: { id: IDS.mobs.forestSpider },
    create: {
      id: IDS.mobs.forestSpider,
      name: 'Forest Spider',
      zoneId: IDS.zones.forestEdge,
      hp: 12,
      attack: 10,
      defence: 2,
      evasion: 4,
      damageMin: 1,
      damageMax: 3,
      xpReward: 8,
      encounterWeight: 90,
      spellPattern: [],
    },
    update: {
      name: 'Forest Spider',
      zoneId: IDS.zones.forestEdge,
      hp: 12,
      attack: 10,
      defence: 2,
      evasion: 4,
      damageMin: 1,
      damageMax: 3,
      xpReward: 8,
      encounterWeight: 90,
      spellPattern: [],
    },
  });

  await prisma.mobTemplate.upsert({
    where: { id: IDS.mobs.woodlandBandit },
    create: {
      id: IDS.mobs.woodlandBandit,
      name: 'Woodland Bandit',
      zoneId: IDS.zones.forestEdge,
      hp: 20,
      attack: 11,
      defence: 5,
      evasion: 3,
      damageMin: 2,
      damageMax: 5,
      xpReward: 15,
      encounterWeight: 60,
      spellPattern: [],
    },
    update: {
      name: 'Woodland Bandit',
      zoneId: IDS.zones.forestEdge,
      hp: 20,
      attack: 11,
      defence: 5,
      evasion: 3,
      damageMin: 2,
      damageMax: 5,
      xpReward: 15,
      encounterWeight: 60,
      spellPattern: [],
    },
  });

  await prisma.mobTemplate.upsert({
    where: { id: IDS.mobs.forestBear },
    create: {
      id: IDS.mobs.forestBear,
      name: 'Forest Bear',
      zoneId: IDS.zones.deepForest,
      hp: 50,
      attack: 15,
      defence: 15,
      evasion: 2,
      damageMin: 5,
      damageMax: 10,
      xpReward: 50,
      encounterWeight: 70,
      spellPattern: [],
    },
    update: {
      name: 'Forest Bear',
      zoneId: IDS.zones.deepForest,
      hp: 50,
      attack: 15,
      defence: 15,
      evasion: 2,
      damageMin: 5,
      damageMax: 10,
      xpReward: 50,
      encounterWeight: 70,
      spellPattern: [],
    },
  });

  await prisma.mobTemplate.upsert({
    where: { id: IDS.mobs.darkTreant },
    create: {
      id: IDS.mobs.darkTreant,
      name: 'Dark Treant',
      zoneId: IDS.zones.deepForest,
      hp: 60,
      attack: 12,
      defence: 20,
      evasion: 0,
      damageMin: 3,
      damageMax: 7,
      xpReward: 45,
      encounterWeight: 50,
      spellPattern: [],
    },
    update: {
      name: 'Dark Treant',
      zoneId: IDS.zones.deepForest,
      hp: 60,
      attack: 12,
      defence: 20,
      evasion: 0,
      damageMin: 3,
      damageMax: 7,
      xpReward: 45,
      encounterWeight: 50,
      spellPattern: [],
    },
  });

  await prisma.mobTemplate.upsert({
    where: { id: IDS.mobs.forestSprite },
    create: {
      id: IDS.mobs.forestSprite,
      name: 'Forest Sprite',
      zoneId: IDS.zones.deepForest,
      hp: 20,
      attack: 14,
      defence: 6,
      evasion: 10,
      damageMin: 3,
      damageMax: 6,
      xpReward: 35,
      encounterWeight: 40,
      spellPattern: [
        { round: 3, action: "Nature's Wrath", damage: 8 },
        { round: 6, action: 'Thorn Barrage', damage: 12 },
      ],
    },
    update: {
      name: 'Forest Sprite',
      zoneId: IDS.zones.deepForest,
      hp: 20,
      attack: 14,
      defence: 6,
      evasion: 10,
      damageMin: 3,
      damageMax: 6,
      xpReward: 35,
      encounterWeight: 40,
      spellPattern: [
        { round: 3, action: "Nature's Wrath", damage: 8 },
        { round: 6, action: 'Thorn Barrage', damage: 12 },
      ],
    },
  });
}

async function seedMobFamilies() {
  const families = [
    {
      id: IDS.mobFamilies.forestCritters,
      name: 'Forest',
      siteNounSmall: 'Pack',
      siteNounMedium: 'Den',
      siteNounLarge: 'Territory',
    },
    {
      id: IDS.mobFamilies.forestBandits,
      name: 'Bandit',
      siteNounSmall: 'Raiders',
      siteNounMedium: 'Camp',
      siteNounLarge: 'Stronghold',
    },
    {
      id: IDS.mobFamilies.deepWilds,
      name: 'Wild',
      siteNounSmall: 'Pack',
      siteNounMedium: 'Hunting Grounds',
      siteNounLarge: 'Domain',
    },
    {
      id: IDS.mobFamilies.deepSpirits,
      name: 'Spirit',
      siteNounSmall: 'Cluster',
      siteNounMedium: 'Circle',
      siteNounLarge: 'Sanctum',
    },
  ];

  for (const family of families) {
    await prismaAny.mobFamily.upsert({
      where: { id: family.id },
      create: family,
      update: family,
    });
  }

  await prismaAny.mobFamilyMember.deleteMany({});
  await prismaAny.zoneMobFamily.deleteMany({});

  await prismaAny.mobFamilyMember.createMany({
    data: [
      // Forest Edge families
      { mobFamilyId: IDS.mobFamilies.forestCritters, mobTemplateId: IDS.mobs.forestRat, role: 'trash' },
      { mobFamilyId: IDS.mobFamilies.forestCritters, mobTemplateId: IDS.mobs.forestSpider, role: 'elite' },
      { mobFamilyId: IDS.mobFamilies.forestCritters, mobTemplateId: IDS.mobs.wildBoar, role: 'boss' },

      { mobFamilyId: IDS.mobFamilies.forestBandits, mobTemplateId: IDS.mobs.woodlandBandit, role: 'trash' },
      { mobFamilyId: IDS.mobFamilies.forestBandits, mobTemplateId: IDS.mobs.woodlandBandit, role: 'elite' },
      { mobFamilyId: IDS.mobFamilies.forestBandits, mobTemplateId: IDS.mobs.woodlandBandit, role: 'boss' },

      // Deep Forest families
      { mobFamilyId: IDS.mobFamilies.deepWilds, mobTemplateId: IDS.mobs.forestWolf, role: 'trash' },
      { mobFamilyId: IDS.mobFamilies.deepWilds, mobTemplateId: IDS.mobs.forestBear, role: 'elite' },
      { mobFamilyId: IDS.mobFamilies.deepWilds, mobTemplateId: IDS.mobs.darkTreant, role: 'boss' },

      { mobFamilyId: IDS.mobFamilies.deepSpirits, mobTemplateId: IDS.mobs.forestSprite, role: 'trash' },
      { mobFamilyId: IDS.mobFamilies.deepSpirits, mobTemplateId: IDS.mobs.forestSprite, role: 'elite' },
      { mobFamilyId: IDS.mobFamilies.deepSpirits, mobTemplateId: IDS.mobs.forestSprite, role: 'boss' },
    ],
  });

  await prismaAny.zoneMobFamily.createMany({
    data: [
      {
        zoneId: IDS.zones.forestEdge,
        mobFamilyId: IDS.mobFamilies.forestCritters,
        discoveryWeight: 110,
        minSize: 'small',
        maxSize: 'medium',
      },
      {
        zoneId: IDS.zones.forestEdge,
        mobFamilyId: IDS.mobFamilies.forestBandits,
        discoveryWeight: 70,
        minSize: 'small',
        maxSize: 'medium',
      },
      {
        zoneId: IDS.zones.deepForest,
        mobFamilyId: IDS.mobFamilies.deepWilds,
        discoveryWeight: 100,
        minSize: 'medium',
        maxSize: 'large',
      },
      {
        zoneId: IDS.zones.deepForest,
        mobFamilyId: IDS.mobFamilies.deepSpirits,
        discoveryWeight: 60,
        minSize: 'small',
        maxSize: 'medium',
      },
    ],
  });
}

async function seedResourceNodes() {
  // Copper in Forest Edge - common, small to medium veins
  await prisma.resourceNode.upsert({
    where: { id: IDS.resourceNodes.copperNodeForestEdge },
    create: {
      id: IDS.resourceNodes.copperNodeForestEdge,
      zoneId: IDS.zones.forestEdge,
      resourceType: 'copper_ore',
      skillRequired: 'mining',
      levelRequired: 1,
      baseYield: 1,
      discoveryChance: new Prisma.Decimal('0.25'),
      minCapacity: 15,
      maxCapacity: 80,
      discoveryWeight: 100,
    },
    update: {
      zoneId: IDS.zones.forestEdge,
      resourceType: 'copper_ore',
      skillRequired: 'mining',
      levelRequired: 1,
      baseYield: 1,
      discoveryChance: new Prisma.Decimal('0.25'),
      minCapacity: 15,
      maxCapacity: 80,
      discoveryWeight: 100,
    },
  });

  // Iron in Deep Forest - rarer, requires higher level, larger veins
  await prisma.resourceNode.upsert({
    where: { id: IDS.resourceNodes.ironNodeDeepForest },
    create: {
      id: IDS.resourceNodes.ironNodeDeepForest,
      zoneId: IDS.zones.deepForest,
      resourceType: 'iron_ore',
      skillRequired: 'mining',
      levelRequired: 10,
      baseYield: 1,
      discoveryChance: new Prisma.Decimal('0.15'),
      minCapacity: 30,
      maxCapacity: 150,
      discoveryWeight: 100,
    },
    update: {
      zoneId: IDS.zones.deepForest,
      resourceType: 'iron_ore',
      skillRequired: 'mining',
      levelRequired: 10,
      baseYield: 1,
      discoveryChance: new Prisma.Decimal('0.15'),
      minCapacity: 30,
      maxCapacity: 150,
      discoveryWeight: 100,
    },
  });

  await prisma.resourceNode.upsert({
    where: { id: IDS.resourceNodes.forestSageForestEdge },
    create: {
      id: IDS.resourceNodes.forestSageForestEdge,
      zoneId: IDS.zones.forestEdge,
      resourceType: 'forest_sage',
      skillRequired: 'foraging',
      levelRequired: 1,
      baseYield: 1,
      discoveryChance: new Prisma.Decimal('0.25'),
      minCapacity: 15,
      maxCapacity: 80,
      discoveryWeight: 100,
    },
    update: {
      zoneId: IDS.zones.forestEdge,
      resourceType: 'forest_sage',
      skillRequired: 'foraging',
      levelRequired: 1,
      baseYield: 1,
      discoveryChance: new Prisma.Decimal('0.25'),
      minCapacity: 15,
      maxCapacity: 80,
      discoveryWeight: 100,
    },
  });

  await prisma.resourceNode.upsert({
    where: { id: IDS.resourceNodes.moonpetalDeepForest },
    create: {
      id: IDS.resourceNodes.moonpetalDeepForest,
      zoneId: IDS.zones.deepForest,
      resourceType: 'moonpetal',
      skillRequired: 'foraging',
      levelRequired: 10,
      baseYield: 1,
      discoveryChance: new Prisma.Decimal('0.15'),
      minCapacity: 30,
      maxCapacity: 150,
      discoveryWeight: 100,
    },
    update: {
      zoneId: IDS.zones.deepForest,
      resourceType: 'moonpetal',
      skillRequired: 'foraging',
      levelRequired: 10,
      baseYield: 1,
      discoveryChance: new Prisma.Decimal('0.15'),
      minCapacity: 30,
      maxCapacity: 150,
      discoveryWeight: 100,
    },
  });

  await prisma.resourceNode.upsert({
    where: { id: IDS.resourceNodes.oakLogForestEdge },
    create: {
      id: IDS.resourceNodes.oakLogForestEdge,
      zoneId: IDS.zones.forestEdge,
      resourceType: 'oak_log',
      skillRequired: 'woodcutting',
      levelRequired: 1,
      baseYield: 1,
      discoveryChance: new Prisma.Decimal('0.25'),
      minCapacity: 15,
      maxCapacity: 80,
      discoveryWeight: 100,
    },
    update: {
      zoneId: IDS.zones.forestEdge,
      resourceType: 'oak_log',
      skillRequired: 'woodcutting',
      levelRequired: 1,
      baseYield: 1,
      discoveryChance: new Prisma.Decimal('0.25'),
      minCapacity: 15,
      maxCapacity: 80,
      discoveryWeight: 100,
    },
  });

  await prisma.resourceNode.upsert({
    where: { id: IDS.resourceNodes.mapleLogDeepForest },
    create: {
      id: IDS.resourceNodes.mapleLogDeepForest,
      zoneId: IDS.zones.deepForest,
      resourceType: 'maple_log',
      skillRequired: 'woodcutting',
      levelRequired: 10,
      baseYield: 1,
      discoveryChance: new Prisma.Decimal('0.15'),
      minCapacity: 30,
      maxCapacity: 150,
      discoveryWeight: 100,
    },
    update: {
      zoneId: IDS.zones.deepForest,
      resourceType: 'maple_log',
      skillRequired: 'woodcutting',
      levelRequired: 10,
      baseYield: 1,
      discoveryChance: new Prisma.Decimal('0.15'),
      minCapacity: 30,
      maxCapacity: 150,
      discoveryWeight: 100,
    },
  });
}

async function seedItemTemplates2() {
  // Iron Ore resource
  await prisma.itemTemplate.upsert({
    where: { id: IDS.items2.ironOre },
    create: {
      id: IDS.items2.ironOre,
      name: 'Iron Ore',
      itemType: 'resource',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    update: {
      name: 'Iron Ore',
      itemType: 'resource',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
  });
}

async function seedNewSkillItemTemplates() {
  await prisma.itemTemplate.upsert({
    where: { id: IDS.items.forestSage },
    create: {
      id: IDS.items.forestSage,
      name: 'Forest Sage',
      itemType: 'resource',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    update: {
      name: 'Forest Sage',
      itemType: 'resource',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
  });

  await prisma.itemTemplate.upsert({
    where: { id: IDS.items.moonpetal },
    create: {
      id: IDS.items.moonpetal,
      name: 'Moonpetal',
      itemType: 'resource',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    update: {
      name: 'Moonpetal',
      itemType: 'resource',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
  });

  await prisma.itemTemplate.upsert({
    where: { id: IDS.items.oakLog },
    create: {
      id: IDS.items.oakLog,
      name: 'Oak Log',
      itemType: 'resource',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    update: {
      name: 'Oak Log',
      itemType: 'resource',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
  });

  await prisma.itemTemplate.upsert({
    where: { id: IDS.items.mapleLog },
    create: {
      id: IDS.items.mapleLog,
      name: 'Maple Log',
      itemType: 'resource',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    update: {
      name: 'Maple Log',
      itemType: 'resource',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
  });

  await prisma.itemTemplate.upsert({
    where: { id: IDS.items.minorHealthPotion },
    create: {
      id: IDS.items.minorHealthPotion,
      name: 'Minor Health Potion',
      itemType: 'consumable',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    update: {
      name: 'Minor Health Potion',
      itemType: 'consumable',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
  });

  await prisma.itemTemplate.upsert({
    where: { id: IDS.items.healthPotion },
    create: {
      id: IDS.items.healthPotion,
      name: 'Health Potion',
      itemType: 'consumable',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    update: {
      name: 'Health Potion',
      itemType: 'consumable',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
  });

  await prisma.itemTemplate.upsert({
    where: { id: IDS.items.oakShortbow },
    create: {
      id: IDS.items.oakShortbow,
      name: 'Oak Shortbow',
      itemType: 'weapon',
      slot: 'main_hand',
      tier: 1,
      baseStats: { rangedPower: 6 },
      requiredSkill: 'ranged',
      requiredLevel: 1,
      maxDurability: 80,
      stackable: false,
    },
    update: {
      name: 'Oak Shortbow',
      itemType: 'weapon',
      slot: 'main_hand',
      tier: 1,
      baseStats: { rangedPower: 6 },
      requiredSkill: 'ranged',
      requiredLevel: 1,
      maxDurability: 80,
      stackable: false,
    },
  });

  await prisma.itemTemplate.upsert({
    where: { id: IDS.items.oakStaff },
    create: {
      id: IDS.items.oakStaff,
      name: 'Oak Staff',
      itemType: 'weapon',
      slot: 'main_hand',
      tier: 1,
      baseStats: { magicPower: 6 },
      requiredSkill: 'magic',
      requiredLevel: 1,
      maxDurability: 80,
      stackable: false,
    },
    update: {
      name: 'Oak Staff',
      itemType: 'weapon',
      slot: 'main_hand',
      tier: 1,
      baseStats: { magicPower: 6 },
      requiredSkill: 'magic',
      requiredLevel: 1,
      maxDurability: 80,
      stackable: false,
    },
  });

  const processingAndArmourTemplates: Array<{
    id: string;
    name: string;
    itemType: string;
    weightClass: 'heavy' | 'medium' | 'light' | null;
    slot: string | null;
    tier: number;
    baseStats: Prisma.InputJsonValue;
    requiredSkill: string | null;
    requiredLevel: number;
    maxDurability: number;
    stackable: boolean;
  }> = [
    {
      id: IDS.items.copperIngot,
      name: 'Copper Ingot',
      itemType: 'resource',
      weightClass: null,
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.ironIngot,
      name: 'Iron Ingot',
      itemType: 'resource',
      weightClass: null,
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.oakPlank,
      name: 'Oak Plank',
      itemType: 'resource',
      weightClass: null,
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.maplePlank,
      name: 'Maple Plank',
      itemType: 'resource',
      weightClass: null,
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.wolfLeather,
      name: 'Wolf Leather',
      itemType: 'resource',
      weightClass: null,
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.bearLeather,
      name: 'Bear Leather',
      itemType: 'resource',
      weightClass: null,
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.silkCloth,
      name: 'Silk Cloth',
      itemType: 'resource',
      weightClass: null,
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.bearHide,
      name: 'Bear Hide',
      itemType: 'resource',
      weightClass: null,
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.ironPlateCuirass,
      name: 'Iron Plate Cuirass',
      itemType: 'armor',
      weightClass: 'heavy',
      slot: 'chest',
      tier: 2,
      baseStats: { armor: 12, magicDefence: 4, health: 10, dodge: -2 },
      requiredSkill: null,
      requiredLevel: 10,
      maxDurability: 140,
      stackable: false,
    },
  ];

  for (const template of processingAndArmourTemplates) {
    await prisma.itemTemplate.upsert({
      where: { id: template.id },
      create: template,
      update: template,
    });
  }
}

async function seedMobLootAndCraftedItemTemplates() {
  const templates: Array<{
    id: string;
    name: string;
    itemType: string;
    weightClass?: 'heavy' | 'medium' | 'light' | null;
    slot: string | null;
    tier: number;
    baseStats: Prisma.InputJsonValue;
    requiredSkill: string | null;
    requiredLevel: number;
    maxDurability: number;
    stackable: boolean;
  }> = [
    {
      id: IDS.items.ratTail,
      name: 'Rat Tail',
      itemType: 'resource',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.boarTusk,
      name: 'Boar Tusk',
      itemType: 'resource',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.spiderSilk,
      name: 'Spider Silk',
      itemType: 'resource',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.banditsPouch,
      name: "Bandit's Pouch",
      itemType: 'resource',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.wolfPelt,
      name: 'Wolf Pelt',
      itemType: 'resource',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.wolfFang,
      name: 'Wolf Fang',
      itemType: 'resource',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.bearClaw,
      name: 'Bear Claw',
      itemType: 'resource',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.ancientBark,
      name: 'Ancient Bark',
      itemType: 'resource',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.spriteDust,
      name: 'Sprite Dust',
      itemType: 'resource',
      slot: null,
      tier: 2,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.copperDagger,
      name: 'Copper Dagger',
      itemType: 'weapon',
      slot: 'main_hand',
      tier: 1,
      baseStats: { attack: 8 },
      requiredSkill: 'melee',
      requiredLevel: 3,
      maxDurability: 100,
      stackable: false,
    },
    {
      id: IDS.items.boarTuskMace,
      name: 'Boar Tusk Mace',
      itemType: 'weapon',
      slot: 'main_hand',
      tier: 1,
      baseStats: { attack: 10 },
      requiredSkill: 'melee',
      requiredLevel: 5,
      maxDurability: 110,
      stackable: false,
    },
    {
      id: IDS.items.spiderSilkRobe,
      name: 'Spider Silk Robe',
      itemType: 'armor',
      weightClass: 'light',
      slot: 'chest',
      tier: 2,
      baseStats: { armor: 3, magicDefence: 8, dodge: 4 },
      requiredSkill: null,
      requiredLevel: 5,
      maxDurability: 90,
      stackable: false,
    },
    {
      id: IDS.items.wolfFangDagger,
      name: 'Wolf Fang Dagger',
      itemType: 'weapon',
      slot: 'main_hand',
      tier: 2,
      baseStats: { attack: 12 },
      requiredSkill: 'melee',
      requiredLevel: 8,
      maxDurability: 110,
      stackable: false,
    },
    {
      id: IDS.items.antivenomPotion,
      name: 'Antivenom Potion',
      itemType: 'consumable',
      slot: null,
      tier: 1,
      baseStats: {},
      requiredSkill: null,
      requiredLevel: 1,
      maxDurability: 0,
      stackable: true,
    },
    {
      id: IDS.items.bearHideVest,
      name: 'Bear Hide Vest',
      itemType: 'armor',
      weightClass: 'medium',
      slot: 'chest',
      tier: 2,
      baseStats: { armor: 8, magicDefence: 8, health: 4 },
      requiredSkill: null,
      requiredLevel: 10,
      maxDurability: 120,
      stackable: false,
    },
    {
      id: IDS.items.ancientStaff,
      name: 'Ancient Staff',
      itemType: 'weapon',
      slot: 'main_hand',
      tier: 2,
      baseStats: { magicPower: 12 },
      requiredSkill: 'magic',
      requiredLevel: 10,
      maxDurability: 110,
      stackable: false,
    },
  ];

  for (const template of templates) {
    await prisma.itemTemplate.upsert({
      where: { id: template.id },
      create: template,
      update: template,
    });
  }
}

async function seedDropTables() {
  const entries: Array<{
    id: string;
    mobTemplateId: string;
    itemTemplateId: string;
    dropChance: string;
    minQuantity: number;
    maxQuantity: number;
  }> = [
    {
      id: IDS.dropTables.ratTail,
      mobTemplateId: IDS.mobs.forestRat,
      itemTemplateId: IDS.items.ratTail,
      dropChance: '0.60',
      minQuantity: 1,
      maxQuantity: 2,
    },
    {
      id: IDS.dropTables.ratCopper,
      mobTemplateId: IDS.mobs.forestRat,
      itemTemplateId: IDS.items.copperOre,
      dropChance: '0.50',
      minQuantity: 1,
      maxQuantity: 3,
    },
    {
      id: IDS.dropTables.boarTusk,
      mobTemplateId: IDS.mobs.wildBoar,
      itemTemplateId: IDS.items.boarTusk,
      dropChance: '0.55',
      minQuantity: 1,
      maxQuantity: 2,
    },
    {
      id: IDS.dropTables.boarCopper,
      mobTemplateId: IDS.mobs.wildBoar,
      itemTemplateId: IDS.items.copperOre,
      dropChance: '0.30',
      minQuantity: 1,
      maxQuantity: 2,
    },
    {
      id: IDS.dropTables.boarSword,
      mobTemplateId: IDS.mobs.wildBoar,
      itemTemplateId: IDS.items.woodenSword,
      dropChance: '0.10',
      minQuantity: 1,
      maxQuantity: 1,
    },
    {
      id: IDS.dropTables.spiderSilk,
      mobTemplateId: IDS.mobs.forestSpider,
      itemTemplateId: IDS.items.spiderSilk,
      dropChance: '0.60',
      minQuantity: 1,
      maxQuantity: 3,
    },
    {
      id: IDS.dropTables.spiderPotion,
      mobTemplateId: IDS.mobs.forestSpider,
      itemTemplateId: IDS.items.minorHealthPotion,
      dropChance: '0.08',
      minQuantity: 1,
      maxQuantity: 1,
    },
    {
      id: IDS.dropTables.banditPouch,
      mobTemplateId: IDS.mobs.woodlandBandit,
      itemTemplateId: IDS.items.banditsPouch,
      dropChance: '0.50',
      minQuantity: 1,
      maxQuantity: 1,
    },
    {
      id: IDS.dropTables.banditCopper,
      mobTemplateId: IDS.mobs.woodlandBandit,
      itemTemplateId: IDS.items.copperOre,
      dropChance: '0.25',
      minQuantity: 2,
      maxQuantity: 4,
    },
    {
      id: IDS.dropTables.banditSword,
      mobTemplateId: IDS.mobs.woodlandBandit,
      itemTemplateId: IDS.items.woodenSword,
      dropChance: '0.06',
      minQuantity: 1,
      maxQuantity: 1,
    },
    {
      id: IDS.dropTables.wolfPelt,
      mobTemplateId: IDS.mobs.forestWolf,
      itemTemplateId: IDS.items.wolfPelt,
      dropChance: '0.55',
      minQuantity: 1,
      maxQuantity: 2,
    },
    {
      id: IDS.dropTables.wolfFang,
      mobTemplateId: IDS.mobs.forestWolf,
      itemTemplateId: IDS.items.wolfFang,
      dropChance: '0.35',
      minQuantity: 1,
      maxQuantity: 2,
    },
    {
      id: IDS.dropTables.wolfCap,
      mobTemplateId: IDS.mobs.forestWolf,
      itemTemplateId: IDS.items.leatherCap,
      dropChance: '0.12',
      minQuantity: 1,
      maxQuantity: 1,
    },
    {
      id: IDS.dropTables.bearClaw,
      mobTemplateId: IDS.mobs.forestBear,
      itemTemplateId: IDS.items.bearClaw,
      dropChance: '0.50',
      minQuantity: 1,
      maxQuantity: 3,
    },
    {
      id: IDS.dropTables.bearPelt,
      mobTemplateId: IDS.mobs.forestBear,
      itemTemplateId: IDS.items.wolfPelt,
      dropChance: '0.20',
      minQuantity: 1,
      maxQuantity: 2,
    },
    {
      id: IDS.dropTables.bearHide,
      mobTemplateId: IDS.mobs.forestBear,
      itemTemplateId: IDS.items.bearHide,
      dropChance: '0.40',
      minQuantity: 1,
      maxQuantity: 2,
    },
    {
      id: IDS.dropTables.bearPotion,
      mobTemplateId: IDS.mobs.forestBear,
      itemTemplateId: IDS.items.healthPotion,
      dropChance: '0.06',
      minQuantity: 1,
      maxQuantity: 1,
    },
    {
      id: IDS.dropTables.treantBark,
      mobTemplateId: IDS.mobs.darkTreant,
      itemTemplateId: IDS.items.ancientBark,
      dropChance: '0.60',
      minQuantity: 2,
      maxQuantity: 4,
    },
    {
      id: IDS.dropTables.treantOak,
      mobTemplateId: IDS.mobs.darkTreant,
      itemTemplateId: IDS.items.oakLog,
      dropChance: '0.30',
      minQuantity: 2,
      maxQuantity: 5,
    },
    {
      id: IDS.dropTables.treantMaple,
      mobTemplateId: IDS.mobs.darkTreant,
      itemTemplateId: IDS.items.mapleLog,
      dropChance: '0.15',
      minQuantity: 1,
      maxQuantity: 3,
    },
    {
      id: IDS.dropTables.spriteDust,
      mobTemplateId: IDS.mobs.forestSprite,
      itemTemplateId: IDS.items.spriteDust,
      dropChance: '0.55',
      minQuantity: 1,
      maxQuantity: 3,
    },
    {
      id: IDS.dropTables.spriteMoonpetal,
      mobTemplateId: IDS.mobs.forestSprite,
      itemTemplateId: IDS.items.moonpetal,
      dropChance: '0.25',
      minQuantity: 1,
      maxQuantity: 2,
    },
    {
      id: IDS.dropTables.spritePotion,
      mobTemplateId: IDS.mobs.forestSprite,
      itemTemplateId: IDS.items.minorHealthPotion,
      dropChance: '0.10',
      minQuantity: 1,
      maxQuantity: 1,
    },
  ];

  for (const entry of entries) {
    await prisma.dropTable.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        mobTemplateId: entry.mobTemplateId,
        itemTemplateId: entry.itemTemplateId,
        dropChance: new Prisma.Decimal(entry.dropChance),
        minQuantity: entry.minQuantity,
        maxQuantity: entry.maxQuantity,
      },
      update: {
        mobTemplateId: entry.mobTemplateId,
        itemTemplateId: entry.itemTemplateId,
        dropChance: new Prisma.Decimal(entry.dropChance),
        minQuantity: entry.minQuantity,
        maxQuantity: entry.maxQuantity,
      },
    });
  }
}

async function seedRecipes() {
  await prisma.craftingRecipe.upsert({
    where: { id: IDS.recipes.woodenSword },
    create: {
      id: IDS.recipes.woodenSword,
      skillType: 'weaponsmithing',
      requiredLevel: 1,
      resultTemplateId: IDS.items.woodenSword,
      turnCost: 50,
      materials: [
        { templateId: IDS.items.oakPlank, quantity: 4 },
        { templateId: IDS.items.copperIngot, quantity: 2 },
      ],
      xpReward: 25,
    },
    update: {
      skillType: 'weaponsmithing',
      requiredLevel: 1,
      resultTemplateId: IDS.items.woodenSword,
      turnCost: 50,
      materials: [
        { templateId: IDS.items.oakPlank, quantity: 4 },
        { templateId: IDS.items.copperIngot, quantity: 2 },
      ],
      xpReward: 25,
    },
  });

  await prisma.craftingRecipe.upsert({
    where: { id: IDS.recipes.minorHealthPotion },
    create: {
      id: IDS.recipes.minorHealthPotion,
      skillType: 'alchemy',
      requiredLevel: 1,
      resultTemplateId: IDS.items.minorHealthPotion,
      turnCost: 20,
      materials: [
        { templateId: IDS.items.forestSage, quantity: 3 },
      ],
      xpReward: 20,
    },
    update: {
      skillType: 'alchemy',
      requiredLevel: 1,
      resultTemplateId: IDS.items.minorHealthPotion,
      turnCost: 20,
      materials: [
        { templateId: IDS.items.forestSage, quantity: 3 },
      ],
      xpReward: 20,
    },
  });

  await prisma.craftingRecipe.upsert({
    where: { id: IDS.recipes.healthPotion },
    create: {
      id: IDS.recipes.healthPotion,
      skillType: 'alchemy',
      requiredLevel: 10,
      resultTemplateId: IDS.items.healthPotion,
      turnCost: 40,
      materials: [
        { templateId: IDS.items.moonpetal, quantity: 5 },
      ],
      xpReward: 50,
    },
    update: {
      skillType: 'alchemy',
      requiredLevel: 10,
      resultTemplateId: IDS.items.healthPotion,
      turnCost: 40,
      materials: [
        { templateId: IDS.items.moonpetal, quantity: 5 },
      ],
      xpReward: 50,
    },
  });

  await prisma.craftingRecipe.upsert({
    where: { id: IDS.recipes.oakShortbow },
    create: {
      id: IDS.recipes.oakShortbow,
      skillType: 'weaponsmithing',
      requiredLevel: 5,
      resultTemplateId: IDS.items.oakShortbow,
      turnCost: 50,
      materials: [
        { templateId: IDS.items.oakPlank, quantity: 8 },
        { templateId: IDS.items.maplePlank, quantity: 2 },
      ],
      xpReward: 35,
    },
    update: {
      skillType: 'weaponsmithing',
      requiredLevel: 5,
      resultTemplateId: IDS.items.oakShortbow,
      turnCost: 50,
      materials: [
        { templateId: IDS.items.oakPlank, quantity: 8 },
        { templateId: IDS.items.maplePlank, quantity: 2 },
      ],
      xpReward: 35,
    },
  });

  await prisma.craftingRecipe.upsert({
    where: { id: IDS.recipes.oakStaff },
    create: {
      id: IDS.recipes.oakStaff,
      skillType: 'weaponsmithing',
      requiredLevel: 5,
      resultTemplateId: IDS.items.oakStaff,
      turnCost: 50,
      materials: [
        { templateId: IDS.items.oakPlank, quantity: 10 },
        { templateId: IDS.items.silkCloth, quantity: 2 },
      ],
      xpReward: 35,
    },
    update: {
      skillType: 'weaponsmithing',
      requiredLevel: 5,
      resultTemplateId: IDS.items.oakStaff,
      turnCost: 50,
      materials: [
        { templateId: IDS.items.oakPlank, quantity: 10 },
        { templateId: IDS.items.silkCloth, quantity: 2 },
      ],
      xpReward: 35,
    },
  });

  await prisma.craftingRecipe.upsert({
    where: { id: IDS.recipes.copperDagger },
    create: {
      id: IDS.recipes.copperDagger,
      skillType: 'weaponsmithing',
      requiredLevel: 3,
      resultTemplateId: IDS.items.copperDagger,
      turnCost: 40,
      materials: [
        { templateId: IDS.items.copperIngot, quantity: 4 },
        { templateId: IDS.items.ratTail, quantity: 3 },
      ],
      xpReward: 30,
    },
    update: {
      skillType: 'weaponsmithing',
      requiredLevel: 3,
      resultTemplateId: IDS.items.copperDagger,
      turnCost: 40,
      materials: [
        { templateId: IDS.items.copperIngot, quantity: 4 },
        { templateId: IDS.items.ratTail, quantity: 3 },
      ],
      xpReward: 30,
    },
  });

  await prisma.craftingRecipe.upsert({
    where: { id: IDS.recipes.boarTuskMace },
    create: {
      id: IDS.recipes.boarTuskMace,
      skillType: 'weaponsmithing',
      requiredLevel: 5,
      resultTemplateId: IDS.items.boarTuskMace,
      turnCost: 55,
      materials: [
        { templateId: IDS.items.boarTusk, quantity: 5 },
        { templateId: IDS.items.oakPlank, quantity: 5 },
        { templateId: IDS.items.copperIngot, quantity: 2 },
      ],
      xpReward: 40,
    },
    update: {
      skillType: 'weaponsmithing',
      requiredLevel: 5,
      resultTemplateId: IDS.items.boarTuskMace,
      turnCost: 55,
      materials: [
        { templateId: IDS.items.boarTusk, quantity: 5 },
        { templateId: IDS.items.oakPlank, quantity: 5 },
        { templateId: IDS.items.copperIngot, quantity: 2 },
      ],
      xpReward: 40,
    },
  });

  await prisma.craftingRecipe.upsert({
    where: { id: IDS.recipes.spiderSilkRobe },
    create: {
      id: IDS.recipes.spiderSilkRobe,
      skillType: 'tailoring',
      requiredLevel: 5,
      resultTemplateId: IDS.items.spiderSilkRobe,
      turnCost: 60,
      materials: [
        { templateId: IDS.items.silkCloth, quantity: 6 },
        { templateId: IDS.items.forestSage, quantity: 3 },
      ],
      xpReward: 40,
    },
    update: {
      skillType: 'tailoring',
      requiredLevel: 5,
      resultTemplateId: IDS.items.spiderSilkRobe,
      turnCost: 60,
      materials: [
        { templateId: IDS.items.silkCloth, quantity: 6 },
        { templateId: IDS.items.forestSage, quantity: 3 },
      ],
      xpReward: 40,
    },
  });

  await prisma.craftingRecipe.upsert({
    where: { id: IDS.recipes.wolfFangDagger },
    create: {
      id: IDS.recipes.wolfFangDagger,
      skillType: 'weaponsmithing',
      requiredLevel: 8,
      resultTemplateId: IDS.items.wolfFangDagger,
      turnCost: 70,
      materials: [
        { templateId: IDS.items.wolfFang, quantity: 6 },
        { templateId: IDS.items.ironIngot, quantity: 4 },
      ],
      xpReward: 55,
    },
    update: {
      skillType: 'weaponsmithing',
      requiredLevel: 8,
      resultTemplateId: IDS.items.wolfFangDagger,
      turnCost: 70,
      materials: [
        { templateId: IDS.items.wolfFang, quantity: 6 },
        { templateId: IDS.items.ironIngot, quantity: 4 },
      ],
      xpReward: 55,
    },
  });

  await prisma.craftingRecipe.upsert({
    where: { id: IDS.recipes.antivenomPotion },
    create: {
      id: IDS.recipes.antivenomPotion,
      skillType: 'alchemy',
      requiredLevel: 5,
      resultTemplateId: IDS.items.antivenomPotion,
      turnCost: 30,
      materials: [
        { templateId: IDS.items.silkCloth, quantity: 2 },
        { templateId: IDS.items.forestSage, quantity: 3 },
      ],
      xpReward: 30,
    },
    update: {
      skillType: 'alchemy',
      requiredLevel: 5,
      resultTemplateId: IDS.items.antivenomPotion,
      turnCost: 30,
      materials: [
        { templateId: IDS.items.silkCloth, quantity: 2 },
        { templateId: IDS.items.forestSage, quantity: 3 },
      ],
      xpReward: 30,
    },
  });

  await prisma.craftingRecipe.upsert({
    where: { id: IDS.recipes.bearHideVest },
    create: {
      id: IDS.recipes.bearHideVest,
      skillType: 'leatherworking',
      requiredLevel: 10,
      resultTemplateId: IDS.items.bearHideVest,
      turnCost: 80,
      materials: [
        { templateId: IDS.items.bearLeather, quantity: 6 },
        { templateId: IDS.items.wolfLeather, quantity: 4 },
      ],
      xpReward: 65,
    },
    update: {
      skillType: 'leatherworking',
      requiredLevel: 10,
      resultTemplateId: IDS.items.bearHideVest,
      turnCost: 80,
      materials: [
        { templateId: IDS.items.bearLeather, quantity: 6 },
        { templateId: IDS.items.wolfLeather, quantity: 4 },
      ],
      xpReward: 65,
    },
  });

  await prisma.craftingRecipe.upsert({
    where: { id: IDS.recipes.ancientStaff },
    create: {
      id: IDS.recipes.ancientStaff,
      skillType: 'weaponsmithing',
      requiredLevel: 10,
      resultTemplateId: IDS.items.ancientStaff,
      turnCost: 85,
      materials: [
        { templateId: IDS.items.maplePlank, quantity: 8 },
        { templateId: IDS.items.spriteDust, quantity: 4 },
        { templateId: IDS.items.silkCloth, quantity: 3 },
      ],
      xpReward: 70,
    },
    update: {
      skillType: 'weaponsmithing',
      requiredLevel: 10,
      resultTemplateId: IDS.items.ancientStaff,
      turnCost: 85,
      materials: [
        { templateId: IDS.items.maplePlank, quantity: 8 },
        { templateId: IDS.items.spriteDust, quantity: 4 },
        { templateId: IDS.items.silkCloth, quantity: 3 },
      ],
      xpReward: 70,
    },
  });

  const processingRecipes: Array<{
    id: string;
    skillType: string;
    requiredLevel: number;
    resultTemplateId: string;
    turnCost: number;
    materials: Array<{ templateId: string; quantity: number }>;
    xpReward: number;
  }> = [
    {
      id: IDS.recipes.refineCopperIngot,
      skillType: 'refining',
      requiredLevel: 1,
      resultTemplateId: IDS.items.copperIngot,
      turnCost: 20,
      materials: [{ templateId: IDS.items.copperOre, quantity: 3 }],
      xpReward: 12,
    },
    {
      id: IDS.recipes.refineIronIngot,
      skillType: 'refining',
      requiredLevel: 8,
      resultTemplateId: IDS.items.ironIngot,
      turnCost: 24,
      materials: [{ templateId: IDS.items2.ironOre, quantity: 3 }],
      xpReward: 16,
    },
    {
      id: IDS.recipes.refineOakPlank,
      skillType: 'refining',
      requiredLevel: 1,
      resultTemplateId: IDS.items.oakPlank,
      turnCost: 18,
      materials: [{ templateId: IDS.items.oakLog, quantity: 2 }],
      xpReward: 10,
    },
    {
      id: IDS.recipes.refineMaplePlank,
      skillType: 'refining',
      requiredLevel: 8,
      resultTemplateId: IDS.items.maplePlank,
      turnCost: 22,
      materials: [{ templateId: IDS.items.mapleLog, quantity: 2 }],
      xpReward: 14,
    },
    {
      id: IDS.recipes.tanWolfLeather,
      skillType: 'tanning',
      requiredLevel: 5,
      resultTemplateId: IDS.items.wolfLeather,
      turnCost: 20,
      materials: [{ templateId: IDS.items.wolfPelt, quantity: 2 }],
      xpReward: 12,
    },
    {
      id: IDS.recipes.tanBearLeather,
      skillType: 'tanning',
      requiredLevel: 10,
      resultTemplateId: IDS.items.bearLeather,
      turnCost: 24,
      materials: [{ templateId: IDS.items.bearHide, quantity: 2 }],
      xpReward: 16,
    },
    {
      id: IDS.recipes.weaveSilkCloth,
      skillType: 'weaving',
      requiredLevel: 5,
      resultTemplateId: IDS.items.silkCloth,
      turnCost: 20,
      materials: [{ templateId: IDS.items.spiderSilk, quantity: 3 }],
      xpReward: 12,
    },
    {
      id: IDS.recipes.leatherCap,
      skillType: 'leatherworking',
      requiredLevel: 4,
      resultTemplateId: IDS.items.leatherCap,
      turnCost: 35,
      materials: [
        { templateId: IDS.items.wolfLeather, quantity: 3 },
        { templateId: IDS.items.oakPlank, quantity: 1 },
      ],
      xpReward: 24,
    },
    {
      id: IDS.recipes.ironPlateCuirass,
      skillType: 'armorsmithing',
      requiredLevel: 10,
      resultTemplateId: IDS.items.ironPlateCuirass,
      turnCost: 70,
      materials: [
        { templateId: IDS.items.ironIngot, quantity: 8 },
        { templateId: IDS.items.oakPlank, quantity: 2 },
      ],
      xpReward: 60,
    },
  ];

  for (const recipe of processingRecipes) {
    await prisma.craftingRecipe.upsert({
      where: { id: recipe.id },
      create: recipe,
      update: recipe,
    });
  }
}

async function main() {
  console.log('Seeding Adventure RPG...');

  await seedZones();
  await seedItemTemplates();
  await seedItemTemplates2();
  await seedNewSkillItemTemplates();
  await seedMobLootAndCraftedItemTemplates();
  await seedMobs();
  await seedMobFamilies();
  await seedResourceNodes();
  await seedDropTables();
  await seedRecipes();

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
