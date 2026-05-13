import Phaser from 'phaser';
import type { Position } from '../../types';
import type { GridDisplay } from '../objects/GridDisplay';
import { GRID_ROWS, GRID_COLS } from '../../config/constants';
import { explosionAnim } from './ExplosionAnim';

export class BeamAnim {
  // ── Line-4 Beam ──────────────────────────────────────────────────────────────

  /**
   * Shoots a glowing light beam from `startPos` in both directions simultaneously.
   * Each cell in `cells` disappears as the beam front reaches it.
   * Resolves when the beam finishes travelling (gravity can start immediately after).
   */
  playBeamClear(
    scene: Phaser.Scene,
    startPos: Position,
    direction: 'horizontal' | 'vertical',
    cells: Position[],
    color: number,
    gridDisplay: GridDisplay,
    duration = 400,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const startX = gridDisplay.colToX(startPos.col);
      const startY = gridDisplay.rowToY(startPos.row);

      const leftX   = gridDisplay.colToX(0);
      const rightX  = gridDisplay.colToX(GRID_COLS - 1);
      const topY    = gridDisplay.rowToY(0);
      const bottomY = gridDisplay.rowToY(GRID_ROWS - 1);

      const maxDist = direction === 'horizontal'
        ? Math.max(startPos.col, GRID_COLS - 1 - startPos.col)
        : Math.max(startPos.row, GRID_ROWS - 1 - startPos.row);

      for (const pos of cells) {
        const dist = direction === 'horizontal'
          ? Math.abs(pos.col - startPos.col)
          : Math.abs(pos.row - startPos.row);
        const delay = maxDist > 0 ? (dist / maxDist) * duration : 0;
        scene.time.delayedCall(delay, () => {
          gridDisplay.getSprite(pos.row, pos.col)?.setVisible(false);
        });
      }

      const state = { t: 0 };
      const gfx   = scene.add.graphics();
      gfx.setDepth(15);

      scene.tweens.add({
        targets:  state,
        t:        1,
        duration,
        ease:     'Linear',
        onUpdate: () => {
          gfx.clear();
          const t = state.t;
          let x1: number, y1: number, x2: number, y2: number;

          if (direction === 'horizontal') {
            x1 = startX - t * (startX - leftX);
            x2 = startX + t * (rightX  - startX);
            y1 = y2 = startY;
          } else {
            x1 = x2 = startX;
            y1 = startY - t * (startY - topY);
            y2 = startY + t * (bottomY - startY);
          }

          gfx.lineStyle(42, color, 0.10);
          gfx.lineBetween(x1, y1, x2, y2);
          gfx.lineStyle(16, color, 0.40);
          gfx.lineBetween(x1, y1, x2, y2);
          gfx.lineStyle(4, 0xffffff, 0.95);
          gfx.lineBetween(x1, y1, x2, y2);
        },
        onComplete: () => {
          scene.tweens.add({
            targets:    gfx,
            alpha:      0,
            duration:   130,
            onComplete: () => gfx.destroy(),
          });
          resolve();
        },
      });
    });
  }

  // ── Line-5 Nova Explosion ────────────────────────────────────────────────────

  /**
   * Clears the entire board with an expanding shockwave.
   * Cells are grouped into 9 wave-rings by distance from the grid centre (3.5, 3.5).
   * Each ring pops 60 ms after the previous one — centre first, corners last.
   * Resolves ~690 ms after being called (last ring + pop duration + buffer).
   */
  playNovaExplosion(
    scene: Phaser.Scene,
    cells: Position[],
    gridDisplay: GridDisplay,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const centerX = (gridDisplay.colToX(3) + gridDisplay.colToX(4)) / 2;
      const centerY = (gridDisplay.rowToY(3) + gridDisplay.rowToY(4)) / 2;

      // Group cells by rounded distance from centre → wave rings
      const groups = new Map<number, Position[]>();
      for (const pos of cells) {
        const dist =
          Math.round(Math.sqrt((pos.row - 3.5) ** 2 + (pos.col - 3.5) ** 2) * 10) / 10;
        if (!groups.has(dist)) groups.set(dist, []);
        groups.get(dist)!.push(pos);
      }
      const sortedRings = [...groups.entries()].sort(([a], [b]) => a - b);

      const RING_DELAY   = 60;  // ms between successive rings
      const POP_DURATION = 150; // ms for each cell to scale to zero

      // Schedule each ring
      sortedRings.forEach(([, ring], index) => {
        scene.time.delayedCall(index * RING_DELAY, () => {
          for (const pos of ring) {
            const sprite = gridDisplay.getSprite(pos.row, pos.col);
            if (!sprite || !sprite.visible) continue;
            explosionAnim.playForType(scene, sprite.x, sprite.y, sprite.rocketType);
            scene.tweens.add({
              targets: sprite, scaleX: 0, scaleY: 0,
              duration: POP_DURATION, ease: 'Back.In',
            });
          }
        });
      });

      // Shockwave ring visual
      const totalDuration = (sortedRings.length - 1) * RING_DELAY + POP_DURATION;
      this.animateShockwave(scene, centerX, centerY, gridDisplay, totalDuration);

      // Resolve when the last cell's pop has finished
      scene.time.delayedCall(totalDuration + 60, resolve);
    });
  }

  // Expanding circular shockwave from the grid centre to the corners.
  private animateShockwave(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    gridDisplay: GridDisplay,
    duration: number,
  ): void {
    // Pixel distance from centre to the farthest corner
    const maxRadius = Math.sqrt(Math.max(
      (centerX - gridDisplay.colToX(0))             ** 2 + (centerY - gridDisplay.rowToY(0))             ** 2,
      (centerX - gridDisplay.colToX(GRID_COLS - 1)) ** 2 + (centerY - gridDisplay.rowToY(0))             ** 2,
      (centerX - gridDisplay.colToX(0))             ** 2 + (centerY - gridDisplay.rowToY(GRID_ROWS - 1)) ** 2,
      (centerX - gridDisplay.colToX(GRID_COLS - 1)) ** 2 + (centerY - gridDisplay.rowToY(GRID_ROWS - 1)) ** 2,
    ));

    // Bright flash at the centre
    const flash = scene.add.graphics();
    flash.setDepth(22);
    flash.fillStyle(0xffffff, 0.95);
    flash.fillCircle(centerX, centerY, 50);
    scene.tweens.add({
      targets: flash, alpha: 0, scaleX: 2.5, scaleY: 2.5,
      duration: 280, ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });

    // Expanding ring
    const gfx   = scene.add.graphics();
    gfx.setDepth(18);
    const state = { r: 0 };

    scene.tweens.add({
      targets: state, r: maxRadius, duration, ease: 'Quad.easeOut',
      onUpdate: () => {
        gfx.clear();
        const alpha = 1 - (state.r / maxRadius) * 0.85;
        gfx.lineStyle(36, 0xffd700, alpha * 0.12);
        gfx.strokeCircle(centerX, centerY, state.r);
        gfx.lineStyle(10, 0xffffff, alpha * 0.55);
        gfx.strokeCircle(centerX, centerY, state.r);
        gfx.lineStyle(2.5, 0xffffff, alpha * 0.95);
        gfx.strokeCircle(centerX, centerY, state.r);
      },
      onComplete: () => {
        scene.tweens.add({
          targets: gfx, alpha: 0, duration: 120,
          onComplete: () => gfx.destroy(),
        });
      },
    });
  }
}

export const beamAnim = new BeamAnim();
