'use client';

import { useState, useEffect, useCallback } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import {
  getBossEncounter,
  signUpForBoss,
  type BossEncounterResponse,
  type BossParticipantResponse,
} from '@/lib/api';

interface BossEncounterPanelProps {
  encounterId: string;
  onClose?: () => void;
}

export function BossEncounterPanel({ encounterId, onClose }: BossEncounterPanelProps) {
  const [encounter, setEncounter] = useState<BossEncounterResponse | null>(null);
  const [participants, setParticipants] = useState<BossParticipantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [role, setRole] = useState<'attacker' | 'healer'>('attacker');
  const [turns, setTurns] = useState(100);
  const [signupError, setSignupError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await getBossEncounter(encounterId);
    if (res.data) {
      setEncounter(res.data.encounter);
      setParticipants(res.data.participants);
    }
    setLoading(false);
  }, [encounterId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleSignup() {
    setSigning(true);
    setSignupError('');
    const res = await signUpForBoss(encounterId, role, turns);
    if (res.error) {
      setSignupError(res.error.message);
    } else {
      await refresh();
    }
    setSigning(false);
  }

  if (loading) {
    return <PixelCard className="p-4 text-center">Loading boss encounter...</PixelCard>;
  }

  if (!encounter) {
    return <PixelCard className="p-4 text-center">Boss encounter not found.</PixelCard>;
  }

  const hpPercent = Math.max(0, Math.min(100, (encounter.currentHp / encounter.maxHp) * 100));
  const isOver = encounter.status === 'defeated' || encounter.status === 'expired';

  return (
    <PixelCard className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg" style={{ color: 'var(--rpg-red)' }}>
          {encounter.mobName} (Lv.{encounter.mobLevel})
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-xs opacity-70 hover:opacity-100">
            Close
          </button>
        )}
      </div>

      {/* HP Bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span>Boss HP</span>
          <span>{encounter.currentHp.toLocaleString()} / {encounter.maxHp.toLocaleString()}</span>
        </div>
        <div className="w-full h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${hpPercent}%`,
              background: hpPercent > 50 ? 'var(--rpg-red)' : hpPercent > 25 ? 'var(--rpg-gold)' : '#ff4444',
            }}
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex justify-between text-xs">
        <span>
          Round {encounter.roundNumber} — {encounter.status}
        </span>
        {encounter.nextRoundAt && !isOver && (
          <span>
            Next round at {new Date(encounter.nextRoundAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Signup */}
      {!isOver && (
        <div className="space-y-2 border-t border-white/10 pt-3">
          <p className="text-sm font-semibold">Sign up for next round</p>
          <div className="flex gap-2">
            <PixelButton
              size="sm"
              variant={role === 'attacker' ? 'primary' : 'secondary'}
              onClick={() => setRole('attacker')}
            >
              Attacker
            </PixelButton>
            <PixelButton
              size="sm"
              variant={role === 'healer' ? 'primary' : 'secondary'}
              onClick={() => setRole('healer')}
            >
              Healer
            </PixelButton>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs">Turns:</label>
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={turns}
              onChange={(e) => setTurns(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs w-12 text-right">{turns}</span>
          </div>
          <PixelButton onClick={handleSignup} disabled={signing} size="sm">
            {signing ? 'Signing up...' : `Sign Up (${turns} turns)`}
          </PixelButton>
          {signupError && (
            <p className="text-xs" style={{ color: 'var(--rpg-red)' }}>{signupError}</p>
          )}
        </div>
      )}

      {/* Participant list */}
      {participants.length > 0 && (
        <div className="border-t border-white/10 pt-3">
          <p className="text-sm font-semibold mb-2">
            Participants ({participants.length})
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {participants.slice(-20).map((p) => (
              <div key={p.id} className="flex justify-between text-xs">
                <span className="truncate">
                  {p.role === 'healer' ? '💚' : '⚔'} {p.playerId.slice(0, 8)}...
                </span>
                <span>
                  {p.role === 'healer'
                    ? `${p.totalHealing} healed`
                    : `${p.totalDamage} dmg`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Defeated */}
      {encounter.status === 'defeated' && (
        <div className="text-center p-2 rounded" style={{ background: 'rgba(76,175,80,0.2)' }}>
          <span className="font-bold" style={{ color: 'var(--rpg-green-light)' }}>
            Boss Defeated!
          </span>
        </div>
      )}
    </PixelCard>
  );
}
