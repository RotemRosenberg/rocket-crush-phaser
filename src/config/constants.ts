import { MatchShape } from '../types';

// Number of rows on the game board
export const GRID_ROWS = 8;

// Number of columns on the game board
export const GRID_COLS = 8;

// How many distinct rocket/block colors exist
export const ROCKET_TYPES = 5;

// Total moves a player gets per game session
export const MAX_MOVES = 20;

// Points earned per individual block removed
export const BASE_SCORE = 10;

// Score multiplier for each match shape (applied on top of BASE_SCORE × block count)
export const SHAPE_MULTIPLIERS: Record<MatchShape, number> = {
  [MatchShape.LINE3]: 1.0,
  [MatchShape.SQUARE]: 1.5,
  [MatchShape.T_SHAPE]: 1.5,
  [MatchShape.L_SHAPE]: 1.5,
  [MatchShape.LINE4]: 2.0,
  [MatchShape.LINE5]: 2.5,
};

// Pixel size of one cell in the Phaser canvas
export const CELL_SIZE = 90;

// Total pixel width of the board (GRID_COLS × CELL_SIZE)
export const BOARD_WIDTH = GRID_COLS * CELL_SIZE;

// Total pixel height of the board (GRID_ROWS × CELL_SIZE)
export const BOARD_HEIGHT = GRID_ROWS * CELL_SIZE;

// Duration in ms for the swap animation (blocks sliding into place)
export const ANIMATION_DURATION = 250;

// Duration in ms for an invalid-swap attempt — shorter so it feels snappy on mobile
// (each half of the yoyo is this ÷ 2, plus a 100 ms red flash = ~260 ms total)
export const INVALID_ANIM_DURATION = 160;

// Duration in ms for blocks falling due to gravity after a match
export const FALL_DURATION = 200;
