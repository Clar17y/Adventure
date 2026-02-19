-- AlterTable
ALTER TABLE "encounter_sites" ADD COLUMN     "clear_strategy" VARCHAR(16),
ADD COLUMN     "current_room" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "full_clear_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "room_carry_hp" INTEGER;
