// ═══════════════════════════════════════════
//  PHYSICS.JS — Gravity, velocity, collisions
// ═══════════════════════════════════════════

const Physics = (() => {
  const BASE_GRAVITY = 0.45;
  const BASE_JUMP = -13.5;
  const BASE_MOVE_SPEED = 5.5;
  const BASE_MAX_FALL = 16;
  const BASE_AIR_CTRL = 0.85;

  function getGravity() {
    const gs = GameState;
    let g = BASE_GRAVITY;
    if (gs.player) g *= gs.player.gravityMult;
    if (gs.gravityFlipped) g = -g;
    return g;
  }

  function applyGravity(entity) {
    entity.vy += getGravity();
    const maxFall = (GameState.player ? GameState.player.maxFallSpeed : BASE_MAX_FALL);
    if (!GameState.gravityFlipped) {
      if (entity.vy > maxFall) entity.vy = maxFall;
    } else {
      if (entity.vy < -maxFall) entity.vy = -maxFall;
    }
  }

  function applyVelocity(entity) {
    entity.x += entity.vx;
    entity.y += entity.vy;
  }

  // AABB check: returns true if overlapping
  function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // Player-platform collision: sweep test — catches all speeds, no tunneling
  function playerPlatformCollision(player, platform) {
    const px = player.x, py = player.y;
    const pw = player.w, ph = player.h;
    const platX = platform.x, platY = platform.y;
    const platW = platform.w, platH = platform.h;

    // Horizontal overlap (small inset so edge-clips don't count)
    if (px + pw <= platX + 4 || px >= platX + platW - 4) return false;

    if (!GameState.gravityFlipped) {
      if (player.vy < 0) return false; // moving upward — pass through
      // Where were feet BEFORE this frame's movement?
      const prevFeet = py + ph - player.vy;
      const currFeet = py + ph;
      // Swept through or landed on platform top
      return prevFeet <= platY + 2 && currFeet >= platY - 2;
    } else {
      if (player.vy > 0) return false;
      const prevTop = py - player.vy;
      const currTop = py;
      return prevTop >= platY + platH - 2 && currTop <= platY + platH + 2;
    }
  }

  // Bullet vs enemy: circle/rect
  function bulletEnemyCollision(bullet, enemy) {
    return aabbOverlap(bullet.x - bullet.r, bullet.y - bullet.r,
                       bullet.r * 2, bullet.r * 2,
                       enemy.x, enemy.y, enemy.w, enemy.h);
  }

  // Player vs enemy: AABB with shrink
  function playerEnemyCollision(player, enemy) {
    const margin = 4;
    return aabbOverlap(
      player.x + margin, player.y + margin,
      player.w - margin * 2, player.h - margin * 2,
      enemy.x + margin, enemy.y + margin,
      enemy.w - margin * 2, enemy.h - margin * 2
    );
  }

  // Player vs coin
  function playerCoinCollision(player, coin) {
    const d = Math.hypot(player.x + player.w/2 - coin.x, player.y + player.h/2 - coin.y);
    return d < player.w/2 + coin.r + 8;
  }

  // Wrap around screen edges
  function wrapX(entity, canvasW) {
    if (entity.x + entity.w < 0) entity.x = canvasW;
    else if (entity.x > canvasW) entity.x = -entity.w;
  }

  return {
    BASE_GRAVITY, BASE_JUMP, BASE_MOVE_SPEED, BASE_MAX_FALL, BASE_AIR_CTRL,
    getGravity, applyGravity, applyVelocity,
    aabbOverlap, playerPlatformCollision, bulletEnemyCollision,
    playerEnemyCollision, playerCoinCollision, wrapX
  };
})();
