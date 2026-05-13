import type { CSSProperties } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function AuthPanel() {
  const { user, username, isLoading, signInWithGoogle, signOut } = useAuthStore();

  if (isLoading) return null;

  if (user && username) {
    return (
      <div style={rowStyle}>
        <span style={nameStyle}>👤 {username}</span>
        <button style={outBtnStyle} onClick={signOut}>Sign out</button>
      </div>
    );
  }

  return (
    <button style={googleBtnStyle} onClick={signInWithGoogle}>
      Sign in with Google
    </button>
  );
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const nameStyle: CSSProperties = {
  color: '#a0c4ff',
  fontSize: '0.95rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
};

const outBtnStyle: CSSProperties = {
  padding: '6px 16px',
  background: 'transparent',
  border: '1px solid rgba(91,143,255,0.4)',
  borderRadius: 5,
  color: '#7c85a2',
  fontSize: '0.8rem',
  cursor: 'pointer',
  letterSpacing: '0.06em',
};

const googleBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 24px',
  background: 'rgba(255,255,255,0.06)',
  border: '1.5px solid rgba(255,255,255,0.2)',
  borderRadius: 6,
  color: '#e8eaf6',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
  letterSpacing: '0.05em',
  transition: 'background 0.2s',
};
