-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3),

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turn_banks" (
    "player_id" TEXT NOT NULL,
    "current_turns" INTEGER NOT NULL DEFAULT 86400,
    "last_regen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turn_banks_pkey" PRIMARY KEY ("player_id")
);

-- CreateTable
CREATE TABLE "player_skills" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "skill_type" VARCHAR(32) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" BIGINT NOT NULL DEFAULT 0,
    "daily_xp_gained" INTEGER NOT NULL DEFAULT 0,
    "last_xp_reset_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_equipment" (
    "player_id" TEXT NOT NULL,
    "slot" VARCHAR(16) NOT NULL,
    "item_id" TEXT,

    CONSTRAINT "player_equipment_pkey" PRIMARY KEY ("player_id","slot")
);

-- CreateTable
CREATE TABLE "item_templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "item_type" VARCHAR(32) NOT NULL,
    "slot" VARCHAR(16),
    "tier" INTEGER NOT NULL DEFAULT 1,
    "base_stats" JSONB NOT NULL DEFAULT '{}',
    "required_skill" VARCHAR(32),
    "required_level" INTEGER NOT NULL DEFAULT 1,
    "max_durability" INTEGER NOT NULL DEFAULT 100,
    "stackable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "item_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "current_durability" INTEGER,
    "max_durability" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "travel_cost" INTEGER NOT NULL,
    "is_starter" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mob_templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "zone_id" TEXT NOT NULL,
    "hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defence" INTEGER NOT NULL,
    "evasion" INTEGER NOT NULL,
    "damage_min" INTEGER NOT NULL,
    "damage_max" INTEGER NOT NULL,
    "xp_reward" INTEGER NOT NULL,
    "encounter_weight" INTEGER NOT NULL DEFAULT 100,
    "spell_pattern" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "mob_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop_tables" (
    "id" TEXT NOT NULL,
    "mob_template_id" TEXT NOT NULL,
    "item_template_id" TEXT NOT NULL,
    "drop_chance" DECIMAL(5,4) NOT NULL,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "max_quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "drop_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_bestiary" (
    "player_id" TEXT NOT NULL,
    "mob_template_id" TEXT NOT NULL,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "first_encountered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_bestiary_pkey" PRIMARY KEY ("player_id","mob_template_id")
);

-- CreateTable
CREATE TABLE "resource_nodes" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "resource_type" VARCHAR(32) NOT NULL,
    "skill_required" VARCHAR(32) NOT NULL,
    "level_required" INTEGER NOT NULL DEFAULT 1,
    "base_yield" INTEGER NOT NULL,
    "discovery_chance" DECIMAL(5,4) NOT NULL,

    CONSTRAINT "resource_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crafting_recipes" (
    "id" TEXT NOT NULL,
    "skill_type" VARCHAR(32) NOT NULL,
    "required_level" INTEGER NOT NULL,
    "result_template_id" TEXT NOT NULL,
    "turn_cost" INTEGER NOT NULL,
    "materials" JSONB NOT NULL,
    "xp_reward" INTEGER NOT NULL,

    CONSTRAINT "crafting_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "activity_type" VARCHAR(32) NOT NULL,
    "turns_spent" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_username_key" ON "players"("username");

-- CreateIndex
CREATE UNIQUE INDEX "players_email_key" ON "players"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "player_skills_player_id_skill_type_key" ON "player_skills"("player_id", "skill_type");

-- CreateIndex
CREATE INDEX "activity_logs_player_id_created_at_idx" ON "activity_logs"("player_id", "created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turn_banks" ADD CONSTRAINT "turn_banks_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_equipment" ADD CONSTRAINT "player_equipment_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_equipment" ADD CONSTRAINT "player_equipment_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "item_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mob_templates" ADD CONSTRAINT "mob_templates_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_tables" ADD CONSTRAINT "drop_tables_mob_template_id_fkey" FOREIGN KEY ("mob_template_id") REFERENCES "mob_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drop_tables" ADD CONSTRAINT "drop_tables_item_template_id_fkey" FOREIGN KEY ("item_template_id") REFERENCES "item_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_bestiary" ADD CONSTRAINT "player_bestiary_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_bestiary" ADD CONSTRAINT "player_bestiary_mob_template_id_fkey" FOREIGN KEY ("mob_template_id") REFERENCES "mob_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_nodes" ADD CONSTRAINT "resource_nodes_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crafting_recipes" ADD CONSTRAINT "crafting_recipes_result_template_id_fkey" FOREIGN KEY ("result_template_id") REFERENCES "item_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
