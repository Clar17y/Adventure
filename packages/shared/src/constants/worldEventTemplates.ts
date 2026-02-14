import type { WorldEventEffectType, WorldEventScope, WorldEventType } from '../types/worldEvent.types';

export interface WorldEventTemplate {
  type: WorldEventType;
  scope: WorldEventScope;
  title: string;
  /** Use {target} placeholder — replaced at spawn with the resolved target name */
  description: string;
  effectType: WorldEventEffectType;
  effectValue: number;
  weight: number;
  /** 'zone' = affects all mobs/resources in zone; 'family' or 'resource' = targets a specific one */
  targeting: 'zone' | 'family' | 'resource';
  /** When set, locks this template to an exact mob family name or resource type (matched case-insensitive). */
  fixedTarget?: string;
}

export const WORLD_EVENT_TEMPLATES: WorldEventTemplate[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // ZONE-SCOPED EVENTS (one zone, random or zone-wide)
  // ═══════════════════════════════════════════════════════════════════════

  // Resource — zone-wide
  { type: 'resource', scope: 'zone', title: 'Bountiful Harvest',   description: 'All resources in this zone yield more than usual.',        effectType: 'yield_up',       effectValue: 0.25, weight: 15, targeting: 'zone' },
  { type: 'resource', scope: 'zone', title: 'Barren Lands',         description: 'Resources in this zone yield less than usual.',            effectType: 'yield_down',     effectValue: 0.25, weight: 10, targeting: 'zone' },
  { type: 'resource', scope: 'zone', title: 'Lucky Finds',          description: 'Rare materials are easier to find here.',                  effectType: 'drop_rate_up',   effectValue: 0.30, weight: 15, targeting: 'zone' },
  { type: 'resource', scope: 'zone', title: 'Picked Clean',         description: 'Good materials are harder to find here.',                  effectType: 'drop_rate_down', effectValue: 0.25, weight: 10, targeting: 'zone' },

  // Resource — random target in zone
  { type: 'resource', scope: 'zone', title: 'Rich {target} Veins',  description: '{target} deposits are unusually abundant.',                effectType: 'yield_up',       effectValue: 0.50, weight: 20, targeting: 'resource' },
  { type: 'resource', scope: 'zone', title: '{target} Shortage',     description: '{target} deposits have dried up in this zone.',            effectType: 'yield_down',     effectValue: 0.30, weight: 10, targeting: 'resource' },

  // Mob — zone-wide
  { type: 'mob', scope: 'zone', title: 'Frenzy',                    description: 'All monsters in this zone deal increased damage.',         effectType: 'damage_up',       effectValue: 0.25, weight: 15, targeting: 'zone' },
  { type: 'mob', scope: 'zone', title: 'Scorched Earth',             description: 'Monsters in this zone deal reduced damage.',              effectType: 'damage_down',     effectValue: 0.25, weight: 10, targeting: 'zone' },
  { type: 'mob', scope: 'zone', title: 'Fortified Beasts',           description: 'All monsters in this zone have more health.',             effectType: 'hp_up',           effectValue: 0.30, weight: 15, targeting: 'zone' },
  { type: 'mob', scope: 'zone', title: 'Weakened Foes',              description: 'All monsters in this zone have reduced health.',          effectType: 'hp_down',         effectValue: 0.20, weight: 10, targeting: 'zone' },
  { type: 'mob', scope: 'zone', title: 'Swarming',                   description: 'More monsters roam this zone.',                           effectType: 'spawn_rate_up',   effectValue: 0.50, weight: 10, targeting: 'zone' },
  { type: 'mob', scope: 'zone', title: 'Thinning Herd',              description: 'Fewer monsters roam this zone.',                          effectType: 'spawn_rate_down', effectValue: 0.30, weight: 10, targeting: 'zone' },

  // Mob — random family in zone
  { type: 'mob', scope: 'zone', title: '{target} Uprising',          description: '{target} are rampaging through this zone, dealing extra damage.', effectType: 'damage_up',     effectValue: 0.40, weight: 15, targeting: 'family' },
  { type: 'mob', scope: 'zone', title: 'Plague of {target}',         description: '{target} are swarming this zone in greater numbers.',             effectType: 'spawn_rate_up', effectValue: 0.75, weight: 10, targeting: 'family' },
  { type: 'mob', scope: 'zone', title: '{target} Weakening',         description: 'A blight has weakened the {target} in this zone.',                effectType: 'hp_down',       effectValue: 0.30, weight: 15, targeting: 'family' },

  // ═══════════════════════════════════════════════════════════════════════
  // WORLD-WIDE — SIGNATURE EVENTS (fixed target, thematic)
  // One per mob family + one per resource type.
  // ═══════════════════════════════════════════════════════════════════════

  // ── Mob families ───────────────────────────────────────────────────────
  { type: 'mob', scope: 'world', title: 'Corruption Surge',     description: 'A wave of corruption strengthens Abominations everywhere.',             effectType: 'hp_up',         effectValue: 0.35, weight: 8, targeting: 'family', fixedTarget: 'Abominations' },
  { type: 'mob', scope: 'world', title: 'Bandit Alliance',      description: 'Bandit clans have formed an alliance, raiding in greater numbers.',     effectType: 'spawn_rate_up', effectValue: 0.50, weight: 8, targeting: 'family', fixedTarget: 'Bandits' },
  { type: 'mob', scope: 'world', title: 'Eclipse',              description: 'An eclipse darkens the sky — Bats swarm in unprecedented numbers.',     effectType: 'spawn_rate_up', effectValue: 0.50, weight: 8, targeting: 'family', fixedTarget: 'Bats' },
  { type: 'mob', scope: 'world', title: 'Rutting Season',       description: 'Boars are unusually aggressive during mating season.',                  effectType: 'damage_up',     effectValue: 0.30, weight: 8, targeting: 'family', fixedTarget: 'Boars' },
  { type: 'mob', scope: 'world', title: 'Tunnel Collapse',      description: 'Collapsed tunnels have driven Crawlers to the surface in droves.',      effectType: 'spawn_rate_up', effectValue: 0.60, weight: 8, targeting: 'family', fixedTarget: 'Crawlers' },
  { type: 'mob', scope: 'world', title: 'Arcane Surge',         description: 'A magical disturbance empowers Elementals everywhere.',                  effectType: 'damage_up',     effectValue: 0.35, weight: 8, targeting: 'family', fixedTarget: 'Elementals' },
  { type: 'mob', scope: 'world', title: 'Midsummer\'s Eve',     description: 'The fae courts are celebrating — Fae grow wild with power.',            effectType: 'damage_up',     effectValue: 0.30, weight: 8, targeting: 'family', fixedTarget: 'Fae' },
  { type: 'mob', scope: 'world', title: 'Goblin Uprising',      description: 'Goblins have organized raids across all regions.',                      effectType: 'spawn_rate_up', effectValue: 0.60, weight: 8, targeting: 'family', fixedTarget: 'Goblins' },
  { type: 'mob', scope: 'world', title: 'Tremors',              description: 'Seismic tremors are cracking Golem shells across the land.',            effectType: 'hp_down',       effectValue: 0.30, weight: 8, targeting: 'family', fixedTarget: 'Golems' },
  { type: 'mob', scope: 'world', title: 'Nesting Season',       description: 'Harpies are fiercely protecting their nests.',                          effectType: 'damage_up',     effectValue: 0.35, weight: 8, targeting: 'family', fixedTarget: 'Harpies' },
  { type: 'mob', scope: 'world', title: 'Shedding Season',      description: 'Serpents are shedding their scales, leaving them vulnerable.',           effectType: 'hp_down',       effectValue: 0.25, weight: 8, targeting: 'family', fixedTarget: 'Serpents' },
  { type: 'mob', scope: 'world', title: 'Hatching Season',      description: 'Spider eggs are hatching everywhere — Spiders swarm the land.',         effectType: 'spawn_rate_up', effectValue: 0.75, weight: 8, targeting: 'family', fixedTarget: 'Spiders' },
  { type: 'mob', scope: 'world', title: 'Thinning Veil',        description: 'The veil between worlds weakens — Spirits grow stronger.',              effectType: 'hp_up',         effectValue: 0.25, weight: 8, targeting: 'family', fixedTarget: 'Spirits' },
  { type: 'mob', scope: 'world', title: 'Rising Waters',        description: 'Flooding drives Swamp Beasts from their lairs in great numbers.',       effectType: 'spawn_rate_up', effectValue: 0.50, weight: 8, targeting: 'family', fixedTarget: 'Swamp Beasts' },
  { type: 'mob', scope: 'world', title: 'Forest Fires',         description: 'Wildfires have weakened Treants across every forest.',                   effectType: 'hp_down',       effectValue: 0.35, weight: 8, targeting: 'family', fixedTarget: 'Treants' },
  { type: 'mob', scope: 'world', title: 'Unholy Night',         description: 'Dark energy surges through the land, empowering the Undead.',           effectType: 'hp_up',         effectValue: 0.30, weight: 8, targeting: 'family', fixedTarget: 'Undead' },
  { type: 'mob', scope: 'world', title: 'Plague Carriers',      description: 'Disease is spreading — Vermin multiply across every region.',            effectType: 'spawn_rate_up', effectValue: 0.75, weight: 8, targeting: 'family', fixedTarget: 'Vermin' },
  { type: 'mob', scope: 'world', title: 'Blood Moon',           description: 'A blood moon empowers all Witches with dark energy.',                    effectType: 'damage_up',     effectValue: 0.40, weight: 8, targeting: 'family', fixedTarget: 'Witches' },
  { type: 'mob', scope: 'world', title: 'Full Moon',            description: 'The full moon drives all Wolves into a frenzy.',                         effectType: 'damage_up',     effectValue: 0.35, weight: 8, targeting: 'family', fixedTarget: 'Wolves' },

  // ── Resource types ─────────────────────────────────────────────────────
  { type: 'resource', scope: 'world', title: 'Tidal Surge',           description: 'Surging tides wash up more Abyssal Kelp than ever.',              effectType: 'yield_up',      effectValue: 0.35, weight: 8, targeting: 'resource', fixedTarget: 'Abyssal Kelp' },
  { type: 'resource', scope: 'world', title: 'Ancient Awakening',     description: 'Seismic activity has unearthed Ancient Ore in every region.',     effectType: 'drop_rate_up',  effectValue: 0.35, weight: 8, targeting: 'resource', fixedTarget: 'Ancient Ore' },
  { type: 'resource', scope: 'world', title: 'Swamp Bloom',           description: 'Warm rains cause Bogwood to flourish across every swamp.',        effectType: 'yield_up',      effectValue: 0.30, weight: 8, targeting: 'resource', fixedTarget: 'Bogwood Log' },
  { type: 'resource', scope: 'world', title: 'Damp Season',           description: 'Persistent moisture brings Cave Moss growth to every cavern.',    effectType: 'yield_up',      effectValue: 0.30, weight: 8, targeting: 'resource', fixedTarget: 'Cave Moss' },
  { type: 'resource', scope: 'world', title: 'Copper Glut',           description: 'Copper veins shimmer across the land — yields are bountiful.',    effectType: 'yield_up',      effectValue: 0.35, weight: 8, targeting: 'resource', fixedTarget: 'Copper Ore' },
  { type: 'resource', scope: 'world', title: 'Crystal Resonance',     description: 'A harmonic frequency makes Crystal Wood easier to find.',         effectType: 'drop_rate_up',  effectValue: 0.35, weight: 8, targeting: 'resource', fixedTarget: 'Crystal Wood' },
  { type: 'resource', scope: 'world', title: 'Volcanic Activity',     description: 'Underground volcanic activity exposes Dark Iron Ore veins.',      effectType: 'yield_up',      effectValue: 0.45, weight: 8, targeting: 'resource', fixedTarget: 'Dark Iron Ore' },
  { type: 'resource', scope: 'world', title: 'Ancient Growth',        description: 'A surge of life magic causes Elderwood to grow rapidly.',          effectType: 'yield_up',      effectValue: 0.35, weight: 8, targeting: 'resource', fixedTarget: 'Elderwood Log' },
  { type: 'resource', scope: 'world', title: 'Drought Season',        description: 'A prolonged drought has withered herbs across the land.',          effectType: 'yield_down',    effectValue: 0.30, weight: 8, targeting: 'resource', fixedTarget: 'Forest Sage' },
  { type: 'resource', scope: 'world', title: 'Fungal Bloom',          description: 'Warm humidity triggers massive Fungal Wood growth.',               effectType: 'yield_up',      effectValue: 0.30, weight: 8, targeting: 'resource', fixedTarget: 'Fungal Wood' },
  { type: 'resource', scope: 'world', title: 'Spore Season',          description: 'Perfect conditions trigger massive Glowcap Mushroom growth.',     effectType: 'yield_up',      effectValue: 0.35, weight: 8, targeting: 'resource', fixedTarget: 'Glowcap Mushroom' },
  { type: 'resource', scope: 'world', title: 'Death\'s Harvest',      description: 'Necrotic energy causes Gravemoss to spread rapidly.',              effectType: 'drop_rate_up',  effectValue: 0.30, weight: 8, targeting: 'resource', fixedTarget: 'Gravemoss' },
  { type: 'resource', scope: 'world', title: 'Mineral Rush',          description: 'Geological upheaval has exposed Iron Ore deposits everywhere.',    effectType: 'yield_up',      effectValue: 0.40, weight: 8, targeting: 'resource', fixedTarget: 'Iron Ore' },
  { type: 'resource', scope: 'world', title: 'Autumn Winds',          description: 'Strong autumn winds have felled Maples across every forest.',      effectType: 'yield_up',      effectValue: 0.30, weight: 8, targeting: 'resource', fixedTarget: 'Maple Log' },
  { type: 'resource', scope: 'world', title: 'Celestial Alignment',   description: 'A rare celestial event causes Mithril deposits to surface.',       effectType: 'yield_up',      effectValue: 0.50, weight: 8, targeting: 'resource', fixedTarget: 'Mithril Ore' },
  { type: 'resource', scope: 'world', title: 'Lunar Bloom',           description: 'A bright moon causes Moonpetals to bloom across every meadow.',    effectType: 'yield_up',      effectValue: 0.40, weight: 8, targeting: 'resource', fixedTarget: 'Moonpetal' },
  { type: 'resource', scope: 'world', title: 'Timber Rot',            description: 'A fungal blight is rotting Oak Logs throughout the forests.',       effectType: 'yield_down',    effectValue: 0.25, weight: 8, targeting: 'resource', fixedTarget: 'Oak Log' },
  { type: 'resource', scope: 'world', title: 'Fossil Exposure',       description: 'Erosion has uncovered Petrified Wood deposits everywhere.',        effectType: 'drop_rate_up',  effectValue: 0.35, weight: 8, targeting: 'resource', fixedTarget: 'Petrified Wood' },
  { type: 'resource', scope: 'world', title: 'Desert Winds',          description: 'Strong winds strip the land bare, exposing Sandstone deposits.',   effectType: 'yield_up',      effectValue: 0.30, weight: 8, targeting: 'resource', fixedTarget: 'Sandstone' },
  { type: 'resource', scope: 'world', title: 'Phosphorescent Tide',   description: 'A luminous tide energizes Shimmer Fern growth everywhere.',        effectType: 'yield_up',      effectValue: 0.35, weight: 8, targeting: 'resource', fixedTarget: 'Shimmer Fern' },
  { type: 'resource', scope: 'world', title: 'Star Shower',           description: 'A meteor shower energizes Starbloom patches everywhere.',          effectType: 'drop_rate_up',  effectValue: 0.40, weight: 8, targeting: 'resource', fixedTarget: 'Starbloom' },
  { type: 'resource', scope: 'world', title: 'Prospector\'s Fortune', description: 'New Tin Ore deposits have been found across every mine.',           effectType: 'drop_rate_up',  effectValue: 0.30, weight: 8, targeting: 'resource', fixedTarget: 'Tin Ore' },
  { type: 'resource', scope: 'world', title: 'River Swelling',        description: 'Swollen rivers nourish Willows, increasing their growth.',         effectType: 'yield_up',      effectValue: 0.30, weight: 8, targeting: 'resource', fixedTarget: 'Willow Log' },
  { type: 'resource', scope: 'world', title: 'Zephyr Season',         description: 'Gentle winds carry Windbloom seeds across every meadow.',          effectType: 'yield_up',      effectValue: 0.35, weight: 8, targeting: 'resource', fixedTarget: 'Windbloom' },

  // ═══════════════════════════════════════════════════════════════════════
  // WORLD-WIDE — GENERIC (random target, covers all effect types)
  // These pick a random family/resource at spawn, ensuring every effect
  // type can fire even if no signature template exists for that combo.
  // ═══════════════════════════════════════════════════════════════════════

  // Mob — one per effect type
  { type: 'mob', scope: 'world', title: 'Predator\'s Instinct',   description: 'A primal surge makes {target} more aggressive across the land.',     effectType: 'damage_up',       effectValue: 0.30, weight: 6, targeting: 'family' },
  { type: 'mob', scope: 'world', title: 'Exhaustion',             description: 'A strange lethargy weakens {target} everywhere.',                     effectType: 'damage_down',     effectValue: 0.25, weight: 6, targeting: 'family' },
  { type: 'mob', scope: 'world', title: 'Unnatural Growth',       description: 'Strange magic causes {target} to grow larger and hardier.',           effectType: 'hp_up',           effectValue: 0.30, weight: 6, targeting: 'family' },
  { type: 'mob', scope: 'world', title: 'Celestial Convergence',  description: 'A rare alignment weakens {target} everywhere.',                       effectType: 'hp_down',         effectValue: 0.25, weight: 6, targeting: 'family' },
  { type: 'mob', scope: 'world', title: 'Mass Migration',         description: '{target} are migrating in great numbers across the land.',             effectType: 'spawn_rate_up',   effectValue: 0.50, weight: 6, targeting: 'family' },
  { type: 'mob', scope: 'world', title: 'Culling',                description: 'Hunters have been culling {target} — fewer roam the wilds.',           effectType: 'spawn_rate_down', effectValue: 0.30, weight: 6, targeting: 'family' },

  // Resource — one per effect type
  { type: 'resource', scope: 'world', title: 'Harvest Moon',        description: 'The harvest moon blesses {target} yields across every region.',     effectType: 'yield_up',        effectValue: 0.35, weight: 6, targeting: 'resource' },
  { type: 'resource', scope: 'world', title: 'Blighted Earth',      description: 'A creeping blight withers {target} across the land.',               effectType: 'yield_down',      effectValue: 0.30, weight: 6, targeting: 'resource' },
  { type: 'resource', scope: 'world', title: 'Prospector\'s Rumour', description: 'Rumours spread of abundant {target} — and they\'re true.',          effectType: 'drop_rate_up',    effectValue: 0.30, weight: 6, targeting: 'resource' },
  { type: 'resource', scope: 'world', title: 'Scarcity',            description: 'Overharvesting has made {target} scarce across the land.',           effectType: 'drop_rate_down',  effectValue: 0.25, weight: 6, targeting: 'resource' },
];
