import { SkillType } from './player.types';

export interface SkillXpResult {
  xpGained: number;
  xpAfterEfficiency: number;
  efficiency: number;
  leveledUp: boolean;
  newLevel: number;
  atDailyCap: boolean;
}

export interface SkillRequirement {
  skill: SkillType;
  level: number;
}

export interface XpCurve {
  base: number;
  exponent: number;
}

export interface EfficiencyCurve {
  dailyCap: number;
  decayPower: number;
}
