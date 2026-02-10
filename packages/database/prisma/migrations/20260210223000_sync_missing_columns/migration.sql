-- Sync columns that existed in schema/code but were missing from migration history.

ALTER TABLE "item_templates"
ADD COLUMN IF NOT EXISTS "weight_class" VARCHAR(16);

ALTER TABLE "players"
ADD COLUMN IF NOT EXISTS "character_xp" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "character_level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "attribute_points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "attributes" JSONB NOT NULL DEFAULT '{"vitality":0,"strength":0,"dexterity":0,"intelligence":0,"luck":0,"evasion":0}';
