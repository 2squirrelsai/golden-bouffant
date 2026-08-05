const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  // Prefer discrete GPU when available (Chrome / some Android)
  powerPreference: 'high-performance',
  // Slightly fewer backbuffer headaches on mobile
  antialias: false,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, TitleScene, GameScene, UIScene, EndScene],
  input: {
    activePointers: 3
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
    smoothStep: true
  },
  render: {
    powerPreference: 'high-performance',
    antialias: false,
    roundPixels: true,
    batchSize: 2048
  }
};

window.addEventListener('load', () => {
  window.__gbGame = new Phaser.Game(config);
});
