-- Backfill magic_defence and damage_type for existing mob_templates rows.
-- Run AFTER the migration that adds the columns (with defaults 0 / 'physical').

BEGIN;

-- ── Forest Edge ─────────────────────────────────────────────────────────────
UPDATE mob_templates SET magic_defence = 1  WHERE name = 'Forest Rat';
UPDATE mob_templates SET magic_defence = 0  WHERE name = 'Field Mouse';
UPDATE mob_templates SET magic_defence = 2  WHERE name = 'Giant Rat';
UPDATE mob_templates SET magic_defence = 3  WHERE name = 'Rat King';
UPDATE mob_templates SET magic_defence = 1  WHERE name = 'Forest Spider';
UPDATE mob_templates SET magic_defence = 1  WHERE name = 'Web Spinner';
UPDATE mob_templates SET magic_defence = 2  WHERE name = 'Venomous Spider';
UPDATE mob_templates SET magic_defence = 3  WHERE name = 'Brood Mother';
UPDATE mob_templates SET magic_defence = 2  WHERE name = 'Wild Boar';
UPDATE mob_templates SET magic_defence = 3  WHERE name = 'Tusked Boar';
UPDATE mob_templates SET magic_defence = 4  WHERE name = 'Great Boar';

-- ── Deep Forest ─────────────────────────────────────────────────────────────
UPDATE mob_templates SET magic_defence = 3  WHERE name = 'Young Wolf';
UPDATE mob_templates SET magic_defence = 4  WHERE name = 'Forest Wolf';
UPDATE mob_templates SET magic_defence = 5  WHERE name = 'Dire Wolf';
UPDATE mob_templates SET magic_defence = 6  WHERE name = 'Alpha Wolf';
UPDATE mob_templates SET magic_defence = 5  WHERE name = 'Woodland Bandit';
UPDATE mob_templates SET magic_defence = 4  WHERE name = 'Bandit Scout';
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Bandit Enforcer';
UPDATE mob_templates SET magic_defence = 10 WHERE name = 'Bandit Captain';
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Twig Blight';
UPDATE mob_templates SET magic_defence = 6  WHERE name = 'Bark Golem';
UPDATE mob_templates SET magic_defence = 10 WHERE name = 'Dark Treant' AND zone_id = (SELECT id FROM zones WHERE name = 'Deep Forest');
UPDATE mob_templates SET magic_defence = 12 WHERE name = 'Elder Treant';

-- ── Ancient Grove (many magic-type mobs) ────────────────────────────────────
UPDATE mob_templates SET magic_defence = 12, damage_type = 'magic' WHERE name = 'Forest Sprite';
UPDATE mob_templates SET magic_defence = 10, damage_type = 'magic' WHERE name = 'Wisp';
UPDATE mob_templates SET magic_defence = 18, damage_type = 'magic' WHERE name = 'Dryad';
UPDATE mob_templates SET magic_defence = 24, damage_type = 'magic' WHERE name = 'Ancient Spirit';
UPDATE mob_templates SET magic_defence = 9  WHERE name = 'Dark Treant' AND zone_id = (SELECT id FROM zones WHERE name = 'Ancient Grove');
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Moss Golem';
UPDATE mob_templates SET magic_defence = 13 WHERE name = 'Ancient Treant';
UPDATE mob_templates SET magic_defence = 15 WHERE name = 'Treant Patriarch';
UPDATE mob_templates SET magic_defence = 10, damage_type = 'magic' WHERE name = 'Pixie Swarm';
UPDATE mob_templates SET magic_defence = 14, damage_type = 'magic' WHERE name = 'Thorn Fairy';
UPDATE mob_templates SET magic_defence = 14 WHERE name = 'Fae Knight';
UPDATE mob_templates SET magic_defence = 26, damage_type = 'magic' WHERE name = 'Fae Queen';

-- ── Cave Entrance ───────────────────────────────────────────────────────────
UPDATE mob_templates SET magic_defence = 2  WHERE name = 'Cave Rat';
UPDATE mob_templates SET magic_defence = 3  WHERE name = 'Cavern Beetle';
UPDATE mob_templates SET magic_defence = 3  WHERE name = 'Giant Cave Spider';
UPDATE mob_templates SET magic_defence = 4  WHERE name = 'Rat Matriarch';
UPDATE mob_templates SET magic_defence = 2  WHERE name = 'Cave Bat';
UPDATE mob_templates SET magic_defence = 2  WHERE name = 'Dire Bat';
UPDATE mob_templates SET magic_defence = 6  WHERE name = 'Vampire Bat';
UPDATE mob_templates SET magic_defence = 4  WHERE name = 'Bat Swarm Lord';
UPDATE mob_templates SET magic_defence = 4  WHERE name = 'Goblin' AND zone_id = (SELECT id FROM zones WHERE name = 'Cave Entrance');
UPDATE mob_templates SET magic_defence = 3  WHERE name = 'Goblin Archer';
UPDATE mob_templates SET magic_defence = 5  WHERE name = 'Goblin Warrior';
UPDATE mob_templates SET magic_defence = 12, damage_type = 'magic' WHERE name = 'Goblin Shaman';

-- ── Deep Mines ──────────────────────────────────────────────────────────────
UPDATE mob_templates SET magic_defence = 6  WHERE name = 'Goblin Miner';
UPDATE mob_templates SET magic_defence = 5  WHERE name = 'Goblin Sapper';
UPDATE mob_templates SET magic_defence = 7  WHERE name = 'Goblin Foreman';
UPDATE mob_templates SET magic_defence = 10 WHERE name = 'Goblin Chieftain';
UPDATE mob_templates SET magic_defence = 6  WHERE name = 'Clay Golem';
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Stone Golem';
UPDATE mob_templates SET magic_defence = 10 WHERE name = 'Iron Golem';
UPDATE mob_templates SET magic_defence = 12 WHERE name = 'Crystal Golem' AND zone_id = (SELECT id FROM zones WHERE name = 'Deep Mines');
UPDATE mob_templates SET magic_defence = 5  WHERE name = 'Rock Crawler';
UPDATE mob_templates SET magic_defence = 4  WHERE name = 'Cave Lurker';
UPDATE mob_templates SET magic_defence = 6  WHERE name = 'Burrower';
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Tunnel Wyrm';

-- ── Whispering Plains ───────────────────────────────────────────────────────
UPDATE mob_templates SET magic_defence = 5  WHERE name = 'Plains Wolf';
UPDATE mob_templates SET magic_defence = 3  WHERE name = 'Coyote';
UPDATE mob_templates SET magic_defence = 6  WHERE name = 'Warg';
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Pack Alpha';
UPDATE mob_templates SET magic_defence = 6  WHERE name = 'Highway Bandit';
UPDATE mob_templates SET magic_defence = 5  WHERE name = 'Bandit Archer' AND zone_id = (SELECT id FROM zones WHERE name = 'Whispering Plains');
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Bandit Lieutenant';
UPDATE mob_templates SET magic_defence = 10 WHERE name = 'Bandit Warlord';
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Harpy';
UPDATE mob_templates SET magic_defence = 6  WHERE name = 'Harpy Scout';
UPDATE mob_templates SET magic_defence = 16, damage_type = 'magic' WHERE name = 'Harpy Windcaller';
UPDATE mob_templates SET magic_defence = 18, damage_type = 'magic' WHERE name = 'Harpy Matriarch';

-- ── Haunted Marsh ───────────────────────────────────────────────────────────
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Skeleton';
UPDATE mob_templates SET magic_defence = 6  WHERE name = 'Zombie';
UPDATE mob_templates SET magic_defence = 20, damage_type = 'magic' WHERE name = 'Wraith';
UPDATE mob_templates SET magic_defence = 14 WHERE name = 'Death Knight';
UPDATE mob_templates SET magic_defence = 5  WHERE name = 'Bog Toad';
UPDATE mob_templates SET magic_defence = 6  WHERE name = 'Marsh Crawler';
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Swamp Hydra';
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Ancient Crocodile';
UPDATE mob_templates SET magic_defence = 14, damage_type = 'magic' WHERE name = 'Hag Servant';
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Cursed Villager';
UPDATE mob_templates SET magic_defence = 18, damage_type = 'magic' WHERE name = 'Bog Witch';
UPDATE mob_templates SET magic_defence = 24, damage_type = 'magic' WHERE name = 'Coven Mother';

-- ── Crystal Caverns ─────────────────────────────────────────────────────────
UPDATE mob_templates SET magic_defence = 7  WHERE name = 'Goblin Gem Hunter';
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Goblin Tunneler';
UPDATE mob_templates SET magic_defence = 10 WHERE name = 'Goblin Artificer';
UPDATE mob_templates SET magic_defence = 14 WHERE name = 'Goblin King';
UPDATE mob_templates SET magic_defence = 10 WHERE name = 'Crystal Golem' AND zone_id = (SELECT id FROM zones WHERE name = 'Crystal Caverns');
UPDATE mob_templates SET magic_defence = 10 WHERE name = 'Gem Construct';
UPDATE mob_templates SET magic_defence = 12 WHERE name = 'Diamond Golem';
UPDATE mob_templates SET magic_defence = 14 WHERE name = 'Golem Overlord';
UPDATE mob_templates SET magic_defence = 18, damage_type = 'magic' WHERE name = 'Shard Elemental';
UPDATE mob_templates SET magic_defence = 14, damage_type = 'magic' WHERE name = 'Crystal Wisp';
UPDATE mob_templates SET magic_defence = 22, damage_type = 'magic' WHERE name = 'Storm Crystal';
UPDATE mob_templates SET magic_defence = 28, damage_type = 'magic' WHERE name = 'Crystal Titan';

-- ── Sunken Ruins ────────────────────────────────────────────────────────────
UPDATE mob_templates SET magic_defence = 10 WHERE name = 'Drowned Sailor';
UPDATE mob_templates SET magic_defence = 12 WHERE name = 'Skeletal Knight';
UPDATE mob_templates SET magic_defence = 24, damage_type = 'magic' WHERE name = 'Spectral Captain';
UPDATE mob_templates SET magic_defence = 34, damage_type = 'magic' WHERE name = 'Lich';
UPDATE mob_templates SET magic_defence = 6  WHERE name = 'Sea Snake';
UPDATE mob_templates SET magic_defence = 5  WHERE name = 'Marsh Viper';
UPDATE mob_templates SET magic_defence = 16 WHERE name = 'Naga Warrior';
UPDATE mob_templates SET magic_defence = 22, damage_type = 'magic' WHERE name = 'Naga Queen';
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Ooze';
UPDATE mob_templates SET magic_defence = 10 WHERE name = 'Tentacle Horror';
UPDATE mob_templates SET magic_defence = 8  WHERE name = 'Flesh Golem';
UPDATE mob_templates SET magic_defence = 32, damage_type = 'magic' WHERE name = 'Eldritch Abomination';

COMMIT;
