import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import './hud.css';

export default function ScoreDisplay() {
  const score         = useGameStore(s => s.score);
  const lastMatchScore = useGameStore(s => s.lastMatchScore);

  // animKey is used as a React key — incrementing it remounts the popup element,
  // which restarts the CSS animation even if lastMatchScore didn't change.
  const [animKey,  setAnimKey]  = useState(0);
  const [showPop,  setShowPop]  = useState(false);
  const prevScoreRef = useRef(0);

  useEffect(() => {
    if (score > prevScoreRef.current) {
      setShowPop(true);
      setAnimKey(k => k + 1);
      // Hide the element after the animation finishes (1 s)
      const t = setTimeout(() => setShowPop(false), 1050);
      prevScoreRef.current = score;
      return () => clearTimeout(t);
    }
    prevScoreRef.current = score;
  }, [score]);

  return (
    <div style={containerStyle}>
      <span style={labelStyle}>SCORE</span>
      <span style={valueStyle}>{score.toLocaleString()}</span>
      {/* key changes on every score increase, restarting the CSS animation */}
      {showPop && (
        <span key={animKey} className="score-popup">
          +{lastMatchScore}
        </span>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  minWidth: 110,
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  letterSpacing: '0.15em',
  color: '#7c85a2',
  textTransform: 'uppercase',
};

const valueStyle: React.CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 700,
  color: '#e8eaf6',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1,
};
