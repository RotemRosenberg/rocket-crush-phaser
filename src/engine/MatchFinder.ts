import type { MatchResult, Position, SwapMove } from '../types';
import { MatchShape } from '../types';
import { BASE_SCORE, SHAPE_MULTIPLIERS, GRID_ROWS, GRID_COLS } from '../config/constants';
import type { Grid } from './Grid';

function posKey(row: number, col: number): string {
  return `${row},${col}`;
}

function calcScore(shape: MatchShape, cellCount: number): number {
  return Math.round(cellCount * BASE_SCORE * SHAPE_MULTIPLIERS[shape]);
}

function allSameColor(grid: Grid, positions: Position[]): boolean {
  if (positions.length === 0) return false;
  const firstCell = grid.getCell(positions[0].row, positions[0].col);
  if (!firstCell || firstCell.type === null) return false;
  const color = firstCell.type;
  return positions.every((p) => {
    const cell = grid.getCell(p.row, p.col);
    return cell !== null && cell.type === color;
  });
}

export class MatchFinder {
  // ─── Public API ─────────────────────────────────────────────────────────────

  findAllMatches(grid: Grid): MatchResult[] {
    const candidates: MatchResult[] = [
      ...this.findLines(grid),
      ...this.findSquares(grid),
      ...this.findTShapes(grid),
      ...this.findLShapes(grid),
    ];

    // Higher score first — a Line-5 (1600 pts) takes priority over a Line-3 (30 pts)
    candidates.sort((a, b) => b.score - a.score);

    // Only check matchCells for overlap — bonus zones can extend over "foreign" cells
    const usedCells = new Set<string>();
    const results: MatchResult[] = [];

    for (const match of candidates) {
      const matchKeys = match.matchCells.map((p) => posKey(p.row, p.col));
      if (matchKeys.some((k) => usedCells.has(k))) continue;
      results.push(match);
      // Mark ALL cleared cells (match + bonus) so no other shape re-claims them
      match.cells.forEach((p) => usedCells.add(posKey(p.row, p.col)));
    }

    return results;
  }

  findMatchesAfterSwap(grid: Grid, swap: SwapMove): MatchResult[] {
    const clone = grid.clone();
    clone.swap(swap.from, swap.to);
    return this.findAllMatches(clone);
  }

  hasAnyValidMove(grid: Grid): boolean {
    const { rows, cols } = grid;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c + 1 < cols) {
          const swap: SwapMove = { from: { row: r, col: c }, to: { row: r, col: c + 1 } };
          if (this.findMatchesAfterSwap(grid, swap).length > 0) return true;
        }
        if (r + 1 < rows) {
          const swap: SwapMove = { from: { row: r, col: c }, to: { row: r + 1, col: c } };
          if (this.findMatchesAfterSwap(grid, swap).length > 0) return true;
        }
      }
    }
    return false;
  }

  // ─── Match builder ───────────────────────────────────────────────────────────

  // Central factory: given the cells that formed a shape, compute the power-clear
  // zone and return a complete MatchResult.
  private buildMatch(matchCells: Position[], shape: MatchShape): MatchResult {
    const bonusCells = this.computeBonusCells(matchCells, shape);
    const cells      = [...matchCells, ...bonusCells];
    return { matchCells, bonusCells, cells, shape, score: calcScore(shape, cells.length) };
  }

  // Compute the extra cells that the power rule clears beyond the shape itself.
  private computeBonusCells(matchCells: Position[], shape: MatchShape): Position[] {
    const matchSet = new Set(matchCells.map((p) => posKey(p.row, p.col)));

    switch (shape) {

      case MatchShape.LINE4: {
        // Horizontal → clear the full row; Vertical → clear the full column
        const isHorizontal = matchCells.every((p) => p.row === matchCells[0].row);
        const bonus: Position[] = [];
        if (isHorizontal) {
          const row = matchCells[0].row;
          for (let c = 0; c < GRID_COLS; c++) {
            if (!matchSet.has(posKey(row, c))) bonus.push({ row, col: c });
          }
        } else {
          const col = matchCells[0].col;
          for (let r = 0; r < GRID_ROWS; r++) {
            if (!matchSet.has(posKey(r, col))) bonus.push({ row: r, col });
          }
        }
        return bonus;
      }

      case MatchShape.LINE5: {
        // Clear every cell on the board
        const bonus: Position[] = [];
        for (let r = 0; r < GRID_ROWS; r++)
          for (let c = 0; c < GRID_COLS; c++)
            if (!matchSet.has(posKey(r, c))) bonus.push({ row: r, col: c });
        return bonus;
      }

      case MatchShape.T_SHAPE:
      case MatchShape.L_SHAPE: {
        // Exactly one row and one column each contain 3 match cells —
        // those are the two "arms" of the shape. Clear each arm's full line.
        // The arms always share exactly one corner cell that is already in matchSet,
        // so deduplication is handled naturally.
        const rowCounts = new Map<number, number>();
        const colCounts = new Map<number, number>();
        for (const { row, col } of matchCells) {
          rowCounts.set(row, (rowCounts.get(row) ?? 0) + 1);
          colCounts.set(col, (colCounts.get(col) ?? 0) + 1);
        }

        const clearRow = [...rowCounts.entries()].find(([, n]) => n === 3)?.[0];
        const clearCol = [...colCounts.entries()].find(([, n]) => n === 3)?.[0];

        const bonus: Position[] = [];
        const bonusSet = new Set<string>();

        // Expand the row arm
        if (clearRow !== undefined) {
          for (let c = 0; c < GRID_COLS; c++) {
            const key = posKey(clearRow, c);
            if (!matchSet.has(key)) { bonusSet.add(key); bonus.push({ row: clearRow, col: c }); }
          }
        }
        // Expand the column arm (skip cells already in bonus from the row expansion)
        if (clearCol !== undefined) {
          for (let r = 0; r < GRID_ROWS; r++) {
            const key = posKey(r, clearCol);
            if (!matchSet.has(key) && !bonusSet.has(key)) bonus.push({ row: r, col: clearCol });
          }
        }

        return bonus;
      }

      // LINE3 and SQUARE: no power bonus
      default:
        return [];
    }
  }

  // ─── Line Detection ──────────────────────────────────────────────────────────

  private findLines(grid: Grid): MatchResult[] {
    const results: MatchResult[] = [];
    const { rows, cols } = grid;

    // Horizontal runs
    for (let r = 0; r < rows; r++) {
      let c = 0;
      while (c < cols) {
        const cell = grid.getCell(r, c);
        if (!cell || cell.type === null) { c++; continue; }
        const color = cell.type;

        let end = c + 1;
        while (end < cols && grid.getCell(r, end)?.type === color) end++;
        const len = end - c;

        if (len >= 5) {
          const matchCells = Array.from({ length: len }, (_, i) => ({ row: r, col: c + i }));
          results.push(this.buildMatch(matchCells, MatchShape.LINE5));
        } else if (len === 4) {
          const matchCells = Array.from({ length: 4 }, (_, i) => ({ row: r, col: c + i }));
          results.push(this.buildMatch(matchCells, MatchShape.LINE4));
        } else if (len === 3) {
          const matchCells = Array.from({ length: 3 }, (_, i) => ({ row: r, col: c + i }));
          results.push(this.buildMatch(matchCells, MatchShape.LINE3));
        }
        c = end;
      }
    }

    // Vertical runs
    for (let c = 0; c < cols; c++) {
      let r = 0;
      while (r < rows) {
        const cell = grid.getCell(r, c);
        if (!cell || cell.type === null) { r++; continue; }
        const color = cell.type;

        let end = r + 1;
        while (end < rows && grid.getCell(end, c)?.type === color) end++;
        const len = end - r;

        if (len >= 5) {
          const matchCells = Array.from({ length: len }, (_, i) => ({ row: r + i, col: c }));
          results.push(this.buildMatch(matchCells, MatchShape.LINE5));
        } else if (len === 4) {
          const matchCells = Array.from({ length: 4 }, (_, i) => ({ row: r + i, col: c }));
          results.push(this.buildMatch(matchCells, MatchShape.LINE4));
        } else if (len === 3) {
          const matchCells = Array.from({ length: 3 }, (_, i) => ({ row: r + i, col: c }));
          results.push(this.buildMatch(matchCells, MatchShape.LINE3));
        }
        r = end;
      }
    }

    return results;
  }

  // ─── Square Detection ────────────────────────────────────────────────────────

  private findSquares(grid: Grid): MatchResult[] {
    const results: MatchResult[] = [];
    const { rows, cols } = grid;

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const matchCells: Position[] = [
          { row: r,     col: c },
          { row: r,     col: c + 1 },
          { row: r + 1, col: c },
          { row: r + 1, col: c + 1 },
        ];
        if (allSameColor(grid, matchCells)) {
          results.push(this.buildMatch(matchCells, MatchShape.SQUARE));
        }
      }
    }

    return results;
  }

  // ─── T-Shape Detection ───────────────────────────────────────────────────────

  private findTShapes(grid: Grid): MatchResult[] {
    const results: MatchResult[] = [];
    const { rows, cols } = grid;

    const PATTERNS: [number, number][][] = [
      [[0,0],[0,1],[0,2],[1,1],[2,1]], // T pointing down
      [[0,1],[1,1],[2,0],[2,1],[2,2]], // T pointing up
      [[0,0],[1,0],[1,1],[1,2],[2,0]], // T pointing right
      [[0,2],[1,0],[1,1],[1,2],[2,2]], // T pointing left
    ];

    for (let r = 0; r <= rows - 3; r++) {
      for (let c = 0; c <= cols - 3; c++) {
        for (const pattern of PATTERNS) {
          const matchCells = pattern.map(([dr, dc]) => ({ row: r + dr, col: c + dc }));
          if (allSameColor(grid, matchCells)) {
            results.push(this.buildMatch(matchCells, MatchShape.T_SHAPE));
          }
        }
      }
    }

    return results;
  }

  // ─── L-Shape Detection ───────────────────────────────────────────────────────

  private findLShapes(grid: Grid): MatchResult[] {
    const results: MatchResult[] = [];
    const { rows, cols } = grid;

    const PATTERNS: [number, number][][] = [
      [[0,0],[1,0],[2,0],[2,1],[2,2]], // corner bottom-left
      [[0,2],[1,2],[2,0],[2,1],[2,2]], // corner bottom-right
      [[0,0],[0,1],[0,2],[1,0],[2,0]], // corner top-left
      [[0,0],[0,1],[0,2],[1,2],[2,2]], // corner top-right
    ];

    for (let r = 0; r <= rows - 3; r++) {
      for (let c = 0; c <= cols - 3; c++) {
        for (const pattern of PATTERNS) {
          const matchCells = pattern.map(([dr, dc]) => ({ row: r + dr, col: c + dc }));
          if (allSameColor(grid, matchCells)) {
            results.push(this.buildMatch(matchCells, MatchShape.L_SHAPE));
          }
        }
      }
    }

    return results;
  }
}
