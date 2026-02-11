-- Encounter site completion chest rewards and advanced recipe unlocks.

ALTER TABLE "item_templates"
ADD COLUMN "set_id" VARCHAR(64);

ALTER TABLE "crafting_recipes"
ADD COLUMN "is_advanced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "soulbound" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "mob_family_id" TEXT;

CREATE INDEX "crafting_recipes_is_advanced_idx" ON "crafting_recipes"("is_advanced");
CREATE INDEX "crafting_recipes_mob_family_id_idx" ON "crafting_recipes"("mob_family_id");

ALTER TABLE "crafting_recipes" ADD CONSTRAINT "crafting_recipes_mob_family_id_fkey"
FOREIGN KEY ("mob_family_id") REFERENCES "mob_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "player_recipes" (
    "player_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "learned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_recipes_pkey" PRIMARY KEY ("player_id", "recipe_id")
);

CREATE INDEX "player_recipes_recipe_id_idx" ON "player_recipes"("recipe_id");

ALTER TABLE "player_recipes" ADD CONSTRAINT "player_recipes_player_id_fkey"
FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "player_recipes" ADD CONSTRAINT "player_recipes_recipe_id_fkey"
FOREIGN KEY ("recipe_id") REFERENCES "crafting_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "chest_drop_tables" (
    "id" TEXT NOT NULL,
    "mob_family_id" TEXT NOT NULL,
    "chest_rarity" VARCHAR(16) NOT NULL,
    "item_template_id" TEXT NOT NULL,
    "drop_chance" DECIMAL(5,4) NOT NULL,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "max_quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "chest_drop_tables_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chest_drop_tables_mob_family_id_chest_rarity_idx"
ON "chest_drop_tables"("mob_family_id", "chest_rarity");

ALTER TABLE "chest_drop_tables" ADD CONSTRAINT "chest_drop_tables_mob_family_id_fkey"
FOREIGN KEY ("mob_family_id") REFERENCES "mob_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chest_drop_tables" ADD CONSTRAINT "chest_drop_tables_item_template_id_fkey"
FOREIGN KEY ("item_template_id") REFERENCES "item_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
