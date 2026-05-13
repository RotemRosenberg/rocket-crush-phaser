import type { CSSProperties } from 'react';
import { useGameStore } from '../../store/gameStore';

export default function TimerDisplay() {
  const timeRemaining = useGameStore(s => s.timeRemaining);

  if (timeRemaining === null) return null;

  const urgent = timeRemaining <= 10;
  const mins   = Math.floor(timeRemaining / 60);
  const secs   = timeRemaining % 60;
  const label  = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : `${secs}s`;

  return (
    <div style={{ ...wrapStyle, ...(urgent ? urgentStyle : {}) }}>
      <span style={labelStyle}>TIME</span>
      <span style={{ ...valueStyle, ...(urgent ? urgentValueStyle : {}) }}>
        {label}
      </span>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1,
  minWidth: 56,
  transition: 'color 0.3s',
};

const urgentStyle: CSSProperties = {
  animation: 'none',
};

const labelStyle: CSSProperties = {
  fontSize: '0.58rem',
  letterSpacing: '0.18em',
  color: '#5b6a8f',
  fontWeight: 600,
};

const valueStyle: CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  color: '#a0c4ff',
  letterSpacing: '0.04em',
  transition: 'color 0.3s',
};

const urgentValueStyle: CSSProperties = {
  color: '#ff5f5f',
  textShadow: '0 0 8px rgba(255,80,80,0.7)',
};
