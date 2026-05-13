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

// Pre-compute Milky Way stars scattered along the path (computed once at module load)
interface MWStar { x: number; y: number; r: number; opacity: number; color: string }
const MILKY_WAY_STARS: MWStar[] = (() => {
  const stars: MWStar[] = [];
  const colors = ['#ffffff', '#d0e8ff', '#c4b8ff', '#b8d4ff', '#ffd8f0', '#ffffff', '#ffffff'];

  for (let seg = 0; seg < POSITIONS.length - 1; seg++) {
    const [x1, y1] = POSITIONS[seg];
    const [x2, y2] = POSITIONS[seg + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Perpendicular direction for scatter
    const nx = -dy / len;
    const ny =  dx / len;

    for (let j = 0; j < 80; j++) {
      const t       = Math.random();
      const scatter = (Math.random() - 0.5) * 8; // width of the band
      stars.push({
        x:       x1 + dx * t + nx * scatter,
        y:       y1 + dy * t + ny * scatter,
        r:       Math.random() * 0.55 + 0.08,
        opacity: Math.random() * 0.75 + 0.1,
        color:   colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }
  return stars;
})();

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

        {/* Milky Way path */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className={styles.pathSvg}
        >
          <defs>
            <filter id="mwGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="1.4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Nebula glow — wide purple/violet outer band */}
          <polyline points={SVG_POINTS} fill="none" stroke="rgba(120,80,200,0.07)"  strokeWidth="14" strokeLinecap="round" />
          {/* Blue mid band */}
          <polyline points={SVG_POINTS} fill="none" stroke="rgba(80,130,220,0.09)"  strokeWidth="8"  strokeLinecap="round" />
          {/* White-blue inner band */}
          <polyline points={SVG_POINTS} fill="none" stroke="rgba(180,210,255,0.07)" strokeWidth="4"  strokeLinecap="round" />

          {/* Milky Way stars scattered along the band */}
          {MILKY_WAY_STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.x} cy={s.y} r={s.r}
              fill={s.color}
              opacity={s.opacity}
            />
          ))}

          {/* Bright core thread */}
          <polyline
            points={SVG_POINTS}
            fill="none"
            stroke="rgba(220,235,255,0.28)"
            strokeWidth="0.4"
            filter="url(#mwGlow)"
          />
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
