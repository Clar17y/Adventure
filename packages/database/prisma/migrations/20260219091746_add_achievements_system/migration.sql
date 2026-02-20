-- AlterTable
ALTER TABLE "players" ADD COLUMN     "active_title" TEXT;

-- CreateTable
CREATE TABLE "player_stats" (
    "player_id" TEXT NOT NULL,
    "total_kills" INTEGER NOT NULL DEFAULT 0,
    "total_boss_kills" INTEGER NOT NULL DEFAULT 0,
    "total_boss_damage" INTEGER NOT NULL DEFAULT 0,
    "total_pvp_wins" INTEGER NOT NULL DEFAULT 0,
    "best_pvp_win_streak" INTEGER NOT NULL DEFAULT 0,
    "total_crafts" INTEGER NOT NULL DEFAULT 0,
    "total_rares_crafted" INTEGER NOT NULL DEFAULT 0,
    "total_epics_crafted" INTEGER NOT NULL DEFAULT 0,
    "total_legendaries_crafted" INTEGER NOT NULL DEFAULT 0,
    "total_salvages" INTEGER NOT NULL DEFAULT 0,
    "total_forge_upgrades" INTEGER NOT NULL DEFAULT 0,
    "total_gathering_actions" INTEGER NOT NULL DEFAULT 0,
    "total_turns_spent" INTEGER NOT NULL DEFAULT 0,
    "total_zones_discovered" INTEGER NOT NULL DEFAULT 0,
    "total_zones_fully_explored" INTEGER NOT NULL DEFAULT 0,
    "total_recipes_learned" INTEGER NOT NULL DEFAULT 0,
    "total_bestiary_completed" INTEGER NOT NULL DEFAULT 0,
    "total_unique_monster_kills" INTEGER NOT NULL DEFAULT 0,
    "total_deaths" INTEGER NOT NULL DEFAULT 0,
    "highest_character_level" INTEGER NOT NULL DEFAULT 1,
    "highest_skill_level" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_stats_pkey" PRIMARY KEY ("player_id")
);

-- CreateTable
CREATE TABLE "player_family_stats" (
    "player_id" TEXT NOT NULL,
    "mob_family_id" TEXT NOT NULL,
    "kills" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "player_family_stats_pkey" PRIMARY KEY ("player_id","mob_family_id")
);

-- CreateTable
CREATE TABLE "player_achievements" (
    "player_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reward_claimed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "player_achievements_pkey" PRIMARY KEY ("player_id","achievement_id")
);

-- AddForeignKey
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_family_stats" ADD CONSTRAINT "player_family_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_family_stats" ADD CONSTRAINT "player_family_stats_mob_family_id_fkey" FOREIGN KEY ("mob_family_id") REFERENCES "mob_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_achievements" ADD CONSTRAINT "player_achievements_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
