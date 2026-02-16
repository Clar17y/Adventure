-- AlterTable
ALTER TABLE "boss_encounters" ADD COLUMN     "round_summaries" JSONB;

-- AlterTable
ALTER TABLE "boss_participants" ADD COLUMN     "attacks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "auto_sign_up" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "crits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hits" INTEGER NOT NULL DEFAULT 0;
