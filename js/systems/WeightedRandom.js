/**
 * Weighted random selection utilities.
 * Linear scan + Walker–Vose alias method (O(1) sample after O(n) build).
 */
const WeightedRandom = {
  /**
   * Pick one item from a list using relative weights (linear scan, O(n)).
   * @param {Array<object>} items
   * @param {string|function} [weightKey='weight']
   * @returns {object|null}
   */
  pick(items, weightKey) {
    if (!items || !items.length) return null;
    const getW = typeof weightKey === 'function'
      ? weightKey
      : (item) => Number(item[weightKey || 'weight']) || 0;

    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const w = getW(items[i]);
      if (w > 0) total += w;
    }
    if (total <= 0) {
      return items[Math.floor(Math.random() * items.length)];
    }

    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      const w = getW(items[i]);
      if (w <= 0) continue;
      r -= w;
      if (r <= 0) return items[i];
    }
    for (let i = items.length - 1; i >= 0; i--) {
      if (getW(items[i]) > 0) return items[i];
    }
    return items[items.length - 1];
  },

  /**
   * Pick an index from a parallel weights array (linear).
   * @param {number[]} weights
   * @returns {number}
   */
  pickIndex(weights) {
    if (!weights || !weights.length) return -1;
    let total = 0;
    for (let i = 0; i < weights.length; i++) {
      const w = Number(weights[i]) || 0;
      if (w > 0) total += w;
    }
    if (total <= 0) return Math.floor(Math.random() * weights.length);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      const w = Number(weights[i]) || 0;
      if (w <= 0) continue;
      r -= w;
      if (r <= 0) return i;
    }
    for (let i = weights.length - 1; i >= 0; i--) {
      if ((Number(weights[i]) || 0) > 0) return i;
    }
    return weights.length - 1;
  },

  /**
   * @param {Array<object>} items
   * @param {string} [weightKey='weight']
   * @returns {Array<{item:object, p:number}>}
   */
  probabilities(items, weightKey) {
    const key = weightKey || 'weight';
    let total = 0;
    for (let i = 0; i < items.length; i++) total += Number(items[i][key]) || 0;
    if (total <= 0) {
      const p = items.length ? 1 / items.length : 0;
      return items.map(item => ({ item, p }));
    }
    return items.map(item => ({
      item,
      p: (Number(item[key]) || 0) / total
    }));
  },

  shuffleWeighted(items, weightKey) {
    const pool = items.slice();
    const out = [];
    while (pool.length) {
      const choice = this.pick(pool, weightKey);
      if (!choice) break;
      out.push(choice);
      const idx = pool.indexOf(choice);
      if (idx >= 0) pool.splice(idx, 1);
      else break;
    }
    return out;
  },

  // ---------- Walker–Vose Alias Method ----------

  /**
   * Build an alias table from positive weights.
   * Preprocess O(n); each sample is O(1).
   *
   * @param {number[]} weights
   * @returns {{ n:number, prob:Float64Array, alias:Int32Array, valid:boolean }}
   */
  createAliasTable(weights) {
    const n = weights ? weights.length : 0;
    const prob = new Float64Array(n);
    const alias = new Int32Array(n);
    if (n === 0) return { n: 0, prob, alias, valid: false };

    let sum = 0;
    for (let i = 0; i < n; i++) {
      const w = Number(weights[i]);
      sum += w > 0 ? w : 0;
    }
    if (sum <= 0) {
      for (let i = 0; i < n; i++) {
        prob[i] = 1;
        alias[i] = i;
      }
      return { n, prob, alias, valid: true };
    }

    // Scaled probabilities: average height = 1
    const scaled = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const w = Number(weights[i]);
      scaled[i] = (w > 0 ? w : 0) / sum * n;
    }

    const small = [];
    const large = [];
    for (let i = 0; i < n; i++) {
      if (scaled[i] < 1) small.push(i);
      else large.push(i);
    }

    while (small.length && large.length) {
      const s = small.pop();
      const l = large.pop();
      prob[s] = scaled[s];
      alias[s] = l;
      scaled[l] = scaled[l] - (1 - scaled[s]);
      if (scaled[l] < 1) small.push(l);
      else large.push(l);
    }

    // Remaining bins are full (within FP error)
    while (large.length) {
      const i = large.pop();
      prob[i] = 1;
      alias[i] = i;
    }
    while (small.length) {
      const i = small.pop();
      prob[i] = 1;
      alias[i] = i;
    }

    return { n, prob, alias, valid: true };
  },

  /**
   * O(1) sample from a prebuilt alias table → index.
   * @param {{ n:number, prob:Float64Array, alias:Int32Array, valid?:boolean }} table
   * @returns {number}
   */
  sampleAlias(table) {
    if (!table || !table.valid || table.n <= 0) return -1;
    const n = table.n;
    const u = Math.random() * n;
    const i = Math.min(n - 1, Math.floor(u));
    const y = u - i;
    return y < table.prob[i] ? i : table.alias[i];
  },

  /**
   * Build alias table bound to item objects.
   * @param {Array<object>} items
   * @param {string|function} [weightKey='weight']
   * @returns {{ table:object, items:Array, sample:function }}
   */
  createAliasSampler(items, weightKey) {
    const list = items ? items.slice() : [];
    const getW = typeof weightKey === 'function'
      ? weightKey
      : (item) => Number(item[weightKey || 'weight']) || 0;
    const weights = list.map(getW);
    const table = this.createAliasTable(weights);
    return {
      table,
      items: list,
      sample() {
        const idx = WeightedRandom.sampleAlias(table);
        if (idx < 0 || idx >= list.length) return null;
        return list[idx];
      }
    };
  },

  /**
   * Convenience: pick via alias when n is large enough, else linear.
   * Rebuilds table every call — use createAliasSampler for hot paths.
   */
  pickAlias(items, weightKey) {
    if (!items || !items.length) return null;
    if (items.length <= 8) return this.pick(items, weightKey);
    const sampler = this.createAliasSampler(items, weightKey);
    return sampler.sample();
  }
};
