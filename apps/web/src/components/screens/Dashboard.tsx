'use client';

import type { LucideIcon } from 'lucide-react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import { StatBar } from '@/components/StatBar';
import { Coins, TrendingUp, MapPin, Sword, Pickaxe, Hammer, Heart, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { uiIconSrc } from '@/lib/assets';

interface DashboardProps {
  playerData: {
    turns: number;
    maxTurns: number;
    turnsRegenRate: number;
    gold: number;
    currentXP: number;
    nextLevelXP: number;
    currentZone: string;
    // HP fields
    currentHp: number;
    maxHp: number;
    hpRegenRate: number;
    isRecovering: boolean;
    recoveryCost: number | null;
  };
  skills: Array<{ name: string; level: number; icon?: LucideIcon; imageSrc?: string }>;
  onNavigate: (screen: string) => void;
}

export function Dashboard({ playerData, skills, onNavigate }: DashboardProps) {
  return (
    <div className="space-y-4">
      {/* Knockout Banner */}
      {playerData.isRecovering && (
        <div className="bg-[var(--rpg-red)]/20 border border-[var(--rpg-red)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-[var(--rpg-red)] flex-shrink-0" />
            <div>
              <div className="font-bold text-[var(--rpg-red)]">Knocked Out</div>
              <div className="text-sm text-[var(--rpg-text-secondary)]">
                You must recover before taking any actions. Cost: {playerData.recoveryCost?.toLocaleString()} turns
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Turn Counter */}
      <PixelCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-[var(--rpg-background)] flex items-center justify-center">
              <Image
                src={uiIconSrc('turn')}
                alt="Turns"
                width={48}
                height={48}
                className="image-rendering-pixelated"
              />
            </div>
            <div>
              <div className="text-sm text-[var(--rpg-text-secondary)]">Available Turns</div>
              <div className="text-2xl font-bold text-[var(--rpg-gold)] font-mono">
                {playerData.turns.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--rpg-text-secondary)]">Regen Rate</div>
            <div className="text-sm text-[var(--rpg-green-light)]">
              +{playerData.turnsRegenRate}/min
            </div>
          </div>
        </div>
        <div className="mt-3">
          <StatBar
            current={playerData.turns}
            max={playerData.maxTurns}
            color="gold"
            size="sm"
            showNumbers={false}
          />
        </div>
      </PixelCard>

      {/* HP Display */}
      <PixelCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-[var(--rpg-background)] flex items-center justify-center">
              <Heart size={32} color={playerData.isRecovering ? 'var(--rpg-red)' : 'var(--rpg-green-light)'} />
            </div>
            <div>
              <div className="text-sm text-[var(--rpg-text-secondary)]">
                {playerData.isRecovering ? 'Knocked Out' : 'Health'}
              </div>
              <div className="text-2xl font-bold font-mono">
                {playerData.isRecovering ? (
                  <span className="text-[var(--rpg-red)]">KO</span>
                ) : (
                  <span className="text-[var(--rpg-green-light)]">{playerData.currentHp} / {playerData.maxHp}</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            {playerData.isRecovering ? (
              <>
                <div className="text-xs text-[var(--rpg-text-secondary)]">Recovery Cost</div>
                <div className="text-sm text-[var(--rpg-red)]">
                  {playerData.recoveryCost?.toLocaleString()} turns
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-[var(--rpg-text-secondary)]">Regen Rate</div>
                <div className="text-sm text-[var(--rpg-green-light)]">
                  +{playerData.hpRegenRate.toFixed(1)}/sec
                </div>
              </>
            )}
          </div>
        </div>
        {!playerData.isRecovering && (
          <div className="mt-3">
            <StatBar
              current={playerData.currentHp}
              max={playerData.maxHp}
              color="health"
              size="sm"
              showNumbers={false}
            />
          </div>
        )}
      </PixelCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <PixelCard padding="sm">
          <div className="flex flex-col items-center text-center">
            <Coins size={20} color="var(--rpg-gold)" className="mb-1" />
            <div className="text-xs text-[var(--rpg-text-secondary)]">Gold</div>
            <div className="text-lg font-bold text-[var(--rpg-gold)] font-mono">
              {playerData.gold.toLocaleString()}
            </div>
          </div>
        </PixelCard>

        <PixelCard padding="sm">
          <div className="flex flex-col items-center text-center">
            <TrendingUp size={20} color="var(--rpg-blue-light)" className="mb-1" />
            <div className="text-xs text-[var(--rpg-text-secondary)]">Total XP</div>
            <div className="text-lg font-bold text-[var(--rpg-blue-light)] font-mono">
              {playerData.currentXP.toLocaleString()}
            </div>
          </div>
        </PixelCard>

        <PixelCard padding="sm">
          <div className="flex flex-col items-center text-center">
            <MapPin size={20} color="var(--rpg-purple)" className="mb-1" />
            <div className="text-xs text-[var(--rpg-text-secondary)]">Zone</div>
            <div className="text-xs font-semibold text-[var(--rpg-text-primary)] mt-1">
              {playerData.currentZone}
            </div>
          </div>
        </PixelCard>
      </div>

      {/* Skills Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3 text-[var(--rpg-text-primary)]">Skills</h2>
        <div className="grid grid-cols-4 gap-3">
          {skills.map((skill, index) => {
            const Icon = skill.icon;
            return (
              <button
                key={index}
                onClick={() => onNavigate('skills')}
                className="aspect-square bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded-lg flex flex-col items-center justify-center gap-1 hover:border-[var(--rpg-gold)] transition-all active:scale-95"
              >
                {skill.imageSrc ? (
                  <Image
                    src={skill.imageSrc}
                    alt={skill.name}
                    width={56}
                    height={56}
                    className="image-rendering-pixelated"
                  />
                ) : Icon ? (
                  <Icon size={56} color="var(--rpg-gold)" />
                ) : null}
                <span className="text-xs text-[var(--rpg-text-secondary)]">{skill.name}</span>
                <span className="text-sm font-bold text-[var(--rpg-gold)]">{skill.level}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2">
        <h2 className="text-lg font-semibold mb-3 text-[var(--rpg-text-primary)]">Actions</h2>
        <div className="grid grid-cols-2 gap-3">
        <div className="relative group">
          <PixelButton
            variant="primary"
            onClick={() => onNavigate('explore')}
            disabled={playerData.isRecovering}
          >
            <div className="flex items-center justify-center gap-2">
              <Sword size={20} />
              Explore
            </div>
          </PixelButton>
          {playerData.isRecovering && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded text-xs text-[var(--rpg-text-secondary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Recover first
            </div>
          )}
        </div>
        <div className="relative group">
          <PixelButton
            variant="primary"
            onClick={() => onNavigate('gathering')}
            disabled={playerData.isRecovering}
          >
            <div className="flex items-center justify-center gap-2">
              <Pickaxe size={20} />
              Mine
            </div>
          </PixelButton>
          {playerData.isRecovering && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded text-xs text-[var(--rpg-text-secondary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Recover first
            </div>
          )}
        </div>
        <div className="relative group">
          <PixelButton
            variant="secondary"
            onClick={() => onNavigate('crafting')}
            disabled={playerData.isRecovering}
          >
            <div className="flex items-center justify-center gap-2">
              <Hammer size={20} />
              Craft
            </div>
          </PixelButton>
          {playerData.isRecovering && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded text-xs text-[var(--rpg-text-secondary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Recover first
            </div>
          )}
        </div>
        <PixelButton
          variant={playerData.isRecovering ? 'primary' : 'secondary'}
          onClick={() => onNavigate('rest')}
        >
          <div className="flex items-center justify-center gap-2">
            <Heart size={20} />
            {playerData.isRecovering ? 'Recover' : 'Rest'}
          </div>
        </PixelButton>
        </div>
      </div>
    </div>
  );
}
