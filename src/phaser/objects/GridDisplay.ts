import Phaser from 'phaser';
import { RocketType } from '../../types';
import type { Position, Grid as GridData } from '../../types';
import type { Grid } from '../../engine/Grid';
import { RocketSprite } from './RocketSprite';
import { CELL_SIZE, GRID_ROWS, GRID_COLS } from '../../config/constants';

// Using null to represent empty/destroyed sprite slots
type SpriteGrid = (RocketSprite | null)[][];

export class GridDisplay {
  private sprites: SpriteGrid = [];
  private originX = 0;
  private originY = 0;

  // Build all 64 sprites from the initial grid state
  create(scene: Phaser.Scene, grid: Grid): void {
    this.originX = (scene.scale.width  - GRID_COLS * CELL_SIZE) / 2;
    this.originY = (scene.scale.height - GRID_ROWS * CELL_SIZE) / 2;
    this.sprites = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      this.sprites[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        const type = grid.getCell(row, col)?.type ?? RocketType.RED;
        const x = this.colToX(col);
        const y = this.rowToY(row);
        this.sprites[row][col] = new RocketSprite(scene, x, y, row, col, type);
      }
    }
  }

  // One static dark rounded tile per cell — gives transparent ship images a background
  // Return the sprite at a position (null/undefined if empty or out of range)
  getSprite(row: number, col: number): RocketSprite | null | undefined {
    return this.sprites[row]?.[col];
  }

  // Sync textures and visibility to match current grid data (does not move sprites)
  updateFromGrid(grid: GridData): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const sprite = this.sprites[row]?.[col];
        if (!sprite) continue;
        const type = grid[row]?.[col]?.type ?? null;
        if (type !== null) {
          sprite.setTexture(`rocket_${type}`);
          sprite.rocketType = type;
          sprite.setVisible(true);
        } else {
          sprite.setVisible(false);
        }
      }
    }
  }

  // ── Animation helpers ────────────────────────────────────────────────────

  // Swap two entries in the sprite array and update their row/col properties.
  // Called after a successful swap animation so the map stays in sync with grid data.
  swapSpriteEntries(a: Position, b: Position): void {
    const sa = this.sprites[a.row]?.[a.col] ?? null;
    const sb = this.sprites[b.row]?.[b.col] ?? null;
    this.sprites[a.row][a.col] = sb;
    this.sprites[b.row][b.col] = sa;
    if (sa) { sa.row = b.row; sa.col = b.col; }
    if (sb) { sb.row = a.row; sb.col = a.col; }
  }

  // Move a sprite entry from one slot to another (used after gravity runs).
  // The sprite's pixel position is NOT changed here — that is done by the tween.
  moveSpriteEntry(from: Position, to: Position): void {
    const sprite = this.sprites[from.row]?.[from.col] ?? null;
    this.sprites[to.row][to.col] = sprite;
    this.sprites[from.row][from.col] = null;
    if (sprite) { sprite.row = to.row; sprite.col = to.col; }
  }

  // Destroy the sprite at a position and mark the slot empty.
  // Called after a pop/removal animation completes.
  destroySpriteAt(row: number, col: number): void {
    const sprite = this.sprites[row]?.[col];
    if (!sprite) return;
    sprite.destroy();
    this.sprites[row][col] = null;
  }

  // Create a new sprite at (row, col) with an optional overriding start Y
  // (used to start new blocks above the canvas before tweening them down).
  addSpriteAt(
    scene: Phaser.Scene,
    row: number,
    col: number,
    type: RocketType,
    startY?: number,
  ): RocketSprite {
    const x = this.colToX(col);
    const y = startY ?? this.rowToY(row);
    const sprite = new RocketSprite(scene, x, y, row, col, type);
    this.sprites[row][col] = sprite;
    return sprite;
  }

  // ── Coordinate helpers ────────────────────────────────────────────────────

  colToX(col: number): number {
    return this.originX + col * CELL_SIZE + CELL_SIZE / 2;
  }

  rowToY(row: number): number {
    return this.originY + row * CELL_SIZE + CELL_SIZE / 2;
  }
}
