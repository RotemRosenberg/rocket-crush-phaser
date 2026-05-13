import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { GameState } from '../../types';
import { DIFFICULTIES, type DifficultyConfig } from '../../config/difficultyConfig';
import { localLeaderboard } from '../../services/leaderboardService';
import { supabaseLeaderboard } from '../../services/supabaseLeaderboardService';
import styles from './PlanetSelect.module.css';

export default function PlanetSelect() {
  const startGame    = useGameStore(s => s.startGame);
  const setGameState = useGameStore(s => s.setGameState);
  const { user, username } = useAuthStore();

  const [selected,   setSelected]   = useState<DifficultyConfig | null>(null);
  const [launching,  setLaunching]  = useState(false);
  const [rocketVars, setRocketVars] = useState<CSSProperties>({});
  const [bestScores, setBestScores] = useState<Record<string, number | null>>({});

  const rocketRef  = useRef<HTMLDivElement>(null);
  const planetRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load personal best for every planet
  useEffect(() => {
    const isLoggedIn = Boolean(user && username);
    const service    = isLoggedIn ? supabaseLeaderboard : localLeaderboard;

    DIFFICULTIES.forEach(d => {
      if (isLoggedIn) {
        (service as typeof supabaseLeaderboard).getPersonalBest(d.id).then(score => {
          setBestScores(prev => ({ ...prev, [d.id]: score }));
        });
      } else {
        localLeaderboard.getTopEntries(1, d.id).then(entries => {
          setBestScores(prev => ({ ...prev, [d.id]: entries[0]?.score ?? null }));
        });
      }
    });
  }, [user, username]);

  const launch = useCallback((config: DifficultyConfig, idx: number) => {
    if (launching) return;

    const planetEl = planetRefs.current[idx];
    const rocketEl = rocketRef.current;

    if (!planetEl || !rocketEl) {
      startGame(config);
      return;
    }

    const pRect = planetEl.getBoundingClientRect();
    const rRect = rocketEl.getBoundingClientRect();

    const tx = pRect.left + pRect.width  / 2 - (rRect.left + rRect.width  / 2);
    const ty = pRect.top  + pRect.height / 2 - (rRect.top  + rRect.height / 2);

    setRocketVars({ '--tx': `${tx}px`, '--ty': `${ty}px` } as CSSProperties);
    setLaunching(true);
  }, [launching, startGame]);

  const handlePlanetClick = (config: DifficultyConfig, idx: number) => {
    if (launching) return;
    if (selected?.id === config.id) {
      launch(config, idx);
    } else {
      setSelected(config);
    }
  };

  const handleLaunch = () => {
    if (!selected || launching) return;
    const idx = DIFFICULTIES.findIndex(d => d.id === selected.id);
    launch(selected, idx);
  };

  const handleAnimationEnd = () => {
    if (selected) startGame(selected);
  };

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => setGameState(GameState.MENU)}>
        ← BACK
      </button>

      <div className={styles.header}>
        <h2 className={styles.title}>CHOOSE YOUR MISSION</h2>
        <p className={styles.subtitle}>SELECT A PLANET TO BEGIN</p>
      </div>

      {/* ── Planet row ── */}
      <div className={styles.planets}>
        {DIFFICULTIES.map((config, idx) => {
          const size     = config.planetSize;
          const isSelected = selected?.id === config.id;
          const orbitSize  = size + 28;

          return (
            <div
              key={config.id}
              className={styles.planetWrap}
              onClick={() => handlePlanetClick(config, idx)}
            >
              <div className={styles.planetOuter} style={{ width: orbitSize, height: orbitSize }}>
                {/* Orbit ring */}
                <div
                  className={styles.orbit}
                  style={{ width: orbitSize, height: orbitSize }}
                />

                {/* Selection ring */}
                {isSelected && (
                  <div
                    className={styles.selRing}
                    style={{ width: size + 16, height: size + 16 }}
                  />
                )}

                {/* Planet */}
                <div
                  ref={el => { planetRefs.current[idx] = el; }}
                  className={`${styles.planet}${isSelected ? ` ${styles.selected}` : ''}`}
                  style={{
                    width:  size,
                    height: size,
                    background: `radial-gradient(circle at 35% 35%, ${config.gradient[0]}, ${config.gradient[1]})`,
                    '--glow': config.glowColor,
                    '--grad': `radial-gradient(circle at 35% 35%, ${config.gradient[0]}, ${config.gradient[1]})`,
                  } as CSSProperties}
                />
              </div>

              <span className={styles.planetName}>{config.label}</span>
              <span className={styles.diffLabel}>{config.difficulty}</span>
            </div>
          );
        })}
      </div>

      {/* ── Info panel ── */}
      <div className={styles.infoPanel}>
        {selected ? (
          <>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>MOVES</span>
                <span className={styles.statValue}>{selected.maxMoves}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statLabel}>COLORS</span>
                <span className={styles.statValue}>{selected.colorCount}</span>
              </div>
              {selected.timeLimit && (
                <div className={styles.stat}>
                  <span className={styles.statLabel}>TIME</span>
                  <span className={styles.statValue}>{selected.timeLimit}s</span>
                </div>
              )}
            </div>

            {bestScores[selected.id] !== null && bestScores[selected.id] !== undefined && (
              <span className={styles.bestScore}>
                Best: {bestScores[selected.id]!.toLocaleString()} pts
              </span>
            )}

            <button className={styles.launchBtn} onClick={handleLaunch}>
              🚀 LAUNCH
            </button>
          </>
        ) : (
          <p style={{ color: '#5b6a8f', fontSize: '0.82rem', letterSpacing: '0.1em' }}>
            TAP A PLANET TO SELECT
          </p>
        )}
      </div>

      {/* ── Rocket ── */}
      <div
        ref={rocketRef}
        className={`${styles.rocket}${launching ? ` ${styles.launching}` : ''}`}
        style={rocketVars}
        onAnimationEnd={handleAnimationEnd}
      >
        🚀
      </div>
    </div>
  );
}
