'use client';

import { PixelCard } from '@/components/PixelCard';
import { StatBar } from '@/components/StatBar';
import { Shield, Sword, Heart, Zap } from 'lucide-react';

interface EquippedItem {
  name: string;
  icon?: string;
  imageSrc?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  durability: number;
  maxDurability: number;
}

interface EquipmentSlot {
  id: string;
  name: string;
  item: EquippedItem | null;
}

interface EquipmentProps {
  slots: EquipmentSlot[];
  stats: {
    attack: number;
    defence: number;
    hp: number;
    evasion: number;
  };
}

export function Equipment({ slots, stats }: EquipmentProps) {
  const rarityColors = {
    common: '#5a5a6a',
    uncommon: '#6aaa5a',
    rare: '#5aaad4',
    epic: '#7a4a9a',
    legendary: '#d4a84b',
  };

  const slotPositions: Record<string, { gridColumn: string; gridRow: string; label: string }> = {
    head: { gridColumn: '2', gridRow: '1', label: 'Head' },
    neck: { gridColumn: '2', gridRow: '2', label: 'Neck' },
    main_hand: { gridColumn: '1', gridRow: '3', label: 'Main Hand' },
    chest: { gridColumn: '2', gridRow: '3', label: 'Chest' },
    off_hand: { gridColumn: '3', gridRow: '3', label: 'Off Hand' },
    gloves: { gridColumn: '1', gridRow: '4', label: 'Gloves' },
    belt: { gridColumn: '2', gridRow: '4', label: 'Belt' },
    ring: { gridColumn: '3', gridRow: '4', label: 'Ring' },
    legs: { gridColumn: '2', gridRow: '5', label: 'Legs' },
    boots: { gridColumn: '2', gridRow: '6', label: 'Boots' },
    charm: { gridColumn: '3', gridRow: '6', label: 'Charm' },
  };

  const getSlotInfo = (slotId: string) => {
    return slots.find((s) => s.id === slotId)?.item || null;
  };

  const renderSlot = (slotId: string) => {
    const position = slotPositions[slotId];
    if (!position) return null;
    const item = getSlotInfo(slotId);

    return (
      <div key={slotId} style={{ gridColumn: position.gridColumn, gridRow: position.gridRow }}>
        <button
          className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all relative ${
            item
              ? 'bg-[var(--rpg-surface)] border-2 hover:border-[var(--rpg-gold)]'
              : 'bg-[var(--rpg-background)] border-2 border-dashed border-[var(--rpg-border)] hover:border-[var(--rpg-text-secondary)]'
          }`}
          style={{
            borderColor: item ? rarityColors[item.rarity] : undefined,
          }}
        >
          {item ? (
            <>
              {item.imageSrc ? (
                <img
                  src={item.imageSrc}
                  alt={item.name}
                  className="w-10 h-10 object-contain image-rendering-pixelated"
                />
              ) : (
                <span className="text-2xl">{item.icon ?? '❓'}</span>
              )}
              {item.durability < item.maxDurability && (
                <div className="absolute -bottom-1 left-1 right-1">
                  <div className="h-1 bg-[var(--rpg-background)] rounded-full overflow-hidden border border-[var(--rpg-border)]">
                    <div
                      className="h-full bg-[var(--rpg-text-secondary)]"
                      style={{
                        width: `${(item.durability / item.maxDurability) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <span className="text-[10px] text-[var(--rpg-text-secondary)] text-center px-1 leading-tight">
              {position.label}
            </span>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[var(--rpg-text-primary)]">Equipment</h2>

      {/* Character Equipment Grid */}
      <PixelCard className="flex justify-center">
        <div className="grid grid-cols-3 gap-2 p-4">
          {Object.keys(slotPositions).map(renderSlot)}
        </div>
      </PixelCard>

      {/* Stats Panel */}
      <PixelCard>
        <h3 className="font-semibold text-[var(--rpg-text-primary)] mb-4">Total Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--rpg-background)] flex items-center justify-center">
              <Sword size={20} color="var(--rpg-red)" />
            </div>
            <div>
              <div className="text-xs text-[var(--rpg-text-secondary)]">Attack</div>
              <div className="text-2xl font-bold text-[var(--rpg-red)] font-mono">{stats.attack}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--rpg-background)] flex items-center justify-center">
              <Shield size={20} color="var(--rpg-blue-light)" />
            </div>
            <div>
              <div className="text-xs text-[var(--rpg-text-secondary)]">Defence</div>
              <div className="text-2xl font-bold text-[var(--rpg-blue-light)] font-mono">{stats.defence}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--rpg-background)] flex items-center justify-center">
              <Heart size={20} color="var(--rpg-green-light)" />
            </div>
            <div>
              <div className="text-xs text-[var(--rpg-text-secondary)]">HP</div>
              <div className="text-2xl font-bold text-[var(--rpg-green-light)] font-mono">{stats.hp}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--rpg-background)] flex items-center justify-center">
              <Zap size={20} color="var(--rpg-gold)" />
            </div>
            <div>
              <div className="text-xs text-[var(--rpg-text-secondary)]">Evasion</div>
              <div className="text-2xl font-bold text-[var(--rpg-gold)] font-mono">{stats.evasion}%</div>
            </div>
          </div>
        </div>
      </PixelCard>

      {/* Equipped Items List */}
      <div className="space-y-2">
        <h3 className="font-semibold text-[var(--rpg-text-primary)]">Equipped Items</h3>
        {slots
          .filter((slot) => slot.item !== null)
          .map((slot) => (
            <PixelCard key={slot.id} padding="sm">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded border-2 flex items-center justify-center text-xl flex-shrink-0"
                  style={{ borderColor: slot.item ? rarityColors[slot.item.rarity] : 'var(--rpg-border)' }}
                >
                  {slot.item?.imageSrc ? (
                    <img
                      src={slot.item.imageSrc}
                      alt={slot.item.name}
                      className="w-8 h-8 object-contain image-rendering-pixelated"
                    />
                  ) : (
                    slot.item?.icon
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-semibold text-[var(--rpg-text-primary)] text-sm">{slot.item?.name}</span>
                    <span className="text-xs text-[var(--rpg-text-secondary)] capitalize">{slot.name}</span>
                  </div>
                  {slot.item && (
                    <StatBar
                      current={slot.item.durability}
                      max={slot.item.maxDurability}
                      color="durability"
                      size="sm"
                      showNumbers={false}
                    />
                  )}
                </div>
              </div>
            </PixelCard>
          ))}
      </div>
    </div>
  );
}
