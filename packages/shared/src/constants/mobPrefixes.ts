import type { MobPrefixDefinition } from '../types/mobPrefix.types';

export const NO_PREFIX_WEIGHT = 100;

const MOB_PREFIX_DEFINITIONS: readonly MobPrefixDefinition[] = [
  {
    key: 'weak',
    displayName: 'Weak',
    description: 'Underfed and fragile, but still dangerous in numbers.',
    weight: 15,
    statMultipliers: { hp: 0.6, attack: 0.8, defence: 0.7, damageMin: 0.7, damageMax: 0.7 },
    xpMultiplier: 0.6,
    dropChanceMultiplier: 0.8,
    spellTemplate: null,
  },
  {
    key: 'frail',
    displayName: 'Frail',
    description: 'Brittle and clumsy, with poor defences and dodging.',
    weight: 8,
    statMultipliers: { hp: 0.8, defence: 0.5, evasion: 0.5 },
    xpMultiplier: 0.9,
    dropChanceMultiplier: 1,
    spellTemplate: null,
  },
  {
    key: 'tough',
    displayName: 'Tough',
    description: 'Hardened hide and resilience make it harder to bring down.',
    weight: 8,
    statMultipliers: { hp: 1.5, defence: 1.3, damageMin: 1.1, damageMax: 1.1 },
    xpMultiplier: 1.3,
    dropChanceMultiplier: 1.2,
    spellTemplate: null,
  },
  {
    key: 'gigantic',
    displayName: 'Gigantic',
    description: 'Massive and relentless, though too large to evade well.',
    weight: 4,
    statMultipliers: { hp: 2, defence: 1.2, evasion: 0.5, damageMin: 1.3, damageMax: 1.3 },
    xpMultiplier: 1.6,
    dropChanceMultiplier: 1.3,
    spellTemplate: null,
  },
  {
    key: 'swift',
    displayName: 'Swift',
    description: 'Fast and elusive, trading resilience for mobility.',
    weight: 6,
    statMultipliers: { hp: 0.8, defence: 0.8, evasion: 2, damageMin: 0.95, damageMax: 0.95 },
    xpMultiplier: 1.2,
    dropChanceMultiplier: 1,
    spellTemplate: null,
  },
  {
    key: 'ferocious',
    displayName: 'Ferocious',
    description: 'Aggressive and vicious, hitting far above its base threat.',
    weight: 5,
    statMultipliers: { hp: 1.2, attack: 1.4, defence: 0.9, damageMin: 1.4, damageMax: 1.4 },
    xpMultiplier: 1.4,
    dropChanceMultiplier: 1.2,
    spellTemplate: null,
  },
  {
    key: 'shaman',
    displayName: 'Shaman',
    description: 'Mystic variant that channels periodic spell bursts.',
    weight: 3,
    statMultipliers: { attack: 0.8, defence: 0.8, damageMin: 0.8, damageMax: 0.8 },
    xpMultiplier: 1.5,
    dropChanceMultiplier: 1.3,
    spellTemplate: {
      startRound: 3,
      interval: 3,
      damageFormula: 'avg',
      damageMultiplier: 1.2,
      actionName: 'Shamanic Bolt',
    },
  },
  {
    key: 'venomous',
    displayName: 'Venomous',
    description: 'Carries toxic attacks that strike on a repeating cadence.',
    weight: 4,
    statMultipliers: { hp: 1.1 },
    xpMultiplier: 1.3,
    dropChanceMultiplier: 1.2,
    spellTemplate: {
      startRound: 2,
      interval: 4,
      damageFormula: 'max',
      damageMultiplier: 0.9,
      actionName: 'Venom Spit',
    },
  },
  {
    key: 'ancient',
    displayName: 'Ancient',
    description: 'A rare elder specimen with power in every stat.',
    weight: 1,
    statMultipliers: { hp: 1.5, attack: 1.3, defence: 1.3, evasion: 1.3, damageMin: 1.3, damageMax: 1.3 },
    xpMultiplier: 2,
    dropChanceMultiplier: 2,
    spellTemplate: null,
  },
  {
    key: 'spectral',
    displayName: 'Spectral',
    description: 'Ghostlike and hard to hit, casting rapidly from round 2.',
    weight: 2,
    statMultipliers: { hp: 0.7, defence: 0.5, evasion: 3, damageMin: 0.6, damageMax: 0.6 },
    xpMultiplier: 1.7,
    dropChanceMultiplier: 1.5,
    spellTemplate: {
      startRound: 2,
      interval: 2,
      damageFormula: 'avg',
      damageMultiplier: 0.8,
      actionName: 'Spectral Burst',
    },
  },
];

export function getMobPrefixDefinition(key: string | null | undefined): MobPrefixDefinition | null {
  if (!key) return null;
  return MOB_PREFIX_DEFINITIONS.find((prefix) => prefix.key === key) ?? null;
}

export function getAllMobPrefixes(): readonly MobPrefixDefinition[] {
  return MOB_PREFIX_DEFINITIONS;
}
