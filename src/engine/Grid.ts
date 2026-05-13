import type { Cell, Grid as GridData, Position } from '../types';
import { RocketType } from '../types';
import { GRID_COLS, GRID_ROWS, ROCKET_TYPES } from '../config/constants';

// All five RocketType values as an array so we can pick one randomly by index
const ALL_TYPES: RocketType[] = Object.values(RocketType) as RocketType[];

// Pick a random RocketType
function randomType(): RocketType {
  return ALL_TYPES[Math.floor(Math.random() * ROCKET_TYPES)];
}

export class Grid {
  readonly rows: number;
  readonly cols: number;
  cells: Cell[][];

  constructor(rows: number = GRID_ROWS, cols: number = GRID_COLS) {
    this.rows = rows;
    this.cols = cols;
    // Start with an empty 2D array — caller must call initialize() to fill it
    this.cells = [];
  }

  // Fill the board with random types, then remove any pre-existing Line-3 matches
  // by re-rolling each offending cell until no horizontal or vertical run of 3 exists
  initialize(): void {
    // Step 1: fill every cell with a random type
    this.cells = Array.from({ length: this.rows }, (_, row) =>
      Array.from({ length: this.cols }, (_, col) => ({
        type: randomType(),
        row,
        col,
      }))
    );

    // Step 2: fix any cell that completes a run of 3 in either direction
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        // Keep re-rolling this cell until it doesn't create a horizontal or vertical triple
        while (this.wouldMatchAt(row, col)) {
          this.cells[row][col].type = randomType();
        }
      }
    }
  }

  // Returns true if the cell at (row, col) completes a Line-3 with its neighbours.
  // Only checks leftward and upward because cells to the right/below aren't placed yet
  // when initialize() scans left-to-right, top-to-bottom.
  private wouldMatchAt(row: number, col: number): boolean {
    const t = this.cells[row][col].type;

    // Horizontal: match with the two cells to the left
    if (
      col >= 2 &&
      this.cells[row][col - 1].type === t &&
      this.cells[row][col - 2].type === t
    ) {
      return true;
    }

    // Vertical: match with the two cells above
    if (
      row >= 2 &&
      this.cells[row - 1][col].type === t &&
      this.cells[row - 2][col].type === t
    ) {
      return true;
    }

    return false;
  }

  // Return the Cell at (row, col), or null if out of bounds
  getCell(row: number, col: number): Cell | null {
    if (!this.isValidPosition(row, col)) return null;
    return this.cells[row][col];
  }

  // Set the RocketType at (row, col) — does nothing if position is invalid
  setCell(row: number, col: number, type: RocketType | null): void {
    if (!this.isValidPosition(row, col)) return;
    this.cells[row][col].type = type;
  }

  // True if (row, col) is inside the grid boundaries
  isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  // True if pos1 and pos2 are directly adjacent (4-directional, no diagonals)
  isAdjacent(pos1: Position, pos2: Position): boolean {
    const rowDiff = Math.abs(pos1.row - pos2.row);
    const colDiff = Math.abs(pos1.col - pos2.col);
    // Exactly one step in one axis and zero in the other
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  // Swap the types of two cells in place (positions themselves stay the same)
  swap(pos1: Position, pos2: Position): void {
    const temp = this.cells[pos1.row][pos1.col].type;
    this.cells[pos1.row][pos1.col].type = this.cells[pos2.row][pos2.col].type;
    this.cells[pos2.row][pos2.col].type = temp;
  }

  // Return a deep copy of this grid so callers can simulate moves without mutating state
  clone(): Grid {
    const copy = new Grid(this.rows, this.cols);
    copy.cells = this.cells.map((row) =>
      row.map((cell) => ({ ...cell }))
    );
    return copy;
  }

  // Return a flat 2D array of just the RocketType values — used by the renderer
  toArray(): GridData {
    return this.cells.map((row) => row.map((cell) => ({ ...cell })));
  }
}

/*
  USAGE EXAMPLES (not executed — for reference only)

  // Create and fill a new 8×8 grid with no initial matches
  const grid = new Grid();
  grid.initialize();

  // Read a cell
  const cell = grid.getCell(3, 4); // → { type: RocketType.RED, row: 3, col: 4 }

  // Check adjacency
  const a = { row: 2, col: 3 };
  const b = { row: 2, col: 4 };
  const c = { row: 2, col: 5 };
  grid.isAdjacent(a, b); // → true  (one step apart)
  grid.isAdjacent(a, c); // → false (two steps apart)

  // Simulate a swap without changing the real board
  const preview = grid.clone();
  preview.swap(a, b);
  // grid is unchanged; preview has the swap applied

  // Apply a swap for real
  grid.swap(a, b);
*/
