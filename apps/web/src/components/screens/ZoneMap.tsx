'use client';

import { useState } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import { MapPin, Lock, Star, Hourglass } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  icon?: string;
  imageSrc?: string;
  difficulty: number;
  travelCost: number;
  isLocked: boolean;
  isCurrent: boolean;
  description: string;
}

interface ZoneMapProps {
  zones: Zone[];
  onTravel: (zoneId: string) => void;
}

export function ZoneMap({ zones, onTravel }: ZoneMapProps) {
  const [selectedZone, setSelectedZone] = useState<Zone | null>(zones.find((z) => z.isCurrent) || null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--rpg-text-primary)]">World Map</h2>
        <MapPin size={20} color="var(--rpg-gold)" />
      </div>

      {/* Zone Grid */}
      <div className="space-y-3">
        {zones.map((zone) => {
          const isSelected = selectedZone?.id === zone.id;
          return (
            <button
              key={zone.id}
              onClick={() => !zone.isLocked && setSelectedZone(zone)}
              disabled={zone.isLocked}
              className={`w-full text-left transition-all ${zone.isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <PixelCard
                className={`relative overflow-hidden ${
                  zone.isCurrent
                    ? 'border-[var(--rpg-gold)] border-2'
                    : isSelected
                    ? 'border-[var(--rpg-blue-light)]'
                    : ''
                }`}
              >
                {zone.isLocked && (
                  <div className="absolute top-2 right-2 z-10">
                    <div className="w-8 h-8 rounded-full bg-[var(--rpg-background)] border border-[var(--rpg-border)] flex items-center justify-center">
                      <Lock size={16} color="var(--rpg-text-secondary)" />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {/* Zone Thumbnail */}
                  <div
                    className={`w-20 h-20 rounded-lg flex items-center justify-center text-4xl flex-shrink-0 ${
                      zone.isLocked ? 'bg-[var(--rpg-background)] grayscale opacity-50' : 'bg-[var(--rpg-background)]'
                    }`}
                  >
                    {zone.isLocked ? (
                      <Lock size={32} color="var(--rpg-text-secondary)" />
                    ) : zone.imageSrc ? (
                      <img
                        src={zone.imageSrc}
                        alt={zone.name}
                        className="w-16 h-16 object-contain image-rendering-pixelated"
                      />
                    ) : (
                      zone.icon ?? null
                    )}
                  </div>

                  {/* Zone Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-[var(--rpg-text-primary)]">
                        {zone.isLocked ? '???' : zone.name}
                        {zone.isCurrent && <span className="ml-2 text-xs text-[var(--rpg-gold)]">(Current)</span>}
                      </h3>
                    </div>

                    {!zone.isLocked && (
                      <>
                        <p className="text-xs text-[var(--rpg-text-secondary)] mb-2">{zone.description}</p>

                        <div className="flex items-center gap-4 text-xs">
                          {/* Difficulty Stars */}
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                size={12}
                                fill={idx < zone.difficulty ? 'var(--rpg-gold)' : 'none'}
                                color={idx < zone.difficulty ? 'var(--rpg-gold)' : 'var(--rpg-border)'}
                              />
                            ))}
                          </div>

                          {/* Travel Cost */}
                          <div className="flex items-center gap-1 text-[var(--rpg-gold)]">
                            <Hourglass size={12} />
                            <span>{zone.travelCost} turns</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </PixelCard>
            </button>
          );
        })}
      </div>

      {/* Travel Button */}
      {selectedZone && !selectedZone.isCurrent && !selectedZone.isLocked && (
        <PixelButton variant="gold" size="lg" className="w-full" onClick={() => onTravel(selectedZone.id)}>
          Travel to {selectedZone.name}
        </PixelButton>
      )}
    </div>
  );
}
