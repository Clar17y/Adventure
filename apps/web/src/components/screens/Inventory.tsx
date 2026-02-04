'use client';

import { useState } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { ItemCard } from '@/components/ItemCard';
import { PixelButton } from '@/components/PixelButton';
import { X } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  icon?: string;
  imageSrc?: string;
  quantity: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  description: string;
  type: string;
}

interface InventoryProps {
  items: Item[];
  onDrop?: (itemId: string) => void;
  onRepair?: (itemId: string) => void;
}

export function Inventory({ items, onDrop, onRepair }: InventoryProps) {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--rpg-text-primary)]">Inventory</h2>
        <div className="text-sm text-[var(--rpg-text-secondary)]">{items.length} items</div>
      </div>

      {/* Item Grid */}
      <div className="grid grid-cols-6 gap-2">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            name={item.name}
            icon={item.icon}
            imageSrc={item.imageSrc}
            quantity={item.quantity}
            rarity={item.rarity}
            onClick={() => setSelectedItem(item)}
          />
        ))}
        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 24 - items.length) }).map((_, idx) => (
          <div
            key={`empty-${idx}`}
            className="aspect-square bg-[var(--rpg-background)] border border-[var(--rpg-border)] rounded-lg opacity-30"
          />
        ))}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedItem(null)}
        >
          <PixelCard className="max-w-sm w-full" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-lg border-2 flex items-center justify-center text-3xl flex-shrink-0"
                  style={{
                    borderColor:
                      selectedItem.rarity === 'legendary'
                        ? 'var(--rpg-gold)'
                        : selectedItem.rarity === 'epic'
                        ? 'var(--rpg-purple)'
                        : selectedItem.rarity === 'rare'
                        ? 'var(--rpg-blue-light)'
                        : selectedItem.rarity === 'uncommon'
                        ? 'var(--rpg-green-light)'
                        : 'var(--rpg-border)',
                  }}
                >
                  {selectedItem.imageSrc ? (
                    <img
                      src={selectedItem.imageSrc}
                      alt={selectedItem.name}
                      className="w-14 h-14 object-contain image-rendering-pixelated"
                    />
                  ) : (
                    selectedItem.icon
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--rpg-text-primary)]">{selectedItem.name}</h3>
                  <div className="text-xs text-[var(--rpg-text-secondary)] capitalize">
                    {selectedItem.rarity} • {selectedItem.type}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-[var(--rpg-text-secondary)] hover:text-[var(--rpg-text-primary)]"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-[var(--rpg-text-secondary)] mb-4">{selectedItem.description}</p>

            <div className="flex gap-2">
              <PixelButton
                variant="primary"
                size="sm"
                className="flex-1"
                disabled={busy || !onRepair || !['weapon', 'armor'].includes(selectedItem.type)}
                onClick={async () => {
                  if (!onRepair) return;
                  setBusy(true);
                  try {
                    await onRepair(selectedItem.id);
                    setSelectedItem(null);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Repair
              </PixelButton>
              <PixelButton
                variant="secondary"
                size="sm"
                className="flex-1"
                disabled={busy || !onDrop}
                onClick={async () => {
                  if (!onDrop) return;
                  setBusy(true);
                  try {
                    await onDrop(selectedItem.id);
                    setSelectedItem(null);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Drop
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      )}
    </div>
  );
}
