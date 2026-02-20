-- Add best_win_streak to pvp_ratings
ALTER TABLE "pvp_ratings" ADD COLUMN "best_win_streak" INTEGER NOT NULL DEFAULT 0;

-- Backfill best_win_streak from GREATEST(win_streak, player_stats.best_pvp_win_streak)
UPDATE "pvp_ratings" r
SET "best_win_streak" = GREATEST(
  r."win_streak",
  COALESCE((SELECT ps."best_pvp_win_streak" FROM "player_stats" ps WHERE ps."player_id" = r."player_id"), 0)
);

-- Drop derived columns from player_stats
ALTER TABLE "player_stats" DROP COLUMN "total_kills";
ALTER TABLE "player_stats" DROP COLUMN "total_boss_kills";
ALTER TABLE "player_stats" DROP COLUMN "total_boss_damage";
ALTER TABLE "player_stats" DROP COLUMN "total_pvp_wins";
ALTER TABLE "player_stats" DROP COLUMN "best_pvp_win_streak";
ALTER TABLE "player_stats" DROP COLUMN "total_zones_discovered";
ALTER TABLE "player_stats" DROP COLUMN "total_zones_fully_explored";
ALTER TABLE "player_stats" DROP COLUMN "total_recipes_learned";
ALTER TABLE "player_stats" DROP COLUMN "total_bestiary_completed";
ALTER TABLE "player_stats" DROP COLUMN "total_unique_monster_kills";
ALTER TABLE "player_stats" DROP COLUMN "highest_character_level";
ALTER TABLE "player_stats" DROP COLUMN "highest_skill_level";

-- Drop player_family_stats table (family kills now derived from player_bestiary + mob_family_members)
ALTER TABLE "player_family_stats" DROP CONSTRAINT "player_family_stats_player_id_fkey";
ALTER TABLE "player_family_stats" DROP CONSTRAINT "player_family_stats_mob_family_id_fkey";
DROP TABLE "player_family_stats";
