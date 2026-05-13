import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { GameState } from '../../types';
import AuthPanel from '../auth/AuthPanel';
import styles from './MainMenu.module.css';

export default function MainMenu() {
  const setGameState = useGameStore(s => s.setGameState);
  const { user } = useAuthStore();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>🚀 ROCKET CRUSH</h1>
        <p className={styles.subtitle}>Match rockets. Reach the stars.</p>

        <AuthPanel />

        <button
          className={styles.playBtn}
          onClick={() => setGameState(GameState.PLANET_SELECT)}
        >
          {user ? 'PLAY' : 'PLAY AS GUEST'}
        </button>
      </div>
    </div>
  );
}
