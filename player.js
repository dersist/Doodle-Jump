// ═══════════════════════════════════════════
//  PLAYER.JS — Player stats, movement, render
// ═══════════════════════════════════════════

const Player = (() => {
  const W = 32, H = 40;

  function create(canvasW, canvasH) {
    const jumpBonus = PlayerUpgrades.getJumpBonus();
    const p = {
      x: canvasW / 2 - W / 2,
      y: canvasH - 160,
      w: W, h: H,
      vx: 0, vy: 0,  // start stationary - will fall onto guaranteed platform below

      // Base stats
      jumpVelocity: Physics.BASE_JUMP * jumpBonus,
      jumpVelocityMult: 1,
      gravity: Physics.BASE_GRAVITY,
      gravityMult: 1,
      moveSpeed: Physics.BASE_MOVE_SPEED,
      moveSpeedMult: 1,
      airControl: Physics.BASE_AIR_CTRL,
      maxFallSpeed: Physics.BASE_MAX_FALL,
      fireRate: 18,        // frames between shots
      bulletDamage: 1,
      slamSpeed: 22,

      // Health
      health: 0,
      maxHealth: 0,
      regenTimer: 0,
      reviveUsed: false,

      // State flags
      onGround: false,
      slamming: false,
      slamLanded: false,
      rocketActive: false,
      rocketSteering: false,
      rocketTimer: 0,
      dashPhasing: false,
      shielded: false,
      shieldHits: 0,
      shieldTimer: 0,
      reflectBullets: false,
      shieldBig: false,
      invincible: false,
      invincibleTimer: 0,
      invincibleFlash: 0,

      // Shoot
      shootTimer: 0,

      // Animation
      animFrame: 0,
      animTimer: 0,
      facing: 1,   // 1=right -1=left
      squishY: 1,
      squishTimer: 0,
      trail: [],

      // Overdrive
      overdriveGlow: 0,
    };

    // Apply health system if purchased
    if (PlayerUpgrades.hasHealthSystem()) {
      p.maxHealth = PlayerUpgrades.getMaxHealth();
      p.health = p.maxHealth;
    }

    return p;
  }

  function update(dt, player, canvasW, canvasH) {
    const timeFactor = GameState.timeSlowTimer > 0 && !GameState.timeSlowPlayerUnaffected
      ? GameState.timeSlowFactor : 1;

    // ── MOVEMENT ──
    const speed = player.moveSpeed * player.moveSpeedMult
      * (GameState.speedBoostTimer > 0 ? 1.6 : 1)
      * (GameState.speedCutTimer > 0 ? 0.5 : 1);

    if (Input.isMovingLeft()) {
      player.vx = -speed;
      player.facing = -1;
    } else if (Input.isMovingRight()) {
      player.vx = speed;
      player.facing = 1;
    } else {
      player.vx *= 0.8;
    }

    // Rocket steering override
    if (player.rocketActive && player.rocketSteering) {
      if (Input.isMovingLeft()) player.vx = -speed * 0.6;
      else if (Input.isMovingRight()) player.vx = speed * 0.6;
    }

    // ── AUTO-SHOOT — fires when enemies are on screen (if setting enabled) ──
    const canShoot = !GameState.gravityFlipped || AbilityUpgrades.flipCanShoot();
    if (canShoot && GameState.settings.autoShoot) {
      // Only shoot if there's at least one live enemy visible on screen
      let hasTarget = false;
      for (const e of Enemies.getAll()) {
        if (e.dead) continue;
        const screenY = e.y - GameState.cameraY;
        if (screenY > -100 && screenY < canvasH + 100) { hasTarget = true; break; }
      }
      if (hasTarget) {
        player.shootTimer += dt;
        const fr = player.fireRate
          * GunUpgrades.getFireRateMult()
          * (GameState.overdriveTimer > 0 && AbilityUpgrades.overdriveAutoShoot() ? 0.5 : 1);
        if (player.shootTimer >= fr) {
          player.shootTimer = 0;
          firePlayerBullet(player);
        }
      } else {
        player.shootTimer = player.fireRate - 2; // stay ready
      }
    }

    // ── SLAM ──
    if (Input.isSlamming() && !player.onGround) {
      if (!player.slamming && !player.rocketActive) {
        player.slamming = true;
        player.vy = player.slamSpeed;
        SFX.play('slam_start');
      }
    }

    // ── ROCKET TIMER ──
    if (player.rocketActive) {
      player.rocketTimer -= dt;
      if (player.rocketTimer <= 0) {
        player.rocketActive = false;
        // Explosion effect at end
        Particles.burst(player.x + player.w/2,
                        player.y + player.h/2 - GameState.cameraY,
                        '#ff6600', 10);
      }
      // Damage trail
      if (AbilityUpgrades.rocketHasDamageTrail()) {
        for (const e of Enemies.getAll()) {
          if (e.dead) continue;
          if (Physics.playerEnemyCollision(player, e)) {
            Enemies.hitEnemy(e, 1);
          }
        }
      }
    }

    // ── PHYSICS ──
    Physics.applyGravity(player);
    Physics.applyVelocity(player);
    Physics.wrapX(player, canvasW);

    // ── ENEMY CONTACT DAMAGE ──
    if (!player.invincible && !player.shielded) {
      for (const e of Enemies.getAll()) {
        if (e.dead) continue;
        if (Physics.playerEnemyCollision(player, e)) {
          takeDamage(e.scale ? e.scale.damage : 1);
          break;
        }
      }
    }

    // ── COLLISION WITH PLATFORMS ──
    player.onGround = false;
    let landed = false;

    for (const p of Platforms.getAll()) {
      if (p.type === 'phase' && !p.phaseVisible) continue;
      if (p.broken) continue;

      if (GameState.gravityFlipped) {
        // FLIPPED: player rises upward, collides with UNDERSIDE of platforms
        if (player.x + player.w <= p.x + 4 || player.x >= p.x + p.w - 4) continue;
        if (player.vy >= 0) continue; // falling downward in flipped world — pass through
        const prevTop = player.y - player.vy;
        const currTop = player.y;
        const platBottom = p.y + p.h;
        if (prevTop >= platBottom - 2 && currTop <= platBottom + 2) {
          player.y = platBottom;
          player.vy = 0;
          player.onGround = true;
          landed = true;
          if (p.type === 'spiky') { takeDamage(1); }
          if (p.type === 'breaking' && !p.cracking) { p.cracking = true; }
          if (p.cracking && !p.crackDelay) { p.crackDelay = 20; }
          GameState.lastLandedPlatformId = p;
          // gf_9: slam synergy = kick downward strongly
          if (player.slamming && AbilityUpgrades.flipSlamSynergy()) {
            player.vy = 20;
          }
          player.slamming = false;
          SFX.play('jump');
          break;
        }
        continue;
      }

      if (Physics.playerPlatformCollision(player, p)) {
        if (p.type === 'spiky') {
          player.y = p.y - player.h;
          player.vy = player.jumpVelocity * player.jumpVelocityMult;
          player.onGround = true;
          takeDamage(1);
          break;
        }

        if (p.type === 'breaking') {
          if (player.slamming || AbilityUpgrades.slamBreaksAll()) {
            p.broken = true; p.breakTimer = 0; continue;
          }
          if (!p.cracking) { p.cracking = true; }
        }

        player.y = p.y - player.h;
        player.onGround = true;
        landed = true;
        GameState.lastLandedPlatformId = p;

        const wasSlamming = player.slamming;
        let jv = player.jumpVelocity * player.jumpVelocityMult;

        if (p.type === 'spring') {
          jv *= 1.6; SFX.play('spring'); player.squishY = 0.5; player.squishTimer = 8;
        } else if (p.type === 'boost') {
          jv *= 2.2; SFX.play('boost'); player.squishY = 0.4; player.squishTimer = 10;
        } else {
          player.squishY = 0.7; player.squishTimer = 5; SFX.play('jump');
        }

        player.vy = jv;
        player.slamming = false;
        player.slamLanded = false;
        player.rocketActive = false;
        if (typeof RunStats !== 'undefined') RunStats.platformsBounced++;

        if (wasSlamming) { handleSlamLanding(player, p); }

        if (p.type === 'coin_plat' && !p.coinCollected) {
          p.coinCollected = true;
          const amount = Math.ceil(3 * PlayerUpgrades.getCurrencyBoost());
          GameState.coins += amount;
          GameState.totalCoins += amount;
          Particles.coins(p.x + p.w/2, p.y - GameState.cameraY, amount);
        }

        if (p.cracking && !p.crackDelay) { p.crackDelay = 20; }

        break;
      }
    }

    // ── AIM ASSISTplatform if close to edge ──
    if (!landed && player.vy > 0) {
      let closestDist = 28; // pixels threshold for aim assist
      let closestPlat = null;
      for (const p of Platforms.getAll()) {
        if (p.type === 'phase' && !p.phaseVisible) continue;
        if (p.broken || p.cracking) continue;
        if (p.type === 'spiky') continue; // never assist onto dangerous pads
        const feet = player.y + player.h;
        if (feet < p.y - 2 || feet > p.y + 10) continue;
        // Check horizontal proximity to edge
        const playerCX = player.x + player.w / 2;
        const leftEdge  = p.x;
        const rightEdge = p.x + p.w;
        const leftGap  = Math.abs(playerCX - leftEdge);
        const rightGap = Math.abs(playerCX - rightEdge);
        const dist = Math.min(leftGap, rightGap);
        if (dist < closestDist && dist < player.w) {
          closestDist = dist;
          closestPlat = p;
        }
      }
      if (closestPlat) {
        const playerCX = player.x + player.w / 2;
        if (playerCX < closestPlat.x) player.x += Math.min(3, closestPlat.x - playerCX + player.w / 2);
        else if (playerCX > closestPlat.x + closestPlat.w) player.x -= Math.min(3, playerCX - closestPlat.x - closestPlat.w + player.w / 2);
      }
    }

    // ── SLAM LANDING ──
    if (player.slamming && !landed) {
      // Keep slamming
    }

    // ── GRAVITY FLIP — game over if player falls off bottom while flipped ──
    if (GameState.gravityFlipped) {
      if (player.y > GameState.cameraY + canvasH + 100) {
        if (typeof handleGameOver === 'function') handleGameOver();
        else GameState.gameOver = true;
      }
    }

    // ── GAME OVER CHECK — fell below screen (normal gravity) ──
    if (!GameState.gravityFlipped && player.y > GameState.cameraY + canvasH + 100) {
      if (typeof handleGameOver === 'function') handleGameOver();
      else GameState.gameOver = true;
    }

    // ── SHIELD TIMER ──
    if (player.shielded) {
      player.shieldTimer -= dt;
      // es_4: regen health slowly while shielded
      if (AbilityUpgrades.shieldRegens()) {
        player.regenTimer += dt;
        if (player.regenTimer >= 180) {
          player.regenTimer = 0;
          player.health = Math.min(player.maxHealth, player.health + 1);
          UI.updateHealthBar(player.health, player.maxHealth);
        }
      }
      if (player.shieldTimer <= 0 || player.shieldHits <= 0) {
        player.shielded = false;
        // es_5 break explosion handled in takeDamage; also trigger on timeout
        if (player.shieldTimer <= 0 && AbilityUpgrades.shieldExplodes()) {
          for (const e of Enemies.getAll()) {
            if (e.dead) continue;
            if (Math.hypot(e.x - player.x, e.y - player.y) < 90) Enemies.hitEnemy(e, 2);
          }
          Particles.shockwave(player.x + player.w/2, player.y + player.h/2 - GameState.cameraY, '#00f5ff', 90);
        }
      }
    }

    // ── REGEN ──
    if (PlayerUpgrades.hasRegen() && player.health < player.maxHealth) {
      player.regenTimer += dt;
      if (player.regenTimer >= 900) {
        player.regenTimer = 0;
        player.health = Math.min(player.maxHealth, player.health + 1);
      }
    }

    // ── INVINCIBLE TIMER ──
    if (player.invincible) {
      player.invincibleTimer -= dt;
      player.invincibleFlash = (player.invincibleFlash + 1) % 8;
      if (player.invincibleTimer <= 0) {
        player.invincible = false;
        player.invincibleFlash = 0;
      }
    }

    // ── SQUISH ANIMATION ──
    if (player.squishTimer > 0) {
      player.squishTimer--;
      const t = 1 - player.squishTimer / 8;
      player.squishY = 0.6 + t * 0.4;
    } else {
      player.squishY = 1;
    }

    // ── TRAIL ──
    player.trail.unshift({ x: player.x + player.w/2, y: player.y + player.h/2 });
    if (player.trail.length > 8) player.trail.pop();

    // ── OVERDRIVE GLOW ──
    if (GameState.overdriveTimer > 0) {
      player.overdriveGlow = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
    } else {
      player.overdriveGlow = 0;
    }
  }

  function handleSlamLanding(player, platform) {
    const radius = AbilityUpgrades.getSlamRadius(80);
    const pulses = AbilityUpgrades.slamPulseCount();

    for (let i = 0; i < pulses; i++) {
      Particles.shockwave(
        player.x + player.w/2,
        player.y + player.h - GameState.cameraY,
        '#ff6600', radius + i * 20
      );
    }

    if (AbilityUpgrades.slamDamagesEnemies()) {
      for (const e of Enemies.getAll()) {
        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist < radius) Enemies.hitEnemy(e, 2);
      }
    }

    if (AbilityUpgrades.slamBouncesUp()) {
      player.vy = player.jumpVelocity * 1.5;
    }

    GameState.screenShake = 8;
    SFX.play('slam_land');
    player.slamLanded = false;
  }

  function firePlayerBullet(player) {
    const baseDmg = player.bulletDamage
      * (GameState.overdriveTimer > 0 ? 1.5 : 1)
      * (AbilityUpgrades.slowBoostsDmg() && GameState.timeSlowTimer > 0 ? 1.5 : 1)
      * GunUpgrades.getDamageMult();

    const baseSpd = (AbilityUpgrades.slowBoostsBullets() && GameState.timeSlowTimer > 0 ? 14 : 10)
      * GunUpgrades.getBulletSpeedMult();

    const r      = GunUpgrades.getBulletRadius();
    const color  = GameState.overdriveTimer > 0 ? '#ffee00' : '#00f5ff';
    const pierce = GunUpgrades.getPiercingHits() > 0 || (AbilityUpgrades.overdriveAutoShoot() && GameState.overdriveTimer > 0);
    const hitsLeft = GunUpgrades.getPiercingHits() || 1;
    const mega   = GunUpgrades.shouldFireMega();

    // Mega bullet overrides everything
    if (mega) {
      Projectiles.addPlayerBullet(player.x + player.w/2, player.y - 5, 0, -baseSpd * 0.6,
        baseDmg * 4, { r: 7, color: '#ff00ff', glow: '#ff00ff', piercing: true, hitsLeft: 5,
          explosive: true, life: 180 });
      SFX.play('boost');
      return;
    }

    const count   = GunUpgrades.getBulletCount();
    const spread  = GunUpgrades.getBulletSpread();

    for (let i = 0; i < count; i++) {
      // Spread angle: centre bullet at 0, others offset
      const angleOffset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
      const vx = Math.sin(angleOffset) * baseSpd;
      const vy = -Math.cos(angleOffset) * baseSpd;

      Projectiles.addPlayerBullet(
        player.x + player.w/2 + i * (count > 1 ? 6 : 0), player.y - 5,
        vx, vy, baseDmg,
        {
          r, color, glow: color,
          piercing: pierce, hitsLeft,
          explosive: GunUpgrades.isExplosive(),
          canRicochet: GunUpgrades.canRicochet(),
          poison: GunUpgrades.hasPoison(),
          chainLightning: GunUpgrades.hasChainLightning(),
          life: 180,
        }
      );
    }
    SFX.play('shoot');
  }

  function takeDamage(amount) {
    const player = GameState.player;
    if (player.shielded) {
      // Shield absorbs the hit
      player.shieldHits -= amount;
      SFX.play('shield_hit');
      Particles.burst(player.x + player.w/2, player.y + player.h/2 - GameState.cameraY, '#00f5ff', 6);
      GameState.screenShake = 3;

      // es_9: convert blocked hits to HP
      if (AbilityUpgrades.shieldConvertsToHp()) {
        player.health = Math.min(player.maxHealth, player.health + 0.5);
      }

      // Brief grace after absorbing (20 frames only — NOT 60)
      player.invincible = true;
      player.invincibleTimer = 20;

      if (player.shieldHits <= 0) {
        player.shielded = false;
        // es_5: explode on break
        if (AbilityUpgrades.shieldExplodes()) {
          for (const e of Enemies.getAll()) {
            if (e.dead) continue;
            if (Math.hypot(e.x - player.x, e.y - player.y) < 90) Enemies.hitEnemy(e, 2);
          }
          Particles.shockwave(player.x + player.w/2, player.y + player.h/2 - GameState.cameraY, '#00f5ff', 90);
        }
      }
      return;
    }

    if (player.invincible) return; // normal invincibility frames

    const reducedDmg = amount * AbilityUpgrades.shieldReducesDmg();

    if (PlayerUpgrades.hasHealthSystem()) {
      player.health -= reducedDmg;
      UI.updateHealthBar(player.health, player.maxHealth);
      if (player.health <= 0) {
        if (PlayerUpgrades.hasRevive() && !player.reviveUsed) {
          player.reviveUsed = true;
          player.health = Math.ceil(player.maxHealth / 2);
          player.invincible = true;
          player.invincibleTimer = 180;
          UI.showToast('LAST CHANCE!');
          SFX.play('revive');
        } else {
          if (typeof handleGameOver === 'function') handleGameOver();
          else GameState.gameOver = true;
        }
      }
    } else {
      if (typeof handleGameOver === 'function') handleGameOver();
      else GameState.gameOver = true;
    }

    // Knockback
    player.invincible = true;
    player.invincibleTimer = 60;
    SFX.play('hurt');
    GameState.screenShake = 6;
    Particles.burst(player.x + player.w/2,
                    player.y + player.h/2 - GameState.cameraY,
                    '#ff0080', 8);
  }

  function draw(ctx, player, cameraY) {
    if (player.invincible && player.invincibleFlash >= 4) return; // flicker

    const drawX = player.x;
    const drawY = player.y - cameraY;
    const cx = drawX + player.w / 2;
    const cy = drawY + player.h / 2;
    const sy = player.squishY;

    ctx.save();
    ctx.translate(cx, cy);
    // Flip vertically when gravity is reversed
    if (GameState.gravityFlipped) ctx.scale(1, -1);
    ctx.scale(1 / sy, sy);
    ctx.translate(-cx, -cy);

    // Trail
    if (GameState.overdriveTimer > 0 || player.rocketActive) {
      for (let i = 0; i < player.trail.length; i++) {
        const t = player.trail[i];
        const alpha = (1 - i / player.trail.length) * 0.3;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = player.rocketActive ? '#ff6600' : '#ffee00';
        ctx.beginPath();
        ctx.arc(t.x, t.y - cameraY, (player.w / 2) * (1 - i / player.trail.length), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Body glow (overdrive)
    if (GameState.overdriveTimer > 0) {
      ctx.shadowColor = '#ffee00';
      ctx.shadowBlur = 20 + player.overdriveGlow * 15;
    } else if (player.shielded) {
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 18;
    } else {
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 10;
    }

    // Body
    const bodyGrad = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy, player.w / 2 + 2);
    if (GameState.overdriveTimer > 0) {
      bodyGrad.addColorStop(0, '#fff8c0');
      bodyGrad.addColorStop(0.6, '#ffcc00');
      bodyGrad.addColorStop(1, '#ff6600');
    } else {
      bodyGrad.addColorStop(0, '#00f5ff');
      bodyGrad.addColorStop(0.6, '#0066ff');
      bodyGrad.addColorStop(1, '#000066');
    }

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(drawX + 2, drawY + 6, player.w - 4, player.h - 6, 6);
    ctx.fill();

    // Head dome
    ctx.beginPath();
    ctx.ellipse(cx, drawY + 8, player.w / 2 - 2, 14, 0, Math.PI, 0);
    ctx.fill();

    // Visor
    ctx.shadowBlur = 0;
    ctx.fillStyle = GameState.overdriveTimer > 0 ? 'rgba(255,238,0,0.7)' : 'rgba(0,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(cx + player.facing * 2, drawY + 8, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx + player.facing * 2, drawY + 8, 3, 0, Math.PI * 2);
    ctx.fill();

    // Antenna
    ctx.strokeStyle = GameState.overdriveTimer > 0 ? '#ffee00' : '#00f5ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx, drawY + 2);
    ctx.lineTo(cx, drawY - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, drawY - 8, 3, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();

    // Shield bubble
    if (player.shielded) {
      ctx.restore();
      ctx.save();
      ctx.translate(cx, cy);
      const r = player.shieldBig ? player.w * 0.85 : player.w * 0.65;
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = 'rgba(0,245,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,245,255,0.06)';
      ctx.fill();
      ctx.translate(-cx, -cy);
    }

    ctx.restore();

    // Drone display
    if (GameState.drones) {
      for (const drone of GameState.drones) {
        drawDrone(ctx, drone);
      }
    }
  }

  function drawDrone(ctx, drone) {
    ctx.save();
    ctx.translate(drone.x, drone.y);
    const color = drone.elite ? '#ffee00' : '#9900ff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    // Drone body
    ctx.fillStyle = '#0d0d2e';
    ctx.beginPath();
    ctx.roundRect(-8, -6, 16, 12, 3);
    ctx.fill();
    ctx.stroke();
    // Drone eye
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    // Wings
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(-8, -4); ctx.lineTo(-8, 4); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 0); ctx.lineTo(8, -4); ctx.lineTo(8, 4); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  return { create, update, draw, takeDamage, W, H };
})();
