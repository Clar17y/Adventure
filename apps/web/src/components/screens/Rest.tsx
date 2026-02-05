'use client';

import { useState, useEffect, useCallback } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import { StatBar } from '@/components/StatBar';
import { Slider } from '@/components/ui/Slider';
import { Heart, AlertTriangle } from 'lucide-react';
import * as api from '@/lib/api';

interface RestProps {
  onComplete: () => void;
  onTurnsUpdate: (turns: number) => void;
  onHpUpdate: (hp: { currentHp: number; maxHp: number; regenPerSecond: number; isRecovering: boolean; recoveryCost: number | null }) => void;
}

export function Rest({ onComplete, onTurnsUpdate, onHpUpdate }: RestProps) {
  const [hpState, setHpState] = useState<{
    currentHp: number;
    maxHp: number;
    regenPerSecond: number;
    isRecovering: boolean;
    recoveryCost: number | null;
  } | null>(null);

  const [turns, setTurns] = useState(100);
  const [estimate, setEstimate] = useState<{
    healAmount: number;
    resultingHp: number;
    turnsNeeded: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHpState = useCallback(async () => {
    const result = await api.getHpState();
    if (result.data) {
      setHpState(result.data);
      onHpUpdate(result.data);
    }
  }, [onHpUpdate]);

  const fetchEstimate = useCallback(async () => {
    if (!hpState || hpState.isRecovering) return;

    const result = await api.restEstimate(turns);
    if (result.data && !result.data.isRecovering) {
      setEstimate({
        healAmount: result.data.healAmount ?? 0,
        resultingHp: result.data.resultingHp ?? 0,
        turnsNeeded: result.data.turnsNeeded ?? 0,
      });
    }
  }, [turns, hpState]);

  useEffect(() => {
    fetchHpState();
  }, [fetchHpState]);

  useEffect(() => {
    const timer = setTimeout(fetchEstimate, 300);
    return () => clearTimeout(timer);
  }, [fetchEstimate]);

  const handleRest = async () => {
    if (!hpState) return;
    setIsLoading(true);
    setError(null);

    const result = await api.rest(turns);
    if (result.error) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    if (result.data) {
      onTurnsUpdate(result.data.turns.currentTurns);
      const newHpState = {
        ...hpState,
        currentHp: result.data.currentHp,
        maxHp: result.data.maxHp,
      };
      setHpState(newHpState);
      onHpUpdate(newHpState);
    }

    setIsLoading(false);
  };

  const handleRecover = async () => {
    setIsLoading(true);
    setError(null);

    const result = await api.recoverFromKnockout();
    if (result.error) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    if (result.data) {
      onTurnsUpdate(result.data.turns.currentTurns);
      await fetchHpState();
    }

    setIsLoading(false);
  };

  if (!hpState) {
    return (
      <PixelCard>
        <div className="text-center py-8 text-[var(--rpg-text-secondary)]">
          Loading...
        </div>
      </PixelCard>
    );
  }

  // Recovering mode
  if (hpState.isRecovering) {
    return (
      <div className="space-y-4">
        <PixelCard>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle size={32} color="var(--rpg-red)" />
            <div>
              <h2 className="text-xl font-bold text-[var(--rpg-red)]">Knocked Out</h2>
              <p className="text-sm text-[var(--rpg-text-secondary)]">
                You must recover before taking any actions
              </p>
            </div>
          </div>

          <div className="bg-[var(--rpg-background)] rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-[var(--rpg-text-secondary)]">Recovery Cost</span>
              <span className="text-xl font-bold text-[var(--rpg-gold)] font-mono">
                {hpState.recoveryCost?.toLocaleString()} turns
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-[var(--rpg-text-secondary)]">HP After Recovery</span>
              <span className="text-lg font-bold text-[var(--rpg-green-light)] font-mono">
                {Math.floor(hpState.maxHp * 0.25)} / {hpState.maxHp}
              </span>
            </div>
          </div>

          {error && (
            <div className="text-[var(--rpg-red)] text-sm mb-4">{error}</div>
          )}

          <PixelButton
            variant="primary"
            onClick={handleRecover}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Recovering...' : 'Recover'}
          </PixelButton>
        </PixelCard>
      </div>
    );
  }

  // Normal rest mode
  const isFullHp = hpState.currentHp >= hpState.maxHp;

  return (
    <div className="space-y-4">
      <PixelCard>
        <div className="flex items-center gap-3 mb-4">
          <Heart size={32} color="var(--rpg-green-light)" />
          <div>
            <h2 className="text-xl font-bold text-[var(--rpg-text-primary)]">Rest</h2>
            <p className="text-sm text-[var(--rpg-text-secondary)]">
              Spend turns to restore health
            </p>
          </div>
        </div>

        {/* Current HP */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm text-[var(--rpg-text-secondary)]">Current HP</span>
            <span className="text-sm font-mono text-[var(--rpg-green-light)]">
              {hpState.currentHp} / {hpState.maxHp}
            </span>
          </div>
          <StatBar
            current={hpState.currentHp}
            max={hpState.maxHp}
            color="health"
            size="md"
            showNumbers={false}
          />
          <div className="text-xs text-[var(--rpg-text-secondary)] mt-1">
            Passive regen: +{hpState.regenPerSecond.toFixed(1)} HP/sec
          </div>
        </div>

        {/* Turn Slider */}
        {!isFullHp && (
          <>
            <div className="mb-4">
              <label className="block text-sm text-[var(--rpg-text-secondary)] mb-2">
                Turns to spend: {turns}
              </label>
              <Slider
                min={10}
                max={1000}
                step={10}
                value={[turns]}
                onValueChange={(val) => setTurns(val[0])}
              />
            </div>

            {/* Estimate */}
            {estimate && (
              <div className="bg-[var(--rpg-background)] rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--rpg-text-secondary)]">HP Restored</span>
                  <span className="text-lg font-bold text-[var(--rpg-green-light)] font-mono">
                    +{Math.floor(estimate.healAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[var(--rpg-text-secondary)]">Result</span>
                  <span className="font-mono">
                    {hpState.currentHp} → {Math.floor(estimate.resultingHp)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[var(--rpg-text-secondary)]">Turns Used</span>
                  <span className="font-mono text-[var(--rpg-gold)]">
                    {estimate.turnsNeeded}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="text-[var(--rpg-red)] text-sm mb-4">{error}</div>
            )}

            <PixelButton
              variant="primary"
              onClick={handleRest}
              disabled={isLoading || isFullHp}
              className="w-full"
            >
              {isLoading ? 'Resting...' : 'Rest'}
            </PixelButton>
          </>
        )}

        {isFullHp && (
          <div className="text-center py-4 text-[var(--rpg-green-light)]">
            You are at full health!
          </div>
        )}
      </PixelCard>
    </div>
  );
}
