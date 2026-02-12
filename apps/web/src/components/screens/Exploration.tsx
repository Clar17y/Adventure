'use client';

import { useState } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import { Slider } from '@/components/ui/Slider';
import { KnockoutBanner } from '@/components/KnockoutBanner';
import { Mountain, Play } from 'lucide-react';
import { EXPLORATION_CONSTANTS } from '@adventure/shared';
import Image from 'next/image';
import { ActivityLog } from '@/components/ActivityLog';
import { ExplorationPlayback, type ExplorationPlaybackEvent } from '@/components/exploration/ExplorationPlayback';
import { CombatPlayback } from '@/components/combat/CombatPlayback';
import type { ActivityLogEntry } from '@/app/game/useGameController';

interface ExplorationProps {
  currentZone: {
    name: string;
    description: string;
    minLevel: number;
    imageSrc?: string;
  };
  availableTurns: number;
  onStartExploration: (turns: number) => void;
  activityLog: ActivityLogEntry[];
  isRecovering?: boolean;
  recoveryCost?: number | null;
  playbackData?: {
    totalTurns: number;
    zoneName: string;
    events: Array<{ turn: number; type: string; description: string; details?: Record<string, unknown> }>;
    aborted: boolean;
    refundedTurns: number;
    playerHpBeforeExploration: number;
    playerMaxHp: number;
  } | null;
  onPlaybackComplete?: () => void;
  onPlaybackSkip?: () => void;
  onPushLog?: (...entries: Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'danger' }>) => void;
}

export function Exploration({ currentZone, availableTurns, onStartExploration, activityLog, isRecovering = false, recoveryCost, playbackData, onPlaybackComplete, onPlaybackSkip, onPushLog }: ExplorationProps) {
  const [turnInvestment, setTurnInvestment] = useState([Math.min(100, availableTurns)]);
  const [combatEvent, setCombatEvent] = useState<ExplorationPlaybackEvent | null>(null);
  const [resumeFromCombat, setResumeFromCombat] = useState(false);

  const calculateProbabilities = (turns: number) => {
    const expectedAmbushes = turns * EXPLORATION_CONSTANTS.AMBUSH_CHANCE_PER_TURN;
    const expectedSites = turns * EXPLORATION_CONSTANTS.ENCOUNTER_SITE_CHANCE_PER_TURN;
    const expectedResources = turns * EXPLORATION_CONSTANTS.RESOURCE_NODE_CHANCE;
    // Cumulative probability of at least one hidden cache: 1 - (1 - p)^n
    const hiddenCacheChance = Math.min(
      Math.round((1 - Math.pow(1 - EXPLORATION_CONSTANTS.HIDDEN_CACHE_CHANCE, turns)) * 100),
      99
    );
    return { expectedAmbushes, expectedSites, expectedResources, hiddenCacheChance };
  };

  const { expectedAmbushes, expectedSites, expectedResources, hiddenCacheChance } = calculateProbabilities(turnInvestment[0]);

  return (
    <div className="space-y-4">
      {/* Knockout Banner */}
      {isRecovering && !playbackData && (
        <KnockoutBanner action="exploring" recoveryCost={recoveryCost} />
      )}

      {/* Zone Header — always visible */}
      <PixelCard className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-gradient-to-br from-[var(--rpg-purple)] to-transparent" />
        </div>
        <div className="relative flex items-start gap-3">
          <div className="w-16 h-16 rounded-lg bg-[var(--rpg-background)] flex items-center justify-center flex-shrink-0">
            {currentZone.imageSrc ? (
              <Image
                src={currentZone.imageSrc}
                alt={currentZone.name}
                width={56}
                height={56}
                className="object-contain image-rendering-pixelated"
              />
            ) : (
              <Mountain size={32} color="var(--rpg-purple)" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[var(--rpg-text-primary)] mb-1">
              {currentZone.name}
            </h2>
            <p className="text-sm text-[var(--rpg-text-secondary)] mb-2">
              {currentZone.description}
            </p>
            <div className="inline-flex items-center gap-1 text-xs bg-[var(--rpg-background)] px-2 py-1 rounded">
              <span className="text-[var(--rpg-text-secondary)]">Min Level:</span>
              <span className="text-[var(--rpg-gold)] font-bold">{currentZone.minLevel}</span>
            </div>
          </div>
        </div>
      </PixelCard>

      {/* Exploration Playback — stays mounted during combat to preserve state */}
      {playbackData && (
        <PixelCard className={combatEvent ? 'hidden' : ''}>
          <ExplorationPlayback
            totalTurns={playbackData.totalTurns}
            zoneName={playbackData.zoneName}
            events={playbackData.events}
            aborted={playbackData.aborted}
            refundedTurns={playbackData.refundedTurns}
            resumeFromCombat={resumeFromCombat}
            onEventRevealed={(event) => {
              // Skip logging ambush events here — they'll be logged after combat playback
              const isAmbushWithCombat = (event.type === 'ambush_defeat' || event.type === 'ambush_victory') && event.details?.log;
              if (isAmbushWithCombat) return;

              const typeMap: Record<string, 'info' | 'success' | 'danger'> = {
                ambush_defeat: 'danger',
                ambush_victory: 'success',
                encounter_site: 'success',
                resource_node: 'success',
              };
              onPushLog?.({
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: typeMap[event.type] ?? 'info',
                message: `Turn ${event.turn}: ${event.description}`,
              });
            }}
            onCombatStart={(event) => {
              setCombatEvent(event);
            }}
            onComplete={() => {
              onPlaybackComplete?.();
            }}
            onSkip={() => {
              onPlaybackSkip?.();
            }}
          />
        </PixelCard>
      )}

      {/* Combat Playback — embedded combat animation during exploration */}
      {playbackData && combatEvent && (
        <PixelCard>
          <CombatPlayback
            mobDisplayName={(combatEvent.details?.mobDisplayName as string) ?? 'Unknown'}
            outcome={(combatEvent.details?.outcome as string) ?? 'defeat'}
            playerMaxHp={playbackData.playerMaxHp}
            playerStartHp={playbackData.playerHpBeforeExploration}
            mobMaxHp={(combatEvent.details?.mobMaxHp as number) ?? 100}
            log={(combatEvent.details?.log as Array<{
              round: number;
              actor: 'player' | 'mob';
              action: string;
              message: string;
              roll?: number;
              damage?: number;
              evaded?: boolean;
              attackModifier?: number;
              accuracyModifier?: number;
              targetDodge?: number;
              targetEvasion?: number;
              targetDefence?: number;
              targetMagicDefence?: number;
              rawDamage?: number;
              armorReduction?: number;
              magicDefenceReduction?: number;
              isCritical?: boolean;
              critMultiplier?: number;
              playerHpAfter?: number;
              mobHpAfter?: number;
            }>) ?? []}
            onComplete={() => {
              // Now that combat playback is done, log the ambush result
              const typeMap: Record<string, 'info' | 'success' | 'danger'> = {
                ambush_defeat: 'danger',
                ambush_victory: 'success',
              };
              onPushLog?.({
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: typeMap[combatEvent.type] ?? 'info',
                message: `Turn ${combatEvent.turn}: ${combatEvent.description}`,
              });

              setCombatEvent(null);
              if (combatEvent.type === 'ambush_defeat') {
                // Knockout — playback is done
                onPlaybackComplete?.();
              } else {
                // Victory — resume exploration playback
                setResumeFromCombat(true);
                setTimeout(() => setResumeFromCombat(false), 100);
              }
            }}
            onSkip={() => {
              setCombatEvent(null);
              onPlaybackSkip?.();
            }}
          />
        </PixelCard>
      )}

      {/* Normal exploration UI — hide during playback */}
      {!playbackData && (
        <>
          {/* Turn Investment */}
          <PixelCard>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-[var(--rpg-text-primary)]">Turn Investment</h3>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[var(--rpg-gold)] font-mono">
                    {turnInvestment[0].toLocaleString()}
                  </div>
                  <div className="text-xs text-[var(--rpg-text-secondary)]">
                    of {availableTurns.toLocaleString()} available
                  </div>
                </div>
              </div>

              <Slider
                value={turnInvestment}
                onValueChange={setTurnInvestment}
                min={10}
                max={Math.min(10000, availableTurns)}
                step={10}
                className="w-full"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setTurnInvestment([Math.min(100, availableTurns)])}
                  className="flex-1 px-3 py-1.5 text-sm bg-[var(--rpg-background)] border border-[var(--rpg-border)] rounded hover:border-[var(--rpg-gold)] transition-colors text-[var(--rpg-text-primary)]"
                >
                  100
                </button>
                <button
                  onClick={() => setTurnInvestment([Math.min(500, availableTurns)])}
                  className="flex-1 px-3 py-1.5 text-sm bg-[var(--rpg-background)] border border-[var(--rpg-border)] rounded hover:border-[var(--rpg-gold)] transition-colors text-[var(--rpg-text-primary)]"
                >
                  500
                </button>
                <button
                  onClick={() => setTurnInvestment([Math.min(1000, availableTurns)])}
                  className="flex-1 px-3 py-1.5 text-sm bg-[var(--rpg-background)] border border-[var(--rpg-border)] rounded hover:border-[var(--rpg-gold)] transition-colors text-[var(--rpg-text-primary)]"
                >
                  1K
                </button>
                <button
                  onClick={() => setTurnInvestment([Math.min(5000, availableTurns)])}
                  className="flex-1 px-3 py-1.5 text-sm bg-[var(--rpg-background)] border border-[var(--rpg-border)] rounded hover:border-[var(--rpg-gold)] transition-colors text-[var(--rpg-text-primary)]"
                >
                  5K
                </button>
              </div>
            </div>
          </PixelCard>

          {/* Probability Preview */}
          <PixelCard className="bg-[var(--rpg-background)]">
            <h3 className="font-semibold text-[var(--rpg-text-primary)] mb-3">Expected Results</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--rpg-red)] font-mono">
                  {expectedAmbushes < 1 ? expectedAmbushes.toFixed(1) : `~${Math.round(expectedAmbushes)}`}
                </div>
                <div className="text-xs text-[var(--rpg-text-secondary)]">Ambushes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--rpg-blue-light)] font-mono">
                  {expectedSites < 1 ? expectedSites.toFixed(2) : `~${Math.round(expectedSites)}`}
                </div>
                <div className="text-xs text-[var(--rpg-text-secondary)]">Sites</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--rpg-gold)] font-mono">
                  {expectedResources < 1 ? expectedResources.toFixed(2) : `~${Math.round(expectedResources)}`}
                </div>
                <div className="text-xs text-[var(--rpg-text-secondary)]">Resources</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--rpg-purple)] font-mono">{hiddenCacheChance}%</div>
                <div className="text-xs text-[var(--rpg-text-secondary)]">Rare Find</div>
              </div>
            </div>
          </PixelCard>

          {/* Start Button */}
          <PixelButton
            variant="gold"
            size="lg"
            className="w-full"
            onClick={() => onStartExploration(turnInvestment[0])}
            disabled={isRecovering || turnInvestment[0] > availableTurns}
          >
            <div className="flex items-center justify-center gap-2">
              <Play size={20} />
              {isRecovering ? 'Recover First' : 'Start Exploration'}
            </div>
          </PixelButton>
        </>
      )}

      {/* Activity Log — always visible */}
      <ActivityLog entries={activityLog} />
    </div>
  );
}
