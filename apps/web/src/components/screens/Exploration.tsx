'use client';

import { useState } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import { Slider } from '@/components/ui/Slider';
import { KnockoutBanner } from '@/components/KnockoutBanner';
import { Mountain, Play, Clock } from 'lucide-react';
import { EXPLORATION_CONSTANTS } from '@adventure/shared';

interface ExplorationProps {
  currentZone: {
    name: string;
    description: string;
    minLevel: number;
  };
  availableTurns: number;
  onStartExploration: (turns: number) => void;
  activityLog: Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'danger' }>;
  isRecovering?: boolean;
  recoveryCost?: number | null;
}

export function Exploration({ currentZone, availableTurns, onStartExploration, activityLog, isRecovering = false, recoveryCost }: ExplorationProps) {
  const [turnInvestment, setTurnInvestment] = useState([Math.min(100, availableTurns)]);

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
      {isRecovering && (
        <KnockoutBanner action="exploring" recoveryCost={recoveryCost} />
      )}

      {/* Zone Header */}
      <PixelCard className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-gradient-to-br from-[var(--rpg-purple)] to-transparent" />
        </div>
        <div className="relative flex items-start gap-3">
          <div className="w-16 h-16 rounded-lg bg-[var(--rpg-background)] flex items-center justify-center flex-shrink-0">
            <Mountain size={32} color="var(--rpg-purple)" />
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

      {/* Activity Log */}
      <PixelCard>
        <h3 className="font-semibold text-[var(--rpg-text-primary)] mb-3">Activity Log</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activityLog.length === 0 ? (
            <div className="text-sm text-[var(--rpg-text-secondary)] text-center py-4">
              No recent activity
            </div>
          ) : (
            activityLog.map((entry, index) => {
              const typeColors = {
                info: 'text-[var(--rpg-text-secondary)]',
                success: 'text-[var(--rpg-green-light)]',
                danger: 'text-[var(--rpg-red)]',
              };
              return (
                <div key={index} className="flex gap-2 text-sm">
                  <Clock size={14} className="text-[var(--rpg-text-secondary)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--rpg-text-secondary)] flex-shrink-0 font-mono">
                    {entry.timestamp}
                  </span>
                  <span className={typeColors[entry.type]}>{entry.message}</span>
                </div>
              );
            })
          )}
        </div>
      </PixelCard>
    </div>
  );
}
