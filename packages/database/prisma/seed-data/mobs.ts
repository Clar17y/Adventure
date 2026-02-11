import { IDS } from './ids';

type MobRow = {
  id: string;
  name: string;
  zoneId: string;
  level: number;
  hp: number;
  attack: number;
  defence: number;
  evasion: number;
  damageMin: number;
  damageMax: number;
  xpReward: number;
  encounterWeight?: number;
  spellPattern?: unknown[];
};

function mob(r: MobRow) {
  return {
    id: r.id,
    name: r.name,
    zoneId: r.zoneId,
    level: r.level,
    hp: r.hp,
    attack: r.attack,
    defence: r.defence,
    evasion: r.evasion,
    damageMin: r.damageMin,
    damageMax: r.damageMax,
    xpReward: r.xpReward,
    encounterWeight: r.encounterWeight ?? 100,
    spellPattern: r.spellPattern ?? [],
  };
}

// Spell pattern shorthand: { round, name, damage?, heal?, buff?, debuff? }
function spell(round: number, name: string, opts: { damage?: number; heal?: number; buff?: boolean; debuff?: boolean } = {}) {
  return { round, name, ...opts };
}

const z = IDS.zones;
const m = IDS.mobs;

export function getAllMobTemplates() {
  return [
    // ── Forest Edge (diff 1) ──────────────────────────────────────────────
    mob({ id: m.forestRat, name: 'Forest Rat', zoneId: z.forestEdge, level: 1, hp: 12, attack: 6, defence: 2, evasion: 3, damageMin: 1, damageMax: 3, xpReward: 6 }),
    mob({ id: m.fieldMouse, name: 'Field Mouse', zoneId: z.forestEdge, level: 1, hp: 8, attack: 5, defence: 1, evasion: 5, damageMin: 1, damageMax: 2, xpReward: 4 }),
    mob({ id: m.giantRat, name: 'Giant Rat', zoneId: z.forestEdge, level: 2, hp: 22, attack: 10, defence: 5, evasion: 3, damageMin: 2, damageMax: 5, xpReward: 14 }),
    mob({ id: m.ratKing, name: 'Rat King', zoneId: z.forestEdge, level: 3, hp: 40, attack: 14, defence: 7, evasion: 2, damageMin: 3, damageMax: 7, xpReward: 30, spellPattern: [spell(3, 'Frenzy', { damage: 6 })] }),
    mob({ id: m.forestSpider, name: 'Forest Spider', zoneId: z.forestEdge, level: 1, hp: 10, attack: 8, defence: 2, evasion: 4, damageMin: 1, damageMax: 3, xpReward: 7 }),
    mob({ id: m.webSpinner, name: 'Web Spinner', zoneId: z.forestEdge, level: 1, hp: 14, attack: 7, defence: 3, evasion: 3, damageMin: 1, damageMax: 4, xpReward: 8 }),
    mob({ id: m.venomousSpider, name: 'Venomous Spider', zoneId: z.forestEdge, level: 2, hp: 20, attack: 12, defence: 4, evasion: 5, damageMin: 2, damageMax: 6, xpReward: 16, spellPattern: [spell(4, 'Venom Bite', { damage: 5 })] }),
    mob({ id: m.broodMother, name: 'Brood Mother', zoneId: z.forestEdge, level: 3, hp: 45, attack: 15, defence: 8, evasion: 3, damageMin: 3, damageMax: 8, xpReward: 35, spellPattern: [spell(3, 'Web Spit', { damage: 4 }), spell(6, 'Poison Spray', { damage: 8 })] }),
    mob({ id: m.wildBoar, name: 'Wild Boar', zoneId: z.forestEdge, level: 2, hp: 20, attack: 10, defence: 6, evasion: 1, damageMin: 2, damageMax: 5, xpReward: 10 }),
    mob({ id: m.tuskedBoar, name: 'Tusked Boar', zoneId: z.forestEdge, level: 3, hp: 30, attack: 14, defence: 9, evasion: 1, damageMin: 3, damageMax: 7, xpReward: 20 }),
    mob({ id: m.greatBoar, name: 'Great Boar', zoneId: z.forestEdge, level: 4, hp: 50, attack: 18, defence: 12, evasion: 1, damageMin: 4, damageMax: 9, xpReward: 40, spellPattern: [spell(4, 'Charge', { damage: 8 })] }),

    // ── Deep Forest (diff 2) ──────────────────────────────────────────────
    mob({ id: m.youngWolf, name: 'Young Wolf', zoneId: z.deepForest, level: 4, hp: 22, attack: 14, defence: 8, evasion: 5, damageMin: 3, damageMax: 6, xpReward: 18 }),
    mob({ id: m.forestWolf, name: 'Forest Wolf', zoneId: z.deepForest, level: 5, hp: 30, attack: 16, defence: 10, evasion: 5, damageMin: 3, damageMax: 7, xpReward: 22 }),
    mob({ id: m.direWolf, name: 'Dire Wolf', zoneId: z.deepForest, level: 6, hp: 45, attack: 20, defence: 14, evasion: 4, damageMin: 5, damageMax: 10, xpReward: 38 }),
    mob({ id: m.alphaWolf, name: 'Alpha Wolf', zoneId: z.deepForest, level: 8, hp: 65, attack: 24, defence: 16, evasion: 6, damageMin: 6, damageMax: 12, xpReward: 55, spellPattern: [spell(3, 'Howl', { buff: true }), spell(5, 'Lunge', { damage: 10 })] }),
    mob({ id: m.woodlandBandit, name: 'Woodland Bandit', zoneId: z.deepForest, level: 4, hp: 25, attack: 13, defence: 7, evasion: 4, damageMin: 2, damageMax: 6, xpReward: 16 }),
    mob({ id: m.banditScout, name: 'Bandit Scout', zoneId: z.deepForest, level: 4, hp: 18, attack: 15, defence: 5, evasion: 7, damageMin: 2, damageMax: 5, xpReward: 14 }),
    mob({ id: m.banditEnforcer, name: 'Bandit Enforcer', zoneId: z.deepForest, level: 6, hp: 40, attack: 18, defence: 12, evasion: 3, damageMin: 4, damageMax: 9, xpReward: 34 }),
    mob({ id: m.banditCaptain, name: 'Bandit Captain', zoneId: z.deepForest, level: 8, hp: 60, attack: 22, defence: 15, evasion: 5, damageMin: 5, damageMax: 11, xpReward: 50, spellPattern: [spell(2, 'Rally', { buff: true }), spell(5, 'Power Strike', { damage: 12 })] }),
    mob({ id: m.twigBlight, name: 'Twig Blight', zoneId: z.deepForest, level: 4, hp: 28, attack: 10, defence: 12, evasion: 1, damageMin: 2, damageMax: 5, xpReward: 15 }),
    mob({ id: m.barkGolem, name: 'Bark Golem', zoneId: z.deepForest, level: 5, hp: 35, attack: 12, defence: 16, evasion: 0, damageMin: 3, damageMax: 6, xpReward: 20 }),
    mob({ id: m.darkTreant, name: 'Dark Treant', zoneId: z.deepForest, level: 7, hp: 55, attack: 14, defence: 20, evasion: 0, damageMin: 4, damageMax: 8, xpReward: 40, spellPattern: [spell(4, 'Root Slam', { damage: 7 })] }),
    mob({ id: m.elderTreant, name: 'Elder Treant', zoneId: z.deepForest, level: 9, hp: 80, attack: 16, defence: 24, evasion: 0, damageMin: 5, damageMax: 10, xpReward: 60, spellPattern: [spell(3, 'Vine Whip', { damage: 6 }), spell(6, "Nature's Wrath", { damage: 12 })] }),

    // ── Ancient Grove (diff 3, dead end) ──────────────────────────────────
    mob({ id: m.forestSprite, name: 'Forest Sprite', zoneId: z.ancientGrove, level: 10, hp: 25, attack: 16, defence: 8, evasion: 10, damageMin: 3, damageMax: 6, xpReward: 24, spellPattern: [spell(3, 'Sparkle', { damage: 4 })] }),
    mob({ id: m.wisp, name: 'Wisp', zoneId: z.ancientGrove, level: 10, hp: 18, attack: 14, defence: 6, evasion: 12, damageMin: 2, damageMax: 5, xpReward: 20 }),
    mob({ id: m.dryad, name: 'Dryad', zoneId: z.ancientGrove, level: 13, hp: 45, attack: 20, defence: 14, evasion: 8, damageMin: 5, damageMax: 9, xpReward: 42, spellPattern: [spell(3, 'Heal Self', { heal: 8 }), spell(5, 'Thorn Burst', { damage: 9 })] }),
    mob({ id: m.ancientSpirit, name: 'Ancient Spirit', zoneId: z.ancientGrove, level: 16, hp: 70, attack: 24, defence: 18, evasion: 10, damageMin: 6, damageMax: 12, xpReward: 65, spellPattern: [spell(2, 'Spirit Shield', { buff: true }), spell(4, 'Soul Drain', { damage: 10 }), spell(7, 'Wrath', { damage: 15 })] }),
    mob({ id: m.darkTreantGrove, name: 'Dark Treant', zoneId: z.ancientGrove, level: 11, hp: 50, attack: 14, defence: 18, evasion: 0, damageMin: 4, damageMax: 8, xpReward: 30 }),
    mob({ id: m.mossGolem, name: 'Moss Golem', zoneId: z.ancientGrove, level: 11, hp: 55, attack: 12, defence: 22, evasion: 0, damageMin: 3, damageMax: 7, xpReward: 28 }),
    mob({ id: m.ancientTreant, name: 'Ancient Treant', zoneId: z.ancientGrove, level: 14, hp: 75, attack: 18, defence: 26, evasion: 0, damageMin: 5, damageMax: 10, xpReward: 50, spellPattern: [spell(3, 'Root Cage', { damage: 8 }), spell(6, 'Bark Shield', { buff: true })] }),
    mob({ id: m.treantPatriarch, name: 'Treant Patriarch', zoneId: z.ancientGrove, level: 17, hp: 110, attack: 22, defence: 30, evasion: 0, damageMin: 7, damageMax: 14, xpReward: 80, spellPattern: [spell(3, 'Earthquake', { damage: 10 }), spell(5, 'Regenerate', { heal: 12 }), spell(8, 'Ancient Fury', { damage: 18 })] }),
    mob({ id: m.pixieSwarm, name: 'Pixie Swarm', zoneId: z.ancientGrove, level: 10, hp: 20, attack: 18, defence: 6, evasion: 14, damageMin: 2, damageMax: 5, xpReward: 22, spellPattern: [spell(2, 'Confusion', { debuff: true })] }),
    mob({ id: m.thornFairy, name: 'Thorn Fairy', zoneId: z.ancientGrove, level: 11, hp: 28, attack: 16, defence: 10, evasion: 10, damageMin: 3, damageMax: 6, xpReward: 26, spellPattern: [spell(3, 'Thorn Shot', { damage: 5 })] }),
    mob({ id: m.faeKnight, name: 'Fae Knight', zoneId: z.ancientGrove, level: 14, hp: 50, attack: 22, defence: 16, evasion: 8, damageMin: 5, damageMax: 10, xpReward: 46, spellPattern: [spell(2, 'Enchanted Blade', { buff: true }), spell(5, 'Fae Strike', { damage: 11 })] }),
    mob({ id: m.faeQueen, name: 'Fae Queen', zoneId: z.ancientGrove, level: 17, hp: 75, attack: 26, defence: 20, evasion: 12, damageMin: 6, damageMax: 13, xpReward: 75, spellPattern: [spell(2, 'Royal Guard', { buff: true }), spell(4, 'Charm', { debuff: true }), spell(6, 'Fae Wrath', { damage: 16 })] }),

    // ── Cave Entrance (diff 2) ────────────────────────────────────────────
    mob({ id: m.caveRat, name: 'Cave Rat', zoneId: z.caveEntrance, level: 3, hp: 16, attack: 8, defence: 4, evasion: 4, damageMin: 1, damageMax: 4, xpReward: 10 }),
    mob({ id: m.cavernBeetle, name: 'Cavern Beetle', zoneId: z.caveEntrance, level: 3, hp: 20, attack: 7, defence: 8, evasion: 2, damageMin: 2, damageMax: 4, xpReward: 12 }),
    mob({ id: m.giantCaveSpider, name: 'Giant Cave Spider', zoneId: z.caveEntrance, level: 5, hp: 30, attack: 14, defence: 8, evasion: 5, damageMin: 3, damageMax: 7, xpReward: 26, spellPattern: [spell(3, 'Web Trap', { debuff: true })] }),
    mob({ id: m.ratMatriarch, name: 'Rat Matriarch', zoneId: z.caveEntrance, level: 7, hp: 50, attack: 16, defence: 10, evasion: 3, damageMin: 4, damageMax: 8, xpReward: 42, spellPattern: [spell(3, 'Summon Swarm', { damage: 6 }), spell(6, 'Frenzy', { damage: 10 })] }),
    mob({ id: m.caveBat, name: 'Cave Bat', zoneId: z.caveEntrance, level: 3, hp: 14, attack: 12, defence: 4, evasion: 8, damageMin: 2, damageMax: 4, xpReward: 12 }),
    mob({ id: m.direBat, name: 'Dire Bat', zoneId: z.caveEntrance, level: 4, hp: 22, attack: 14, defence: 6, evasion: 7, damageMin: 2, damageMax: 5, xpReward: 16 }),
    mob({ id: m.vampireBat, name: 'Vampire Bat', zoneId: z.caveEntrance, level: 6, hp: 35, attack: 18, defence: 8, evasion: 9, damageMin: 3, damageMax: 7, xpReward: 30, spellPattern: [spell(3, 'Life Drain', { damage: 5, heal: 5 })] }),
    mob({ id: m.batSwarmLord, name: 'Bat Swarm Lord', zoneId: z.caveEntrance, level: 8, hp: 55, attack: 22, defence: 10, evasion: 6, damageMin: 4, damageMax: 9, xpReward: 48, spellPattern: [spell(2, 'Screech', { debuff: true }), spell(5, 'Swarm', { damage: 10 })] }),
    mob({ id: m.goblin, name: 'Goblin', zoneId: z.caveEntrance, level: 3, hp: 18, attack: 11, defence: 6, evasion: 4, damageMin: 2, damageMax: 5, xpReward: 12 }),
    mob({ id: m.goblinArcher, name: 'Goblin Archer', zoneId: z.caveEntrance, level: 4, hp: 15, attack: 14, defence: 4, evasion: 5, damageMin: 2, damageMax: 6, xpReward: 14 }),
    mob({ id: m.goblinWarrior, name: 'Goblin Warrior', zoneId: z.caveEntrance, level: 6, hp: 32, attack: 16, defence: 10, evasion: 3, damageMin: 3, damageMax: 7, xpReward: 28 }),
    mob({ id: m.goblinShaman, name: 'Goblin Shaman', zoneId: z.caveEntrance, level: 8, hp: 45, attack: 14, defence: 8, evasion: 5, damageMin: 3, damageMax: 6, xpReward: 44, spellPattern: [spell(2, 'Hex', { debuff: true }), spell(4, 'Fire Bolt', { damage: 8 }), spell(6, 'Dark Ritual', { damage: 12 })] }),

    // ── Deep Mines (diff 3, dead end) ─────────────────────────────────────
    mob({ id: m.goblinMiner, name: 'Goblin Miner', zoneId: z.deepMines, level: 10, hp: 28, attack: 16, defence: 10, evasion: 4, damageMin: 3, damageMax: 7, xpReward: 24 }),
    mob({ id: m.goblinSapper, name: 'Goblin Sapper', zoneId: z.deepMines, level: 10, hp: 22, attack: 18, defence: 8, evasion: 5, damageMin: 4, damageMax: 8, xpReward: 26, spellPattern: [spell(3, 'Bomb', { damage: 7 })] }),
    mob({ id: m.goblinForeman, name: 'Goblin Foreman', zoneId: z.deepMines, level: 13, hp: 45, attack: 20, defence: 14, evasion: 3, damageMin: 5, damageMax: 10, xpReward: 42, spellPattern: [spell(4, 'Whip Crack', { buff: true })] }),
    mob({ id: m.goblinChieftain, name: 'Goblin Chieftain', zoneId: z.deepMines, level: 16, hp: 70, attack: 24, defence: 18, evasion: 4, damageMin: 6, damageMax: 12, xpReward: 60, spellPattern: [spell(2, 'War Cry', { buff: true }), spell(4, 'Cleave', { damage: 10 }), spell(7, 'Execute', { damage: 15 })] }),
    mob({ id: m.clayGolem, name: 'Clay Golem', zoneId: z.deepMines, level: 10, hp: 40, attack: 12, defence: 18, evasion: 0, damageMin: 3, damageMax: 7, xpReward: 22 }),
    mob({ id: m.stoneGolem, name: 'Stone Golem', zoneId: z.deepMines, level: 11, hp: 50, attack: 14, defence: 22, evasion: 0, damageMin: 4, damageMax: 8, xpReward: 28 }),
    mob({ id: m.ironGolem, name: 'Iron Golem', zoneId: z.deepMines, level: 14, hp: 70, attack: 18, defence: 28, evasion: 0, damageMin: 5, damageMax: 10, xpReward: 48, spellPattern: [spell(4, 'Ground Pound', { damage: 9 })] }),
    mob({ id: m.crystalGolemMob, name: 'Crystal Golem', zoneId: z.deepMines, level: 17, hp: 100, attack: 22, defence: 32, evasion: 0, damageMin: 7, damageMax: 14, xpReward: 70, spellPattern: [spell(3, 'Crystal Barrage', { damage: 8 }), spell(5, 'Harden', { buff: true }), spell(8, 'Shatter', { damage: 16 })] }),
    mob({ id: m.rockCrawler, name: 'Rock Crawler', zoneId: z.deepMines, level: 10, hp: 30, attack: 16, defence: 14, evasion: 3, damageMin: 3, damageMax: 7, xpReward: 24 }),
    mob({ id: m.caveLurker, name: 'Cave Lurker', zoneId: z.deepMines, level: 10, hp: 25, attack: 18, defence: 10, evasion: 6, damageMin: 4, damageMax: 7, xpReward: 22 }),
    mob({ id: m.burrower, name: 'Burrower', zoneId: z.deepMines, level: 13, hp: 50, attack: 22, defence: 16, evasion: 4, damageMin: 5, damageMax: 10, xpReward: 44, spellPattern: [spell(3, 'Burrow', { buff: true }), spell(5, 'Ambush', { damage: 11 })] }),
    mob({ id: m.tunnelWyrm, name: 'Tunnel Wyrm', zoneId: z.deepMines, level: 17, hp: 80, attack: 26, defence: 20, evasion: 2, damageMin: 7, damageMax: 14, xpReward: 68, spellPattern: [spell(3, 'Tremor', { damage: 8 }), spell(5, 'Acid Spit', { damage: 12 }), spell(8, 'Swallow', { damage: 18 })] }),

    // ── Whispering Plains (diff 3) ────────────────────────────────────────
    mob({ id: m.plainsWolf, name: 'Plains Wolf', zoneId: z.whisperingPlains, level: 10, hp: 35, attack: 18, defence: 12, evasion: 6, damageMin: 4, damageMax: 8, xpReward: 26 }),
    mob({ id: m.coyote, name: 'Coyote', zoneId: z.whisperingPlains, level: 10, hp: 28, attack: 20, defence: 8, evasion: 8, damageMin: 3, damageMax: 7, xpReward: 24 }),
    mob({ id: m.warg, name: 'Warg', zoneId: z.whisperingPlains, level: 13, hp: 55, attack: 24, defence: 16, evasion: 5, damageMin: 6, damageMax: 11, xpReward: 46, spellPattern: [spell(3, 'Pounce', { damage: 9 })] }),
    mob({ id: m.packAlpha, name: 'Pack Alpha', zoneId: z.whisperingPlains, level: 16, hp: 80, attack: 28, defence: 20, evasion: 6, damageMin: 7, damageMax: 13, xpReward: 65, spellPattern: [spell(2, 'Howl', { buff: true }), spell(4, 'Savage Bite', { damage: 12 }), spell(7, 'Frenzy', { damage: 16 })] }),
    mob({ id: m.highwayBandit, name: 'Highway Bandit', zoneId: z.whisperingPlains, level: 10, hp: 32, attack: 18, defence: 10, evasion: 5, damageMin: 3, damageMax: 7, xpReward: 24 }),
    mob({ id: m.banditArcherPlains, name: 'Bandit Archer', zoneId: z.whisperingPlains, level: 10, hp: 26, attack: 20, defence: 8, evasion: 6, damageMin: 4, damageMax: 8, xpReward: 26 }),
    mob({ id: m.banditLieutenant, name: 'Bandit Lieutenant', zoneId: z.whisperingPlains, level: 13, hp: 50, attack: 22, defence: 14, evasion: 5, damageMin: 5, damageMax: 10, xpReward: 44, spellPattern: [spell(3, 'Dirty Trick', { debuff: true })] }),
    mob({ id: m.banditWarlord, name: 'Bandit Warlord', zoneId: z.whisperingPlains, level: 16, hp: 75, attack: 26, defence: 18, evasion: 5, damageMin: 6, damageMax: 12, xpReward: 62, spellPattern: [spell(2, 'Battle Cry', { buff: true }), spell(4, 'Shield Bash', { damage: 8 }), spell(6, 'Devastating Blow', { damage: 14 })] }),
    mob({ id: m.harpy, name: 'Harpy', zoneId: z.whisperingPlains, level: 10, hp: 28, attack: 18, defence: 8, evasion: 10, damageMin: 3, damageMax: 7, xpReward: 26 }),
    mob({ id: m.harpyScout, name: 'Harpy Scout', zoneId: z.whisperingPlains, level: 10, hp: 24, attack: 16, defence: 6, evasion: 12, damageMin: 3, damageMax: 6, xpReward: 24 }),
    mob({ id: m.harpyWindcaller, name: 'Harpy Windcaller', zoneId: z.whisperingPlains, level: 13, hp: 45, attack: 22, defence: 12, evasion: 9, damageMin: 5, damageMax: 10, xpReward: 44, spellPattern: [spell(3, 'Gust', { damage: 6 }), spell(5, 'Wind Shear', { damage: 10 })] }),
    mob({ id: m.harpyMatriarch, name: 'Harpy Matriarch', zoneId: z.whisperingPlains, level: 16, hp: 70, attack: 26, defence: 16, evasion: 8, damageMin: 6, damageMax: 12, xpReward: 64, spellPattern: [spell(2, 'Screech', { debuff: true }), spell(4, 'Talon Fury', { damage: 10 }), spell(7, 'Tempest', { damage: 16 })] }),

    // ── Haunted Marsh (diff 4) ────────────────────────────────────────────
    mob({ id: m.skeleton, name: 'Skeleton', zoneId: z.hauntedMarsh, level: 18, hp: 40, attack: 22, defence: 16, evasion: 3, damageMin: 5, damageMax: 9, xpReward: 36 }),
    mob({ id: m.zombie, name: 'Zombie', zoneId: z.hauntedMarsh, level: 18, hp: 55, attack: 18, defence: 12, evasion: 1, damageMin: 4, damageMax: 10, xpReward: 34 }),
    mob({ id: m.wraith, name: 'Wraith', zoneId: z.hauntedMarsh, level: 22, hp: 60, attack: 26, defence: 14, evasion: 10, damageMin: 6, damageMax: 12, xpReward: 56, spellPattern: [spell(3, 'Life Drain', { damage: 8, heal: 8 }), spell(5, 'Fear', { debuff: true })] }),
    mob({ id: m.deathKnight, name: 'Death Knight', zoneId: z.hauntedMarsh, level: 26, hp: 100, attack: 30, defence: 24, evasion: 4, damageMin: 8, damageMax: 16, xpReward: 85, spellPattern: [spell(2, 'Dark Aura', { buff: true }), spell(4, 'Soul Strike', { damage: 12 }), spell(7, 'Death Blow', { damage: 20 })] }),
    mob({ id: m.bogToad, name: 'Bog Toad', zoneId: z.hauntedMarsh, level: 18, hp: 45, attack: 20, defence: 14, evasion: 4, damageMin: 4, damageMax: 9, xpReward: 34, spellPattern: [spell(3, 'Tongue Lash', { damage: 5 })] }),
    mob({ id: m.marshCrawlerMob, name: 'Marsh Crawler', zoneId: z.hauntedMarsh, level: 19, hp: 50, attack: 18, defence: 18, evasion: 2, damageMin: 5, damageMax: 9, xpReward: 36 }),
    mob({ id: m.swampHydra, name: 'Swamp Hydra', zoneId: z.hauntedMarsh, level: 23, hp: 80, attack: 24, defence: 20, evasion: 3, damageMin: 6, damageMax: 12, xpReward: 58, spellPattern: [spell(3, 'Acid Spray', { damage: 8 }), spell(5, 'Regenerate', { heal: 6 })] }),
    mob({ id: m.ancientCrocodile, name: 'Ancient Crocodile', zoneId: z.hauntedMarsh, level: 27, hp: 110, attack: 28, defence: 26, evasion: 1, damageMin: 8, damageMax: 16, xpReward: 82, spellPattern: [spell(3, 'Death Roll', { damage: 12 }), spell(5, 'Submerge', { buff: true }), spell(7, 'Jaws', { damage: 18 })] }),
    mob({ id: m.hagServant, name: 'Hag Servant', zoneId: z.hauntedMarsh, level: 18, hp: 35, attack: 20, defence: 10, evasion: 6, damageMin: 4, damageMax: 8, xpReward: 32, spellPattern: [spell(3, 'Curse', { debuff: true })] }),
    mob({ id: m.cursedVillager, name: 'Cursed Villager', zoneId: z.hauntedMarsh, level: 18, hp: 45, attack: 16, defence: 14, evasion: 3, damageMin: 4, damageMax: 9, xpReward: 30 }),
    mob({ id: m.bogWitch, name: 'Bog Witch', zoneId: z.hauntedMarsh, level: 23, hp: 55, attack: 24, defence: 12, evasion: 8, damageMin: 5, damageMax: 11, xpReward: 54, spellPattern: [spell(2, 'Hex', { debuff: true }), spell(4, 'Shadow Bolt', { damage: 9 }), spell(6, 'Drain Life', { damage: 7, heal: 7 })] }),
    mob({ id: m.covenMother, name: 'Coven Mother', zoneId: z.hauntedMarsh, level: 27, hp: 85, attack: 28, defence: 18, evasion: 7, damageMin: 7, damageMax: 14, xpReward: 80, spellPattern: [spell(2, 'Dark Shield', { buff: true }), spell(4, 'Poison Cloud', { damage: 10 }), spell(6, 'Curse of Weakness', { debuff: true }), spell(8, 'Cataclysm', { damage: 18 })] }),

    // ── Crystal Caverns (diff 4) ──────────────────────────────────────────
    mob({ id: m.goblinGemHunter, name: 'Goblin Gem Hunter', zoneId: z.crystalCaverns, level: 18, hp: 38, attack: 22, defence: 12, evasion: 6, damageMin: 4, damageMax: 9, xpReward: 36 }),
    mob({ id: m.goblinTunneler, name: 'Goblin Tunneler', zoneId: z.crystalCaverns, level: 19, hp: 42, attack: 20, defence: 14, evasion: 4, damageMin: 5, damageMax: 9, xpReward: 38 }),
    mob({ id: m.goblinArtificer, name: 'Goblin Artificer', zoneId: z.crystalCaverns, level: 23, hp: 60, attack: 26, defence: 16, evasion: 5, damageMin: 6, damageMax: 11, xpReward: 56, spellPattern: [spell(3, 'Bomb Trap', { damage: 9 }), spell(5, 'Gadget Shield', { buff: true })] }),
    mob({ id: m.goblinKingMob, name: 'Goblin King', zoneId: z.crystalCaverns, level: 27, hp: 95, attack: 30, defence: 22, evasion: 5, damageMin: 7, damageMax: 15, xpReward: 82, spellPattern: [spell(2, 'Royal Decree', { buff: true }), spell(4, 'Golden Strike', { damage: 12 }), spell(6, 'Gem Barrage', { damage: 14 }), spell(8, "Crown's Fury", { damage: 20 })] }),
    mob({ id: m.crystalGolemCav, name: 'Crystal Golem', zoneId: z.crystalCaverns, level: 19, hp: 60, attack: 16, defence: 26, evasion: 0, damageMin: 5, damageMax: 10, xpReward: 38 }),
    mob({ id: m.gemConstruct, name: 'Gem Construct', zoneId: z.crystalCaverns, level: 19, hp: 55, attack: 18, defence: 24, evasion: 0, damageMin: 5, damageMax: 9, xpReward: 36 }),
    mob({ id: m.diamondGolemMob, name: 'Diamond Golem', zoneId: z.crystalCaverns, level: 24, hp: 90, attack: 22, defence: 32, evasion: 0, damageMin: 7, damageMax: 13, xpReward: 60, spellPattern: [spell(4, 'Crystal Slam', { damage: 11 }), spell(6, 'Diamond Shell', { buff: true })] }),
    mob({ id: m.golemOverlord, name: 'Golem Overlord', zoneId: z.crystalCaverns, level: 28, hp: 130, attack: 26, defence: 36, evasion: 0, damageMin: 8, damageMax: 16, xpReward: 90, spellPattern: [spell(3, 'Shockwave', { damage: 10 }), spell(5, 'Crystal Prison', { debuff: true }), spell(7, 'Overload', { damage: 16 }), spell(9, 'Collapse', { damage: 22 })] }),
    mob({ id: m.shardElemental, name: 'Shard Elemental', zoneId: z.crystalCaverns, level: 19, hp: 40, attack: 24, defence: 14, evasion: 8, damageMin: 5, damageMax: 9, xpReward: 38, spellPattern: [spell(3, 'Crystal Shard', { damage: 6 })] }),
    mob({ id: m.crystalWispMob, name: 'Crystal Wisp', zoneId: z.crystalCaverns, level: 19, hp: 30, attack: 22, defence: 10, evasion: 12, damageMin: 4, damageMax: 8, xpReward: 36 }),
    mob({ id: m.stormCrystalMob, name: 'Storm Crystal', zoneId: z.crystalCaverns, level: 23, hp: 55, attack: 28, defence: 18, evasion: 7, damageMin: 6, damageMax: 12, xpReward: 58, spellPattern: [spell(3, 'Lightning Arc', { damage: 9 }), spell(5, 'Static Field', { debuff: true })] }),
    mob({ id: m.crystalTitan, name: 'Crystal Titan', zoneId: z.crystalCaverns, level: 27, hp: 90, attack: 32, defence: 24, evasion: 5, damageMin: 8, damageMax: 16, xpReward: 85, spellPattern: [spell(2, 'Resonance', { buff: true }), spell(4, 'Crystal Storm', { damage: 12 }), spell(6, 'Prism Beam', { damage: 16 }), spell(8, 'Shatter All', { damage: 22 })] }),

    // ── Sunken Ruins (diff 5, dead end) ───────────────────────────────────
    mob({ id: m.drownedSailor, name: 'Drowned Sailor', zoneId: z.sunkenRuins, level: 28, hp: 55, attack: 26, defence: 18, evasion: 4, damageMin: 6, damageMax: 11, xpReward: 48 }),
    mob({ id: m.skeletalKnight, name: 'Skeletal Knight', zoneId: z.sunkenRuins, level: 29, hp: 65, attack: 28, defence: 22, evasion: 3, damageMin: 6, damageMax: 12, xpReward: 52 }),
    mob({ id: m.spectralCaptain, name: 'Spectral Captain', zoneId: z.sunkenRuins, level: 32, hp: 80, attack: 32, defence: 20, evasion: 8, damageMin: 8, damageMax: 14, xpReward: 72, spellPattern: [spell(3, 'Ghost Blade', { damage: 10 }), spell(5, 'Spectral Chains', { debuff: true })] }),
    mob({ id: m.lich, name: 'Lich', zoneId: z.sunkenRuins, level: 36, hp: 120, attack: 36, defence: 26, evasion: 6, damageMin: 9, damageMax: 18, xpReward: 110, spellPattern: [spell(2, 'Death Ward', { buff: true }), spell(4, 'Necrotic Bolt', { damage: 14 }), spell(6, 'Raise Dead', { buff: true }), spell(8, 'Soul Harvest', { damage: 22 })] }),
    mob({ id: m.seaSnake, name: 'Sea Snake', zoneId: z.sunkenRuins, level: 28, hp: 45, attack: 28, defence: 14, evasion: 10, damageMin: 5, damageMax: 10, xpReward: 48, spellPattern: [spell(3, 'Venom Strike', { damage: 6 })] }),
    mob({ id: m.marshViper, name: 'Marsh Viper', zoneId: z.sunkenRuins, level: 28, hp: 40, attack: 30, defence: 12, evasion: 12, damageMin: 5, damageMax: 11, xpReward: 50 }),
    mob({ id: m.nagaWarrior, name: 'Naga Warrior', zoneId: z.sunkenRuins, level: 32, hp: 70, attack: 34, defence: 22, evasion: 8, damageMin: 7, damageMax: 14, xpReward: 74, spellPattern: [spell(3, 'Trident Thrust', { damage: 11 }), spell(5, 'Scale Shield', { buff: true })] }),
    mob({ id: m.nagaQueenMob, name: 'Naga Queen', zoneId: z.sunkenRuins, level: 36, hp: 110, attack: 38, defence: 28, evasion: 7, damageMin: 9, damageMax: 18, xpReward: 105, spellPattern: [spell(2, 'Tidal Blessing', { buff: true }), spell(4, 'Water Jet', { damage: 14 }), spell(6, 'Constrict', { debuff: true }), spell(8, 'Tsunami', { damage: 24 })] }),
    mob({ id: m.ooze, name: 'Ooze', zoneId: z.sunkenRuins, level: 28, hp: 60, attack: 20, defence: 20, evasion: 0, damageMin: 5, damageMax: 10, xpReward: 46, spellPattern: [spell(3, 'Acid Splash', { damage: 6 })] }),
    mob({ id: m.tentacleHorror, name: 'Tentacle Horror', zoneId: z.sunkenRuins, level: 29, hp: 50, attack: 26, defence: 16, evasion: 4, damageMin: 6, damageMax: 11, xpReward: 50, spellPattern: [spell(3, 'Grapple', { debuff: true })] }),
    mob({ id: m.fleshGolem, name: 'Flesh Golem', zoneId: z.sunkenRuins, level: 32, hp: 90, attack: 30, defence: 24, evasion: 0, damageMin: 8, damageMax: 14, xpReward: 72, spellPattern: [spell(3, 'Slam', { damage: 10 }), spell(6, 'Regenerate', { heal: 10 })] }),
    mob({ id: m.eldritchAbomination, name: 'Eldritch Abomination', zoneId: z.sunkenRuins, level: 36, hp: 140, attack: 34, defence: 28, evasion: 3, damageMin: 10, damageMax: 20, xpReward: 120, spellPattern: [spell(2, 'Madness Aura', { debuff: true }), spell(4, 'Void Bolt', { damage: 14 }), spell(6, 'Tentacle Storm', { damage: 18 }), spell(9, 'Consume', { damage: 28 })] }),
  ];
}
