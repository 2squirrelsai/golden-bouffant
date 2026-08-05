class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    GBLog('Title', 'create');
    this.starting = false;
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0c10);

    if (window.GBTitle) {
      window.GBTitle.onStart = () => this.beginRun();
      window.GBTitle.show();
    }

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ENTER', () => this.beginRun());
      this.input.keyboard.on('keydown-SPACE', () => this.beginRun());
    }
  }

  /** Unlock WebAudio + start intro bed (must be in user gesture path). */
  unlockAudio() {
    GBLog('Title', 'unlockAudio');
    try {
      if (this.sound) {
        GBLog('Title', 'sound context state:', this.sound.context ? this.sound.context.state : 'no-context');
        if (this.sound.context && this.sound.context.state === 'suspended') {
          this.sound.context.resume().then(() => GBLog('Title', 'context resumed')).catch(e => GBLog.warn('Title', 'resume fail', e));
        }
        if (typeof this.sound.unlock === 'function') this.sound.unlock();
      } else {
        GBLog.warn('Title', 'no this.sound');
      }
    } catch (e) { GBLog.warn('Title', 'unlock error', e); }

    try {
      if (typeof NoiseSynth !== 'undefined') {
        NoiseSynth.bindPhaser(this);
        NoiseSynth.resume();
      }
    } catch (e) {}

    // Intro music — play immediately on the tap that starts the run
    try {
      const hasIntro = this.cache.audio.exists('music_intro');
      GBLog('Title', 'music_intro in cache:', hasIntro);
      if (typeof MusicManager !== 'undefined') {
        GBLog('Title', 'MusicManager.fadeIn music_intro');
        MusicManager.fadeIn(this, 'music_intro', 200);
      } else if (hasIntro) {
        if (!this.sound.isPlaying('music_intro')) {
          GBLog('Title', 'direct play music_intro');
          this.sound.play('music_intro', { loop: true, volume: 0.32 });
        }
      } else {
        GBLog.warn('Title', 'music_intro NOT in cache');
      }
    } catch (e) {
      GBLog.warn('Title', 'intro music error', e);
    }
  }

  beginRun() {
    GBLog('Title', 'beginRun starting=', this.starting);
    if (this.starting) return;
    this.starting = true;

    this.unlockAudio();

    if (window.GBTitle) window.GBTitle.hide();
    if (window.GBLoader) window.GBLoader.show('BUILDING CITY…');
    GBLog('Title', 'overlays hidden/shown, launching Game + UI');

    // Ensure Phaser canvas is visible above overlays
    try {
      const canvas = this.game.canvas;
      if (canvas) {
        canvas.style.visibility = 'visible';
        canvas.style.opacity = '1';
        canvas.style.display = 'block';
        canvas.style.zIndex = '40';
      }
      const container = document.getElementById('game-container');
      if (container) {
        container.style.zIndex = '40';
        container.style.visibility = 'visible';
      }
    } catch (e) {}

    // Do NOT stop intro here — GameScene crossfades to music_game
    GBLog('Title', 'scene.start(Game) + launch(UI)');
    this.scene.start('Game');
    this.scene.launch('UI');
    GBLog('Title', 'Game active?', this.scene.isActive('Game'), 'UI active?', this.scene.isActive('UI'));

    // Failsafe: never leave loader stuck
    setTimeout(function () {
      try { if (window.GBLoader) window.GBLoader.hide(); } catch (e) {}
    }, 10000);
  }

  shutdown() {
    if (window.GBTitle) {
      window.GBTitle.hide();
      window.GBTitle.onStart = null;
    }
  }
}
