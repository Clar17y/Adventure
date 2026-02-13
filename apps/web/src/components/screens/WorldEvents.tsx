'use client';

import { useState, useEffect, useCallback } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import {
  getActiveEvents,
  getActiveBossEncounters,
  type WorldEventResponse,
  type BossEncounterResponse,
} from '@/lib/api';

function formatTimeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return 'Permanent';
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return 'Expired';
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function effectLabel(effectType: string): string {
  const labels: Record<string, string> = {
    damage_up: 'Mob Damage +',
    damage_down: 'Mob Damage -',
    hp_up: 'Mob HP +',
    hp_down: 'Mob HP -',
    spawn_rate_up: 'Mob Spawns +',
    spawn_rate_down: 'Mob Spawns -',
    drop_rate_up: 'Drop Rate +',
    yield_up: 'Yield +',
  };
  return labels[effectType] ?? effectType;
}

function eventTypeColor(type: string): string {
  if (type === 'resource') return 'var(--rpg-green-light)';
  if (type === 'boss') return 'var(--rpg-red)';
  return 'var(--rpg-gold)';
}

interface WorldEventsProps {
  onNavigate: (screen: string) => void;
}

export function WorldEvents({ onNavigate }: WorldEventsProps) {
  const [events, setEvents] = useState<WorldEventResponse[]>([]);
  const [bosses, setBosses] = useState<BossEncounterResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [eventsRes, bossRes] = await Promise.all([
      getActiveEvents(),
      getActiveBossEncounters(),
    ]);
    if (eventsRes.data) setEvents(eventsRes.data.events);
    if (bossRes.data) setBosses(bossRes.data.encounters);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: 'var(--rpg-gold)' }}>
          World Events
        </h2>
        <PixelButton onClick={refresh} disabled={loading} size="sm">
          {loading ? 'Loading...' : 'Refresh'}
        </PixelButton>
      </div>

      {/* Boss Encounters */}
      {bosses.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--rpg-red)' }}>
            Active Boss Encounters
          </h3>
          {bosses.map((boss) => (
            <PixelCard key={boss.id} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold" style={{ color: 'var(--rpg-red)' }}>
                  {boss.mobName} (Lv.{boss.mobLevel})
                </span>
                <span className="text-xs opacity-70">
                  {boss.zoneName ?? 'Unknown Zone'}
                </span>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>HP</span>
                  <span>{boss.currentHp} / {boss.maxHp}</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, (boss.currentHp / boss.maxHp) * 100))}%`,
                      background: 'var(--rpg-red)',
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span>Round {boss.roundNumber} — {boss.status}</span>
                {boss.nextRoundAt && (
                  <span>Next round: {formatTimeRemaining(boss.nextRoundAt)}</span>
                )}
              </div>
            </PixelCard>
          ))}
        </div>
      )}

      {/* Active Events */}
      {events.length === 0 && bosses.length === 0 && !loading && (
        <PixelCard className="p-4 text-center opacity-70">
          No active world events right now. Explore to discover them!
        </PixelCard>
      )}

      {events.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--rpg-gold)' }}>
            Zone Events
          </h3>
          {events.map((event) => (
            <PixelCard key={event.id} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold" style={{ color: eventTypeColor(event.type) }}>
                  {event.title}
                </span>
                <span className="text-xs" style={{ color: eventTypeColor(event.type) }}>
                  {event.type.toUpperCase()}
                </span>
              </div>
              <p className="text-xs opacity-80 mb-2">{event.description}</p>
              <div className="flex justify-between text-xs">
                <span>
                  {effectLabel(event.effectType)} {Math.round(event.effectValue * 100)}%
                </span>
                <span className="opacity-70">
                  {formatTimeRemaining(event.expiresAt)}
                </span>
              </div>
            </PixelCard>
          ))}
        </div>
      )}
    </div>
  );
}
