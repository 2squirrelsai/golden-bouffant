/**
 * Weighted loot tables for Golden Bouffant carcass searches.
 * Weights are relative; rollLoot normalizes them to probabilities.
 */
const LootTables = {
  /** @type {Object.<string, {sample:function}>} */
  _samplers: {},

  /**
   * @typedef {{ id:string, weight:number, label:string, drops?:object }} LootEntry
   */

  wildlife: [
    { id: 'rotting',   weight: 28, label: 'Harvested… something.', drops: { food: 'rotting' } },
    { id: 'roadkill',  weight: 18, label: 'Roadkill. Charming.', drops: { food: 'roadkill' } },
    { id: 'candy',     weight: 8,  label: 'Hidden candy. Weird.', drops: { food: 'candy' } },
    { id: 'wig_yellow', weight: 7, label: 'Wig in the fur? Sure.', drops: { wig: 'yellow' } },
    { id: 'nothing',   weight: 39, label: 'Just guts.', drops: null }
  ],

  pirate: [
    { id: 'weapon',    weight: 18, label: 'Found a spare blade.', drops: { weapon: true } },
    { id: 'candy',     weight: 16, label: 'Pilfered rations.', drops: { food: 'candy' } },
    { id: 'rotting',   weight: 14, label: 'Spoiled pirate lunch.', drops: { food: 'rotting' } },
    { id: 'wig_greasy', weight: 12, label: 'A greasy wig.', drops: { wig: ['yellow', 'green', 'blue'] } },
    { id: 'nothing',   weight: 40, label: 'Pockets full of sand.', drops: null }
  ],

  boss: [
    { id: 'wig_rare',  weight: 40, label: 'Boss dropped a wig!', drops: { wig: ['red', 'silver', 'orange', 'black'] } },
    { id: 'weapon',    weight: 30, label: 'Boss dropped a blade!', drops: { weapon: true } },
    { id: 'stash',     weight: 30, label: 'Boss stash: food.', drops: { foodMulti: ['candy', 'roadkill'] } }
  ],

  /** Sum of weights for a table */
  totalWeight(table) {
    return table.reduce((s, e) => s + (e.weight || 0), 0);
  },

  /**
   * Roll one entry from a table by weight.
   * @param {'wildlife'|'pirate'|'boss'} kind
   * @returns {LootEntry}
   */
  /**
   * Get or build a cached alias sampler for a table kind.
   */
  _getSampler(kind) {
    const key = kind || 'wildlife';
    if (this._samplers[key]) return this._samplers[key];
    const table = this[key] || this.wildlife;
    if (typeof WeightedRandom !== 'undefined' && WeightedRandom.createAliasSampler) {
      this._samplers[key] = WeightedRandom.createAliasSampler(table, 'weight');
    } else {
      this._samplers[key] = {
        sample: () => {
          const rows = this[key] || this.wildlife;
          return (typeof WeightedRandom !== 'undefined')
            ? WeightedRandom.pick(rows, 'weight')
            : rows[0];
        }
      };
    }
    return this._samplers[key];
  },

  /** Clear cached samplers (call if you mutate table weights at runtime). */
  invalidate() {
    this._samplers = {};
  },

  roll(kind) {
    const sampler = this._getSampler(kind);
    const entry = sampler.sample();
    if (entry) return entry;
    const table = this[kind] || this.wildlife;
    return table[table.length - 1];
  },

  /**
   * Human-readable odds for popup stats.
   * @param {'wildlife'|'pirate'|'boss'} kind
   */
  oddsText(kind) {
    const table = this[kind] || this.wildlife;
    const probs = (typeof WeightedRandom !== 'undefined')
      ? WeightedRandom.probabilities(table, 'weight')
      : table.map(e => ({ item: e, p: e.weight / (this.totalWeight(table) || 1) }));
    return probs
      .filter(x => x.p > 0)
      .map(x => {
        const e = x.item;
        const pct = Math.round(x.p * 100);
        const name = e.id === 'nothing' ? 'nothing'
          : e.id.startsWith('wig') ? 'wig'
          : e.id === 'weapon' ? 'blade'
          : e.id === 'stash' ? 'food stash'
          : e.id;
        return name + ' ' + pct + '%';
      })
      .join(' · ');
  },

  /**
   * Resolve a rolled entry into concrete spawn instructions.
   * @returns {{ label:string, actions: Array<{type:string, value?:any}> }}
   */
  resolve(entry) {
    const actions = [];
    const d = entry.drops;
    if (!d) return { label: entry.label, actions };

    if (d.food) actions.push({ type: 'food', value: d.food });
    if (d.foodMulti) d.foodMulti.forEach(f => actions.push({ type: 'food', value: f }));
    if (d.weapon) actions.push({ type: 'weapon' });
    if (d.wig) {
      const id = Array.isArray(d.wig)
        ? d.wig[Math.floor(Math.random() * d.wig.length)]
        : d.wig;
      actions.push({ type: 'wig', value: id });
    }
    return { label: entry.label, actions };
  }
};
