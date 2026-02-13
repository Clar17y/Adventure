-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "channel_type" VARCHAR(16) NOT NULL,
    "channel_id" VARCHAR(64) NOT NULL,
    "player_id" TEXT NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "message" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_messages_channel_type_channel_id_created_at_idx" ON "chat_messages"("channel_type", "channel_id", "created_at");
