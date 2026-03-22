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

    // Prestige passives
    html += '<div class="wardrobe-section-title">ASCENSION PASSIVES</div>';
    html += '<div class="wardrobe-passives">';
    const unlocked = Prestige.getUnlocked();
    const all = Prestige.getPassiveList();
    for (const p of all) {
      const active = unlocked.includes(p.id);
      html += `<div class="passive-badge ${active?'active':'locked'}">
        ${p.icon} <span>${p.name}</span>${active ? '' : ' 🔒'}
      </div>`;
    }
    html += '</div>';

    // Mastery stars
    html += '<div class="wardrobe-section-title">ABILITY MASTERY</div>';
    html += '<div class="wardrobe-mastery">';
    const abilityIds = ['rocket_surge','phase_dash','gravity_flip','energy_shield','pulse_slam',
                        'drone','time_distort','platform_forge','chaos_engine','overdrive'];
    const names = { rocket_surge:'Rocket',phase_dash:'Phase',gravity_flip:'Flip',energy_shield:'Shield',
                    pulse_slam:'Slam',drone:'Drone',time_distort:'Time',platform_forge:'Forge',
                    chaos_engine:'Chaos',overdrive:'Overdrive' };
    for (const id of abilityIds) {
      const stars = Mastery.getStars(id);
      const uses  = Mastery.getUses(id);
      const next  = Mastery.getNextThreshold(id);
      const pct   = next ? Math.min(100, (uses / next) * 100) : 100;
      html += `<div class="mastery-row">
        <div class="mastery-name">${names[id]||id}</div>
        <div class="mastery-stars">${'⭐'.repeat(stars)}${'☆'.repeat(5-stars)}</div>
        <div class="mastery-bar"><div class="mastery-fill" style="width:${pct.toFixed(0)}%"></div></div>
        <div class="mastery-uses">${uses}${next ? '/' + next : ' MAX'}</div>
      </div>`;
    }
    html += '</div>';

    // Daily challenges
    html += '<div class="wardrobe-section-title">DAILY CHALLENGES</div>';
    html += '<div class="wardrobe-dailies">';
    const chs = DailyChallenge.getChallenges();
    for (const ch of chs) {
      const pct = ch.target > 0 ? Math.min(100, ((ch.progress||0) / ch.target) * 100) : 0;
      html += `<div class="daily-row ${ch.completed ? 'done' : ''}">
        <div class="daily-desc">${ch.desc}</div>
        <div class="daily-reward">+${ch.reward}◈</div>
        <div class="daily-bar"><div class="daily-fill" style="width:${pct.toFixed(0)}%"></div></div>
        <div class="daily-prog">${ch.completed ? '✅ DONE' : `${ch.progress||0}/${ch.target}`}</div>
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

  function startPreview() {
    if (!previewCanvas || !previewCtx) return;
    let t = 0;
    function draw() {
      previewAnim = requestAnimationFrame(draw);
      t++;
      const ctx = previewCtx;
      const W = previewCanvas.width, H = previewCanvas.height;
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#060d18');
      bg.addColorStop(1, '#0a1530');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Animated platform
      const platY = H * 0.72;
      ctx.fillStyle = '#00f5ff22';
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(W/2 - 35, platY, 70, 10, 3);
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      // Trail
      const trailColor = Cosmetics.getTrailColor(t);
      if (trailColor) {
        for (let i = 0; i < 6; i++) {
          const alpha = (1 - i/6) * 0.5;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = trailColor;
          ctx.beginPath();
          ctx.arc(W/2, platY - 30 - i * 8, 6 - i, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Player body
      const colors = Cosmetics.getBodyColors(t);
      const glow   = Cosmetics.getGlow();
      const py = platY - 36;

      ctx.shadowColor = glow;
      ctx.shadowBlur = 12 + Math.sin(t * 0.08) * 4;

      const grad = ctx.createRadialGradient(W/2, py + 10, 2, W/2, py + 14, 16);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(0.6, colors[1]);
      grad.addColorStop(1, colors[2]);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(W/2 - 12, py + 6, 24, 22, 5);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(W/2, py + 8, 11, 12, 0, Math.PI, 0);
      ctx.fill();

      // Visor
      ctx.shadowBlur = 0;
      ctx.fillStyle = `${colors[0]}99`;
      ctx.beginPath();
      ctx.ellipse(W/2 + 2, py + 8, 7, 7, 0, 0, Math.PI*2);
      ctx.fill();

      ctx.shadowBlur = 0;
    }
    draw();
  }

  return { init, renderWardrobe };
})();
