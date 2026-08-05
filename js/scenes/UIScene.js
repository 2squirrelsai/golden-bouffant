class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;

    // ===== WOOD ARCADE CABINET CHROME =====
    // Wood grain colors
    const woodDark = 0x3d2914;
    const woodMid = 0x5c3d22;
    const woodLight = 0x7a5230;
    const woodEdge = 0x2a1a0c;

    // Top marquee (wood)
    this.add.rectangle(w/2, 28, w, 56, woodDark).setScrollFactor(0).setDepth(100);
    this.add.rectangle(w/2, 28, w - 10, 46, woodMid).setScrollFactor(0).setDepth(100);
    // wood grain lines
    for (let i = 0; i < 6; i++) {
      this.add.rectangle(w/2, 10 + i * 7, w - 14, 1, woodLight, 0.25).setScrollFactor(0).setDepth(100);
    }
    this.add.text(w/2, 18, 'GOLDEN BOUFFANT', {
      fontFamily: 'Georgia, serif', fontSize: '18px', color: '#ffd700',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    this.add.text(w/2, 38, "Kraig's Wig Odyssey", {
      fontFamily: 'Georgia, serif', fontSize: '11px', color: '#e8c97a'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // Side wood bezels
    this.add.rectangle(6, h/2, 12, h, woodDark).setScrollFactor(0).setDepth(100);
    this.add.rectangle(w - 6, h/2, 12, h, woodDark).setScrollFactor(0).setDepth(100);
    this.add.rectangle(6, h/2, 8, h - 20, woodMid).setScrollFactor(0).setDepth(100);
    this.add.rectangle(w - 6, h/2, 8, h - 20, woodMid).setScrollFactor(0).setDepth(100);

    // Bottom control panel (thick wood)
    const panelH = 170;
    this.add.rectangle(w/2, h - panelH/2, w, panelH, woodDark).setScrollFactor(0).setDepth(100);
    this.add.rectangle(w/2, h - panelH/2, w - 12, panelH - 12, woodMid).setScrollFactor(0).setDepth(100);
    // grain
    for (let i = 0; i < 8; i++) {
      this.add.rectangle(w/2, h - panelH + 16 + i * 18, w - 20, 1, woodLight, 0.2).setScrollFactor(0).setDepth(100);
    }
    // brass screws
    const screw = (x, y) => {
      this.add.circle(x, y, 5, 0xb8860b).setScrollFactor(0).setDepth(101);
      this.add.circle(x, y, 2, 0x5c4033).setScrollFactor(0).setDepth(102);
    };
    screw(22, h - panelH + 14);
    screw(w - 22, h - panelH + 14);
    screw(22, h - 16);
    screw(w - 22, h - 16);

    // ===== HUD (inside screen area, top) =====
    const hudY = 62;
    this.add.rectangle(12, hudY, 140, 14, 0x000000, 0.65).setOrigin(0, 0).setScrollFactor(0).setDepth(90);
    this.healthFill = this.add.rectangle(13, hudY + 1, 138, 12, 0xc0392b).setOrigin(0, 0).setScrollFactor(0).setDepth(91);
    this.healthText = this.add.text(82, hudY + 7, 'HP', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(92);

    this.add.rectangle(12, hudY + 18, 140, 14, 0x000000, 0.65).setOrigin(0, 0).setScrollFactor(0).setDepth(90);
    this.hungerFill = this.add.rectangle(13, hudY + 19, 138, 12, 0xd68910).setOrigin(0, 0).setScrollFactor(0).setDepth(91);
    this.hungerText = this.add.text(82, hudY + 25, 'HUNGER', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(92);

    this.add.rectangle(12, hudY + 36, 140, 14, 0x000000, 0.65).setOrigin(0, 0).setScrollFactor(0).setDepth(90);
    this.wigFill = this.add.rectangle(13, hudY + 37, 138, 12, 0xc9a227).setOrigin(0, 0).setScrollFactor(0).setDepth(91);
    this.wigText = this.add.text(82, hudY + 43, 'WIG', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#000'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(92);

    this.dayLabel = this.add.text(w - 14, hudY + 4, 'DAY 1', {
      fontFamily: 'Courier New', fontSize: '14px', color: '#ffd700',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(92);

    // FPS / quality debug (always on for now; dim)
    this.showFps = true;
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('fps') === '0') this.showFps = false;
    } catch (e) {}
    this.fpsLabel = this.add.text(14, h - 178, '', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#6a7a5a'
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(92).setVisible(this.showFps);

    this.wigNameLabel = this.add.text(w - 14, hudY + 22, 'The Classic', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#ddd'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(92);

    this.weaponLabel = this.add.text(w - 14, hudY + 38, 'Unarmed', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#95a5a6'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(92);

    // ===== MINIMAP (top-right under day label) =====
    this.mapSize = 96;
    this.mapX = w - 14 - this.mapSize;
    this.mapY = hudY + 56;
    // Frame
    this.add.rectangle(this.mapX + this.mapSize/2, this.mapY + this.mapSize/2, this.mapSize + 6, this.mapSize + 6, 0x1a1208, 0.9)
      .setStrokeStyle(2, 0x8b7355).setScrollFactor(0).setDepth(90);
    // Zone tint background (drawn once)
    this.mapBg = this.add.graphics().setScrollFactor(0).setDepth(91);
    this.mapBg.fillStyle(0x0d1a0d, 1);
    this.mapBg.fillRect(this.mapX, this.mapY, this.mapSize * 0.5, this.mapSize); // west wildlife
    this.mapBg.fillStyle(0x1a0d0d, 1);
    this.mapBg.fillRect(this.mapX + this.mapSize * 0.5, this.mapY, this.mapSize * 0.5, this.mapSize); // east pirates
    // Coast strip at bottom of map
    this.mapBg.fillStyle(0x1a3040, 1);
    this.mapBg.fillRect(this.mapX, this.mapY + this.mapSize - 8, this.mapSize, 8);
    // Cave marker (NE)
    const caveMX = this.mapX + this.mapSize * ((WORLD_WIDTH - 320) / WORLD_WIDTH);
    const caveMY = this.mapY + this.mapSize * (280 / WORLD_HEIGHT);
    this.add.rectangle(caveMX, caveMY, 7, 7, 0xffd700).setScrollFactor(0).setDepth(93);
    this.add.text(caveMX + 6, caveMY - 1, 'C', {
      fontFamily: 'Courier New', fontSize: '8px', color: '#ffd700'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(93);
    // Player blip (updated each frame)
    this.mapPlayer = this.add.circle(this.mapX + 8, this.mapY + this.mapSize/2, 3, 0x2ecc71)
      .setScrollFactor(0).setDepth(94);
    this.mapPlayerDir = this.add.triangle(0, 0, 0, -5, 4, 3, -4, 3, 0xf1c40f)
      .setScrollFactor(0).setDepth(95);
    // Enemy blips container
    this.mapEnemyGfx = this.add.graphics().setScrollFactor(0).setDepth(92);
    this.mapLabel = this.add.text(this.mapX + this.mapSize/2, this.mapY + this.mapSize + 8, 'MAP · tap', {
      fontFamily: 'Courier New', fontSize: '9px', color: '#8b7355'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(92);

    // Invisible hit area over minimap (tap/click for legend)
    this.mapHit = this.add.rectangle(
      this.mapX + this.mapSize / 2,
      this.mapY + this.mapSize / 2,
      this.mapSize + 8,
      this.mapSize + 24,
      0x000000, 0.001
    ).setScrollFactor(0).setDepth(96).setInteractive({ useHandCursor: true });

    // Legend tooltip panel (hidden by default)
    const legW = 168;
    const legH = 118;
    const legX = this.mapX + this.mapSize / 2 - legW / 2;
    const legY = this.mapY + this.mapSize + 20;
    // Keep on screen
    const legCX = Phaser.Math.Clamp(legX + legW / 2, legW / 2 + 8, w - legW / 2 - 8);
    this.mapLegendBg = this.add.rectangle(legCX, legY + legH / 2, legW, legH, 0x1a1208, 0.96)
      .setStrokeStyle(2, 0xc9a227).setScrollFactor(0).setDepth(210).setVisible(false);
    this.mapLegendText = this.add.text(legCX - legW / 2 + 10, legY + 22,
      '● You (arrow = facing)\n' +
      '● Wildlife  ·  ● Pirate\n' +
      '■ C  Bouffant Cave\n' +
      'Green = west wildlife\n' +
      'Red = east pirates\n' +
      'Blue = coast',
      {
        fontFamily: 'Courier New', fontSize: '11px', color: '#d4c4a8',
        lineSpacing: 3
      }
    ).setScrollFactor(0).setDepth(211).setVisible(false);
    // Color the header gold via separate label
    this.mapLegendTitle = this.add.text(legCX, legY + 10, 'MAP LEGEND', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#ffd700'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(212).setVisible(false);

    this.mapLegendOpen = false;
    this.mapLegendTimer = null;

    const showLegend = () => {
      this.mapLegendOpen = true;
      this.mapLegendBg.setVisible(true);
      this.mapLegendText.setVisible(true);
      this.mapLegendTitle.setVisible(true);
      if (this.mapLegendTimer) this.mapLegendTimer.remove(false);
      this.mapLegendTimer = this.time.delayedCall(4500, hideLegend);
    };
    const hideLegend = () => {
      this.mapLegendOpen = false;
      this.mapLegendBg.setVisible(false);
      this.mapLegendText.setVisible(false);
      this.mapLegendTitle.setVisible(false);
    };
    this.mapHit.on('pointerdown', () => {
      if (this.mapLegendOpen) hideLegend();
      else showLegend();
    });
    // Desktop hover also works
    this.mapHit.on('pointerover', () => {
      if (!this.sys.game.device.input.touch) showLegend();
    });
    this.mapHit.on('pointerout', () => {
      if (!this.sys.game.device.input.touch) hideLegend();
    });

    // ===== Mobile touch controls (arcade panel) =====
    // Multi-touch: allow joystick + attack together
    this.input.addPointer(3);

    const joyX = 78;
    const joyY = h - 88;
    const joyRadius = 52;
    const knobRadius = 26;

    // Large invisible hit zone (easier thumbs)
    this.joyZone = this.add.circle(joyX, joyY, 72, 0x000000, 0.001)
      .setScrollFactor(0).setDepth(109)
      .setInteractive({ draggable: false, useHandCursor: false });

    this.joyBase = this.add.circle(joyX, joyY, joyRadius, 0x1a1208, 0.55)
      .setStrokeStyle(3, 0x8b7355, 0.7)
      .setScrollFactor(0).setDepth(110);
    this.joyKnob = this.add.circle(joyX, joyY, knobRadius, 0xc9a227, 0.95)
      .setStrokeStyle(2, 0xffd700, 0.5)
      .setScrollFactor(0).setDepth(111);
    this.add.text(joyX, joyY + 62, 'MOVE', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#a08060'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(111);

    this.joyOriginX = joyX;
    this.joyOriginY = joyY;
    this.joyPointerId = null;

    // Fist / Weapon toggle
    this.useWeapon = false;
    const togX = w / 2;
    this.toggleBg = this.add.rectangle(togX, joyY, 76, 40, 0x1a1208, 0.9)
      .setStrokeStyle(2, 0x8b7355).setScrollFactor(0).setDepth(110)
      .setInteractive({ useHandCursor: true });
    this.toggleLabel = this.add.text(togX, joyY - 2, 'FIST', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#e8c97a'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(111);
    this.add.text(togX, joyY + 14, 'MODE', {
      fontFamily: 'Courier New', fontSize: '9px', color: '#8b7355'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(111);

    this.toggleBg.on('pointerdown', () => {
      const g = this.scene.get('Game');
      if (!g || !g.hasWeapon) {
        this.toggleLabel.setColor('#e74c3c');
        this.time.delayedCall(300, () => this.toggleLabel.setColor('#e8c97a'));
        return;
      }
      this.useWeapon = !this.useWeapon;
      g.useWeaponMode = this.useWeapon;
      this.toggleLabel.setText(this.useWeapon ? 'BLADE' : 'FIST');
      this.toggleLabel.setColor(this.useWeapon ? '#95a5a6' : '#e8c97a');
    });

    // Attack — large zone + visual button
    const atkX = w - 78;
    this.atkZone = this.add.circle(atkX, joyY, 68, 0x000000, 0.001)
      .setScrollFactor(0).setDepth(109)
      .setInteractive({ useHandCursor: false });
    this.atkBtn = this.add.circle(atkX, joyY, 46, 0x8b1a1a, 0.92)
      .setStrokeStyle(3, 0xc0392b)
      .setScrollFactor(0).setDepth(110);
    this.atkLabel = this.add.text(atkX, joyY, 'ATK', {
      fontFamily: 'Courier New', fontSize: '15px', color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(111);
    this.add.text(atkX, joyY + 58, 'ATTACK', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#a08060'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(111);

    const getGame = () => this.scene.get('Game');

    const resetJoy = () => {
      this.joyPointerId = null;
      this.joyKnob.x = this.joyOriginX;
      this.joyKnob.y = this.joyOriginY;
      this.joyBase.setFillStyle(0x1a1208, 0.55);
      const g = getGame();
      if (g && g.virtualJoy) {
        g.virtualJoy.active = false;
        g.virtualJoy.dx = 0;
        g.virtualJoy.dy = 0;
        g.virtualJoy.pointerId = null;
      }
    };

    const setJoyFromPointer = (p) => {
      const dx = p.x - this.joyOriginX;
      const dy = p.y - this.joyOriginY;
      const maxD = joyRadius - 4;
      const dist = Math.min(maxD, Math.sqrt(dx * dx + dy * dy) || 0);
      const angle = Math.atan2(dy, dx);
      this.joyKnob.x = this.joyOriginX + Math.cos(angle) * dist;
      this.joyKnob.y = this.joyOriginY + Math.sin(angle) * dist;
      const g = getGame();
      if (g && g.virtualJoy) {
        const strength = dist / maxD;
        g.virtualJoy.active = true;
        g.virtualJoy.pointerId = p.id;
        g.virtualJoy.dx = Math.cos(angle) * strength;
        g.virtualJoy.dy = Math.sin(angle) * strength;
      }
    };

    this.joyZone.on('pointerdown', (p) => {
      this.joyPointerId = p.id;
      this.joyBase.setFillStyle(0x2a1a08, 0.75);
      setJoyFromPointer(p);
      if (typeof Haptics !== 'undefined') Haptics.light();
    });

    this.atkZone.on('pointerdown', (p) => {
      const g = getGame();
      if (g) g.attackPressed = true;
      this.atkBtn.setFillStyle(0xc0392b, 1);
      this.atkBtn.setScale(0.92);
      if (typeof Haptics !== 'undefined') Haptics.uiTap();
      if (typeof NoiseSynth !== 'undefined' && NoiseSynth.ready) NoiseSynth.ui();
    });
    this.atkZone.on('pointerup', () => {
      const g = getGame();
      if (g) g.attackPressed = false;
      this.atkBtn.setFillStyle(0x8b1a1a, 0.92);
      this.atkBtn.setScale(1);
    });
    this.atkZone.on('pointerout', () => {
      const g = getGame();
      if (g) g.attackPressed = false;
      this.atkBtn.setFillStyle(0x8b1a1a, 0.92);
      this.atkBtn.setScale(1);
    });

    this.input.on('pointermove', (p) => {
      if (this.joyPointerId !== null && p.id === this.joyPointerId) {
        setJoyFromPointer(p);
      }
    });
    this.input.on('pointerup', (p) => {
      if (p.id === this.joyPointerId) resetJoy();
      // Safety: release attack if that pointer ends
      const g = getGame();
      if (g && g.attackPressed) {
        // only clear if no other finger on atk — simple: clear on any up outside hold is ok for mobile
      }
    });
    // Also listen for pointerup outside (iOS sometimes misses)
    this.input.on('pointerupoutside', (p) => {
      if (p.id === this.joyPointerId) resetJoy();
      const g = getGame();
      if (g) g.attackPressed = false;
      this.atkBtn.setFillStyle(0x8b1a1a, 0.92);
      this.atkBtn.setScale(1);
    });

    // ===== Item Interaction Popup =====
    this.popupBg = this.add.rectangle(w/2, h/2 - 40, 320, 210, 0x1a1208, 0.97)
      .setStrokeStyle(3, 0xc9a227).setScrollFactor(0).setDepth(200).setVisible(false);
    this.popupTitle = this.add.text(w/2, h/2 - 125, '', {
      fontFamily: 'Georgia, serif', fontSize: '18px', color: '#ffd700'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.popupDesc = this.add.text(w/2, h/2 - 85, '', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#d4c4a8', align: 'center', wordWrap: { width: 280 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(201).setVisible(false);
    this.popupStats = this.add.text(w/2, h/2 - 20, '', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#a8d4a8', align: 'center'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(201).setVisible(false);

    this.btnEquip = this.add.rectangle(w/2 - 90, h/2 + 55, 80, 32, 0x2ecc71)
      .setScrollFactor(0).setDepth(201).setVisible(false).setInteractive({ useHandCursor: true });
    this.btnEquipText = this.add.text(w/2 - 90, h/2 + 55, 'EQUIP', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setVisible(false);

    this.btnEat = this.add.rectangle(w/2, h/2 + 55, 80, 32, 0xe67e22)
      .setScrollFactor(0).setDepth(201).setVisible(false).setInteractive({ useHandCursor: true });
    this.btnEatText = this.add.text(w/2, h/2 + 55, 'EAT', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setVisible(false);

    this.btnLeave = this.add.rectangle(w/2 + 90, h/2 + 55, 80, 32, 0x7f8c8d)
      .setScrollFactor(0).setDepth(201).setVisible(false).setInteractive({ useHandCursor: true });
    this.btnLeaveText = this.add.text(w/2 + 90, h/2 + 55, 'LEAVE', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setVisible(false);

    this.currentPopupItem = null;

    this.btnEquip.on('pointerdown', () => this.handlePopupAction('equip'));
    this.btnEat.on('pointerdown', () => this.handlePopupAction('eat'));
    this.btnLeave.on('pointerdown', () => this.handlePopupAction('leave'));

    // Pause
    this.pauseOverlay = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.8)
      .setScrollFactor(0).setDepth(300).setVisible(false);
    this.pauseText = this.add.text(w/2, h/2 - 30, 'PAUSED', {
      fontFamily: 'Georgia, serif', fontSize: '32px', color: '#ffd700'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301).setVisible(false);
    this.pauseHint = this.add.text(w/2, h/2 + 20, 'Tap P / Esc to resume\nNo saves — the run is the whole story', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#aaa', align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301).setVisible(false);

    // Events from Game scene (not a global `game` variable)
    const bindGameEvents = () => {
      const gameScene = this.scene.get('Game');
      if (!gameScene) {
        console.warn('[UI] Game scene not ready — retry bind');
        this.time.delayedCall(100, bindGameEvents);
        return;
      }
      gameScene.events.on('updateStats', this.refresh, this);
      gameScene.events.on('showPause', this.togglePause, this);
      gameScene.events.on('showItemPopup', this.showItemPopup, this);
      gameScene.events.on('hideItemPopup', this.hideItemPopup, this);
      if (typeof GBLog === 'function') GBLog('UI', 'bound Game events');
    };
    bindGameEvents();

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-P', () => this.tryUnpause());
      this.input.keyboard.on('keydown-ESC', () => this.tryUnpause());
    }
  }

  showItemPopup(data) {
    this.currentPopupItem = data;
    this.popupBg.setVisible(true);
    this.popupTitle.setText(data.title).setVisible(true);
    this.popupDesc.setText(data.desc).setVisible(true);
    this.popupStats.setText(data.stats || '').setVisible(true);

    const isFood = data.type === 'food';
    const isWig = data.type === 'wig' || data.type === 'golden';
    const isWeapon = data.type === 'weapon';
    const isCarcass = data.type === 'carcass';

    this.btnEquip.setVisible(isWig || isWeapon || isCarcass);
    this.btnEquipText.setVisible(isWig || isWeapon || isCarcass);
    this.btnEquipText.setText(isCarcass ? 'SEARCH' : (isWeapon ? 'TAKE' : 'EQUIP'));
    if (isCarcass) this.btnEquip.setFillStyle(0xb85c38);
    else this.btnEquip.setFillStyle(0x2ecc71);

    this.btnEat.setVisible(isFood);
    this.btnEatText.setVisible(isFood);

    this.btnLeave.setVisible(true);
    this.btnLeaveText.setVisible(true);

    // Pause game while popup is open
    const game = this.scene.get('Game');
    if (game) {
      game.popupOpen = true;
      game.physics.pause();
    }
  }

  hideItemPopup() {
    this.popupBg.setVisible(false);
    this.popupTitle.setVisible(false);
    this.popupDesc.setVisible(false);
    this.popupStats.setVisible(false);
    this.btnEquip.setVisible(false);
    this.btnEquipText.setVisible(false);
    this.btnEat.setVisible(false);
    this.btnEatText.setVisible(false);
    this.btnLeave.setVisible(false);
    this.btnLeaveText.setVisible(false);
    this.currentPopupItem = null;

    const game = this.scene.get('Game');
    if (game) {
      game.popupOpen = false;
      game.physics.resume();
    }
  }

  handlePopupAction(action) {
    const game = this.scene.get('Game');
    if (!game || !this.currentPopupItem) return;
    game.resolveItemAction(action, this.currentPopupItem);
    this.hideItemPopup();
  }

  update(time, delta) {
    const game = this.scene.get('Game');
    if (!game || !game.player || !this.mapPlayer) return;
    if (game.isDead || game.won) return;

    // Player position on minimap
    const px = Phaser.Math.Clamp(game.player.x / WORLD_WIDTH, 0, 1);
    const py = Phaser.Math.Clamp(game.player.y / WORLD_HEIGHT, 0, 1);
    const mx = this.mapX + px * this.mapSize;
    const my = this.mapY + py * this.mapSize;
    this.mapPlayer.setPosition(mx, my);
    this.mapPlayerDir.setPosition(mx, my);
    // Face direction from last movement if available
    if (game.playerFacing === 'left') this.mapPlayerDir.setRotation(Math.PI);
    else if (game.playerFacing === 'up') this.mapPlayerDir.setRotation(-Math.PI / 2);
    else if (game.playerFacing === 'down') this.mapPlayerDir.setRotation(Math.PI / 2);
    else this.mapPlayerDir.setRotation(0);

    // Enemy dots (nearby only, capped)
    this.mapEnemyGfx.clear();
    if (game.enemies) {
      const kids = game.enemies.getChildren();
      let n = 0;
      for (let i = 0; i < kids.length && n < 24; i++) {
        const e = kids[i];
        if (!e.active) continue;
        const ex = this.mapX + Phaser.Math.Clamp(e.x / WORLD_WIDTH, 0, 1) * this.mapSize;
        const ey = this.mapY + Phaser.Math.Clamp(e.y / WORLD_HEIGHT, 0, 1) * this.mapSize;
        this.mapEnemyGfx.fillStyle(e.enemyType === 'wildlife' ? 0x27ae60 : 0xc0392b, 0.9);
        this.mapEnemyGfx.fillCircle(ex, ey, 2);
        n++;
      }
    }
  }

  refresh(state) {
    this.healthFill.width = Math.max(0, (state.health / 100) * 138);
    this.hungerFill.width = Math.max(0, (state.hunger / 100) * 138);
    this.wigFill.width = Math.max(0, (state.wigTimeLeft / state.dayLength) * 138);
    this.wigFill.setFillStyle(state.wigColor || 0xc9a227);

    this.healthText.setText(`HP ${Math.ceil(state.health)}`);
    this.hungerText.setText(`HUNGER ${Math.ceil(state.hunger)}`);
    this.wigText.setText(state.wigTimeLeft > 0 ? 'WIG ACTIVE' : 'WIG SPENT');
    this.dayLabel.setText(`DAY ${state.day}`);
    this.wigNameLabel.setText(state.wigName);
    this.weaponLabel.setText(state.hasWeapon ? 'Armed' : 'Unarmed');
    this.weaponLabel.setColor(state.hasWeapon ? '#2ecc71' : '#95a5a6');

    if (this.fpsLabel && this.showFps) {
      const fps = state.fps || 0;
      const q = state.quality || (state.perf && state.perf.tier) || '?';
      let col = '#6a7a5a';
      if (fps && fps < 25) col = '#c0392b';
      else if (fps && fps < 40) col = '#d68910';
      else if (fps) col = '#5a8a4a';
      this.fpsLabel.setColor(col);
      if (typeof PerfMonitor !== 'undefined' && PerfMonitor.enabled) {
        this.fpsLabel.setText(PerfMonitor.hudLine());
      } else {
        this.fpsLabel.setText(fps ? (fps + ' FPS · ' + String(q).toUpperCase()) : ('… · ' + String(q).toUpperCase()));
      }
    }
  }

  togglePause(show) {
    this.pauseOverlay.setVisible(show);
    this.pauseText.setVisible(show);
    this.pauseHint.setVisible(show);
  }

  tryUnpause() {
    const game = this.scene.get('Game');
    if (game && game.paused) {
      game.paused = false;
      game.physics.resume();
      this.togglePause(false);
    }
  }
}
