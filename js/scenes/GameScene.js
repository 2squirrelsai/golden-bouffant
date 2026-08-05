class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init() {
    this.player = null;
    this.cursors = null;
    this.wasd = null;
    this.enemies = null;
    this.pickups = null;
    this.weapons = null;
    this.day = 1;
    this.dayTimer = 0;
    this.health = 100;
    this.hunger = 100;
    this.currentWig = WIGS.yellow;
    this.wigTimeLeft = DAY_LENGTH_MS;
    this.hasWeapon = false;
    this.useWeaponMode = false;
    this.weaponDamage = 18;
    this.fistDamage = 10;
    this.attackCooldown = 0;
    this.isDead = false;
    this.playerFacing = 'right';
    this.won = false;
    this.paused = false;
    this.stats = { daysSurvived: 0, enemiesKilled: 0, wigsFound: 1, foodEaten: 0 };
    this.virtualJoy = { active: false, dx: 0, dy: 0 };
    this.attackPressed = false;
    this.attackPoseTimer = 0;
    this._lastHitBy = null;
    this._enemyFrame = 0;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
    this._fps = 0;
    this._cullRange = 900; // world px — disable far enemies
    this._lowFpsStreak = 0;
    this._highFpsStreak = 0;
    this.dayTint = null;
    this.bossWindup = null;
  }

  create() {
    GBLog('Game', 'create start');
    if (typeof PerfMonitor !== 'undefined') PerfMonitor.init();
    // Immediate visible feedback (avoid pure black while generating)
    this.cameras.main.setBackgroundColor(0x3d3428);
    this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Loading city…', {
      fontFamily: 'Courier New', fontSize: '16px', color: '#8b7355'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setName('loadingMsg');

    const setLoad = (pct, msg) => {
      if (window.GBLoader) {
        window.GBLoader.set(pct);
        if (msg) {
          const m = document.getElementById('run-loader-msg');
          if (m) m.textContent = msg;
        }
      }
    };
    setLoad(5, 'PREPARING…');
    GBLog('Game', 'preparing world', WORLD_WIDTH, 'x', WORLD_HEIGHT);
    if (typeof Journal !== 'undefined') {
      Journal.reset();
      Journal.log('Kraig steps into the ruins.', 'story');
    }

    try { // WORLD_GEN
    GBLog('Game', 'WORLD_GEN try');
    // World bounds
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.buildings = [];
    this.currentInterior = null;

    setLoad(12, 'BAKING WASTELAND…');
    GBLog('Game', 'createBackground…');
    this.createBackground();
    GBLog('Game', 'background done');
    setLoad(30, 'LAYING GROUND…');

    setLoad(35, 'MARKING ZONES…');
    // Soft zone tints (wildlife west, pirates east)
    // Irradiated zone haze
    this.add.rectangle(WORLD_WIDTH * 0.28, WORLD_HEIGHT / 2, WORLD_WIDTH * 0.55, WORLD_HEIGHT, 0x2a3a18, 0.14)
      .setDepth(-1);
    this.add.rectangle(WORLD_WIDTH * 0.72, WORLD_HEIGHT / 2, WORLD_WIDTH * 0.55, WORLD_HEIGHT, 0x3a2418, 0.14)
      .setDepth(-1);

    this.add.text(400, 120, 'WILDLIFE WASTES', {
      fontFamily: 'Courier New', fontSize: '16px', color: '#7a9a40', alpha: 0.4
    }).setDepth(1);
    this.add.text(WORLD_WIDTH - 520, 120, 'PIRATE RUINS', {
      fontFamily: 'Courier New', fontSize: '16px', color: '#9a6040', alpha: 0.4
    }).setDepth(1);

    // Screen-space wasteland atmosphere (follows camera)
    this.wastelandFog = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x3a4a20, 0.07)
      .setScrollFactor(0).setDepth(40).setOrigin(0);
    // Day/night cycle tint (updated each frame from dayTimer)
    this.dayTint = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1a2035, 0)
      .setScrollFactor(0).setDepth(39).setOrigin(0);
    this.vignette = this.add.graphics().setScrollFactor(0).setDepth(41);
    this.vignette.fillStyle(0x000000, 0.35);
    // simple edge darkening
    this.vignette.fillRect(0, 0, GAME_WIDTH, 28);
    this.vignette.fillRect(0, GAME_HEIGHT - 28, GAME_WIDTH, 28);
    this.vignette.fillRect(0, 0, 18, GAME_HEIGHT);
    this.vignette.fillRect(GAME_WIDTH - 18, 0, 18, GAME_HEIGHT);

    setLoad(45, 'SPAWNING KRAIG…');
    // Player
    {
      const pa = (typeof SpriteAtlas !== 'undefined') ? SpriteAtlas.args('kraig') : ['kraig'];
      this.player = this.physics.add.sprite(280, WORLD_HEIGHT / 2, pa[0], pa[1]);
    }
    this.player.setDisplaySize(52, 78);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.body.setSize(34, 52);
    this.player.body.setOffset(9, 18);
    this.player.facing = 'right';

    // Camera
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setZoom(1);

    // Groups
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.weaponsGroup = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.wallGroup = this.physics.add.staticGroup();

    setLoad(55, 'RAISING RUINS…');
    GBLog('Game', 'generateBuildings…');
    this.generateBuildings();

    // Collisions
    this.physics.add.overlap(this.player, this.pickups, this.collectPickup, null, this);
    this.physics.add.overlap(this.player, this.weaponsGroup, this.collectWeapon, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitByEnemy, null, this);

    // Input (keyboard may be limited on mobile)
    this.cursors = null;
    this.wasd = null;
    this.escKey = null;
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        attack: Phaser.Input.Keyboard.KeyCodes.SPACE,
        pause: Phaser.Input.Keyboard.KeyCodes.P
      });
      this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    this.popupOpen = false;
    this.nearbyItem = null;

    // Safety: never leave the DOM loader stuck
    const finishLoad = (ok) => {
      GBLog('Game', 'finishLoad ok=', ok);
      try {
        const lm = this.children.getByName('loadingMsg');
        if (lm) lm.destroy();
      } catch (e) {}
      setLoad(100, ok ? 'ENTERING CITY…' : 'ENTERING CITY…');
      // Force canvas + overlays clear (black-screen fix)
      try {
        if (window.GBTitle) window.GBTitle.hide();
        if (this.game && this.game.canvas) {
          const c = this.game.canvas;
          c.style.visibility = 'visible';
          c.style.opacity = '1';
          c.style.display = 'block';
          c.style.zIndex = '40';
        }
        const container = document.getElementById('game-container');
        if (container) {
          container.style.visibility = 'visible';
          container.style.zIndex = '40';
        }
      } catch (e) {}
      if (window.GBLoader) {
        try { window.GBLoader.hide(); } catch (e) {}
        setTimeout(() => { try { if (window.GBLoader) window.GBLoader.hide(); } catch (e) {} }, 200);
        setTimeout(() => { try { if (window.GBLoader) window.GBLoader.hide(); } catch (e) {} }, 1500);
        setTimeout(() => { try { if (window.GBLoader) window.GBLoader.hide(); } catch (e) {} }, 4000);
      }
    };

    try {
      setLoad(75, 'SCATTERING LOOT…');
      this.spawnInitialPickups();
    } catch (e) { console.warn('pickups', e); }

    try {
      setLoad(85, 'STIRRING WILDLIFE…');
      this.spawnEnemiesForDay();
    } catch (e) { console.warn('enemies', e); }

    try {
      setLoad(95, 'SEALING THE CAVE…');
      this.placeGoldenBouffant();
    } catch (e) {
      console.warn('cave/boss failed — continuing without', e);
      this.boss = null;
      this.goldenSprite = null;
    }

    try {
      this.cameras.main.setZoom(1.15);
    } catch (e) {}

    try {
      GBLog('Game', 'audio context:', this.sound && this.sound.context ? this.sound.context.state : 'none');
      if (this.sound && this.sound.context && this.sound.context.state === 'suspended') {
        this.sound.context.resume();
      }
      if (this.sound && typeof this.sound.unlock === 'function') this.sound.unlock();
    } catch (e) { GBLog.warn('Game', 'unlock', e); }
    try {
      GBLog('Game', 'music_game in cache:', this.cache.audio.exists('music_game'));
      if (typeof MusicManager !== 'undefined') {
        GBLog('Game', 'MusicManager.crossfade → music_game');
        MusicManager.crossfade(this, 'music_game', 600);
      }
      this.time.delayedCall(700, () => {
        try {
          if (!this.sound) { GBLog.warn('Game', 'no sound at force-play'); return; }
          const playing = this.sound.isPlaying('music_game');
          GBLog('Game', 'after 700ms music_game playing=', playing);
          if (!playing && this.cache.audio.exists('music_game')) {
            const mvol = (typeof QualityTier !== 'undefined') ? QualityTier.musicVol() : 0.3;
            GBLog('Game', 'FORCE play music_game vol=', mvol);
            this.sound.play('music_game', { loop: true, volume: Math.max(0.22, mvol || 0.28) });
          }
        } catch (e) { GBLog.warn('Game', 'force music', e); }
      });
    } catch (e) { GBLog.warn('Game', 'music', e); }

    try {
      if (typeof NoiseSynth !== 'undefined') {
        NoiseSynth.bindPhaser(this);
        NoiseSynth.resume();
      }
    } catch (e) {}

    try {
      this.updatePlayerAppearance();
    } catch (e) { console.warn('appearance', e); }

    try {
      this.events.emit('updateStats', this.getUIState());
    } catch (e) {}

    GBLog('Game', 'WORLD_GEN success → finishLoad');
    finishLoad(true);
    } catch (worldErr) {
      GBLog.error('Game', 'create FAILED', worldErr);
      try {
        this.cameras.main.setBackgroundColor(0x3d3428);
        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY,
          'Load error — tap may still work\n' + (worldErr && worldErr.message ? worldErr.message : 'unknown'),
          { fontFamily: 'Courier New', fontSize: '12px', color: '#e74c3c', align: 'center' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(2000);
      } catch (e2) {}
      finishLoad(false);
    }
  }

  createBackground() {
    const detail = (typeof QualityTier !== 'undefined') ? (QualityTier.get().worldDetail || 0.7) : 0.7;

    // Bake procedural tileable textures once
    try {
      if (typeof ProcTextures !== 'undefined') {
        ProcTextures.bakeWasteland(this);
      }
    } catch (e) {
      console.warn('ProcTextures bake failed', e);
    }

    // Full-world dirt tile
    if (this.textures.exists('tex_dirt')) {
      const dirt = this.add.tileSprite(
        WORLD_WIDTH / 2, WORLD_HEIGHT / 2,
        WORLD_WIDTH, WORLD_HEIGHT,
        'tex_dirt'
      ).setDepth(-6);
      dirt.setTint(0xc8c0a8);
    } else {
      this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x3d3428).setDepth(-6);
    }

    // Sparse radiation blotches (tiled rad texture, low alpha patches via graphics mask-like rects)
    const g = this.add.graphics().setDepth(-5);
    if (this.textures.exists('tex_rad')) {
      for (let i = 0; i < Math.floor(12 * detail); i++) {
        const rw = Phaser.Math.Between(180, 420);
        const rh = Phaser.Math.Between(140, 360);
        const rx = Phaser.Math.Between(0, WORLD_WIDTH - rw);
        const ry = Phaser.Math.Between(0, WORLD_HEIGHT - 160 - rh);
        const blot = this.add.tileSprite(rx + rw / 2, ry + rh / 2, rw, rh, 'tex_rad')
          .setDepth(-5)
          .setAlpha(0.22);
      }
    }

    // Vertical asphalt roads
    for (let rx = 180; rx < WORLD_WIDTH; rx += Phaser.Math.Between(detail < 0.7 ? 700 : 400, detail < 0.7 ? 1100 : 650)) {
      const rw = Phaser.Math.Between(52, 78);
      if (this.textures.exists('tex_asphalt')) {
        this.add.tileSprite(rx + rw / 2, (WORLD_HEIGHT - 130) / 2, rw, WORLD_HEIGHT - 130, 'tex_asphalt')
          .setDepth(-4);
      } else {
        g.fillStyle(0x2c2824, 1);
        g.fillRect(rx, 0, rw, WORLD_HEIGHT - 130);
      }
      // soft shoulder
      g.fillStyle(0x4a4030, 0.2);
      g.fillRect(rx - 3, 0, 4, WORLD_HEIGHT - 130);
      g.fillRect(rx + rw, 0, 4, WORLD_HEIGHT - 130);
    }

    // Horizontal asphalt roads
    for (let ry = 160; ry < WORLD_HEIGHT - 160; ry += Phaser.Math.Between(detail < 0.7 ? 600 : 340, detail < 0.7 ? 900 : 540)) {
      const rh = Phaser.Math.Between(40, 56);
      if (this.textures.exists('tex_asphalt')) {
        this.add.tileSprite(WORLD_WIDTH / 2, ry + rh / 2, WORLD_WIDTH, rh, 'tex_asphalt')
          .setDepth(-4);
      } else {
        g.fillStyle(0x2c2824, 1);
        g.fillRect(0, ry, WORLD_WIDTH, rh);
      }
    }

    // Toxic coastal sludge
    g.fillStyle(0x1a2a22, 1);
    g.fillRect(0, WORLD_HEIGHT - 130, WORLD_WIDTH, 130);
    g.fillStyle(0x2a4a30, 0.45);
    g.fillRect(0, WORLD_HEIGHT - 140, WORLD_WIDTH, 14);
    for (let i = 0; i < Math.floor(18 * detail); i++) {
      g.fillStyle(0x3a6a40, 0.2);
      g.fillRect(
        Phaser.Math.Between(0, WORLD_WIDTH),
        WORLD_HEIGHT - 138 + Phaser.Math.Between(0, 8),
        Phaser.Math.Between(10, 36), 3
      );
    }

    // Debris / rust scraps
    for (let i = 0; i < Math.floor(40 * detail); i++) {
      if (this.textures.exists('tex_rust') && Phaser.Math.Between(0, 1) === 0) {
        const w = Phaser.Math.Between(10, 28);
        const h = Phaser.Math.Between(6, 16);
        this.add.tileSprite(
          Phaser.Math.Between(20, WORLD_WIDTH - 20),
          Phaser.Math.Between(20, WORLD_HEIGHT - 160),
          w, h, 'tex_rust'
        ).setDepth(-3).setAlpha(0.75);
      } else {
        g.fillStyle(0x5a4030, 0.55);
        g.fillRect(
          Phaser.Math.Between(0, WORLD_WIDTH),
          Phaser.Math.Between(0, WORLD_HEIGHT - 150),
          Phaser.Math.Between(4, 14),
          Phaser.Math.Between(3, 8)
        );
      }
    }
  }

  generateBuildings() {
    const detail = (typeof QualityTier !== 'undefined') ? (QualityTier.get().worldDetail || 0.7) : 0.7;
    const count = Math.floor(28 + 50 * detail); // fewer on weak devices
    const placed = [];

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let bx, by, bw, bh;
      do {
        bw = Phaser.Math.Between(90, 220);
        bh = Phaser.Math.Between(80, 190);
        bx = Phaser.Math.Between(80, WORLD_WIDTH - bw - 80);
        by = Phaser.Math.Between(80, WORLD_HEIGHT - bh - 180);
        attempts++;
      } while (attempts < 40 && placed.some(p =>
        Phaser.Math.Distance.Between(bx + bw/2, by + bh/2, p.x + p.w/2, p.y + p.h/2) < 160
      ));

      placed.push({ x: bx, y: by, w: bw, h: bh });

      const building = {
        x: bx, y: by, w: bw, h: bh,
        doorX: bx + Math.floor(bw * 0.4),
        doorW: 28,
        inside: false,
        roof: null,
        walls: null,
        interior: null,
        furniture: [],
        loot: []
      };

      // Exterior walls (always visible when outside)
      const walls = this.add.graphics().setDepth(3);
      walls.fillStyle(0x4a453c, 1);
      walls.fillRect(bx, by, bw, bh);
      // darker edge / foundation
      walls.fillStyle(0x3a3028, 1);
      walls.fillRect(bx, by + bh - 10, bw, 10);
      // rust streak
      walls.fillStyle(0x6a4020, 0.35);
      walls.fillRect(bx + 4, by + 8, 6, bh - 20);
      // boarded / broken windows
      walls.fillStyle(0x1a1a14, 1);
      const winCount = Phaser.Math.Between(2, 5);
      for (let w = 0; w < winCount; w++) {
        const wx = bx + 12 + w * Math.floor((bw - 30) / winCount);
        const wy = by + 18 + Phaser.Math.Between(0, 20);
        walls.fillRect(wx, wy, 16, 20);
        // boards
        walls.lineStyle(2, 0x3d3428, 1);
        walls.lineBetween(wx, wy + 4, wx + 16, wy + 16);
        walls.lineBetween(wx + 16, wy + 4, wx, wy + 16);
      }
      // door frame
      walls.fillStyle(0x1c1814, 1);
      walls.fillRect(building.doorX, by + bh - 38, building.doorW, 38);
      walls.fillStyle(0x4a3c28, 1);
      walls.fillRect(building.doorX + 3, by + bh - 34, building.doorW - 6, 34);

      // Solid collision: walls block, door is open
      const addWall = (wx, wy, ww, wh) => {
        const w = this.add.rectangle(wx, wy, ww, wh, 0x000000, 0).setVisible(false);
        this.physics.add.existing(w, true);
        this.wallGroup.add(w);
        this.physics.add.collider(this.player, w);
      };
      addWall(bx + 8, by + bh/2, 16, bh);                    // left
      addWall(bx + bw - 8, by + bh/2, 16, bh);               // right
      addWall(bx + bw/2, by + 8, bw, 16);                    // top
      // bottom with door gap
      const leftGapW = Math.max(8, building.doorX - bx);
      const rightGapW = Math.max(8, bx + bw - (building.doorX + building.doorW));
      if (leftGapW > 10) addWall(bx + leftGapW/2, by + bh - 8, leftGapW, 16);
      if (rightGapW > 10) addWall(building.doorX + building.doorW + rightGapW/2, by + bh - 8, rightGapW, 16);

      // Roof (visible when outside)
      const roof = this.add.graphics().setDepth(6);
      roof.fillStyle(0x3a3028, 1);
      roof.fillRect(bx - 6, by - 14, bw + 12, bh * 0.55);
      // roof ridge / damage
      roof.fillStyle(0x2a221c, 1);
      roof.fillRect(bx + bw * 0.2, by - 18, bw * 0.6, 8);
      // missing tiles / holes
      for (let h = 0; h < 3; h++) {
        roof.fillStyle(0x1a1612, 1);
        roof.fillRect(
          bx + Phaser.Math.Between(10, bw - 30),
          by + Phaser.Math.Between(0, Math.floor(bh * 0.3)),
          Phaser.Math.Between(12, 28),
          Phaser.Math.Between(8, 16)
        );
      }
      // chimney or debris
      if (Phaser.Math.Between(0, 1)) {
        roof.fillStyle(0x4a4035, 1);
        roof.fillRect(bx + bw - 28, by - 28, 14, 22);
      }

      // Interior (hidden until entered)
      const interior = this.add.graphics().setDepth(4).setVisible(false);
      interior.fillStyle(0x2c241c, 1); // dark abandoned floor
      interior.fillRect(bx + 4, by + 4, bw - 8, bh - 8);
      // floor stains / debris
      for (let d = 0; d < 8; d++) {
        interior.fillStyle(0x1a1610, 0.5);
        interior.fillCircle(
          bx + Phaser.Math.Between(15, bw - 15),
          by + Phaser.Math.Between(15, bh - 15),
          Phaser.Math.Between(4, 12)
        );
      }

      // Furniture
      const furniture = [];
      const addFurn = (fx, fy, fw, fh, color) => {
        const f = this.add.rectangle(fx, fy, fw, fh, color).setDepth(5).setVisible(false);
        furniture.push(f);
      };
      // table
      addFurn(bx + bw * 0.35, by + bh * 0.45, 36, 20, 0x4a3c28);
      // chair / crate
      addFurn(bx + bw * 0.2, by + bh * 0.55, 16, 16, 0x3d3228);
      addFurn(bx + bw * 0.65, by + bh * 0.35, 22, 14, 0x3a3028);
      // shelf / rubble
      addFurn(bx + 18, by + 22, 14, 40, 0x2a221c);
      if (bw > 140) {
        addFurn(bx + bw - 30, by + bh * 0.5, 18, 28, 0x3d3428);
      }

      building.roof = roof;
      building.walls = walls;
      building.interior = interior;
      building.furniture = furniture;

      // Interior loot (hidden until enter) — denser caches
      building.loot = [];
      const lootRolls = 1 + Math.floor(detail * 2); // 1–3
      for (let L = 0; L < lootRolls; L++) {
        if (Math.random() > 0.55 + detail * 0.2) continue;
        const lx = bx + Phaser.Math.Between(16, Math.max(20, bw - 16));
        const ly = by + Phaser.Math.Between(16, Math.max(20, bh - 16));
        const r = Math.random();
        let drop = null;
        if (r < 0.45) {
          drop = this.spawnFood(lx, ly, Phaser.Utils.Array.GetRandom(['candy', 'rotting', 'roadkill']));
        } else if (r < 0.7) {
          drop = this.spawnWig(lx, ly, Phaser.Utils.Array.GetRandom(['yellow', 'green', 'blue', 'red']));
        } else if (r < 0.85) {
          drop = this.spawnWeapon(lx, ly);
        }
        if (drop) {
          drop.setVisible(false);
          drop.setActive(false);
          if (drop.body) drop.body.enable = false;
          if (drop.label) drop.label.setVisible(false);
          building.loot.push(drop);
        }
      }


      this.buildings.push(building);
    }
  }

  updateBuildingInteriors() {
    const px = this.player.x;
    const py = this.player.y;
    let insideAny = null;

    for (const b of this.buildings) {
      const inBounds = px > b.x + 8 && px < b.x + b.w - 8 &&
                       py > b.y + 8 && py < b.y + b.h - 8;

      if (inBounds) {
        insideAny = b;
        if (!b.inside) {
          b.inside = true;
          b.roof.setVisible(false);
          b.interior.setVisible(true);
          b.furniture.forEach(f => f.setVisible(true));
          if (b.loot) b.loot.forEach(d => {
            if (!d || !d.active) return;
            d.setVisible(true);
            d.setActive(true);
            if (d.body) d.body.enable = true;
            if (d.label) d.label.setVisible(true);
          });
          // slight darken / indoor feel
          this.cameras.main.setBackgroundColor(0x1a1410);
        }
      } else if (b.inside) {
        b.inside = false;
        b.roof.setVisible(true);
        b.interior.setVisible(false);
        b.furniture.forEach(f => f.setVisible(false));
        if (b.loot) b.loot.forEach(d => {
          if (!d || !d.active) return;
          d.setVisible(false);
          d.setActive(false);
          if (d.body) d.body.enable = false;
          if (d.label) d.label.setVisible(false);
        });
      }
    }

    if (!insideAny && this.currentInterior) {
      this.cameras.main.setBackgroundColor(0x1a1a2e);
    }
    this.currentInterior = insideAny;
  }

  spawnInitialPickups() {
    // Starting area
    this.spawnWig(350, WORLD_HEIGHT / 2 - 80, 'yellow');
    this.spawnWig(420, WORLD_HEIGHT / 2 + 120, 'green');
    this.spawnWig(280, WORLD_HEIGHT / 2 + 40, 'blue');
    this.spawnFood(240, WORLD_HEIGHT / 2 - 40, 'candy');
    this.spawnFood(380, WORLD_HEIGHT / 2 + 60, 'rotting');
    this.spawnFood(500, WORLD_HEIGHT / 2 - 100, 'roadkill');
    this.spawnWeapon(320, WORLD_HEIGHT / 2);

    // Spread across the large abandoned city
    const wigIds = ['red', 'blue', 'green', 'purple', 'silver', 'pink', 'orange', 'black', 'rainbow'];
    for (let i = 0; i < 55; i++) {
      const x = Phaser.Math.Between(120, WORLD_WIDTH - 120);
      const y = Phaser.Math.Between(120, WORLD_HEIGHT - 180);
      this.spawnWig(x, y, Phaser.Utils.Array.GetRandom(wigIds));
    }
    for (let i = 0; i < 70; i++) {
      const x = Phaser.Math.Between(100, WORLD_WIDTH - 100);
      const y = Phaser.Math.Between(100, WORLD_HEIGHT - 180);
      this.spawnFood(x, y, Phaser.Utils.Array.GetRandom(['candy', 'rotting', 'roadkill', 'candy', 'rotting']));
    }
    for (let i = 0; i < 12; i++) {
      this.spawnWeapon(
        Phaser.Math.Between(200, WORLD_WIDTH - 200),
        Phaser.Math.Between(200, WORLD_HEIGHT - 200)
      );
    }
  }

  spawnWig(x, y, id) {
    const wig = WIGS[id] || WIGS.yellow;
    const wigKey = (this.textures.exists('wig_' + id) ? ('wig_' + id)
      : (id === 'golden' && this.textures.exists('golden_bouffant') ? 'golden_bouffant' : 'wig_yellow'));
    const _wa = (typeof SpriteAtlas !== 'undefined') ? SpriteAtlas.args(wigKey) : [wigKey];
    const s = this.physics.add.sprite(x, y, _wa[0], _wa[1]);
    s.setDisplaySize(28, 28);
    // Color sprites already vary; light tint only if still on yellow fallback
    if (wigKey === 'wig_yellow' && id !== 'yellow') {
      s.setTint(wig.color);
    }
    s.pickupType = 'wig';
    s.wigId = id;
    s.setDepth(5);
    this.pickups.add(s);

    const label = this.add.text(x, y - 22, wig.name.replace('The ', ''), {
      fontFamily: 'Courier New', fontSize: '10px', color: '#ddd',
      backgroundColor: '#000000cc', padding: { x: 3, y: 1 }
    }).setOrigin(0.5).setDepth(6);
    s.label = label;
      return s;
}


  spawnCarcass(x, y, enemyType, isBoss) {
    const key = enemyType === 'pirate' ? 'pirate' : 'raccoon';
    const _ca = (typeof SpriteAtlas !== 'undefined') ? SpriteAtlas.args(key) : [key];
    const s = this.physics.add.sprite(x, y, _ca[0], _ca[1]);
    const scale = isBoss ? 0.85 : 0.7;
    const bw = (enemyType === 'pirate' ? 44 : 40) * scale;
    const bh = (enemyType === 'pirate' ? 55 : 40) * scale;
    s.setDisplaySize(bw, bh);
    s.setTint(0x5a3030);
    s.setAlpha(0.92);
    s.setAngle(Phaser.Math.Between(-40, 40));
    s.setDepth(4);
    if (s.body) {
      s.body.setAllowGravity(false);
      s.body.moves = false;
      s.body.setImmovable(true);
    }
    s.pickupType = 'carcass';
    s.carcassType = isBoss ? 'boss' : (enemyType || 'wildlife');
    s.searched = false;
    this.pickups.add(s);

    const label = this.add.text(x, y - 28, 'CARCASS', {
      fontFamily: 'Courier New', fontSize: '9px', color: '#c07070',
      backgroundColor: '#000000aa', padding: { x: 3, y: 1 }
    }).setOrigin(0.5).setDepth(6);
    s.label = label;

    this.time.delayedCall(90000, () => {
      if (s && s.active) {
        if (s.label) s.label.destroy();
        s.destroy();
      }
    });
  }

  spawnFood(x, y, type) {
    const key = (type === 'candy') ? 'food_candy' : 'food_rotting';
    const _fa = (typeof SpriteAtlas !== 'undefined') ? SpriteAtlas.args(key) : [key];
    const s = this.physics.add.sprite(x, y, _fa[0], _fa[1]);
    s.setDisplaySize(26, 26);
    s.pickupType = 'food';
    s.foodType = type;
    s.setDepth(5);
    this.pickups.add(s);
    return s;
  }

  spawnWeapon(x, y) {
    const _wpn = (typeof SpriteAtlas !== 'undefined') ? SpriteAtlas.args('weapon') : ['weapon'];
    const s = this.physics.add.sprite(x, y, _wpn[0], _wpn[1]);
    s.setDisplaySize(32, 32);
    s.setDepth(5);
    this.weaponsGroup.add(s);
  }

  placeGoldenBouffant() {
    const cx = WORLD_WIDTH - 320;
    const cy = 280;
    this.boss = null;
    this.goldenSprite = null;

    try {
      const cave = this.add.graphics().setDepth(2);
      cave.fillStyle(0x12151a, 1);
      cave.fillRect(cx - 160, cy - 140, 320, 280);
      cave.fillStyle(0x0a0c10, 1);
      cave.fillRect(cx - 140, cy - 120, 280, 240);
      cave.fillStyle(0x2e2a28, 1);
      cave.fillRect(cx - 170, cy - 30, 40, 60);
    } catch (e) { console.warn('cave gfx', e); }

    try {
      const addCaveWall = (wx, wy, ww, wh) => {
        if (!this.player) return;
        const wall = this.add.rectangle(wx, wy, ww, wh, 0x000000, 0).setVisible(false);
        this.physics.add.existing(wall, true);
        this.physics.add.collider(this.player, wall);
      };
      addCaveWall(cx - 150, cy - 130, 300, 20);
      addCaveWall(cx - 150, cy + 120, 300, 20);
      addCaveWall(cx + 140, cy, 20, 260);
      addCaveWall(cx - 150, cy - 80, 20, 80);
      addCaveWall(cx - 150, cy + 60, 20, 100);
    } catch (e) { console.warn('cave walls', e); }

    try {
      this.add.text(cx, cy - 155, 'THE BOUFFANT CAVE', {
        fontFamily: 'Courier New', fontSize: '14px', color: '#8b7355',
        backgroundColor: '#000000aa', padding: { x: 6, y: 3 }
      }).setOrigin(0.5).setDepth(9);
    } catch (e) {}

    // Boss — fall back to pirate sprite if boss texture missing
    try {
      const bossKey = this.textures.exists('boss') ? 'boss' : 'pirate';
      const _ba = (typeof SpriteAtlas !== 'undefined') ? SpriteAtlas.args(bossKey) : [bossKey];
      const boss = this.physics.add.sprite(cx + 40, cy, _ba[0], _ba[1]);
      boss.setDisplaySize(80, 100);
      boss.setCollideWorldBounds(true);
      if (boss.body) boss.body.setSize(50, 70);
      boss.hp = 180;
      boss.maxHp = 180;
      boss.damage = 18;
      boss.speed = 55;
      boss.attackCooldown = 0;
      boss.isBoss = true;
      boss.enemyType = 'pirate';
      boss.setDepth(8);
      if (this.enemies) this.enemies.add(boss);
      this.boss = boss;
    } catch (e) { console.warn('boss spawn', e); }

    // Golden Bouffant
    try {
      const gKey = this.textures.exists('golden_bouffant') ? 'golden_bouffant' : 'wig_yellow';
      const _ga = (typeof SpriteAtlas !== 'undefined') ? SpriteAtlas.args(gKey) : [gKey];
      const s = this.physics.add.sprite(cx + 90, cy - 20, _ga[0], _ga[1]);
      s.setDisplaySize(44, 44);
      if (gKey === 'wig_yellow') s.setTint(0xffd700);
      s.pickupType = 'golden';
      s.setDepth(8);
      try {
        this.tweens.add({
          targets: s, alpha: 0.85, duration: 800, yoyo: true, repeat: -1
        });
      } catch (e2) {}
      if (this.pickups) this.pickups.add(s);
      this.goldenSprite = s;

      this.add.text(cx + 90, cy - 55, '★ GOLDEN BOUFFANT ★', {
        fontFamily: 'Courier New', fontSize: '11px', color: '#ffd700',
        backgroundColor: '#000000cc', padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(9);
    } catch (e) { console.warn('golden spawn', e); }
      return s;
}

  spawnEnemiesForDay() {
    this.enemies.clear(true, true);

    const px = this.player ? this.player.x : 280;
    const py = this.player ? this.player.y : WORLD_HEIGHT / 2;
    const Q = (typeof QualityTier !== 'undefined') ? QualityTier.get() : null;

    // Cluster near the player so combat happens quickly (scaled by quality tier)
    const nearWildlife = (Q ? Q.nearWildlife : 2) + Math.floor((this.day - 1) * 0.5);
    const nearPirates = (Q ? Q.nearPirates : 1) + Math.floor((this.day - 1) * 0.35);
    // Sparse near spawns — prefer 1v1 encounters, not a mob on open
    for (let i = 0; i < nearWildlife; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(420, 780); // farther from player
      const x = Phaser.Math.Clamp(px + Math.cos(angle) * dist, 60, WORLD_WIDTH - 60);
      const y = Phaser.Math.Clamp(py + Math.sin(angle) * dist, 80, WORLD_HEIGHT - 160);
      this.spawnEnemy(x, y, 'wildlife');
    }
    for (let i = 0; i < nearPirates; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(520, 900);
      const x = Phaser.Math.Clamp(px + Math.cos(angle) * dist, 60, WORLD_WIDTH - 60);
      const y = Phaser.Math.Clamp(py + Math.sin(angle) * dist, 80, WORLD_HEIGHT - 160);
      this.spawnEnemy(x, y, 'pirate');
    }

    // Scattered rest of the map (scaled by tier)
    const wildlifeCount = (Q ? Q.scatterWildlife : 12) + this.day * 2;
    const pirateCount = (Q ? Q.scatterPirates : 10) + this.day * 2;
    for (let i = 0; i < wildlifeCount; i++) {
      const x = Phaser.Math.Between(80, WORLD_WIDTH * 0.58);
      const y = Phaser.Math.Between(100, WORLD_HEIGHT - 160);
      if (Phaser.Math.Distance.Between(x, y, px, py) < 700) continue;
      this.spawnEnemy(x, y, 'wildlife');
    }
    for (let i = 0; i < pirateCount; i++) {
      const x = Phaser.Math.Between(WORLD_WIDTH * 0.42, WORLD_WIDTH - 80);
      const y = Phaser.Math.Between(100, WORLD_HEIGHT - 160);
      if (Phaser.Math.Distance.Between(x, y, px, py) < 700) continue;
      this.spawnEnemy(x, y, 'pirate');
    }
  }

  spawnEnemy(x, y, type) {
    const key = type === 'wildlife' ? 'raccoon' : 'pirate';
    const _ea = (typeof SpriteAtlas !== 'undefined') ? SpriteAtlas.args(key) : [key];
    const e = this.physics.add.sprite(x, y, _ea[0], _ea[1]);
    e.setDisplaySize(type === 'wildlife' ? 40 : 44, type === 'wildlife' ? 40 : 55);
    e.setCollideWorldBounds(true);
    e.body.setSize(30, 30);
    e.enemyType = type;
    e.hp = type === 'wildlife' ? 30 + this.day * 5 : 45 + this.day * 8;
    e.speed = type === 'wildlife' ? 70 + this.day * 4 : 85 + this.day * 5;
    e.damage = type === 'wildlife' ? 8 + this.day : 12 + this.day * 1.5;
    e.aggroRange = type === 'wildlife' ? 150 : 180;
    e.attackCooldown = 0;
    e.setDepth(8);
    this.enemies.add(e);
  }

  collectPickup(player, pickup) {
    if (this.popupOpen || this.isDead || this.won) return;
    // Golden still auto-wins when picked (boss already defeated or nearby)
    if (pickup.pickupType === 'golden') {
      this.winGame();
      return;
    }
    this.showItemPopupFor(pickup);
  }

  collectWeapon(player, weapon) {
    if (this.popupOpen || this.isDead || this.won) return;
    this.showItemPopupFor(weapon);
  }

  showItemPopupFor(item) {
    let title = '', desc = '', stats = '', type = item.pickupType || 'weapon';

    if (type === 'wig') {
      const wig = WIGS[item.wigId] || WIGS.yellow;
      title = wig.name;
      desc = wig.desc || 'A discarded wig. Still has some life in it.';
      stats = `Heals while worn • Lasts 1 day\nSpeed x${wig.speedMult || 1}  Heal x${wig.healRate || 1}`;
      type = 'wig';
    } else if (type === 'food') {
      const f = FOOD_TYPES[item.foodType] || FOOD_TYPES.candy;
      title = f.name || item.foodType;
      desc = f.desc || 'Questionable sustenance.';
      stats = `Restores ${f.hunger} Hunger` + (f.fart === 'loud' ? '\n💨 Loud fart (knockback)' : (f.fart === 'quiet' ? '\n*quiet toot*' : ''));
      type = 'food';
    } else if (type === 'carcass') {
      const kind = item.carcassType || 'wildlife';
      title = kind === 'boss' ? 'Guardian Carcass' : (kind === 'pirate' ? 'Pirate Corpse' : 'Raccoon Carcass');
      desc = kind === 'boss'
        ? 'Still steaming. Something valuable might be on it.'
        : 'Warm enough to search. Cold enough to regret it.';
      const odds = (typeof LootTables !== 'undefined') ? LootTables.oddsText(kind === 'boss' ? 'boss' : kind) : 'varies';
      stats = 'One search only\nOdds: ' + odds;
      type = 'carcass';
    } else {
      title = 'Rusty Blade';
      desc = 'A battered knife. Better than fists.';
      stats = 'Enables melee attacks\nDamage: ~18';
      type = 'weapon';
    }

    this.nearbyItem = item;
    this.events.emit('showItemPopup', { title, desc, stats, type, itemRef: item });
  }


  searchCarcass(item) {
    if (!item || !item.active || item.searched) {
      this.showFloatingText(this.player.x, this.player.y - 40, 'Already picked clean', '#95a5a6');
      return;
    }
    item.searched = true;
    const kindRaw = item.carcassType || 'wildlife';
    const kind = (kindRaw === 'boss' || kindRaw === 'pirate') ? kindRaw : 'wildlife';
    const x = item.x;
    const y = item.y;
    if (item.label) { item.label.destroy(); item.label = null; }
    item.setAlpha(0.45);
    item.setTint(0x3a2020);

    let msg = 'Nothing but fluff.';
    if (typeof LootTables !== 'undefined') {
      const entry = LootTables.roll(kind);
      const resolved = LootTables.resolve(entry);
      msg = resolved.label;
      let ox = 0;
      resolved.actions.forEach((a, i) => {
        const dx = (i % 2 === 0 ? 1 : -1) * (12 + i * 6);
        const dy = Math.floor(i / 2) * 10;
        if (a.type === 'food') this.spawnFood(x + dx, y + dy, a.value);
        else if (a.type === 'weapon') this.spawnWeapon(x + dx, y + dy);
        else if (a.type === 'wig') this.spawnWig(x + dx, y + dy - 8, a.value);
      });
    } else {
      // Fallback if LootTables missing
      if (Math.random() < 0.5) this.spawnFood(x, y + 8, 'rotting');
      msg = 'Found scraps.';
    }

    this.showFloatingText(this.player.x, this.player.y - 40, msg, '#e67e22');
    if (typeof Journal !== 'undefined') Journal.log('Searched a carcass: ' + msg, 'combat');
    if (typeof Haptics !== 'undefined') Haptics.pickup();
    if (typeof NoiseSynth !== 'undefined' && NoiseSynth.ready) NoiseSynth.pickup();
    this.nearbyItem = null;

    this.time.delayedCall(400, () => {
      if (item && item.active && item.body) item.body.enable = false;
    });
  }

  resolveItemAction(action, data) {
    const item = data.itemRef || this.nearbyItem;
    if (!item || !item.active) return;

    if (action === 'leave') {
      this.nearbyItem = null;
      return;
    }

    if (data.type === 'carcass' && (action === 'equip' || action === 'search')) {
      this.searchCarcass(item);
      return;
    }

    if (data.type === 'wig' && action === 'equip') {
      this.currentWig = WIGS[item.wigId] || WIGS.yellow;
      this.wigTimeLeft = DAY_LENGTH_MS;
      this.stats.wigsFound++;
      this.showFloatingText(this.player.x, this.player.y - 40, `Equipped: ${this.currentWig.name}`, '#f1c40f');
      if (typeof Haptics !== 'undefined') Haptics.equip();
      if (typeof NoiseSynth !== 'undefined' && NoiseSynth.ready) NoiseSynth.equip();
      if (typeof Journal !== 'undefined') Journal.log('Wore ' + (this.currentWig && this.currentWig.name ? this.currentWig.name : 'a wig') + '.', 'item');
      // Crude equip quip
      const quip = (typeof getWigQuip === 'function') ? getWigQuip(this.currentWig.id) : this.currentWig.name;
      this.showDialogueBanner(quip, '#e8c97a');
      this.updatePlayerAppearance();
      if (item.label) item.label.destroy();
      item.destroy();
    } else if (data.type === 'food' && action === 'eat') {
      const f = FOOD_TYPES[item.foodType] || FOOD_TYPES.candy;
      this.hunger = Math.min(100, this.hunger + f.hunger);
      this.stats.foodEaten++;
      this.showFloatingText(this.player.x, this.player.y - 40, `+${f.hunger} Hunger`, '#2ecc71');
      if (typeof Haptics !== 'undefined') Haptics.eat();
      if (typeof Journal !== 'undefined') Journal.log('Ate something regrettable.', 'item');
      if (f.fart === 'loud') {
        this.doFartKnockback(this.player.x, this.player.y);
        this.showFloatingText(this.player.x, this.player.y - 60, '💨 LOUD FART!', '#e67e22');
        if (typeof Haptics !== 'undefined') Haptics.fart();
      } else if (f.fart === 'quiet') {
        this.showFloatingText(this.player.x, this.player.y - 55, '*toot*', '#95a5a6');
      }
      item.destroy();
    } else if (data.type === 'weapon' && (action === 'equip' || action === 'take')) {
      this.hasWeapon = true;
      this.showFloatingText(this.player.x, this.player.y - 40, 'Weapon acquired!', '#ecf0f1');
      if (typeof Haptics !== 'undefined') Haptics.pickup();
      if (typeof NoiseSynth !== 'undefined' && NoiseSynth.ready) NoiseSynth.pickup();
      if (typeof Journal !== 'undefined') Journal.log('Found a rusty blade.', 'item');
      item.destroy();
    }

    this.nearbyItem = null;
    this.events.emit('updateStats', this.getUIState());
  }

  doFartKnockback(x, y) {
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      const dist = Phaser.Math.Distance.Between(x, y, e.x, e.y);
      if (dist < 120) {
        const angle = Phaser.Math.Angle.Between(x, y, e.x, e.y);
        e.setVelocity(Math.cos(angle) * 280, Math.sin(angle) * 280);
        this.time.delayedCall(200, () => { if (e.active) e.setVelocity(0, 0); });
      }
    });
  }

  hitByEnemy(player, enemy) {
    if (this.isDead || this.won) return;
    if (enemy.attackCooldown > 0) return;
    enemy.attackCooldown = 800;
    const dmg = enemy.damage * (this.currentWig.damageTakenMult || 1);
    this.health -= dmg;
    this.cameras.main.shake(80, 0.008);
    this._lastHitBy = enemy;
    if (typeof Haptics !== 'undefined') {
      if (enemy.isBoss) Haptics.bossHit();
      else Haptics.takeDamage();
    }
    if (typeof NoiseSynth !== 'undefined' && NoiseSynth.ready) {
      if (enemy.isBoss) NoiseSynth.bossHit();
      else NoiseSynth.hurt();
    }
    this.showFloatingText(player.x, player.y - 30, `-${Math.round(dmg)}`, '#e74c3c');
    // Knock player a bit
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    player.setVelocity(Math.cos(angle) * 180, Math.sin(angle) * 180);
    this.time.delayedCall(120, () => {
      if (player.active) player.setVelocity(0, 0);
    });
    if (this.health <= 0) this.die();
  }

  performAttack() {
    if (this.attackCooldown > 0 || this.isDead) return;
    const usingBlade = this.hasWeapon && this.useWeaponMode;
    const cd = (usingBlade ? PLAYER_ATTACK_COOLDOWN : PLAYER_ATTACK_COOLDOWN * 0.75) / (this.currentWig.attackSpeedMult || 1);
    this.attackCooldown = cd;

    // Attack pose sprite (wigged vs bald)
    const poseKey = this.getAttackPoseKey(usingBlade);
    if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.set(this.player, poseKey);
    else this.player.setTexture(poseKey);
    this.player.setDisplaySize(52, 78);
    this.attackPoseTimer = 280;
    this.time.delayedCall(280, () => {
      if (this.player && this.player.active) this.updatePlayerAppearance();
    });

    // Hit detection
    const range = usingBlade ? PLAYER_ATTACK_RANGE : PLAYER_ATTACK_RANGE * 0.7;
    const dmg = (usingBlade ? this.weaponDamage : this.fistDamage) * (this.currentWig.damageMult || 1);
    let hitSomething = false;

    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (dist < range) {
        hitSomething = true;
        e.hp -= dmg;
        this.showFloatingText(e.x, e.y - 25, `-${Math.round(dmg)}`, '#f1c40f');
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, e.x, e.y);
        e.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
        this.time.delayedCall(150, () => { if (e.active) e.setVelocity(0, 0); });
        // Hit sound
        if (typeof NoiseSynth !== 'undefined' && NoiseSynth.ready) NoiseSynth.hit();
        else if (this.sound) this.sound.play('sfx_hit', { volume: (typeof QualityTier !== 'undefined') ? QualityTier.sfxVol() : 0.5 });
        if (e.hp <= 0) {
          this.stats.enemiesKilled++;
          const kn = e.isBoss ? 'the cave guardian' : (e.enemyType === 'pirate' ? 'a pirate' : 'a raccoon');
          if (typeof Journal !== 'undefined') {
            Journal.log('Put down ' + kn + '.', 'combat');
          }
          for (let b = 0; b < 6; b++) {
            const drop = this.add.circle(
              e.x + Phaser.Math.Between(-18, 18),
              e.y + Phaser.Math.Between(-12, 12),
              Phaser.Math.Between(2, 5),
              0x8b0000, 0.8
            ).setDepth(4);
            this.tweens.add({ targets: drop, alpha: 0.3, duration: 4000, onComplete: () => drop.destroy() });
          }
          this.spawnCarcass(e.x, e.y, e.enemyType || 'wildlife', !!e.isBoss);
          e.destroy();
        }
      }
    });

    // Punch or whiff: procedural noise primary, file as backup layer
    if (typeof NoiseSynth !== 'undefined' && NoiseSynth.ready) {
      if (hitSomething) NoiseSynth.punch();
      else NoiseSynth.whiff();
    } else if (this.sound) {
      const sv = (typeof QualityTier !== 'undefined') ? QualityTier.sfxVol() : 0.45;
      if (hitSomething) this.sound.play('sfx_punch', { volume: sv });
      else this.sound.play('sfx_whiff', { volume: sv * 0.9 });
    }
    if (typeof Haptics !== 'undefined') {
      if (hitSomething) Haptics.attackHit();
      else Haptics.attackMiss();
    }

    // Occasional enemy taunt on hit
    if (hitSomething && Math.random() < 0.18) {
      const line = Math.random() < 0.5
        ? ((typeof getRaccoonTaunt === 'function') ? getRaccoonTaunt() : '')
        : ((typeof getPirateTaunt === 'function') ? getPirateTaunt() : '');
      if (line) this.showDialogueBanner(line, '#b0b0b0');
    }
  }

  hasActiveWig() {
    return this.currentWig && this.wigTimeLeft > 0;
  }

  updatePlayerAppearance() {
    let key = 'kraig';
    if (this.hasActiveWig() && this.currentWig) {
      const id = this.currentWig.id || 'yellow';
      const candidate = 'kraig_wig_' + id;
      if (this.textures.exists(candidate)) key = candidate;
      else if (id === 'golden') key = 'kraig_wig_golden';
      else key = 'kraig_wig_yellow';
    }
    if (this.player && this.player.active) {
      if (typeof SpriteAtlas !== 'undefined') SpriteAtlas.set(this.player, key);
      else this.player.setTexture(key);
      this.player.setDisplaySize(52, 78);
    }
  }

  getAttackPoseKey(usingBlade) {
    if (this.hasActiveWig() && this.currentWig) {
      const id = this.currentWig.id || 'yellow';
      const suffix = usingBlade ? '_weapon' : '_punch';
      const specific = 'kraig_wig_' + id + suffix;
      if (this.textures.exists(specific)) return specific;
      // generic wig attack
      return usingBlade ? 'kraig_wig_weapon' : 'kraig_wig_punch';
    }
    return usingBlade ? 'kraig_weapon' : 'kraig_punch';
  }

  showFloatingText(x, y, msg, color) {
    // Cap concurrent floating texts on low tier
    if (!this._floatTexts) this._floatTexts = [];
    this._floatTexts = this._floatTexts.filter(o => o && o.active);
    const maxF = (typeof QualityTier !== 'undefined') ? QualityTier.get().floatingTextMax : 12;
    if (this._floatTexts.length >= maxF) {
      const oldest = this._floatTexts.shift();
      if (oldest) oldest.destroy();
    }
    const t = this.add.text(x, y, msg, {
      fontFamily: 'Courier New', fontSize: '13px', color: color,
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => { t.destroy(); }
    });
    this._floatTexts.push(t);
  }

  getUIState() {
    return {
      health: this.health,
      hunger: this.hunger,
      day: this.day,
      wigName: this.currentWig.name,
      wigColor: this.currentWig.color,
      wigTimeLeft: this.wigTimeLeft,
      dayLength: DAY_LENGTH_MS,
      hasWeapon: this.hasWeapon,
      stats: this.stats
    };
  }

  update(time, delta) {
    if (this.isDead || this.won || this.paused || this.popupOpen) return;

    const dt = delta / 1000;

    // Pause
    if (this.wasd && Phaser.Input.Keyboard.JustDown(this.wasd.pause) || (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey))) {
      this.paused = true;
      this.physics.pause();
      this.scene.pause('UI');
      this.events.emit('showPause', true);
      return;
    }

    // Movement
    let vx = 0, vy = 0;
    const speed = PLAYER_BASE_SPEED * (this.currentWig.speedMult || 1);

    if ((this.cursors && this.cursors.left.isDown) || (this.wasd && this.wasd.left.isDown)) vx = -1;
    else if ((this.cursors && this.cursors.right.isDown) || (this.wasd && this.wasd.right.isDown)) vx = 1;
    if ((this.cursors && this.cursors.up.isDown) || (this.wasd && this.wasd.up.isDown)) vy = -1;
    else if ((this.cursors && this.cursors.down.isDown) || (this.wasd && this.wasd.down.isDown)) vy = 1;

    // Virtual joystick
    if (this.virtualJoy.active) {
      vx = this.virtualJoy.dx;
      vy = this.virtualJoy.dy;
    }

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy) || 1;
      this.player.setVelocity((vx / len) * speed, (vy / len) * speed);
      if (Math.abs(vx) > Math.abs(vy)) {
        this.player.setFlipX(vx < 0);
        this.player.facing = vx < 0 ? 'left' : 'right';
        this.playerFacing = this.player.facing;
      } else {
        this.player.facing = vy < 0 ? 'up' : 'down';
        this.playerFacing = this.player.facing;
      }
    } else {
      this.player.setVelocity(0, 0);
    }

    // Enter / exit abandoned buildings (roofs hide, interiors + furniture show)
    this.updateBuildingInteriors();

    // Attack (keyboard or hold ATK button — cooldown gates rate)
    if ((this.wasd && this.wasd.attack.isDown) || this.attackPressed) {
      this.performAttack();
    }
    if (this.attackCooldown > 0) this.attackCooldown -= delta;

    // Hunger drain
    const hungerRate = HUNGER_DRAIN_PER_SEC * (this.currentWig.hungerMult || 1);
    this.hunger -= hungerRate * dt;
    if (this.hunger < 0) this.hunger = 0;

    // Starvation damage + blocks wig heal
    if (this.hunger <= 0) {
      this.health -= 6 * dt;
      if (this.health <= 0) {
        if (typeof Journal !== 'undefined') Journal.setCause('starvation');
        this.die();
      }
    } else if (this.wigTimeLeft > 0) {
      // Wig heals
      this.health = Math.min(100, this.health + WIG_HEAL_PER_SEC * (this.currentWig.healRate || 1) * dt);
      this.wigTimeLeft -= delta;
      if (this.wigTimeLeft < 0) this.wigTimeLeft = 0;
    }

    // Day cycle
    this.dayTimer += delta;
    if (this.dayTimer >= DAY_LENGTH_MS) {
      this.dayTimer = 0;
      this.day++;
      this.stats.daysSurvived = this.day - 1;
      this.showFloatingText(this.player.x, this.player.y - 50, `DAY ${this.day}`, '#ffd700');
      if (typeof Haptics !== 'undefined') Haptics.dayChange();
      if (typeof Journal !== 'undefined') Journal.log('Dawn of day ' + this.day + '.', 'day');
      // Respawn / increase enemies
      this.spawnEnemiesForDay();
      // Occasional extra wig drops as days progress (scarcer feel by not over-spawning)
      if (this.day % 2 === 0) {
        const id = Phaser.Utils.Array.GetRandom(['red', 'silver', 'orange', 'black', 'rainbow']);
        this.spawnWig(
          Phaser.Math.Between(100, WORLD_WIDTH - 100),
          Phaser.Math.Between(100, WORLD_HEIGHT - 150),
          id
        );
      }
    }

    // Performance monitor + dynamic quality
    if (typeof PerfMonitor !== 'undefined') {
      PerfMonitor.sample(this, delta);
      this._fps = PerfMonitor.fps;
    } else {
      this._fpsAccum += delta;
      this._fpsFrames++;
      if (this._fpsAccum >= 500) {
        this._fps = Math.round((this._fpsFrames * 1000) / this._fpsAccum);
        this._fpsAccum = 0;
        this._fpsFrames = 0;
      }
    }

    // Dynamic quality drop (uses this._fps from above, ~every 0.5s when fps updates)
    if (typeof QualityTier !== 'undefined' && this._fps) {
      if (this._fps < 26) {
        this._lowFpsStreak = (this._lowFpsStreak || 0) + 1;
        this._highFpsStreak = 0;
        // streak counted per frame while low — gate on ~2s using frame estimate
        if (this._lowFpsStreak >= 120) {
          if (QualityTier.downgrade('fps ' + this._fps)) {
            this._lowFpsStreak = 0;
            this._cullRange = QualityTier.current === 'low' ? 700 : 900;
            this.showFloatingText(this.player.x, this.player.y - 70, 'Quality → ' + QualityTier.current.toUpperCase(), '#e67e22');
            if (typeof GBLog === 'function') GBLog('Perf', 'quality downgrade →', QualityTier.current);
          }
        }
      } else if (this._fps > 50) {
        this._highFpsStreak = (this._highFpsStreak || 0) + 1;
        this._lowFpsStreak = 0;
      } else {
        this._lowFpsStreak = Math.max(0, (this._lowFpsStreak || 0) - 1);
        this._highFpsStreak = 0;
      }
    }

    // Day / night tint (0 = dawn, 0.5 = noon-ish, 1 = night edge before next day)
    if (this.dayTint) {
      const phase = Phaser.Math.Clamp(this.dayTimer / DAY_LENGTH_MS, 0, 1);
      // Curve: brighter mid-day, blue-dark near day end
      let alpha = 0;
      let color = 0x1a2035;
      if (phase < 0.15) {
        // dawn — warm low
        alpha = 0.12 * (1 - phase / 0.15);
        color = 0x4a3020;
      } else if (phase < 0.55) {
        alpha = 0.02;
        color = 0x3a4a20;
      } else if (phase < 0.85) {
        alpha = 0.08 + (phase - 0.55) * 0.25;
        color = 0x1a2840;
      } else {
        alpha = 0.22 + (phase - 0.85) * 0.35;
        color = 0x0a1020;
      }
      this.dayTint.setFillStyle(color, Phaser.Math.Clamp(alpha, 0, 0.38));
    }

    // Enemy AI (culled + staggered)
    this.updateEnemies(dt);

    // UI sync
    const state = this.getUIState();
    state.fps = this._fps;
    if (typeof PerfMonitor !== 'undefined') {
      state.perf = PerfMonitor.get();
      state.fps = PerfMonitor.fps || this._fps;
    }
    state.quality = (typeof QualityTier !== 'undefined') ? QualityTier.getTierName() : 'med';
    this.events.emit('updateStats', state);
  }

  updateEnemies(dt) {
    if (!this.player || !this.player.active) return;

    const Q = (typeof QualityTier !== 'undefined') ? QualityTier.get() : null;
    const everyN = (Q && Q.enemyUpdateEveryNFrames) ? Q.enemyUpdateEveryNFrames : 1;
    const maxActive = (Q && Q.maxActiveEnemies) ? Q.maxActiveEnemies : 24;
    this._enemyFrame = (this._enemyFrame || 0) + 1;

    const px = this.player.x;
    const py = this.player.y;
    const cull = this._cullRange || 900;
    const cull2 = cull * cull;

    // Sort-ish: process near enemies; disable far bodies
    const kids = this.enemies.getChildren();
    let activeCount = 0;
    const near = [];

    for (let i = 0; i < kids.length; i++) {
      const e = kids[i];
      if (!e.active) continue;
      const dx = e.x - px;
      const dy = e.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 > cull2) {
        // Far: sleep physics + skip AI
        if (e.body) e.body.enable = false;
        e.setVisible(false);
        continue;
      }
      if (e.body && !e.body.enable) e.body.enable = true;
      e.setVisible(true);
      near.push(e);
      activeCount++;
    }

    // Soft cap: hide extras farthest from player if over max
    if (near.length > maxActive) {
      near.sort((a, b) => {
        const da = (a.x - px) * (a.x - px) + (a.y - py) * (a.y - py);
        const db = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
        return da - db;
      });
      for (let i = maxActive; i < near.length; i++) {
        const e = near[i];
        if (e.body) e.body.enable = false;
        e.setVisible(false);
      }
      near.length = maxActive;
    }

    // Stagger AI on low tier
    if (everyN > 1 && (this._enemyFrame % everyN) !== 0) return;

    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (!e.active || !e.visible) continue;
      if (e.attackCooldown > 0) e.attackCooldown -= dt * 1000 * everyN;

      const dist = Phaser.Math.Distance.Between(px, py, e.x, e.y);
      let aggro = e.aggroRange || 120;
      if (e.enemyType === 'wildlife') aggro *= (this.currentWig.wildlifeAggroMult || 1);
      else aggro *= (this.currentWig.pirateAggroMult || 1);
      if (e.isBoss) aggro = Math.max(aggro, 220);

      const meleeRange = e.isBoss ? 64 : 46;

      // Boss telegraph: wind-up before strike
      if (e.isBoss && dist < meleeRange + 40 && !this.isDead) {
        if (!e._winding && e.attackCooldown <= 0) {
          e._winding = true;
          e.setTint(0xff6644);
          // Warning ring at player
          if (e._warnGfx) e._warnGfx.destroy();
          e._warnGfx = this.add.circle(this.player.x, this.player.y, 36, 0xff2200, 0.2)
            .setStrokeStyle(2, 0xff4400, 0.85).setDepth(15);
          this.tweens.add({
            targets: e._warnGfx, scale: 1.35, alpha: 0.05, duration: 550,
            onComplete: () => { if (e._warnGfx) { e._warnGfx.destroy(); e._warnGfx = null; } }
          });
          this.showFloatingText(e.x, e.y - 50, '!', '#ff4400');
          this.time.delayedCall(550, () => {
            e._winding = false;
            if (e.active) e.clearTint();
            if (!this.player || !this.player.active || this.isDead) return;
            const d2 = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
            if (d2 < meleeRange + 20 && e.attackCooldown <= 0) {
              e.attackCooldown = 1400;
              const dmg = (e.damage || 18) * (this.currentWig.damageTakenMult || 1);
              this.health -= dmg;
              this._lastHitBy = e;
              this.cameras.main.shake(100, 0.014);
              if (typeof Haptics !== 'undefined') Haptics.bossHit();
              if (typeof NoiseSynth !== 'undefined' && NoiseSynth.ready) NoiseSynth.bossHit();
              this.showFloatingText(this.player.x, this.player.y - 30, '-' + Math.round(dmg), '#e74c3c');
              this.player.setTint(0xff6666);
              this.time.delayedCall(120, () => {
                if (this.player && this.player.active) this.player.clearTint();
              });
              const ang = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
              this.player.setVelocity(Math.cos(ang) * 220, Math.sin(ang) * 220);
              this.time.delayedCall(120, () => {
                if (this.player && this.player.active) this.player.setVelocity(0, 0);
              });
              if (this.health <= 0) this.die();
            }
          });
        }
        // While winding, boss still creeps in slowly
        if (e._winding) {
          const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
          e.setVelocity(Math.cos(angle) * (e.speed || 55) * 0.35, Math.sin(angle) * (e.speed || 55) * 0.35);
          continue;
        }
      }

      if (!e.isBoss && dist < meleeRange && e.attackCooldown <= 0 && !this.isDead) {
        e.attackCooldown = 900;
        const dmg = (e.damage || 10) * (this.currentWig.damageTakenMult || 1);
        this.health -= dmg;
        this.cameras.main.shake(70, 0.01);
        this._lastHitBy = e;
        if (typeof Haptics !== 'undefined') Haptics.takeDamage();
        if (typeof NoiseSynth !== 'undefined' && NoiseSynth.ready) NoiseSynth.hurt();
        this.showFloatingText(this.player.x, this.player.y - 30, '-' + Math.round(dmg), '#e74c3c');
        this.player.setTint(0xff6666);
        this.time.delayedCall(100, () => {
          if (this.player && this.player.active) this.player.clearTint();
        });
        const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
        this.player.setVelocity(Math.cos(angle) * 160, Math.sin(angle) * 160);
        this.time.delayedCall(100, () => {
          if (this.player && this.player.active) this.player.setVelocity(0, 0);
        });
        if (this.health <= 0) this.die();
        continue;
      }

      if (dist < aggro) {
        const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
        e.setVelocity(Math.cos(angle) * (e.speed || 70), Math.sin(angle) * (e.speed || 70));
        e.setFlipX(e.x > this.player.x);
      } else if (Phaser.Math.Between(0, 120) < 1) {
        e.setVelocity(Phaser.Math.Between(-35, 35), Phaser.Math.Between(-35, 35));
      }
    }
  }


  die() {
    if (this.isDead) return;
    this.isDead = true;
    if (typeof Haptics !== 'undefined') Haptics.death();

    // Resolve death cause for journal
    if (typeof Journal !== 'undefined') {
      if (!Journal.cause) {
        const h = this._lastHitBy;
        if (h && h.isBoss) Journal.setCause('boss', 'the cave guardian');
        else if (h && h.enemyType === 'pirate') Journal.setCause('pirate', 'a harbor pirate');
        else if (h && h.enemyType === 'wildlife') Journal.setCause('wildlife', 'a feral raccoon');
        else if (this.hunger <= 0) Journal.setCause('starvation');
        else Journal.setCause('unknown');
      }
      Journal.log(Journal._causeLine(), 'meta');
    }

    this.player.setTint(0xe74c3c);
    this.physics.pause();
    if (typeof MusicManager !== 'undefined') {
      MusicManager.fadeOut(this, 'music_game', 600);
    } else if (this.sound.get('music_game')) {
      this.sound.stopByKey('music_game');
    }
    this.stats.daysSurvived = this.day - 1 + (this.dayTimer / DAY_LENGTH_MS);

    const line = (typeof getDeathLine === 'function') ? getDeathLine() : 'Not again…';
    this.showDeathMonologue(line, () => {
      this.scene.stop('UI');
      const payload = {
        won: false,
        stats: this.stats,
        day: this.day,
        journal: (typeof Journal !== 'undefined') ? Journal.snapshot() : null,
        deathNote: (typeof Journal !== 'undefined') ? Journal.buildDeathNote({
          won: false, stats: this.stats, day: this.day
        }) : null
      };
      this.scene.start('End', payload);
    });
  }

  showDeathMonologue(line, onDone) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const cam = this.cameras.main;
    const cx = cam.scrollX + w / 2;
    const cy = cam.scrollY + h / 2;

    const bg = this.add.rectangle(cx, cy, w, h, 0x000000, 0.82).setScrollFactor(0).setDepth(500);
    const title = this.add.text(cx, cy - 70, 'YOU DIED', {
      fontFamily: 'Georgia, serif', fontSize: '28px', color: '#c0392b',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(501);
    const body = this.add.text(cx, cy + 10, line, {
      fontFamily: 'Courier New', fontSize: '14px', color: '#d4c4a8',
      align: 'center', wordWrap: { width: w - 60 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(501);
    const hint = this.add.text(cx, cy + 90, 'tap to continue', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#888'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(501);

    const finish = () => {
      bg.destroy(); title.destroy(); body.destroy(); hint.destroy();
      if (onDone) onDone();
    };
    this.time.delayedCall(2800, finish);
    this.input.once('pointerdown', finish);
  }

  showDialogueBanner(text, color) {
    const w = this.cameras.main.width;
    const cam = this.cameras.main;
    const cx = cam.scrollX + w / 2;
    const cy = cam.scrollY + 130;
    const banner = this.add.text(cx, cy, text, {
      fontFamily: 'Courier New', fontSize: '13px', color: color || '#e8c97a',
      backgroundColor: '#1a1208', padding: { x: 10, y: 6 },
      align: 'center', wordWrap: { width: w - 40 },
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setScrollFactor(0).setDepth(250).setAlpha(0);
    this.tweens.add({
      targets: banner, alpha: 1, duration: 200,
      yoyo: false,
      onComplete: () => {
        this.time.delayedCall(3200, () => {
          this.tweens.add({ targets: banner, alpha: 0, duration: 400, onComplete: () => banner.destroy() });
        });
      }
    });
  }

  winGame() {
    if (this.won) return;
    this.won = true;
    this.physics.pause();
    if (typeof MusicManager !== 'undefined') {
      MusicManager.fadeOut(this, 'music_game', 800);
    } else if (this.sound.get('music_game')) {
      this.sound.stopByKey('music_game');
    }
    this.stats.daysSurvived = this.day - 1 + (this.dayTimer / DAY_LENGTH_MS);
    this.showFloatingText(this.player.x, this.player.y - 60, '★ YOU FOUND IT! ★', '#ffd700');
    if (typeof Haptics !== 'undefined') Haptics.win();
    this.time.delayedCall(1500, () => {
      this.scene.stop('UI');
      if (typeof Journal !== 'undefined') {
      Journal.log('Claimed the Golden Bouffant.', 'story');
    }
    this.scene.start('End', {
      won: true,
      stats: this.stats,
      day: this.day,
      journal: (typeof Journal !== 'undefined') ? Journal.snapshot() : null,
      deathNote: (typeof Journal !== 'undefined') ? Journal.buildDeathNote({
        won: true, stats: this.stats, day: this.day
      }) : null
    });
    });
  }

  // Called from UI when unpausing
  unpause() {
    this.paused = false;
    this.physics.resume();
    this.scene.resume('UI');
  }
}
