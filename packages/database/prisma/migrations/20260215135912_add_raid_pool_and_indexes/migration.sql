-- DropForeignKey
ALTER TABLE "world_events" DROP CONSTRAINT "world_events_zone_id_fkey";

-- AlterTable
ALTER TABLE "boss_encounters" ADD COLUMN     "raid_pool_hp" INTEGER,
ADD COLUMN     "raid_pool_max" INTEGER;

-- CreateIndex
CREATE INDEX "boss_encounters_status_next_round_at_idx" ON "boss_encounters"("status", "next_round_at");

-- CreateIndex
CREATE INDEX "boss_participants_encounter_id_round_number_idx" ON "boss_participants"("encounter_id", "round_number");

-- AddForeignKey
ALTER TABLE "world_events" ADD CONSTRAINT "world_events_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
