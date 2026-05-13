import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function UsernameSetup() {
  const { needsUsername, saveUsername } = useAuthStore();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  if (!needsUsername) return null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError('');
    try {
      await saveUsername(trimmed);
    } catch (err) {
      const msg = err instanceof Error && err.message.includes('unique')
        ? 'That name is already taken. Try another.'
        : 'Could not save. Please try again.';
      setError(msg);
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>Pick your game name</h2>
        <p style={subtitleStyle}>This will appear on the global leaderboard</p>

        <input
          ref={inputRef}
          style={inputStyle}
          type="text"
          maxLength={20}
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
        />

        {error && <p style={errorStyle}>{error}</p>}

        <button
          style={saveBtnStyle}
          onClick={handleSave}
          disabled={!name.trim() || saving}
        >
          {saving ? 'Saving…' : 'CONFIRM'}
        </button>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,10,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  padding: '40px 48px',
  background: 'rgba(10,12,30,0.96)',
  border: '1.5px solid rgba(91,143,255,0.35)',
  borderRadius: 12,
  boxShadow: '0 0 40px rgba(91,143,255,0.15)',
  width: '100%',
  maxWidth: 360,
  boxSizing: 'border-box',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: '1.4rem',
  fontWeight: 800,
  color: '#e8eeff',
  letterSpacing: '0.06em',
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.82rem',
  color: '#7c85a2',
  letterSpacing: '0.04em',
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

const errorStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.8rem',
  color: '#ff7b7b',
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
};
