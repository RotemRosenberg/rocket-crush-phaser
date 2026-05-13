import Phaser from 'phaser';
import type { Position, SwapMove, MatchResult, RocketType } from '../../types';
import { MatchShape } from '../../types';
import { Grid } from '../../engine/Grid';
import { MatchFinder } from '../../engine/MatchFinder';
import { gravity } from '../../engine/Gravity';
import { boardFiller } from '../../engine/BoardFiller';
import { scoreCalculator } from '../../engine/ScoreCalculator';
import { GridDisplay } from '../objects/GridDisplay';
import { swapAnim } from '../animations/SwapAnim';
import { explosionAnim, ROCKET_COLORS } from '../animations/ExplosionAnim';
import { beamAnim } from '../animations/BeamAnim';
import { eventBus, EVENTS } from '../../bridge/EventBus';
import {
  CELL_SIZE, GRID_ROWS, GRID_COLS,
  ANIMATION_DURATION, INVALID_ANIM_DURATION, FALL_DURATION, MAX_MOVES,
} from '../../config/constants';

// 10 px is enough movement to commit to a drag direction without causing accidental
// swaps from taps (fingers land and lift with a tiny natural drift).
const MIN_DRAG_PX = 10;

// ── Starfield types ───────────────────────────────────────────────────────────

interface StarData {
  arc:       Phaser.GameObjects.Arc;
  speed:     number; // px per 60fps-equivalent frame
  baseAlpha: number; // resting opacity (twinkle oscillates around this)
}

// Three speed/size layers that create a parallax depth illusion
const STAR_LAYERS: {
  count: number; speed: number;
  minR: number;  maxR: number;
  minA: number;  maxA: number;
}[] = [
  { count: 35, speed: 0.25, minR: 0.4, maxR: 1.0, minA: 0.12, maxA: 0.28 }, // far
  { count: 30, speed: 0.55, minR: 0.7, maxR: 1.4, minA: 0.22, maxA: 0.42 }, // mid
  { count: 15, speed: 0.90, minR: 1.0, maxR: 1.9, minA: 0.35, maxA: 0.60 }, // near
];

export class GameScene extends Phaser.Scene {
  private grid!: Grid;
  private gridDisplay!: GridDisplay;
  private matchFinder!: MatchFinder;
  private stars: StarData[] = [];

  private isAnimating = false;
  private score = 0;
  private movesRemaining = MAX_MOVES;

  // Tap-Tap state (desktop)
  private selectedCell: Position | null = null;

  // Drag state (mobile)
  private dragStartCell: Position | null = null;
  private dragStartX = 0;
  private dragStartY = 0;

  // Stored so we can remove the listener on shutdown
  private readonly handleSwapRequested = (move: SwapMove): void => {
    this.processSwap(move).catch(console.error);
  };

  constructor() {
    super({ key: 'GameScene' });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  create(): void {
    this.createStarfield(); // must run before gridDisplay so depth ordering is correct

    this.grid = new Grid();
    this.matchFinder = new MatchFinder(); // created first so the validity loop can use it

    // GDD requirement: board must start with at least one valid move.
    // initialize() only avoids pre-existing matches, not the valid-move guarantee.
    // This loop almost always exits on the first iteration.
    do {
      this.grid.initialize();
    } while (!this.matchFinder.hasAnyValidMove(this.grid));

    this.gridDisplay = new GridDisplay();
    this.gridDisplay.create(this, this.grid);

    eventBus.on(EVENTS.SWAP_REQUESTED, this.handleSwapRequested);
    this.setupInput();
  }

  // ── Starfield ─────────────────────────────────────────────────────────────

  private createStarfield(): void {
    const { width, height } = this.scale;

    for (const layer of STAR_LAYERS) {
      for (let i = 0; i < layer.count; i++) {
        const x     = Math.random() * width;
        const y     = Math.random() * height;
        const r     = layer.minR + Math.random() * (layer.maxR - layer.minR);
        const alpha = layer.minA + Math.random() * (layer.maxA - layer.minA);
        // Light-blue tint on ~25 % of stars for colour variety
        const color = Math.random() < 0.25 ? 0xadd8ff : 0xffffff;

        const arc = this.add.circle(x, y, r, color);
        arc.setAlpha(alpha);
        arc.setDepth(-1); // behind all board sprites (default depth 0)

        // ~65 % of stars twinkle; the rest stay at constant opacity
        if (Math.random() < 0.65) {
          this.tweens.add({
            targets:  arc,
            alpha:    alpha * 0.12, // dim down to ~12 % of base opacity
            duration: 1200 + Math.random() * 3000,
            ease:     'Sine.easeInOut',
            yoyo:     true,
            repeat:   -1,
            delay:    Math.random() * 2500, // stagger so they don't all pulse together
          });
        }

        this.stars.push({ arc, speed: layer.speed, baseAlpha: alpha });
      }
    }
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  // delta is the ms since the last frame; dividing by 16.67 normalises to 60 fps
  update(_time: number, delta: number): void {
    const factor = delta / 16.67;
    const { width, height } = this.scale;

    for (const star of this.stars) {
      star.arc.y += star.speed * factor;
      if (star.arc.y > height + 4) {
        // Wrap to a random x at the top so the stream stays dense
        star.arc.y = -4;
        star.arc.x = Math.random() * width;
      }
    }
  }

  shutdown(): void {
    eventBus.off(EVENTS.SWAP_REQUESTED, this.handleSwapRequested);
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private setupInput(): void {
    if (this.game.device.input.touch) {
      this.setupDragInput();
    } else {
      this.setupTapInput();
    }
  }

  private setupTapInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isAnimating) return;
      const tapped = this.pixelToCell(pointer.x, pointer.y);
      if (!tapped) return;

      if (!this.selectedCell) {
        this.selectCell(tapped);
        return;
      }
      if (this.selectedCell.row === tapped.row && this.selectedCell.col === tapped.col) {
        this.clearSelection();
        return;
      }
      if (this.grid.isAdjacent(this.selectedCell, tapped)) {
        this.attemptSwap(this.selectedCell, tapped);
        this.clearSelection();
      } else {
        this.clearSelection();
        this.selectCell(tapped);
      }
    });
  }

  private setupDragInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isAnimating) return;
      this.dragStartCell = this.pixelToCell(pointer.x, pointer.y);
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;

      // Highlight immediately on touch — don't wait for drag direction to be committed
      if (this.dragStartCell) {
        this.gridDisplay.getSprite(this.dragStartCell.row, this.dragStartCell.col)
          ?.setHighlight(true);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Always clear the touch highlight, regardless of what happens next
      if (this.dragStartCell) {
        this.gridDisplay.getSprite(this.dragStartCell.row, this.dragStartCell.col)
          ?.setHighlight(false);
      }

      if (this.isAnimating || !this.dragStartCell) {
        this.dragStartCell = null;
        return;
      }

      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;

      if (Math.abs(dx) < MIN_DRAG_PX && Math.abs(dy) < MIN_DRAG_PX) {
        // Not enough movement — treat as a tap, ignore
        this.dragStartCell = null;
        return;
      }

      const { row, col } = this.dragStartCell;
      const target: Position = Math.abs(dx) > Math.abs(dy)
        ? { row, col: col + (dx > 0 ? 1 : -1) }
        : { row: row + (dy > 0 ? 1 : -1), col };

      if (this.grid.isValidPosition(target.row, target.col)) {
        this.attemptSwap(this.dragStartCell, target);
      }
      this.dragStartCell = null;
    });
  }

  private selectCell(pos: Position): void {
    this.selectedCell = pos;
    this.gridDisplay.getSprite(pos.row, pos.col)?.setHighlight(true);
  }

  private clearSelection(): void {
    if (!this.selectedCell) return;
    this.gridDisplay.getSprite(this.selectedCell.row, this.selectedCell.col)?.setHighlight(false);
    this.selectedCell = null;
  }

  private attemptSwap(from: Position, to: Position): void {
    this.isAnimating = true;
    eventBus.emit(EVENTS.SWAP_REQUESTED, { from, to } satisfies SwapMove);
  }

  // ── Swap processing (async, runs animations in order) ─────────────────────

  private async processSwap(move: SwapMove): Promise<void> {
    const { from, to } = move;
    const s1 = this.gridDisplay.getSprite(from.row, from.col);
    const s2 = this.gridDisplay.getSprite(to.row, to.col);
    if (!s1 || !s2) { this.isAnimating = false; return; }

    const wouldMatch = this.matchFinder.findMatchesAfterSwap(this.grid, move).length > 0;

    if (!wouldMatch) {
      // ── Invalid swap ──────────────────────────────────────────────────────
      await swapAnim.playInvalidSwap(this, s1, s2, INVALID_ANIM_DURATION);
      eventBus.emit(EVENTS.INVALID_SWAP, move);
      this.isAnimating = false;
      return;
    }

    // ── Valid swap ────────────────────────────────────────────────────────
    await swapAnim.playSwap(this, s1, s2, ANIMATION_DURATION);
    this.grid.swap(from, to);
    this.gridDisplay.swapSpriteEntries(from, to);

    // Cascade loop — keeps running as long as new matches appear
    let totalScore = 0;
    let matches    = this.matchFinder.findAllMatches(this.grid);

    // The beam for a player-triggered LINE4 starts at the cell they moved to.
    // Cascade LINE4s (no player swap) get null → beam starts at the match centre.
    let beamOrigin: Position | null = to;

    while (matches.length > 0) {
      totalScore += scoreCalculator.calculateCascadeScore(matches);
      eventBus.emit(EVENTS.MATCH_FOUND, matches);

      // Debug log — remove or gate behind a flag once verified
      for (const m of matches) {
        console.log(
          `[Match] ${m.shape}: ${m.matchCells.length} match + ${m.bonusCells.length} bonus` +
          ` = ${m.cells.length} total → ${m.score} pts`,
        );
      }

      // ── 1. Clear data layer immediately ───────────────────────────────────
      const toClear = this.collectAllCells(matches);
      for (const pos of toClear) {
        this.grid.setCell(pos.row, pos.col, null);
      }

      // ── 2. Route each match to the right animation ────────────────────────
      const line5Matches = matches.filter(m => m.shape === MatchShape.LINE5);
      const line4Matches = matches.filter(m => m.shape === MatchShape.LINE4);
      const ltMatches    = matches.filter(m => m.shape === MatchShape.L_SHAPE || m.shape === MatchShape.T_SHAPE);
      const otherMatches = matches.filter(m =>
        m.shape !== MatchShape.LINE5 &&
        m.shape !== MatchShape.LINE4 &&
        m.shape !== MatchShape.L_SHAPE &&
        m.shape !== MatchShape.T_SHAPE,
      );

      // Beam / nova animations handle ALL visual erasure (match + bonus cells)
      const beamPromises = [
        ...line5Matches.map(m => this.playLine5Nova(m)),
        ...line4Matches.map(m => this.playLine4Beam(m, beamOrigin)),
        ...ltMatches.map(m => this.playLTShapeBeam(m)),
      ];

      // Remaining matches — normal sparks + pop on match cells, instant-hide on bonus
      this.fireExplosions(otherMatches);
      this.hideBonusCells(otherMatches);
      const popPromise = this.animatePop(otherMatches);

      // Wait for ALL animations before continuing
      await Promise.all([...beamPromises, popPromise]);

      // ── 3. Destroy all cleared sprites ────────────────────────────────────
      for (const pos of toClear) {
        this.gridDisplay.destroySpriteAt(pos.row, pos.col);
      }

      // Gravity: shift remaining cells down, animate the fall
      const movements = gravity.apply(this.grid);
      await this.animateFalling(movements);

      // Fill empty cells at the top, animate them entering from above
      const newCells = boardFiller.fill(this.grid);
      await this.animateEntering(newCells);

      // Cascade LINE4s have no specific player origin
      beamOrigin = null;
      matches    = this.matchFinder.findAllMatches(this.grid);
    }

    // Consume one move and broadcast updates to React
    this.score += totalScore;
    this.movesRemaining = Math.max(0, this.movesRemaining - 1);
    eventBus.emit(EVENTS.SCORE_UPDATE, totalScore); // emit the delta so the store can addScore()
    eventBus.emit(EVENTS.MOVES_UPDATE, this.movesRemaining);

    if (this.movesRemaining === 0) {
      eventBus.emit(EVENTS.GAME_OVER, { score: this.score });
      return; // don't re-enable input — game is over
    }

    // If no valid move exists after processing, reshuffle the board (free move)
    if (!this.matchFinder.hasAnyValidMove(this.grid)) {
      boardFiller.reshuffleBoard(this.grid);
      this.gridDisplay.updateFromGrid(this.grid.toArray());
      eventBus.emit(EVENTS.BOARD_RESHUFFLE);
    }

    this.isAnimating = false;
  }

  // ── Animation helpers ─────────────────────────────────────────────────────

  // Triggers the Nova Explosion for a LINE5 match (clears the whole board).
  private playLine5Nova(match: MatchResult): Promise<void> {
    return beamAnim.playNovaExplosion(this, match.cells, this.gridDisplay);
  }

  // Triggers the beam animation for a single LINE4 match.
  // The beam erases all cells in the clear zone as it travels.
  private playLine4Beam(match: MatchResult, swapOrigin: Position | null): Promise<void> {
    // Determine direction from whether all match cells share the same row
    const direction: 'horizontal' | 'vertical' =
      match.matchCells.every(p => p.row === match.matchCells[0].row)
        ? 'horizontal'
        : 'vertical';

    // Use the swap cell as the beam origin if it's one of the 4 match cells;
    // otherwise fall back to matchCells[1] which is near the centre of the run.
    let startPos = match.matchCells[1];
    if (swapOrigin) {
      const hit = match.matchCells.find(
        p => p.row === swapOrigin.row && p.col === swapOrigin.col,
      );
      if (hit) startPos = hit;
    }

    // Look up the rocket colour from the first match sprite (all 4 are the same type)
    const sprite = this.gridDisplay.getSprite(match.matchCells[0].row, match.matchCells[0].col);
    const color  = sprite ? ROCKET_COLORS[sprite.rocketType] : 0x5b8fff;

    return beamAnim.playBeamClear(
      this,
      startPos,
      direction,
      match.cells,       // matchCells + bonusCells = full row or column (8 cells)
      color,
      this.gridDisplay,
    );
  }

  // Fires TWO simultaneous beams for L-Shape and T-Shape matches:
  // one horizontal (along the cleared row) and one vertical (along the cleared column).
  // Both originate from the intersection of the two cleared lines, which is always
  // one of the shape's match cells (the corner/crossing point).
  private async playLTShapeBeam(match: MatchResult): Promise<void> {
    const { row: clearRow, col: clearCol } = this.findLTClearLines(match);

    // The intersection (clearRow, clearCol) is the natural "crossing point" of the shape
    const origin: Position = { row: clearRow, col: clearCol };

    // Separate match.cells into the two cleared lines for each beam
    const rowCells = match.cells.filter(p => p.row === clearRow);
    const colCells = match.cells.filter(p => p.col === clearCol);

    const sprite = this.gridDisplay.getSprite(match.matchCells[0].row, match.matchCells[0].col);
    const color  = sprite ? ROCKET_COLORS[sprite.rocketType] : 0x5b8fff;

    // Both beams fire at exactly the same time
    await Promise.all([
      beamAnim.playBeamClear(this, origin, 'horizontal', rowCells, color, this.gridDisplay),
      beamAnim.playBeamClear(this, origin, 'vertical',   colCells, color, this.gridDisplay),
    ]);
  }

  // Finds the one row and one column that each contain 3 match cells —
  // these are the two arms of the L or T shape that get fully cleared.
  private findLTClearLines(match: MatchResult): Position {
    const rowCounts = new Map<number, number>();
    const colCounts = new Map<number, number>();
    for (const { row, col } of match.matchCells) {
      rowCounts.set(row, (rowCounts.get(row) ?? 0) + 1);
      colCounts.set(col, (colCounts.get(col) ?? 0) + 1);
    }
    const clearRow = [...rowCounts.entries()].find(([, n]) => n === 3)?.[0] ?? match.matchCells[0].row;
    const clearCol = [...colCounts.entries()].find(([, n]) => n === 3)?.[0] ?? match.matchCells[0].col;
    return { row: clearRow, col: clearCol };
  }

  // Deduplicate all cells across all matches (matchCells + bonusCells)
  private collectAllCells(matches: MatchResult[]): Position[] {
    const seen = new Set<string>();
    const out: Position[] = [];
    for (const match of matches) {
      for (const pos of match.cells) {
        const key = `${pos.row},${pos.col}`;
        if (!seen.has(key)) { seen.add(key); out.push(pos); }
      }
    }
    return out;
  }

  // Instantly hide the bonus-zone sprites with no animation.
  // Placeholder for future missile / power-clear animations.
  private hideBonusCells(matches: MatchResult[]): void {
    const seen = new Set<string>();
    for (const match of matches) {
      for (const pos of match.bonusCells) {
        const key = `${pos.row},${pos.col}`;
        if (seen.has(key)) continue;
        seen.add(key);
        this.gridDisplay.getSprite(pos.row, pos.col)?.setVisible(false);
      }
    }
  }

  // Fire particle explosions on the SHAPE cells only (non-blocking).
  private fireExplosions(matches: MatchResult[]): void {
    const seen = new Set<string>();
    for (const match of matches) {
      for (const pos of match.matchCells) {          // ← matchCells only
        const key = `${pos.row},${pos.col}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const sprite = this.gridDisplay.getSprite(pos.row, pos.col);
        if (!sprite) continue;
        explosionAnim.playForType(this, sprite.x, sprite.y, sprite.rocketType);
      }
    }
  }

  // Shrink SHAPE sprites to zero (pop effect) — bonus cells are already hidden
  private animatePop(matches: MatchResult[]): Promise<void> {
    const seen = new Set<string>();
    const sprites: NonNullable<ReturnType<GridDisplay['getSprite']>>[] = [];

    for (const match of matches) {
      for (const pos of match.matchCells) {          // ← matchCells only
        const key = `${pos.row},${pos.col}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const sprite = this.gridDisplay.getSprite(pos.row, pos.col);
        if (sprite) sprites.push(sprite);
      }
    }

    if (sprites.length === 0) return Promise.resolve();

    return new Promise<void>((resolve) => {
      let done = 0;
      for (const sprite of sprites) {
        this.tweens.add({
          targets: sprite,
          scaleX: 0, scaleY: 0,
          duration: 180,
          ease: 'Back.In',
          onComplete: () => { if (++done === sprites.length) resolve(); },
        });
      }
    });
  }

  // Tween each moved sprite from its old row to its new row after gravity
  private animateFalling(movements: Position[][]): Promise<void> {
    if (movements.length === 0) return Promise.resolve();

    return new Promise<void>((resolve) => {
      let done = 0;
      const total = movements.length;

      for (const move of movements) {
        const from = move[0] as Position;
        const to   = move[1] as Position;
        const sprite = this.gridDisplay.getSprite(from.row, from.col);
        if (!sprite) { if (++done === total) resolve(); continue; }

        // Update array mapping first, then tween the visual position
        this.gridDisplay.moveSpriteEntry(from, to);
        this.tweens.add({
          targets: sprite,
          y: this.gridDisplay.rowToY(to.row),
          duration: FALL_DURATION,
          ease: 'Power2',
          onComplete: () => { if (++done === total) resolve(); },
        });
      }
    });
  }

  // Create new sprites above the canvas and tween them down to their final rows
  private animateEntering(newCells: { position: Position; type: RocketType }[]): Promise<void> {
    if (newCells.length === 0) return Promise.resolve();

    // Track how many new cells per column so each one starts at a different height
    const colCount = new Map<number, number>();

    return new Promise<void>((resolve) => {
      let done = 0;
      for (const { position, type } of newCells) {
        const { row, col } = position;
        const idx = colCount.get(col) ?? 0;
        colCount.set(col, idx + 1);

        // Each successive new cell in a column starts one cell further above the canvas
        const startY = this.gridDisplay.rowToY(0) - (idx + 1) * CELL_SIZE;
        const finalY = this.gridDisplay.rowToY(row);

        const sprite = this.gridDisplay.addSpriteAt(this, row, col, type, startY);
        // DO NOT call setScale(1) here — addSpriteAt creates a fresh RocketSprite
        // whose constructor already called setDisplaySize(SHIP_SIZE, SHIP_SIZE).
        // Calling setScale(1) would override that and render the sprite at 2048×2048.

        this.tweens.add({
          targets: sprite,
          y: finalY,
          duration: FALL_DURATION,
          ease: 'Power2',
          onComplete: () => { if (++done === newCells.length) resolve(); },
        });
      }
    });
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private pixelToCell(x: number, y: number): Position | null {
    const originX = (this.scale.width  - GRID_COLS * CELL_SIZE) / 2;
    const originY = (this.scale.height - GRID_ROWS * CELL_SIZE) / 2;
    const col = Math.floor((x - originX) / CELL_SIZE);
    const row = Math.floor((y - originY) / CELL_SIZE);
    if (!this.grid.isValidPosition(row, col)) return null;
    return { row, col };
  }
}
