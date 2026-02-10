'use client';

import type { LastCombat } from '@/app/game/useGameController';

interface CombatRewardsSummaryProps {
  rewards: LastCombat['rewards'];
  outcome: string;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CombatRewardsSummary({ rewards, outcome }: CombatRewardsSummaryProps) {
  const { skillXp, xp, loot } = rewards;
  const totalLootItems = loot.reduce((sum, drop) => sum + drop.quantity, 0);

  const hasAnyRewards = xp > 0 || skillXp || loot.length > 0;

  if (!hasAnyRewards) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--rpg-text-secondary)] uppercase tracking-wide">Rewards</h3>

      {/* Primary combat skill XP */}
      {skillXp && (
        <div className="flex items-center gap-2 text-sm">
          <span>ATK</span>
          <span className="text-[var(--rpg-text-primary)]">{capitalize(skillXp.skillType)}</span>
          <span className="text-[var(--rpg-gold)] font-mono">
            +{skillXp.xpAfterEfficiency} XP
          </span>
          {skillXp.efficiency < 1 && (
            <span className="text-[var(--rpg-text-secondary)] text-xs">
              ({Math.round(skillXp.efficiency * 100)}%)
            </span>
          )}
          {skillXp.leveledUp && (
            <span className="text-[var(--rpg-gold)] font-semibold text-xs">
              L{skillXp.newLevel}!
            </span>
          )}
          {skillXp.characterLeveledUp && (
            <span className="text-[var(--rpg-gold)] font-semibold text-xs">
              C{skillXp.characterLevelAfter}!
            </span>
          )}
        </div>
      )}

      {/* Loot */}
      {loot.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span>LOOT</span>
            <span className="text-[var(--rpg-text-primary)]">
              {totalLootItems} item{totalLootItems !== 1 ? 's' : ''} dropped
            </span>
          </div>
          <div className="pl-9 space-y-0.5">
            {loot.map((drop, idx) => {
              const name = drop.itemName?.trim() || drop.itemTemplateId;
              return (
                <div key={`${drop.itemTemplateId}-${idx}`} className="text-xs text-[var(--rpg-text-secondary)]">
                  {name}{drop.quantity > 1 ? ` x${drop.quantity}` : ''}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
