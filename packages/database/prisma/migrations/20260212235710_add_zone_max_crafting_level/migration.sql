-- AlterTable
ALTER TABLE "zones" ADD COLUMN     "max_crafting_level" INTEGER DEFAULT 0;

-- Set town crafting levels for existing data
UPDATE "zones" SET "max_crafting_level" = 20 WHERE "name" = 'Millbrook';
UPDATE "zones" SET "max_crafting_level" = NULL WHERE "name" = 'Thornwall';
