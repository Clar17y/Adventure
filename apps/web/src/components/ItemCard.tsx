import { cn } from '@/lib/utils';
import Image from 'next/image';
import { RARITY_COLORS, RARITY_GLOW, type Rarity } from '@/lib/rarity';

interface ItemCardProps {
  name: string;
  icon?: string;
  imageSrc?: string;
  quantity?: number;
  rarity?: Rarity;
  onClick?: () => void;
}

export function ItemCard({ name, icon, imageSrc, quantity, rarity = 'common', onClick }: ItemCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full aspect-square bg-[var(--rpg-surface)] rounded-lg border-2 transition-all hover:scale-105 active:scale-95',
        RARITY_GLOW[rarity]
      )}
      style={{ borderColor: RARITY_COLORS[rarity] }}
      title={name}
    >
      <div className="w-full h-full flex items-center justify-center p-2">
        {imageSrc ? (
          <div className="relative w-full h-full">
            <Image src={imageSrc} alt={name} fill className="object-contain image-rendering-pixelated" />
          </div>
        ) : (
          <span className="text-4xl">{icon ?? '❓'}</span>
        )}
      </div>
      {quantity !== undefined && quantity > 1 && (
        <div className="absolute bottom-1 right-1 bg-[var(--rpg-background)] border border-[var(--rpg-border)] rounded px-1.5 py-0.5 text-xs font-mono text-[var(--rpg-text-primary)]">
          {quantity}
        </div>
      )}
    </button>
  );
}
