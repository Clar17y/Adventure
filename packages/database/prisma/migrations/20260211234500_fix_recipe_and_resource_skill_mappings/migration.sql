-- Fix incorrectly seeded gathering skill mappings on resource nodes
UPDATE "resource_nodes"
SET "skill_required" = CASE
  WHEN "resource_type" IN (
    'Copper Ore', 'Tin Ore', 'Iron Ore', 'Sandstone', 'Dark Iron Ore', 'Mithril Ore', 'Ancient Ore'
  ) THEN 'mining'
  WHEN "resource_type" IN (
    'Oak Log', 'Maple Log', 'Fungal Wood', 'Elderwood Log', 'Willow Log', 'Bogwood Log', 'Crystal Wood', 'Petrified Wood'
  ) THEN 'woodcutting'
  WHEN "resource_type" IN (
    'Forest Sage', 'Moonpetal', 'Cave Moss', 'Starbloom', 'Glowcap Mushroom', 'Windbloom', 'Gravemoss', 'Shimmer Fern', 'Abyssal Kelp'
  ) THEN 'foraging'
  ELSE "skill_required"
END;

-- Fix incorrectly seeded crafting skill mappings on recipes
UPDATE "crafting_recipes" AS cr
SET "skill_type" = CASE
  WHEN it."name" IN (
    'Copper Ingot', 'Tin Ingot', 'Iron Ingot', 'Cut Stone', 'Dark Iron Ingot', 'Mithril Ingot', 'Ancient Ingot',
    'Oak Plank', 'Maple Plank', 'Fungal Plank', 'Elderwood Plank', 'Willow Plank', 'Bogwood Plank', 'Crystal Plank', 'Petrified Plank'
  ) THEN 'refining'
  WHEN it."name" IN (
    'Rat Leather', 'Boar Leather', 'Wolf Leather', 'Bat Leather', 'Warg Leather', 'Chitin Plate', 'Croc Leather', 'Scale Mail', 'Naga Leather'
  ) THEN 'tanning'
  WHEN it."name" IN (
    'Silk Cloth', 'Woven Cloth', 'Fae Fabric', 'Cursed Fabric', 'Ethereal Cloth', 'Spectral Fabric'
  ) THEN 'weaving'
  WHEN it."name" IN (
    'Minor Health Potion', 'Health Potion', 'Antivenom Potion', 'Greater Health Potion', 'Resist Potion', 'Mana Potion', 'Elixir of Power'
  ) THEN 'alchemy'
  WHEN it."item_type" = 'armor' AND it."weight_class" = 'heavy' THEN 'armorsmithing'
  WHEN it."item_type" = 'armor' AND it."weight_class" = 'medium' THEN 'leatherworking'
  WHEN it."item_type" = 'armor' AND it."weight_class" = 'light' THEN 'tailoring'
  ELSE cr."skill_type"
END
FROM "item_templates" AS it
WHERE cr."result_template_id" = it."id";
