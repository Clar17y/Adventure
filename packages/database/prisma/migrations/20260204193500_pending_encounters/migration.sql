-- CreateTable
CREATE TABLE "pending_encounters" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "mob_template_id" TEXT NOT NULL,
    "turn_occurred" INTEGER NOT NULL,
    "source_log_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_encounters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_encounters_player_id_created_at_idx" ON "pending_encounters"("player_id", "created_at");

-- AddForeignKey
ALTER TABLE "pending_encounters" ADD CONSTRAINT "pending_encounters_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_encounters" ADD CONSTRAINT "pending_encounters_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_encounters" ADD CONSTRAINT "pending_encounters_mob_template_id_fkey" FOREIGN KEY ("mob_template_id") REFERENCES "mob_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_encounters" ADD CONSTRAINT "pending_encounters_source_log_id_fkey" FOREIGN KEY ("source_log_id") REFERENCES "activity_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

