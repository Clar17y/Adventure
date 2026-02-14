-- AlterTable: make zone_id nullable for world-wide events
ALTER TABLE "world_events" ALTER COLUMN "zone_id" DROP NOT NULL;
