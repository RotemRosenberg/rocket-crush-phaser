import { useEffect } from 'react';
import AppRouter from './components/App';
import SpaceBackground from './components/SpaceBackground';
import UsernameSetup from './components/auth/UsernameSetup';
import { initListeners } from './store/gameStore';
import { useAuthStore } from './store/authStore';

export default function App() {
  const initAuth = useAuthStore(s => s.init);

  useEffect(() => {
    initListeners();
    initAuth();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SpaceBackground />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        <AppRouter />
      </div>
      <UsernameSetup />
    </div>
  );
}
