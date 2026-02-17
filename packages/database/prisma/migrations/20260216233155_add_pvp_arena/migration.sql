-- CreateTable
CREATE TABLE "pvp_ratings" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "win_streak" INTEGER NOT NULL DEFAULT 0,
    "best_rating" INTEGER NOT NULL DEFAULT 1000,
    "last_fought_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pvp_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pvp_matches" (
    "id" TEXT NOT NULL,
    "attacker_id" TEXT NOT NULL,
    "defender_id" TEXT NOT NULL,
    "attacker_rating" INTEGER NOT NULL,
    "defender_rating" INTEGER NOT NULL,
    "attacker_rating_change" INTEGER NOT NULL,
    "defender_rating_change" INTEGER NOT NULL,
    "winner_id" TEXT NOT NULL,
    "combat_log" JSONB NOT NULL,
    "attacker_style" VARCHAR(16) NOT NULL,
    "defender_style" VARCHAR(16) NOT NULL,
    "turns_spent" INTEGER NOT NULL,
    "is_revenge" BOOLEAN NOT NULL DEFAULT false,
    "attacker_read" BOOLEAN NOT NULL DEFAULT true,
    "defender_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pvp_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pvp_cooldowns" (
    "id" TEXT NOT NULL,
    "attacker_id" TEXT NOT NULL,
    "defender_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pvp_cooldowns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pvp_ratings_player_id_key" ON "pvp_ratings"("player_id");

-- CreateIndex
CREATE INDEX "pvp_matches_attacker_id_created_at_idx" ON "pvp_matches"("attacker_id", "created_at");

-- CreateIndex
CREATE INDEX "pvp_matches_defender_id_created_at_idx" ON "pvp_matches"("defender_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pvp_cooldowns_attacker_id_defender_id_key" ON "pvp_cooldowns"("attacker_id", "defender_id");

-- AddForeignKey
ALTER TABLE "pvp_ratings" ADD CONSTRAINT "pvp_ratings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_matches" ADD CONSTRAINT "pvp_matches_attacker_id_fkey" FOREIGN KEY ("attacker_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_matches" ADD CONSTRAINT "pvp_matches_defender_id_fkey" FOREIGN KEY ("defender_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
