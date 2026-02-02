import {
  SKILL_CONSTANTS,
  SkillType,
  COMBAT_SKILLS,
  GATHERING_SKILLS,
  CRAFTING_SKILLS,
  SkillXpResult,
} from '@adventure/shared';

/**
 * Calculate total XP required to reach a given level.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(
    SKILL_CONSTANTS.XP_BASE * Math.pow(level, SKILL_CONSTANTS.XP_EXPONENT)
  );
}

/**
 * Calculate level from total XP.
 */
export function levelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;

  let level = 1;
  while (level < SKILL_CONSTANTS.MAX_LEVEL && xpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

/**
 * Calculate XP needed to reach next level.
 */
export function xpToNextLevel(currentXp: number, currentLevel: number): number {
  if (currentLevel >= SKILL_CONSTANTS.MAX_LEVEL) return 0;
  const nextLevelXp = xpForLevel(currentLevel + 1);
  return Math.max(0, nextLevelXp - currentXp);
}

/**
 * Calculate efficiency based on daily XP already gained.
 * Returns value between 0 and 1.
 */
export function calculateEfficiency(
  dailyXpGained: number,
  skillType: SkillType
): number {
  const cap = getDailyCap(skillType);

  // Combat skills have hard cap (efficiency goes to 0 at cap)
  if (COMBAT_SKILLS.includes(skillType)) {
    return dailyXpGained >= cap ? 0 : 1;
  }

  // Other skills have diminishing returns
  if (dailyXpGained >= cap) return 0;

  const ratio = dailyXpGained / cap;
  const efficiency = Math.max(0, 1 - Math.pow(ratio, SKILL_CONSTANTS.EFFICIENCY_DECAY_POWER));
  return efficiency;
}

/**
 * Get daily cap for a skill type.
 */
export function getDailyCap(skillType: SkillType): number {
  if (COMBAT_SKILLS.includes(skillType)) {
    return SKILL_CONSTANTS.DAILY_CAP_COMBAT;
  }
  if (GATHERING_SKILLS.includes(skillType)) {
    return SKILL_CONSTANTS.DAILY_CAP_GATHERING;
  }
  if (CRAFTING_SKILLS.includes(skillType)) {
    return SKILL_CONSTANTS.DAILY_CAP_CRAFTING;
  }
  return SKILL_CONSTANTS.DAILY_CAP_COMBAT;
}

/**
 * Apply XP gain with efficiency modifier.
 * Returns details about the XP gain and any level ups.
 */
export function applyXpGain(
  currentXp: number,
  currentLevel: number,
  dailyXpGained: number,
  rawXpGain: number,
  skillType: SkillType
): SkillXpResult {
  const efficiency = calculateEfficiency(dailyXpGained, skillType);
  const xpAfterEfficiency = Math.floor(rawXpGain * efficiency);

  const newTotalXp = currentXp + xpAfterEfficiency;
  const newLevel = levelFromXp(newTotalXp);
  const newDailyXpGained = dailyXpGained + xpAfterEfficiency;
  const atDailyCap = calculateEfficiency(newDailyXpGained, skillType) === 0;

  return {
    xpGained: rawXpGain,
    xpAfterEfficiency,
    efficiency,
    leveledUp: newLevel > currentLevel,
    newLevel,
    atDailyCap,
  };
}

/**
 * Check if daily cap reset is needed (new day).
 */
export function shouldResetDailyCap(lastResetDate: Date, now: Date = new Date()): boolean {
  const lastReset = new Date(lastResetDate);
  lastReset.setHours(0, 0, 0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return today.getTime() > lastReset.getTime();
}
