-- Rename mob attack column to accuracy and normalize values for direct hit checks.
ALTER TABLE "mob_templates"
RENAME COLUMN "attack" TO "accuracy";

-- Previous combat logic derived accuracy as floor(attack / 2).
-- Preserve equivalent behavior for existing data after switching to raw accuracy.
UPDATE "mob_templates"
SET "accuracy" = FLOOR("accuracy"::numeric / 2)::int;
