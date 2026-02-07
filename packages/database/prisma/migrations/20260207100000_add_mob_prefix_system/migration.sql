-- AlterTable
ALTER TABLE "pending_encounters"
ADD COLUMN "mob_prefix" VARCHAR(32);

-- CreateTable
CREATE TABLE "player_bestiary_prefixes" (
    "player_id" TEXT NOT NULL,
    "mob_template_id" TEXT NOT NULL,
    "prefix" VARCHAR(32) NOT NULL,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_bestiary_prefixes_pkey" PRIMARY KEY ("player_id", "mob_template_id", "prefix")
);

-- AddForeignKey
ALTER TABLE "player_bestiary_prefixes" ADD CONSTRAINT "player_bestiary_prefixes_player_id_fkey"
FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_bestiary_prefixes" ADD CONSTRAINT "player_bestiary_prefixes_mob_template_id_fkey"
FOREIGN KEY ("mob_template_id") REFERENCES "mob_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
