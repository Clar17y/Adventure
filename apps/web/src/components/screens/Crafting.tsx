'use client';

import { useState } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import { KnockoutBanner } from '@/components/KnockoutBanner';
import { Hammer, Hourglass, Sparkles, CheckCircle, XCircle } from 'lucide-react';

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
  resultQuantity: number;
  requiredLevel: number;
  turnCost: number;
  xpReward: number;
  materials: Material[];
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

interface CraftingProps {
  skillName: string;
  skillLevel: number;
  recipes: Recipe[];
  onCraft: (recipeId: string) => void;
  isRecovering?: boolean;
  recoveryCost?: number | null;
}

export function Crafting({ skillName, skillLevel, recipes, onCraft, isRecovering = false, recoveryCost }: CraftingProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const canCraft = (recipe: Recipe) => {
    if (recipe.requiredLevel > skillLevel) return false;
    return recipe.materials.every((m) => m.owned >= m.required);
  };

  const rarityColors = {
    common: '#5a5a6a',
    uncommon: '#6aaa5a',
    rare: '#5aaad4',
    epic: '#7a4a9a',
    legendary: '#d4a84b',
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
            const isSelected = selectedRecipe?.id === recipe.id;
            const craftable = canCraft(recipe);
            const levelLocked = recipe.requiredLevel > skillLevel;

            return (
              <button
                key={recipe.id}
                onClick={() => setSelectedRecipe(recipe)}
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
                      style={{ borderColor: rarityColors[recipe.rarity] }}
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
                        <h4 className="font-semibold text-[var(--rpg-text-primary)] text-sm">
                          {recipe.name}
                          {recipe.resultQuantity > 1 && (
                            <span className="text-[var(--rpg-text-secondary)] ml-1">x{recipe.resultQuantity}</span>
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
              style={{ borderColor: rarityColors[selectedRecipe.rarity] }}
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
            </div>
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
    </div>
  );
}
