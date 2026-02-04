-- AlterTable
ALTER TABLE "pending_encounters" ADD COLUMN "expires_at" TIMESTAMP(3);

-- Backfill
UPDATE "pending_encounters"
SET "expires_at" = "created_at" + interval '1 hour'
WHERE "expires_at" IS NULL;

-- Make required
ALTER TABLE "pending_encounters" ALTER COLUMN "expires_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "pending_encounters_player_id_expires_at_idx" ON "pending_encounters"("player_id", "expires_at");

