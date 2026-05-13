import { useGameStore } from '../store/gameStore';
import { GameState } from '../types';
import MainMenu from './screens/MainMenu';
import GameScreen from './screens/GameScreen';
import EndScreen from './screens/EndScreen';

export default function AppRouter() {
  const gameState = useGameStore(s => s.gameState);

  switch (gameState) {
    case GameState.MENU:
      return <MainMenu />;

    case GameState.PLAYING:
    case GameState.ANIMATING:
      return <GameScreen />;

    case GameState.GAME_OVER:
      return <EndScreen />;

    default:
      return <MainMenu />;
  }
}
