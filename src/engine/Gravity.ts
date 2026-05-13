import type { Position } from '../types';
import type { Grid } from './Grid';

export class Gravity {
  // Shift every non-null cell in each column downward to fill gaps left by removed cells.
  // Returns a list of movements — each entry is [fromPosition, toPosition] — so the
  // animation layer knows exactly which cell moved and where it landed.
  apply(grid: Grid): Position[][] {
    const movements: Position[][] = [];
    const { rows, cols } = grid;

    for (let c = 0; c < cols; c++) {
      // writeRow is the next available slot, starting from the bottom of the column
      let writeRow = rows - 1;

      // Scan upward: pull non-null cells down toward writeRow
      for (let r = rows - 1; r >= 0; r--) {
        const cell = grid.getCell(r, c);
        if (!cell || cell.type === null) continue;

        if (r !== writeRow) {
          // Move the cell down to the write position
          grid.setCell(writeRow, c, cell.type);
          grid.setCell(r, c, null);
          // Record the movement so Phaser can animate it
          movements.push([{ row: r, col: c }, { row: writeRow, col: c }]);
        }

        writeRow--;
      }

      // Any rows above the last non-null cell must be explicitly set to null
      // (they might already be null, but this guarantees a clean state)
      while (writeRow >= 0) {
        grid.setCell(writeRow, c, null);
        writeRow--;
      }
    }

    return movements;
  }
}

export const gravity = new Gravity();
