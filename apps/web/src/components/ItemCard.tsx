import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ItemCardProps {
  name: string;
  icon?: string;
  imageSrc?: string;
  quantity?: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  onClick?: () => void;
}

export function ItemCard({ name, icon, imageSrc, quantity, rarity = 'common', onClick }: ItemCardProps) {
  const rarityColors = {
    common: '#5a5a6a',
    uncommon: '#6aaa5a',
    rare: '#5aaad4',
    epic: '#7a4a9a',
    legendary: '#d4a84b',
  };

  const rarityGlow = {
    common: 'shadow-none',
    uncommon: 'shadow-[0_0_8px_rgba(106,170,90,0.3)]',
    rare: 'shadow-[0_0_8px_rgba(90,170,212,0.3)]',
    epic: 'shadow-[0_0_8px_rgba(122,74,154,0.3)]',
    legendary: 'shadow-[0_0_12px_rgba(212,168,75,0.4)]',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full aspect-square bg-[var(--rpg-surface)] rounded-lg border-2 transition-all hover:scale-105 active:scale-95',
        rarityGlow[rarity]
      )}
      style={{ borderColor: rarityColors[rarity] }}
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
