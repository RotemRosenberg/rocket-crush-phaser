import PhaserGame from '../../phaser/PhaserGame';
import ScoreDisplay from '../hud/ScoreDisplay';
import MovesCounter from '../hud/MovesCounter';
import { useGameStore } from '../../store/gameStore';

export default function GameScreen() {
  const resetGame = useGameStore(s => s.resetGame);

  return (
    <div style={rootStyle}>
      <div style={hudStyle}>
        <button style={menuBtnStyle} onClick={resetGame}>
          ← MENU
        </button>
        <ScoreDisplay />
        <MovesCounter />
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
  padding: '10px 20px',
  flexShrink: 0,
  background: 'rgba(5, 5, 20, 0.85)',
  borderBottom: '1px solid rgba(100, 120, 200, 0.2)',
  backdropFilter: 'blur(4px)',
};

const menuBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: 'transparent',
  border: '1px solid rgba(91,143,255,0.35)',
  borderRadius: 5,
  color: '#7c85a2',
  fontSize: '0.78rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  cursor: 'pointer',
};

const canvasWrapStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
};
