'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getTurns, getSkills } from '@/lib/api';
import styles from './page.module.css';

interface TurnData {
  currentTurns: number;
  timeToCapMs: number | null;
}

interface Skill {
  skillType: string;
  level: number;
  xp: number;
  dailyXpGained: number;
}

const SKILL_NAMES: Record<string, string> = {
  melee: 'Melee',
  ranged: 'Ranged',
  magic: 'Magic',
  defence: 'Defence',
  vitality: 'Vitality',
  evasion: 'Evasion',
  mining: 'Mining',
  weaponsmithing: 'Weaponsmithing',
};

function formatTurns(turns: number): string {
  const hours = Math.floor(turns / 3600);
  const minutes = Math.floor((turns % 3600) / 60);
  if (hours > 0) {
    return `${turns.toLocaleString()} (${hours}h ${minutes}m)`;
  }
  return `${turns.toLocaleString()} (${minutes}m)`;
}

function formatTimeToTap(ms: number | null): string {
  if (ms === null) return 'At cap';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m to cap`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { player, isLoading, isAuthenticated, logout } = useAuth();
  const [turns, setTurns] = useState<TurnData | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      // Refresh turns every 10 seconds
      const interval = setInterval(loadTurns, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoadingData(true);
    await Promise.all([loadTurns(), loadSkills()]);
    setLoadingData(false);
  };

  const loadTurns = async () => {
    const { data } = await getTurns();
    if (data) {
      setTurns({ currentTurns: data.currentTurns, timeToCapMs: data.timeToCapMs });
    }
  };

  const loadSkills = async () => {
    const { data } = await getSkills();
    if (data) {
      setSkills(data.skills);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (isLoading || loadingData) {
    return (
      <main className={styles.main}>
        <p>Loading...</p>
      </main>
    );
  }

  if (!player) return null;

  const combatSkills = skills.filter(s =>
    ['melee', 'ranged', 'magic', 'defence', 'vitality', 'evasion'].includes(s.skillType)
  );
  const otherSkills = skills.filter(s =>
    ['mining', 'weaponsmithing'].includes(s.skillType)
  );

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>Adventure RPG</h1>
        <div className={styles.userInfo}>
          <span>{player.username}</span>
          <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.turnsSection}>
          <h2>Turns</h2>
          {turns && (
            <div className={styles.turnsDisplay}>
              <span className={styles.turnsValue}>{formatTurns(turns.currentTurns)}</span>
              <span className={styles.turnsCapInfo}>{formatTimeToTap(turns.timeToCapMs)}</span>
            </div>
          )}
        </section>

        <section className={styles.skillsSection}>
          <h2>Combat Skills</h2>
          <div className={styles.skillsGrid}>
            {combatSkills.map(skill => (
              <div key={skill.skillType} className={styles.skillCard}>
                <span className={styles.skillName}>{SKILL_NAMES[skill.skillType]}</span>
                <span className={styles.skillLevel}>Lv. {skill.level}</span>
                <span className={styles.skillXp}>{skill.xp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.skillsSection}>
          <h2>Gathering & Crafting</h2>
          <div className={styles.skillsGrid}>
            {otherSkills.map(skill => (
              <div key={skill.skillType} className={styles.skillCard}>
                <span className={styles.skillName}>{SKILL_NAMES[skill.skillType]}</span>
                <span className={styles.skillLevel}>Lv. {skill.level}</span>
                <span className={styles.skillXp}>{skill.xp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.actionsSection}>
          <h2>Actions</h2>
          <div className={styles.actionButtons}>
            <button className={styles.actionBtn} disabled>Explore (Coming Soon)</button>
            <button className={styles.actionBtn} disabled>Mine (Coming Soon)</button>
            <button className={styles.actionBtn} disabled>Craft (Coming Soon)</button>
          </div>
        </section>
      </div>
    </main>
  );
}
