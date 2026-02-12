-- Item stats no longer use "evasion"; convert persisted JSON stats to "dodge".
UPDATE "item_templates"
SET "base_stats" = jsonb_set(
  "base_stats" - 'evasion',
  '{dodge}',
  to_jsonb(
    COALESCE(("base_stats" ->> 'dodge')::numeric, 0) +
    COALESCE(("base_stats" ->> 'evasion')::numeric, 0)
  ),
  true
)
WHERE "base_stats" ? 'evasion';

UPDATE "items"
SET "bonus_stats" = jsonb_set(
  "bonus_stats" - 'evasion',
  '{dodge}',
  to_jsonb(
    COALESCE(("bonus_stats" ->> 'dodge')::numeric, 0) +
    COALESCE(("bonus_stats" ->> 'evasion')::numeric, 0)
  ),
  true
)
WHERE "bonus_stats" IS NOT NULL
  AND "bonus_stats" ? 'evasion';
