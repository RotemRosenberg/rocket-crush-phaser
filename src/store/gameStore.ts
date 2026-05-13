import { create } from 'zustand';
import { GameState } from '../types';
import { MAX_MOVES } from '../config/constants';
import { eventBus, EVENTS } from '../bridge/EventBus';

interface GameStore {
  score: number;
  movesRemaining: number;
  gameState: GameState;
  lastMatchScore: number;

  addScore: (points: number) => void;
  decrementMoves: () => void;
  setGameState: (state: GameState) => void;

  // Reset state and return to the Main Menu (used by "Play Again" on EndScreen)
  resetGame: () => void;

  // Reset state and jump straight into a game (used by "Play" on MainMenu)
  startGame: () => void;
}

const INITIAL = {
  score: 0,
  movesRemaining: MAX_MOVES,
  lastMatchScore: 0,
};

export const useGameStore = create<GameStore>((set) => ({
  ...INITIAL,
  gameState: GameState.MENU,

  addScore: (points) =>
    set((state) => ({ score: state.score + points, lastMatchScore: points })),

  decrementMoves: () =>
    set((state) => {
      const movesRemaining = Math.max(0, state.movesRemaining - 1);
      return {
        movesRemaining,
        gameState: movesRemaining === 0 ? GameState.GAME_OVER : state.gameState,
      };
    }),

  setGameState: (gameState) => set({ gameState }),

  // Go back to the menu with a clean slate — MainMenu will show fresh best score
  resetGame: () => set({ ...INITIAL, gameState: GameState.MENU }),

  // Fresh state + skip the menu and go straight to the game
  startGame: () => set({ ...INITIAL, gameState: GameState.PLAYING }),
}));

// ── EventBus wiring ──────────────────────────────────────────────────────────

let initialized = false;

export function initListeners(): void {
  if (initialized) return;
  initialized = true;

  eventBus.on(EVENTS.SCORE_UPDATE, (points: number) => {
    useGameStore.getState().addScore(points);
  });

  eventBus.on(EVENTS.MOVES_UPDATE, () => {
    useGameStore.getState().decrementMoves();
  });

  eventBus.on(EVENTS.GAME_OVER, () => {
    useGameStore.getState().setGameState(GameState.GAME_OVER);
  });
}
