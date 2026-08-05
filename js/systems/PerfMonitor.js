/**
 * Lightweight performance monitor for Golden Bouffant.
 * Tracks FPS, frame time, entity counts, optional memory.
 * Use PerfMonitor.sample(scene, delta) each frame; read snapshot via get().
 */
const PerfMonitor = {
  enabled: true,
  logEveryMs: 5000, // console summary interval (0 = off)
  _lastLog: 0,
  _bootMs: 0,

  fps: 0,
  frameMs: 0,
  frameMsMin: 999,
  frameMsMax: 0,
  frameMsAvg: 0,

  _fpsAccum: 0,
  _fpsFrames: 0,
  _ftAccum: 0,
  _ftCount: 0,
  _ftWindowStart: 0,

  enemies: 0,
  pickups: 0,
  bodies: 0,
  tier: '?',

  heapMB: null,
  heapLimitMB: null,

  spikes: 0, // frames over 50ms
  lowFpsHits: 0,

  init() {
    this._bootMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    this._lastLog = this._bootMs;
    this._ftWindowStart = this._bootMs;
    this.frameMsMin = 999;
    this.frameMsMax = 0;
    this.spikes = 0;
    this.lowFpsHits = 0;
    if (typeof GBLog === 'function') GBLog('Perf', 'init');
    else if (typeof console !== 'undefined') console.log('[Perf] init');
  },

  /**
   * @param {Phaser.Scene} scene
   * @param {number} delta - ms since last frame (Phaser update delta)
   */
  sample(scene, delta) {
    if (!this.enabled) return;
    if (!this._bootMs) this.init();

    const d = Math.max(0, delta || 16);
    this.frameMs = Math.round(d * 10) / 10;
    if (d < this.frameMsMin) this.frameMsMin = Math.round(d * 10) / 10;
    if (d > this.frameMsMax) this.frameMsMax = Math.round(d * 10) / 10;
    if (d > 50) this.spikes++;

    this._fpsAccum += d;
    this._fpsFrames++;
    this._ftAccum += d;
    this._ftCount++;

    if (this._fpsAccum >= 500) {
      this.fps = Math.round((this._fpsFrames * 1000) / this._fpsAccum);
      this.frameMsAvg = Math.round((this._ftAccum / Math.max(1, this._ftCount)) * 10) / 10;
      this._fpsAccum = 0;
      this._fpsFrames = 0;
      this._ftAccum = 0;
      this._ftCount = 0;
      if (this.fps && this.fps < 26) this.lowFpsHits++;
    }

    // Entity counts (cheap)
    try {
      if (scene) {
        if (scene.enemies && scene.enemies.getChildren) {
          this.enemies = scene.enemies.countActive(true);
        }
        if (scene.pickups && scene.pickups.getChildren) {
          this.pickups = scene.pickups.countActive(true);
        }
        if (scene.physics && scene.physics.world && scene.physics.world.bodies) {
          this.bodies = scene.physics.world.bodies.size || 0;
        }
      }
    } catch (e) {}

    if (typeof QualityTier !== 'undefined') {
      this.tier = QualityTier.current || QualityTier.getTierName?.() || '?';
    }

    // Memory (Chrome only)
    try {
      if (typeof performance !== 'undefined' && performance.memory) {
        this.heapMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
        this.heapLimitMB = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
      }
    } catch (e) {}

    // Periodic console summary
    if (this.logEveryMs > 0) {
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      if (now - this._lastLog >= this.logEveryMs) {
        this._lastLog = now;
        this._logSummary();
      }
    }
  },

  _logSummary() {
    const mem = this.heapMB != null ? (` heap=${this.heapMB}/${this.heapLimitMB}MB`) : '';
    const msg = `fps=${this.fps} ft=${this.frameMs}ms (min ${this.frameMsMin}/avg ${this.frameMsAvg}/max ${this.frameMsMax}) enemies=${this.enemies} pickups=${this.pickups} bodies=${this.bodies} tier=${this.tier} spikes=${this.spikes}${mem}`;
    if (typeof GBLog === 'function') GBLog('Perf', msg);
    else if (typeof console !== 'undefined') console.log('[Perf]', msg);
    // Reset min/max window each log period
    this.frameMsMin = 999;
    this.frameMsMax = 0;
    this.spikes = 0;
  },

  /** Snapshot for UI */
  get() {
    return {
      fps: this.fps,
      frameMs: this.frameMs,
      frameMsMin: this.frameMsMin === 999 ? 0 : this.frameMsMin,
      frameMsMax: this.frameMsMax,
      frameMsAvg: this.frameMsAvg,
      enemies: this.enemies,
      pickups: this.pickups,
      bodies: this.bodies,
      tier: this.tier,
      heapMB: this.heapMB,
      spikes: this.spikes,
      lowFpsHits: this.lowFpsHits
    };
  },

  /** One-line HUD string */
  hudLine() {
    const s = this.get();
    let line = (s.fps || '…') + ' FPS';
    if (s.frameMsAvg) line += ' · ' + s.frameMsAvg + 'ms';
    line += ' · ' + String(s.tier || '?').toUpperCase();
    if (s.enemies) line += ' · e' + s.enemies;
    if (s.heapMB != null) line += ' · ' + s.heapMB + 'MB';
    return line;
  },

  setLogging(ms) {
    this.logEveryMs = Math.max(0, ms | 0);
  },

  reset() {
    this.frameMsMin = 999;
    this.frameMsMax = 0;
    this.spikes = 0;
    this.lowFpsHits = 0;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
  }
};
