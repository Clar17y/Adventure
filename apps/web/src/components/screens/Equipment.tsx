'use client';

import { useMemo, useState } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import { StatBar } from '@/components/StatBar';
import { Heart, Shield, Sword, X, Zap } from 'lucide-react';
import { RARITY_COLORS, type Rarity } from '@/lib/rarity';

interface EquippedItem {
  id: string;
  name: string;
  icon?: string;
  imageSrc?: string;
  rarity: Rarity;
  durability: number;
  maxDurability: number;
  baseStats?: Record<string, unknown>;
}

interface EquipmentSlot {
  id: string;
  name: string;
  item: EquippedItem | null;
}

interface EquipmentProps {
  slots: EquipmentSlot[];
  inventoryItems: Array<{
    id: string;
    name: string;
    icon?: string;
    imageSrc?: string;
    rarity: Rarity;
    slot: string;
    equippedSlot: string | null;
    durability: { current: number; max: number } | null;
    baseStats?: Record<string, unknown>;
  }>;
  onEquip?: (itemId: string, slot: string) => void | Promise<void>;
  onUnequip?: (slot: string) => void | Promise<void>;
  stats: {
    attack: number;
    defence: number;
    hp: number;
    evasion: number;
  };
}

function numStat(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function statValue(stats: Record<string, unknown> | undefined, key: string): number {
  const v = stats ? numStat((stats as any)[key]) : null;
  return typeof v === 'number' ? v : 0;
}

function prettySlot(slot: string) {
  return slot.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Equipment({ slots, inventoryItems, onEquip, onUnequip, stats }: EquipmentProps) {
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

  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSlot = activeSlotId ? slots.find((s) => s.id === activeSlotId) ?? null : null;
  const currentItem = activeSlot?.item ?? null;

  const candidates = useMemo(() => {
    if (!activeSlotId) return [];
    return inventoryItems
      .filter((i) => i.slot === activeSlotId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [inventoryItems, activeSlotId]);

  const closeModal = () => {
    setActiveSlotId(null);
    setError(null);
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
          onClick={() => {
            setActiveSlotId(slotId);
            setError(null);
          }}
          className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all relative ${
            item
              ? 'bg-[var(--rpg-surface)] border-2 hover:border-[var(--rpg-gold)]'
              : 'bg-[var(--rpg-background)] border-2 border-dashed border-[var(--rpg-border)] hover:border-[var(--rpg-text-secondary)]'
          }`}
          style={{
            borderColor: item ? RARITY_COLORS[item.rarity] : undefined,
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

      {/* Slot Selection Modal */}
      {activeSlotId && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <PixelCard className="max-w-md w-full" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--rpg-text-primary)]">
                  {slotPositions[activeSlotId]?.label ?? prettySlot(activeSlotId)}
                </h3>
                <div className="text-xs text-[var(--rpg-text-secondary)]">Select an item to equip</div>
              </div>
              <button
                onClick={closeModal}
                className="text-[var(--rpg-text-secondary)] hover:text-[var(--rpg-text-primary)]"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-3 p-2 rounded bg-[var(--rpg-background)] border border-[var(--rpg-red)] text-[var(--rpg-red)] text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div className="bg-[var(--rpg-background)] border border-[var(--rpg-border)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-[var(--rpg-text-primary)]">Currently Equipped</div>
                  {currentItem && onUnequip && (
                    <PixelButton
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={async () => {
                        if (!activeSlotId) return;
                        setBusy(true);
                        setError(null);
                        try {
                          await onUnequip(activeSlotId);
                          closeModal();
                        } catch {
                          setError('Failed to unequip item.');
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Unequip
                    </PixelButton>
                  )}
                </div>

                {currentItem ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded border-2 flex items-center justify-center text-xl flex-shrink-0"
                        style={{ borderColor: RARITY_COLORS[currentItem.rarity] }}
                      >
                        {currentItem.imageSrc ? (
                          <img
                            src={currentItem.imageSrc}
                            alt={currentItem.name}
                            className="w-8 h-8 object-contain image-rendering-pixelated"
                          />
                        ) : (
                          currentItem.icon
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[var(--rpg-text-primary)] text-sm">{currentItem.name}</div>
                        <div className="text-xs text-[var(--rpg-text-secondary)] font-mono">
                          {currentItem.durability}/{currentItem.maxDurability}
                        </div>
                      </div>
                    </div>

                    <StatBar
                      current={currentItem.durability}
                      max={currentItem.maxDurability}
                      color="durability"
                      size="sm"
                      showNumbers={false}
                    />

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {statValue(currentItem.baseStats, 'attack') !== 0 && (
                        <div className="flex items-center gap-2">
                          <Sword size={16} className="text-[var(--rpg-red)]" />
                          <span className="text-[var(--rpg-text-secondary)]">Attack</span>
                          <span className="ml-auto font-mono text-[var(--rpg-red)]">
                            +{statValue(currentItem.baseStats, 'attack')}
                          </span>
                        </div>
                      )}
                      {statValue(currentItem.baseStats, 'armor') !== 0 && (
                        <div className="flex items-center gap-2">
                          <Shield size={16} className="text-[var(--rpg-blue-light)]" />
                          <span className="text-[var(--rpg-text-secondary)]">Armor</span>
                          <span className="ml-auto font-mono text-[var(--rpg-blue-light)]">
                            +{statValue(currentItem.baseStats, 'armor')}
                          </span>
                        </div>
                      )}
                      {statValue(currentItem.baseStats, 'health') !== 0 && (
                        <div className="flex items-center gap-2">
                          <Heart size={16} className="text-[var(--rpg-green-light)]" />
                          <span className="text-[var(--rpg-text-secondary)]">HP</span>
                          <span className="ml-auto font-mono text-[var(--rpg-green-light)]">
                            +{statValue(currentItem.baseStats, 'health')}
                          </span>
                        </div>
                      )}
                      {statValue(currentItem.baseStats, 'evasion') !== 0 && (
                        <div className="flex items-center gap-2">
                          <Zap size={16} className="text-[var(--rpg-gold)]" />
                          <span className="text-[var(--rpg-text-secondary)]">Evasion</span>
                          <span className="ml-auto font-mono text-[var(--rpg-gold)]">
                            +{statValue(currentItem.baseStats, 'evasion')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-[var(--rpg-text-secondary)]">Empty</div>
                )}
              </div>

              <div>
                <div className="text-sm font-semibold text-[var(--rpg-text-primary)] mb-2">Inventory</div>
                {candidates.length === 0 ? (
                  <div className="text-sm text-[var(--rpg-text-secondary)]">
                    No items available for this slot.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {candidates.map((item) => {
                      const currentAttack = statValue(currentItem?.baseStats, 'attack');
                      const currentArmor = statValue(currentItem?.baseStats, 'armor');
                      const currentHealth = statValue(currentItem?.baseStats, 'health');
                      const currentEvasion = statValue(currentItem?.baseStats, 'evasion');

                      const nextAttack = statValue(item.baseStats, 'attack');
                      const nextArmor = statValue(item.baseStats, 'armor');
                      const nextHealth = statValue(item.baseStats, 'health');
                      const nextEvasion = statValue(item.baseStats, 'evasion');

                      const diffs = [
                        { key: 'Attack', diff: nextAttack - currentAttack },
                        { key: 'Armor', diff: nextArmor - currentArmor },
                        { key: 'HP', diff: nextHealth - currentHealth },
                        { key: 'Evasion', diff: nextEvasion - currentEvasion },
                      ].filter((d) => d.diff !== 0);

                      const isEquippedHere = item.equippedSlot === activeSlotId;
                      const durability = item.durability;

                      return (
                        <div
                          key={item.id}
                          className="bg-[var(--rpg-surface)] border border-[var(--rpg-border)] rounded-lg p-3"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-10 h-10 rounded border-2 flex items-center justify-center text-xl flex-shrink-0"
                              style={{ borderColor: RARITY_COLORS[item.rarity] }}
                            >
                              {item.imageSrc ? (
                                <img
                                  src={item.imageSrc}
                                  alt={item.name}
                                  className="w-8 h-8 object-contain image-rendering-pixelated"
                                />
                              ) : (
                                item.icon
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <div className="font-semibold text-[var(--rpg-text-primary)] text-sm truncate">
                                  {item.name}
                                </div>
                                <PixelButton
                                  variant={isEquippedHere ? 'secondary' : 'primary'}
                                  size="sm"
                                  disabled={busy || !onEquip || isEquippedHere}
                                  onClick={async () => {
                                    if (!activeSlotId || !onEquip) return;
                                    setBusy(true);
                                    setError(null);
                                    try {
                                      await onEquip(item.id, activeSlotId);
                                      closeModal();
                                    } catch {
                                      setError('Failed to equip item.');
                                    } finally {
                                      setBusy(false);
                                    }
                                  }}
                                >
                                  {isEquippedHere ? 'Equipped' : 'Equip'}
                                </PixelButton>
                              </div>

                              {durability && durability.max > 0 && (
                                <div className="mt-2">
                                  <StatBar
                                    current={durability.current}
                                    max={durability.max}
                                    color="durability"
                                    size="sm"
                                    showNumbers={false}
                                  />
                                </div>
                              )}

                              {diffs.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono">
                                  {diffs.map((d) => (
                                    <span
                                      key={d.key}
                                      className={
                                        d.diff > 0
                                          ? 'text-[var(--rpg-green-light)]'
                                          : 'text-[var(--rpg-red)]'
                                      }
                                    >
                                      {d.diff > 0 ? '+' : ''}
                                      {d.diff} {d.key}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </PixelCard>
        </div>
      )}

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
                  style={{ borderColor: slot.item ? RARITY_COLORS[slot.item.rarity] : 'var(--rpg-border)' }}
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
