import type { BossPlayerReward } from '@/lib/api';
import { RARITY_COLORS, type Rarity } from '@/lib/rarity';

interface BossRewardsDisplayProps {
  rewards: BossPlayerReward;
}

export function BossRewardsDisplay({ rewards }: BossRewardsDisplayProps) {
  return (
    <div className="text-xs space-y-1.5">
      <p className="font-semibold" style={{ color: 'var(--rpg-gold)' }}>Your Rewards:</p>
      {rewards.loot.length > 0 && (
        <div className="space-y-0.5">
          {rewards.loot.map((drop, i) => (
            <div key={i} className="flex justify-between">
              <span style={{ color: RARITY_COLORS[(drop.rarity as Rarity) ?? 'common'] }}>
                {drop.itemName ?? drop.itemTemplateId.slice(0, 8)}
              </span>
              <span>x{drop.quantity}</span>
            </div>
          ))}
        </div>
      )}
      {rewards.xp && (
        <p>
          +{rewards.xp.xpAfterEfficiency} {rewards.xp.skillType} XP
          {rewards.xp.leveledUp && (
            <span style={{ color: 'var(--rpg-gold)' }}> (Level up! Lv.{rewards.xp.newLevel})</span>
          )}
        </p>
      )}
      {rewards.recipeUnlocked && (
        <p style={{ color: 'var(--rpg-green-light)' }}>
          Recipe learned: {rewards.recipeUnlocked.recipeName} (soulbound)
        </p>
      )}
    </div>
  );
}
