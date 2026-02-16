-- AlterTable: ChatMessage - add message_type
ALTER TABLE "chat_messages" ADD COLUMN "message_type" VARCHAR(8) NOT NULL DEFAULT 'player';

-- AlterTable: MobTemplate - add boss fields
ALTER TABLE "mob_templates" ADD COLUMN "is_boss" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "mob_templates" ADD COLUMN "boss_aoe_dmg" INTEGER;
ALTER TABLE "mob_templates" ADD COLUMN "boss_base_hp" INTEGER;

-- CreateTable: WorldEvent
CREATE TABLE "world_events" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "zone_id" TEXT NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "description" TEXT NOT NULL,
    "effect_type" VARCHAR(32) NOT NULL,
    "effect_value" DOUBLE PRECISION NOT NULL,
    "target_mob_id" TEXT,
    "target_family" TEXT,
    "target_resource" VARCHAR(64),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "created_by" VARCHAR(32) NOT NULL DEFAULT 'system',

    CONSTRAINT "world_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BossEncounter
CREATE TABLE "boss_encounters" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "mob_template_id" TEXT NOT NULL,
    "current_hp" INTEGER NOT NULL,
    "max_hp" INTEGER NOT NULL,
    "base_hp" INTEGER NOT NULL,
    "scaled_at" TIMESTAMP(3),
    "round_number" INTEGER NOT NULL DEFAULT 0,
    "next_round_at" TIMESTAMP(3),
    "status" VARCHAR(16) NOT NULL DEFAULT 'waiting',
    "killed_by" TEXT,

    CONSTRAINT "boss_encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BossParticipant
CREATE TABLE "boss_participants" (
    "id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "role" VARCHAR(16) NOT NULL,
    "round_number" INTEGER NOT NULL,
    "turns_committed" INTEGER NOT NULL,
    "total_damage" INTEGER NOT NULL DEFAULT 0,
    "total_healing" INTEGER NOT NULL DEFAULT 0,
    "current_hp" INTEGER NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'alive',

    CONSTRAINT "boss_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PersistedMob
CREATE TABLE "persisted_mobs" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "mob_template_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "current_hp" INTEGER NOT NULL,
    "max_hp" INTEGER NOT NULL,
    "damaged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persisted_mobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "world_events_status_type_idx" ON "world_events"("status", "type");
CREATE INDEX "world_events_zone_id_status_idx" ON "world_events"("zone_id", "status");
CREATE UNIQUE INDEX "boss_encounters_event_id_key" ON "boss_encounters"("event_id");
CREATE UNIQUE INDEX "boss_participants_encounter_id_player_id_round_number_key" ON "boss_participants"("encounter_id", "player_id", "round_number");
CREATE INDEX "persisted_mobs_player_id_zone_id_idx" ON "persisted_mobs"("player_id", "zone_id");

-- AddForeignKey
ALTER TABLE "world_events" ADD CONSTRAINT "world_events_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "boss_encounters" ADD CONSTRAINT "boss_encounters_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "world_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "boss_encounters" ADD CONSTRAINT "boss_encounters_mob_template_id_fkey" FOREIGN KEY ("mob_template_id") REFERENCES "mob_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "boss_participants" ADD CONSTRAINT "boss_participants_encounter_id_fkey" FOREIGN KEY ("encounter_id") REFERENCES "boss_encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "boss_participants" ADD CONSTRAINT "boss_participants_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "persisted_mobs" ADD CONSTRAINT "persisted_mobs_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "persisted_mobs" ADD CONSTRAINT "persisted_mobs_mob_template_id_fkey" FOREIGN KEY ("mob_template_id") REFERENCES "mob_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
