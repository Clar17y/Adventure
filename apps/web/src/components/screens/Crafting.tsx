'use client';

import { useEffect, useState } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import { KnockoutBanner } from '@/components/KnockoutBanner';
import { Hammer, Hourglass, Sparkles, CheckCircle, XCircle, Clock } from 'lucide-react';
import { RARITY_COLORS, type Rarity } from '@/lib/rarity';

interface Material {
  name: string;
  icon: string;
  imageSrc?: string;
  required: number;
  owned: number;
}

interface Recipe {
  id: string;
  name: string;
  icon?: string;
  imageSrc?: string;
  isAdvanced?: boolean;
  soulbound?: boolean;
  resultQuantity: number;
  requiredLevel: number;
  turnCost: number;
  xpReward: number;
  baseStats: Record<string, unknown>;
  materials: Material[];
  rarity: Rarity;
}

interface CraftingLogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success';
}

interface CraftingProps {
  skillName: string;
  skillLevel: number;
  recipes: Recipe[];
  onCraft: (recipeId: string) => void;
  activityLog: CraftingLogEntry[];
  isRecovering?: boolean;
  recoveryCost?: number | null;
}

const PERCENT_STATS = new Set(['critChance', 'critDamage']);
const STAT_ORDER = ['attack', 'armor', 'magicDefence', 'health', 'dodge', 'accuracy', 'magicPower', 'luck', 'evasion', 'critChance', 'critDamage'];

function prettyStatName(stat: string): string {
  if (stat === 'magicDefence') return 'Magic Defence';
  if (stat === 'critChance') return 'Crit Chance';
  if (stat === 'critDamage') return 'Crit Damage';
  if (stat === 'magicPower') return 'Magic Power';
  return stat
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function formatStatValue(stat: string, value: number): string {
  if (PERCENT_STATS.has(stat)) return `${Math.round(value * 100)}%`;
  return String(value);
}

function statEntries(stats: Record<string, unknown> | undefined): Array<[string, number]> {
  return Object.entries(stats ?? {})
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] !== 0)
    .sort((a, b) => {
      const aOrder = STAT_ORDER.indexOf(a[0]);
      const bOrder = STAT_ORDER.indexOf(b[0]);
      if (aOrder === -1 && bOrder === -1) return a[0].localeCompare(b[0]);
      if (aOrder === -1) return 1;
      if (bOrder === -1) return -1;
      return aOrder - bOrder;
    });
}

export function Crafting({ skillName, skillLevel, recipes, onCraft, activityLog, isRecovering = false, recoveryCost }: CraftingProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    if (recipes.length === 0) {
      setSelectedRecipeId(null);
      return;
    }
    if (!selectedRecipeId || !recipes.some((recipe) => recipe.id === selectedRecipeId)) {
      setSelectedRecipeId(recipes[0].id);
    }
  }, [recipes, selectedRecipeId]);

  const selectedRecipe = selectedRecipeId ? recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null : null;
  const selectedBaseStats = statEntries(selectedRecipe?.baseStats);

  const canCraft = (recipe: Recipe) => {
    if (recipe.requiredLevel > skillLevel) return false;
    return recipe.materials.every((m) => m.owned >= m.required);
  };

  return (
    <div className="space-y-4">
      {/* Knockout Banner */}
      {isRecovering && (
        <KnockoutBanner action="crafting" recoveryCost={recoveryCost} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-[var(--rpg-text-primary)]">{skillName}</h2>
          <div className="px-2 py-1 bg-[var(--rpg-gold)] rounded text-[var(--rpg-background)] text-sm font-bold">
            Lv. {skillLevel}
          </div>
        </div>
        <Hammer size={20} color="var(--rpg-gold)" />
      </div>

      {/* Recipe List */}
      <div className="space-y-2">
        <h3 className="font-semibold text-[var(--rpg-text-primary)] text-sm">Recipes</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recipes.map((recipe) => {
            const isSelected = selectedRecipeId === recipe.id;
            const craftable = canCraft(recipe);
            const levelLocked = recipe.requiredLevel > skillLevel;

            return (
              <button
                key={recipe.id}
                onClick={() => setSelectedRecipeId(recipe.id)}
                disabled={levelLocked}
                className={`w-full text-left transition-all ${levelLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <PixelCard
                  padding="sm"
                  className={`${
                    isSelected
                      ? 'border-[var(--rpg-gold)]'
                      : craftable
                      ? 'border-[var(--rpg-green-dark)]'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded border-2 flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ borderColor: RARITY_COLORS[recipe.rarity] }}
                    >
                      {recipe.imageSrc ? (
                        <img
                          src={recipe.imageSrc}
                          alt={recipe.name}
                          className="w-10 h-10 object-contain image-rendering-pixelated"
                        />
                      ) : (
                        recipe.icon
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between">
                        <h4 className="font-semibold text-[var(--rpg-text-primary)] text-sm flex items-center gap-2">
                          {recipe.name}
                          {recipe.resultQuantity > 1 && (
                            <span className="text-[var(--rpg-text-secondary)] ml-1">x{recipe.resultQuantity}</span>
                          )}
                          {recipe.isAdvanced && (
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--rpg-red)] text-white">
                              Advanced
                            </span>
                          )}
                        </h4>
                        <span className="text-xs text-[var(--rpg-text-secondary)]">Lv. {recipe.requiredLevel}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {craftable ? (
                          <CheckCircle size={12} color="var(--rpg-green-light)" />
                        ) : (
                          <XCircle size={12} color="var(--rpg-red)" />
                        )}
                        <span className="text-xs text-[var(--rpg-text-secondary)]">
                          {levelLocked ? 'Level too low' : craftable ? 'Can craft' : 'Missing materials'}
                        </span>
                      </div>
                    </div>
                  </div>
                </PixelCard>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Recipe Detail */}
      {selectedRecipe && (
        <PixelCard className="bg-[var(--rpg-background)]">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-16 h-16 rounded-lg border-2 flex items-center justify-center text-3xl flex-shrink-0"
              style={{ borderColor: RARITY_COLORS[selectedRecipe.rarity] }}
            >
              {selectedRecipe.imageSrc ? (
                <img
                  src={selectedRecipe.imageSrc}
                  alt={selectedRecipe.name}
                  className="w-14 h-14 object-contain image-rendering-pixelated"
                />
              ) : (
                selectedRecipe.icon
              )}
            </div>
            <div>
              <h3 className="font-bold text-[var(--rpg-text-primary)] text-lg">{selectedRecipe.name}</h3>
              <p className="text-xs text-[var(--rpg-text-secondary)] capitalize">
                {selectedRecipe.rarity} • Lv. {selectedRecipe.requiredLevel} Required
              </p>
              {selectedRecipe.isAdvanced && (
                <p className="text-xs text-[var(--rpg-gold)]">
                  Advanced recipe{selectedRecipe.soulbound ? ' • Soulbound result' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Base Stats */}
          <div className="space-y-2 mb-4">
            <h4 className="font-semibold text-[var(--rpg-text-primary)] text-sm">Base Stats</h4>
            {selectedBaseStats.length === 0 ? (
              <div className="text-sm text-[var(--rpg-text-secondary)]">No base stats</div>
            ) : (
              selectedBaseStats.map(([stat, value]) => (
                <div key={stat} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--rpg-text-primary)]">{prettyStatName(stat)}</span>
                  <span className="text-[var(--rpg-green-light)] font-mono font-semibold">+{formatStatValue(stat, value)}</span>
                </div>
              ))
            )}
          </div>

          {/* Required Materials */}
          <div className="space-y-2 mb-4">
            <h4 className="font-semibold text-[var(--rpg-text-primary)] text-sm">Required Materials</h4>
            {selectedRecipe.materials.map((material, idx) => {
              const hasEnough = material.owned >= material.required;
              return (
                <div key={idx} className="flex items-center gap-3">
                  {material.imageSrc ? (
                    <img
                      src={material.imageSrc}
                      alt={material.name}
                      className="w-8 h-8 object-contain image-rendering-pixelated"
                    />
                  ) : (
                    <span className="text-2xl">{material.icon || '❓'}</span>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-[var(--rpg-text-primary)]">{material.name}</span>
                      <span
                        className={`text-sm font-mono font-semibold ${
                          hasEnough ? 'text-[var(--rpg-green-light)]' : 'text-[var(--rpg-red)]'
                        }`}
                      >
                        {material.owned} / {material.required}
                      </span>
                    </div>
                  </div>
                  {hasEnough ? (
                    <CheckCircle size={16} color="var(--rpg-green-light)" />
                  ) : (
                    <XCircle size={16} color="var(--rpg-red)" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Cost and Reward */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[var(--rpg-surface)] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Hourglass size={16} color="var(--rpg-gold)" />
                <span className="text-xs text-[var(--rpg-text-secondary)]">Turn Cost</span>
              </div>
              <div className="text-xl font-bold text-[var(--rpg-gold)] font-mono">{selectedRecipe.turnCost}</div>
            </div>

            <div className="bg-[var(--rpg-surface)] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} color="var(--rpg-blue-light)" />
                <span className="text-xs text-[var(--rpg-text-secondary)]">XP Reward</span>
              </div>
              <div className="text-xl font-bold text-[var(--rpg-blue-light)] font-mono">{selectedRecipe.xpReward}</div>
            </div>
          </div>

          {/* Craft Button */}
          <PixelButton
            variant="gold"
            size="lg"
            className="w-full"
            onClick={() => onCraft(selectedRecipe.id)}
            disabled={isRecovering || !canCraft(selectedRecipe)}
          >
            {isRecovering ? 'Recover First' : `Craft ${selectedRecipe.name}`}
          </PixelButton>
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
