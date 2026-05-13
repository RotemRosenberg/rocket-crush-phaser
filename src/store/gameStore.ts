import { create } from 'zustand';
import { GameState } from '../types';
import { eventBus, EVENTS } from '../bridge/EventBus';
import { type DifficultyConfig, DEFAULT_DIFFICULTY } from '../config/difficultyConfig';

interface GameStore {
  score: number;
  movesRemaining: number;
  timeRemaining: number | null;
  gameState: GameState;
  lastMatchScore: number;
  selectedDifficulty: DifficultyConfig;

  addScore: (points: number) => void;
  decrementMoves: () => void;
  setTimeRemaining: (t: number) => void;
  setGameState: (state: GameState) => void;
  startGame: (config?: DifficultyConfig) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  score: 0,
  movesRemaining: DEFAULT_DIFFICULTY.maxMoves,
  timeRemaining: null,
  lastMatchScore: 0,
  gameState: GameState.MENU,
  selectedDifficulty: DEFAULT_DIFFICULTY,

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

  setTimeRemaining: (t) => set({ timeRemaining: t }),

  setGameState: (gameState) => set({ gameState }),

  startGame: (config = DEFAULT_DIFFICULTY) =>
    set({
      score: 0,
      lastMatchScore: 0,
      movesRemaining: config.maxMoves,
      timeRemaining: config.timeLimit,
      selectedDifficulty: config,
      gameState: GameState.PLAYING,
    }),

  // Play Again returns to planet select so the player can choose again
  resetGame: () =>
    set({
      score: 0,
      lastMatchScore: 0,
      movesRemaining: DEFAULT_DIFFICULTY.maxMoves,
      timeRemaining: null,
      gameState: GameState.PLANET_SELECT,
    }),
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

  eventBus.on(EVENTS.TIME_UPDATE, (remaining: number) => {
    useGameStore.getState().setTimeRemaining(remaining);
  });
}
