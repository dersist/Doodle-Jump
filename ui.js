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
        const amount = Math.ceil(1 * (1 + PlayerUpgrades.getCurrencyBoost()));
        GameState.coins += amount;
        GameState.totalCoins += amount;
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
    GameState.settings = { sfx: true, shake: true, scanlines: true };
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

  function showGameOver(score, coinsEarned) {
    document.getElementById('go-score').textContent = Math.floor(score);
    document.getElementById('go-coins').textContent = coinsEarned;
    document.getElementById('go-time').textContent = getElapsedFormatted();
    const best = Math.floor(GameState.bestScore);
    document.getElementById('go-best').textContent = best;

    const bestEl = document.getElementById('go-best');
    if (score >= GameState.bestScore) {
      bestEl.style.color = 'var(--neon-yellow)';
    }

    showScreen('gameover-screen');
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

    const toggleSfx = document.getElementById('toggle-sfx');
    const toggleShake = document.getElementById('toggle-shake');
    const toggleScanlines = document.getElementById('toggle-scanlines');
    const resetBtn = document.getElementById('btn-reset');

    function updateToggle(btn, key) {
      const on = GameState.settings[key];
      btn.textContent = on ? 'ON' : 'OFF';
      btn.dataset.on = on ? 'true' : 'false';
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
        const sl = document.querySelector('.scanlines');
        if (sl) sl.style.display = GameState.settings.scanlines ? 'block' : 'none';
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
    updateSpeedrunTimer, toggleSpeedrunTimer, resetSpeedrunTimer, getElapsedSeconds, getElapsedFormatted,
    showGameOver, updateMainMenuStats, initAbilityEquipScreen, renderEquipScreen, initSettings,
  };
})();
