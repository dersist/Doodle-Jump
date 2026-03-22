// ============================================================
// NEON ASCENT — main.js
// Game loop, global state, camera, background, event wiring
// ============================================================

// ── GLOBAL STATE ────────────────────────────────────────────
const GameState = {
  // Runtime flags
  running: false,
  paused: false,
  gameOver: false,

  // Scores / economy
  score: 0,
  coins: 0,
  totalCoins: 0,
  bestScore: 0,
  totalRuns: 0,

  // Camera
  cameraY: 0,
  highestY: 0,          // tracks highest player Y (canvas-space before cam)

  // Canvas dims (set on resize)
  canvasW: 0,
  canvasH: 0,

  // Physics modifiers (set by abilities / upgrades)
  gravityFlipped: false,
  gravityMult: 1,
  jumpVelocityMult: 1,
  moveSpeedMult: 1,

  // Time-slow (Time Distortion ability)
  timeSlowTimer: 0,
  timeSlowFactor: 1,
  timeSlowPlayerUnaffected: false,

  // Overdrive
  overdriveTimer: 0,
  overdriveMult: 1,
  overdriveAbilityBoost: false,
  overdriveAutoShoot: false,
  overdriveDmgResist: false,
  overdriveDmgResistAmt: 0,
  overdriveLifesteal: false,

  // Speed boost / freeze (chaos / ability side-effects)
  speedBoostTimer: 0,
  speedCutTimer: 0,
  freezeTimer: 0,

  // Shield (Energy Shield ability)
  shielded: false,
  shieldHits: 0,
  shieldTimer: 0,
  shieldReflect: false,
  shieldRegen: false,
  shieldExplode: false,

  // Rocket
  rocketActive: false,
  rocketTimer: 0,
  rocketDmgTrail: false,
  rocketShockwave: false,
  rocketCoinPull: false,

  // Slam
  slamming: false,

  // Phase Dash
  dashSlowTime: false,
  dashShield: false,

  // Gravity Flip extras
  gravFlipSafePlatforms: false,

  // Drone companions
  drones: [],

  // Last platform landed on — never culled so player can always land back on it
  lastLandedPlatformId: null,

  // Screen shake
  screenShake: 0,

  // Boss alive
  bossActive: false,
  activeBoss: null,

  // Player reference (set by Player.create)
  player: null,

  // Owned abilities & upgrades — keyed by ability id
  ownedAbilities: {},       // { id: true }
  inventorySlots: { 1: null, 2: null, 3: null },

  // Player upgrade levels  { health:0, scoreMult:0, jumpMult:0, currencyBoost:0, cdrBoost:0 }
  playerUpgradeLevels: {},

  // Gun upgrade state { id: { parts: [], unlocked: bool } }
  gunUpgrades: {},

  // Platform tracking
  lastLandedPlatformId: null,

  // Difficulty
  difficultyMult: 1,

  // Invincible frames after damage
  invincible: false,
  invincibleTimer: 0,

  // Revive available this run
  reviveAvailable: false,
  reviveUsed: false,
};

// ── CANVAS / CONTEXT ────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  const W = window.innerWidth  || 400;
  const H = window.innerHeight || 700;
  canvas.width  = W;
  canvas.height = H;
  GameState.canvasW = W;
  GameState.canvasH = H;
}

window.addEventListener('resize', () => {
  resizeCanvas();
  if (GameState.running && !GameState.gameOver) {
    Platforms.rebuildOnResize?.();
  }
});

// ── BACKGROUND ──────────────────────────────────────────────
const BG = (() => {
  // Parallax stars
  const STAR_COUNT = 80;
  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.5 + 0.3,
    speed: Math.random() * 0.15 + 0.05,
    alpha: Math.random() * 0.7 + 0.3,
  }));

  const GRID_SIZE = 60;

  function draw(cameraY) {
    const W = GameState.canvasW;
    const H = GameState.canvasH;

    // Deep space background
    ctx.fillStyle = '#05050f';
    ctx.fillRect(0, 0, W, H);

    // Parallax grid lines (move with camera at 0.3x)
    const gridOff = (cameraY * 0.3) % GRID_SIZE;
    ctx.strokeStyle = 'rgba(0,255,220,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = -GRID_SIZE + gridOff % GRID_SIZE; y < H; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Stars (parallax 0.1x)
    const starOff = cameraY * 0.1;
    for (const s of stars) {
      const sy = ((s.y * H * 3 + starOff * s.speed) % (H * 1.5)) - H * 0.25;
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x * W, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Horizon glow at bottom
    const horizGrad = ctx.createLinearGradient(0, H * 0.7, 0, H);
    horizGrad.addColorStop(0, 'rgba(0,255,220,0)');
    horizGrad.addColorStop(1, 'rgba(0,255,220,0.04)');
    ctx.fillStyle = horizGrad;
    ctx.fillRect(0, H * 0.7, W, H * 0.3);
  }

  return { draw };
})();

// ── CAMERA ──────────────────────────────────────────────────
function updateCamera() {
  const p = GameState.player;
  if (!p) return;

  // Target: keep player at 40% from top of screen
  // Keep player at 60% down the screen — platform they bounced from stays visible below
  const targetCamY = p.y - GameState.canvasH * 0.35;

  // Camera only moves UP (cameraY only decreases)
  if (targetCamY < GameState.cameraY) {
    GameState.cameraY = targetCamY;
  }
}

// ── DIFFICULTY HELPER ────────────────────────────────────────
function getDifficulty() {
  return (GameState.settings && GameState.settings.difficulty) || 'medium';
}

// Returns a config object for the current difficulty
function getDiffConfig() {
  const d = getDifficulty();
  return {
    easy:   { platScale: 3.0, spawnMult: 0.5,  attackMult: 0.5,  aimMult: 0.4 },
    medium: { platScale: 2.0, spawnMult: 1.0,  attackMult: 1.0,  aimMult: 1.0 },
    hard:   { platScale: 1.0, spawnMult: 1.8,  attackMult: 1.4,  aimMult: 1.4 },
    insane: { platScale: 0.6, spawnMult: 9.0,  attackMult: 7.0,  aimMult: 7.0 },
    nightmare: { platScale: 0.3, spawnMult: 18.0, attackMult: 14.0, aimMult: 14.0 },
  }[d] || { platScale: 2.0, spawnMult: 1.0, attackMult: 1.0, aimMult: 1.0 };
}
let startCameraY = 0; // set in initRun so score is relative to start

// Per-run stat tracking for end screen
const RunStats = {
  coinsCollected: 0,
  enemiesKilled: 0,
  platformsBounced: 0,
  bossesKilled: 0,
  reset() {
    this.coinsCollected = 0;
    this.enemiesKilled = 0;
    this.platformsBounced = 0;
    this.bossesKilled = 0;
  }
};

// ── COMBO SYSTEM ─────────────────────────────────────────────
// Tracks consecutive landings on different special platforms
const Combo = {
  count: 0,           // current combo multiplier (0 = no combo active)
  lastPlatform: null, // reference to last landed platform object
  comboCoins: 0,      // coins awarded by highest combo this chain
  timeout: 0,         // frames until combo expires from inactivity

  // Special platform types (anything but normal)
  isSpecial(type) {
    return type !== 'normal';
  },

  // Call when player lands on a platform
  onLand(platform) {
    if (!this.isSpecial(platform.type)) {
      this.end();
      this.lastPlatform = null;
      return;
    }

    if (platform === this.lastPlatform) {
      // Same exact platform: break combo
      SFX.play('combo_break');
      this.end(true); // silent end (already played break sfx)
      this.lastPlatform = null;
      return;
    }

    // New special platform: increment combo
    this.count++;
    this.lastPlatform = platform;
    this.timeout = 300;
    this.comboCoins = this.count;

    // Escalating pitch sound per tier
    const sfxName = this.count >= 5 ? 'combo_max'
                  : this.count === 4 ? 'combo_4'
                  : this.count === 3 ? 'combo_3'
                  : this.count === 2 ? 'combo_2'
                  : 'combo_1';
    SFX.play(sfxName);

    // Particle burst at player position
    if (this.count >= 2 && typeof Particles !== 'undefined' && typeof GameState !== 'undefined') {
      const p = GameState.player;
      if (p) {
        const colors = ['#ffee00','#ff6600','#ff00ff','#00f5ff','#00ff88'];
        Particles.burst(
          p.x + p.w / 2,
          p.y + p.h / 2 - GameState.cameraY,
          colors[(this.count - 2) % colors.length],
          6 + this.count * 2
        );
      }
    }

    // Animate HUD
    this._triggerHUDAnim = true;

    if (this.count >= 2) {
      UI.showToast(`${this.count}× COMBO! +${this.count}◈`, 900);
    }
  },

  // Call each frame to tick timeout
  tick(dt) {
    if (this.count > 0 && this.timeout > 0) {
      this.timeout -= dt;
      if (this.timeout <= 0) this.end();
    }
  },

  // End combo and award coins; silent=true skips coin sfx
  end(silent) {
    if (this.count > 0) {
      const coins = this.comboCoins;
      GameState.coins += coins;
      GameState.totalCoins += coins;
      if (typeof RunStats !== 'undefined') RunStats.coinsCollected += coins;
      if (!silent && this.count >= 3) {
        SFX.play('combo_end');
        UI.showToast(`🔥 COMBO x${this.count} ENDED! +${coins}◈`, 1800);
      }
    }
    this.count = 0;
    this.comboCoins = 0;
    this.timeout = 0;
    this.lastPlatform = null;
    this._triggerHUDAnim = false;
  },

  reset() {
    this.count = 0;
    this.comboCoins = 0;
    this.timeout = 0;
    this.lastPlatform = null;
  }
};

function updateScore() {
  // Divide by 50: ~50 pixels per "meter", so first jump gives ~4-8 height units
  const rawScore = Math.max(0, Math.floor((startCameraY - GameState.cameraY) / 50));
  const mult = PlayerUpgrades.getScoreBonus();
  const newScore = Math.floor(rawScore * mult);
  if (newScore > GameState.score) {
    GameState.score = newScore;
    if (newScore > GameState.bestScore) {
      GameState.bestScore = newScore;
      Save.save();
    }
  }
}

// ── DIFFICULTY ───────────────────────────────────────────────
function updateDifficulty() {
  // Scales from 1.0 at score 0 to ~3.0 at score 3000+
  GameState.difficultyMult = 1 + Math.min(GameState.score / 1200, 2);
}

// ── DEATH / GAME OVER ────────────────────────────────────────
function handleGameOver() {
  if (GameState.gameOver) return;

  // Revive check
  if (PlayerUpgrades.hasRevive() && !GameState.reviveUsed) {
    GameState.reviveUsed = true;
    const p = GameState.player;
    p.health = 1;
    // Respawn in world space at visible screen position
    p.y = GameState.cameraY + GameState.canvasH * 0.4;
    p.vy = Physics.BASE_JUMP;
    p.invincible = true;
    p.invincibleTimer = 180;
    GameState.shielded = false;
    SFX.play('revive');
    UI.showToast('REVIVE!', '#ff00ff');
    return;
  }

  GameState.gameOver = true;
  GameState.running  = false;
  GameState.totalRuns++;

  Save.save();
  SFX.play('gameover');

  setTimeout(() => {
    UI.showGameOver(GameState.score, GameState.coins);
  }, 600);
}

function initRun() {
  // Always reset loop guard so Launch and Space work regardless of previous state
  loopRunning = false;

  // Load persistent data
  Save.load();

  resizeCanvas();

  GameState.score          = 0;
  GameState.coins          = 0;
  GameState.gravityFlipped = false;
  GameState.gravityMult    = 1;
  GameState.jumpVelocityMult = PlayerUpgrades.getJumpBonus();
  GameState.moveSpeedMult  = 1;
  GameState.timeSlowTimer  = 0;
  GameState.timeSlowFactor = 1;
  GameState.overdriveTimer = 0;
  GameState.overdriveMult  = 1;
  GameState.speedBoostTimer= 0;
  GameState.speedCutTimer  = 0;
  GameState.freezeTimer    = 0;
  GameState.shielded       = false;
  GameState.shieldHits     = 0;
  GameState.rocketActive   = false;
  GameState.rocketTimer    = 0;
  GameState.slamming       = false;
  GameState.drones         = [];
  GameState.lastLandedPlatformId = null;
  GameState.screenShake    = 0;
  GameState.bossActive     = false;
  GameState.activeBoss     = null;
  GameState.gameOver       = false;
  GameState.paused         = false;
  GameState.running        = true;
  GameState.difficultyMult = 1;
  GameState.reviveAvailable= PlayerUpgrades.hasRevive();
  GameState.reviveUsed     = false;

  RunStats.reset();
  Combo.reset();

  // Init subsystems
  Platforms.init(GameState.canvasW, GameState.canvasH);
  Enemies.init();
  Projectiles.init();
  Coins.init();
  Abilities.init();
  Inventory.init();
  Bosses.init();
  Particles.clear();

  // Create player
  GameState.player = Player.create(GameState.canvasW, GameState.canvasH);

  // Set camera: player starts near bottom of screen so platforms above are visible
  GameState.cameraY = GameState.player.y - GameState.canvasH * 0.35;
  startCameraY = GameState.cameraY; // anchor for score calculation

  // Reset input
  Input.clearFrame();

  UI.showScreen('game-screen');
  UI.resetSpeedrunTimer();
  UI.startSpeedrunTimer();
  startLoop();
}

// ── MAIN GAME LOOP ───────────────────────────────────────────
let lastTime = 0;
let loopRunning = false; // guard: only one RAF loop at a time

function startLoop() {
  if (loopRunning) return;
  loopRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  if (!GameState.running && !GameState.gameOver) { loopRunning = false; return; }

  const rawDt = lastTime === 0 ? 1 : Math.min((timestamp - lastTime) / (1000 / 60), 2);
  lastTime = timestamp;

  // Time-slow factor affects game tick speed
  let dt = rawDt;
  if (GameState.freezeTimer > 0) {
    GameState.freezeTimer--;
    dt = 0.02; // near-frozen
  } else if (GameState.timeSlowTimer > 0) {
    dt = rawDt * GameState.timeSlowFactor;
    GameState.timeSlowTimer -= rawDt; // decrement by real time, not slowed time
    if (GameState.timeSlowTimer <= 0) {
      GameState.timeSlowTimer = 0;
      GameState.timeSlowFactor = 1;
      GameState.timeSlowPlayerUnaffected = false;
    }
  }

  if (!GameState.paused && !GameState.gameOver) {
    update(dt, rawDt);
  }

  render();
  Input.clearFrame();

  if (!GameState.gameOver) {
    requestAnimationFrame(gameLoop);
  } else {
    loopRunning = false;
  }
}

// ── UPDATE ───────────────────────────────────────────────────
function update(dt, rawDt) {
  const p = GameState.player;
  const W = GameState.canvasW;
  const H = GameState.canvasH;
  const cam = GameState.cameraY;

  // Escape — in-game opens pause; while paused goes to main menu
  if (Input.isEscapePressed()) {
    if (!GameState.paused) {
      GameState.paused = true;
      UI.showScreen('pause-menu');
    } else {
      GameState.paused  = false;
      GameState.running = false;
      returnToMainMenu();
    }
    return;
  }

  // P = pause toggle
  if (Input.isPausePressed()) {
    GameState.paused = true;
    UI.showScreen('pause-menu');
    return;
  }

  // Combo tick
  Combo.tick(dt);

  // Ability activations (1/2/3 keys)
  for (let slot = 1; slot <= 3; slot++) {
    if (Input.getAbilitySlot() === slot) {
      Inventory.activateSlot(slot);
    }
  }

  // Update abilities (cooldowns, active effects)
  Abilities.update(dt);

  // Screen shake decay
  if (GameState.screenShake > 0) {
    GameState.screenShake = Math.max(0, GameState.screenShake - 0.8);
  }

  // Speed boost / cut timers
  if (GameState.speedBoostTimer > 0) GameState.speedBoostTimer -= rawDt;
  if (GameState.speedCutTimer  > 0) GameState.speedCutTimer  -= rawDt;

  // Update player
  Player.update(dt, p, W, H);

  // Camera
  updateCamera();
  updateScore();
  updateDifficulty();

  // Platforms
  Platforms.update(dt, cam, W, H, GameState.score);

  // Enemies
  Enemies.update(dt, p, GameState.score, W, cam, H);

  // Projectiles
  Projectiles.update(dt, cam, Enemies.getAll(), p, W, H);

  // Coins
  Coins.update(dt, p, cam, H);

  // Particles
  Particles.update();

  // HUD
  const maxHp = PlayerUpgrades.getMaxHealth();
  UI.updateScore(GameState.score);
  UI.updateCoins(GameState.totalCoins);
  UI.updateHealthBar(p?.health || 0, maxHp);
  UI.updateAbilityHUD();
  UI.updateAbilityCooldowns();
  UI.updateSpeedrunTimer();

  // Combo HUD
  const comboEl = document.getElementById('combo-display');
  const comboVal = document.getElementById('combo-val');
  if (comboEl && comboVal) {
    if (Combo.count >= 2) {
      comboEl.style.display = 'block';
      comboVal.textContent = Combo.count + '× COMBO';
      // Colour escalation
      const colours = ['#ffee00','#ff9900','#ff00ff','#00f5ff','#00ff88'];
      comboVal.style.color = colours[Math.min(Combo.count - 2, colours.length - 1)];
      comboVal.style.textShadow = `0 0 20px ${colours[Math.min(Combo.count - 2, colours.length - 1)]}`;
      if (Combo._triggerHUDAnim) {
        Combo._triggerHUDAnim = false;
        // Re-trigger CSS pop by removing and re-adding the class
        comboVal.classList.remove('combo-pop');
        void comboVal.offsetWidth; // force reflow
        comboVal.classList.add('combo-pop');
      }
      // Timeout bar
      const pct = Math.max(0, Combo.timeout / 300);
      comboEl.style.setProperty('--combo-pct', pct);
    } else {
      comboEl.style.display = 'none';
      comboVal.classList.remove('combo-pop');
    }
  }

  // Speedrun timer toggle
  if (Input.isTimerToggle()) UI.toggleSpeedrunTimer();
}

// ── RENDER ───────────────────────────────────────────────────
const ZOOM = 0.65; // zoom out factor — smaller everything, more platforms on screen

function render() {
  const W   = GameState.canvasW;
  const H   = GameState.canvasH;
  const cam = GameState.cameraY;
  const p   = GameState.player;

  // Screen shake offset
  let sx = 0, sy = 0;
  if (GameState.settings.shake && GameState.screenShake > 0) {
    sx = (Math.random() - 0.5) * GameState.screenShake * 2;
    sy = (Math.random() - 0.5) * GameState.screenShake * 2;
  }

  ctx.save();
  if (sx || sy) ctx.translate(sx, sy);

  // Background (full canvas, no zoom)
  BG.draw(cam);

  // Zoom out: scale from center of canvas
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-W / 2, -H / 2);

  // All draw modules handle their own cameraY subtraction
  Platforms.draw(ctx, cam, false);
  Coins.draw(ctx, cam);
  Enemies.draw(ctx, cam);
  Projectiles.draw(ctx, cam);
  if (p) Player.draw(ctx, p, cam);
  Particles.draw(ctx);

  ctx.restore();

  // Scanlines (full canvas, no zoom)
  if (GameState.settings.scanlines) drawScanlines(W, H);

  ctx.restore();
}

function drawScanlines(W, H) {
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 2);
  }
  ctx.restore();
}

// ── SCREEN / BUTTON EVENT WIRING ────────────────────────────
function wireButtons() {
  // MAIN MENU
  document.getElementById('btn-play')?.addEventListener('click', () => {
    SFX.play('click');
    initRun();
  });

  document.getElementById('btn-shop')?.addEventListener('click', () => {
    SFX.play('click');
    Shop.open(false);
  });

  document.getElementById('btn-abilities')?.addEventListener('click', () => {
    SFX.play('click');
    UI.initAbilityEquipScreen();
    UI.showScreen('ability-screen');
  });

  document.getElementById('btn-settings')?.addEventListener('click', () => {
    SFX.play('click');
    UI.showScreen('settings-screen');
  });

  // PAUSE MENU
  document.getElementById('btn-resume')?.addEventListener('click', () => {
    SFX.play('click');
    GameState.paused = false;
    UI.hidePause();
    UI.showScreen('game-screen');
    startLoop();
  });

  document.getElementById('pause-btn')?.addEventListener('click', () => {
    SFX.play('click');
    GameState.paused = true;
    UI.showPause();
  });

  document.getElementById('btn-shop-ingame')?.addEventListener('click', () => {
    SFX.play('click');
    Shop.open(true);
  });

  document.getElementById('btn-quit')?.addEventListener('click', () => {
    SFX.play('click');
    GameState.running = false;
    GameState.paused  = false;
    returnToMainMenu();
  });

  // GAME OVER
  document.getElementById('btn-replay')?.addEventListener('click', () => {
    SFX.play('click');
    initRun();
  });

  document.getElementById('btn-go-menu')?.addEventListener('click', () => {
    SFX.play('click');
    returnToMainMenu();
  });

  document.getElementById('btn-go-shop')?.addEventListener('click', () => {
    SFX.play('click');
    Shop.open(false);
  });

  // ABILITY EQUIP back
  document.getElementById('ability-back')?.addEventListener('click', () => {
    SFX.play('click');
    returnToMainMenu();
  });

  // SETTINGS back — also handled by UI.initSettings, but wire screen nav here
  document.getElementById('settings-back')?.addEventListener('click', () => {
    SFX.play('click');
    returnToMainMenu();
  });
}

function returnToMainMenu() {
  GameState.running = false;
  UI.showScreen('main-menu');
  UI.updateMainMenuStats();
}

// ── BOOTSTRAP ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  Save.load();

  // MUST init input first so keyboard/touch events are registered
  Input.init();

  // Init shop tab switching
  Shop.init();

  // Apply saved settings to UI
  UI.initSettings();
  LootBox.init();

  // Global Space = start new game from ANY screen (throttled)
  let lastSpaceRestart = 0;
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const now = Date.now();
    if (now - lastSpaceRestart < 1000) return; // 1s cooldown prevents spam lag
    lastSpaceRestart = now;
    e.preventDefault();
    initRun();
  });

  // Global Escape: on non-game screens always go to main menu
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    if (GameState.running) return; // handled in game loop
    const active = document.querySelector('.screen.active');
    if (active && active.id !== 'main-menu') {
      returnToMainMenu();
    }
  });

  // Wire all button listeners
  wireButtons();

  // Show main menu
  UI.showScreen('main-menu');
  UI.updateMainMenuStats();

  SFX.setEnabled(GameState.settings.sfx);

  // ── ADMIN PANEL (type "admin" to open) ───────────────────
  const ADMIN_SEQ = 'admin';
  let adminBuf = '';
  document.addEventListener('keydown', (e) => {
    if (['INPUT','TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
    adminBuf = (adminBuf + e.key.toLowerCase()).slice(-ADMIN_SEQ.length);
    if (adminBuf === ADMIN_SEQ) {
      adminBuf = '';
      const panel = document.getElementById('admin-panel');
      if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
    }
  });

  function adminLog(msg) {
    const log = document.getElementById('admin-log');
    if (!log) return;
    const line = document.createElement('div');
    line.textContent = '> ' + msg;
    log.prepend(line);
    while (log.children.length > 8) log.lastChild.remove();
  }

  function wireAdminBtn(id, fn) {
    document.getElementById(id)?.addEventListener('click', fn);
  }

  wireAdminBtn('admin-close', () => { document.getElementById('admin-panel').style.display = 'none'; });
  wireAdminBtn('adm-coins-100',  () => { GameState.totalCoins += 100;  Save.save(); UI.updateMainMenuStats(); adminLog('+100 coins'); });
  wireAdminBtn('adm-coins-1000', () => { GameState.totalCoins += 1000; Save.save(); UI.updateMainMenuStats(); adminLog('+1000 coins'); });
  wireAdminBtn('adm-coins-9999', () => { GameState.totalCoins += 9999; Save.save(); UI.updateMainMenuStats(); adminLog('+9999 coins'); });

  wireAdminBtn('adm-lootbox-reset', () => {
    try { localStorage.setItem('neon_lootbox_last', '0'); } catch(e) {}
    LootBox.init();
    adminLog('Lootbox cooldown reset');
  });

  wireAdminBtn('adm-lootbox-open', () => {
    try { localStorage.setItem('neon_lootbox_last', '0'); } catch(e) {}
    setTimeout(() => document.getElementById('lb-open-btn')?.click(), 50);
    document.getElementById('admin-panel').style.display = 'none';
    adminLog('Forced lootbox open');
  });

  wireAdminBtn('adm-unlock-abilities', () => {
    const ids = ['rocket_surge','phase_dash','gravity_flip','energy_shield','pulse_slam',
                 'drone','time_distort','platform_forge','chaos_engine','overdrive'];
    ids.forEach(id => { if (!GameState.ownedAbilities[id]) GameState.ownedAbilities[id] = { upgrades: [] }; });
    Save.save(); adminLog('All abilities unlocked');
  });

  wireAdminBtn('adm-max-upgrades', () => {
    const upgradeMap = {
      rocket_surge:['rs_1','rs_2','rs_3','rs_4','rs_5','rs_6','rs_7','rs_8','rs_9'],
      phase_dash:['pd_1','pd_2','pd_3','pd_4','pd_5','pd_6','pd_7','pd_8','pd_9'],
      gravity_flip:['gf_1','gf_2','gf_3','gf_4','gf_5','gf_6','gf_7','gf_8','gf_9'],
      energy_shield:['es_1','es_2','es_3','es_4','es_5','es_6','es_7','es_8','es_9'],
      pulse_slam:['ps_1','ps_2','ps_3','ps_4','ps_5','ps_6','ps_7','ps_8','ps_9'],
      drone:['dr_1','dr_2','dr_3','dr_4','dr_5','dr_6','dr_7','dr_8','dr_9'],
      time_distort:['td_1','td_2','td_3','td_4','td_5','td_6','td_7','td_8','td_9'],
      platform_forge:['pf_1','pf_2','pf_3','pf_4','pf_5','pf_6','pf_7','pf_8','pf_9'],
      chaos_engine:['ce_1','ce_2','ce_3','ce_4','ce_5','ce_6','ce_7','ce_8','ce_9'],
      overdrive:['od_1','od_2','od_3','od_4','od_5','od_6','od_7','od_8','od_9'],
    };
    Object.entries(upgradeMap).forEach(([id, upgs]) => {
      if (!GameState.ownedAbilities[id]) GameState.ownedAbilities[id] = { upgrades: [] };
      GameState.ownedAbilities[id].upgrades = [...upgs];
    });
    Save.save(); adminLog('All ability upgrades maxed');
  });

  wireAdminBtn('adm-unlock-guns', () => {
    const gunIds = ['double_shot','rapid_fire','explosive_rounds','piercing_shot','triple_spread',
                    'ricochet','heavy_caliber','poison_rounds','chain_lightning','mega_bullet'];
    if (!GameState.gunUpgrades) GameState.gunUpgrades = {};
    gunIds.forEach(id => { GameState.gunUpgrades[id] = { parts:[1,2,3,4,5], unlocked:true }; });
    Save.save(); adminLog('All gun mods unlocked');
  });

  wireAdminBtn('adm-max-stats', () => {
    if (!GameState.playerUpgradeLevels) GameState.playerUpgradeLevels = {};
    ['health','score_mult','jump_mult','currency_boost'].forEach(id => { GameState.playerUpgradeLevels[id] = 5; });
    Save.save(); adminLog('All stat upgrades maxed');
  });

  wireAdminBtn('adm-unlock-insane', () => {
    GameState.settings.insaneUnlocked = true; Save.save();
    const btn = document.getElementById('diff-insane');
    if (btn) { btn.style.display = ''; btn.classList.add('insane-revealed'); }
    adminLog('INSANE mode unlocked');
  });

  wireAdminBtn('adm-unlock-nightmare', () => {
    GameState.settings.insaneUnlocked = true;
    GameState.settings.nightmareUnlocked = true; Save.save();
    ['diff-insane','diff-nightmare'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) { btn.style.display = ''; btn.classList.add('insane-revealed'); }
    });
    adminLog('NIGHTMARE mode unlocked');
  });

  wireAdminBtn('adm-reset-all', () => {
    if (confirm('Reset ALL progress?')) { Save.reset(); UI.updateMainMenuStats(); adminLog('All progress reset'); }
  });

});
