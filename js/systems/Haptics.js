/**
 * Mobile haptic feedback via Vibration API.
 * Works on most Android browsers; no-ops safely on iOS Safari.
 * Patterns are short to avoid annoyance / battery drain.
 */
const Haptics = {
  enabled: true,
  _supported: null,
  _lastAt: 0,
  _minGap: 40, // ms between pulses (avoid spam)

  isSupported() {
    if (this._supported === null) {
      this._supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    }
    return this._supported;
  },

  /** @param {number|number[]} pattern */
  pulse(pattern) {
    if (!this.enabled || !this.isSupported()) return;
    const now = Date.now();
    if (now - this._lastAt < this._minGap) return;
    this._lastAt = now;
    try {
      navigator.vibrate(pattern);
    } catch (e) { /* ignore */ }
  },

  // --- Game events ---
  light() { this.pulse(12); },
  medium() { this.pulse(25); },
  heavy() { this.pulse(45); },

  attackHit() { this.pulse([18, 30, 22]); },
  attackMiss() { this.pulse(8); },
  takeDamage() { this.pulse([30, 40, 35]); },
  bossHit() { this.pulse([40, 50, 40, 50, 55]); },
  pickup() { this.pulse(15); },
  equip() { this.pulse([12, 40, 18]); },
  eat() { this.pulse([10, 25, 10]); },
  fart() { this.pulse([5, 20, 40, 20, 8]); },
  dayChange() { this.pulse([20, 60, 20]); },
  death() { this.pulse([50, 80, 50, 80, 100]); },
  win() { this.pulse([30, 50, 30, 50, 30, 50, 80]); },
  uiTap() { this.pulse(10); },

  stop() {
    if (this.isSupported()) {
      try { navigator.vibrate(0); } catch (e) {}
    }
  }
};
