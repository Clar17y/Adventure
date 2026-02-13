'use client';

import { useEffect, useState } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import {
  getPvpRating,
  getPvpLadder,
  getPvpNotifications,
  getPvpHistory,
  scoutPvpOpponent,
  challengePvpOpponent,
  markPvpNotificationsRead,
  type PvpRatingResponse,
  type PvpLadderEntry,
  type PvpNotification,
  type PvpMatchResponse,
  type PvpScoutData,
  type PvpChallengeResponse,
} from '@/lib/api';
import { PVP_CONSTANTS } from '@adventure/shared';
import { Swords, Eye, Trophy, Bell, ChevronLeft, ChevronRight } from 'lucide-react';

interface ArenaScreenProps {
  characterLevel: number;
  busyAction: string | null;
  currentTurns: number;
  playerId: string | null;
  onTurnsChanged?: () => void;
  onNotificationsChanged?: () => void;
}

type ArenaView = 'ladder' | 'history' | 'notifications';

export function ArenaScreen({ characterLevel, busyAction, currentTurns, playerId, onTurnsChanged, onNotificationsChanged }: ArenaScreenProps) {
  const [rating, setRating] = useState<PvpRatingResponse | null>(null);
  const [ladder, setLadder] = useState<PvpLadderEntry[]>([]);
  const [notifications, setNotifications] = useState<PvpNotification[]>([]);
  const [history, setHistory] = useState<PvpMatchResponse[]>([]);
  const [historyPagination, setHistoryPagination] = useState<{ page: number; totalPages: number }>({ page: 1, totalPages: 1 });
  const [scoutData, setScoutData] = useState<Record<string, PvpScoutData>>({});
  const [challengeTarget, setChallengeTarget] = useState<string | null>(null);
  const [attackStyle, setAttackStyle] = useState<'melee' | 'ranged' | 'magic'>('melee');
  const [activeView, setActiveView] = useState<ArenaView>('ladder');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PvpChallengeResponse | null>(null);

  const meetsLevel = characterLevel >= PVP_CONSTANTS.MIN_CHARACTER_LEVEL;

  useEffect(() => {
    void loadArenaData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadArenaData() {
    setLoading(true);
    setError(null);
    try {
      const [ratingRes, ladderRes] = await Promise.all([
        getPvpRating(),
        getPvpLadder(),
      ]);
      if (ratingRes.data) setRating(ratingRes.data);
      if (ladderRes.data) {
        if (ladderRes.data.myRating) setRating(ladderRes.data.myRating);
        setLadder(ladderRes.data.opponents ?? []);
      }
    } catch {
      setError('Failed to load arena data');
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications() {
    try {
      const notifRes = await getPvpNotifications();
      if (notifRes.data) setNotifications(notifRes.data.notifications ?? []);
    } catch {
      // ignore
    }
  }

  async function loadHistory(page = 1) {
    setError(null);
    try {
      const res = await getPvpHistory(page);
      if (res.data) {
        setHistory(res.data.matches);
        setHistoryPagination({ page: res.data.pagination.page, totalPages: res.data.pagination.totalPages });
      } else if (res.error) {
        setError(res.error.message);
      }
    } catch {
      setError('Failed to load match history');
    }
  }

  async function handleScout(targetId: string) {
    if (actionBusy) return;
    setActionBusy('scout');
    setError(null);
    try {
      const result = await scoutPvpOpponent(targetId);
      if (result.data) {
        setScoutData((prev) => ({ ...prev, [targetId]: result.data! }));
      } else if (result.error) {
        setError(result.error.message);
      }
    } finally {
      setActionBusy(null);
      onTurnsChanged?.();
    }
  }

  async function handleChallenge(targetId: string) {
    if (actionBusy) return;
    setActionBusy('challenge');
    setError(null);
    setChallengeTarget(null);
    try {
      const result = await challengePvpOpponent(targetId, attackStyle);
      if (result.data) {
        setLastResult(result.data);
        await loadArenaData();
      } else if (result.error) {
        setError(result.error.message);
      }
    } finally {
      setActionBusy(null);
      onTurnsChanged?.();
      onNotificationsChanged?.();
    }
  }

  function handleViewChange(view: ArenaView) {
    setActiveView(view);
    setError(null);
    if (view === 'history' && history.length === 0) {
      void loadHistory(1);
    }
    if (view === 'notifications') {
      void loadNotifications().then(() => {
        // Mark all as read when user views the tab
        void markPvpNotificationsRead().then(() => {
          onNotificationsChanged?.();
        });
      });
    }
  }

  // Level gate
  const levelGate = !meetsLevel && (
    <PixelCard className="mb-4">
      <div className="text-center py-4">
        <Swords size={32} className="mx-auto mb-2 text-[var(--rpg-text-secondary)]" />
        <p className="text-[var(--rpg-text-primary)] font-semibold mb-1">
          Arena Locked
        </p>
        <p className="text-sm text-[var(--rpg-text-secondary)]">
          Reach character level {PVP_CONSTANTS.MIN_CHARACTER_LEVEL} to compete in the Arena.
        </p>
        <div className="mt-3 w-full bg-[var(--rpg-background)] rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-[var(--rpg-gold)] transition-all"
            style={{ width: `${Math.min(100, (characterLevel / PVP_CONSTANTS.MIN_CHARACTER_LEVEL) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-[var(--rpg-text-secondary)] mt-1">
          Level {characterLevel} / {PVP_CONSTANTS.MIN_CHARACTER_LEVEL}
        </p>
      </div>
    </PixelCard>
  );

  // Rating panel
  const ratingPanel = rating && (
    <PixelCard className="mb-4">
      <div className="flex items-center gap-3 mb-3">
        <Trophy size={24} className="text-[var(--rpg-gold)]" />
        <h2 className="text-lg font-bold text-[var(--rpg-text-primary)]">Your Rating</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--rpg-background)] rounded-lg p-2 text-center">
          <div className="text-xs text-[var(--rpg-text-secondary)]">Rating</div>
          <div className="text-lg font-bold text-[var(--rpg-gold)] font-mono">{rating.rating}</div>
        </div>
        <div className="bg-[var(--rpg-background)] rounded-lg p-2 text-center">
          <div className="text-xs text-[var(--rpg-text-secondary)]">Record</div>
          <div className="text-lg font-bold font-mono">
            <span className="text-[var(--rpg-green-light)]">{rating.wins}</span>
            <span className="text-[var(--rpg-text-secondary)]"> / </span>
            <span className="text-[var(--rpg-red)]">{rating.losses}</span>
          </div>
        </div>
        <div className="bg-[var(--rpg-background)] rounded-lg p-2 text-center">
          <div className="text-xs text-[var(--rpg-text-secondary)]">Win Streak</div>
          <div className="text-lg font-bold text-[var(--rpg-text-primary)] font-mono">{rating.winStreak}</div>
        </div>
        <div className="bg-[var(--rpg-background)] rounded-lg p-2 text-center">
          <div className="text-xs text-[var(--rpg-text-secondary)]">Best Rating</div>
          <div className="text-lg font-bold text-[var(--rpg-gold)] font-mono">{rating.bestRating}</div>
        </div>
      </div>
    </PixelCard>
  );

  // Challenge result
  const resultPanel = lastResult && (
    <PixelCard className="mb-4">
      <div className="text-center py-2">
        <div className={`text-xl font-bold mb-1 ${
          lastResult.winnerId === playerId ? 'text-[var(--rpg-green-light)]' : 'text-[var(--rpg-red)]'
        }`}>
          {lastResult.winnerId === playerId ? 'Victory!' : 'Defeat!'}
        </div>
        <p className="text-sm text-[var(--rpg-text-secondary)]">
          {lastResult.attackerName} vs {lastResult.defenderName}
        </p>
        <p className="text-sm font-mono mt-1">
          Rating:{' '}
          <span className={lastResult.attackerRatingChange >= 0 ? 'text-[var(--rpg-green-light)]' : 'text-[var(--rpg-red)]'}>
            {lastResult.attackerRatingChange >= 0 ? '+' : ''}{lastResult.attackerRatingChange}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setLastResult(null)}
          className="mt-2 text-xs text-[var(--rpg-text-secondary)] underline"
        >
          Dismiss
        </button>
      </div>
    </PixelCard>
  );

  // View tabs
  const viewTabs = (
    <div className="flex gap-2 mb-4">
      {([
        { id: 'ladder' as const, label: 'Ladder', icon: Swords },
        { id: 'history' as const, label: 'History', icon: Trophy },
        { id: 'notifications' as const, label: 'Alerts', icon: Bell, badge: notifications.length },
      ]).map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => handleViewChange(tab.id)}
          className={`relative px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeView === tab.id
              ? 'bg-[var(--rpg-gold)] text-[var(--rpg-background)]'
              : 'bg-[var(--rpg-surface)] text-[var(--rpg-text-secondary)]'
          }`}
        >
          <tab.icon size={14} />
          {tab.label}
          {tab.badge != null && tab.badge > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-[var(--rpg-red)] text-white font-bold">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  // Ladder view
  const ladderView = (
    <div className="space-y-2">
      {ladder.length === 0 && !loading && (
        <PixelCard>
          <p className="text-center text-[var(--rpg-text-secondary)] py-4">
            No opponents in your rating bracket. Keep playing to attract challengers!
          </p>
        </PixelCard>
      )}
      {ladder.map((opponent) => {
        const scouted = scoutData[opponent.playerId];
        const isChallengingThis = challengeTarget === opponent.playerId;
        return (
          <PixelCard key={opponent.playerId} padding="sm">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[var(--rpg-text-primary)] font-semibold truncate">
                  {opponent.username}
                </div>
                <div className="text-xs text-[var(--rpg-text-secondary)]">
                  Rating: {opponent.rating} | Lv.{opponent.characterLevel}
                </div>
                {scouted && (
                  <div className="text-xs text-[var(--rpg-blue-light)] mt-1">
                    Style: {scouted.attackStyle} | Armor: {scouted.armorClass} | Power: {scouted.powerRating}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                {!scouted && (
                  <PixelButton
                    variant="secondary"
                    size="sm"
                    disabled={!meetsLevel || !!actionBusy || !!busyAction || currentTurns < PVP_CONSTANTS.SCOUT_TURN_COST}
                    onClick={() => void handleScout(opponent.playerId)}
                    title={`Scout (${PVP_CONSTANTS.SCOUT_TURN_COST} turns)`}
                  >
                    <Eye size={14} className="inline mr-1" />
                    Scout
                  </PixelButton>
                )}
                {isChallengingThis ? (
                  <div className="flex items-center gap-1">
                    {(['melee', 'ranged', 'magic'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => {
                          setAttackStyle(style);
                          void handleChallenge(opponent.playerId);
                        }}
                        disabled={!!actionBusy}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                          actionBusy === 'challenge'
                            ? 'bg-[var(--rpg-border)] text-[var(--rpg-text-secondary)] cursor-not-allowed'
                            : 'bg-[var(--rpg-gold)] text-[var(--rpg-background)] hover:bg-[#e4b85b]'
                        }`}
                      >
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setChallengeTarget(null)}
                      className="px-1.5 py-1 rounded text-xs text-[var(--rpg-text-secondary)] hover:text-[var(--rpg-text-primary)]"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <PixelButton
                    variant="gold"
                    size="sm"
                    disabled={!meetsLevel || !!actionBusy || !!busyAction || currentTurns < PVP_CONSTANTS.CHALLENGE_TURN_COST}
                    onClick={() => setChallengeTarget(opponent.playerId)}
                    title={`Challenge (${PVP_CONSTANTS.CHALLENGE_TURN_COST} turns)`}
                  >
                    <Swords size={14} className="inline mr-1" />
                    Fight
                  </PixelButton>
                )}
              </div>
            </div>
          </PixelCard>
        );
      })}
    </div>
  );

  // History view
  const historyView = (
    <div className="space-y-2">
      {history.length === 0 && (
        <PixelCard>
          <p className="text-center text-[var(--rpg-text-secondary)] py-4">
            No match history yet. Challenge someone from the ladder!
          </p>
        </PixelCard>
      )}
      {history.map((match) => {
        const isAttacker = match.attackerId === playerId;
        const won = match.winnerId === playerId;
        const opponentName = isAttacker ? match.defenderName : match.attackerName;
        const ratingChange = isAttacker ? match.attackerRatingChange : match.defenderRatingChange;
        return (
          <PixelCard key={match.matchId} padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${won ? 'text-[var(--rpg-green-light)]' : 'text-[var(--rpg-red)]'}`}>
                    {won ? 'WIN' : 'LOSS'}
                  </span>
                  <span className="text-[var(--rpg-text-primary)]">vs {opponentName}</span>
                  {match.isRevenge && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--rpg-gold)]/20 text-[var(--rpg-gold)]">
                      Revenge
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--rpg-text-secondary)]">
                  {isAttacker ? 'Attacked' : 'Defended'} | {match.attackerStyle} vs {match.defenderStyle}
                  {' | '}{new Date(match.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className={`text-sm font-bold font-mono ${ratingChange >= 0 ? 'text-[var(--rpg-green-light)]' : 'text-[var(--rpg-red)]'}`}>
                {ratingChange >= 0 ? '+' : ''}{ratingChange}
              </div>
            </div>
          </PixelCard>
        );
      })}
      {historyPagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => void loadHistory(historyPagination.page - 1)}
            disabled={historyPagination.page <= 1}
            className="p-1.5 rounded text-[var(--rpg-text-secondary)] disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-[var(--rpg-text-secondary)]">
            {historyPagination.page} / {historyPagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() => void loadHistory(historyPagination.page + 1)}
            disabled={historyPagination.page >= historyPagination.totalPages}
            className="p-1.5 rounded text-[var(--rpg-text-secondary)] disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );

  // Notifications view
  const notificationsView = (
    <div className="space-y-2">
      {notifications.length === 0 && (
        <PixelCard>
          <p className="text-center text-[var(--rpg-text-secondary)] py-4">
            No new attack notifications.
          </p>
        </PixelCard>
      )}
      {notifications.map((notif) => {
        const won = notif.defenderRatingChange >= 0;
        return (
          <PixelCard key={notif.matchId} padding="sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${won ? 'text-[var(--rpg-green-light)]' : 'text-[var(--rpg-red)]'}`}>
                    {won ? 'DEFENDED' : 'LOST'}
                  </span>
                  <span className="text-[var(--rpg-text-primary)]">
                    Attacked by {notif.attackerName}
                  </span>
                  {notif.isRevenge && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--rpg-gold)]/20 text-[var(--rpg-gold)]">
                      Revenge
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--rpg-text-secondary)]">
                  {new Date(notif.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold font-mono ${notif.defenderRatingChange >= 0 ? 'text-[var(--rpg-green-light)]' : 'text-[var(--rpg-red)]'}`}>
                  {notif.defenderRatingChange >= 0 ? '+' : ''}{notif.defenderRatingChange}
                </span>
              </div>
            </div>
          </PixelCard>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {levelGate}
        <div className="text-center text-[var(--rpg-text-secondary)] py-8">Loading arena data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {levelGate}
      {ratingPanel}
      {resultPanel}

      {error && (
        <div className="p-3 rounded bg-[var(--rpg-background)] border border-[var(--rpg-red)] text-[var(--rpg-red)] text-sm">
          {error}
        </div>
      )}

      {viewTabs}

      {activeView === 'ladder' && ladderView}
      {activeView === 'history' && historyView}
      {activeView === 'notifications' && notificationsView}
    </div>
  );
}
