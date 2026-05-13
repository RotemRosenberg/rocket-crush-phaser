import Phaser from 'phaser';
import { RocketType } from '../../types';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Load each rocket PNG — backgrounds are already transparent (see scripts/remove-bg.mjs)
    for (const type of Object.values(RocketType) as RocketType[]) {
      this.load.image(`rocket_${type}`, `assets/rocket_${type}.png`);
    }
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
