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
      totalHeightJumped: GameState.totalHeightJumped || 0,
      prestige: GameState.prestige,
      mastery: GameState.mastery,
      cosmetics: GameState.cosmetics,
      milestonesReached: GameState.milestonesReached,
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
      if (data.totalHeightJumped !== undefined) GameState.totalHeightJumped = data.totalHeightJumped;
      if (data.prestige) GameState.prestige = data.prestige;
      if (data.mastery) GameState.mastery = data.mastery;
      if (data.cosmetics) GameState.cosmetics = data.cosmetics;
      if (data.milestonesReached !== undefined) GameState.milestonesReached = data.milestonesReached;
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
    GameState.totalHeightJumped = 0;
    GameState.prestige = { level: 0, passives: [] };
    GameState.mastery = {};
    GameState.cosmetics = { owned: ['skin_default','trail_none','part_default'], equipped: { skin:'skin_default', trail:'trail_none', particle:'part_default' } };
    GameState.milestonesReached = 0;
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
    const diffMults = { easy: 1.0, medium: 1.2, hard: 2.0, insane: 5.0, nightmare: 10.0 };
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
    const prestigeEl = document.getElementById('prestige-display');
    if (prestigeEl && typeof Prestige !== 'undefined') {
      const lvl = Prestige.getLevel();
      prestigeEl.textContent = lvl > 0 ? `${lvl} ✨` : '0';
    }
    const bs = document.getElementById('best-score-display');
    const tc = document.getElementById('total-coins-display');
    const runs = document.getElementById('runs-display');
    if (bs) bs.textContent = Math.floor(GameState.bestScore).toLocaleString();
    if (tc) tc.textContent = (GameState.totalCoins || 0).toLocaleString();
    if (runs) runs.textContent = GameState.totalRuns || 0;

    // Ascension tracker on main menu
    if (typeof Prestige !== 'undefined') {
      const lvl      = Prestige.getLevel();
      const total    = GameState.totalHeightJumped || 0;
      const needed   = Prestige.getNextHeight();
      const pct      = lvl >= 10 ? 100 : Math.min(100, (total / needed) * 100);
      const totalEl  = document.getElementById('asc-total-display');
      const fillEl   = document.getElementById('asc-main-fill');
      const labelEl  = document.getElementById('asc-main-label');
      const ascBtn   = document.getElementById('btn-ascend-menu');
      if (totalEl)  totalEl.textContent  = total.toLocaleString();
      if (fillEl)   fillEl.style.width   = pct.toFixed(1) + '%';
      if (labelEl)  labelEl.textContent  = lvl >= 10
        ? '✨ MAX ASCENSION'
        : `Next ascension: ${needed.toLocaleString()} total height`;
      if (ascBtn)   ascBtn.style.display = Prestige.canAscend() ? 'inline-block' : 'none';
    }
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
      const mStars = (typeof Mastery !== 'undefined') ? Mastery.getStars(id) : 0;
      const mStarStr = '⭐'.repeat(mStars) + '☆'.repeat(5 - mStars);
      item.innerHTML = `
        <div class="oai-icon">${def.icon}</div>
        <div class="oai-info">
          <div class="oai-name">${def.name}</div>
          <div class="oai-upgrades">${upgCount}/9 upgrades</div>
          <div class="oai-mastery" title="Mastery ${mStars}/5">${mStarStr}</div>
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
    const diffs = ['easy','medium','hard','insane','nightmare'];
    let hardClickCount = 0;
    let insaneClickCount = 0;
    const INSANE_UNLOCK_CLICKS    = 10;
    const NIGHTMARE_UNLOCK_CLICKS = 10;

    function setActiveDiff(d) {
      diffs.forEach(x => document.getElementById('diff-' + x)?.classList.remove('active'));
      document.getElementById('diff-' + d)?.classList.add('active');
      GameState.settings.difficulty = d;
      Save.save();
    }

    diffs.forEach(d => {
      const btn = document.getElementById('diff-' + d);
      if (!btn) return;
      if (GameState.settings.difficulty === d) btn.classList.add('active');

      btn.addEventListener('click', () => {
        if (d === 'hard') {
          hardClickCount++;
          if (hardClickCount >= INSANE_UNLOCK_CLICKS) {
            GameState.settings.insaneUnlocked = true;
            Save.save();
            showToast('🔥 INSANE MODE UNLOCKED!', 2500);
            setTimeout(() => showScreen('settings-screen'), 400);
            hardClickCount = 0;
          } else if (hardClickCount >= 5) {
            showToast(`🔒 ${INSANE_UNLOCK_CLICKS - hardClickCount} more clicks to unlock INSANE...`, 1200);
          }
        }
        if (d === 'insane') {
          insaneClickCount++;
          if (insaneClickCount >= NIGHTMARE_UNLOCK_CLICKS) {
            GameState.settings.nightmareUnlocked = true;
            GameState.settings.insaneUnlocked = true;
            Save.save();
            showToast('💀 NIGHTMARE MODE UNLOCKED. GOD HELP YOU.', 3000);
            setTimeout(() => showScreen('settings-screen'), 400);
            insaneClickCount = 0;
          } else if (insaneClickCount >= 5) {
            showToast(`😈 ${NIGHTMARE_UNLOCK_CLICKS - insaneClickCount} more clicks to unlock NIGHTMARE...`, 1200);
          }
        }
        setActiveDiff(d);
      });
    });

    // refreshDiffButtons: shows/hides secret difficulty buttons based on unlock state
    // Called on init AND every time settings screen opens
    function refreshDiffButtons() {
      const s = GameState.settings || {};
      const insaneUnlocked = s.insaneUnlocked || s.difficulty === 'insane' || s.difficulty === 'nightmare';
      const nightmareUnlocked = s.nightmareUnlocked || s.difficulty === 'nightmare';

      const insaneBtn = document.getElementById('diff-insane');
      if (insaneBtn) insaneBtn.style.display = insaneUnlocked ? '' : 'none';

      const nmBtn = document.getElementById('diff-nightmare');
      if (nmBtn) nmBtn.style.display = nightmareUnlocked ? '' : 'none';

      // Re-mark active button
      diffs.forEach(x => {
        const b = document.getElementById('diff-' + x);
        if (b) b.classList.toggle('active', s.difficulty === x);
      });
    }
    refreshDiffButtons();

    // Re-run refresh every time settings screen becomes active
    const settingsScreen = document.getElementById('settings-screen');
    if (settingsScreen) {
      const obs = new MutationObserver(() => {
        if (settingsScreen.classList.contains('active')) refreshDiffButtons();
      });
      obs.observe(settingsScreen, { attributes: true, attributeFilter: ['class'] });
    }

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
  };
})();


// ═══════════════════════════════════════════════════════════════
//  LOOT BOX — standalone module, no UI IIFE dependency
// ═══════════════════════════════════════════════════════════════
const LootBox = (() => {
  const COOLDOWN_MS = 10 * 60 * 1000;
  const LS_KEY = 'neon_lootbox_last';

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
    { id:'health',         name:'+1 Max HP',      desc:'Increases max health by 1' },
    { id:'jump_mult',      name:'+Jump Power',    desc:'Jump height increased' },
    { id:'score_mult',     name:'+Score Mult',    desc:'Score gain increased' },
    { id:'currency_boost', name:'+Coin Boost',    desc:'Earn more coins in runs' },
  ];

  const RARITIES = {
    common:   { label:'COMMON',    color:'#90aab8', glow:'#90aab8', bg:'linear-gradient(135deg,#0d1a22,#12232e)' },
    uncommon: { label:'UNCOMMON',  color:'#00ff88', glow:'#00ff88', bg:'linear-gradient(135deg,#001a0f,#002a18)' },
    rare:     { label:'RARE',      color:'#cc44ff', glow:'#cc44ff', bg:'linear-gradient(135deg,#14003a,#22006a)' },
  };

  function getLastOpen()  { try { return parseInt(localStorage.getItem(LS_KEY)||'0'); } catch(e){return 0;} }
  function setLastOpen()  { try { localStorage.setItem(LS_KEY, Date.now().toString()); } catch(e){} }
  function getMsRemain()  { return Math.max(0, COOLDOWN_MS - (Date.now() - getLastOpen())); }

  function roll() {
    // Filter out already-owned abilities
    const unownedAbilities = ABILITY_IDS.filter(id =>
      !GameState.ownedAbilities || !GameState.ownedAbilities[id]
    );
    // Filter out maxed stat upgrades (max level 5)
    const availableStats = STAT_UPGRADES.filter(u => {
      const lvl = (GameState.playerUpgradeLevels || {})[u.id] || 0;
      return lvl < 5;
    });

    const r = Math.random();
    // If rare roll but nothing available, fall back to coins
    const canRollRare = unownedAbilities.length > 0 || availableStats.length > 0;

    if (r < 0.55 || (!canRollRare && r >= 0.90)) {
      const coins = 10 + Math.floor(Math.random()*21);
      return { rarity:'common', type:'coins', amount:coins, label:`+${coins} COINS`, icon:'◈', desc:'Coin reward added to your stash.' };
    } else if (r < 0.90) {
      const coins = 31 + Math.floor(Math.random()*20);
      return { rarity:'uncommon', type:'coins', amount:coins, label:`+${coins} COINS`, icon:'◈◈', desc:'A generous haul of coins.' };
    } else if (r < 0.97 && canRollRare) {
      // Pick between ability and stat, weighted by availability
      const pool = [
        ...unownedAbilities.map(id => ({ type:'ability', id })),
        ...availableStats.map(u => ({ type:'stat', id:u.id, name:u.name, desc:u.desc })),
      ];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick.type === 'ability') {
        return { rarity:'rare', type:'ability', id:pick.id, label:ABILITY_NAMES[pick.id]||pick.id, icon:'⚡', desc:'Ability unlocked for free!' };
      } else {
        return { rarity:'rare', type:'stat', id:pick.id, label:pick.name, icon:'★', desc:pick.desc };
      }
    } else {
      // Ultra rare: gun upgrade part (pick random unowned)
      // Fall back to big coin reward if nothing available
      const bigCoins = 45 + Math.floor(Math.random()*16);
      return { rarity:'rare', type:'coins', amount:bigCoins, label:`+${bigCoins} COINS`, icon:'◈◈◈', desc:'Jackpot! Rare coin haul.' };
    }
  }

  function buildStrip(winner) {
    const items = [];
    for (let i = 0; i < 55; i++) {
      if (i === WIN_IDX) { items.push(winner); continue; }
      const r = Math.random();
      if (r < 0.68) {
        const c = 10 + Math.floor(Math.random()*41);
        items.push({ rarity:c<31?'common':'uncommon', type:'coins', label:`+${c}◈`, icon:'◈' });
      } else {
        const id = ABILITY_IDS[Math.floor(Math.random()*ABILITY_IDS.length)];
        items.push({ rarity:'rare', type:'ability', label:ABILITY_NAMES[id]||id, icon:'⚡' });
      }
    }
    return items;
  }

  function applyReward(w) {
    if (w.type === 'coins') {
      GameState.totalCoins = (GameState.totalCoins||0) + w.amount;
      Save.save();
    } else if (w.type === 'ability') {
      if (!GameState.ownedAbilities[w.id]) {
        GameState.ownedAbilities[w.id] = { upgrades:[] };
        Save.save();
      }
    } else if (w.type === 'stat') {
      if (!GameState.playerUpgradeLevels) GameState.playerUpgradeLevels = {};
      GameState.playerUpgradeLevels[w.id] = Math.min((GameState.playerUpgradeLevels[w.id]||0)+1, 5);
      Save.save();
    }
  }

  // ── SFX helpers ──────────────────────────────────────────
  function playTick()  { SFX.play('loot_tick');  }
  function playSlow()  { SFX.play('loot_slow');  }
  function playLand()  { SFX.play('loot_land');  }
  function playRarity(r) {
    if (r==='rare')     SFX.play('loot_rare');
    else if (r==='uncommon') SFX.play('loot_uncommon');
    else                SFX.play('loot_common');
  }

  // ── STRIP ANIMATION ──────────────────────────────────────
  const ITEM_W = 128; // px
  const WIN_IDX = 45;
  const CENTER_OFFSET = 3; // items to left of center viewport

  function makeItemEl(item) {
    const rar = RARITIES[item.rarity] || RARITIES.common;
    const el = document.createElement('div');
    el.className = 'lb-item';
    el.style.cssText = `background:${rar.bg};border-color:${rar.color};`;
    el.innerHTML = `
      <div class="lb-item-icon" style="color:${rar.color}">${item.icon||'◈'}</div>
      <div class="lb-item-label" style="color:${rar.color}">${item.label}</div>
      <div class="lb-item-rarity" style="color:${rar.color}88">${rar.label}</div>`;
    return el;
  }

  function runAnimation(track, winner, onDone) {
    const strip = buildStrip(winner);
    track.innerHTML = '';
    strip.forEach(item => track.appendChild(makeItemEl(item)));

    // Item effective width = ITEM_W + 6px margin (3px each side)
    const SLOT = ITEM_W + 6;

    // Center the winner item exactly under the center line.
    // Viewport width ≈ min(560,96vw). We measure it from the parent.
    const vpW = track.parentElement ? track.parentElement.offsetWidth : 520;
    // finalScroll: scroll so that center of WIN_IDX item aligns with viewport center
    const finalScroll = WIN_IDX * SLOT + SLOT / 2 - vpW / 2;

    // Reset to start
    track.style.transition = 'none';
    track.style.transform  = 'translateX(0px)';
    void track.offsetWidth;

    // TOTAL duration ~4s — single WAAPI call, no phase switching
    const TOTAL = 4200;

    // Custom deceleration easing: starts very fast, then glides to a stop
    // cubic-bezier(0.12, 0.8, 0.25, 1.0) — strong initial velocity, smooth landing
    const anim = track.animate(
      [
        { transform: 'translateX(0px)',              easing: 'cubic-bezier(0.15,0.0,0.1,1.0)' },
        { transform: `translateX(-${finalScroll}px)` },
      ],
      { duration: TOTAL, fill: 'forwards' }
    );

    // Tick sounds: fast at start, slow toward end
    let tickInterval = 55;
    let tickTimer = setInterval(playTick, tickInterval);

    // Gradually slow tick rate over time
    const tickSchedule = [
      { at: 1200, rate: 90,  fn: playTick },
      { at: 2000, rate: 150, fn: playSlow },
      { at: 2900, rate: 280, fn: playSlow },
      { at: 3600, rate: 500, fn: playSlow },
    ];
    tickSchedule.forEach(({ at, rate, fn }) => {
      setTimeout(() => {
        clearInterval(tickTimer);
        tickTimer = setInterval(fn, rate);
      }, at);
    });

    anim.onfinish = () => {
      clearInterval(tickTimer);
      // Commit final position as a style so it doesn't snap back
      track.style.transform = `translateX(-${finalScroll}px)`;
      anim.cancel();

      // Highlight winner item
      const items = track.querySelectorAll('.lb-item');
      const winEl = items[WIN_IDX];
      if (winEl) {
        const rar = RARITIES[winner.rarity] || RARITIES.common;
        winEl.classList.add('lb-winner-glow');
        winEl.style.setProperty('--win-color', rar.glow);
      }

      playLand();
      playRarity(winner.rarity);
      setTimeout(() => onDone && onDone(winner), 700);
    };
  }

  // ── TIMER DISPLAY ────────────────────────────────────────
  let _timerInterval = null;
  function startTimer(btn, timerEl) {
    clearInterval(_timerInterval);
    _timerInterval = setInterval(() => {
      const ms = getMsRemain();
      if (ms <= 0) {
        clearInterval(_timerInterval);
        btn.disabled = false;
        btn.classList.add('lb-ready');
        btn.innerHTML = '🎁 OPEN LOOT BOX';
        if (timerEl) timerEl.textContent = 'READY';
      } else {
        const m = Math.floor(ms/60000);
        const s = Math.floor((ms%60000)/1000);
        if (timerEl) timerEl.textContent = `Next in ${m}m ${s.toString().padStart(2,'0')}s`;
      }
    }, 500);
  }

  // ── PUBLIC INIT ──────────────────────────────────────────
  function init() {
    const btn     = document.getElementById('lb-open-btn');
    const timerEl = document.getElementById('lb-timer');
    const modal   = document.getElementById('lb-modal');
    const closeBtn= document.getElementById('lb-close');
    const track   = document.getElementById('lb-track');
    const rewardBox = document.getElementById('lb-reward-box');
    const rewardText = document.getElementById('lb-reward-text');

    if (!btn || !modal || !track) {
      console.warn('LootBox: missing DOM elements', {btn,modal,track});
      return;
    }

    // Set initial state
    if (getMsRemain() <= 0) {
      btn.disabled = false;
      btn.classList.add('lb-ready');
      btn.innerHTML = '🎁 OPEN LOOT BOX';
      if (timerEl) timerEl.textContent = 'READY';
    } else {
      btn.disabled = false; // allow click, guard inside handler
      btn.classList.remove('lb-ready');
    }
    startTimer(btn, timerEl);

    btn.addEventListener('click', () => {
      if (getMsRemain() > 0) return;

      setLastOpen();
      btn.disabled = true;
      btn.classList.remove('lb-ready');
      startTimer(btn, timerEl);

      // Open modal
      rewardBox.style.display = 'none';
      rewardText.innerHTML    = '';
      modal.style.display     = 'flex';
      void modal.offsetWidth;
      modal.classList.add('lb-modal-in');

      const winner = roll();

      runAnimation(track, winner, (w) => {
        applyReward(w);
        if (typeof UI !== 'undefined') UI.updateMainMenuStats();

        const rar = RARITIES[w.rarity] || RARITIES.common;
        rewardBox.style.display  = 'block';
        rewardBox.style.cssText  = `display:block;background:${rar.bg};border:1px solid ${rar.color};box-shadow:0 0 40px ${rar.glow}66,0 0 80px ${rar.glow}22;`;
        rewardText.innerHTML = `
          <div class="lb-reward-icon" style="color:${rar.color};text-shadow:0 0 20px ${rar.glow}">${w.icon||'◈'}</div>
          <div class="lb-reward-label" style="color:${rar.color}">${w.label}</div>
          <div class="lb-reward-desc">${w.desc||''}</div>
          <div class="lb-reward-rarity" style="color:${rar.color};text-shadow:0 0 10px ${rar.glow}">${rar.label}</div>`;
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('lb-modal-in');
        setTimeout(() => { modal.style.display='none'; }, 220);
      });
    }
  }

  return { init };
})();
