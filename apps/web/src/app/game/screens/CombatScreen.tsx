'use client';

import { useCallback, useState } from 'react';
import { KnockoutBanner } from '@/components/KnockoutBanner';
import { CombatLogEntry } from '@/components/combat/CombatLogEntry';
import { CombatPlayback } from '@/components/combat/CombatPlayback';
import { CombatRewardsSummary } from '@/components/combat/CombatRewardsSummary';
import { CombatHistory } from '@/components/screens/CombatHistory';
import { Pagination } from '@/components/common/Pagination';
import { formatCombatShareText, resolveMobMaxHp } from '@/lib/combatShare';
import { getMobPrefixDefinition } from '@adventure/shared';
import type { HpState, LastCombat, LastCombatLogEntry, PendingEncounter } from '../useGameController';

interface CombatScreenProps {
  hpState: HpState;
  currentZoneId: string | null;
  pendingEncounters: PendingEncounter[];
  pendingEncountersLoading: boolean;
  pendingEncountersError: string | null;
  pendingEncounterPage: number;
  pendingEncounterPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  pendingEncounterFilters: {
    zones: Array<{ id: string; name: string }>;
    mobs: Array<{ id: string; name: string }>;
  };
  pendingEncounterZoneFilter: string;
  pendingEncounterMobFilter: string;
  pendingEncounterSort: 'recent' | 'danger';
  pendingClockMs: number;
  busyAction: string | null;
  lastCombat: LastCombat | null;
  bestiaryMobs: Array<{ id: string; isDiscovered: boolean }>;
  onStartCombat: (encounterSiteId: string) => void | Promise<void>;
  onPendingEncounterPageChange: (page: number) => void;
  onPendingEncounterZoneFilterChange: (zoneId: string) => void;
  onPendingEncounterMobFilterChange: (mobTemplateId: string) => void;
  onPendingEncounterSortChange: (sort: 'recent' | 'danger') => void;
  combatPlaybackData?: {
    mobDisplayName: string;
    outcome: string;
    combatantAMaxHp: number;
    playerStartHp: number;
    combatantBMaxHp: number;
    log: LastCombatLogEntry[];
    rewards: LastCombat['rewards'];
  } | null;
  onCombatPlaybackComplete?: () => void;
}

export function CombatScreen({
  hpState,
  currentZoneId,
  pendingEncounters,
  pendingEncountersLoading,
  pendingEncountersError,
  pendingEncounterPage,
  pendingEncounterPagination,
  pendingEncounterFilters,
  pendingEncounterZoneFilter,
  pendingEncounterMobFilter,
  pendingEncounterSort,
  pendingClockMs,
  busyAction,
  lastCombat,
  bestiaryMobs,
  onStartCombat,
  onPendingEncounterPageChange,
  onPendingEncounterZoneFilterChange,
  onPendingEncounterMobFilterChange,
  onPendingEncounterSortChange,
  combatPlaybackData,
  onCombatPlaybackComplete,
}: CombatScreenProps) {
  const [activeView, setActiveView] = useState<'encounters' | 'history'>('encounters');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  // Player max HP should be the player's real max HP.
  // Mob max HP comes from combat payload (supports wounded monster starts later).
  const playerMaxHp = hpState.maxHp;
  const mobMaxHp = lastCombat ? resolveMobMaxHp(lastCombat.log, lastCombat.combatantBMaxHp) : undefined;
  const isLastCombatMobDiscovered = lastCombat
    ? bestiaryMobs.find((mob) => mob.id === lastCombat.mobTemplateId)?.isDiscovered ?? false
    : false;

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

  const buildShareText = useCallback((): string => {
    if (!lastCombat) return '';
    return formatCombatShareText({
      outcome: outcomeLabel ?? 'Unknown',
      playerMaxHp,
      mobMaxHp: lastCombat.combatantBMaxHp,
      mobName: lastCombat.mobDisplayName,
      log: lastCombat.log,
      rewards: lastCombat.rewards,
    });
  }, [lastCombat, mobMaxHp, outcomeLabel, playerMaxHp]);

  const handleCopyShare = useCallback(async () => {
    const text = buildShareText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [buildShareText]);

  return (
    <div className="space-y-4">
      {/* Knockout Banner */}
      {hpState.isRecovering && (
        <KnockoutBanner action="fighting" recoveryCost={hpState.recoveryCost} />
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveView('encounters')}
          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
            activeView === 'encounters'
              ? 'bg-[var(--rpg-gold)] text-[var(--rpg-background)]'
              : 'bg-[var(--rpg-surface)] text-[var(--rpg-text-secondary)]'
          }`}
        >
          Encounters
        </button>
        <button
          type="button"
          onClick={() => setActiveView('history')}
          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
            activeView === 'history'
              ? 'bg-[var(--rpg-gold)] text-[var(--rpg-background)]'
              : 'bg-[var(--rpg-surface)] text-[var(--rpg-text-secondary)]'
          }`}
        >
          History
        </button>
      </div>

      {activeView === 'encounters' ? (
        <>
          <div className="bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded-lg p-3 space-y-3">
            <h2 className="text-xl font-bold text-[var(--rpg-text-primary)]">Encounter Sites</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={pendingEncounterSort}
                onChange={(event) => onPendingEncounterSortChange(event.target.value as 'recent' | 'danger')}
                className="px-3 py-2 rounded border border-[var(--rpg-border)] bg-[var(--rpg-background)] text-[var(--rpg-text-primary)] text-sm"
                disabled={pendingEncountersLoading}
              >
                <option value="danger">Sort: Most Dangerous</option>
                <option value="recent">Sort: Most Recent</option>
              </select>

              <select
                value={pendingEncounterZoneFilter}
                onChange={(event) => onPendingEncounterZoneFilterChange(event.target.value)}
                className="px-3 py-2 rounded border border-[var(--rpg-border)] bg-[var(--rpg-background)] text-[var(--rpg-text-primary)] text-sm"
                disabled={pendingEncountersLoading}
              >
                <option value="all">Zone: All</option>
                {pendingEncounterFilters.zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>

              <select
                value={pendingEncounterMobFilter}
                onChange={(event) => onPendingEncounterMobFilterChange(event.target.value)}
                className="px-3 py-2 rounded border border-[var(--rpg-border)] bg-[var(--rpg-background)] text-[var(--rpg-text-primary)] text-sm"
                disabled={pendingEncountersLoading}
              >
                <option value="all">Family: All</option>
                {pendingEncounterFilters.mobs.map((mob) => (
                  <option key={mob.id} value={mob.id}>
                    {mob.name}
                  </option>
                ))}
              </select>
            </div>

            {pendingEncountersError && (
              <div className="text-sm text-[var(--rpg-red)]">{pendingEncountersError}</div>
            )}

            {!pendingEncountersError && pendingEncountersLoading && (
              <div className="text-sm text-[var(--rpg-text-secondary)]">Loading encounter sites...</div>
            )}

            {!pendingEncountersError && !pendingEncountersLoading && pendingEncounters.length === 0 && (
              <div className="text-sm text-[var(--rpg-text-secondary)]">No encounter sites match these filters.</div>
            )}

            {!pendingEncountersError && !pendingEncountersLoading && pendingEncounters.length > 0 && (
              <div className="space-y-2">
                {pendingEncounters.map((e) => {
                  const prefix = getMobPrefixDefinition(e.nextMobPrefix);
                  const nextMobLabel = e.nextMobName
                    ? (prefix ? `${prefix.displayName} ${e.nextMobName}` : e.nextMobName)
                    : null;
                  const isWrongZone = Boolean(currentZoneId) && e.zoneId !== currentZoneId;
                  const isDisabled = hpState.isRecovering || busyAction === 'combat' || !e.nextMobTemplateId || isWrongZone || !!combatPlaybackData;
                  return (
                    <div
                      key={e.encounterSiteId}
                      className="bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-[var(--rpg-text-primary)] font-semibold">
                          {e.siteName} ({e.aliveMobs}/{e.totalMobs})
                        </div>
                        <div className="text-xs text-[var(--rpg-text-secondary)]">
                          Next monster: {nextMobLabel ?? 'None (site decayed)'}
                        </div>
                        <div className="text-xs text-[var(--rpg-text-secondary)]">
                          Zone: {e.zoneName} | Decayed {e.decayedMobs} | Found{' '}
                          {Math.max(0, Math.ceil((pendingClockMs - new Date(e.discoveredAt).getTime()) / 60000))}m ago
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onStartCombat(e.encounterSiteId)}
                        disabled={isDisabled}
                        className={`px-3 py-2 rounded font-semibold ${
                          isDisabled
                            ? 'bg-[var(--rpg-border)] text-[var(--rpg-text-secondary)] cursor-not-allowed'
                            : 'bg-[var(--rpg-gold)] text-[var(--rpg-background)]'
                        }`}
                      >
                        {hpState.isRecovering
                          ? 'Recover First'
                          : isWrongZone
                            ? 'Wrong Zone'
                            : !e.nextMobTemplateId
                              ? 'Decayed'
                              : 'Fight'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {!pendingEncountersLoading && !pendingEncountersError && pendingEncounterPagination.totalPages > 1 && (
              <Pagination
                page={pendingEncounterPage}
                totalPages={pendingEncounterPagination.totalPages}
                onPageChange={onPendingEncounterPageChange}
                className="pt-1"
              />
            )}
          </div>

          {/* Combat Playback (animated) */}
          {combatPlaybackData && (
            <div className="bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded-lg p-3">
              <CombatPlayback
                mobDisplayName={combatPlaybackData.mobDisplayName}
                outcome={combatPlaybackData.outcome}
                playerMaxHp={combatPlaybackData.combatantAMaxHp}
                playerStartHp={combatPlaybackData.playerStartHp}
                mobMaxHp={combatPlaybackData.combatantBMaxHp}
                log={combatPlaybackData.log}
                rewards={combatPlaybackData.rewards}
                onComplete={onCombatPlaybackComplete ?? (() => {})}
                onSkip={() => {
                  onCombatPlaybackComplete?.();
                }}
              />
            </div>
          )}

          {/* Last Combat (detailed log — shown after playback completes) */}
          {!combatPlaybackData && lastCombat && (
            <div className="bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[var(--rpg-text-primary)] font-semibold">
                  Last Combat: {lastCombat.mobDisplayName}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyShare()}
                    className="px-2.5 py-1.5 rounded border border-[var(--rpg-border)] text-xs text-[var(--rpg-text-primary)]"
                    title="Copy formatted log for sharing"
                  >
                    {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy Log'}
                  </button>
                  <div className={`text-sm font-semibold ${outcomeColor}`}>{outcomeLabel}</div>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-0.5 border-t border-[var(--rpg-border)] pt-2">
                {lastCombat.log.map((entry, idx) => (
                  <CombatLogEntry
                    key={idx}
                    entry={entry}
                    playerMaxHp={playerMaxHp}
                    mobMaxHp={mobMaxHp}
                    showDetailedBreakdown={isLastCombatMobDiscovered}
                  />
                ))}
              </div>

              <div className="border-t border-[var(--rpg-border)] pt-2">
                <CombatRewardsSummary
                  rewards={lastCombat.rewards}
                  outcome={lastCombat.outcome}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <CombatHistory />
      )}
    </div>
  );
}

