import type { Position } from '../types';
import { RocketType } from '../types';
import { ROCKET_TYPES } from '../config/constants';
import type { Grid } from './Grid';
import { MatchFinder } from './MatchFinder';

const ALL_TYPES: RocketType[] = Object.values(RocketType) as RocketType[];

function randomType(colorCount: number = ROCKET_TYPES): RocketType {
  return ALL_TYPES[Math.floor(Math.random() * Math.min(colorCount, ALL_TYPES.length))];
}

// Fisher-Yates in-place shuffle
function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export class BoardFiller {
  private finder = new MatchFinder();

  // Fill every null cell in the grid with a random RocketType.
  // Null cells are always at the top of their columns after gravity has run,
  // so the returned entries represent new blocks entering from the top.
  fill(grid: Grid, colorCount: number = ROCKET_TYPES): { position: Position; type: RocketType }[] {
    const newCells: { position: Position; type: RocketType }[] = [];
    const { rows, cols } = grid;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const cell = grid.getCell(r, c);
        if (!cell || cell.type !== null) continue;

        const type = randomType(colorCount);
        grid.setCell(r, c, type);
        newCells.push({ position: { row: r, col: c }, type });
      }
    }

    return newCells;
  }

  reshuffleBoard(grid: Grid, colorCount: number = ROCKET_TYPES): void {
    const { rows, cols } = grid;

    // Count how many of each color currently exist on the board
    const colorCounts = new Map<RocketType, number>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = grid.getCell(r, c)?.type;
        if (type != null) {
          colorCounts.set(type, (colorCounts.get(type) ?? 0) + 1);
        }
      }
    }

    // Build a pool that mirrors the current color distribution
    const pool: RocketType[] = [];
    colorCounts.forEach((count, type) => {
      for (let i = 0; i < count; i++) pool.push(type);
    });

    while (pool.length < rows * cols) {
      pool.push(randomType(colorCount));
    }

    const MAX_ATTEMPTS = 100;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      shuffle(pool);

      // Apply shuffled pool to the grid
      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          grid.setCell(r, c, pool[idx++]);
        }
      }

      // Accept only if there are no existing matches AND at least one valid move
      const noMatches = this.finder.findAllMatches(grid).length === 0;
      const hasMoves = this.finder.hasAnyValidMove(grid);
      if (noMatches && hasMoves) return;
    }

    do {
      grid.initialize(colorCount);
    } while (!this.finder.hasAnyValidMove(grid));
  }
}

export const boardFiller = new BoardFiller();
