export interface SpellTemplate {
  startRound: number;
  interval: number;
  damageFormula: 'avg' | 'min' | 'max';
  damageMultiplier: number;
  actionName: string;
}

export interface MobPrefixDefinition {
  key: string;
  displayName: string;
  description: string;
  weight: number;
  statMultipliers: {
    hp?: number;
    accuracy?: number;
    defence?: number;
    magicDefence?: number;
    evasion?: number;
    damageMin?: number;
    damageMax?: number;
  };
  xpMultiplier: number;
  dropChanceMultiplier: number;
  spellTemplate: SpellTemplate | null;
  damageTypeOverride?: 'physical' | 'magic';
}
