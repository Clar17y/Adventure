-- Add magic defence and damage type columns to mob templates.
ALTER TABLE "mob_templates"
ADD COLUMN "magic_defence" INT NOT NULL DEFAULT 0,
ADD COLUMN "damage_type" TEXT NOT NULL DEFAULT 'physical';
