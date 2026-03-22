// ═══════════════════════════════════════════
//  ENEMIES.JS — 5 enemy types, screen-persistent
// ═══════════════════════════════════════════

const Enemies = (() => {
  const TYPES = {
    FLOATER:  'floater',
    SHOOTER:  'shooter',
    CHASER:   'chaser',
    SPINNER:  'spinner',
    SPLITTER: 'splitter',
  };

  const COLORS = {
    floater:  { fill: '#0a1530', stroke: '#00f5ff', glow: '#00f5ff' },
    shooter:  { fill: '#200a10', stroke: '#ff0080', glow: '#ff0080' },
    chaser:   { fill: '#1a0a00', stroke: '#ff6600', glow: '#ff6600' },
    spinner:  { fill: '#0a001a', stroke: '#9900ff', glow: '#9900ff' },
    splitter: { fill: '#001a0a', stroke: '#00ff88', glow: '#00ff88' },
  };

  let enemies = [];
  let spawnTimer = 0;
  let spawnInterval = 300;

  function getScaling(score) {
    const tier = Math.min(Math.floor(score / 300), 10);
    return {
      health:   1 + tier * 0.6,
      speed:    1 + tier * 0.12,
      damage:   1 + Math.floor(tier / 3),
      scoreVal: 10 + tier * 8,
    };
  }

  function spawnEnemy(score, canvasW, canvasH) {
    const scale = getScaling(score);
    const r = Math.random();
    let type;
    if (score < 300)       type = TYPES.FLOATER;
    else if (score < 800)  type = r < 0.5 ? TYPES.FLOATER : TYPES.SHOOTER;
    else if (score < 1500) {
      if (r < 0.3)       type = TYPES.FLOATER;
      else if (r < 0.55) type = TYPES.SHOOTER;
      else if (r < 0.75) type = TYPES.CHASER;
      else               type = TYPES.SPINNER;
    } else {
      if (r < 0.2)       type = TYPES.FLOATER;
      else if (r < 0.4)  type = TYPES.SHOOTER;
      else if (r < 0.55) type = TYPES.CHASER;
      else if (r < 0.7)  type = TYPES.SPINNER;
      else               type = TYPES.SPLITTER;
    }

    const w = type === TYPES.SPINNER ? 28 : 36;
    const h = type === TYPES.SPINNER ? 28 : 26;

    // Spawn at a random screen position (screen-space x/y)
    const sx = Math.random() * (canvasW - w - 10) + 5;
    const sy = Math.random() * (canvasH * 0.6) + canvasH * 0.05; // top 65% of screen

    const speed = (1 + Math.random()) * scale.speed;

    enemies.push({
      type,
      sx, sy,          // screen-space position (what we draw and move)
      x: sx, y: 0,     // world-space Y updated each frame from cameraY+sy
      w, h,
      vsx: (Math.random() < 0.5 ? 1 : -1) * speed * 0.8, // screen-space velocity
      vsy: (Math.random() - 0.5) * speed * 0.4,
      health: Math.ceil(2 * scale.health),
      maxHealth: Math.ceil(2 * scale.health),
      scoreVal: scale.scoreVal,
      scale,
      // persist until player climbs this many score units past spawn
      spawnScore: 0,         // set below
      persistScore: 80 + Math.random() * 40, // ~80-120 score units
      shootTimer: 0,
      shootInterval: 90 + Math.random() * 60,
      burstTimer: 0,         // for burst-fire shooter
      burstCount: 0,
      angle: 0,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitSpeed: 0.04 + Math.random() * 0.02,
      orbitRadius: 50 + Math.random() * 30,
      hitFlash: 0,
      dead: false,
    });
  }

  function init() {
    enemies = [];
    spawnTimer = 0;
  }

  function update(dt, player, score, canvasW, cameraY, canvasH) {
    const px = player.x + player.w / 2;  // world-space
    const py = player.y + player.h / 2;

    // Screen-space player position for enemy targeting
    const spx = px;                           // x same
    const spy = py - cameraY;                 // screen Y

    spawnInterval = Math.max(80, 300 - score * 0.08);
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval && score > 50) {
      spawnTimer = 0;
      const e = spawnEnemy(score, canvasW, canvasH);
      // Set spawnScore on last added enemy
      if (enemies.length > 0) enemies[enemies.length - 1].spawnScore = score;
    }

    for (const e of enemies) {
      if (e.dead) continue;

      // Update world-Y from screen position
      e.x = e.sx;
      e.y = cameraY + e.sy;

      // Each enemy type has its own movement + attack pattern
      switch (e.type) {

        // FLOATER: drifts sinusoidally, fires aimed burst every few seconds
        case TYPES.FLOATER: {
          e.sx += e.vsx * dt;
          e.sy += Math.sin(Date.now() * 0.001 + e.orbitAngle) * 0.4;
          if (e.sx <= 0 || e.sx + e.w >= canvasW) e.vsx *= -1;
          e.sy = Math.max(10, Math.min(canvasH * 0.85, e.sy));

          e.shootTimer += dt;
          if (e.shootTimer >= e.shootInterval * 1.5) {
            e.shootTimer = 0;
            // Aimed single shot at player
            const dx = spx - (e.sx + e.w/2);
            const dy = spy - (e.sy + e.h/2);
            const d = Math.hypot(dx, dy);
            if (d > 0) {
              Projectiles.addEnemyBullet(e.x + e.w/2, e.y + e.h/2,
                (dx/d) * 3, (dy/d) * 3, e.scale.damage);
              SFX.play('enemy_shoot');
            }
          }
          break;
        }

        // SHOOTER: stationary, fires 3-shot burst aimed at player
        case TYPES.SHOOTER: {
          // Slow drift
          e.sx += e.vsx * 0.3 * dt;
          if (e.sx <= 0 || e.sx + e.w >= canvasW) e.vsx *= -1;

          e.shootTimer += dt;
          if (e.burstCount > 0 && e.burstTimer > 0) {
            e.burstTimer -= dt;
            if (e.burstTimer <= 0 && e.burstCount > 0) {
              e.burstCount--;
              e.burstTimer = 8;
              const dx = spx - (e.sx + e.w/2);
              const dy = spy - (e.sy + e.h/2);
              const d = Math.hypot(dx, dy);
              if (d > 0) {
                Projectiles.addEnemyBullet(e.x + e.w/2, e.y + e.h/2,
                  (dx/d) * 4.5, (dy/d) * 4.5, e.scale.damage);
              }
            }
          }
          if (e.shootTimer >= e.shootInterval) {
            e.shootTimer = 0;
            e.burstCount = 3;
            e.burstTimer = 1;
            SFX.play('enemy_shoot');
          }
          break;
        }

        // CHASER: actively moves toward player on screen
        case TYPES.CHASER: {
          const dx = spx - (e.sx + e.w/2);
          const dy = spy - (e.sy + e.h/2);
          const dist = Math.hypot(dx, dy);
          const maxSpd = 1.6 * e.scale.speed;

          if (dist > 20 && dist < 300) {
            e.vsx += (dx/dist) * 0.12 * dt;
            e.vsy += (dy/dist) * 0.12 * dt;
          } else if (dist <= 20) {
            // Too close — back off
            e.vsx -= (dx/dist) * 0.1 * dt;
            e.vsy -= (dy/dist) * 0.1 * dt;
          }
          e.vsx = Math.max(-maxSpd, Math.min(maxSpd, e.vsx));
          e.vsy = Math.max(-maxSpd, Math.min(maxSpd, e.vsy));
          e.sx += e.vsx * dt;
          e.sy += e.vsy * dt;
          e.vsx *= 0.97;
          e.vsy *= 0.97;
          e.sx = Math.max(0, Math.min(canvasW - e.w, e.sx));
          e.sy = Math.max(10, Math.min(canvasH - e.h - 10, e.sy));
          break;
        }

        // SPINNER: orbits a drifting center, fires radial shots periodically
        case TYPES.SPINNER: {
          e.orbitAngle += e.orbitSpeed * dt;
          // Center drifts slowly
          e.sx += e.vsx * 0.2 * dt;
          if (e.sx <= e.orbitRadius || e.sx >= canvasW - e.orbitRadius) e.vsx *= -1;
          e.sy = Math.max(40, Math.min(canvasH * 0.7, e.sy + Math.sin(Date.now()*0.0005) * 0.2));

          const finalSx = e.sx + Math.cos(e.orbitAngle) * e.orbitRadius;
          const finalSy = e.sy + Math.sin(e.orbitAngle) * e.orbitRadius;
          e.x = finalSx;
          e.y = cameraY + finalSy;
          e.angle += 0.06 * dt;

          // Radial burst every ~4 seconds
          e.shootTimer += dt;
          if (e.shootTimer >= 240) {
            e.shootTimer = 0;
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2;
              Projectiles.addEnemyBullet(e.x + e.w/2, e.y + e.h/2,
                Math.cos(a) * 3, Math.sin(a) * 3, e.scale.damage);
            }
            SFX.play('enemy_shoot');
          }
          break;
        }

        // SPLITTER: bounces around screen, splits into 2 on death
        case TYPES.SPLITTER: {
          e.sx += e.vsx * dt;
          e.sy += e.vsy * dt;
          if (e.sx <= 0 || e.sx + e.w >= canvasW) e.vsx *= -1;
          if (e.sy <= 5 || e.sy + e.h >= canvasH - 5) e.vsy *= -1;
          e.sy = Math.max(5, Math.min(canvasH - e.h - 5, e.sy));
          break;
        }
      }

      if (e.hitFlash > 0) e.hitFlash -= dt;
    }

    // Cull enemies whose persist window has expired
    enemies = enemies.filter(e =>
      !e.dead && (score - e.spawnScore < e.persistScore)
    );
  }

  function draw(ctx, cameraY) {
    for (const e of enemies) {
      if (e.dead) continue;

      // For non-spinner types, draw at screen position directly
      const drawX = (e.type === TYPES.SPINNER) ? e.x : e.sx;
      const drawY = (e.type === TYPES.SPINNER) ? (e.y - cameraY) : e.sy;

      if (drawY > ctx.canvas.height + 60 || drawY < -60) continue;

      const col = COLORS[e.type] || COLORS.floater;

      ctx.save();
      ctx.shadowColor = col.glow;
      ctx.shadowBlur = e.hitFlash > 0 ? 24 : 10;
      if (e.hitFlash > 0) ctx.globalAlpha = 0.7 + Math.sin(e.hitFlash * 0.5) * 0.3;

      // Health bar
      if (e.maxHealth > 1) {
        const bw = e.w;
        const pct = e.health / e.maxHealth;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(drawX, drawY - 6, bw, 3);
        ctx.fillStyle = pct > 0.5 ? '#00ff88' : pct > 0.25 ? '#ffee00' : '#ff0080';
        ctx.fillRect(drawX, drawY - 6, bw * pct, 3);
      }

      drawEnemyShape(ctx, drawX, drawY, e, col);
      ctx.restore();
    }
  }

  function drawEnemyShape(ctx, x, y, e, col) {
    ctx.strokeStyle = col.stroke;
    ctx.fillStyle = col.fill;
    ctx.lineWidth = 1.5;

    switch (e.type) {
      case TYPES.FLOATER:
        ctx.beginPath();
        ctx.ellipse(x + e.w/2, y + e.h/2, e.w/2, e.h/2, 0, 0, Math.PI*2);
        ctx.fill(); ctx.stroke();
        // Eye
        ctx.fillStyle = col.stroke;
        ctx.beginPath();
        ctx.arc(x + e.w/2, y + e.h/2, 4, 0, Math.PI*2);
        ctx.fill();
        break;

      case TYPES.SHOOTER:
        ctx.beginPath();
        ctx.rect(x + 3, y + 3, e.w - 6, e.h - 6);
        ctx.fill(); ctx.stroke();
        // Barrel
        ctx.strokeStyle = col.stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + e.w/2, y + e.h/2);
        ctx.lineTo(x + e.w/2, y - 8);
        ctx.stroke();
        break;

      case TYPES.CHASER: {
        ctx.save();
        ctx.translate(x + e.w/2, y + e.h/2);
        ctx.rotate(e.angle || 0);
        ctx.beginPath();
        ctx.moveTo(0, -e.h/2);
        ctx.lineTo(e.w/2, e.h/2);
        ctx.lineTo(-e.w/2, e.h/2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
        break;
      }

      case TYPES.SPINNER: {
        ctx.save();
        ctx.translate(x + e.w/2, y + e.h/2);
        ctx.rotate(e.angle || 0);
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI/2);
          ctx.fillStyle = col.fill;
          ctx.strokeStyle = col.stroke;
          ctx.beginPath();
          ctx.ellipse(e.w/3, 0, e.w/4, e.h/5, 0, 0, Math.PI*2);
          ctx.fill(); ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = col.stroke;
        ctx.beginPath();
        ctx.arc(x + e.w/2, y + e.h/2, 4, 0, Math.PI*2);
        ctx.fill();
        break;
      }

      case TYPES.SPLITTER:
        ctx.beginPath();
        ctx.rect(x, y, e.w, e.h);
        ctx.fill(); ctx.stroke();
        // X marking
        ctx.beginPath();
        ctx.moveTo(x+4, y+4); ctx.lineTo(x+e.w-4, y+e.h-4);
        ctx.moveTo(x+e.w-4, y+4); ctx.lineTo(x+4, y+e.h-4);
        ctx.strokeStyle = col.stroke;
        ctx.stroke();
        break;
    }
  }

  function hitEnemy(enemy, damage) {
    enemy.health -= damage;
    enemy.hitFlash = 8;
    if (enemy.health <= 0) {
      killEnemy(enemy);
      return true;
    }
    return false;
  }

  function killEnemy(enemy) {
    enemy.dead = true;
    // Splitter splits into 2 smaller floaters on screen
    if (enemy.type === TYPES.SPLITTER && enemy.health <= 0) {
      for (let i = 0; i < 2; i++) {
        enemies.push({
          type: TYPES.FLOATER,
          sx: enemy.sx + (i === 0 ? -20 : 20),
          sy: enemy.sy,
          x: enemy.x, y: enemy.y,
          w: 18, h: 16,
          vsx: (i === 0 ? -2 : 2), vsy: -1,
          health: 1, maxHealth: 1,
          scoreVal: Math.floor(enemy.scoreVal / 2),
          scale: enemy.scale,
          shootTimer: 0, shootInterval: 120,
          burstTimer: 0, burstCount: 0,
          angle: 0, orbitAngle: 0, orbitSpeed: 0.03, orbitRadius: 30,
          hitFlash: 0, dead: false,
          spawnScore: enemy.spawnScore,
          persistScore: enemy.persistScore * 0.5,
        });
      }
    }
    SFX.play('enemy_die');
    Particles.burst(enemy.sx + enemy.w/2, enemy.sy + enemy.h/2, COLORS[enemy.type]?.glow || '#fff', 12);
    if (typeof RunStats !== 'undefined') RunStats.enemiesKilled++;
  }

  function getAll() { return enemies; }
  function clear()  { enemies = []; }

  return { init, update, draw, getAll, hitEnemy, killEnemy, clear, TYPES };
})();
