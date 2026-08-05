/**
 * Procedural noise / synth SFX via Web Audio API.
 * Generates combat and UI sounds without sample files.
 */
const NoiseSynth = {
  ctx: null,
  master: null,
  noiseBuffer: null,
  ready: false,
  enabled: true,

  /** Call after a user gesture so AudioContext can run. */
  init(audioContext) {
    try {
      this.ctx = audioContext || (window.AudioContext || window.webkitAudioContext)
        ? new (window.AudioContext || window.webkitAudioContext)()
        : null;
      if (!this.ctx) return false;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      // Soft compressor so peaks don't crackle
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.12;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      this.noiseBuffer = this._makeNoiseBuffer(1.0);
      this.ready = true;
      return true;
    } catch (e) {
      console.warn('NoiseSynth init failed', e);
      this.ready = false;
      return false;
    }
  },

  /** Bind to Phaser's AudioContext when available. */
  bindPhaser(scene) {
    try {
      if (scene && scene.sound && scene.sound.context) {
        this.ctx = scene.sound.context;
        if (!this.master) {
          this.master = this.ctx.createGain();
          this.master.gain.value = 0.7;
          const comp = this.ctx.createDynamicsCompressor();
          comp.threshold.value = -18;
          comp.knee.value = 10;
          comp.ratio.value = 3.5;
          comp.attack.value = 0.003;
          comp.release.value = 0.1;
          this.master.connect(comp);
          comp.connect(this.ctx.destination);
        }
        if (!this.noiseBuffer) this.noiseBuffer = this._makeNoiseBuffer(1.0);
        this.ready = true;
        if (this.ctx.state === 'suspended') this.ctx.resume();
      }
    } catch (e) {
      console.warn('NoiseSynth bindPhaser', e);
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  _vol() {
    if (typeof QualityTier !== 'undefined' && QualityTier.sfxVol) {
      return QualityTier.sfxVol();
    }
    return 0.45;
  },

  _makeNoiseBuffer(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    // White noise
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  },

  _noiseSource(when) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    return src;
  },

  _envGain(peak, attack, decay, when) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
    return g;
  },

  /**
   * Layer: noise burst + optional low osc thump.
   */
  _thump(opts) {
    if (!this.ready || !this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    const vol = this._vol() * (opts.gain || 1);

    // Noise body
    const noise = this._noiseSource();
    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = opts.noiseType || 'bandpass';
    nFilter.frequency.value = opts.noiseFreq || 800;
    nFilter.Q.value = opts.noiseQ || 0.8;
    const nGain = this._envGain(vol * (opts.noiseGain || 0.5), opts.attack || 0.005, opts.decay || 0.08, t);
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.master);
    noise.start(t);
    noise.stop(t + (opts.attack || 0.005) + (opts.decay || 0.08) + 0.02);

    // Low osc thump
    if (opts.oscFreq) {
      const osc = this.ctx.createOscillator();
      osc.type = opts.oscType || 'sine';
      osc.frequency.setValueAtTime(opts.oscFreq, t);
      if (opts.oscSlide) {
        osc.frequency.exponentialRampToValueAtTime(opts.oscSlide, t + (opts.decay || 0.08));
      }
      const oGain = this._envGain(vol * (opts.oscGain || 0.6), 0.004, opts.decay || 0.1, t);
      osc.connect(oGain);
      oGain.connect(this.master);
      osc.start(t);
      osc.stop(t + (opts.decay || 0.1) + 0.03);
    }
  },

  // ---- Public SFX ----
  punch() {
    this._thump({
      noiseFreq: 600, noiseQ: 1.2, noiseGain: 0.55, noiseType: 'bandpass',
      oscFreq: 120, oscSlide: 55, oscGain: 0.7, oscType: 'triangle',
      attack: 0.004, decay: 0.09, gain: 1
    });
  },

  whiff() {
    this._thump({
      noiseFreq: 1800, noiseQ: 0.6, noiseGain: 0.35, noiseType: 'highpass',
      oscFreq: 0, attack: 0.003, decay: 0.06, gain: 0.7
    });
  },

  hit() {
    this._thump({
      noiseFreq: 400, noiseQ: 1.5, noiseGain: 0.45, noiseType: 'lowpass',
      oscFreq: 90, oscSlide: 40, oscGain: 0.8, oscType: 'sine',
      attack: 0.003, decay: 0.11, gain: 1
    });
  },

  hurt() {
    this._thump({
      noiseFreq: 300, noiseQ: 2, noiseGain: 0.5, noiseType: 'bandpass',
      oscFreq: 180, oscSlide: 70, oscGain: 0.55, oscType: 'sawtooth',
      attack: 0.005, decay: 0.14, gain: 0.9
    });
  },

  bossHit() {
    this._thump({
      noiseFreq: 250, noiseQ: 1.8, noiseGain: 0.65, noiseType: 'lowpass',
      oscFreq: 70, oscSlide: 30, oscGain: 0.9, oscType: 'triangle',
      attack: 0.006, decay: 0.18, gain: 1.1
    });
    // second delayed layer
    if (!this.ready) return;
    const t = this.ctx.currentTime + 0.06;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const g = this._envGain(this._vol() * 0.4, 0.01, 0.2, t);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.25);
  },

  ui() {
    if (!this.ready || !this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 660;
    const g = this._envGain(this._vol() * 0.2, 0.002, 0.04, t);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.05);
  },

  pickup() {
    if (!this.ready || !this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    const freqs = [520, 780];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = this._envGain(this._vol() * 0.25, 0.004, 0.08, t + i * 0.05);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.1);
    });
  },

  equip() {
    if (!this.ready || !this.enabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    [400, 600, 900].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const g = this._envGain(this._vol() * 0.22, 0.005, 0.1, t + i * 0.045);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t + i * 0.045);
      osc.stop(t + i * 0.045 + 0.12);
    });
  }
};
