// ═══════════════════════════════════════════
//  UI.JS — HUD, menus, particles, SFX, coins, save
// ═══════════════════════════════════════════

// ── PARTICLES ──
const Particles = (() => {
  let particles = [];

  function burst(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        r: 2 + Math.random() * 3,
        life: 30 + Math.random() * 30,
        maxLife: 60,
        type: 'burst',
      });
    }
  }

  function shockwave(x, y, color, maxR = 80) {
    particles.push({ x, y, color, r: 5, maxR, life: 20, maxLife: 20, type: 'shockwave' });
  }

  function ring(x, y, color, maxR = 100) {
    particles.push({ x, y, color, r: 10, maxR, life: 30, maxLife: 30, type: 'ring' });
  }

  function trail(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color, r: 3 + Math.random() * 2,
        life: 20, maxLife: 20, type: 'burst',
      });
    }
  }

  function coins(x, y, amount) {
    const count = Math.min(amount, 8);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI;
      particles.push({
        x, y,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (3 + Math.random() * 2),
        color: '#ffee00', r: 4, life: 40, maxLife: 40, type: 'coin',
      });
    }
  }

  function update() {
    for (const p of particles) {
      p.life--;
      if (p.type === 'burst' || p.type === 'coin') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.vx *= 0.97;
      }
      if (p.type === 'shockwave' || p.type === 'ring') {
        p.r += (p.maxR - 5) / p.maxLife * 2;
      }
    }
    particles = particles.filter(p => p.life > 0);
  }

  function draw(ctx) {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'shockwave' || p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'coin') {
        ctx.fillStyle = '#ffee00';
        ctx.shadowColor = '#ffee00';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(p.x - 1, p.y - 1, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function clear() { particles = []; }

  return { burst, shockwave, ring, trail, coins, update, draw, clear };
})();

// ── SFX ──
const SFX = (() => {
  let enabled = true;
  let audioCtx = null;

  function getCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return audioCtx;
  }

  function playTone(freq, type, duration, volume = 0.3, decay = true) {
    if (!enabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      if (decay) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch(e) {}
  }

  const sounds = {
    jump:         () => playTone(400, 'square', 0.08, 0.15),
    spring:       () => { playTone(500, 'sine', 0.1, 0.2); playTone(700, 'sine', 0.08, 0.15); },
    boost:        () => { playTone(300, 'sawtooth', 0.15, 0.3); playTone(600, 'sine', 0.1, 0.15); },
    shoot:        () => playTone(800, 'square', 0.05, 0.1),
    enemy_shoot:  () => playTone(300, 'sawtooth', 0.1, 0.1),
    enemy_die:    () => { playTone(200, 'sawtooth', 0.2, 0.2); playTone(150, 'square', 0.15, 0.2); },
    hurt:         () => playTone(150, 'sawtooth', 0.2, 0.4),
    slam_start:   () => playTone(250, 'square', 0.08, 0.2),
    slam_land:    () => { playTone(100, 'square', 0.3, 0.5); playTone(80, 'sawtooth', 0.2, 0.4); },
    ability_use:  () => { playTone(600, 'sine', 0.15, 0.2); playTone(900, 'sine', 0.1, 0.15); },
    overdrive:    () => { playTone(400, 'sawtooth', 0.3, 0.4); playTone(700, 'square', 0.2, 0.3); },
    chaos:        () => playTone(Math.random() * 800 + 200, 'square', 0.2, 0.2),
    forge:        () => playTone(350, 'triangle', 0.2, 0.3),
    purchase:     () => { playTone(500, 'sine', 0.1, 0.15); playTone(700, 'sine', 0.08, 0.1); },
    sell:         () => playTone(300, 'sine', 0.15, 0.2),
    revive:       () => { playTone(400, 'sine', 0.3, 0.4); playTone(600, 'sine', 0.25, 0.3); },
    boss_spawn:   () => { playTone(100, 'sawtooth', 0.8, 0.5); playTone(150, 'square', 0.5, 0.5); },
    boss_hit:     () => playTone(200, 'square', 0.2, 0.2),
    boss_attack:  () => { playTone(180, 'sawtooth', 0.3, 0.3); },
    boss_die:     () => { for(let i=0;i<5;i++) setTimeout(()=>playTone(300-i*40,'sawtooth',0.4,0.4),i*100); },
    shield_hit:   () => playTone(600, 'square', 0.1, 0.2),
    break:        () => { playTone(200, 'sawtooth', 0.15, 0.25); },
    teleport:     () => { playTone(700, 'sine', 0.2, 0.3); playTone(400, 'sine', 0.15, 0.2); },
    explosion:    () => { playTone(150, 'sawtooth', 0.3, 0.4); playTone(100, 'square', 0.25, 0.4); },
    gameover:     () => { playTone(300, 'sawtooth', 0.4, 0.3); setTimeout(()=>playTone(200,'sawtooth',0.5,0.5),300); setTimeout(()=>playTone(100,'square',0.6,0.8),700); },
    click:        () => playTone(600, 'sine', 0.05, 0.1),
    combo_1:      () => playTone(520, 'sine', 0.12, 0.18),
    combo_2:      () => { playTone(620, 'sine', 0.12, 0.2); playTone(780, 'sine', 0.08, 0.15); },
    combo_3:      () => { playTone(700, 'square', 0.1, 0.22); playTone(900, 'sine', 0.1, 0.18); },
    combo_4:      () => { playTone(800, 'square', 0.12, 0.22); playTone(1050, 'sine', 0.1, 0.2); setTimeout(() => playTone(1200, 'sine', 0.08, 0.15), 80); },
    combo_max:    () => { [600,800,1000,1300].forEach((f,i) => setTimeout(() => playTone(f, 'sine', 0.2, 0.25), i * 60)); },
    combo_break:  () => { playTone(400, 'sawtooth', 0.15, 0.2); playTone(250, 'square', 0.1, 0.3); },
    combo_end:    () => { playTone(700, 'sine', 0.1, 0.2); playTone(900, 'sine', 0.12, 0.25); setTimeout(() => playTone(1100, 'sine', 0.15, 0.3), 100); },
    loot_tick:    () => playTone(600 + Math.random() * 200, 'square', 0.04, 0.08),
    loot_slow:    () => playTone(500, 'sine', 0.12, 0.18),
    loot_land:    () => { playTone(800, 'sine', 0.2, 0.3); setTimeout(() => playTone(1000, 'sine', 0.25, 0.4), 80); setTimeout(() => playTone(1200, 'sine', 0.3, 0.5), 180); },
    loot_common:  () => { playTone(440, 'sine', 0.15, 0.3); playTone(550, 'sine', 0.1, 0.25); },
    loot_uncommon:() => { playTone(500, 'sine', 0.2, 0.3); playTone(650, 'sine', 0.15, 0.3); playTone(800, 'sine', 0.1, 0.25); },
    loot_rare:    () => { [600,800,1000,1300,1600].forEach((f,i) => setTimeout(() => playTone(f,'sine',0.2,0.3), i*70)); },
  };

  function play(soundName) {
    if (sounds[soundName]) sounds[soundName]();
  }

  function setEnabled(v) { enabled = v; }
  function isEnabled() { return enabled; }

  return { play, setEnabled, isEnabled };
})();

// ── COINS (floating collectibles) ──
const Coins = (() => {
  let coins = [];

  function spawnAt(x, y) {
    coins.push({ x, y, r: 7, vy: -2, life: 300, collected: false });
  }

  function showerCoins(canvasW, cameraY) {
    for (let i = 0; i < 15; i++) {
      coins.push({
        x: Math.random() * canvasW,
        y: cameraY + Math.random() * 200,
        r: 7, vy: 1, life: 300, collected: false,
      });
    }
  }

  function pullNearby(cx, cy, radius) {
    for (const c of coins) {
      if (c.collected) continue;
      const dist = Math.hypot(c.x - cx, c.y - cy);
      if (dist < radius) {
        const dx = cx - c.x, dy = cy - c.y;
        const d = Math.hypot(dx, dy);
        if (d > 0) { c.x += (dx / d) * 5; c.y += (dy / d) * 5; }
      }
    }
  }

  function init() { coins = []; }

  function update(dt, player, cameraY, canvasH) {
    for (const c of coins) {
      if (c.collected) continue;
      c.y += c.vy;
      c.vy += 0.1;
      c.life -= dt;
      if (c.life <= 0) { c.collected = true; continue; }

      // Collect
      if (Physics.playerCoinCollision(player, c)) {
        c.collected = true;
        const amount = Math.ceil(1 * PlayerUpgrades.getCurrencyBoost());
        GameState.coins += amount;
        GameState.totalCoins += amount;
        if (typeof RunStats !== 'undefined') RunStats.coinsCollected += amount;
        SFX.play('purchase');
      }
    }
    // Random spawn
    if (Math.random() < 0.005) {
      spawnAt(Math.random() * GameState.canvasW, cameraY - 50);
    }
    coins = coins.filter(c => !c.collected && c.y < cameraY + canvasH + 100);
  }

  function draw(ctx, cameraY) {
    for (const c of coins) {
      if (c.collected) continue;
      const drawY = c.y - cameraY;
      if (drawY < -20 || drawY > ctx.canvas.height + 20) continue;

      ctx.save();
      ctx.shadowColor = '#ffee00';
      ctx.shadowBlur = 10;

      const grad = ctx.createRadialGradient(c.x - 2, drawY - 2, 1, c.x, drawY, c.r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, '#ffee00');
      grad.addColorStop(1, '#ff9900');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, drawY, c.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◈', c.x, drawY);
      ctx.restore();
    }
  }

  return { init, spawnAt, showerCoins, pullNearby, update, draw };
})();

// ── SAVE SYSTEM ──
const Save = (() => {
  const KEY = 'neonAscent_v2';

  function save() {
    const data = {
      totalCoins: GameState.totalCoins,
      bestScore: GameState.bestScore,
      totalRuns: GameState.totalRuns,
      ownedAbilities: GameState.ownedAbilities,
      inventorySlots: GameState.inventorySlots,
      playerUpgradeLevels: GameState.playerUpgradeLevels,
      gunUpgrades: GameState.gunUpgrades,
      settings: GameState.settings,
    };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.totalCoins !== undefined) GameState.totalCoins = data.totalCoins;
      if (data.bestScore !== undefined) GameState.bestScore = data.bestScore;
      if (data.totalRuns !== undefined) GameState.totalRuns = data.totalRuns;
      if (data.ownedAbilities) GameState.ownedAbilities = data.ownedAbilities;
      if (data.inventorySlots) GameState.inventorySlots = data.inventorySlots;
      if (data.playerUpgradeLevels) GameState.playerUpgradeLevels = data.playerUpgradeLevels;
      if (data.gunUpgrades) GameState.gunUpgrades = data.gunUpgrades;
      if (data.settings) GameState.settings = { ...GameState.settings, ...data.settings };
    } catch(e) {}
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch(e) {}
    GameState.totalCoins = 0;
    GameState.bestScore = 0;
    GameState.totalRuns = 0;
    GameState.ownedAbilities = {};
    GameState.inventorySlots = { 1: null, 2: null, 3: null };
    GameState.playerUpgradeLevels = {};
    GameState.gunUpgrades = {};
    GameState.settings = { sfx: true, shake: true, scanlines: true, autoShoot: true, difficulty: 'medium' };
  }

  return { save, load, reset };
})();

// ── UI ──
const UI = (() => {
  let toastTimeout = null;
  let speedrunStart = 0;
  let speedrunActive = false;
  let speedrunMs = 0;

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.style.display = '';
    });
    const target = document.getElementById(id);
    if (target) {
      target.classList.add('active');
      if (id === 'game-screen') target.style.display = 'block';
    }
  }

  function hidePause() {
    const p = document.getElementById('pause-menu');
    if (p) p.classList.remove('active');
  }

  function showPause() {
    const p = document.getElementById('pause-menu');
    if (p) p.classList.add('active');
  }

  function showToast(msg, duration = 2000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.style.display = 'none'; }, duration);
  }

  function showBossAnnounce(name) {
    const el = document.getElementById('boss-announce');
    const txt = document.getElementById('boss-name-text');
    if (!el || !txt) return;
    txt.textContent = '⚠ ' + name + ' ⚠';
    el.style.display = 'flex';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
  }

  function updateScore(score) {
    const el = document.getElementById('score-val');
    if (el) el.textContent = Math.floor(score);
  }

  function updateCoins(coins) {
    const el = document.getElementById('coins-val');
    if (el) el.textContent = coins;
  }

  function updateHealthBar(hp, maxHp) {
    const bar = document.getElementById('health-bar-inner');
    const txt = document.getElementById('health-text');
    const container = document.getElementById('health-bar-container');
    if (!container) return;

    if (PlayerUpgrades.hasHealthSystem()) {
      container.style.display = 'flex';
      const pct = Math.max(0, hp / maxHp) * 100;
      if (bar) bar.style.width = pct + '%';
      if (txt) txt.textContent = Math.ceil(hp) + '/' + maxHp;
    } else {
      container.style.display = 'none';
    }
  }

  function updateAbilityHUD() {
    const slots = Inventory.getAll();
    for (let s = 1; s <= 3; s++) {
      const slot = document.getElementById('slot-' + s);
      if (!slot) continue;
      const icon = slot.querySelector('.slot-icon');
      const name = slot.querySelector('.slot-name');
      const abilityId = slots[s];

      if (abilityId) {
        const def = Items.getBaseAbility(abilityId);
        if (def) {
          icon.textContent = def.icon;
          name.textContent = def.name.toUpperCase();
          slot.style.borderColor = 'rgba(0,245,255,0.4)';
        }
      } else {
        icon.textContent = '—';
        name.textContent = 'EMPTY';
        slot.style.borderColor = '';
      }
    }
  }

  function updateAbilityCooldowns() {
    const slots = Inventory.getAll();
    for (let s = 1; s <= 3; s++) {
      const slot = document.getElementById('slot-' + s);
      if (!slot) continue;
      const abilityId = slots[s];
      if (!abilityId) continue;

      const cd = Abilities.getCooldown(abilityId);
      const maxCd = Abilities.getMaxCooldown(abilityId);
      const fill = slot.querySelector('.slot-cooldown-fill');

      if (cd > 0) {
        const pct = ((maxCd - cd) / maxCd) * 100;
        if (fill) fill.style.width = pct + '%';
        slot.classList.add('on-cooldown');
        slot.classList.remove('active-glow');
      } else {
        if (fill) fill.style.width = '100%';
        slot.classList.remove('on-cooldown');
        if (Abilities.isActive(abilityId)) {
          slot.classList.add('active-glow');
        } else {
          slot.classList.remove('active-glow');
        }
      }
    }
  }

  function updateSpeedrunTimer() {
    if (!speedrunActive) return;
    speedrunMs = Date.now() - speedrunStart;
    const total = Math.floor(speedrunMs / 1000);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    const ms = Math.floor((speedrunMs % 1000) / 10);
    const el = document.getElementById('timer-val');
    if (el) el.textContent = `${mins}:${String(secs).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
  }

  function toggleSpeedrunTimer() {
    const el = document.getElementById('speedrun-timer');
    if (!speedrunActive) {
      speedrunActive = true;
      speedrunStart = Date.now() - speedrunMs;
      if (el) el.style.display = 'block';
    } else {
      speedrunActive = false;
      if (el) el.style.display = 'none';
    }
  }

  function startSpeedrunTimer() {
    speedrunActive = true;
    speedrunStart = Date.now();
    speedrunMs = 0;
    const el = document.getElementById('speedrun-timer');
    if (el) el.style.display = 'block';
  }

  function resetSpeedrunTimer() {
    speedrunMs = 0;
    speedrunStart = Date.now();
  }

  function getElapsedSeconds() { return Math.floor(speedrunMs / 1000); }
  function getElapsedFormatted() {
    const total = Math.floor(speedrunMs / 1000);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${String(secs).padStart(2,'0')}`;
  }

  function showGameOver(score, runCoins) {
    // ── Header stats (instant)
    document.getElementById('go-score').textContent = Math.floor(score);
    document.getElementById('go-time').textContent  = getElapsedFormatted();
    const best = Math.floor(GameState.bestScore);
    const bestEl = document.getElementById('go-best');
    if (bestEl) {
      bestEl.textContent = best;
      bestEl.style.color = Math.floor(score) >= best ? 'var(--neon-yellow)' : '';
    }

    // ── Coin breakdown amounts
    const stats = (typeof RunStats !== 'undefined') ? RunStats : {};
    const heightCoins  = Math.floor(score / 10);
    const enemyCoins   = (stats.enemiesKilled  || 0) * 3;
    const bounceCoins  = Math.floor((stats.platformsBounced || 0) / 5);
    const bossCoins    = (stats.bossesKilled   || 0) * 50;
    const collected    = stats.coinsCollected  || 0;
    const subtotal     = heightCoins + enemyCoins + bounceCoins + bossCoins + collected;

    // Difficulty coin multiplier: Easy 1x, Medium 1.2x, Hard 2x
    const diffMults = { easy: 1.0, medium: 1.2, hard: 2.0 };
    const diff = (GameState.settings && GameState.settings.difficulty) || 'medium';
    const diffMult = diffMults[diff] || 1.0;
    const total = Math.floor(subtotal * diffMult);

    // Award total to player's persistent coins
    GameState.totalCoins += total;
    Save.save();

    // ── Reset rows to hidden
    const rows = ['height','enemies','collected','bounces','bosses','diffmult'];
    rows.forEach(id => {
      const row = document.getElementById('go-row-' + id);
      const val = document.getElementById('go-coins-' + id);
      if (row) { row.classList.remove('visible'); }
      if (val) val.textContent = '+0';
    });
    const totalEl = document.getElementById('go-coins-total');
    if (totalEl) totalEl.textContent = '0';
    const actionsEl = document.querySelector('.gameover-actions');
    if (actionsEl) actionsEl.classList.remove('visible');

    // Show/hide boss row
    const bossRow = document.getElementById('go-row-bosses');
    if (bossRow) bossRow.style.display = (stats.bossesKilled > 0) ? '' : 'none';

    showScreen('gameover-screen');

    // ── Staggered row reveal + count-up animation
    function animateCount(el, target, prefix, duration, onDone) {
      if (!el) { if (onDone) onDone(); return; }
      const start = performance.now();
      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        el.textContent = prefix + Math.floor(eased * target);
        if (t < 1) requestAnimationFrame(tick);
        else { el.textContent = prefix + target; if (onDone) onDone(); }
      }
      requestAnimationFrame(tick);
    }

    // Update difficulty multiplier display
    const diffMultEl = document.getElementById('go-coins-diffmult');
    if (diffMultEl) diffMultEl.textContent = '×' + diffMult.toFixed(1);
    const diffRow = document.getElementById('go-row-diffmult');
    if (diffRow) { diffRow.style.display = diffMult !== 1.0 ? '' : 'none'; }

    const rowData = [
      { id: 'height',    amount: heightCoins, label: '+' },
      { id: 'enemies',   amount: enemyCoins,  label: '+' },
      { id: 'collected', amount: collected,   label: '+' },
      { id: 'bounces',   amount: bounceCoins, label: '+' },
      { id: 'bosses',    amount: bossCoins,   label: '+', skip: bossCoins === 0 },
      { id: 'diffmult',  amount: null,        label: '×', skip: diffMult === 1.0, fixedText: '×' + diffMult.toFixed(1) },
    ];

    let delay = 200;
    let runningTotal = 0;

    rowData.forEach((row) => {
      if (row.skip) return;
      setTimeout(() => {
        const rowEl = document.getElementById('go-row-' + row.id);
        const valEl = document.getElementById('go-coins-' + row.id);
        if (rowEl) rowEl.classList.add('visible');
        SFX.play('purchase');
        if (row.fixedText) {
          if (valEl) valEl.textContent = row.fixedText;
          runningTotal += 0;
          if (totalEl) totalEl.textContent = runningTotal;
          return;
        }
        animateCount(valEl, row.amount, row.label, 600, () => {
          runningTotal += row.amount;
          if (totalEl) totalEl.textContent = runningTotal;
        });
      }, delay);
      delay += 350;
    });

    // Show total with final flash, then reveal buttons
    setTimeout(() => {
      animateCount(totalEl, total, '', 800, () => {
        if (actionsEl) actionsEl.classList.add('visible');
      });
    }, delay + 100);
  }

  function updateMainMenuStats() {
    const bs = document.getElementById('best-score-display');
    const tc = document.getElementById('total-coins-display');
    const runs = document.getElementById('runs-display');
    if (bs) bs.textContent = Math.floor(GameState.bestScore);
    if (tc) tc.textContent = GameState.totalCoins;
    if (runs) runs.textContent = GameState.totalRuns;
  }

  function initAbilityEquipScreen() {
    const backBtn = document.getElementById('ability-back');
    if (backBtn) backBtn.addEventListener('click', () => showScreen('main-menu'));
    renderEquipScreen();
  }

  function renderEquipScreen() {
    const slots = Inventory.getAll();
    for (let s = 1; s <= 3; s++) {
      const el = document.getElementById('equip-slot-' + s);
      if (!el) continue;
      const id = slots[s];
      if (id) {
        const def = Items.getBaseAbility(id);
        if (def) el.textContent = def.icon + ' ' + def.name;
        else el.textContent = 'UNKNOWN';
      } else {
        el.textContent = 'EMPTY';
      }
    }

    const list = document.getElementById('owned-abilities-list');
    if (!list) return;
    list.innerHTML = '<div style="font-size:10px;letter-spacing:2px;color:var(--text-dim);margin-bottom:12px;">OWNED ABILITIES — CLICK TO EQUIP</div>';

    const owned = Object.keys(GameState.ownedAbilities);
    if (owned.length === 0) {
      list.innerHTML += '<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:20px;">No abilities owned. Visit the Upgrade Lab!</div>';
      return;
    }

    for (const id of owned) {
      const def = Items.getBaseAbility(id);
      if (!def) continue;
      const upgCount = (GameState.ownedAbilities[id].upgrades || []).length;

      const item = document.createElement('div');
      item.className = 'owned-ability-item';
      item.innerHTML = `
        <div class="oai-icon">${def.icon}</div>
        <div class="oai-info">
          <div class="oai-name">${def.name}</div>
          <div class="oai-upgrades">${upgCount}/9 upgrades</div>
        </div>
        <div class="equip-slot-btns">
          <button class="equip-btn" data-slot="1">SL1</button>
          <button class="equip-btn" data-slot="2">SL2</button>
          <button class="equip-btn" data-slot="3">SL3</button>
        </div>
      `;

      item.querySelectorAll('.equip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          Inventory.equip(id, parseInt(btn.dataset.slot));
          renderEquipScreen();
        });
      });

      list.appendChild(item);
    }
  }

  // Expose for HTML onclick
  window.unequipSlot = (slot) => {
    Inventory.unequip(slot);
    renderEquipScreen();
    updateAbilityHUD();
  };

  function initSettings() {
    const backBtn = document.getElementById('settings-back');
    if (backBtn) backBtn.addEventListener('click', () => showScreen('main-menu'));

    // Difficulty buttons
    const diffs = ['easy','medium','hard'];
    diffs.forEach(d => {
      const btn = document.getElementById('diff-' + d);
      if (!btn) return;
      if (GameState.settings.difficulty === d) btn.classList.add('active');
      btn.addEventListener('click', () => {
        diffs.forEach(x => document.getElementById('diff-' + x)?.classList.remove('active'));
        btn.classList.add('active');
        GameState.settings.difficulty = d;
        Save.save();
      });
    });

    const toggleSfx       = document.getElementById('toggle-sfx');
    const toggleShake     = document.getElementById('toggle-shake');
    const toggleScanlines = document.getElementById('toggle-scanlines');
    const toggleAutoShoot = document.getElementById('toggle-autoshoot');
    const resetBtn        = document.getElementById('btn-reset');

    function updateToggle(btn, key) {
      if (!btn) return;
      const on = GameState.settings[key];
      btn.textContent = on ? 'ON' : 'OFF';
      btn.dataset.on = on ? 'true' : 'false';
      btn.style.color = on ? 'var(--neon-cyan)' : 'var(--text-dim)';
    }

    if (toggleSfx) {
      updateToggle(toggleSfx, 'sfx');
      toggleSfx.addEventListener('click', () => {
        GameState.settings.sfx = !GameState.settings.sfx;
        SFX.setEnabled(GameState.settings.sfx);
        updateToggle(toggleSfx, 'sfx');
        Save.save();
      });
    }

    if (toggleShake) {
      updateToggle(toggleShake, 'shake');
      toggleShake.addEventListener('click', () => {
        GameState.settings.shake = !GameState.settings.shake;
        updateToggle(toggleShake, 'shake');
        Save.save();
      });
    }

    if (toggleScanlines) {
      updateToggle(toggleScanlines, 'scanlines');
      toggleScanlines.addEventListener('click', () => {
        GameState.settings.scanlines = !GameState.settings.scanlines;
        updateToggle(toggleScanlines, 'scanlines');
        Save.save();
      });
    }

    if (toggleAutoShoot) {
      updateToggle(toggleAutoShoot, 'autoShoot');
      toggleAutoShoot.addEventListener('click', () => {
        GameState.settings.autoShoot = !GameState.settings.autoShoot;
        updateToggle(toggleAutoShoot, 'autoShoot');
        Save.save();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all progress? This cannot be undone.')) {
          Save.reset();
          showScreen('main-menu');
          updateMainMenuStats();
          showToast('ALL PROGRESS RESET');
        }
      });
    }
  }

  return {
    showScreen, hidePause, showPause, showToast, showBossAnnounce,
    updateScore, updateCoins, updateHealthBar, updateAbilityHUD, updateAbilityCooldowns,
    updateSpeedrunTimer, toggleSpeedrunTimer, startSpeedrunTimer, resetSpeedrunTimer, getElapsedSeconds, getElapsedFormatted,
    showGameOver, updateMainMenuStats, initAbilityEquipScreen, renderEquipScreen, initSettings,
    initLootBox,
  };
})();

// ── LOOT BOX ─────────────────────────────────────────────────
const LootBox = (() => {
  const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
  const KEY = 'neon_lootbox_last';

  // Reward pools
  const ABILITY_IDS = [
    'rocket_surge','phase_dash','gravity_flip','energy_shield','pulse_slam',
    'drone','time_distort','platform_forge','chaos_engine','overdrive'
  ];
  const ABILITY_NAMES = {
    rocket_surge:'Rocket Surge', phase_dash:'Phase Dash', gravity_flip:'Gravity Flip',
    energy_shield:'Energy Shield', pulse_slam:'Pulse Slam', drone:'Drone',
    time_distort:'Time Distort', platform_forge:'Platform Forge',
    chaos_engine:'Chaos Engine', overdrive:'Overdrive'
  };
  const STAT_UPGRADES = [
    { id:'health',         name:'+1 Max HP',       desc:'Increases max health by 1' },
    { id:'jump_mult',      name:'+Jump Power',     desc:'Increases jump height' },
    { id:'score_mult',     name:'+Score Mult',     desc:'Increases score gain' },
    { id:'currency_boost', name:'+Coin Boost',     desc:'Earn more coins in runs' },
  ];

  // Rarity config
  const RARITIES = {
    common:   { label:'COMMON',    color:'#8aa4b0', glow:'#8aa4b0', bg:'rgba(30,45,55,0.95)' },
    uncommon: { label:'UNCOMMON',  color:'#00ff88', glow:'#00ff88', bg:'rgba(0,30,20,0.95)' },
    rare:     { label:'RARE',      color:'#9900ff', glow:'#cc44ff', bg:'rgba(20,0,40,0.95)' },
  };

  function getLastOpen() {
    try { return parseInt(localStorage.getItem(KEY) || '0'); } catch(e) { return 0; }
  }
  function setLastOpen() {
    try { localStorage.setItem(KEY, Date.now().toString()); } catch(e) {}
  }
  function getMsUntilNext() {
    return Math.max(0, COOLDOWN_MS - (Date.now() - getLastOpen()));
  }

  function roll() {
    const r = Math.random();
    if (r < 0.55) {
      // Common: coins 10-30
      const coins = 10 + Math.floor(Math.random() * 21);
      return { rarity:'common', type:'coins', amount:coins,
               label:`+${coins} COINS`, icon:'◈', desc:'Bonus coins added to your stash' };
    } else if (r < 0.90) {
      // Uncommon: coins 31-50
      const coins = 31 + Math.floor(Math.random() * 20);
      return { rarity:'uncommon', type:'coins', amount:coins,
               label:`+${coins} COINS`, icon:'◈◈', desc:'A generous coin haul' };
    } else if (r < 0.97) {
      // Rare: random ability (free unlock)
      const id = ABILITY_IDS[Math.floor(Math.random() * ABILITY_IDS.length)];
      return { rarity:'rare', type:'ability', id,
               label:ABILITY_NAMES[id] || id, icon:'⚡', desc:'Ability unlocked for free!' };
    } else {
      // Ultra rare: stat upgrade
      const upg = STAT_UPGRADES[Math.floor(Math.random() * STAT_UPGRADES.length)];
      return { rarity:'rare', type:'stat', id:upg.id,
               label:upg.name, icon:'★', desc:upg.desc };
    }
  }

  // Generate strip of items for the scroll animation (51 total, winner at index 42)
  function buildStrip(winner) {
    const items = [];
    for (let i = 0; i < 51; i++) {
      if (i === 42) { items.push(winner); continue; }
      const r = Math.random();
      if (r < 0.7) {
        const c = 10 + Math.floor(Math.random() * 41);
        items.push({ rarity: c < 31 ? 'common' : 'uncommon', type:'coins', amount:c, label:`+${c}◈`, icon:'◈' });
      } else {
        const id = ABILITY_IDS[Math.floor(Math.random() * ABILITY_IDS.length)];
        items.push({ rarity:'rare', type:'ability', id, label:ABILITY_NAMES[id]||id, icon:'⚡' });
      }
    }
    return items;
  }

  function applyReward(reward) {
    if (reward.type === 'coins') {
      GameState.totalCoins = (GameState.totalCoins || 0) + reward.amount;
      Save.save();
    } else if (reward.type === 'ability') {
      if (!GameState.ownedAbilities[reward.id]) {
        GameState.ownedAbilities[reward.id] = { upgrades: [] };
        Save.save();
      }
    } else if (reward.type === 'stat') {
      const lvls = GameState.playerUpgradeLevels || {};
      lvls[reward.id] = Math.min((lvls[reward.id] || 0) + 1, 5);
      GameState.playerUpgradeLevels = lvls;
      Save.save();
    }
  }

  // ── ANIMATE ──────────────────────────────────────────────
  function animate(winner, onDone) {
    const strip = buildStrip(winner);
    const ITEM_W = 120; // px per item
    const VISIBLE_CENTER = 3; // show 7 items, winner is index 42
    const totalScroll = (42 - VISIBLE_CENTER) * ITEM_W; // px to scroll

    const track = document.getElementById('lb-track');
    if (!track) return;

    // Build strip HTML
    track.innerHTML = '';
    strip.forEach((item, i) => {
      const rar = RARITIES[item.rarity] || RARITIES.common;
      const el = document.createElement('div');
      el.className = 'lb-item';
      el.style.cssText = `background:${rar.bg};border-color:${rar.color};box-shadow:0 0 10px ${rar.glow}33;`;
      el.innerHTML = `<div class="lb-item-icon" style="color:${rar.color}">${item.icon||'◈'}</div>
                      <div class="lb-item-label" style="color:${rar.color}">${item.label}</div>
                      <div class="lb-item-rarity" style="color:${rar.color}">${rar.label}</div>`;
      if (i === 42) el.classList.add('lb-winner-item');
      track.appendChild(el);
    });

    // Reset scroll
    track.style.transition = 'none';
    track.style.transform = 'translateX(0)';
    void track.offsetWidth;

    // Fast scroll with easing — 3 phases
    let phase = 0;
    const phases = [
      { duration: 1200, easing: 'cubic-bezier(0.1, 0.0, 0.2, 1.0)', pct: 0.55 },
      { duration: 1400, easing: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)', pct: 0.85 },
      { duration: 1800, easing: 'cubic-bezier(0.0, 0.0, 0.05, 1.0)', pct: 1.00 },
    ];

    // Tick sounds during scroll
    let tickInterval = setInterval(() => SFX.play('loot_tick'), 80);

    function runPhase() {
      const p = phases[phase];
      const scrollTo = totalScroll * p.pct;
      track.style.transition = `transform ${p.duration}ms ${p.easing}`;
      track.style.transform = `translateX(-${scrollTo}px)`;

      // Slow down tick sound as we decelerate
      if (phase === 1) { clearInterval(tickInterval); tickInterval = setInterval(() => SFX.play('loot_slow'), 160); }
      if (phase === 2) { clearInterval(tickInterval); tickInterval = setInterval(() => SFX.play('loot_slow'), 300); }

      setTimeout(() => {
        phase++;
        if (phase < phases.length) runPhase();
        else {
          clearInterval(tickInterval);
          setTimeout(() => {
            // Highlight winner
            const winnerEl = track.querySelector('.lb-winner-item');
            if (winnerEl) {
              const rar = RARITIES[winner.rarity] || RARITIES.common;
              winnerEl.style.transform = 'scaleY(1.15)';
              winnerEl.style.boxShadow = `0 0 40px ${rar.glow}, 0 0 80px ${rar.glow}66`;
              winnerEl.style.zIndex = '10';
            }
            // Play rarity sound
            const snd = winner.rarity === 'rare' ? 'loot_rare'
                      : winner.rarity === 'uncommon' ? 'loot_uncommon' : 'loot_common';
            SFX.play(snd);
            SFX.play('loot_land');
            setTimeout(() => onDone && onDone(winner), 800);
          }, 120);
        }
      }, p.duration);
    }
    runPhase();
  }

  function init() {
    const btn = document.getElementById('lb-open-btn');
    const timerEl = document.getElementById('lb-timer');
    const modal = document.getElementById('lb-modal');
    const closeBtn = document.getElementById('lb-close');
    const rewardEl = document.getElementById('lb-reward-text');
    const rewardBox = document.getElementById('lb-reward-box');

    if (!btn) return;

    function updateTimer() {
      const ms = getMsUntilNext();
      if (ms <= 0) {
        btn.disabled = false;
        btn.textContent = '🎁 OPEN LOOT BOX';
        btn.classList.add('lb-ready');
        if (timerEl) timerEl.textContent = 'Ready!';
      } else {
        btn.disabled = true;
        btn.classList.remove('lb-ready');
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        if (timerEl) timerEl.textContent = `${m}m ${s.toString().padStart(2,'0')}s`;
        btn.textContent = '🎁 LOOT BOX';
      }
    }

    setInterval(updateTimer, 1000);
    updateTimer();

    btn.addEventListener('click', () => {
      if (getMsUntilNext() > 0) return;
      setLastOpen();
      updateTimer();

      // Show modal
      modal.style.display = 'flex';
      rewardEl.textContent = '';
      rewardBox.style.display = 'none';
      document.getElementById('lb-strip-wrap').style.display = 'block';

      const winner = roll();
      animate(winner, (w) => {
        // Apply reward
        applyReward(w);
        UI.updateMainMenuStats();

        // Show reward summary
        const rar = RARITIES[w.rarity] || RARITIES.common;
        rewardBox.style.display = 'block';
        rewardBox.style.background = rar.bg;
        rewardBox.style.borderColor = rar.color;
        rewardBox.style.boxShadow = `0 0 30px ${rar.glow}88`;
        rewardEl.innerHTML = `<span style="color:${rar.color};font-size:28px">${w.icon||'◈'}</span><br>
          <span style="color:${rar.color};font-size:18px;letter-spacing:2px">${w.label}</span><br>
          <span style="color:${rar.color};font-size:11px;opacity:0.7">${w.desc||''}</span><br>
          <span style="color:${rar.color};font-size:11px;letter-spacing:3px;margin-top:6px;display:block">${rar.label}</span>`;
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  return { init };
})();
