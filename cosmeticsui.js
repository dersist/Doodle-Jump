// ═══════════════════════════════════════════════════════════════
//  COSMETICSUI.JS — Cosmetics screen: Shop, Wardrobe, Preview
// ═══════════════════════════════════════════════════════════════
const CosmeticsUI = (() => {
  let frame = 0;
  let previewCanvas = null;
  let previewCtx = null;
  let previewAnim = null;

  function init() {
    const backBtn = document.getElementById('cosmetics-back');
    if (backBtn) backBtn.addEventListener('click', () => UI.showScreen('main-menu'));

    // Tab switching
    ['shop','wardrobe'].forEach(tab => {
      document.getElementById(`ctab-${tab}`)?.addEventListener('click', () => switchTab(tab));
    });

    // Preview canvas
    previewCanvas = document.getElementById('cosmetics-preview');
    if (previewCanvas) previewCtx = previewCanvas.getContext('2d');

    switchTab('shop');
    startPreview();
  }

  function switchTab(tab) {
    ['shop','wardrobe'].forEach(t => {
      document.getElementById(`ctab-${t}`)?.classList.toggle('active', t === tab);
      const panel = document.getElementById(`cpanel-${t}`);
      if (panel) panel.style.display = t === tab ? 'block' : 'none';
    });
    if (tab === 'shop') renderShop();
    if (tab === 'wardrobe') renderWardrobe();
  }

  function renderShop() {
    const container = document.getElementById('cpanel-shop');
    if (!container) return;
    const items = Cosmetics.getAllItems();
    const owned = Cosmetics.getOwned();

    let html = '';
    for (const [cat, list] of Object.entries(items)) {
      const catLabel = { skins:'🎨 PLAYER SKINS', trails:'💫 JUMP TRAILS', particles:'✨ BOUNCE PARTICLES' }[cat] || cat;
      html += `<div class="cshop-section"><div class="cshop-cat">${catLabel}</div><div class="cshop-grid">`;
      for (const item of list) {
        const isOwned = owned.includes(item.id);
        const equipped = Cosmetics.getEquipped();
        const isEquipped = Object.values(equipped).includes(item.id);
        html += `<div class="cshop-item ${isOwned?'owned':''} ${isEquipped?'equipped':''}" data-id="${item.id}">
          <div class="cshop-preview">${previewIcon(item)}</div>
          <div class="cshop-name">${item.name}</div>
          <div class="cshop-price">${isOwned ? (isEquipped ? '✓ EQUIPPED' : '✓ OWNED') : `◈ ${item.price}`}</div>
          <button class="cshop-btn" data-id="${item.id}" data-owned="${isOwned}">${isOwned ? (isEquipped ? 'EQUIPPED' : 'EQUIP') : 'BUY'}</button>
        </div>`;
      }
      html += '</div></div>';
    }
    container.innerHTML = html;

    container.querySelectorAll('.cshop-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const isOwned = btn.dataset.owned === 'true';
        if (isOwned) {
          Cosmetics.equip(id);
          renderShop();
        } else {
          if (Cosmetics.purchase(id)) renderShop();
        }
        UI.updateMainMenuStats();
      });
    });
  }

  function renderWardrobe() {
    const container = document.getElementById('cpanel-wardrobe');
    if (!container) return;
    const owned = Cosmetics.getOwned();
    const equipped = Cosmetics.getEquipped();
    const items = Cosmetics.getAllItems();

    let html = '<div class="wardrobe-info">Your equipped cosmetics. Click any item in the Shop tab to swap.</div>';
    html += '<div class="wardrobe-grid">';
    for (const [cat, list] of Object.entries(items)) {
      const catLabel = { skins:'Skin', trails:'Trail', particles:'Particles' }[cat];
      const equippedId = equipped[cat.replace('s','')];
      const item = list.find(i => i.id === equippedId) || list[0];
      html += `<div class="wardrobe-slot">
        <div class="wardrobe-cat">${catLabel}</div>
        <div class="wardrobe-icon">${previewIcon(item)}</div>
        <div class="wardrobe-name">${item.name}</div>
      </div>`;
    }
    html += '</div>';

    // ── ASCENSION SECTION ──────────────────────────────────
    html += '<div class="wardrobe-section-title">✨ ASCENSION</div>';

    // Progress tracker
    const aLvl    = Prestige.getLevel();
    const aTotal  = GameState.totalHeightJumped || 0;
    const aNeeded = Prestige.getNextHeight();
    const aPct    = aLvl >= 10 ? 100 : Math.min(100, (aTotal / aNeeded) * 100);
    const aCanAsc = Prestige.canAscend();

    html += `<div class="asc-ward-tracker">
      <div class="asc-ward-row">
        <span class="asc-ward-label">Level</span>
        <span class="asc-ward-val">${aLvl} / 10</span>
      </div>
      <div class="asc-ward-row">
        <span class="asc-ward-label">Total Height</span>
        <span class="asc-ward-val">${aTotal.toLocaleString()}</span>
      </div>
      ${aLvl < 10 ? `<div class="asc-ward-row">
        <span class="asc-ward-label">Next Ascension</span>
        <span class="asc-ward-val">${aNeeded.toLocaleString()}</span>
      </div>
      <div class="asc-ward-bar"><div class="asc-ward-fill" style="width:${aPct.toFixed(1)}%"></div></div>
      <div class="asc-ward-pct">${aPct.toFixed(1)}% toward next ascension</div>` : '<div class="asc-ward-max">✨ MAX ASCENSION REACHED</div>'}
      ${aCanAsc ? `<button class="btn-ascend-ward" onclick="if(typeof Prestige!=='undefined'){Prestige.ascend();setTimeout(()=>{if(typeof CosmeticsUI!=='undefined')CosmeticsUI.renderWardrobe();},500);}">✨ ASCEND NOW</button>` : ''}
      <div class="asc-ward-reset-note">⚠ Ascending resets all progress except cosmetics, passives &amp; settings</div>
    </div>`;

    // Passives accordion
    html += '<div class="wardrobe-section-title" style="margin-top:16px">ASCENSION PASSIVES</div>';
    html += '<div class="asc-passives-acc">';
    const unlocked = Prestige.getUnlocked();
    const all = Prestige.getPassiveList();
    for (const p of all) {
      const active = unlocked.includes(p.id);
      const accId = 'ap_' + p.id;
      html += `<div class="ap-item ${active?'ap-active':'ap-locked'}" id="${accId}">
        <div class="ap-header" onclick="document.getElementById('${accId}').classList.toggle('open')">
          <div class="ap-left">
            <span class="ap-icon">${p.icon}</span>
            <span class="ap-name">${p.name}</span>
            ${active ? '<span class="ap-badge">ACTIVE</span>' : '<span class="ap-badge ap-locked-badge">LOCKED</span>'}
          </div>
          <span class="ap-arrow">▾</span>
        </div>
        <div class="ap-body">
          <div class="ap-desc">${p.desc}</div>
          <div class="ap-unlock">${active ? '✅ Unlocked at Ascension Level ' + (all.indexOf(p)+1) : '🔒 Requires Ascension Level ' + (all.indexOf(p)+1)}</div>
        </div>
      </div>`;
    }
    html += '</div>';

    // Mastery — expandable accordion
    html += '<div class="wardrobe-section-title">ABILITY MASTERY</div>';
    html += '<div class="wardrobe-mastery-acc">';
    const abilityIds = ['rocket_surge','phase_dash','gravity_flip','energy_shield','pulse_slam',
                        'drone','time_distort','platform_forge','chaos_engine','overdrive'];
    const names = { rocket_surge:'🚀 Rocket Surge', phase_dash:'👻 Phase Dash', gravity_flip:'🔄 Gravity Flip',
                    energy_shield:'🛡️ Energy Shield', pulse_slam:'⬇️ Pulse Slam', drone:'🤖 Drone',
                    time_distort:'⏱️ Time Distort', platform_forge:'🔧 Platform Forge',
                    chaos_engine:'🎲 Chaos Engine', overdrive:'⚡ Overdrive' };
    for (const id of abilityIds) {
      const stars  = Mastery.getStars(id);
      const uses   = Mastery.getUses(id);
      const next   = Mastery.getNextThreshold(id);
      const pct    = next ? Math.min(100, (uses / next) * 100) : 100;
      const passives = Mastery.getPassives(id);
      const accId  = 'macc_' + id;

      html += `<div class="macc-item" id="${accId}">
        <div class="macc-header" onclick="document.getElementById('${accId}').classList.toggle('open')">
          <div class="macc-left">
            <span class="macc-name">${names[id]||id}</span>
            <span class="macc-stars">${'⭐'.repeat(stars)}${'☆'.repeat(5-stars)}</span>
          </div>
          <div class="macc-right">
            <div class="macc-bar-wrap"><div class="macc-bar"><div class="macc-fill" style="width:${pct.toFixed(0)}%"></div></div></div>
            <span class="macc-uses">${uses}${next?'/'+next:' MAX'}</span>
            <span class="macc-arrow">▾</span>
          </div>
        </div>
        <div class="macc-body">
          ${passives.map(p => {
            const ul = stars >= p.stars;
            return `<div class="macc-passive ${ul?'unlocked':'locked-passive'}">
              <span class="mp-icon">${p.icon}</span>
              <span class="mp-stars">${'⭐'.repeat(p.stars)}</span>
              <span class="mp-desc">${p.desc}</span>
              ${ul ? '<span class="mp-active">ACTIVE</span>' : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
    html += '</div>';

    container.innerHTML = html;
  }

  function previewIcon(item) {
    if (item.id && item.id.startsWith('skin_')) {
      const c = Array.isArray(item.colors) ? item.colors[0] : '#00f5ff';
      return `<div style="width:28px;height:28px;border-radius:6px;background:${c};box-shadow:0 0 8px ${item.glow||c};margin:auto"></div>`;
    }
    if (item.id && item.id.startsWith('trail_')) {
      if (!item.color) return '<span style="opacity:0.3">—</span>';
      return `<div style="width:6px;height:28px;background:linear-gradient(${item.color==='rainbow'?'red,yellow,green,blue':item.color+',transparent'});margin:auto;border-radius:3px"></div>`;
    }
    if (item.id && item.id.startsWith('part_')) {
      return `<div style="width:20px;height:20px;border-radius:50%;background:${item.color==='rainbow'?'conic-gradient(red,yellow,green,blue,red)':item.color};margin:auto;box-shadow:0 0 6px ${item.color}"></div>`;
    }
    return '?';
  }

  // ── MINI PHYSICS PREVIEW ─────────────────────────────────
  let pvY = 0, pvVY = 0, pvTrail = [], pvParticles = [];
  const PV_GRAVITY = 0.45;
  const PV_JUMP    = -10;
  const PV_PLAT_Y  = 0.75; // fraction of canvas height

  function doPreviewJump() {
    pvVY = PV_JUMP;
    // Bounce particles
    const bCol = Cosmetics.getBounceColor(Date.now()/16|0) || '#00f5ff';
    for (let i = 0; i < 10; i++) {
      const ang = Math.PI + (Math.random() - 0.5) * Math.PI;
      pvParticles.push({
        x: previewCanvas.width / 2 + (Math.random()-0.5)*20,
        y: previewCanvas.height * PV_PLAT_Y,
        vx: Math.cos(ang) * (1 + Math.random() * 2),
        vy: Math.sin(ang) * (1 + Math.random() * 3) - 2,
        life: 1, color: bCol,
      });
    }
  }

  function startPreview() {
    if (!previewCanvas || !previewCtx) return;
    pvY = 0; pvVY = 0; pvTrail = []; pvParticles = [];

    // W and Up arrow trigger mini jump
    const keyHandler = (e) => {
      if ((e.code === 'KeyW' || e.code === 'ArrowUp') && pvVY >= 0) doPreviewJump();
    };
    document.addEventListener('keydown', keyHandler);
    // Store handler ref so we can remove it when screen changes
    previewCanvas._keyHandler = keyHandler;

    let t = 0;
    function draw() {
      previewAnim = requestAnimationFrame(draw);
      t++;

      const ctx = previewCtx;
      const W = previewCanvas.width, H = previewCanvas.height;
      const platY = H * PV_PLAT_Y;

      // ── Physics ──
      pvVY += PV_GRAVITY;
      pvY  += pvVY;

      // Land
      if (pvY >= 0) {
        pvY  = 0;
        if (pvVY > 2) doPreviewJump(); // auto-bounce on land
        pvVY = 0;
      }

      const drawY = platY - 28 + pvY; // player top

      // Trail record
      pvTrail.unshift({ x: W/2, y: drawY + 14 });
      if (pvTrail.length > 14) pvTrail.pop();

      // Particle physics
      for (const p of pvParticles) {
        p.x  += p.vx; p.y += p.vy;
        p.vy += 0.12;
        p.life -= 0.04;
      }
      pvParticles = pvParticles.filter(p => p.life > 0);

      // ── Draw ──
      ctx.clearRect(0, 0, W, H);

      // BG
      const bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#060d18'); bg.addColorStop(1,'#0a1530');
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

      // Platform
      ctx.fillStyle='#00f5ff22'; ctx.strokeStyle='#00f5ff'; ctx.lineWidth=2;
      ctx.shadowColor='#00f5ff'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.roundRect(W/2-35, platY, 70, 10, 3);
      ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;

      // Jump hint label (if player hasn't jumped yet)
      if (pvTrail.length < 3 || pvVY >= 0) {
        ctx.globalAlpha = 0.5 + Math.sin(t*0.1)*0.3;
        ctx.fillStyle='#00f5ff';
        ctx.font = '9px monospace';
        ctx.textAlign='center';
        ctx.fillText('W / ↑ to jump', W/2, H-6);
        ctx.globalAlpha=1;
      }

      // Trail
      const trailColor = Cosmetics.getTrailColor(t);
      if (trailColor && pvTrail.length > 1) {
        for (let i = 1; i < pvTrail.length; i++) {
          const pt = pvTrail[i];
          ctx.globalAlpha = (1 - i/pvTrail.length) * 0.7;
          ctx.fillStyle = trailColor;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(1,(7*(1-i/pvTrail.length))), 0, Math.PI*2);
          ctx.fill();
        }
        ctx.globalAlpha=1;
      }

      // Bounce particles
      for (const p of pvParticles) {
        ctx.globalAlpha = p.life * 0.9;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3*p.life, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur=0;
      }
      ctx.globalAlpha=1;

      // Player
      const colors = Cosmetics.getBodyColors(t);
      const glow   = Cosmetics.getGlow();
      const cx = W/2, cy = drawY + 14;
      ctx.shadowColor=glow; ctx.shadowBlur=12+Math.sin(t*0.08)*4;
      const grad = ctx.createRadialGradient(cx, cy-4, 2, cx, cy, 13);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(0.6, colors[1]);
      grad.addColorStop(1, colors[2]);
      ctx.fillStyle=grad;
      ctx.beginPath(); ctx.roundRect(cx-11, drawY+6, 22, 20, 5); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, drawY+8, 10, 11, 0, Math.PI, 0); ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle=`${colors[0]}99`;
      ctx.beginPath(); ctx.ellipse(cx+2, drawY+8, 6,6,0,0,Math.PI*2); ctx.fill();
    }
    draw();
  }

  return { init, renderWardrobe };
})();
