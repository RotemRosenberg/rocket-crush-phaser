import type { CSSProperties } from 'react';
import styles from './SpaceBackground.module.css';

// Three depth layers — far stars are small/dim/slow, near stars are large/bright/fast
const FAR   = Array.from({ length: 70 }, () => makestar(0.6, 1.1, 5, 9, 0.04, 0.18));
const MID   = Array.from({ length: 55 }, () => makestar(1.0, 1.8, 3, 6, 0.12, 0.35));
const NEAR  = Array.from({ length: 30 }, () => makestar(1.6, 3.0, 2, 4, 0.25, 0.60));
const SHOOT = Array.from({ length: 4  }, (_, i) => ({
  top:   `${10 + i * 18}%`,
  delay: `${4 + i * 7}s`,
  dur:   `${1.0 + i * 0.3}s`,
}));

function makestar(minSz: number, maxSz: number, minD: number, maxD: number, minA: number, maxA: number) {
  return {
    left:  `${(Math.random() * 100).toFixed(2)}%`,
    top:   `${(Math.random() * 100).toFixed(2)}%`,
    size:  `${(minSz + Math.random() * (maxSz - minSz)).toFixed(1)}px`,
    dur:   `${(minD  + Math.random() * (maxD  - minD )).toFixed(1)}s`,
    delay: `${(Math.random() * 8).toFixed(1)}s`,
    alpha: `${(minA  + Math.random() * (maxA  - minA )).toFixed(2)}`,
    blue:  Math.random() < 0.2,
  };
}

export default function SpaceBackground() {
  return (
    <div className={styles.bg}>
      {[...FAR, ...MID, ...NEAR].map((s, i) => (
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
            '--alpha': s.alpha,
            background: s.blue ? '#b8d8ff' : '#ffffff',
          } as CSSProperties}
        />
      ))}

      {SHOOT.map((s, i) => (
        <div
          key={`shoot-${i}`}
          className={styles.shootingStar}
          style={{ '--shoot-top': s.top, '--shoot-delay': s.delay, '--shoot-dur': s.dur } as CSSProperties}
        />
      ))}
    </div>
  );
}
