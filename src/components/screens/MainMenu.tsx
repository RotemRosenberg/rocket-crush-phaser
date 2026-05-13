import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { localLeaderboard } from '../../services/leaderboardService';
import { supabaseLeaderboard } from '../../services/supabaseLeaderboardService';
import AuthPanel from '../auth/AuthPanel';
import styles from './MainMenu.module.css';

export default function MainMenu() {
  const startGame = useGameStore(s => s.startGame);
  const { user, username } = useAuthStore();

  const [bestScore, setBestScore] = useState<number | null>(null);

  useEffect(() => {
    if (user && username) {
      supabaseLeaderboard.getPersonalBest().then(setBestScore);
    } else {
      localLeaderboard.getTopEntries(1).then(entries =>
        setBestScore(entries[0]?.score ?? null)
      );
    }
  }, [user, username]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>🚀 ROCKET CRUSH</h1>
        <p className={styles.subtitle}>Match rockets. Reach the stars.</p>

        {bestScore !== null && (
          <div className={styles.bestScore}>
            <span className={styles.bestLabel}>
              {user ? 'YOUR BEST' : 'BEST SCORE'}
            </span>
            <span className={styles.bestValue}>{bestScore.toLocaleString()}</span>
          </div>
        )}

        <AuthPanel />

        <button className={styles.playBtn} onClick={startGame}>
          PLAY
        </button>
      </div>
    </div>
  );
}
