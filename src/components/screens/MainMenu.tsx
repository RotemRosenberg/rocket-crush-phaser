import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { DIFFICULTIES, type DifficultyConfig } from '../../config/difficultyConfig';
import { localLeaderboard } from '../../services/leaderboardService';
import { supabaseLeaderboard } from '../../services/supabaseLeaderboardService';
import AuthPanel from '../auth/AuthPanel';
import styles from './MainMenu.module.css';

// Planet positions as [x%, y%] inside the map area — zigzag from bottom to top
const POSITIONS: [number, number][] = [
  [18, 80],   // Mercury  — bottom left
  [66, 63],   // Venus    — center right
  [22, 46],   // Earth    — center left
  [68, 28],   // Mars     — upper right
  [38,  8],   // Black Hole — top center
];

const SVG_POINTS = POSITIONS.map(([x, y]) => `${x},${y}`).join(' ');

export default function MainMenu() {
  const startGame = useGameStore(s => s.startGame);
  const { user, username } = useAuthStore();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [bestScores,  setBestScores]  = useState<Record<string, number | null>>({});
  const [launching,   setLaunching]   = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos,    setDragPos]    = useState<[number, number] | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const selected = DIFFICULTIES[selectedIdx];

  // Load personal bests for every planet
  useEffect(() => {
    const isLoggedIn = Boolean(user && username);
    DIFFICULTIES.forEach(d => {
      if (isLoggedIn) {
        supabaseLeaderboard.getPersonalBest(d.id).then(score =>
          setBestScores(prev => ({ ...prev, [d.id]: score }))
        );
      } else {
        localLeaderboard.getTopEntries(1, d.id).then(entries =>
          setBestScores(prev => ({ ...prev, [d.id]: entries[0]?.score ?? null }))
        );
      }
    });
  }, [user, username]);

  // ── Rocket drag ──────────────────────────────────────────────────────────

  const handleRocketPointerDown = (e: React.PointerEvent) => {
    if (launching) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handleRocketPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragPos([
      ((e.clientX - rect.left) / rect.width)  * 100,
      ((e.clientY - rect.top)  / rect.height) * 100,
    ]);
  };

  const handleRocketPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) { setDragPos(null); return; }

    const dropX = ((e.clientX - rect.left) / rect.width)  * 100;
    const dropY = ((e.clientY - rect.top)  / rect.height) * 100;

    // Snap to closest planet
    let closestIdx = selectedIdx;
    let closestDist = Infinity;
    POSITIONS.forEach(([px, py], idx) => {
      const dist = Math.sqrt((px - dropX) ** 2 + (py - dropY) ** 2);
      if (dist < closestDist) { closestDist = dist; closestIdx = idx; }
    });

    setSelectedIdx(closestIdx);
    setDragPos(null);
  };

  // ── Planet click ─────────────────────────────────────────────────────────

  const handlePlanetClick = (idx: number) => {
    if (launching || isDragging) return;
    setSelectedIdx(idx);
  };

  // ── Launch ───────────────────────────────────────────────────────────────

  const handleLaunch = () => {
    if (launching) return;
    setLaunching(true);
    setTimeout(() => startGame(selected), 500);
  };

  // Rocket visual position
  const [rx, ry] = isDragging && dragPos ? dragPos : POSITIONS[selectedIdx];

  return (
    <div className={styles.container}>

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.title}>🚀 ROCKET CRUSH</h1>
          <p className={styles.subtitle}>CHOOSE YOUR MISSION</p>
        </div>
        <AuthPanel />
      </div>

      {/* ── Planet map ────────────────────────────────────────────────── */}
      <div className={styles.mapArea} ref={mapRef}>

        {/* SVG connecting path */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className={styles.pathSvg}
        >
          <defs>
            <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Wide soft glow */}
          <polyline
            points={SVG_POINTS}
            fill="none"
            stroke="rgba(91,143,255,0.12)"
            strokeWidth="2.5"
            filter="url(#lineGlow)"
          />
          {/* Solid core line */}
          <polyline
            points={SVG_POINTS}
            fill="none"
            stroke="rgba(160,196,255,0.55)"
            strokeWidth="0.5"
          />
          {/* Dashed overlay for depth */}
          <polyline
            points={SVG_POINTS}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="0.3"
            strokeDasharray="1,3"
          />
          {/* Waypoint dots at each planet */}
          {POSITIONS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="0.7" fill="rgba(160,196,255,0.5)" />
          ))}
        </svg>

        {/* Planets */}
        {DIFFICULTIES.map((config, idx) => {
          const [px, py] = POSITIONS[idx];
          const sz = config.planetSize;
          const isSelected = idx === selectedIdx;

          return (
            <div
              key={config.id}
              className={styles.planetNode}
              style={{ left: `${px}%`, top: `${py}%` }}
              onClick={() => handlePlanetClick(idx)}
            >
              {/* Planet sphere */}
              <div
                className={styles.planet}
                style={{
                  width:  sz,
                  height: sz,
                  background: `radial-gradient(circle at 35% 35%, ${config.gradient[0]}, ${config.gradient[1]})`,
                  boxShadow: isSelected
                    ? `0 0 22px 6px ${config.glowColor}, 0 0 50px 10px ${config.glowColor}`
                    : `0 0 10px 2px ${config.glowColor}`,
                } as CSSProperties}
              />

              {/* Labels */}
              <span className={styles.planetName}>{config.label}</span>
              <span className={styles.diffName}>{config.difficulty}</span>

              {/* Personal best badge */}
              {bestScores[config.id] != null && (
                <span className={styles.bestBadge}>
                  ⭐ {bestScores[config.id]!.toLocaleString()}
                </span>
              )}
            </div>
          );
        })}

        {/* Rocket — draggable, snaps between planets */}
        <div
          className={`${styles.rocket}${launching ? ` ${styles.rocketLaunch}` : ''}`}
          style={{
            left: `${rx}%`,
            top:  `${ry}%`,
            transition: isDragging
              ? 'none'
              : 'left 0.65s cubic-bezier(0.34,1.56,0.64,1), top 0.65s cubic-bezier(0.34,1.56,0.64,1)',
            cursor: isDragging ? 'grabbing' : 'grab',
          } as CSSProperties}
          onPointerDown={handleRocketPointerDown}
          onPointerMove={handleRocketPointerMove}
          onPointerUp={handleRocketPointerUp}
        >
          🚀
        </div>
      </div>

      {/* ── Info panel ────────────────────────────────────────────────── */}
      <div className={styles.infoPanel}>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>PLANET</span>
            <span className={styles.statValue}>{selected.label}</span>
          </div>
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

        <button
          className={`${styles.launchBtn}${launching ? ` ${styles.launching}` : ''}`}
          onClick={handleLaunch}
          disabled={launching}
        >
          {launching ? 'LAUNCHING…' : `🚀 LAUNCH TO ${selected.label.toUpperCase()}`}
        </button>
      </div>

    </div>
  );
}
