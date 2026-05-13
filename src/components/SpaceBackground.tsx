import type { CSSProperties } from 'react';
import styles from './SpaceBackground.module.css';

// Star positions are fixed for the session (computed once at module load time)
const STARS = Array.from({ length: 120 }, () => ({
  left:  `${(Math.random() * 100).toFixed(2)}%`,
  top:   `${(Math.random() * 100).toFixed(2)}%`,
  size:  `${(Math.random() * 2.2 + 0.8).toFixed(1)}px`,
  dur:   `${(Math.random() * 5 + 2).toFixed(1)}s`,
  delay: `${(Math.random() * 7).toFixed(1)}s`,
}));

// Full-screen fixed starfield — render once in App.tsx, visible behind every screen
export default function SpaceBackground() {
  return (
    <div className={styles.bg}>
      {STARS.map((s, i) => (
        <div
          key={i}
          className={styles.star}
          style={{
            left:   s.left,
            top:    s.top,
            width:  s.size,
            height: s.size,
            '--dur': s.dur,
            '--dly': s.delay,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
