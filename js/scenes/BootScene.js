class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.cameras.main.setBackgroundColor(0x0a0c10);

    // Title
    this.add.text(w / 2, h * 0.28, 'GOLDEN BOUFFANT', {
      fontFamily: 'Georgia, serif', fontSize: '28px', color: '#c9a227',
      stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.28 + 32, 'LOADING…', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#8b7355',
      letterSpacing: 3
    }).setOrigin(0.5);

    // Progress track
    const barW = Math.min(280, w - 48);
    const barH = 18;
    const barX = w / 2;
    const barY = h * 0.48;

    this.add.rectangle(barX, barY, barW + 8, barH + 8, 0x1a1208)
      .setStrokeStyle(2, 0x5c4033);
    this.add.rectangle(barX, barY, barW, barH, 0x2a1a10);

    this.loadFill = this.add.rectangle(barX - barW / 2 + 2, barY, 4, barH - 4, 0xc9a227)
      .setOrigin(0, 0.5);

    this.loadPct = this.add.text(barX, barY + 28, '0%', {
      fontFamily: 'Courier New', fontSize: '14px', color: '#e8d8b0'
    }).setOrigin(0.5);

    this.loadFile = this.add.text(barX, barY + 50, '', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#6a5a48'
    }).setOrigin(0.5);

    this.load.on('progress', (v) => {
      const inner = barW - 4;
      this.loadFill.width = Math.max(4, inner * v);
      this.loadPct.setText(Math.floor(v * 100) + '%');
    });

    this.load.on('fileprogress', (file) => {
      if (file && file.key) {
        let label = file.key;
        if (label.length > 28) label = label.slice(0, 26) + '…';
        this.loadFile.setText(label);
      }
    });

    this.load.on('complete', () => {
      this.loadPct.setText('100%');
      this.loadFile.setText('READY');
    });

    // Assets
    this.load.image('kraig', 'assets/sprites/style_c/kraig.png');
    this.load.image('kraig_walk', 'assets/sprites/style_c/kraig.png');
    this.load.image('kraig_punch', 'assets/sprites/style_c/kraig_punch.png');
    this.load.image('kraig_weapon', 'assets/sprites/style_c/kraig_weapon.png');
    this.load.image('kraig_wig_yellow', 'assets/sprites/style_c/kraig_wig_yellow.png');
    this.load.image('kraig_wig_golden', 'assets/sprites/style_c/kraig_wig_golden.png');
    this.load.image('kraig_wig_punch', 'assets/sprites/style_c/kraig_wig_punch.png');
    this.load.image('kraig_wig_weapon', 'assets/sprites/style_c/kraig_wig_weapon.png');
    this.load.image('kraig_dead', 'assets/sprites/style_c/kraig_dead.png');
    this.load.image('kraig_win', 'assets/sprites/style_c/kraig_win.png');
    this.load.image('raccoon', 'assets/sprites/style_c/raccoon.png');
    this.load.image('pirate', 'assets/sprites/style_c/pirate.png');
    this.load.image('boss', 'assets/sprites/style_c/boss.png');
    this.load.image('wig_yellow', 'assets/sprites/style_c/wig_yellow.png');
    this.load.image('golden_bouffant', 'assets/sprites/style_c/golden_bouffant.png');
    this.load.image('weapon', 'assets/sprites/style_c/weapon.png');
    this.load.image('food_candy', 'assets/sprites/style_c/food_candy.png');
    this.load.image('food_rotting', 'assets/sprites/style_c/food_rotting.png');

    // Per-wig-color player sprites (idle / punch / weapon)
    ['red','blue','green','purple','silver','pink','orange','black','rainbow'].forEach(c => {
      this.load.image('kraig_wig_' + c, 'assets/sprites/style_c/kraig_wig_' + c + '.png');
      this.load.image('kraig_wig_' + c + '_punch', 'assets/sprites/style_c/kraig_wig_' + c + '_punch.png');
      this.load.image('kraig_wig_' + c + '_weapon', 'assets/sprites/style_c/kraig_wig_' + c + '_weapon.png');
      this.load.image('wig_' + c, 'assets/sprites/style_c/wig_' + c + '.png');
    });
    this.load.image('kraig_wig_golden_punch', 'assets/sprites/style_c/kraig_wig_golden_punch.png');
    this.load.image('kraig_wig_golden_weapon', 'assets/sprites/style_c/kraig_wig_golden_weapon.png');


    this.load.audio('sfx_punch', 'assets/audio/punch.wav');
    this.load.audio('sfx_whiff', 'assets/audio/whiff.wav');
    this.load.audio('sfx_hit', 'assets/audio/hit.wav');
    this.load.audio('music_intro', ['assets/audio/music_intro.ogg', 'assets/audio/music_intro.mp3']);
    this.load.audio('music_game', ['assets/audio/music_game.ogg', 'assets/audio/music_game.mp3']);
    this.load.audio('music_outro', ['assets/audio/music_outro.ogg', 'assets/audio/music_outro.mp3']);

    // Videos optional for Phaser cache (HTML handles intro)
    this.load.video('intro_loop', 'assets/video/intro_loop.mp4');
    this.load.video('death1', 'assets/video/death1.mp4');
    this.load.video('death2', 'assets/video/death2.mp4');
    this.load.video('death3', 'assets/video/death3.mp4');
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const Q = (typeof QualityTier !== 'undefined') ? QualityTier : null;
    if (Q) {
      this.add.text(w / 2, h - 36, 'Quality: ' + Q.get().label, {
        fontFamily: 'Courier New', fontSize: '11px', color: '#666'
      }).setOrigin(0.5);
    }
    try {
      if (typeof SpriteAtlas !== 'undefined') {
        SpriteAtlas.pack(this, SpriteAtlas.defaultKeys());
      }
    } catch (e) { console.warn('atlas', e); }
    this.time.delayedCall(180, () => this.scene.start('Title'));
  }
}
