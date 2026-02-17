-- AlterTable
ALTER TABLE "mob_templates" ADD COLUMN     "exploration_tier" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "zone_connections" ADD COLUMN     "exploration_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "zones" ADD COLUMN     "exploration_tiers" JSONB,
ADD COLUMN     "turns_to_explore" INTEGER;

-- CreateTable
CREATE TABLE "player_zone_explorations" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "turns_explored" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "player_zone_explorations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_zone_explorations_player_id_idx" ON "player_zone_explorations"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_zone_explorations_player_id_zone_id_key" ON "player_zone_explorations"("player_id", "zone_id");

-- AddForeignKey
ALTER TABLE "player_zone_explorations" ADD CONSTRAINT "player_zone_explorations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_zone_explorations" ADD CONSTRAINT "player_zone_explorations_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
