class EndScene extends Phaser.Scene {
  constructor() {
    super('End');
  }

  init(data) {
    this.won = data.won || false;
    this.stats = data.stats || {};
    this.day = data.day || 1;
    this.deathNote = data.deathNote || null;
    this.journal = data.journal || null;
  }

  create() {
    const { width, height } = this.cameras.main;

    if (typeof MusicManager !== 'undefined') {
      MusicManager.crossfade(this, 'music_outro', 1000);
    } else {
      if (this.sound.get('music_game')) this.sound.stopByKey('music_game');
      if (this.sound.get('music_intro')) this.sound.stopByKey('music_intro');
      if (this.sound.get('music_outro') && !this.sound.isPlaying('music_outro')) {
        const ovol = (typeof QualityTier !== 'undefined') ? QualityTier.musicVol() : 0.32;
        this.sound.play('music_outro', { loop: true, volume: ovol });
      }
    }

    if (this.won) {
      this.add.rectangle(width / 2, height / 2, width, height, 0x0a0c12);

      this.add.text(width / 2, 55, 'GOLDEN', {
        fontFamily: 'Georgia, serif', fontSize: '36px', color: '#ffd700',
        stroke: '#000', strokeThickness: 6
      }).setOrigin(0.5);
      this.add.text(width / 2, 95, 'BOUFFANT', {
        fontFamily: 'Georgia, serif', fontSize: '36px', color: '#ffd700',
        stroke: '#000', strokeThickness: 6
      }).setOrigin(0.5);

      {
        const wa = (typeof SpriteAtlas !== 'undefined') ? SpriteAtlas.args('kraig_win') : ['kraig_win'];
        this.add.image(width / 2, 185, wa[0], wa[1]).setDisplaySize(110, 130).setOrigin(0.5);
      }

      this.add.text(width / 2, 275, 'YOU DID IT, KRAIG!', {
        fontFamily: 'Georgia, serif', fontSize: '22px', color: '#f5e6c8'
      }).setOrigin(0.5);

      this.add.text(width / 2, 340,
        "The Golden Bouffant is yours.\nFor one perfect moment, the house dress\nlooks intentional.\n\nThen the day ends… and the search begins again.",
        {
          fontFamily: 'Georgia, serif', fontSize: '14px', color: '#c9b896',
          align: 'center', lineSpacing: 4
        }
      ).setOrigin(0.5);

      
      let winNote = this.deathNote;
      if (!winNote && typeof Journal !== 'undefined') {
        if (this.journal) Journal.restore(this.journal);
        winNote = Journal.buildDeathNote({ won: true, stats: this.stats, day: this.day });
      }
      if (winNote) {
        this.add.rectangle(width / 2, height * 0.58, width - 36, 160, 0x0a0806, 0.85)
          .setStrokeStyle(1, 0x8b7355).setDepth(3);
        this.add.text(width / 2, height * 0.58, winNote, {
          fontFamily: 'Courier New', fontSize: '11px', color: '#d4c4a8',
          align: 'left', lineSpacing: 3, wordWrap: { width: width - 56 }
        }).setOrigin(0.5).setDepth(4);
      }

const btn = this.add.rectangle(width / 2, height - 55, 260, 48, 0xc9a227)
        .setStrokeStyle(2, 0xffd700)
        .setInteractive({ useHandCursor: true });
      this.add.text(width / 2, height - 55, 'REPLAY ADVENTURE', {
        fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1a1208'
      }).setOrigin(0.5);
      btn.on('pointerdown', () => this.goTitle());

    } else {
      const Q = (typeof QualityTier !== 'undefined') ? QualityTier.get() : { videoEnabled: true };
      if (Q.videoEnabled) {
        const deathKeys = ['death1', 'death2', 'death3'];
        const pick = deathKeys[Math.floor(Math.random() * deathKeys.length)];
        this.bgVideo = this.add.video(width / 2, height / 2, pick);
        this.bgVideo.setDisplaySize(width, height);
        this.bgVideo.setDepth(0);
        this.bgVideo.setMute(true);
        this.bgVideo.play(true);
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5).setDepth(1);
      } else {
        this.add.rectangle(width / 2, height / 2, width, height, 0x0a0c12).setDepth(0);
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4).setDepth(1);
      }

      this.add.text(width / 2, 50, 'YOU DIED', {
        fontFamily: 'Georgia, serif', fontSize: '40px', color: '#c0392b',
        stroke: '#000', strokeThickness: 8
      }).setOrigin(0.5).setDepth(3);

      this.add.text(width / 2, 100, 'GOLDEN BOUFFANT', {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#8b7355'
      }).setOrigin(0.5).setDepth(3);

      let note = this.deathNote;
      if (!note && typeof Journal !== 'undefined') {
        if (this.journal) Journal.restore(this.journal);
        note = Journal.buildDeathNote({ won: false, stats: this.stats, day: this.day });
      }
      if (!note) {
        const days = (typeof this.stats.daysSurvived === 'number')
          ? this.stats.daysSurvived.toFixed(1) : (this.stats.daysSurvived || this.day);
        note = 'FIELD REPORT — DECEASED\nDay ' + this.day + ' ended badly.\nDays survived: ' + days;
      }
      this.add.rectangle(width / 2, height * 0.50, width - 32, 270, 0x0a0806, 0.9)
        .setStrokeStyle(1, 0x5c3030)
        .setDepth(3);
      this.add.text(width / 2, height * 0.50, note, {
          fontFamily: 'Courier New', fontSize: '11px', color: '#c9b896',
          align: 'left', lineSpacing: 3, wordWrap: { width: width - 56 }
        }
      ).setOrigin(0.5).setDepth(4)

      this.add.text(width / 2, height - 115, 'The city spits him back out.', {
        fontFamily: 'Georgia, serif', fontSize: '14px', color: '#a09080', fontStyle: 'italic'
      }).setOrigin(0.5).setDepth(3);

      const btn = this.add.rectangle(width / 2, height - 55, 220, 48, 0x5c3030)
        .setStrokeStyle(2, 0x8b5050)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);
      this.add.text(width / 2, height - 55, 'TRY AGAIN', {
        fontFamily: 'Georgia, serif', fontSize: '18px', color: '#e8d8c0'
      }).setOrigin(0.5).setDepth(6);
      btn.on('pointerdown', () => this.goTitle());
    }

    this.input.keyboard.once('keydown-ENTER', () => this.goTitle());
    this.input.keyboard.once('keydown-SPACE', () => this.goTitle());
  }

  goTitle() {
    if (this.bgVideo) this.bgVideo.stop();
    if (typeof MusicManager !== 'undefined') {
      MusicManager.fadeOut(this, 'music_outro', 500, () => this.scene.start('Title'));
      // Don't block forever if fade fails
      this.time.delayedCall(600, () => {
        if (this.scene.isActive('End')) this.scene.start('Title');
      });
    } else {
      if (this.sound.get('music_outro')) this.sound.stopByKey('music_outro');
      this.scene.start('Title');
    }
  }

  shutdown() {
    if (this.bgVideo) this.bgVideo.stop();
  }
}
