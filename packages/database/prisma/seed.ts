import 'dotenv/config';
import { randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';

import { IDS } from './seed-data/ids';
import { getAllItemTemplates } from './seed-data/items';
import { getAllMobTemplates } from './seed-data/mobs';
import { getAllMobFamilies, getAllMobFamilyMembers, getAllZoneMobFamilies } from './seed-data/families';
import { getAllResourceNodes } from './seed-data/resources';
import { getAllDropTables } from './seed-data/drops';
import { getAllRecipes } from './seed-data/recipes';
import { getAllChestDropTables } from './seed-data/chests';

const prisma = new PrismaClient();

// ============================================================================
// Cleanup — delete all template data (preserves player accounts)
// ============================================================================

async function cleanTemplateData() {
  console.log('  Cleaning template data...');
  const p = prisma as any;

  await p.playerRecipe.deleteMany({});
  await p.chestDropTable.deleteMany({});
  await prisma.dropTable.deleteMany({});
  await prisma.craftingRecipe.deleteMany({});
  await p.mobFamilyMember.deleteMany({});
  await p.zoneMobFamily.deleteMany({});
  await p.encounterSite.deleteMany({});
  await prisma.playerResourceNode.deleteMany({});
  await prisma.playerEquipment.deleteMany({});
  await prisma.item.deleteMany({});
  await p.mobFamily.deleteMany({});
  await prisma.mobTemplate.deleteMany({});
  await prisma.resourceNode.deleteMany({});
  await prisma.itemTemplate.deleteMany({});
  await p.zoneConnection.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await p.playerZoneDiscovery.deleteMany({});
  await prisma.player.updateMany({
    data: { currentZoneId: null, lastTravelledFromZoneId: null, homeTownId: null },
  });
  await prisma.zone.deleteMany({});

  console.log('  Template data cleaned.');
}

// ============================================================================
// Zones
// ============================================================================

async function seedZones() {
  console.log('  Seeding zones...');

  const zones: Prisma.ZoneCreateManyInput[] = [
    { id: IDS.zones.millbrook, name: 'Millbrook', description: 'A peaceful town nestled at the forest edge. Crafters and merchants ply their trade here.', difficulty: 0, travelCost: 0, isStarter: true, zoneType: 'town', zoneExitChance: null },
    { id: IDS.zones.forestEdge, name: 'Forest Edge', description: 'A bright woodland border with gentle paths. Creatures stir among the undergrowth.', difficulty: 1, travelCost: 50, isStarter: false, zoneType: 'wild', zoneExitChance: 0.0001 },
    { id: IDS.zones.deepForest, name: 'Deep Forest', description: 'Dense and shadowed. Predators stalk between the ancient trees.', difficulty: 2, travelCost: 150, isStarter: false, zoneType: 'wild', zoneExitChance: 0.000033 },
    { id: IDS.zones.caveEntrance, name: 'Cave Entrance', description: 'A yawning cavern mouth. Strange sounds echo from within.', difficulty: 2, travelCost: 150, isStarter: false, zoneType: 'wild', zoneExitChance: 0.000033 },
    { id: IDS.zones.ancientGrove, name: 'Ancient Grove', description: 'A sacred woodland where spirits dwell among towering trees.', difficulty: 3, travelCost: 300, isStarter: false, zoneType: 'wild', zoneExitChance: null },
    { id: IDS.zones.deepMines, name: 'Deep Mines', description: 'Abandoned mine shafts descending into darkness. Something lurks below.', difficulty: 3, travelCost: 300, isStarter: false, zoneType: 'wild', zoneExitChance: null },
    { id: IDS.zones.whisperingPlains, name: 'Whispering Plains', description: 'Vast grasslands where the wind carries distant cries.', difficulty: 3, travelCost: 250, isStarter: false, zoneType: 'wild', zoneExitChance: 0.000013 },
    { id: IDS.zones.thornwall, name: 'Thornwall', description: 'A fortified frontier settlement. Advanced crafting facilities line the main road.', difficulty: 0, travelCost: 0, isStarter: false, zoneType: 'town', zoneExitChance: null },
    { id: IDS.zones.hauntedMarsh, name: 'Haunted Marsh', description: 'Fetid swampland shrouded in mist. The dead do not rest here.', difficulty: 4, travelCost: 400, isStarter: false, zoneType: 'wild', zoneExitChance: 0.0000067 },
    { id: IDS.zones.crystalCaverns, name: 'Crystal Caverns', description: 'Glittering underground chambers pulsing with arcane energy.', difficulty: 4, travelCost: 400, isStarter: false, zoneType: 'wild', zoneExitChance: null },
    { id: IDS.zones.sunkenRuins, name: 'Sunken Ruins', description: 'Ancient ruins half-submerged in brackish water. Unspeakable things dwell in the depths.', difficulty: 5, travelCost: 600, isStarter: false, zoneType: 'wild', zoneExitChance: null },
  ];

  await prisma.zone.createMany({ data: zones });
  console.log(`  ${zones.length} zones created.`);
}

// ============================================================================
// Zone Connections (bidirectional)
// ============================================================================

async function seedZoneConnections() {
  console.log('  Seeding zone connections...');
  const p = prisma as any;

  const pairs: [string, string][] = [
    [IDS.zones.millbrook, IDS.zones.forestEdge],
    [IDS.zones.forestEdge, IDS.zones.deepForest],
    [IDS.zones.forestEdge, IDS.zones.caveEntrance],
    [IDS.zones.deepForest, IDS.zones.ancientGrove],
    [IDS.zones.deepForest, IDS.zones.whisperingPlains],
    [IDS.zones.caveEntrance, IDS.zones.deepMines],
    [IDS.zones.whisperingPlains, IDS.zones.thornwall],
    [IDS.zones.thornwall, IDS.zones.hauntedMarsh],
    [IDS.zones.thornwall, IDS.zones.crystalCaverns],
    [IDS.zones.hauntedMarsh, IDS.zones.sunkenRuins],
  ];

  const rows = pairs.flatMap(([a, b]) => [
    { id: randomUUID(), fromId: a, toId: b },
    { id: randomUUID(), fromId: b, toId: a },
  ]);

  await p.zoneConnection.createMany({ data: rows });
  console.log(`  ${rows.length} zone connections created (${pairs.length} bidirectional pairs).`);
}

// ============================================================================
// Item Templates
// ============================================================================

async function seedItemTemplates() {
  console.log('  Seeding item templates...');
  const items = getAllItemTemplates();
  await prisma.itemTemplate.createMany({ data: items });
  console.log(`  ${items.length} item templates created.`);
}

// ============================================================================
// Mob Templates
// ============================================================================

async function seedMobs() {
  console.log('  Seeding mob templates...');
  const mobs = getAllMobTemplates();
  await prisma.mobTemplate.createMany({ data: mobs });
  console.log(`  ${mobs.length} mob templates created.`);
}

// ============================================================================
// Mob Families, Members, Zone Mappings
// ============================================================================

async function seedMobFamilies() {
  console.log('  Seeding mob families...');
  const p = prisma as any;

  const families = getAllMobFamilies();
  await p.mobFamily.createMany({ data: families });
  console.log(`  ${families.length} mob families created.`);

  const members = getAllMobFamilyMembers();
  await p.mobFamilyMember.createMany({ data: members });
  console.log(`  ${members.length} mob family members linked.`);

  const zoneFamilies = getAllZoneMobFamilies();
  await p.zoneMobFamily.createMany({ data: zoneFamilies });
  console.log(`  ${zoneFamilies.length} zone-family mappings created.`);
}

// ============================================================================
// Resource Nodes
// ============================================================================

async function seedResourceNodes() {
  console.log('  Seeding resource nodes...');
  const nodes = getAllResourceNodes();
  await prisma.resourceNode.createMany({ data: nodes });
  console.log(`  ${nodes.length} resource nodes created.`);
}

// ============================================================================
// Drop Tables
// ============================================================================

async function seedDropTables() {
  console.log('  Seeding drop tables...');
  const drops = getAllDropTables();
  await prisma.dropTable.createMany({ data: drops });
  console.log(`  ${drops.length} drop table entries created.`);
}

// ============================================================================
// Crafting Recipes
// ============================================================================

async function seedRecipes() {
  console.log('  Seeding crafting recipes...');
  const recipes = getAllRecipes();
  await prisma.craftingRecipe.createMany({ data: recipes });
  console.log(`  ${recipes.length} crafting recipes created.`);
}

// ============================================================================
// Chest Drop Tables
// ============================================================================

async function seedChestDropTables() {
  console.log('  Seeding chest drop tables...');
  const p = prisma as any;
  const chests = getAllChestDropTables();
  await p.chestDropTable.createMany({ data: chests });
  console.log(`  ${chests.length} chest drop table entries created.`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('Seeding Adventure RPG...');

  await cleanTemplateData();

  // Batch 1: World geography
  await seedZones();
  await seedZoneConnections();

  // Batch 2: Items & creatures
  await seedItemTemplates();
  await seedMobs();
  await seedMobFamilies();

  // Batch 3: Economy
  await seedResourceNodes();
  await seedDropTables();
  await seedRecipes();

  // Batch 4: Advanced loot
  await seedChestDropTables();

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
