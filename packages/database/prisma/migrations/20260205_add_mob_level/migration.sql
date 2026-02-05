-- Add level column to mob_templates
ALTER TABLE "mob_templates" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;
