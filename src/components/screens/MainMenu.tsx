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
  [16, 83],   // Mercury  — bottom left
  [72, 65],   // Venus    — center right
  [18, 45],   // Earth    — center left
  [74, 24],   // Mars     — upper right
  [38,  6],   // Black Hole — top center
];

const SVG_POINTS = POSITIONS.map(([x, y]) => `${x},${y}`).join(' ');

// Waypoint dots along each segment (at 1/3 and 2/3)
const WAYPOINTS: { x: number; y: number }[] = (() => {
  const pts: { x: number; y: number }[] = [];
  for (let seg = 0; seg < POSITIONS.length - 1; seg++) {
    const [x1, y1] = POSITIONS[seg];
    const [x2, y2] = POSITIONS[seg + 1];
    for (const t of [1/3, 2/3]) {
      pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
    }
  }
  return pts;
})();

// Pre-compute stars along the Milky Way path — 3 depth tiers
interface MWStar { x: number; y: number; r: number; opacity: number; color: string; bright: boolean }
const MILKY_WAY_STARS: MWStar[] = (() => {
  const stars: MWStar[] = [];
  const dustColors  = ['#c4c8ff', '#d0ccff', '#b8c8ff', '#e0dcff'];
  const brightColors = ['#ffffff', '#eef4ff', '#fff8f0', '#d0e8ff'];

  for (let seg = 0; seg < POSITIONS.length - 1; seg++) {
    const [x1, y1] = POSITIONS[seg];
    const [x2, y2] = POSITIONS[seg + 1];
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len, ny = dx / len;

    // Dust: many tiny faint particles
    for (let j = 0; j < 55; j++) {
      const t = Math.random(), s = (Math.random() - 0.5) * 8;
      stars.push({
        x: x1 + dx * t + nx * s, y: y1 + dy * t + ny * s,
        r: Math.random() * 0.13 + 0.04,
        opacity: Math.random() * 0.25 + 0.08,
        color: dustColors[Math.floor(Math.random() * dustColors.length)],
        bright: false,
      });
    }
    // Mid: moderate stars, tighter band
    for (let j = 0; j < 18; j++) {
      const t = Math.random(), s = (Math.random() - 0.5) * 5;
      stars.push({
        x: x1 + dx * t + nx * s, y: y1 + dy * t + ny * s,
        r: Math.random() * 0.20 + 0.12,
        opacity: Math.random() * 0.30 + 0.30,
        color: dustColors[Math.floor(Math.random() * dustColors.length)],
        bright: false,
      });
    }
    // Bright: few larger glowing stars
    for (let j = 0; j < 5; j++) {
      const t = Math.random(), s = (Math.random() - 0.5) * 3;
      stars.push({
        x: x1 + dx * t + nx * s, y: y1 + dy * t + ny * s,
        r: Math.random() * 0.24 + 0.22,
        opacity: Math.random() * 0.30 + 0.60,
        color: brightColors[Math.floor(Math.random() * brightColors.length)],
        bright: true,
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
            <filter id="brightStar" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur stdDeviation="0.22" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="routeGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="0.35" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Dust + mid stars — no filter for performance */}
          {MILKY_WAY_STARS.filter(s => !s.bright).map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.color} opacity={s.opacity} />
          ))}

          {/* Bright stars with soft glow */}
          {MILKY_WAY_STARS.filter(s => s.bright).map((s, i) => (
            <circle key={`b${i}`} cx={s.x} cy={s.y} r={s.r} fill={s.color} opacity={s.opacity} filter="url(#brightStar)" />
          ))}

          {/* Route line — thin dashed, screen-space stroke so it stays crisp */}
          <polyline
            points={SVG_POINTS}
            fill="none"
            stroke="rgba(160,200,255,0.22)"
            strokeWidth="1"
            strokeDasharray="5 7"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            filter="url(#routeGlow)"
          />

          {/* Waypoint dots at 1/3 and 2/3 of each segment */}
          {WAYPOINTS.map((wp, i) => (
            <circle key={`wp${i}`} cx={wp.x} cy={wp.y} r="0.5" fill="rgba(160,200,255,0.35)" />
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
            top:  `calc(${ry}% - 25px)`,
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
