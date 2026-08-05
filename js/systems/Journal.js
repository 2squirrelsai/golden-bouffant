/**
 * Run journal + death notes for Golden Bouffant
 * Tracks key events; produces a short epitaph on death/win.
 */
const Journal = {
  entries: [],
  cause: null,
  killerName: null,
  maxEntries: 24,

  reset() {
    this.entries = [];
    this.cause = null;
    this.killerName = null;
  },

  /**
   * @param {string} text
   * @param {string} [kind] - 'story'|'combat'|'item'|'day'|'meta'
   */
  log(text, kind) {
    if (!text) return;
    this.entries.push({
      t: Date.now(),
      kind: kind || 'story',
      text: String(text).slice(0, 120)
    });
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  },

  setCause(cause, killerName) {
    this.cause = cause;
    this.killerName = killerName || null;
  },

  /** Last few lines for UI */
  recent(n) {
    n = n || 6;
    return this.entries.slice(-n);
  },

  /**
   * Build death note / epitaph from stats + cause
   * @param {{won:boolean, stats:object, day:number}} data
   */
  buildDeathNote(data) {
    const stats = data.stats || {};
    const day = data.day || 1;
    const days = typeof stats.daysSurvived === 'number'
      ? stats.daysSurvived.toFixed(1)
      : String(day);
    const killed = stats.enemiesKilled || 0;
    const wigs = stats.wigsFound || 0;
    const food = stats.foodEaten || 0;

    const lines = [];

    if (data.won) {
      lines.push('FIELD REPORT — SURVIVOR');
      lines.push('Kraig found the Golden Bouffant.');
      lines.push('The city did not.');
    } else {
      lines.push('FIELD REPORT — DECEASED');
      lines.push(this._causeLine());
    }

    lines.push('');
    lines.push('Day reached: ' + day);
    lines.push('Days survived: ' + days);
    lines.push('Foes put down: ' + killed);
    lines.push('Wigs claimed: ' + wigs);
    lines.push('Meals (questionable): ' + food);

    // Flavor from last events
    const recent = this.recent(4).filter(e => e.kind !== 'meta');
    if (recent.length) {
      lines.push('');
      lines.push('— last pages —');
      recent.forEach(e => lines.push('• ' + e.text));
    }

    // Closing quip
    lines.push('');
    lines.push(this._closing(data.won, stats));

    return lines.join('\n');
  },

  _causeLine() {
    switch (this.cause) {
      case 'wildlife':
        return this.killerName
          ? ('Mauled by ' + this.killerName + '.')
          : 'Torn up by feral wildlife.';
      case 'pirate':
        return this.killerName
          ? ('Cut down by ' + this.killerName + '.')
          : 'Pirates finished what the city started.';
      case 'boss':
        return 'The cave guardian did not negotiate.';
      case 'starvation':
        return 'Hunger won. The wig could not.';
      case 'wigless':
        return 'Bald, broken, and out of time.';
      default:
        return 'The wasteland closed the file.';
    }
  },

  _closing(won, stats) {
    if (won) {
      const opts = [
        'He smiles like an idiot. He earned it.',
        'Golden threads. Gray house dress. Legend.',
        'Report closed. Wig status: permanent.'
      ];
      return opts[Math.floor(Math.random() * opts.length)];
    }
    const killed = stats.enemiesKilled || 0;
    if (killed === 0) {
      return 'Never threw a punch worth writing down.';
    }
    if (killed >= 20) {
      return 'Went down swinging. The raccoons will remember.';
    }
    const opts = [
      'Another scalp for the asphalt.',
      'The bouffant remains unclaimed.',
      'Someone else will wear the next wig.',
      'File stamped: FAILED — TRY AGAIN.'
    ];
    return opts[Math.floor(Math.random() * opts.length)];
  },

  /** Snapshot for scene data */
  snapshot() {
    return {
      entries: this.entries.slice(),
      cause: this.cause,
      killerName: this.killerName
    };
  },

  restore(snap) {
    if (!snap) return;
    this.entries = snap.entries || [];
    this.cause = snap.cause || null;
    this.killerName = snap.killerName || null;
  }
};
