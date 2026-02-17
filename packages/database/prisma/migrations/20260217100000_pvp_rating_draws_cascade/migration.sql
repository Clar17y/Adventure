-- AlterTable: add draws counter to pvp_ratings
ALTER TABLE "pvp_ratings" ADD COLUMN "draws" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: change pvp_ratings foreign key to cascade on delete
ALTER TABLE "pvp_ratings" DROP CONSTRAINT "pvp_ratings_player_id_fkey";
ALTER TABLE "pvp_ratings" ADD CONSTRAINT "pvp_ratings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
