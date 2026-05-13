import Phaser from 'phaser';
import { BOARD_WIDTH, BOARD_HEIGHT } from './constants';
import { BootScene } from '../phaser/scenes/BootScene';
import { GameScene } from '../phaser/scenes/GameScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,           // auto-pick WebGL, fall back to Canvas
  width: BOARD_WIDTH,          // 720px (8 cols × 90px)
  height: BOARD_HEIGHT,        // 720px (8 rows × 90px)
  backgroundColor: '#0a0a1a', // deep space dark
  parent: 'phaser-container',  // the div React renders — Phaser puts its canvas inside it

  scene: [BootScene, GameScene],

  scale: {
    mode: Phaser.Scale.FIT,               // scale DOWN on small screens to fit
    autoCenter: Phaser.Scale.CENTER_BOTH, // always centred in the container
    // Never scale UP beyond native resolution — without this, FIT would stretch
    // the 384×384 canvas to fill the entire screen on desktop, making blocks huge.
    max: { width: BOARD_WIDTH, height: BOARD_HEIGHT },
  },

  input: {
    mouse: true,  // desktop click support
    touch: true,  // mobile swipe support
  },
};
