import { prisma } from '@adventure/database';
import type { SkillType, SkillXpResult } from '@adventure/shared';
import { applyXpGain, shouldResetDailyCap } from '@adventure/game-engine';

export interface GrantXpResult {
  skillType: SkillType;
  xpResult: SkillXpResult;
  newTotalXp: number;
  newDailyXpGained: number;
  newLevel: number;
}

export async function grantSkillXp(
  playerId: string,
  skillType: SkillType,
  rawXpGain: number,
  now: Date = new Date()
): Promise<GrantXpResult> {
  const skill = await prisma.playerSkill.findUnique({
    where: {
      playerId_skillType: { playerId, skillType },
    },
  });

  if (!skill) {
    // Shouldn't happen since we create all skills on register.
    throw new Error(`Skill not found for playerId=${playerId}, skillType=${skillType}`);
  }

  const needsReset = shouldResetDailyCap(skill.lastXpResetAt, now);
  const currentWindowXpGained = needsReset ? 0 : skill.dailyXpGained;

  const currentXp = Number(skill.xp);
  const xpResult = applyXpGain(
    currentXp,
    skill.level,
    currentWindowXpGained,
    rawXpGain,
    skillType
  );

  const newTotalXp = currentXp + xpResult.xpAfterEfficiency;
  const newDailyXpGained = currentWindowXpGained + xpResult.xpAfterEfficiency;

  await prisma.playerSkill.update({
    where: {
      playerId_skillType: { playerId, skillType },
    },
    data: {
      xp: BigInt(newTotalXp),
      level: xpResult.newLevel,
      dailyXpGained: newDailyXpGained,
      ...(needsReset ? { lastXpResetAt: now } : {}),
    },
  });

  return {
    skillType,
    xpResult,
    newTotalXp,
    newDailyXpGained,
    newLevel: xpResult.newLevel,
  };
}

