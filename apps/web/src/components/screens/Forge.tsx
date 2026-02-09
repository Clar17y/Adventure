'use client';

import { useEffect, useMemo, useState } from 'react';
import { ITEM_RARITY_CONSTANTS } from '@adventure/shared';
import { calculateForgeUpgradeSuccessChance, getForgeRerollCost, getForgeUpgradeCost, getNextRarity } from '@adventure/game-engine';
import { Anvil, Clock, Sparkles, TrendingUp } from 'lucide-react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import { RARITY_COLORS, type Rarity } from '@/lib/rarity';
import { KnockoutBanner } from '@/components/KnockoutBanner';

interface ForgeItem {
  id: string;
  templateId: string;
  name: string;
  imageSrc?: string;
  rarity: Rarity;
  type: string;
  equippedSlot: string | null;
  baseStats?: Record<string, unknown>;
  bonusStats?: Record<string, unknown> | null;
}

interface ForgeLogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success';
}

interface ForgeProps {
  items: ForgeItem[];
  equippedLuck: number;
  activityLog: ForgeLogEntry[];
  onUpgrade: (itemId: string, sacrificialItemId: string) => void | Promise<void>;
  onReroll: (itemId: string, sacrificialItemId: string) => void | Promise<void>;
  isRecovering?: boolean;
  recoveryCost?: number | null;
}

function statEntries(stats: Record<string, unknown> | null | undefined): Array<[string, number]> {
  return Object.entries(stats ?? {})
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] !== 0);
}

const PERCENT_STATS = new Set(['critChance', 'critDamage']);

function prettifyStat(stat: string): string {
  if (stat === 'evasion') return 'Dodge';
  if (stat === 'critChance') return 'Crit Chance';
  if (stat === 'critDamage') return 'Crit Damage';
  return stat
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function formatStatValue(stat: string, value: number): string {
  if (PERCENT_STATS.has(stat)) return `${Math.round(value * 100)}%`;
  return String(value);
}

function titleCaseRarity(rarity: Rarity): string {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
}

function formatBonusSummary(stats: Record<string, unknown> | null | undefined): string {
  const entries = statEntries(stats);
  if (entries.length === 0) return 'No bonus stats';
  return entries.map(([stat, value]) => `+${formatStatValue(stat, value)} ${prettifyStat(stat)}`).join(', ');
}

export function Forge({
  items,
  equippedLuck,
  activityLog,
  onUpgrade,
  onReroll,
  isRecovering = false,
  recoveryCost,
}: ForgeProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(items[0]?.id ?? null);
  const [selectedUpgradeSacrificeId, setSelectedUpgradeSacrificeId] = useState<string | null>(null);
  const [selectedRerollSacrificeId, setSelectedRerollSacrificeId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upgrade' | 'reroll' | null>(null);

  useEffect(() => {
    if (!selectedItemId || !items.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(items[0]?.id ?? null);
    }
  }, [items, selectedItemId]);

  const selected = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((item) => item.id === selectedItemId) ?? null;
  }, [items, selectedItemId]);

  const upgradeSacrifices = useMemo(() => {
    if (!selected) return [];
    return items
      .filter((item) => (
        item.id !== selected.id
        && !item.equippedSlot
        && item.type === selected.type
        && item.rarity === selected.rarity
      ))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, selected]);

  const rerollSacrifices = useMemo(() => {
    if (!selected) return [];
    return items
      .filter((item) => (
        item.id !== selected.id
        && !item.equippedSlot
        && item.templateId === selected.templateId
        && item.rarity === selected.rarity
      ))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, selected]);

  useEffect(() => {
    if (upgradeSacrifices.length === 0) {
      setSelectedUpgradeSacrificeId(null);
      return;
    }

    const stillValid = selectedUpgradeSacrificeId
      && upgradeSacrifices.some((item) => item.id === selectedUpgradeSacrificeId);
    if (!stillValid) {
      setSelectedUpgradeSacrificeId(upgradeSacrifices[0]?.id ?? null);
    }
  }, [upgradeSacrifices, selectedUpgradeSacrificeId]);

  useEffect(() => {
    if (rerollSacrifices.length === 0) {
      setSelectedRerollSacrificeId(null);
      return;
    }

    const stillValid = selectedRerollSacrificeId
      && rerollSacrifices.some((item) => item.id === selectedRerollSacrificeId);
    if (!stillValid) {
      setSelectedRerollSacrificeId(rerollSacrifices[0]?.id ?? null);
    }
  }, [rerollSacrifices, selectedRerollSacrificeId]);

  const canUseForge = Boolean(selected && !selected.equippedSlot);
  const hasUpgradeSacrifice = upgradeSacrifices.length > 0;
  const hasRerollSacrifice = rerollSacrifices.length > 0;
  const upgradeCost = selected ? getForgeUpgradeCost(selected.rarity) : null;
  const rerollCost = selected ? getForgeRerollCost(selected.rarity) : null;
  const nextRarity = selected ? getNextRarity(selected.rarity) : null;
  const upgradeChance = selected ? calculateForgeUpgradeSuccessChance(selected.rarity, equippedLuck) : null;
  const bonusEntries = statEntries(selected?.bonusStats);
  const baseEntries = statEntries(selected?.baseStats);

  return (
    <div className="space-y-4">
      {isRecovering && <KnockoutBanner action="forge" recoveryCost={recoveryCost} />}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--rpg-text-primary)]">Forge</h2>
        <div className="text-sm text-[var(--rpg-text-secondary)]">Luck: {equippedLuck}</div>
      </div>

      <PixelCard>
        <div className="text-sm font-semibold text-[var(--rpg-text-primary)] mb-2">Eligible Items</div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.length === 0 && (
            <div className="text-sm text-[var(--rpg-text-secondary)]">No weapon or armor items in inventory.</div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedItemId(item.id)}
              className={`w-full text-left rounded border px-3 py-2 transition-colors ${
                selectedItemId === item.id
                  ? 'border-[var(--rpg-gold)] bg-[var(--rpg-background)]'
                  : 'border-[var(--rpg-border)] bg-[var(--rpg-surface)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-9 h-9 rounded border-2 flex items-center justify-center bg-[var(--rpg-background)]"
                    style={{ borderColor: RARITY_COLORS[item.rarity] }}
                  >
                    {item.imageSrc ? (
                      <img src={item.imageSrc} alt={item.name} className="w-7 h-7 object-contain image-rendering-pixelated" />
                    ) : (
                      <Anvil size={16} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-[var(--rpg-text-primary)] font-semibold truncate">{item.name}</div>
                    <div className="text-xs text-[var(--rpg-text-secondary)]">{titleCaseRarity(item.rarity)}</div>
                  </div>
                </div>
                {item.equippedSlot && (
                  <div className="text-xs text-[var(--rpg-gold)]">Equipped</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </PixelCard>

      {selected && (
        <PixelCard className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-[var(--rpg-text-primary)]">{selected.name}</div>
              <div className="text-xs text-[var(--rpg-text-secondary)]">
                {titleCaseRarity(selected.rarity)} | Bonus slots {ITEM_RARITY_CONSTANTS.BONUS_SLOTS_BY_RARITY[selected.rarity]}
              </div>
              {selected.equippedSlot && (
                <div className="text-xs text-[var(--rpg-gold)] mt-1">Unequip this item to use the forge.</div>
              )}
            </div>
          </div>

          {(baseEntries.length > 0 || bonusEntries.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[var(--rpg-background)] rounded p-2 border border-[var(--rpg-border)]">
                <div className="text-xs text-[var(--rpg-text-secondary)] mb-1">Base Stats</div>
                <div className="space-y-0.5 text-sm">
                  {baseEntries.length === 0 && <div className="text-[var(--rpg-text-secondary)]">None</div>}
                  {baseEntries.map(([stat, value]) => (
                    <div key={`base-${stat}`} className="text-[var(--rpg-text-primary)]">
                      +{value} {prettifyStat(stat)}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[var(--rpg-background)] rounded p-2 border border-[var(--rpg-border)]">
                <div className="text-xs text-[var(--rpg-gold)] mb-1">Bonus Stats</div>
                <div className="space-y-0.5 text-sm">
                  {bonusEntries.length === 0 && <div className="text-[var(--rpg-text-secondary)]">None</div>}
                  {bonusEntries.map(([stat, value]) => (
                    <div key={`bonus-${stat}`} className="text-[var(--rpg-green-light)]">
                      +{formatStatValue(stat, value)} {prettifyStat(stat)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-[var(--rpg-border)] rounded p-3 bg-[var(--rpg-surface)] space-y-2">
              <div className="flex items-center gap-2 text-[var(--rpg-text-primary)] font-semibold">
                <TrendingUp size={16} />
                Upgrade
              </div>
              <div className="text-xs text-[var(--rpg-text-secondary)]">
                {nextRarity ? `Next rarity: ${titleCaseRarity(nextRarity)}` : 'Item is at max rarity.'}
              </div>
              <div className="text-xs text-[var(--rpg-text-secondary)]">
                Success keeps existing bonus stats and adds one new bonus roll.
              </div>
              <div className="text-xs text-[var(--rpg-text-secondary)]">
                Cost: {upgradeCost ?? '-'} turns + 1 sacrificial {selected?.rarity ?? ''} {selected?.type ?? 'item'}
              </div>
              <div className="text-xs text-[var(--rpg-text-secondary)]">
                Success: {typeof upgradeChance === 'number' ? `${(upgradeChance * 100).toFixed(1)}%` : '-'}
              </div>

              <div className="space-y-1">
                <div className="text-xs text-[var(--rpg-text-secondary)]">Select sacrificial item:</div>
                {upgradeSacrifices.length === 0 ? (
                  <div className="text-xs text-[var(--rpg-red)]">Missing sacrificial item.</div>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {upgradeSacrifices.map((item) => (
                      <button
                        key={`upgrade-sac-${item.id}`}
                        type="button"
                        onClick={() => setSelectedUpgradeSacrificeId(item.id)}
                        className={`w-full rounded border px-2 py-1.5 text-left ${
                          selectedUpgradeSacrificeId === item.id
                            ? 'border-[var(--rpg-gold)] bg-[var(--rpg-background)]'
                            : 'border-[var(--rpg-border)] bg-[var(--rpg-surface)]'
                        }`}
                      >
                        <div className="text-xs font-semibold text-[var(--rpg-text-primary)] truncate">{item.name}</div>
                        <div className="text-[11px] text-[var(--rpg-green-light)]">{formatBonusSummary(item.bonusStats)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <PixelButton
                variant="gold"
                size="sm"
                className="w-full"
                disabled={
                  isRecovering
                  || !canUseForge
                  || !hasUpgradeSacrifice
                  || !selectedUpgradeSacrificeId
                  || !nextRarity
                  || upgradeCost === null
                  || busy !== null
                }
                onClick={async () => {
                  if (!selectedUpgradeSacrificeId) return;
                  setBusy('upgrade');
                  try {
                    await onUpgrade(selected.id, selectedUpgradeSacrificeId);
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Upgrade Rarity
              </PixelButton>
            </div>

            <div className="border border-[var(--rpg-border)] rounded p-3 bg-[var(--rpg-surface)] space-y-2">
              <div className="flex items-center gap-2 text-[var(--rpg-text-primary)] font-semibold">
                <Sparkles size={16} />
                Reroll
              </div>
              <div className="text-xs text-[var(--rpg-text-secondary)]">
                Rerolls all bonus stats for current rarity.
              </div>
              <div className="text-xs text-[var(--rpg-text-secondary)]">
                Cost: {rerollCost ?? '-'} turns + 1 sacrificial duplicate at same rarity
              </div>

              <div className="space-y-1">
                <div className="text-xs text-[var(--rpg-text-secondary)]">Select sacrificial duplicate:</div>
                {rerollSacrifices.length === 0 ? (
                  <div className="text-xs text-[var(--rpg-red)]">Missing sacrificial duplicate.</div>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {rerollSacrifices.map((item) => (
                      <button
                        key={`reroll-sac-${item.id}`}
                        type="button"
                        onClick={() => setSelectedRerollSacrificeId(item.id)}
                        className={`w-full rounded border px-2 py-1.5 text-left ${
                          selectedRerollSacrificeId === item.id
                            ? 'border-[var(--rpg-gold)] bg-[var(--rpg-background)]'
                            : 'border-[var(--rpg-border)] bg-[var(--rpg-surface)]'
                        }`}
                      >
                        <div className="text-xs font-semibold text-[var(--rpg-text-primary)] truncate">{item.name}</div>
                        <div className="text-[11px] text-[var(--rpg-green-light)]">{formatBonusSummary(item.bonusStats)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <PixelButton
                variant="primary"
                size="sm"
                className="w-full"
                disabled={
                  isRecovering
                  || !canUseForge
                  || !hasRerollSacrifice
                  || !selectedRerollSacrificeId
                  || rerollCost === null
                  || busy !== null
                }
                onClick={async () => {
                  if (!selectedRerollSacrificeId) return;
                  setBusy('reroll');
                  try {
                    await onReroll(selected.id, selectedRerollSacrificeId);
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Reroll Bonus Stats
              </PixelButton>
            </div>
          </div>
        </PixelCard>
      )}

      <PixelCard>
        <h3 className="font-semibold text-[var(--rpg-text-primary)] mb-3">Recent Activity</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {activityLog.length === 0 ? (
            <div className="text-sm text-[var(--rpg-text-secondary)] text-center py-4">No recent activity</div>
          ) : (
            activityLog.map((entry, index) => {
              const typeColors = {
                info: 'text-[var(--rpg-text-secondary)]',
                success: 'text-[var(--rpg-green-light)]',
              };
              return (
                <div key={index} className="flex gap-2 text-sm">
                  <Clock size={14} className="text-[var(--rpg-text-secondary)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--rpg-text-secondary)] flex-shrink-0 font-mono">{entry.timestamp}</span>
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

