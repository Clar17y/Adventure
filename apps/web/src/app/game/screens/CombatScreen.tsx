'use client';

import { KnockoutBanner } from '@/components/KnockoutBanner';
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
        <div className="bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[var(--rpg-text-primary)] font-semibold">Last Combat</div>
            <div className="text-xs text-[var(--rpg-text-secondary)]">{lastCombat.outcome}</div>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto text-sm">
            {lastCombat.log.map((l, idx) => (
              <div key={idx} className="text-[var(--rpg-text-secondary)]">
                <span className="text-[var(--rpg-gold)] font-mono mr-2">R{l.round}</span>
                {l.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

