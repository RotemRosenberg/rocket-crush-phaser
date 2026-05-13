import PhaserGame from '../../phaser/PhaserGame';
import ScoreDisplay from '../hud/ScoreDisplay';
import MovesCounter from '../hud/MovesCounter';
import TimerDisplay from '../hud/TimerDisplay';
import { useGameStore } from '../../store/gameStore';

export default function GameScreen() {
  const resetGame          = useGameStore(s => s.resetGame);
  const selectedDifficulty = useGameStore(s => s.selectedDifficulty);

  return (
    <div style={rootStyle}>
      <div style={hudStyle}>
        <button style={menuBtnStyle} onClick={resetGame}>← MENU</button>

        <div style={centerStyle}>
          <span style={planetLabelStyle}>{selectedDifficulty.label}</span>
          <span style={diffLabelStyle}>{selectedDifficulty.difficulty}</span>
        </div>

        <div style={rightGroupStyle}>
          <TimerDisplay />
          <ScoreDisplay />
          <MovesCounter />
        </div>
      </div>

      <div style={canvasWrapStyle}>
        <PhaserGame />
      </div>
    </div>
  );
}

const rootStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
};

const hudStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 16px',
  flexShrink: 0,
  background: 'rgba(5, 5, 20, 0.90)',
  borderBottom: '1px solid rgba(100, 120, 200, 0.2)',
  backdropFilter: 'blur(4px)',
};

const menuBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: 'transparent',
  border: '1px solid rgba(91,143,255,0.3)',
  borderRadius: 5,
  color: '#7c85a2',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  cursor: 'pointer',
  flexShrink: 0,
};

const centerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 1,
};

const planetLabelStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 700,
  color: '#c5d8ff',
  letterSpacing: '0.08em',
};

const diffLabelStyle: React.CSSProperties = {
  fontSize: '0.58rem',
  color: '#5b6a8f',
  letterSpacing: '0.16em',
  fontWeight: 600,
};

const rightGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  flexShrink: 0,
};

const canvasWrapStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
};
