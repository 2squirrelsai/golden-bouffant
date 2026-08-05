/**
 * Lightweight procedural textures for Golden Bouffant wasteland.
 * Value noise + FBM baked once into Phaser canvas textures.
 */
const ProcTextures = {
  _hash(x, y, seed) {
    let n = x * 374761393 + y * 668265263 + seed * 982451653;
    n = (n ^ (n >>> 13)) * 1274126177;
    n = n ^ (n >>> 16);
    return (n >>> 0) / 4294967295;
  },

  _smooth(t) {
    return t * t * (3 - 2 * t);
  },

  // Value noise 0..1
  valueNoise(x, y, seed) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = this._smooth(x - x0);
    const fy = this._smooth(y - y0);
    const v00 = this._hash(x0, y0, seed);
    const v10 = this._hash(x0 + 1, y0, seed);
    const v01 = this._hash(x0, y0 + 1, seed);
    const v11 = this._hash(x0 + 1, y0 + 1, seed);
    const a = v00 + (v10 - v00) * fx;
    const b = v01 + (v11 - v01) * fx;
    return a + (b - a) * fy;
  },

  // Fractal Brownian Motion 0..1
  fbm(x, y, seed, octaves) {
    let amp = 0.5;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.valueNoise(x * freq, y * freq, seed + i * 101);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / (norm || 1);
  },

  /**
   * Bake a texture into the Phaser texture manager.
   * @param {Phaser.Scene} scene
   * @param {string} key
   * @param {number} size - tile size (power of 2 preferred)
   * @param {'dirt'|'asphalt'|'rust'|'rad'} kind
   * @param {number} detail - 0.4..1 quality scale
   */
  bake(scene, key, size, kind, detail) {
    if (scene.textures.exists(key)) {
      try { scene.textures.remove(key); } catch (e) {}
    }
    size = size || 256;
    detail = detail == null ? 0.7 : detail;
    const octaves = detail < 0.55 ? 3 : (detail < 0.85 ? 4 : 5);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const data = img.data;
    const scale = kind === 'asphalt' ? 0.045 : (kind === 'rust' ? 0.08 : 0.035);
    const seed = kind === 'dirt' ? 42 : (kind === 'asphalt' ? 99 : (kind === 'rust' ? 7 : 55));

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Slight domain warp for organic look
        const wx = x * scale + this.valueNoise(x * 0.02, y * 0.02, seed + 3) * 1.2;
        const wy = y * scale + this.valueNoise(x * 0.02, y * 0.02, seed + 9) * 1.2;
        let n = this.fbm(wx, wy, seed, octaves);
        const i = (y * size + x) * 4;
        let r, g, b;

        if (kind === 'dirt') {
          // Irradiated dirt / ash
          const n2 = this.fbm(wx * 2.1, wy * 2.1, seed + 17, 2);
          r = 48 + n * 55 + n2 * 18;
          g = 42 + n * 42 + n2 * 10;
          b = 30 + n * 28;
          // sparse sick green flecks
          if (n2 > 0.72) {
            r *= 0.85; g += 18; b *= 0.8;
          }
        } else if (kind === 'asphalt') {
          r = 28 + n * 28;
          g = 26 + n * 24;
          b = 24 + n * 22;
          // cracks: high-freq threshold
          const c = this.valueNoise(x * 0.18, y * 0.18, seed + 20);
          if (c > 0.78) {
            r *= 0.55; g *= 0.55; b *= 0.55;
          }
          // faded yellow center-line grain (sparse)
          if (Math.abs((x % 64) - 32) < 2 && (y % 20) < 10 && n > 0.4) {
            r = 90; g = 78; b = 28;
          }
        } else if (kind === 'rust') {
          r = 70 + n * 80;
          g = 35 + n * 30;
          b = 18 + n * 15;
          const streak = this.fbm(x * 0.01, y * 0.06, seed + 5, 3);
          r += streak * 25;
          g -= streak * 8;
        } else {
          // rad scorch — green-brown
          r = 35 + n * 30;
          g = 50 + n * 45;
          b = 28 + n * 20;
        }

        data[i] = Math.max(0, Math.min(255, r | 0));
        data[i + 1] = Math.max(0, Math.min(255, g | 0));
        data[i + 2] = Math.max(0, Math.min(255, b | 0));
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    scene.textures.addCanvas(key, canvas);
    return key;
  },

  /**
   * Bake the standard wasteland set for a scene.
   */
  bakeWasteland(scene) {
    const detail = (typeof QualityTier !== 'undefined')
      ? (QualityTier.get().worldDetail || 0.7)
      : 0.7;
    const size = detail < 0.55 ? 128 : (detail < 0.85 ? 192 : 256);
    this.bake(scene, 'tex_dirt', size, 'dirt', detail);
    this.bake(scene, 'tex_asphalt', size, 'asphalt', detail);
    this.bake(scene, 'tex_rust', size, 'rust', detail);
    this.bake(scene, 'tex_rad', size, 'rad', detail);
    return { size, detail };
  }
};
