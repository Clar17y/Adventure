-- Armor requirements are now based on player character level, not skill type.
UPDATE "item_templates"
SET "required_skill" = NULL
WHERE "item_type" = 'armor'
  AND "required_skill" IS NOT NULL;
