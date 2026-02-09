'use client';

import { useState } from 'react';
import type { LastCombatLogEntry } from '@/app/game/useGameController';

function getActionIcon(entry: LastCombatLogEntry): string {
  if (entry.evaded) return '💨';
  if (entry.isCritical) return '💥';
  if (entry.damage && entry.damage > 0) return '⚔️';
  if (entry.roll && !entry.damage) return '❌';
  return '';
}

function formatHp(hp: number | undefined, maxHp?: number): string {
  if (hp === undefined) return '';
  if (maxHp !== undefined) return `${hp}/${maxHp}`;
  return `${hp}`;
}

interface CombatLogEntryProps {
  entry: LastCombatLogEntry;
  playerMaxHp?: number;
  mobMaxHp?: number;
  showDetailedBreakdown?: boolean;
}

function resolveHitOutcome(entry: LastCombatLogEntry): {
  result: 'Hit' | 'Miss';
  threshold: number;
  evasionContribution: number;
} | null {
  if (entry.roll === undefined || entry.attackModifier === undefined || entry.targetDodge === undefined) {
    return null;
  }

  const evasionContribution = Math.floor((entry.targetEvasion ?? 0) / 2);
  const threshold = 10 + entry.targetDodge + evasionContribution;
  const total = entry.roll + entry.attackModifier + (entry.accuracyModifier ?? 0);

  if (entry.roll === 1) {
    return { result: 'Miss', threshold, evasionContribution };
  }
  if (entry.roll === 20) {
    return { result: 'Hit', threshold, evasionContribution };
  }

  return { result: total >= threshold ? 'Hit' : 'Miss', threshold, evasionContribution };
}

export function CombatLogEntry({
  entry,
  playerMaxHp,
  mobMaxHp,
  showDetailedBreakdown = true,
}: CombatLogEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const icon = getActionIcon(entry);
  const hasDetails = entry.attackModifier !== undefined || entry.rawDamage !== undefined;
  const hitOutcome = resolveHitOutcome(entry);

  const isPlayerAction = entry.actor === 'player';
  const actorColor = isPlayerAction ? 'text-[var(--rpg-green-light)]' : 'text-[var(--rpg-red)]';

  return (
    <div
      className={`${hasDetails ? 'cursor-pointer' : ''}`}
      onClick={hasDetails ? () => setExpanded((p) => !p) : undefined}
    >
      {/* Collapsed view */}
      <div className="flex items-center gap-2 text-sm py-0.5">
        <span className="text-[var(--rpg-gold)] font-mono w-7 shrink-0">R{entry.round}</span>
        <span className={`shrink-0 ${actorColor}`}>{isPlayerAction ? 'You' : 'Mob'}</span>
        {icon && <span className="shrink-0 text-xs">{icon}</span>}
        {entry.damage !== undefined && entry.damage > 0 && (
          <span className="text-[var(--rpg-text-primary)] font-mono font-semibold">{entry.damage} dmg</span>
        )}
        {entry.evaded && <span className="text-[var(--rpg-blue-light)] text-xs">Dodged</span>}
        {entry.roll !== undefined && !entry.damage && !entry.evaded && entry.round > 0 && (
          <span className="text-[var(--rpg-text-secondary)] text-xs">Miss</span>
        )}
        <span className="ml-auto flex gap-2 text-xs font-mono text-[var(--rpg-text-secondary)]">
          {entry.playerHpAfter !== undefined && (
            <span className="text-[var(--rpg-green-light)]">{formatHp(entry.playerHpAfter, playerMaxHp)}</span>
          )}
          {entry.mobHpAfter !== undefined && (
            <span className="text-[var(--rpg-red)]">{formatHp(entry.mobHpAfter, mobMaxHp)}</span>
          )}
        </span>
        {hasDetails && (
          <span className="text-[var(--rpg-text-secondary)] text-xs shrink-0">{expanded ? '▲' : '▼'}</span>
        )}
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="pl-9 pb-1 text-xs text-[var(--rpg-text-secondary)] space-y-0.5">
          {hitOutcome && (
            <div>
              Roll: {entry.roll} + {entry.attackModifier} ATK
              {entry.accuracyModifier !== undefined ? ` + ${entry.accuracyModifier} ACC` : ''}
              {' vs '}
              {showDetailedBreakdown
                ? `${hitOutcome.threshold} (10 + ${entry.targetDodge} DOD + ${hitOutcome.evasionContribution} EVA)`
                : `${hitOutcome.threshold} (target avoid)`}
              {' => '}{hitOutcome.result}
              {entry.roll === 1 ? ' (Nat 1 auto-miss)' : ''}
              {entry.roll === 20 ? ' (Nat 20 auto-hit)' : ''}
            </div>
          )}
          {entry.rawDamage !== undefined && entry.damage !== undefined && (
            <div>
              {(() => {
                const critMultiplier = entry.isCritical ? 1.5 : 1;
                const preMitigation = Math.floor(entry.rawDamage * critMultiplier);
                const mitigated = Math.max(0, preMitigation - entry.damage);

                let mitigationLabel = '';
                if (entry.targetDefence !== undefined) {
                  mitigationLabel = showDetailedBreakdown
                    ? mitigated > 0
                      ? ` (-${mitigated} defence)`
                      : ' (defence)'
                    : ' (defence)';
                }

                return (
                  <>
                    Damage: {entry.rawDamage} raw
                    {entry.isCritical && ' × 1.5 crit'}
                    {' = '}{preMitigation} pre-mitigation
                    {' → '}{entry.damage} final
                    {mitigationLabel}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
