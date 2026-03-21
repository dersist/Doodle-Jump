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
  // cameraY = world Y that corresponds to the TOP of the screen
  // screenY = worldY - cameraY  =>  cameraY = worldY - screenY
  const targetCamY = p.y - GameState.canvasH * 0.4;

  // Camera only moves UP (cameraY only decreases)
  if (targetCamY < GameState.cameraY) {
    GameState.cameraY = targetCamY;
  }
}

// ── SCORE ────────────────────────────────────────────────────
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

function updateScore() {
  // Score updates every frame — one point per pixel of height gained
  const rawScore = Math.max(0, startCameraY - GameState.cameraY);
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
  GameState.cameraY = GameState.player.y - GameState.canvasH * 0.7;
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

  // Speedrun timer toggle
  if (Input.isTimerToggle()) UI.toggleSpeedrunTimer();
}

// ── RENDER ───────────────────────────────────────────────────
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

  // Background (screen-space)
  BG.draw(cam);

  // All draw modules handle their own cameraY subtraction
  Platforms.draw(ctx, cam, false);
  Coins.draw(ctx, cam);
  Enemies.draw(ctx, cam);
  Projectiles.draw(ctx, cam);
  if (p) Player.draw(ctx, p, cam);
  Particles.draw(ctx);

  // Scanlines
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
});
