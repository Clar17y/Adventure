-- Backfill newly introduced skills for existing players.
INSERT INTO "player_skills" ("id", "player_id", "skill_type", "level", "xp", "daily_xp_gained", "last_xp_reset_at")
SELECT
  'seed-skill-' || p."id" || '-' || s."skill_type" AS "id",
  p."id" AS "player_id",
  s."skill_type",
  1 AS "level",
  0 AS "xp",
  0 AS "daily_xp_gained",
  CURRENT_TIMESTAMP AS "last_xp_reset_at"
FROM "players" p
CROSS JOIN (
  VALUES
    ('foraging'),
    ('woodcutting'),
    ('alchemy')
) AS s("skill_type")
WHERE NOT EXISTS (
  SELECT 1
  FROM "player_skills" ps
  WHERE ps."player_id" = p."id"
    AND ps."skill_type" = s."skill_type"
);
