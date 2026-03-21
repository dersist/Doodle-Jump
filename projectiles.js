// ═══════════════════════════════════════════
//  PROJECTILES.JS — Bullets + hit detection
// ═══════════════════════════════════════════

const Projectiles = (() => {
  let playerBullets = [];
  let enemyBullets = [];

  function addPlayerBullet(x, y, vx, vy, damage, options = {}) {
    playerBullets.push({
      x, y, vx, vy,
      damage: damage || 1,
      r: options.r || 2,
      color: options.color || '#00f5ff',
      glow: options.glow || '#00f5ff',
      piercing: options.piercing || false,
      explosive: options.explosive || false,
      hitsLeft: options.piercing ? 3 : 1,
      life: options.life || 120,
      dead: false,
    });
  }

  function addEnemyBullet(x, y, vx, vy, damage) {
    enemyBullets.push({
      x, y, vx, vy,
      damage: damage || 1,
      r: 2,

  function init() {
    playerBullets = [];
    enemyBullets = [];
  }

  function update(dt, cameraY, enemies, player, canvasW, canvasH) {
    // Player bullets
    for (const b of playerBullets) {
      if (b.dead) continue;

      // Homing: strongly steer toward nearest enemy each frame
      let nearestE = null, nearestD = Infinity;
      for (const e of enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x + e.w/2 - b.x, e.y + e.h/2 - b.y);
        if (d < nearestD) { nearestD = d; nearestE = e; }
      }
      if (nearestE && nearestD < 500) {
        const tx = nearestE.x + nearestE.w/2 - b.x;
        const ty = nearestE.y + nearestE.h/2 - b.y;
        const dist = Math.hypot(tx, ty);
        const strength = 2.5 * dt; // strong continuous homing
        b.vx += (tx / dist) * strength;
        b.vy += (ty / dist) * strength;
        // Maintain consistent speed
        const spd = Math.hypot(b.vx, b.vy);
        const targetSpd = 11;
        if (spd > 0) { b.vx = b.vx/spd*targetSpd; b.vy = b.vy/spd*targetSpd; }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      const bScreenY = b.y - cameraY;
      if (b.life <= 0 || b.x < -30 || b.x > canvasW + 30 ||
          bScreenY < -100 || bScreenY > canvasH + 100) {
        b.dead = true;
        continue;
      }

      // Ricochet off screen edges
      if (b.canRicochet && !b.hasRicocheted) {
        if (b.x < 0 || b.x > canvasW) { b.vx *= -1; b.hasRicocheted = true; b.x = Math.max(0, Math.min(canvasW, b.x)); }
      }

      // Hit enemies
      for (const e of enemies) {
        if (e.dead) continue;
        if (Physics.bulletEnemyCollision(b, e)) {
          // Poison: mark enemy
          if (b.poison && !e.poisoned) {
            e.poisoned = true;
            e.poisonTimer = 240; // 4 seconds at 60fps
            e.poisonDmgTimer = 0;
          }
          const killed = Enemies.hitEnemy(e, b.damage);
          if (killed) {
            GameState.score += e.scoreVal;
            const coinReward = Math.ceil(e.scoreVal / 10 * PlayerUpgrades.getCurrencyBoost());
            GameState.coins += coinReward;
            GameState.totalCoins += coinReward;
            if (typeof RunStats !== 'undefined') RunStats.coinsCollected += coinReward;

            // Chain lightning: arc to 2 nearby enemies
            if (b.chainLightning) {
              let chained = 0;
              for (const other of enemies) {
                if (other.dead || other === e) continue;
                const dist = Math.hypot(other.x - e.x, other.y - e.y);
                if (dist < 120) {
                  Enemies.hitEnemy(other, b.damage);
                  Particles.burst(other.x + other.w/2, other.y + other.h/2 - cameraY, '#ffee00', 6);
                  chained++;
                  if (chained >= 2) break;
                }
              }
            }
          }
          if (!b.piercing) { b.dead = true; break; }
          else { b.hitsLeft--; if (b.hitsLeft <= 0) { b.dead = true; break; } }
        }
      }

      // Explosive splash
      if (b.dead && b.explosive) {
        const cx = b.x, cy = b.y;
        for (const e of enemies) {
          if (e.dead) continue;
          const dist = Math.hypot(e.x + e.w/2 - cx, e.y + e.h/2 - cy);
          if (dist < 70) Enemies.hitEnemy(e, b.damage * 0.6);
        }
        Particles.burst(cx, cy - cameraY, '#ff6600', 18);
        Particles.shockwave(cx, cy - cameraY, '#ff6600', 70);
        SFX.play('explosion');
      }
    }

    // Poison tick on all enemies
    for (const e of enemies) {
      if (!e.poisoned || e.dead) continue;
      e.poisonTimer -= dt;
      e.poisonDmgTimer = (e.poisonDmgTimer || 0) + dt;
      if (e.poisonDmgTimer >= 60) { // 1 damage per second
        e.poisonDmgTimer = 0;
        Enemies.hitEnemy(e, 1);
        Particles.burst(e.x + e.w/2, e.y + e.h/2 - cameraY, '#00ff88', 3);
      }
      if (e.poisonTimer <= 0) { e.poisoned = false; e.poisonDmgTimer = 0; }
    }

    // Enemy bullets
    for (const b of enemyBullets) {
      if (b.dead) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) { b.dead = true; continue; }

      // Hit player
      const px = b.x - player.x;
      const py = b.y - player.y;
      if (px > 0 && px < player.w && py > 0 && py < player.h) {
        if (!player.shielded && !player.invincible) {
          Player.takeDamage(b.damage);
          b.dead = true;
        } else if (player.reflectBullets && player.shielded) {
          // Reflect
          b.vx *= -1; b.vy *= -1;
          b.color = '#00f5ff';
          b.dead = false;
          // Convert to player bullet
          addPlayerBullet(b.x, b.y, b.vx, b.vy, b.damage);
          b.dead = true;
        } else {
          b.dead = true;
        }
      }
    }

    // Clean up dead bullets
    playerBullets = playerBullets.filter(b => !b.dead);
    enemyBullets = enemyBullets.filter(b => !b.dead);
  }

  function draw(ctx, cameraY) {
    const all = [...playerBullets, ...enemyBullets];
    for (const b of all) {
      const drawY = b.y - cameraY;
      if (drawY < -20 || drawY > ctx.canvas.height + 20) continue;

      ctx.save();
      ctx.shadowColor = b.glow;
      ctx.shadowBlur = 12;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, drawY, b.r, 0, Math.PI * 2);
      ctx.fill();

      // Trail
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(b.x - b.vx * 2, drawY - b.vy * 2, b.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function clearAll() {
    playerBullets = [];
    enemyBullets = [];
  }

  function getEnemyBullets() { return enemyBullets; }
  function getPlayerBullets() { return playerBullets; }

  return { init, update, draw, addPlayerBullet, addEnemyBullet, clearAll,
           getEnemyBullets, getPlayerBullets };
})();
