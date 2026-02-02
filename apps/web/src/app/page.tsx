import { TURN_CONSTANTS } from '@adventure/shared';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Adventure RPG</h1>
        <p className={styles.description}>
          Turn-based async adventure awaits
        </p>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{TURN_CONSTANTS.REGEN_RATE}</span>
            <span className={styles.statLabel}>turn/sec</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {Math.floor(TURN_CONSTANTS.BANK_CAP / 3600)}h
            </span>
            <span className={styles.statLabel}>bank cap</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {Math.floor(TURN_CONSTANTS.STARTING_TURNS / 3600)}h
            </span>
            <span className={styles.statLabel}>start bonus</span>
          </div>
        </div>

        <div className={styles.actions}>
          <a href="/login" className={styles.button}>
            Login
          </a>
          <a href="/register" className={styles.buttonSecondary}>
            Register
          </a>
        </div>

        <p className={styles.footer}>
          Work in progress - MVP in development
        </p>
      </div>
    </main>
  );
}
