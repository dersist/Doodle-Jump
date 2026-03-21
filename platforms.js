// ═══════════════════════════════════════════
//  PLATFORMS.JS — Platform spawning + behavior
// ═══════════════════════════════════════════

const Platforms = (() => {
  const PLATFORM_W = 68;
  const PLATFORM_H = 12;

  // Platform types
  const TYPE = {
    NORMAL: 'normal',
    MOVING: 'moving',
    BREAKING: 'breaking',
    SPRING: 'spring',
    BOOST: 'boost',
    PHASE: 'phase',      // disappears periodically
    SPIKY: 'spiky',      // damages player
    COIN: 'coin_plat',   // spawns coin on land
  };

  const COLORS = {
    normal:   { fill: '#0a1a3a', stroke: '#00f5ff', glow: '#00f5ff' },
    moving:   { fill: '#1a0a3a', stroke: '#9900ff', glow: '#9900ff' },
    breaking: { fill: '#2a0a0a', stroke: '#ff6600', glow: '#ff6600' },
    spring:   { fill: '#0a2a0a', stroke: '#00ff88', glow: '#00ff88' },
    boost:    { fill: '#2a2a00', stroke: '#ffee00', glow: '#ffee00' },
    phase:    { fill: '#1a1a2a', stroke: '#ff0080', glow: '#ff0080' },
    spiky:    { fill: '#2a0015', stroke: '#ff0040', glow: '#ff0040' },
    coin_plat:{ fill: '#0a2a1a', stroke: '#00ffcc', glow: '#00ffcc' },
  };

  let platforms = [];
  let topY = 0;           // highest spawned Y
  let spawnGap = 85;      // vertical gap between platforms

  function init(canvasW, canvasH) {
    platforms = [];
    spawnGap = 60;

    const GAP = 60;

    // Fill screen bottom-to-top with normal platforms
    for (let y = canvasH - 30; y > -200; y -= GAP) {
      const spread = y > canvasH - 250 ? 0.3 : 0.7;
      let x = canvasW / 2 - PLATFORM_W / 2 + (Math.random() - 0.5) * canvasW * spread;
      x = Math.max(10, Math.min(canvasW - PLATFORM_W - 10, x));
      platforms.push(createPlatform(TYPE.NORMAL, x, y, canvasW));
    }

    // Player spawns at y=canvasH-160, feet at canvasH-120.
    // Force a wide platform right under the player's feet.
    const gp = createPlatform(TYPE.NORMAL, canvasW / 2 - 50, canvasH - 110, canvasW);
    gp.w = 100;
    platforms.unshift(gp);

    topY = -200;
  }

  function createPlatform(type, x, y, canvasW) {
    const p = {
      type,
      x, y,
      w: PLATFORM_W + (type === TYPE.SPRING ? 0 : Math.random() * 20 - 10),
      h: PLATFORM_H,
      broken: false,
      breakTimer: 0,
      phaseTimer: 0,
      phaseVisible: true,
      moveDir: Math.random() > 0.5 ? 1 : -1,
      moveSpeed: 1.2 + Math.random() * 1.2,
      hasCoin: type === TYPE.COIN_PLAT,
      coinCollected: false,
    };
    p.w = Math.max(40, Math.min(90, p.w));
    return p;
  }

  function getTypeForHeight(score) {
    const r = Math.random();
    if (score < 500) {
      if (r < 0.78) return TYPE.NORMAL;
      if (r < 0.88) return TYPE.MOVING;
      if (r < 0.93) return TYPE.SPRING;
      if (r < 0.97) return TYPE.COIN;
      return TYPE.BREAKING;
    } else if (score < 1500) {
      if (r < 0.52) return TYPE.NORMAL;
      if (r < 0.66) return TYPE.MOVING;
      if (r < 0.74) return TYPE.SPRING;
      if (r < 0.81) return TYPE.BREAKING;
      if (r < 0.86) return TYPE.BOOST;
      if (r < 0.90) return TYPE.PHASE;
      if (r < 0.95) return TYPE.COIN;
      return TYPE.SPIKY;
    } else {
      if (r < 0.38) return TYPE.NORMAL;
      if (r < 0.52) return TYPE.MOVING;
      if (r < 0.62) return TYPE.SPRING;
      if (r < 0.70) return TYPE.BREAKING;
      if (r < 0.76) return TYPE.BOOST;
      if (r < 0.81) return TYPE.PHASE;
      if (r < 0.88) return TYPE.COIN;
      return TYPE.SPIKY;
    }
  }

  function spawnAbove(canvasW, cameraY, score) {
    const gap = Math.max(50, spawnGap - score * 0.01);
    while (topY > cameraY - 300) {
      topY -= gap + Math.random() * 20;
      const type = getTypeForHeight(score);
      const x = Math.random() * (canvasW - PLATFORM_W - 10) + 5;
      platforms.push(createPlatform(type, x, topY, canvasW));

      // Alongside every dangerous platform, spawn a safe one nearby so
      // there's always a valid path upward
      if (type === TYPE.SPIKY || type === TYPE.PHASE) {
        const safeX = x > canvasW / 2
          ? Math.random() * (canvasW / 2 - PLATFORM_W)
          : canvasW / 2 + Math.random() * (canvasW / 2 - PLATFORM_W);
        platforms.push(createPlatform(TYPE.NORMAL, safeX, topY - gap * 0.6, canvasW));
        topY -= gap * 0.6;
      }
    }
  }

  function update(dt, cameraY, canvasW, canvasH, score) {
    // Spawn new platforms above camera view
    spawnAbove(canvasW, cameraY, score);

    // Update platform behaviors
    for (const p of platforms) {
      // Moving platforms
      if (p.type === TYPE.MOVING || p.type === TYPE.SPRING) {
        p.x += p.moveDir * p.moveSpeed;
        if (p.x <= 0 || p.x + p.w >= canvasW) p.moveDir *= -1;
      }

      // Breaking: count down crack delay, then actually break
      if (p.type === TYPE.BREAKING && p.crackDelay > 0 && !p.broken) {
        p.crackDelay -= dt;
        if (p.crackDelay <= 0) {
          p.broken = true;
          p.breakTimer = 0;
          p.cracking = false;
        }
      }

      // Breaking animation
      if (p.type === TYPE.BREAKING && p.broken) {
        p.breakTimer += dt;
      }

      // Phase platform flicker
      if (p.type === TYPE.PHASE) {
        p.phaseTimer += dt;
        if (p.phaseTimer > 60) {
          p.phaseVisible = !p.phaseVisible;
          p.phaseTimer = 0;
        }
      }
    }

    // Release last-landed platform once player has climbed far above it
    const lastPlat = GameState.lastLandedPlatformId;
    if (lastPlat && GameState.player) {
      const distAbove = lastPlat.y - GameState.player.y; // positive = platform is below player
      if (distAbove > GameState.canvasH * 1.5) {
        // Player is 1.5 screens above it — they can never reach it again
        GameState.lastLandedPlatformId = null;
      }
    }

    // Remove platforms well below camera — but NEVER remove the last-landed platform
    const lastId = GameState.lastLandedPlatformId;
    const cullY = cameraY + canvasH + 200;
    platforms = platforms.filter(p =>
      p === lastId ||                            // always keep last landed
      (p.y < cullY && !(p.type === TYPE.BREAKING && p.breakTimer > 25))
    );
  }

  function draw(ctx, cameraY, shake) {
    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;

    for (const p of platforms) {
      if (p.type === TYPE.PHASE && !p.phaseVisible) continue;
      if (p.type === TYPE.BREAKING && p.broken && p.breakTimer > 15) continue;

      const drawY = p.y - cameraY + sy;
      const drawX = p.x + sx;

      const col = COLORS[p.type] || COLORS.normal;
      const alpha = p.type === TYPE.PHASE ? (p.phaseVisible ? 0.7 : 0) : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Glow
      ctx.shadowColor = col.glow;
      ctx.shadowBlur = 12;

      // Platform body
      ctx.fillStyle = col.fill;
      ctx.strokeStyle = col.stroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, p.w, p.h, 3);
      ctx.fill();
      ctx.stroke();

      // Platform surface shine
      ctx.shadowBlur = 0;
      const grad = ctx.createLinearGradient(drawX, drawY, drawX, drawY + p.h);
      grad.addColorStop(0, 'rgba(255,255,255,0.15)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, p.w, p.h / 2, 3);
      ctx.fill();

      // Spring indicator
      if (p.type === TYPE.SPRING) {
        ctx.fillStyle = col.glow;
        ctx.shadowColor = col.glow;
        ctx.shadowBlur = 8;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('↑↑', drawX + p.w / 2, drawY - 2);
      }

      // Boost indicator
      if (p.type === TYPE.BOOST) {
        ctx.fillStyle = col.glow;
        ctx.shadowColor = col.glow;
        ctx.shadowBlur = 8;
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', drawX + p.w / 2, drawY - 2);
      }

      // Spiky indicator
      if (p.type === TYPE.SPIKY) {
        ctx.fillStyle = '#ff0040';
        ctx.shadowColor = '#ff0040';
        ctx.shadowBlur = 8;
        for (let i = 0; i < Math.floor(p.w / 12); i++) {
          const sx2 = drawX + 6 + i * 12;
          ctx.beginPath();
          ctx.moveTo(sx2, drawY);
          ctx.lineTo(sx2 + 4, drawY - 7);
          ctx.lineTo(sx2 + 8, drawY);
          ctx.fill();
        }
      }

      // Breaking cracks
      if (p.type === TYPE.BREAKING && p.broken) {
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 1;
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(drawX + p.w * 0.3, drawY);
        ctx.lineTo(drawX + p.w * 0.4, drawY + p.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(drawX + p.w * 0.65, drawY);
        ctx.lineTo(drawX + p.w * 0.55, drawY + p.h);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  function getAll() { return platforms; }

  function addPlatform(type, x, y) {
    platforms.push(createPlatform(type, x, y));
  }

  function removeById(id) {
    platforms = platforms.filter(p => p !== id);
  }

  return { init, update, draw, getAll, addPlatform, removeById, TYPE, PLATFORM_W, PLATFORM_H };
})();
