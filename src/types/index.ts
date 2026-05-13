// The 5 rocket/block colors on the board
export enum RocketType {
  RED = 'RED',
  BLUE = 'BLUE',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  PURPLE = 'PURPLE',
}

// A single cell on the grid — null type means the cell is empty
export interface Cell {
  type: RocketType | null;
  row: number;
  col: number;
}

// The full 8×8 board represented as a 2D array
export type Grid = Cell[][];

// A grid coordinate, used to target a specific cell
export interface Position {
  row: number;
  col: number;
}

// Describes a swap action: which cell the player moved FROM and TO
export interface SwapMove {
  from: Position;
  to: Position;
}

// All valid match shapes the engine can detect
export enum MatchShape {
  LINE3 = 'LINE3',
  LINE4 = 'LINE4',
  LINE5 = 'LINE5',
  SQUARE = 'SQUARE',
  T_SHAPE = 'T_SHAPE',
  L_SHAPE = 'L_SHAPE',
}

// The result of a detected match, including the power-clear zone.
export interface MatchResult {
  // ── Shape cells ────────────────────────────────────────────────────────────
  // The cells that physically formed the matching shape (e.g. the 4 ships in a row).
  matchCells: Position[];

  // ── Bonus clear zone ───────────────────────────────────────────────────────
  // Extra cells cleared by the power rule (e.g. the rest of the row for Line-4).
  // Kept separate so future tasks can animate them differently (missiles, etc.)
  bonusCells: Position[];

  // ── All cells ──────────────────────────────────────────────────────────────
  // Convenience union: matchCells + bonusCells, deduplicated.
  // Use this when you just need "everything to clear".
  cells: Position[];

  shape: MatchShape;
  score: number;
}

// Top-level state machine — controls which screen/mode is active
export enum GameState {
  MENU = 'MENU',
  PLANET_SELECT = 'PLANET_SELECT',
  PLAYING = 'PLAYING',
  ANIMATING = 'ANIMATING', // input is blocked while animations run
  GAME_OVER = 'GAME_OVER',
}

// A single saved entry in the leaderboard
export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string; // ISO date string, e.g. "2025-05-12"
}
