'use client';

import { KnockoutBanner } from '@/components/KnockoutBanner';
import { CombatLogEntry } from '@/components/combat/CombatLogEntry';
import { CombatRewardsSummary } from '@/components/combat/CombatRewardsSummary';
import type { HpState, LastCombat, PendingEncounter } from '../useGameController';

interface CombatScreenProps {
  hpState: HpState;
  pendingEncounters: PendingEncounter[];
  pendingClockMs: number;
  busyAction: string | null;
  lastCombat: LastCombat | null;
  onStartCombat: (pendingEncounterId: string) => void | Promise<void>;
}

export function CombatScreen({ hpState, pendingEncounters, pendingClockMs, busyAction, lastCombat, onStartCombat }: CombatScreenProps) {
  // Player max HP comes from hpState (accurate even if combat started injured).
  // Mob max HP is the first log entry's mobHpAfter (mobs always start at full).
  const mobMaxHp = lastCombat?.log[0]?.mobHpAfter;

  const outcomeLabel = lastCombat?.outcome === 'victory'
    ? 'Victory'
    : lastCombat?.outcome === 'defeat'
      ? 'Defeat'
      : lastCombat?.outcome === 'fled'
        ? 'Fled'
        : lastCombat?.outcome;

  const outcomeColor = lastCombat?.outcome === 'victory'
    ? 'text-[var(--rpg-green-light)]'
    : lastCombat?.outcome === 'defeat'
      ? 'text-[var(--rpg-red)]'
      : 'text-[var(--rpg-gold)]';

  return (
    <div className="space-y-4">
      {/* Knockout Banner */}
      {hpState.isRecovering && (
        <KnockoutBanner action="fighting" recoveryCost={hpState.recoveryCost} />
      )}

      {pendingEncounters.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[var(--rpg-text-primary)]">Pending Encounters</h2>
          {pendingEncounters.map((e) => (
            <div
              key={e.encounterId}
              className="bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded-lg p-3 flex items-center justify-between"
            >
              <div>
                <div className="text-[var(--rpg-text-primary)] font-semibold">{e.mobName}</div>
                <div className="text-xs text-[var(--rpg-text-secondary)]">
                  Zone: {e.zoneName} • Found {Math.max(0, Math.ceil((pendingClockMs - new Date(e.createdAt).getTime()) / 60000))}m ago • Expires in{' '}
                  {Math.max(0, Math.ceil((new Date(e.expiresAt).getTime() - pendingClockMs) / 60000))}m
                </div>
              </div>
              <button
                onClick={() => void onStartCombat(e.encounterId)}
                disabled={hpState.isRecovering || busyAction === 'combat'}
                className={`px-3 py-2 rounded font-semibold ${
                  hpState.isRecovering
                    ? 'bg-[var(--rpg-border)] text-[var(--rpg-text-secondary)] cursor-not-allowed'
                    : 'bg-[var(--rpg-gold)] text-[var(--rpg-background)]'
                }`}
              >
                {hpState.isRecovering ? 'Recover First' : 'Fight'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-[var(--rpg-text-secondary)]">No pending encounters. Explore to find mobs.</p>
        </div>
      )}

      {lastCombat && (
        <div className="bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[var(--rpg-text-primary)] font-semibold">Last Combat</div>
            <div className={`text-sm font-semibold ${outcomeColor}`}>{outcomeLabel}</div>
          </div>

          {/* Combat log entries */}
          <div className="max-h-72 overflow-y-auto space-y-0.5 border-t border-[var(--rpg-border)] pt-2">
            {lastCombat.log.map((entry, idx) => (
              <CombatLogEntry
                key={idx}
                entry={entry}
                playerMaxHp={hpState.maxHp}
                mobMaxHp={mobMaxHp}
              />
            ))}
          </div>

          {/* Rewards summary */}
          <div className="border-t border-[var(--rpg-border)] pt-2">
            <CombatRewardsSummary
              rewards={lastCombat.rewards}
              outcome={lastCombat.outcome}
            />
          </div>
        </div>
      )}
    </div>
  );
}
