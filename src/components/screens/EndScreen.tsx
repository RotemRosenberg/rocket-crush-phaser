import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { LeaderboardEntry } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { localLeaderboard } from '../../services/leaderboardService';
import { supabaseLeaderboard } from '../../services/supabaseLeaderboardService';

export default function EndScreen() {
  const score             = useGameStore(s => s.score);
  const resetGame         = useGameStore(s => s.resetGame);
  const selectedDifficulty = useGameStore(s => s.selectedDifficulty);
  const { user, username } = useAuthStore();

  const diffId     = selectedDifficulty.id;
  const isLoggedIn = Boolean(user && username);
  const service    = isLoggedIn ? supabaseLeaderboard : localLeaderboard;

  const [name,    setName]    = useState('');
  const [saved,   setSaved]   = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoggedIn && username) {
      service.addEntry(username, score, diffId)
        .then(() => service.getTopEntries(10, diffId))
        .then(top => {
          setEntries(top);
          setSaved(true);
        });
    } else {
      inputRef.current?.focus();
    }
  }, []);

  const handleSave = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await service.addEntry(trimmed, score, diffId);
    setEntries(await service.getTopEntries(10, diffId));
    setSaved(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') handleSave();
  };

  const displayName = isLoggedIn ? (username ?? '') : name.trim();

  return (
    <div style={rootStyle}>
      <h1 style={titleStyle}>GAME OVER</h1>

      <div style={scoreBlockStyle}>
        <span style={scoreLabelStyle}>FINAL SCORE</span>
        <span style={scoreValueStyle}>{score.toLocaleString()}</span>
      </div>

      {!saved ? (
        <div style={inputSectionStyle}>
          <p style={promptStyle}>Enter your name to save your score</p>
          <input
            ref={inputRef}
            style={inputStyle}
            type="text"
            maxLength={20}
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            style={saveBtnStyle}
            onClick={handleSave}
            disabled={!name.trim()}
          >
            SAVE SCORE
          </button>
        </div>
      ) : (
        <div style={tableWrapStyle}>
          <p style={promptStyle}>
            {selectedDifficulty.label} Top 10 — {selectedDifficulty.difficulty}
          </p>
          <table style={tableStyle}>
            <thead>
              <tr>
                {['#', 'Name', 'Score', 'Date'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const isNew = isLoggedIn
                  ? entry.name === username
                  : entry.name === displayName && entry.score === score;
                return (
                  <tr key={i} style={isNew ? { ...trStyle, ...trHighlight } : trStyle}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{entry.name}</td>
                    <td style={{ ...tdStyle, ...tdScore }}>{entry.score.toLocaleString()}</td>
                    <td style={{ ...tdStyle, ...tdDate }}>{entry.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button style={playAgainBtnStyle} onClick={resetGame}>
        PLAY AGAIN
      </button>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const rootStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 28,
  width: '100%',
  height: '100%',
  /* No background — SpaceBackground in App.tsx fills behind this screen */
  color: '#e8eaf6',
  fontFamily: "system-ui, 'Segoe UI', sans-serif",
  padding: '32px 16px',
  boxSizing: 'border-box',
};

const titleStyle: CSSProperties = {
  fontSize: 'clamp(2rem, 6vw, 3.2rem)',
  fontWeight: 900,
  letterSpacing: '0.12em',
  color: '#e8eeff',
  textShadow: '0 0 20px rgba(110,170,255,0.6), 0 0 60px rgba(110,170,255,0.3)',
  margin: 0,
};

const scoreBlockStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
};

const scoreLabelStyle: CSSProperties = {
  fontSize: '0.7rem',
  letterSpacing: '0.2em',
  color: '#7c85a2',
};

const scoreValueStyle: CSSProperties = {
  fontSize: 'clamp(2.5rem, 8vw, 4rem)',
  fontWeight: 700,
  color: '#a0c4ff',
  fontVariantNumeric: 'tabular-nums',
  textShadow: '0 0 16px rgba(91,143,255,0.5)',
  lineHeight: 1,
};

const inputSectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  maxWidth: 340,
};

const promptStyle: CSSProperties = {
  fontSize: '0.85rem',
  color: '#7c85a2',
  letterSpacing: '0.06em',
  margin: 0,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 16px',
  background: 'rgba(91,143,255,0.07)',
  border: '1px solid rgba(91,143,255,0.4)',
  borderRadius: 6,
  color: '#e8eaf6',
  fontSize: '1rem',
  outline: 'none',
  textAlign: 'center',
  letterSpacing: '0.05em',
  boxSizing: 'border-box',
};

const saveBtnStyle: CSSProperties = {
  padding: '10px 36px',
  background: 'rgba(91,143,255,0.12)',
  border: '1.5px solid rgba(91,143,255,0.6)',
  borderRadius: 6,
  color: '#7db8ff',
  fontSize: '0.9rem',
  fontWeight: 700,
  letterSpacing: '0.15em',
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const tableWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  maxWidth: 460,
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.88rem',
};

const thStyle: CSSProperties = {
  padding: '8px 12px',
  color: '#7c85a2',
  fontWeight: 600,
  letterSpacing: '0.1em',
  borderBottom: '1px solid rgba(91,143,255,0.25)',
  textAlign: 'left',
};

const trStyle: CSSProperties = {
  borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const trHighlight: CSSProperties = {
  background: 'rgba(91,143,255,0.12)',
};

const tdStyle: CSSProperties = {
  padding: '8px 12px',
  color: '#c5cde8',
};

const tdScore: CSSProperties = {
  color: '#a0c4ff',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 600,
};

const tdDate: CSSProperties = {
  color: '#5b6a8f',
  fontSize: '0.8rem',
};

const playAgainBtnStyle: CSSProperties = {
  padding: '14px 50px',
  background: 'rgba(91,143,255,0.08)',
  border: '2px solid rgba(91,143,255,0.6)',
  borderRadius: 6,
  color: '#7db8ff',
  fontSize: '1.1rem',
  fontWeight: 700,
  letterSpacing: '0.2em',
  cursor: 'pointer',
  boxShadow: '0 0 14px rgba(91,143,255,0.4)',
  transition: 'transform 0.15s ease, background 0.2s ease',
};
