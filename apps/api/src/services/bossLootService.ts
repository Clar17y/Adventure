import type { LootDrop } from '@adventure/shared';
import { rollAndGrantLoot } from './lootService';

interface BossContributor {
  playerId: string;
  totalDamage: number;
  totalHealing: number;
}

/**
 * Distribute boss loot to contributors, weighted by contribution.
 * Each participant gets a loot roll; higher contributors get a bonus multiplier.
 */
export async function distributeBossLoot(
  mobTemplateId: string,
  mobLevel: number,
  contributors: BossContributor[],
): Promise<Map<string, LootDrop[]>> {
  const result = new Map<string, LootDrop[]>();
  if (contributors.length === 0) return result;

  const totalContribution = contributors.reduce(
    (sum, c) => sum + c.totalDamage + c.totalHealing,
    0,
  );

  for (const contributor of contributors) {
    const contribution = contributor.totalDamage + contributor.totalHealing;
    // Minimum 0.5x multiplier, scales up to 2x for top contributor
    const ratio = totalContribution > 0 ? contribution / totalContribution : 1 / contributors.length;
    const dropMultiplier = Math.max(0.5, Math.min(2, ratio * contributors.length));

    const loot = await rollAndGrantLoot(
      contributor.playerId,
      mobTemplateId,
      mobLevel,
      dropMultiplier,
    );
    result.set(contributor.playerId, loot);
  }

  return result;
}
