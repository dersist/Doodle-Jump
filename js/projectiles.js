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
      r: options.r || 5,
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
      r: 5,
      color: '#ff6600',
      glow: '#ff6600',
      life: 180,
      dead: false,
    });
  }

  function init() {
    playerBullets = [];
    enemyBullets = [];
  }

  function update(dt, cameraY, enemies, player, canvasW, canvasH) {
    // Player bullets
    for (const b of playerBullets) {
      if (b.dead) continue;
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      if (b.life <= 0 || b.x < -20 || b.x > canvasW + 20) {
        b.dead = true;
        continue;
      }

      // Hit enemies
      for (const e of enemies) {
        if (e.dead) continue;
        if (Physics.bulletEnemyCollision(b, e)) {
          const killed = Enemies.hitEnemy(e, b.damage);
          if (killed) {
            GameState.score += e.scoreVal;
            GameState.coins += Math.ceil(e.scoreVal / 10 * (1 + PlayerUpgrades.getCurrencyBoost()));
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
          if (dist < 60) Enemies.hitEnemy(e, b.damage * 0.5);
        }
        Particles.burst(cx, cy - cameraY, '#ff6600', 16);
        SFX.play('explosion');
      }
    }

    // Enemy bullets
    for (const b of enemyBullets) {
      if (b.dead) continue;
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
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
