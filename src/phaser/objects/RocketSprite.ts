import Phaser from 'phaser';
import { RocketType } from '../../types';
import { CELL_SIZE } from '../../config/constants';

// Ship display size — slightly smaller than the full cell to leave a visible gap
const SHIP_SIZE = CELL_SIZE - 6; // 6px total gap keeps ships from touching cell edges

export class RocketSprite extends Phaser.GameObjects.Image {
  row: number;
  col: number;
  rocketType: RocketType;

  private highlightRect: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    row: number,
    col: number,
    type: RocketType,
  ) {
    super(scene, x, y, `rocket_${type}`);
    this.row = row;
    this.col = col;
    this.rocketType = type;

    // Scale the large source texture (2048×2048) down to fit inside the cell
    this.setDisplaySize(SHIP_SIZE, SHIP_SIZE);

    scene.add.existing(this);

    // White selection border, sized to match the ship display size
    this.highlightRect = scene.add.rectangle(x, y, SHIP_SIZE + 4, SHIP_SIZE + 4, 0, 0);
    this.highlightRect.setStrokeStyle(3, 0xffffff, 1);
    this.highlightRect.setDepth(10);
    this.highlightRect.setVisible(false);
  }

  setHighlight(on: boolean): void {
    this.highlightRect.setPosition(this.x, this.y);
    this.highlightRect.setVisible(on);
  }

  destroy(fromScene?: boolean): void {
    this.highlightRect.destroy();
    super.destroy(fromScene);
  }
}
