import Phaser from 'phaser';
import { RocketType } from '../../types';

// Shared color map — also used by BeamAnim for the beam glow colour
export const ROCKET_COLORS: Record<RocketType, number> = {
  [RocketType.RED]:    0xe74c3c,
  [RocketType.BLUE]:   0x3498db,
  [RocketType.GREEN]:  0x2ecc71,
  [RocketType.YELLOW]: 0xf1c40f,
  [RocketType.PURPLE]: 0x9b59b6,
};

// Texture key for the small white circle used as a particle sprite
const SPARK_KEY = 'particle_spark';

export class ExplosionAnim {
  // Generate a tiny white circle texture once per game session.
  // Must be white so Phaser's tint system can colorise it correctly.
  private ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(SPARK_KEY)) return;
    const gfx = scene.make.graphics({ x: 0, y: 0 }, false);
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(6, 6, 6); // radius 6 → 12×12 texture
    gfx.generateTexture(SPARK_KEY, 12, 12);
    gfx.destroy();
  }

  // Burst 12 coloured sparks outward from (x, y) and auto-destroy after ~500ms.
  // This is fire-and-forget — do NOT await it; it runs independently.
  play(scene: Phaser.Scene, x: number, y: number, color: number, onComplete?: () => void): void {
    this.ensureTexture(scene);

    const emitter = scene.add.particles(x, y, SPARK_KEY, {
      speed:    { min: 60, max: 200 },
      angle:    { min: 0, max: 360 },
      scale:    { start: 0.9, end: 0 },
      alpha:    { start: 1, end: 0 },
      lifespan: 400,
      tint:     color,
      quantity: 12,
      emitting: false, // start dormant — explode() fires the one-shot burst
    });

    // Render above sprites (depth 0) and highlight rects (depth 10)
    emitter.setDepth(20);

    // Fire all 12 particles at once from the emitter's position
    emitter.explode(12);

    // Clean up the emitter after all particles have faded
    scene.time.delayedCall(520, () => {
      if (emitter.active) emitter.destroy();
      onComplete?.();
    });
  }

  // Convenience wrapper: look up the hex color from a RocketType automatically
  playForType(scene: Phaser.Scene, x: number, y: number, type: RocketType, onComplete?: () => void): void {
    this.play(scene, x, y, ROCKET_COLORS[type], onComplete);
  }
}

export const explosionAnim = new ExplosionAnim();
