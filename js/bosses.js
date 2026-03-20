// ═══════════════════════════════════════════
//  BOSSES.JS — Boss fights
// ═══════════════════════════════════════════

const Bosses = (() => {
  let currentBoss = null;
  let bossActive = false;

  const BOSS_TYPES = {
    SKY_SERPENT:    'sky_serpent',
    TITAN_PLATFORM: 'titan_platform',
    VOID_CORE:      'void_core',
  };

  // Boss unlocks at score thresholds
  const BOSS_THRESHOLDS = [800, 1800, 3000];

  let nextBossIdx = 0;
  let bossDefeated = [false, false, false];

  function init() {
    currentBoss = null;
    bossActive = false;
    nextBossIdx = 0;
  }

  function checkSpawn(score) {
    if (bossActive) return;
    if (nextBossIdx >= BOSS_THRESHOLDS.length) return;
    if (bossDefeated[nextBossIdx]) { nextBossIdx++; return; }
    if (score >= BOSS_THRESHOLDS[nextBossIdx]) {
      spawnBoss(nextBossIdx);
    }
  }

  function spawnBoss(idx) {
    const type = [BOSS_TYPES.SKY_SERPENT, BOSS_TYPES.TITAN_PLATFORM, BOSS_TYPES.VOID_CORE][idx];
    bossActive = true;

    const canvasW = GameState.canvasW;
    const cameraY = GameState.cameraY;

    // Announce boss
    UI.showBossAnnounce(['SKY SERPENT', 'TITAN PLATFORM', 'VOID CORE'][idx]);
    SFX.play('boss_spawn');
    GameState.screenShake = 15;

    switch (type) {
      case BOSS_TYPES.SKY_SERPENT:
        currentBoss = {
          type, idx,
          x: canvasW / 2, y: cameraY - 80,
          w: 80, h: 50,
          health: 30, maxHealth: 30,
          phase: 0,
          vx: 4, vy: 1,
          diveTimer: 0, diveInterval: 200,
          shootTimer: 0, shootInterval: 60,
          angleOff: 0,
          aggression: 1,
          hitFlash: 0,
          // Segments
          segments: Array.from({length: 8}, (_, i) => ({
            x: canvasW / 2 - i * 25, y: cameraY - 80,
            angle: 0,
          })),
          dead: false,
        };
        break;

      case BOSS_TYPES.TITAN_PLATFORM:
        currentBoss = {
          type, idx,
          x: canvasW / 2 - 120, y: cameraY + 200,
          w: 240, h: 30,
          health: 40, maxHealth: 40,
          tilt: 0, tiltDir: 1, tiltMax: 0.3,
          shakeX: 0, shakeY: 0,
          phase: 0,
          collapseSegments: Array.from({length: 6}, (_, i) => ({ alive: true, timer: 0, offset: i * 40 })),
          hitFlash: 0,
          dead: false,
          projectileTimer: 0,
        };
        break;

      case BOSS_TYPES.VOID_CORE:
        currentBoss = {
          type, idx,
          x: canvasW / 2, y: cameraY + 120,
          w: 60, h: 60,
          health: 50, maxHealth: 50,
          phase: 0,
          orbitAngle: 0,
          teleportTimer: 0,
          pullTimer: 0,
          chaosTimer: 0,
          hitFlash: 0,
          dead: false,
          pullZones: [],
          orbs: Array.from({length: 4}, (_, i) => ({
            angle: (i / 4) * Math.PI * 2, radius: 80,
            x: 0, y: 0,
          })),
        };
        break;
    }
  }

  function update(dt, player) {
    if (!currentBoss || currentBoss.dead) return;

    const boss = currentBoss;
    const canvasW = GameState.canvasW;
    const cameraY = GameState.cameraY;
    const px = player.x + player.w/2;
    const py = player.y + player.h/2;

    // Scale aggression with missing health
    const hpRatio = boss.health / boss.maxHealth;
    const aggression = 1 + (1 - hpRatio) * 2;

    if (boss.hitFlash > 0) boss.hitFlash--;

    switch (boss.type) {
      case BOSS_TYPES.SKY_SERPENT:
        updateSerpent(boss, dt, px, py, canvasW, cameraY, aggression);
        break;
      case BOSS_TYPES.TITAN_PLATFORM:
        updateTitan(boss, dt, px, py, canvasW, cameraY, aggression);
        break;
      case BOSS_TYPES.VOID_CORE:
        updateVoidCore(boss, dt, px, py, canvasW, cameraY, aggression);
        break;
    }

    // Check player collision with boss
    if (!player.shielded && !player.invincible) {
      const overlap = Physics.aabbOverlap(
        player.x + 4, player.y + 4, player.w - 8, player.h - 8,
        boss.x - boss.w/2, boss.y - boss.h/2, boss.w, boss.h
      );
      if (overlap) {
        Player.takeDamage(1);
      }
    }
  }

  function updateSerpent(boss, dt, px, py, canvasW, cameraY, aggression) {
    // Aerial movement
    boss.x += boss.vx * aggression * 0.7;
    boss.y += Math.sin(boss.angleOff) * 1.5;
    boss.angleOff += 0.04;

    if (boss.x < 40 || boss.x > canvasW - 40) boss.vx *= -1;

    // Keep near camera top
    const targetY = cameraY + 80;
    boss.y += (targetY - boss.y) * 0.02;

    // Update segments (follow head)
    boss.segments[0].x = boss.x;
    boss.segments[0].y = boss.y;
    for (let i = 1; i < boss.segments.length; i++) {
      const prev = boss.segments[i - 1];
      const seg = boss.segments[i];
      const dx = prev.x - seg.x;
      const dy = prev.y - seg.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 22) {
        seg.x += (dx / dist) * (dist - 22);
        seg.y += (dy / dist) * (dist - 22);
      }
    }

    // Dive attack
    boss.diveTimer += dt;
    if (boss.diveTimer >= boss.diveInterval / aggression) {
      boss.diveTimer = 0;
      boss.vy = 8 * aggression;
      SFX.play('boss_attack');
    }
    boss.y += boss.vy;
    boss.vy *= 0.92;

    // Shoot projectiles
    boss.shootTimer += dt;
    if (boss.shootTimer >= boss.shootInterval / aggression) {
      boss.shootTimer = 0;
      const dx = px - boss.x;
      const dy = py - boss.y;
      const dist = Math.hypot(dx, dy);
      Projectiles.addEnemyBullet(boss.x, boss.y, (dx/dist)*5, (dy/dist)*5, 1);
      // Spread shots at higher aggression
      if (aggression > 2) {
        const angle = Math.atan2(dy, dx);
        for (const spread of [-0.3, 0.3]) {
          Projectiles.addEnemyBullet(boss.x, boss.y,
            Math.cos(angle + spread) * 5,
            Math.sin(angle + spread) * 5, 1);
        }
      }
    }
  }

  function updateTitan(boss, dt, px, py, canvasW, cameraY, aggression) {
    // Tilt based on player position
    const targetTilt = ((px - canvasW / 2) / (canvasW / 2)) * boss.tiltMax * aggression;
    boss.tilt += (targetTilt - boss.tilt) * 0.05;

    // Shake
    boss.shakeX = (Math.random() - 0.5) * 3 * aggression;
    boss.shakeY = (Math.random() - 0.5) * 2;

    // Follow player vertically (slowly)
    const targetY = GameState.cameraY + 300;
    boss.y += (targetY - boss.y) * 0.02;
    boss.x = canvasW / 2 - boss.w / 2;

    // Collapse segments
    for (const seg of boss.collapseSegments) {
      if (!seg.alive) continue;
      if (boss.health < boss.maxHealth * 0.5) {
        seg.timer += dt;
        if (seg.timer > 120 + Math.random() * 80) {
          seg.alive = false;
          SFX.play('break');
        }
      }
    }

    // Fire projectiles upward
    boss.projectileTimer += dt;
    if (boss.projectileTimer >= 90 / aggression) {
      boss.projectileTimer = 0;
      Projectiles.addEnemyBullet(boss.x + Math.random() * boss.w, boss.y, 0, -6, 1);
    }
  }

  function updateVoidCore(boss, dt, px, py, canvasW, cameraY, aggression) {
    boss.orbitAngle += 0.02 * aggression;

    // Teleport
    boss.teleportTimer += dt;
    if (boss.teleportTimer >= 180 / aggression) {
      boss.teleportTimer = 0;
      boss.x = canvasW * 0.2 + Math.random() * canvasW * 0.6;
      boss.y = cameraY + 100 + Math.random() * 200;
      Particles.burst(boss.x, boss.y - cameraY, '#9900ff', 20);
      SFX.play('teleport');
    }

    // Update orbiting orbs
    for (let i = 0; i < boss.orbs.length; i++) {
      const orb = boss.orbs[i];
      orb.angle = boss.orbitAngle + (i / boss.orbs.length) * Math.PI * 2;
      orb.x = boss.x + Math.cos(orb.angle) * orb.radius;
      orb.y = boss.y + Math.sin(orb.angle) * orb.radius;

      // Orbs fire at player
      if (Math.random() < 0.005 * aggression) {
        const dx = px - orb.x;
        const dy = py - orb.y;
        const dist = Math.hypot(dx, dy);
        Projectiles.addEnemyBullet(orb.x, orb.y, (dx/dist)*4, (dy/dist)*4, 1);
      }
    }

    // Gravity pull zones
    boss.pullTimer += dt;
    if (boss.pullTimer >= 120) {
      boss.pullTimer = 0;
      // Pull player toward boss
      const dx = boss.x - px;
      const dy = boss.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist < 300) {
        const force = (1 - dist / 300) * 3 * aggression;
        GameState.player.vx += (dx / dist) * force;
        GameState.player.vy += (dy / dist) * force;
      }
    }
  }

  function draw(ctx, cameraY) {
    if (!currentBoss || currentBoss.dead) return;
    const boss = currentBoss;
    const alpha = boss.hitFlash > 0 ? 0.6 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    switch (boss.type) {
      case BOSS_TYPES.SKY_SERPENT:  drawSerpent(ctx, boss, cameraY); break;
      case BOSS_TYPES.TITAN_PLATFORM: drawTitan(ctx, boss, cameraY); break;
      case BOSS_TYPES.VOID_CORE:    drawVoidCore(ctx, boss, cameraY); break;
    }

    // Boss health bar
    drawBossHealthBar(ctx, boss);
    ctx.restore();
  }

  function drawSerpent(ctx, boss, cameraY) {
    // Draw segments
    for (let i = boss.segments.length - 1; i >= 0; i--) {
      const seg = boss.segments[i];
      const r = 16 - i * 1.2;
      const alpha2 = 1 - i * 0.07;
      ctx.save();
      ctx.globalAlpha = alpha2;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 15;
      ctx.fillStyle = i === 0 ? '#1a3a1a' : '#0a2a0a';
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y - cameraY, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // Head eyes
    ctx.save();
    ctx.fillStyle = '#ff0080';
    ctx.shadowColor = '#ff0080'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(boss.x - 8, boss.y - cameraY - 5, 5, 0, Math.PI * 2);
    ctx.arc(boss.x + 8, boss.y - cameraY - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTitan(ctx, boss, cameraY) {
    const drawY = boss.y - cameraY + boss.shakeY;
    const drawX = boss.x + boss.shakeX;
    const cx = drawX + boss.w / 2;
    const cy = drawY + boss.h / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(boss.tilt);

    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#1a0800';
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 2;

    // Main platform
    ctx.fillRect(-boss.w/2, -boss.h/2, boss.w, boss.h);
    ctx.strokeRect(-boss.w/2, -boss.h/2, boss.w, boss.h);

    // Collapse segments
    for (const seg of boss.collapseSegments) {
      if (!seg.alive) {
        ctx.fillStyle = 'rgba(255,100,0,0.2)';
        ctx.fillRect(-boss.w/2 + seg.offset, -boss.h/2, 40, boss.h);
      }
    }

    // Danger markings
    ctx.fillStyle = '#ff6600';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ TITAN ⚠', 0, 4);
    ctx.restore();
  }

  function drawVoidCore(ctx, boss, cameraY) {
    const drawX = boss.x;
    const drawY = boss.y - cameraY;

    // Distortion ring
    ctx.save();
    ctx.strokeStyle = 'rgba(153,0,255,0.3)';
    ctx.lineWidth = 1;
    for (let r = 40; r < 160; r += 30) {
      ctx.beginPath();
      ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Core body
    ctx.shadowColor = '#9900ff';
    ctx.shadowBlur = 30;
    const grad = ctx.createRadialGradient(drawX, drawY, 5, drawX, drawY, boss.w/2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#cc00ff');
    grad.addColorStop(1, '#220044');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(drawX, drawY, boss.w/2, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting orbs
    for (const orb of boss.orbs) {
      ctx.shadowColor = '#ff0080';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#ff0080';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y - cameraY, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawBossHealthBar(ctx, boss) {
    // Reset to screen space so the bar is always at the bottom of the canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bw = 300, bh = 12;
    const bx = (ctx.canvas.width - bw) / 2;
    const by = ctx.canvas.height - 40;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);

    const hpRatio = Math.max(0, boss.health / boss.maxHealth);
    const hpColor = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffee00' : '#ff0080';

    ctx.fillStyle = hpColor;
    ctx.shadowColor = hpColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(bx, by, bw * hpRatio, bh);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#fff';
    ctx.font = '10px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`BOSS: ${boss.type.replace(/_/g,' ')}  ${boss.health}/${boss.maxHealth}`, ctx.canvas.width/2, by - 4);
    ctx.restore(); // end screen-space transform
  }

  function hitBoss(damage) {
    if (!currentBoss || currentBoss.dead) return false;
    currentBoss.health -= damage;
    currentBoss.hitFlash = 10;
    SFX.play('boss_hit');
    Particles.burst(currentBoss.x, currentBoss.y - GameState.cameraY, '#ff0080', 8);

    if (currentBoss.health <= 0) {
      killBoss();
      return true;
    }
    return false;
  }

  function killBoss() {
    const boss = currentBoss;
    boss.dead = true;
    bossActive = false;
    bossDefeated[boss.idx] = true;
    nextBossIdx = boss.idx + 1;

    // Big rewards
    const coinReward = 100 + boss.idx * 50;
    GameState.coins += coinReward;
    GameState.totalCoins += coinReward;
    GameState.score += 500 + boss.idx * 250;

    Particles.burst(boss.x, boss.y - GameState.cameraY, '#ffee00', 40);
    GameState.screenShake = 20;
    UI.showToast(`BOSS DEFEATED! +${coinReward} COINS!`);
    SFX.play('boss_die');

    setTimeout(() => { currentBoss = null; }, 2000);
  }

  function checkBulletCollisions(bullets) {
    if (!currentBoss || currentBoss.dead) return;
    for (const b of bullets) {
      if (b.dead) continue;
      const hit = Physics.aabbOverlap(
        b.x - b.r, b.y - b.r, b.r * 2, b.r * 2,
        currentBoss.x - currentBoss.w/2,
        currentBoss.y - currentBoss.h/2,
        currentBoss.w, currentBoss.h
      );
      if (hit) {
        b.dead = true;
        hitBoss(b.damage || 1);
      }
    }
  }

  function isActive() { return bossActive && currentBoss && !currentBoss.dead; }
  function getCurrent() { return currentBoss; }

  return { init, checkSpawn, update, draw, hitBoss, checkBulletCollisions, isActive, getCurrent };
})();
