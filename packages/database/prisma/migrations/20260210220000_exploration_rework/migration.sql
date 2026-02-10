-- AlterTable
ALTER TABLE "player_resource_nodes"
ADD COLUMN "decayed_capacity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "mob_families" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "site_noun_small" VARCHAR(64) NOT NULL,
    "site_noun_medium" VARCHAR(64) NOT NULL,
    "site_noun_large" VARCHAR(64) NOT NULL,

    CONSTRAINT "mob_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mob_family_members" (
    "mob_family_id" TEXT NOT NULL,
    "mob_template_id" TEXT NOT NULL,
    "role" VARCHAR(16) NOT NULL,

    CONSTRAINT "mob_family_members_pkey" PRIMARY KEY ("mob_family_id", "mob_template_id", "role")
);

-- CreateTable
CREATE TABLE "zone_mob_families" (
    "zone_id" TEXT NOT NULL,
    "mob_family_id" TEXT NOT NULL,
    "discovery_weight" INTEGER NOT NULL DEFAULT 100,
    "min_size" VARCHAR(16) NOT NULL,
    "max_size" VARCHAR(16) NOT NULL,

    CONSTRAINT "zone_mob_families_pkey" PRIMARY KEY ("zone_id", "mob_family_id")
);

-- CreateTable
CREATE TABLE "encounter_sites" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "mob_family_id" TEXT NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "size" VARCHAR(16) NOT NULL,
    "mobs" JSONB NOT NULL,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_log_id" TEXT,

    CONSTRAINT "encounter_sites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mob_family_members_mob_template_id_idx" ON "mob_family_members"("mob_template_id");

-- CreateIndex
CREATE INDEX "zone_mob_families_zone_id_discovery_weight_idx" ON "zone_mob_families"("zone_id", "discovery_weight");

-- CreateIndex
CREATE INDEX "encounter_sites_player_id_discovered_at_idx" ON "encounter_sites"("player_id", "discovered_at");

-- CreateIndex
CREATE INDEX "encounter_sites_player_id_zone_id_idx" ON "encounter_sites"("player_id", "zone_id");

-- AddForeignKey
ALTER TABLE "mob_family_members" ADD CONSTRAINT "mob_family_members_mob_family_id_fkey"
FOREIGN KEY ("mob_family_id") REFERENCES "mob_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mob_family_members" ADD CONSTRAINT "mob_family_members_mob_template_id_fkey"
FOREIGN KEY ("mob_template_id") REFERENCES "mob_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_mob_families" ADD CONSTRAINT "zone_mob_families_zone_id_fkey"
FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_mob_families" ADD CONSTRAINT "zone_mob_families_mob_family_id_fkey"
FOREIGN KEY ("mob_family_id") REFERENCES "mob_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounter_sites" ADD CONSTRAINT "encounter_sites_player_id_fkey"
FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounter_sites" ADD CONSTRAINT "encounter_sites_zone_id_fkey"
FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounter_sites" ADD CONSTRAINT "encounter_sites_mob_family_id_fkey"
FOREIGN KEY ("mob_family_id") REFERENCES "mob_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounter_sites" ADD CONSTRAINT "encounter_sites_source_log_id_fkey"
FOREIGN KEY ("source_log_id") REFERENCES "activity_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropTable
DROP TABLE "pending_encounters";
