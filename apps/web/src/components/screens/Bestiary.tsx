'use client';

import { useState } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import { BookOpen, X, MapPin, Sword, Shield, Heart } from 'lucide-react';
import Image from 'next/image';
import { uiIconSrc } from '@/lib/assets';
import { RARITY_COLORS, type Rarity } from '@/lib/rarity';
import { getMobPrefixDefinition } from '@adventure/shared';

interface MonsterDrop {
  name: string;
  imageSrc?: string;
  dropRate: number;
  rarity: Rarity;
}

interface Monster {
  id: string;
  name: string;
  imageSrc?: string;
  level: number;
  isDiscovered: boolean;
  killCount: number;
  stats: {
    hp: number;
    attack: number;
    defence: number;
  };
  drops: MonsterDrop[];
  zones: string[];
  description: string;
  prefixEncounters: Array<{
    prefix: string;
    displayName: string;
    kills: number;
  }>;
}

interface BestiaryProps {
  monsters: Monster[];
}

export function Bestiary({ monsters }: BestiaryProps) {
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);

  const discoveredCount = monsters.filter((m) => m.isDiscovered).length;
  const totalCount = monsters.length;

  const getStatsVisibility = (killCount: number) => ({
    showHP: killCount >= 1,
    showAttack: killCount >= 5,
    showDefence: killCount >= 10,
    showDrops: killCount >= 3,
  });

  const formatMultiplier = (value: number) => `${Number(value.toFixed(2))}x`;

  const getPrefixEffectsText = (prefixKey: string) => {
    const definition = getMobPrefixDefinition(prefixKey);
    if (!definition) return 'Unknown effects';

    const effects: string[] = [];
    if (definition.statMultipliers.hp !== undefined) effects.push(`HP ${formatMultiplier(definition.statMultipliers.hp)}`);
    if (definition.statMultipliers.attack !== undefined) effects.push(`ATK ${formatMultiplier(definition.statMultipliers.attack)}`);
    if (definition.statMultipliers.defence !== undefined) effects.push(`DEF ${formatMultiplier(definition.statMultipliers.defence)}`);
    if (definition.statMultipliers.evasion !== undefined) effects.push(`EVA ${formatMultiplier(definition.statMultipliers.evasion)}`);
    if (definition.statMultipliers.damageMin !== undefined || definition.statMultipliers.damageMax !== undefined) {
      const min = formatMultiplier(definition.statMultipliers.damageMin ?? 1);
      const max = formatMultiplier(definition.statMultipliers.damageMax ?? 1);
      effects.push(`DMG ${min}-${max}`);
    }

    return effects.length > 0 ? effects.join(' | ') : 'No stat changes';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-[var(--rpg-text-primary)]">Bestiary</h2>
          <BookOpen size={20} color="var(--rpg-gold)" />
        </div>
        <div className="text-sm text-[var(--rpg-text-secondary)]">
          {discoveredCount}/{totalCount} discovered
        </div>
      </div>

      {/* Monster Grid */}
      <div className="grid grid-cols-3 gap-3">
        {monsters.map((monster) => (
          <button
            key={monster.id}
            onClick={() => monster.isDiscovered && setSelectedMonster(monster)}
            disabled={!monster.isDiscovered}
            className="aspect-square"
          >
            <div
              className={`w-full h-full rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                monster.isDiscovered
                  ? 'bg-[var(--rpg-surface)] border-[var(--rpg-border)] hover:border-[var(--rpg-gold)]'
                  : 'bg-[var(--rpg-background)] border-[var(--rpg-border)] border-dashed'
              }`}
            >
              {monster.isDiscovered ? (
                <>
                  {monster.imageSrc ? (
                    <Image
                      src={monster.imageSrc}
                      alt={monster.name}
                      width={48}
                      height={48}
                      className="image-rendering-pixelated mb-1"
                    />
                  ) : (
                    <Image
                      src={uiIconSrc('attack')}
                      alt={monster.name}
                      width={48}
                      height={48}
                      className="image-rendering-pixelated mb-1"
                    />
                  )}
                  <span className="text-[10px] text-[var(--rpg-text-secondary)] text-center px-1 leading-tight">
                    {monster.name}
                  </span>
                  <span className="text-xs text-[var(--rpg-gold)] font-mono mt-1">x{monster.killCount}</span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-[var(--rpg-surface)] rounded-lg mb-1 flex items-center justify-center">
                    <Image
                      src={uiIconSrc('scroll')}
                      alt="Unknown monster"
                      width={24}
                      height={24}
                      className="image-rendering-pixelated opacity-30"
                    />
                  </div>
                  <span className="text-xs text-[var(--rpg-text-secondary)]">???</span>
                </>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Monster Detail Modal */}
      {selectedMonster && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedMonster(null)}
        >
          <div className="max-w-sm w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <PixelCard>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-[var(--rpg-background)] border-2 border-[var(--rpg-red)] flex items-center justify-center text-3xl">
                    {selectedMonster.imageSrc ? (
                      <Image
                        src={selectedMonster.imageSrc}
                        alt={selectedMonster.name}
                        width={56}
                        height={56}
                        className="image-rendering-pixelated"
                      />
                    ) : (
                      <Image
                        src={uiIconSrc('attack')}
                        alt={selectedMonster.name}
                        width={56}
                        height={56}
                        className="image-rendering-pixelated"
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--rpg-text-primary)]">{selectedMonster.name}</h3>
                    <div className="text-xs text-[var(--rpg-text-secondary)]">Level {selectedMonster.level}</div>
                    <div className="text-xs text-[var(--rpg-gold)] mt-1">Defeated {selectedMonster.killCount} times</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMonster(null)}
                  className="text-[var(--rpg-text-secondary)] hover:text-[var(--rpg-text-primary)]"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm text-[var(--rpg-text-secondary)] mb-4">{selectedMonster.description}</p>

              {/* Stats */}
              <div className="mb-4">
                <h4 className="font-semibold text-[var(--rpg-text-primary)] text-sm mb-2">
                  Stats{' '}
                  {selectedMonster.killCount < 10 && (
                    <span className="text-xs text-[var(--rpg-text-secondary)]">(Partial)</span>
                  )}
                </h4>
                <div className="space-y-2">
                  {getStatsVisibility(selectedMonster.killCount).showHP ? (
                    <div className="flex items-center gap-3">
                      <Heart size={16} color="var(--rpg-green-light)" />
                      <span className="text-sm text-[var(--rpg-text-primary)]">HP:</span>
                      <span className="text-sm font-mono text-[var(--rpg-green-light)]">{selectedMonster.stats.hp}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 opacity-50">
                      <Heart size={16} color="var(--rpg-text-secondary)" />
                      <span className="text-sm text-[var(--rpg-text-secondary)]">HP: ???</span>
                    </div>
                  )}

                  {getStatsVisibility(selectedMonster.killCount).showAttack ? (
                    <div className="flex items-center gap-3">
                      <Sword size={16} color="var(--rpg-red)" />
                      <span className="text-sm text-[var(--rpg-text-primary)]">Attack:</span>
                      <span className="text-sm font-mono text-[var(--rpg-red)]">{selectedMonster.stats.attack}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 opacity-50">
                      <Sword size={16} color="var(--rpg-text-secondary)" />
                      <span className="text-sm text-[var(--rpg-text-secondary)]">
                        Attack: ??? <span className="text-xs">(Defeat 5+ times)</span>
                      </span>
                    </div>
                  )}

                  {getStatsVisibility(selectedMonster.killCount).showDefence ? (
                    <div className="flex items-center gap-3">
                      <Shield size={16} color="var(--rpg-blue-light)" />
                      <span className="text-sm text-[var(--rpg-text-primary)]">Defence:</span>
                      <span className="text-sm font-mono text-[var(--rpg-blue-light)]">
                        {selectedMonster.stats.defence}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 opacity-50">
                      <Shield size={16} color="var(--rpg-text-secondary)" />
                      <span className="text-sm text-[var(--rpg-text-secondary)]">
                        Defence: ??? <span className="text-xs">(Defeat 10+ times)</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Locations */}
              <div className="mb-4">
                <h4 className="font-semibold text-[var(--rpg-text-primary)] text-sm mb-2">Found In</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMonster.zones.map((zone, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 px-2 py-1 bg-[var(--rpg-background)] border border-[var(--rpg-border)] rounded text-xs text-[var(--rpg-text-secondary)]"
                    >
                      <MapPin size={12} />
                      {zone}
                    </div>
                  ))}
                </div>
              </div>

              {/* Known Drops */}
              {getStatsVisibility(selectedMonster.killCount).showDrops && (
                <div className="mb-4">
                  <h4 className="font-semibold text-[var(--rpg-text-primary)] text-sm mb-2">Known Drops</h4>
                  <div className="space-y-2">
                    {selectedMonster.drops.map((drop, idx) => {
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded border-2 flex items-center justify-center text-lg"
                            style={{ borderColor: RARITY_COLORS[drop.rarity] }}
                          >
                            {drop.imageSrc ? (
                              <Image
                                src={drop.imageSrc}
                                alt={drop.name}
                                width={24}
                                height={24}
                                className="image-rendering-pixelated"
                              />
                            ) : (
                              <span className="text-sm">❓</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-[var(--rpg-text-primary)]">{drop.name}</div>
                            <div className="text-xs text-[var(--rpg-text-secondary)]">{drop.dropRate}% drop rate</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <h4 className="font-semibold text-[var(--rpg-text-primary)] text-sm mb-2">Variants</h4>
                {selectedMonster.prefixEncounters.length === 0 ? (
                  <div className="text-xs text-[var(--rpg-text-secondary)]">No prefix variants encountered yet.</div>
                ) : (
                  <div className="space-y-2">
                    {selectedMonster.prefixEncounters.map((variant) => {
                      const showName = variant.kills >= 1;
                      const showEffects = variant.kills >= 3;
                      return (
                        <div
                          key={`${selectedMonster.id}-${variant.prefix}`}
                          className="rounded border border-[var(--rpg-border)] bg-[var(--rpg-background)] p-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className={`text-sm ${showName ? 'text-[var(--rpg-text-primary)]' : 'text-[var(--rpg-text-secondary)]'}`}>
                              {showName ? variant.displayName : '??? Variant'}
                            </div>
                            <div className="text-xs text-[var(--rpg-gold)] font-mono">x{variant.kills}</div>
                          </div>
                          <div className="text-xs text-[var(--rpg-text-secondary)] mt-1">
                            {showEffects ? getPrefixEffectsText(variant.prefix) : 'Defeat this variant 3+ times to reveal effects.'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <PixelButton variant="secondary" className="w-full" onClick={() => setSelectedMonster(null)}>
                Close
              </PixelButton>
            </PixelCard>
          </div>
        </div>
      )}
    </div>
  );
}
