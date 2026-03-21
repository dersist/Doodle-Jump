// ═══════════════════════════════════════════
//  ENEMIES.JS — Enemy logic + scaling
// ═══════════════════════════════════════════

const Enemies = (() => {
  let enemies = [];
  let spawnTimer = 0;
  let spawnInterval = 300; // frames between spawns

  const TYPES = {
    FLOATER: 'floater',    // hovers, moves side to side
    SHOOTER: 'shooter',    // fires projectiles at player
    CHASER:  'chaser',     // tracks player
    SPINNER: 'spinner',    // rotates/circles
    SPLITTER:'splitter',   // splits on death
  };

  const COLORS = {
    floater: { fill: '#1a0a2a', stroke: '#9900ff', glow: '#9900ff' },
    shooter: { fill: '#2a0a0a', stroke: '#ff6600', glow: '#ff6600' },
    chaser:  { fill: '#2a0015', stroke: '#ff0080', glow: '#ff0080' },
    spinner: { fill: '#0a1a2a', stroke: '#00f5ff', glow: '#00f5ff' },
    splitter:{ fill: '#1a1a00', stroke: '#ffee00', glow: '#ffee00' },
  };

  function getScaling(score) {
    const tier = Math.floor(score / 500);
    return {
      health: 1 + tier * 0.5,
      speed: 1 + tier * 0.15,
      damage: 1 + tier * 0.3,
      scoreVal: 10 + tier * 5,
    };
  }

  function spawnEnemy(score, canvasW, cameraY) {
    const scale = getScaling(score);
    const r = Math.random();
    let type;

    if (score < 300)      type = TYPES.FLOATER;
    else if (score < 800) type = r < 0.5 ? TYPES.FLOATER : TYPES.SHOOTER;
    else if (score < 1500) {
      if (r < 0.3) type = TYPES.FLOATER;
      else if (r < 0.55) type = TYPES.SHOOTER;
      else if (r < 0.75) type = TYPES.CHASER;
      else type = TYPES.SPINNER;
    } else {
      if (r < 0.2) type = TYPES.FLOATER;
      else if (r < 0.4) type = TYPES.SHOOTER;
      else if (r < 0.55) type = TYPES.CHASER;
      else if (r < 0.7) type = TYPES.SPINNER;
      else type = TYPES.SPLITTER;
    }

    const w = type === TYPES.SPINNER ? 28 : 36;
    const h = type === TYPES.SPINNER ? 28 : 26;

    enemies.push({
      type,
      x: Math.random() * (canvasW - w),
      y: cameraY - 80,
      w, h,
      vx: (Math.random() * 2 - 1) * 1.5 * scale.speed,
      vy: 0.3 + Math.random() * 0.4,
      health: Math.ceil(2 * scale.health),
      maxHealth: Math.ceil(2 * scale.health),
      scoreVal: scale.scoreVal,
      shootTimer: 0,
      shootInterval: 120 + Math.random() * 80,
      angle: 0,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitSpeed: 0.03 + Math.random() * 0.02,
      orbitRadius: 40 + Math.random() * 30,
      orbitCenterX: 0,
      orbitCenterY: 0,
      hitFlash: 0,
      dead: false,
      scale,
    });
  }

  function init() {
    enemies = [];
    spawnTimer = 0;
  }

  function update(dt, player, score, canvasW, cameraY, canvasH) {
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;

    spawnInterval = Math.max(80, 300 - score * 0.08);
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval && score > 100) {
      spawnTimer = 0;
      spawnEnemy(score, canvasW, cameraY);
    }

    const scale = getScaling(score);

    for (const e of enemies) {
      if (e.dead) continue;

      // Movement based on type — all multiplied by dt so time distort works
      switch (e.type) {
        case TYPES.FLOATER:
          e.x += e.vx * dt;
          if (e.x <= 0 || e.x + e.w >= canvasW) e.vx *= -1;
          break;

        case TYPES.SHOOTER:
          e.x += e.vx * dt;
          if (e.x <= 0 || e.x + e.w >= canvasW) e.vx *= -1;
          e.shootTimer += dt;
          if (e.shootTimer >= e.shootInterval) {
            e.shootTimer = 0;
            const dx = px - (e.x + e.w / 2);
            const dy = py - (e.y + e.h / 2);
            const dist = Math.hypot(dx, dy);
            if (dist > 0) {
              Projectiles.addEnemyBullet(
                e.x + e.w / 2, e.y + e.h / 2,
                (dx / dist) * 4, (dy / dist) * 4,
                e.scale.damage
              );
              SFX.play('enemy_shoot');
            }
          }
          break;

        case TYPES.CHASER: {
          const dx = px - (e.x + e.w / 2);
          const dy = py - (e.y + e.h / 2);
          const dist = Math.hypot(dx, dy);
          // Chase only within 220px, idle beyond 320px
          if (dist > 25 && dist < 220) {
            const spd = Math.min(0.7, 0.7 * scale.speed) * dt;
            e.vx += (dx / dist) * spd * 0.10;
            e.vy += (dy / dist) * spd * 0.10;
          } else if (dist > 320) {
            // Drift back to idle float
            e.vx *= 0.92;
            e.vy += 0.05 * dt; // gentle fall
          }
          const maxSpd = 1.4;
          e.vx = Math.max(-maxSpd, Math.min(maxSpd, e.vx));
          e.vy = Math.max(-maxSpd, Math.min(maxSpd, e.vy));
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.vx *= 0.96;
          e.vy *= 0.96;
          break;
        }

        case TYPES.SPINNER:
          e.orbitAngle += e.orbitSpeed * dt;
          if (e.orbitCenterX === 0) { e.orbitCenterX = e.x; e.orbitCenterY = e.y; }
          e.x = e.orbitCenterX + Math.cos(e.orbitAngle) * e.orbitRadius;
          e.y = e.orbitCenterY + Math.sin(e.orbitAngle) * e.orbitRadius;
          e.orbitCenterX += (px - e.orbitCenterX) * 0.003 * dt;
          e.orbitCenterY += (py - e.orbitCenterY) * 0.003 * dt;
          e.angle += 0.05 * dt;
          break;

        case TYPES.SPLITTER:
          e.x += e.vx * dt;
          e.y += e.vy * 0.5 * dt;
          if (e.x <= 0 || e.x + e.w >= canvasW) e.vx *= -1;
          break;
      }

      Physics.wrapX(e, canvasW);
      if (e.hitFlash > 0) e.hitFlash -= dt;
    }

    // Remove dead + offscreen enemies
    const cullY = cameraY + canvasH + 300;
    enemies = enemies.filter(e => !e.dead && e.y < cullY);
  }

  function draw(ctx, cameraY) {
    for (const e of enemies) {
      if (e.dead) continue;
      const drawY = e.y - cameraY;
      if (drawY > ctx.canvas.height + 60 || drawY < -100) continue;

      const col = COLORS[e.type] || COLORS.floater;

      ctx.save();
      ctx.shadowColor = col.glow;
      ctx.shadowBlur = e.hitFlash > 0 ? 20 : 10;

      if (e.hitFlash > 0) {
        ctx.globalAlpha = 0.7 + Math.sin(e.hitFlash * 0.5) * 0.3;
      }

      // Body
      if (e.type === TYPES.SPINNER) {
        ctx.translate(e.x + e.w / 2, drawY + e.h / 2);
        ctx.rotate(e.angle);
        ctx.translate(-e.w / 2, -e.h / 2);
        drawEnemyShape(ctx, 0, 0, e, col);
        ctx.translate(e.w / 2, e.h / 2);
        ctx.rotate(-e.angle);
        ctx.translate(-(e.x + e.w / 2), -(drawY + e.h / 2));
      } else {
        drawEnemyShape(ctx, e.x, drawY, e, col);
      }

      // Health bar
      if (e.maxHealth > 1) {
        const bw = e.w;
        const bh = 3;
        const bx = e.x;
        const by = drawY - 8;
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(bx, by, bw, bh);
        const hpRatio = e.health / e.maxHealth;
        ctx.fillStyle = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffee00' : '#ff0080';
        ctx.fillRect(bx, by, bw * hpRatio, bh);
      }

      ctx.restore();
    }
  }

  function drawEnemyShape(ctx, x, y, e, col) {
    ctx.fillStyle = col.fill;
    ctx.strokeStyle = col.stroke;
    ctx.lineWidth = 1.5;

    switch (e.type) {
      case TYPES.FLOATER:
        ctx.beginPath();
        ctx.ellipse(x + e.w/2, y + e.h/2, e.w/2, e.h/2, 0, 0, Math.PI*2);
        ctx.fill(); ctx.stroke();
        // Eyes
        ctx.fillStyle = col.glow;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x + e.w*0.3, y + e.h*0.45, 3, 0, Math.PI*2);
        ctx.arc(x + e.w*0.7, y + e.h*0.45, 3, 0, Math.PI*2);
        ctx.fill();
        break;

      case TYPES.SHOOTER:
        ctx.beginPath();
        ctx.roundRect(x, y, e.w, e.h, 4);
        ctx.fill(); ctx.stroke();
        // Barrel
        ctx.strokeStyle = col.glow;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(x + e.w/2, y + e.h/2);
        ctx.lineTo(x + e.w/2, y + e.h + 8);
        ctx.stroke();
        break;

      case TYPES.CHASER:
        ctx.beginPath();
        ctx.moveTo(x + e.w/2, y);
        ctx.lineTo(x + e.w, y + e.h);
        ctx.lineTo(x, y + e.h);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        break;

      case TYPES.SPINNER:
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.translate(e.w/2, e.h/2);
          ctx.rotate(i * Math.PI/2);
          ctx.fillStyle = col.fill;
          ctx.strokeStyle = col.stroke;
          ctx.beginPath();
          ctx.roundRect(-4, -e.h/2, 8, e.h/2, 2);
          ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.arc(e.w/2, e.h/2, 6, 0, Math.PI*2);
        ctx.fillStyle = col.glow;
        ctx.fill();
        break;

      case TYPES.SPLITTER:
        ctx.beginPath();
        ctx.moveTo(x, y + e.h/2);
        ctx.lineTo(x + e.w/2, y);
        ctx.lineTo(x + e.w, y + e.h/2);
        ctx.lineTo(x + e.w/2, y + e.h);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        break;

      default:
        ctx.fillRect(x, y, e.w, e.h);
        ctx.strokeRect(x, y, e.w, e.h);
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
    // Spawn mini enemies from splitter
    if (enemy.type === TYPES.SPLITTER && enemy.health <= 0) {
      for (let i = 0; i < 2; i++) {
        enemies.push({
          type: TYPES.FLOATER,
          x: enemy.x + (i === 0 ? -15 : 15),
          y: enemy.y,
          w: 18, h: 16,
          vx: (i === 0 ? -2 : 2),
          vy: -1,
          health: 1, maxHealth: 1,
          scoreVal: Math.floor(enemy.scoreVal / 2),
          shootTimer: 0, shootInterval: 999,
          angle: 0, orbitAngle: 0,
          orbitSpeed: 0, orbitRadius: 0,
          orbitCenterX: 0, orbitCenterY: 0,
          hitFlash: 0, dead: false,
          scale: enemy.scale,
        });
      }
    }
    SFX.play('enemy_die');
    Particles.burst(enemy.x + enemy.w/2, enemy.y + enemy.h/2, COLORS[enemy.type]?.glow || '#fff', 12);
    if (typeof RunStats !== 'undefined') RunStats.enemiesKilled++;
  }

  function getAll() { return enemies; }

  function clear() { enemies = []; }

  return { init, update, draw, getAll, hitEnemy, killEnemy, clear, TYPES };
})();
