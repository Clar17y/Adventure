-- AlterTable
ALTER TABLE "resource_nodes" ADD COLUMN     "discovery_weight" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "max_capacity" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "min_capacity" INTEGER NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE "player_resource_nodes" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "resource_node_id" TEXT NOT NULL,
    "remaining_capacity" INTEGER NOT NULL,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_resource_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_resource_nodes_player_id_idx" ON "player_resource_nodes"("player_id");

-- AddForeignKey
ALTER TABLE "player_resource_nodes" ADD CONSTRAINT "player_resource_nodes_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_resource_nodes" ADD CONSTRAINT "player_resource_nodes_resource_node_id_fkey" FOREIGN KEY ("resource_node_id") REFERENCES "resource_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
