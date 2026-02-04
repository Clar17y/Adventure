-- PlayerSkill.lastXpResetAt must include time for 3-hour XP windows.
ALTER TABLE "player_skills"
ALTER COLUMN "last_xp_reset_at" TYPE TIMESTAMP(3)
USING "last_xp_reset_at"::timestamp(3);

ALTER TABLE "player_skills"
ALTER COLUMN "last_xp_reset_at" SET DEFAULT CURRENT_TIMESTAMP;

