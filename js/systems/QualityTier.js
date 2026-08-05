/**
 * Quality tier detection for Golden Bouffant
 * Targets: iPhone X floor → modern phones → desktop browser
 *
 * Tiers:
 *   low  — iPhone X / weak Android / low RAM
 *   med  — recent mid-range phones
 *   high — flagship phones + desktop
 */
const QualityTier = {
  LOW: 'low',
  MED: 'med',
  HIGH: 'high',

  /** @type {'low'|'med'|'high'} */
  current: 'med',

  settings: {
    low: {
      label: 'Low',
      nearWildlife: 1,
      nearPirates: 0,
      scatterWildlife: 4,
      scatterPirates: 3,
      maxActiveEnemies: 12,
      enemyUpdateEveryNFrames: 2,
      floatingTextMax: 6,
      bloodEnabled: true,
      bloodMax: 8,
      videoEnabled: true,      // still allow intro/outro; lighter decode
      particlesEnabled: false,
      worldDetail: 0.55,       // fewer decorative fill marks
      musicEnabled: true,
      musicVolume: 0.18,
      sfxVolume: 0.35
    },
    med: {
      label: 'Medium',
      nearWildlife: 2,
      nearPirates: 1,
      scatterWildlife: 7,
      scatterPirates: 5,
      maxActiveEnemies: 20,
      enemyUpdateEveryNFrames: 1,
      floatingTextMax: 12,
      bloodEnabled: true,
      bloodMax: 16,
      videoEnabled: true,
      particlesEnabled: true,
      worldDetail: 0.85,
      musicEnabled: true,
      musicVolume: 0.30,
      sfxVolume: 0.45
    },
    high: {
      label: 'High',
      nearWildlife: 2,
      nearPirates: 1,
      scatterWildlife: 10,
      scatterPirates: 7,
      maxActiveEnemies: 28,
      enemyUpdateEveryNFrames: 1,
      floatingTextMax: 20,
      bloodEnabled: true,
      bloodMax: 28,
      videoEnabled: true,
      particlesEnabled: true,
      worldDetail: 1.0,
      musicEnabled: true,
      musicVolume: 0.38,
      sfxVolume: 0.55
    }
  },

  /**
   * Detect once at boot. Safe to call before Phaser starts.
   */
  detect() {
    let score = 50; // baseline = med

    // --- Memory ---
    const mem = navigator.deviceMemory; // Chrome: GiB
    if (typeof mem === 'number') {
      if (mem <= 2) score -= 30;
      else if (mem <= 4) score -= 12;
      else if (mem >= 8) score += 15;
    }

    // --- CPU cores ---
    const cores = navigator.hardwareConcurrency || 4;
    if (cores <= 4) score -= 15;
    else if (cores >= 8) score += 12;

    // --- Screen / DPR (proxy for device class) ---
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.min(window.innerWidth, window.innerHeight);
    const cssH = Math.max(window.innerWidth, window.innerHeight);
    // iPhone X logical: 375×812
    if (cssW <= 400 && cssH <= 850 && dpr <= 3) {
      // Likely older phone form factor; don't auto-punish new phones
      // Only nudge down if also low cores/mem
      if (cores <= 6 && (!mem || mem <= 4)) score -= 8;
    }
    if (cssW >= 900 || window.innerWidth >= 1024) {
      // Desktop / large tablet
      score += 20;
    }

    // --- Touch-only mobile heuristic ---
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (fine && !coarse) score += 10; // mouse → desktop boost
    if (coarse && !fine) score -= 5;

    // --- Connection (save-data / slow) ---
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      if (conn.saveData) score -= 20;
      if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') score -= 25;
      if (conn.effectiveType === '3g') score -= 10;
    }

    // --- User override via URL ?quality=low|med|high ---
    try {
      const q = new URLSearchParams(window.location.search).get('quality');
      if (q === 'low' || q === 'med' || q === 'high') {
        this.current = q;
        this._log(score, true);
        return this.get();
      }
    } catch (e) { /* ignore */ }

    // --- Map score → tier ---
    if (score < 35) this.current = this.LOW;
    else if (score < 65) this.current = this.MED;
    else this.current = this.HIGH;

    this._log(score, false);
    return this.get();
  },

  get() {
    return this.settings[this.current] || this.settings.med;
  },

  musicVol() {
    const s = this.get();
    return s.musicEnabled === false ? 0 : (s.musicVolume || 0.28);
  },

  sfxVol() {
    return this.get().sfxVolume || 0.45;
  },



  getTierName() {
    return this.current;
  },

  /** Step down one tier if not already low. Returns true if changed. */
  downgrade(reason) {
    const order = [this.HIGH, this.MED, this.LOW];
    const idx = order.indexOf(this.current);
    if (idx < 0 || idx >= order.length - 1) return false;
    this.current = order[idx + 1];
    if (typeof console !== 'undefined') {
      console.log('[Quality] Downgraded to', this.current, reason ? '(' + reason + ')' : '');
    }
    return true;
  },

  upgrade(reason) {
    const order = [this.LOW, this.MED, this.HIGH];
    const idx = order.indexOf(this.current);
    if (idx < 0 || idx >= order.length - 1) return false;
    this.current = order[idx + 1];
    if (typeof console !== 'undefined') {
      console.log('[Quality] Upgraded to', this.current, reason ? '(' + reason + ')' : '');
    }
    return true;
  },

  _log(score, forced) {
    const msg = forced
      ? `[Quality] Forced tier: ${this.current}`
      : `[Quality] Detected tier: ${this.current} (score ${score})`;
    if (typeof console !== 'undefined') console.log(msg);
  }
};

// Run immediately so Boot can read it
QualityTier.detect();
