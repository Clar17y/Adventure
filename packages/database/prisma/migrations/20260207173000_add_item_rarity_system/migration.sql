ALTER TABLE items
ADD COLUMN rarity VARCHAR(16) NOT NULL DEFAULT 'common';

UPDATE items
SET rarity = 'common'
WHERE rarity IS NULL;

ALTER TABLE items
ADD CONSTRAINT items_rarity_check
CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'));
