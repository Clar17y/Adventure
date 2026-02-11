-- AlterTable
ALTER TABLE "players" ADD COLUMN     "current_zone_id" TEXT,
ADD COLUMN     "home_town_id" TEXT,
ADD COLUMN     "last_travelled_from_zone_id" TEXT;

-- AlterTable
ALTER TABLE "zones" ADD COLUMN     "zone_exit_chance" DOUBLE PRECISION,
ADD COLUMN     "zone_type" VARCHAR(16) NOT NULL DEFAULT 'wild';

-- CreateTable
CREATE TABLE "zone_connections" (
    "id" TEXT NOT NULL,
    "from_zone_id" TEXT NOT NULL,
    "to_zone_id" TEXT NOT NULL,

    CONSTRAINT "zone_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_zone_discoveries" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_zone_discoveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zone_connections_from_zone_id_to_zone_id_key" ON "zone_connections"("from_zone_id", "to_zone_id");

-- CreateIndex
CREATE INDEX "player_zone_discoveries_player_id_idx" ON "player_zone_discoveries"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_zone_discoveries_player_id_zone_id_key" ON "player_zone_discoveries"("player_id", "zone_id");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_current_zone_id_fkey" FOREIGN KEY ("current_zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_last_travelled_from_zone_id_fkey" FOREIGN KEY ("last_travelled_from_zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_home_town_id_fkey" FOREIGN KEY ("home_town_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_connections" ADD CONSTRAINT "zone_connections_from_zone_id_fkey" FOREIGN KEY ("from_zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_connections" ADD CONSTRAINT "zone_connections_to_zone_id_fkey" FOREIGN KEY ("to_zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_zone_discoveries" ADD CONSTRAINT "player_zone_discoveries_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_zone_discoveries" ADD CONSTRAINT "player_zone_discoveries_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
