/**
 * Dynamic music fading for Golden Bouffant
 * - fade in / fade out
 * - crossfade between tracks
 * - respects QualityTier volumes
 */
const MusicManager = {
  FADE_MS: 250,
  CROSS_MS: 500,
  _currentKey: null,
  _fading: false,

  _vol() {
    if (typeof QualityTier !== 'undefined' && QualityTier.musicVol) {
      return QualityTier.musicVol();
    }
    return 0.28;
  },

  /**
   * @param {Phaser.Scene} scene
   * @param {string} key
   * @param {number} [duration]
   */
  fadeIn(scene, key, duration) {
    GBLog('Music', 'fadeIn', key, 'dur', duration);
    if (!scene || !scene.sound) { GBLog.warn('Music', 'fadeIn no scene/sound'); return; }
    const target = this._vol();
    GBLog('Music', 'target vol', target);
    if (target <= 0) { GBLog.warn('Music', 'vol<=0 skip'); return; }

    duration = duration == null ? this.FADE_MS : duration;

    // Stop other music keys hard (they'll be faded separately in crossfade)
    if (scene.sound.get(key) && scene.sound.isPlaying(key)) {
      const s = scene.sound.get(key);
      scene.tweens.killTweensOf(s);
      scene.tweens.add({
        targets: s,
        volume: target,
        duration: duration,
        ease: 'Sine.easeInOut'
      });
      this._currentKey = key;
      return;
    }

    // Prefer existing instance from cache play
    let sound = scene.sound.get(key);
    if (!sound) {
      try {
        sound = scene.sound.add(key, { loop: true, volume: 0 });
      } catch (e) {
        console.warn('MusicManager: cannot add', key, e);
        return;
      }
    }
    if (!sound.isPlaying) {
      try {
        sound.play({ loop: true, volume: 0 });
        GBLog('Music', 'started', key, 'from 0 →', target);
      } catch (e) {
        console.warn('[' + (window.GBLog ? new Date().toISOString().substr(11,12) : '') + '][Music] play failed', key, e);
        return;
      }
    } else {
      sound.setVolume(0);
      GBLog('Music', 'already playing', key, 'fading to', target);
    }
    this._currentKey = key;
    scene.tweens.killTweensOf(sound);
    scene.tweens.add({
      targets: sound,
      volume: target,
      duration: duration,
      ease: 'Sine.easeInOut'
    });
  },

  /**
   * @param {Phaser.Scene} scene
   * @param {string} key
   * @param {number} [duration]
   * @param {function} [onComplete]
   */
  fadeOut(scene, key, duration, onComplete) {
    if (!scene || !scene.sound) {
      if (onComplete) onComplete();
      return;
    }
    duration = duration == null ? this.FADE_MS : duration;
    const s = scene.sound.get(key);
    if (!s || !s.isPlaying) {
      if (scene.sound.get(key)) scene.sound.stopByKey(key);
      if (this._currentKey === key) this._currentKey = null;
      if (onComplete) onComplete();
      return;
    }
    scene.tweens.killTweensOf(s);
    scene.tweens.add({
      targets: s,
      volume: 0,
      duration: duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        try { scene.sound.stopByKey(key); } catch (e) {}
        if (this._currentKey === key) this._currentKey = null;
        if (onComplete) onComplete();
      }
    });
  },

  /**
   * Fade out everything currently playing, then fade in `toKey`.
   * @param {Phaser.Scene} scene
   * @param {string} toKey
   * @param {number} [duration]
   */
  crossfade(scene, toKey, duration) {
    GBLog('Music', 'crossfade →', toKey);
    if (!scene || !scene.sound) { GBLog.warn('Music', 'crossfade no scene/sound'); return; }
    duration = duration == null ? this.CROSS_MS : duration;
    const target = this._vol();
    if (target <= 0) {
      GBLog.warn('Music', 'crossfade vol<=0, stopping all');
      ['music_intro', 'music_game', 'music_outro'].forEach(k => {
        if (scene.sound.get(k)) scene.sound.stopByKey(k);
      });
      return;
    }

    const keys = ['music_intro', 'music_game', 'music_outro'];
    keys.forEach(k => {
      if (k === toKey) return;
      if (scene.sound.get(k) && scene.sound.isPlaying(k)) {
        this.fadeOut(scene, k, duration);
      } else if (scene.sound.get(k)) {
        scene.sound.stopByKey(k);
      }
    });

    // Slight delay so both can overlap
    scene.time.delayedCall(Math.floor(duration * 0.15), () => {
      this.fadeIn(scene, toKey, duration);
    });
  },

  /** Immediate stop all music (no fade) */
  stopAll(scene) {
    if (!scene || !scene.sound) return;
    ['music_intro', 'music_game', 'music_outro'].forEach(k => {
      if (scene.sound.get(k)) {
        scene.tweens.killTweensOf(scene.sound.get(k));
        scene.sound.stopByKey(k);
      }
    });
    this._currentKey = null;
  }
};
