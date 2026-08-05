/**
 * Runtime sprite atlas packer + frame rebinding for Phaser 3.
 *
 * Improvements vs first version:
 *  - Height-sorted shelf packing (less wasted space)
 *  - Configurable padding / max size
 *  - Full TexturePacker-like frame JSON (sourceSize, spriteSourceSize)
 *  - Power-of-two canvas option for older GPUs
 *  - Verifies frames after addAtlas before marking ready
 *  - Dedupes keys; skips invalid / zero-size sources
 *  - Safe fallbacks in resolve / set / args
 */
const SpriteAtlas = {
  KEY: 'gb_atlas',
  ready: false,
  frames: {},
  meta: null,

  /** @type {{ maxWidth:number, maxHeight:number, padding:number, powerOfTwo:boolean }} */
  options: {
    maxWidth: 2048,
    maxHeight: 2048,
    padding: 2,
    powerOfTwo: false
  },

  /**
   * Pack loaded textures into a single atlas.
   * @param {Phaser.Scene} scene
   * @param {string[]} [keys]
   * @param {object} [opts] - override options for this pack
   * @returns {boolean}
   */
  pack(scene, keys, opts) {
    this.ready = false;
    this.frames = {};
    this.meta = null;

    if (!scene || !scene.textures) return false;

    const o = Object.assign({}, this.options, opts || {});
    const pad = Math.max(1, o.padding | 0);
    const maxW = o.maxWidth || 2048;
    const maxH = o.maxHeight || 2048;

    // Unique keys that actually exist and have pixels
    const seen = {};
    const list = [];
    (keys || this.defaultKeys()).forEach(k => {
      if (!k || seen[k]) return;
      seen[k] = true;
      if (!scene.textures.exists(k)) return;
      const tex = scene.textures.get(k);
      let img = null;
      try {
        img = tex.getSourceImage();
      } catch (e) {
        return;
      }
      if (!img) return;
      const w = img.width || img.naturalWidth || 0;
      const h = img.height || img.naturalHeight || 0;
      if (w < 1 || h < 1) return;
      if (w > maxW - pad * 2 || h > maxH - pad * 2) {
        console.warn('[SpriteAtlas] skip oversized frame', k, w + 'x' + h);
        return;
      }
      list.push({ key: k, img, w, h });
    });

    if (list.length < 2) {
      if (typeof console !== 'undefined') {
        console.warn('[SpriteAtlas] need ≥2 valid frames, got', list.length);
      }
      return false;
    }

    try {
      // Tallest-first helps shelf packing fill rows more evenly
      list.sort((a, b) => b.h - a.h || b.w - a.w);

      const layout = this._shelfPack(list, pad, maxW, maxH);
      if (!layout || !layout.slots.length) {
        console.warn('[SpriteAtlas] packing failed');
        return false;
      }

      let canvasW = layout.width;
      let canvasH = layout.height;
      if (o.powerOfTwo) {
        canvasW = this._nextPot(canvasW);
        canvasH = this._nextPot(canvasH);
        if (canvasW > maxW || canvasH > maxH) {
          // fall back to non-POT if POT exceeds cap
          canvasW = layout.width;
          canvasH = layout.height;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) throw new Error('2d context unavailable');
      ctx.clearRect(0, 0, canvasW, canvasH);
      // Transparent background — no fill

      const frameData = {};
      let packed = 0;
      for (let i = 0; i < layout.slots.length; i++) {
        const s = layout.slots[i];
        try {
          ctx.drawImage(s.img, s.x, s.y);
        } catch (drawErr) {
          console.warn('[SpriteAtlas] draw failed', s.key, drawErr);
          continue;
        }
        // TexturePacker-compatible hash entry (Phaser accepts this)
        frameData[s.key] = {
          frame: { x: s.x, y: s.y, w: s.w, h: s.h },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: s.w, h: s.h },
          sourceSize: { w: s.w, h: s.h },
          pivot: { x: 0.5, y: 0.5 }
        };
        this.frames[s.key] = { x: s.x, y: s.y, w: s.w, h: s.h };
        packed++;
      }

      if (packed < 2) {
        this.frames = {};
        return false;
      }

      if (scene.textures.exists(this.KEY)) {
        try { scene.textures.remove(this.KEY); } catch (e) {}
      }

      const atlasJson = {
        frames: frameData,
        meta: {
          app: 'GoldenBouffant/SpriteAtlas',
          version: '1.1',
          image: this.KEY,
          format: 'RGBA8888',
          size: { w: canvasW, h: canvasH },
          scale: '1'
        }
      };

      scene.textures.addAtlas(this.KEY, canvas, atlasJson);

      // Verify Phaser registered frames
      const atlasTex = scene.textures.get(this.KEY);
      let ok = 0;
      Object.keys(frameData).forEach(name => {
        if (atlasTex && atlasTex.has(name)) ok++;
        else delete this.frames[name];
      });

      this.ready = ok >= 2;
      this.meta = {
        width: canvasW,
        height: canvasH,
        count: ok,
        padding: pad,
        wasted: Math.max(0, 1 - layout.usedArea / (canvasW * canvasH))
      };

      if (typeof console !== 'undefined') {
        console.log(
          '[SpriteAtlas] Packed', ok, '/', list.length,
          '→', this.KEY, canvasW + 'x' + canvasH,
          'waste~' + Math.round(this.meta.wasted * 100) + '%',
          'ready=' + this.ready
        );
      }
      return this.ready;
    } catch (e) {
      console.warn('[SpriteAtlas] pack failed', e);
      this.ready = false;
      this.frames = {};
      return false;
    }
  },

  /**
   * Shelf (row) bin packer. Places rects left-to-right, wraps to next shelf.
   * @private
   */
  _shelfPack(items, pad, maxW, maxH) {
    const slots = [];
    let x = pad;
    let y = pad;
    let rowH = 0;
    let width = pad;
    let height = pad;
    let usedArea = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const needW = it.w + pad;
      const needH = it.h + pad;

      // New shelf if this item does not fit on the current row
      if (x + it.w + pad > maxW && x > pad) {
        x = pad;
        y += rowH + pad;
        rowH = 0;
      }

      // Vertical overflow — stop packing further items
      if (y + it.h + pad > maxH) {
        console.warn('[SpriteAtlas] maxHeight reached, skipped', items.length - i, 'frames');
        break;
      }

      slots.push({
        key: it.key,
        img: it.img,
        x: x,
        y: y,
        w: it.w,
        h: it.h
      });

      usedArea += it.w * it.h;
      rowH = Math.max(rowH, it.h);
      x += it.w + pad;
      width = Math.max(width, x);
      height = Math.max(height, y + it.h + pad);
    }

    return { slots, width, height, usedArea };
  },

  /** @private */
  _nextPot(n) {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
  },

  has(frame) {
    return !!(this.ready && frame && this.frames[frame]);
  },

  /**
   * @param {string} frame
   * @returns {{ key:string, frame:string|undefined }}
   */
  resolve(frame) {
    if (this.has(frame)) return { key: this.KEY, frame: frame };
    return { key: frame, frame: undefined };
  },

  /**
   * @param {Phaser.GameObjects.Sprite} sprite
   * @param {string} frameName
   */
  set(sprite, frameName) {
    if (!sprite || !frameName) return sprite;
    const r = this.resolve(frameName);
    try {
      if (r.frame !== undefined) sprite.setTexture(r.key, r.frame);
      else sprite.setTexture(r.key);
    } catch (e) {
      try { sprite.setTexture(frameName); } catch (e2) {}
    }
    return sprite;
  },

  /**
   * @param {string} frameName
   * @returns {[string, string|undefined]}
   */
  args(frameName) {
    const r = this.resolve(frameName);
    if (r.frame !== undefined) return [r.key, r.frame];
    return [r.key];
  },

  defaultKeys() {
    const colors = ['yellow','red','blue','green','purple','silver','pink','orange','black','rainbow','golden'];
    const keys = [
      'kraig', 'kraig_punch', 'kraig_weapon',
      'kraig_wig_punch', 'kraig_wig_weapon',
      'raccoon', 'pirate', 'boss',
      'golden_bouffant', 'weapon',
      'food_candy', 'food_rotting', 'kraig_dead', 'kraig_win'
    ];
    colors.forEach(c => {
      keys.push('kraig_wig_' + c);
      keys.push('kraig_wig_' + c + '_punch');
      keys.push('kraig_wig_' + c + '_weapon');
      if (c !== 'golden') keys.push('wig_' + c);
    });
    return keys;
  }
};
