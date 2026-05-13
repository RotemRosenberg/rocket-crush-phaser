import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../config/gameConfig';

export default function PhaserGame() {
  // useRef persists the Phaser.Game instance across renders without triggering re-renders
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Only create one game instance even in React Strict Mode (which runs effects twice in dev)
    if (gameRef.current) return;
    gameRef.current = new Phaser.Game(gameConfig);

    // Destroy Phaser cleanly when the component unmounts (e.g. navigating away)
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []); // empty array = run once on mount

  // The div is the anchor point; Phaser injects its <canvas> inside it
  return <div id="phaser-container" style={{ width: '100%', height: '100%' }} />;
}
