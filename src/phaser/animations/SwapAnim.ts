import Phaser from 'phaser';
import type { RocketSprite } from '../objects/RocketSprite';

export class SwapAnim {
  // Tween both sprites to each other's positions simultaneously.
  // Resolves when both tweens complete.
  playSwap(
    scene: Phaser.Scene,
    s1: RocketSprite,
    s2: RocketSprite,
    duration: number,
  ): Promise<void> {
    const x1 = s1.x; const y1 = s1.y;
    const x2 = s2.x; const y2 = s2.y;

    return new Promise<void>((resolve) => {
      let done = 0;
      const check = (): void => { if (++done === 2) resolve(); };

      scene.tweens.add({ targets: s1, x: x2, y: y2, duration, ease: 'Power2', onComplete: check });
      scene.tweens.add({ targets: s2, x: x1, y: y1, duration, ease: 'Power2', onComplete: check });
    });
  }

  // Tween both sprites toward each other's positions, then back (yoyo),
  // then flash them red briefly to signal an invalid move.
  playInvalidSwap(
    scene: Phaser.Scene,
    s1: RocketSprite,
    s2: RocketSprite,
    duration: number,
  ): Promise<void> {
    const x1 = s1.x; const y1 = s1.y;
    const x2 = s2.x; const y2 = s2.y;
    const half = duration / 2;

    return new Promise<void>((resolve) => {
      let done = 0;
      const flash = (sprite: RocketSprite): void => {
        sprite.setTint(0xff4444); // red flash
        scene.time.delayedCall(100, () => { // 100 ms is enough to register on touch
          sprite.clearTint();
          if (++done === 2) resolve();
        });
      };

      // yoyo: true makes Phaser reverse the tween automatically, snapping back
      scene.tweens.add({
        targets: s1, x: x2, y: y2,
        duration: half, ease: 'Power2', yoyo: true,
        onComplete: () => flash(s1),
      });
      scene.tweens.add({
        targets: s2, x: x1, y: y1,
        duration: half, ease: 'Power2', yoyo: true,
        onComplete: () => flash(s2),
      });
    });
  }
}

export const swapAnim = new SwapAnim();
