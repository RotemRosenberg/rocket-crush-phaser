import { useGameStore } from '../../store/gameStore';

// The number of moves at which the counter switches to "danger" red
const LOW_MOVES_THRESHOLD = 5;

export default function MovesCounter() {
  const movesRemaining = useGameStore(s => s.movesRemaining);
  const isLow = movesRemaining <= LOW_MOVES_THRESHOLD;

  return (
    <div style={containerStyle}>
      <span style={labelStyle}>MOVES</span>
      <span style={{ ...valueStyle, color: isLow ? '#e74c3c' : '#e8eaf6' }}>
        {movesRemaining}
      </span>
      {isLow && movesRemaining > 0 && (
        <span style={warningStyle}>!</span>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
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
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1,
  transition: 'color 0.4s ease',
};

const warningStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: -16,
  color: '#e74c3c',
  fontSize: '1rem',
  fontWeight: 900,
  animation: 'none',
};
