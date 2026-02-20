import { describe, expect, it } from 'vitest';
import {
  uiIconSrc,
  skillIconSrc,
  zoneImageSrc,
  resourceImageSrc,
  itemImageSrc,
  monsterImageSrc,
} from './assets';

describe('uiIconSrc', () => {
  it('returns correct path', () => {
    expect(uiIconSrc('attack')).toBe('/assets/ui/ui_attack-pixelated-128.png');
    expect(uiIconSrc('gold')).toBe('/assets/ui/ui_gold-pixelated-128.png');
  });
});

describe('skillIconSrc', () => {
  it('returns correct path for skill type', () => {
    expect(skillIconSrc('melee')).toBe('/assets/skills/skill_melee-pixelated-128.png');
    expect(skillIconSrc('mining')).toBe('/assets/skills/skill_mining-pixelated-128.png');
  });
});

describe('zoneImageSrc', () => {
  it('slugifies zone name', () => {
    expect(zoneImageSrc('Dark Forest')).toBe('/assets/zones/zone_dark_forest.png');
  });

  it('handles special characters', () => {
    expect(zoneImageSrc("Dragon's Lair")).toBe('/assets/zones/zone_dragons_lair.png');
  });
});

describe('resourceImageSrc', () => {
  it('returns correct resource path', () => {
    expect(resourceImageSrc('Iron Ore')).toBe('/assets/resources/resource_iron_ore-pixelated-128.png');
  });
});

describe('itemImageSrc', () => {
  it('routes weapon/armor to items path', () => {
    expect(itemImageSrc('Iron Sword', 'weapon')).toBe('/assets/items/item_iron_sword-pixelated-128.png');
  });

  it('routes resource to resources path', () => {
    expect(itemImageSrc('Iron Ore', 'resource')).toBe('/assets/resources/resource_iron_ore-pixelated-128.png');
  });

  it('routes consumable to consumables path', () => {
    expect(itemImageSrc('Health Potion', 'consumable')).toBe('/assets/consumables/consumable_health_potion-pixelated-128.png');
  });

  it('applies name overrides', () => {
    expect(itemImageSrc('Leather Cap', 'armor')).toBe('/assets/items/item_iron_helmet-pixelated-128.png');
  });

  it('resolves wooden sword to its own asset', () => {
    expect(itemImageSrc('Wooden Sword', 'weapon')).toBe('/assets/items/item_wooden_sword-pixelated-128.png');
  });

  it('handles apostrophes in names', () => {
    expect(itemImageSrc("King's Blade", 'weapon')).toBe('/assets/items/item_kings_blade-pixelated-128.png');
  });
});

describe('monsterImageSrc', () => {
  it('slugifies monster name', () => {
    expect(monsterImageSrc('Forest Spider')).toBe('/assets/monsters/monster_forest_spider-pixelated-128.png');
  });
});
