// ═══════════════════════════════════════════
//  ENEMIES.JS — 5 types, screen-persistent, aggressive
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

    // Random starting screen position — spread across whole screen
    const sx = Math.random() * (canvasW - w - 20) + 10;
    const sy = Math.random() * (canvasH * 0.7) + 20;
    const spd = (0.8 + Math.random() * 0.8) * scale.speed;

    const e = {
      type, sx, sy,
      x: sx, y: 0,  // world Y set each frame
      w, h,
      vsx: (Math.random() < 0.5 ? 1 : -1) * spd,
      vsy: (Math.random() - 0.5) * spd * 0.5,
      health: Math.ceil(2 * scale.health),
      maxHealth: Math.ceil(2 * scale.health),
      scoreVal: scale.scoreVal,
      scale,
      spawnScore: score,
      persistScore: 80 + Math.random() * 40,
      // Attack state
      shootTimer: Math.random() * 60,    // stagger spawns so not all shoot at once
      shootInterval: 70 + Math.random() * 50,
      burstTimer: 0,
      burstCount: 0,
      burstDx: 0, burstDy: 0,
      // Dash / charge state (chaser)
      dashTimer: 0,
      dashCooldown: 0,
      dashVsx: 0, dashVsy: 0,
      // Orbit state (spinner)
      orbitAngle: Math.random() * Math.PI * 2,
      orbitSpeed: 0.035 + Math.random() * 0.025,
      orbitRadius: 45 + Math.random() * 30,
      orbitCx: sx, orbitCy: sy,
      angle: 0,
      hitFlash: 0,
      dead: false,
    };
    enemies.push(e);
  }

  function init() { enemies = []; spawnTimer = 0; }

  function update(dt, player, score, canvasW, cameraY, canvasH) {
    const spx = player.x + player.w / 2;          // world X
    const spy = (player.y + player.h / 2) - cameraY; // screen Y of player center

    spawnInterval = Math.max(80, 280 - score * 0.08);
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval && score > 50) {
      spawnTimer = 0;
      spawnEnemy(score, canvasW, canvasH);
    }

    for (const e of enemies) {
      if (e.dead) continue;

      // Update world coords from screen position
      e.x = e.sx;
      e.y = cameraY + e.sy;

      const ex = e.sx + e.w / 2;   // screen-space enemy center
      const ey = e.sy + e.h / 2;
      const dx = spx - ex;
      const dy = spy - ey;
      const dist = Math.hypot(dx, dy);

      switch (e.type) {

        // ── FLOATER: drifts sinusoidally + fires 2-way spread aimed at player ──
        case TYPES.FLOATER: {
          e.sx += e.vsx * dt;
          e.sy += Math.sin(Date.now() * 0.0015 + e.orbitAngle) * 0.6 * dt;
          if (e.sx <= 0 || e.sx + e.w >= canvasW) e.vsx *= -1;
          e.sy = Math.max(10, Math.min(canvasH - e.h - 10, e.sy));

          e.shootTimer += dt;
          if (e.shootTimer >= e.shootInterval) {
            e.shootTimer = 0;
            if (dist > 0) {
              const spd = 3.5;
              const nx = dx / dist, ny = dy / dist;
              const perp = 0.15; // slight spread
              Projectiles.addEnemyBullet(e.x + e.w/2, e.y + e.h/2,
                (nx - perp * ny) * spd, (ny + perp * nx) * spd, e.scale.damage);
              Projectiles.addEnemyBullet(e.x + e.w/2, e.y + e.h/2,
                (nx + perp * ny) * spd, (ny - perp * nx) * spd, e.scale.damage);
              SFX.play('enemy_shoot');
            }
          }
          break;
        }

        // ── SHOOTER: holds position, fires fast 3-shot bursts at player ──
        case TYPES.SHOOTER: {
          // Slow lateral drift
          e.sx += e.vsx * 0.25 * dt;
          if (e.sx <= 0 || e.sx + e.w >= canvasW) e.vsx *= -1;

          // Burst fire
          if (e.burstCount > 0) {
            e.burstTimer -= dt;
            if (e.burstTimer <= 0) {
              e.burstCount--;
              e.burstTimer = 7;
              if (dist > 0) {
                const spd = 5.5;
                Projectiles.addEnemyBullet(e.x + e.w/2, e.y + e.h/2,
                  (e.burstDx / dist) * spd, (e.burstDy / dist) * spd, e.scale.damage);
              }
            }
          } else {
            e.shootTimer += dt;
            if (e.shootTimer >= e.shootInterval) {
              e.shootTimer = 0;
              e.burstCount = 4;
              e.burstTimer = 1;
              e.burstDx = dx; e.burstDy = dy; // lock aim at start of burst
              SFX.play('enemy_shoot');
            }
          }
          break;
        }

        // ── CHASER: hunts player + dashes + fires when close ──
        case TYPES.CHASER: {
          if (e.dashTimer > 0) {
            // Mid-dash — move fast in locked direction
            e.sx += e.dashVsx * dt;
            e.sy += e.dashVsy * dt;
            e.dashTimer -= dt;
          } else {
            // Normal chase
            const maxSpd = 1.8 * e.scale.speed;
            if (dist > 25) {
              e.vsx += (dx / dist) * 0.18 * dt;
              e.vsy += (dy / dist) * 0.18 * dt;
            }
            e.vsx = Math.max(-maxSpd, Math.min(maxSpd, e.vsx));
            e.vsy = Math.max(-maxSpd, Math.min(maxSpd, e.vsy));
            e.sx += e.vsx * dt;
            e.sy += e.vsy * dt;
            e.vsx *= 0.97; e.vsy *= 0.97;

            // Trigger dash toward player every ~3 seconds
            if (e.dashCooldown > 0) e.dashCooldown -= dt;
            if (e.dashCooldown <= 0 && dist < 250 && dist > 40) {
              e.dashCooldown = 180;
              e.dashTimer = 18;
              const spd2 = 7 * e.scale.speed;
              e.dashVsx = (dx / dist) * spd2;
              e.dashVsy = (dy / dist) * spd2;
            }

            // Shoot when relatively close
            e.shootTimer += dt;
            if (e.shootTimer >= e.shootInterval * 1.5 && dist < 200) {
              e.shootTimer = 0;
              const spd = 4;
              Projectiles.addEnemyBullet(e.x + e.w/2, e.y + e.h/2,
                (dx / dist) * spd, (dy / dist) * spd, e.scale.damage);
              SFX.play('enemy_shoot');
            }
          }
          e.sx = Math.max(0, Math.min(canvasW - e.w, e.sx));
          e.sy = Math.max(5, Math.min(canvasH - e.h - 5, e.sy));
          break;
        }

        // ── SPINNER: orbits + fires spinning radial shots continuously ──
        case TYPES.SPINNER: {
          e.orbitAngle += e.orbitSpeed * dt;
          // Orbit center drifts toward player X slowly
          e.orbitCx += (spx - e.orbitCx) * 0.001 * dt;
          e.orbitCy += (spy - e.orbitCy) * 0.001 * dt;
          e.orbitCx = Math.max(e.orbitRadius, Math.min(canvasW - e.orbitRadius, e.orbitCx));
          e.orbitCy = Math.max(30, Math.min(canvasH - 30, e.orbitCy));

          e.sx = e.orbitCx + Math.cos(e.orbitAngle) * e.orbitRadius - e.w/2;
          e.sy = e.orbitCy + Math.sin(e.orbitAngle) * e.orbitRadius - e.h/2;
          e.angle += 0.06 * dt;

          // Rotating 4-shot every ~2.5 seconds
          e.shootTimer += dt;
          if (e.shootTimer >= 150) {
            e.shootTimer = 0;
            for (let i = 0; i < 4; i++) {
              const a = e.angle + (i / 4) * Math.PI * 2;
              Projectiles.addEnemyBullet(e.x + e.w/2, e.y + e.h/2,
                Math.cos(a) * 3.5, Math.sin(a) * 3.5, e.scale.damage);
            }
            // Also one aimed at player
            if (dist > 0) {
              Projectiles.addEnemyBullet(e.x + e.w/2, e.y + e.h/2,
                (dx / dist) * 4.5, (dy / dist) * 4.5, e.scale.damage);
            }
            SFX.play('enemy_shoot');
          }
          break;
        }

        // ── SPLITTER: bounces wall-to-wall + fires aimed shot + splits on death ──
        case TYPES.SPLITTER: {
          e.sx += e.vsx * dt;
          e.sy += e.vsy * dt;
          if (e.sx <= 0 || e.sx + e.w >= canvasW) { e.vsx *= -1; e.sx = Math.max(0, Math.min(canvasW - e.w, e.sx)); }
          if (e.sy <= 5  || e.sy + e.h >= canvasH - 5)  { e.vsy *= -1; e.sy = Math.max(5, Math.min(canvasH - e.h - 5, e.sy)); }

          e.shootTimer += dt;
          if (e.shootTimer >= e.shootInterval * 1.2 && dist > 0) {
            e.shootTimer = 0;
            Projectiles.addEnemyBullet(e.x + e.w/2, e.y + e.h/2,
              (dx / dist) * 4, (dy / dist) * 4, e.scale.damage);
            SFX.play('enemy_shoot');
          }
          break;
        }
      }

      if (e.hitFlash > 0) e.hitFlash -= dt;
    }

    // Cull expired enemies
    enemies = enemies.filter(e => !e.dead && (score - e.spawnScore < e.persistScore));
  }

  function draw(ctx, cameraY) {
    for (const e of enemies) {
      if (e.dead) continue;
      const drawX = e.sx;
      const drawY = e.sy;
      if (drawY > ctx.canvas.height + 60 || drawY < -60) continue;

      const col = COLORS[e.type] || COLORS.floater;
      ctx.save();
      ctx.shadowColor = col.glow;
      ctx.shadowBlur = e.hitFlash > 0 ? 24 : 10;
      if (e.hitFlash > 0) ctx.globalAlpha = 0.6 + Math.sin(e.hitFlash * 0.8) * 0.4;

      // Health bar
      if (e.maxHealth > 1) {
        const pct = Math.max(0, e.health / e.maxHealth);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(drawX, drawY - 7, e.w, 3);
        ctx.fillStyle = pct > 0.5 ? '#00ff88' : pct > 0.25 ? '#ffee00' : '#ff0080';
        ctx.shadowBlur = 0;
        ctx.fillRect(drawX, drawY - 7, e.w * pct, 3);
        ctx.shadowBlur = e.hitFlash > 0 ? 24 : 10;
      }

      ctx.strokeStyle = col.stroke;
      ctx.fillStyle = col.fill;
      ctx.lineWidth = 1.5;

      switch (e.type) {
        case TYPES.FLOATER:
          ctx.beginPath();
          ctx.ellipse(drawX + e.w/2, drawY + e.h/2, e.w/2, e.h/2, 0, 0, Math.PI*2);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = col.stroke;
          ctx.beginPath(); ctx.arc(drawX + e.w/2, drawY + e.h/2, 4, 0, Math.PI*2); ctx.fill();
          break;

        case TYPES.SHOOTER:
          ctx.beginPath();
          ctx.rect(drawX + 2, drawY + 2, e.w - 4, e.h - 4);
          ctx.fill(); ctx.stroke();
          ctx.strokeStyle = col.stroke; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(drawX + e.w/2, drawY + e.h/2); ctx.lineTo(drawX + e.w/2, drawY - 8); ctx.stroke();
          break;

        case TYPES.CHASER: {
          ctx.save();
          ctx.translate(drawX + e.w/2, drawY + e.h/2);
          ctx.rotate(Math.atan2(e.vsy, e.vsx) + Math.PI/2);
          ctx.beginPath(); ctx.moveTo(0, -e.h/2); ctx.lineTo(e.w/2, e.h/2); ctx.lineTo(-e.w/2, e.h/2); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.restore();
          break;
        }

        case TYPES.SPINNER: {
          ctx.save();
          ctx.translate(drawX + e.w/2, drawY + e.h/2);
          ctx.rotate(e.angle);
          for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI/2);
            ctx.fillStyle = col.fill; ctx.strokeStyle = col.stroke;
            ctx.beginPath(); ctx.ellipse(e.w/3, 0, e.w/4, e.h/5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
          }
          ctx.restore();
          ctx.fillStyle = col.stroke;
          ctx.beginPath(); ctx.arc(drawX + e.w/2, drawY + e.h/2, 4, 0, Math.PI*2); ctx.fill();
          break;
        }

        case TYPES.SPLITTER:
          ctx.beginPath(); ctx.rect(drawX, drawY, e.w, e.h); ctx.fill(); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(drawX+4, drawY+4); ctx.lineTo(drawX+e.w-4, drawY+e.h-4);
          ctx.moveTo(drawX+e.w-4, drawY+4); ctx.lineTo(drawX+4, drawY+e.h-4);
          ctx.stroke();
          break;
      }
      ctx.restore();
    }
  }

  function hitEnemy(enemy, damage) {
    enemy.health -= damage;
    enemy.hitFlash = 8;
    if (enemy.health <= 0) { killEnemy(enemy); return true; }
    return false;
  }

  function killEnemy(enemy) {
    enemy.dead = true;
    if (enemy.type === TYPES.SPLITTER && enemy.health <= 0) {
      for (let i = 0; i < 2; i++) {
        enemies.push({
          type: TYPES.FLOATER,
          sx: enemy.sx + (i === 0 ? -20 : 20), sy: enemy.sy,
          x: enemy.x, y: enemy.y,
          w: 18, h: 16,
          vsx: (i === 0 ? -2.5 : 2.5), vsy: -1,
          health: 1, maxHealth: 1,
          scoreVal: Math.floor(enemy.scoreVal / 2), scale: enemy.scale,
          spawnScore: enemy.spawnScore, persistScore: enemy.persistScore * 0.5,
          shootTimer: 30, shootInterval: 100, burstTimer: 0, burstCount: 0,
          burstDx: 0, burstDy: 0, dashTimer: 0, dashCooldown: 0, dashVsx: 0, dashVsy: 0,
          angle: 0, orbitAngle: 0, orbitSpeed: 0.03, orbitRadius: 30,
          orbitCx: enemy.sx, orbitCy: enemy.sy, hitFlash: 0, dead: false,
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
