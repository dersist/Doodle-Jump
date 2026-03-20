// ═══════════════════════════════════════════
//  ABILITIES.JS — Base ability logic (10 abilities)
// ═══════════════════════════════════════════

const Abilities = (() => {
  // Cooldowns in frames (60fps)
  const BASE_COOLDOWNS = {
    rocket_surge:    180,
    phase_dash:      150,
    gravity_flip:    240,
    energy_shield:   200,
    pulse_slam:      120,
    drone:           300,
    time_distort:    260,
    platform_forge:  180,
    chaos_engine:    140,
    overdrive:       360,
  };

  // Active effect durations in frames
  const BASE_DURATIONS = {
    gravity_flip:   180,
    energy_shield:  200,
    drone:          600,
    time_distort:   180,
    overdrive:      240,
  };

  // Runtime state per ability
  let state = {};

  function init() {
    state = {};
    for (const id of Object.keys(BASE_COOLDOWNS)) {
      state[id] = {
        cooldown: 0,
        active: false,
        duration: 0,
        charges: id === 'rocket_surge' ? AbilityUpgrades.rocketCharges() : 1,
        maxCharges: id === 'rocket_surge' ? AbilityUpgrades.rocketCharges() : 1,
      };
    }
  }

  function activate(abilityId) {
    const s = state[abilityId];
    if (!s) return false;
    if (s.cooldown > 0) return false;
    if (!GameState.ownedAbilities[abilityId]) return false;

    switch (abilityId) {
      case 'rocket_surge':   doRocketSurge(); break;
      case 'phase_dash':     doPhaseDash(); break;
      case 'gravity_flip':   doGravityFlip(); break;
      case 'energy_shield':  doEnergyShield(); break;
      case 'pulse_slam':     doPulseSlam(); break;
      case 'drone':          doDrone(); break;
      case 'time_distort':   doTimeDistort(); break;
      case 'platform_forge': doPlatformForge(); break;
      case 'chaos_engine':   doChaosEngine(); break;
      case 'overdrive':      doOverdrive(); break;
    }

    // Set cooldown (adjusted by upgrades + player upgrades)
    const cdr = 1 - PlayerUpgrades.getCooldownReduction();
    let cd = BASE_COOLDOWNS[abilityId] * cdr;

    // Per-ability CDR upgrades
    if (abilityId === 'gravity_flip') cd *= AbilityUpgrades.getFlipCooldownMult();
    if (abilityId === 'time_distort') cd *= AbilityUpgrades.getSlowCooldownMult();
    if (abilityId === 'overdrive')    cd *= AbilityUpgrades.getOverdriveCooldownMult();

    s.cooldown = Math.max(30, cd);
    SFX.play('ability_use');
    return true;
  }

  // ── ROCKET SURGE ──
  function doRocketSurge() {
    const vel = AbilityUpgrades.getRocketMultiplier(-22);
    GameState.player.vy = vel;
    GameState.player.rocketActive = true;
    GameState.player.rocketSteering = AbilityUpgrades.rocketHasSteering();
    GameState.player.rocketTimer = 40;
    state['rocket_surge'].active = true;
    state['rocket_surge'].duration = 40;

    if (AbilityUpgrades.rocketHasShockwave()) {
      Particles.shockwave(
        GameState.player.x + GameState.player.w/2,
        GameState.player.y + GameState.player.h,
        '#00f5ff', 80
      );
    }
    if (AbilityUpgrades.rocketPullsCoins()) {
      Coins.pullNearby(GameState.player.x + GameState.player.w/2,
                       GameState.player.y + GameState.player.h/2, 200);
    }
    Particles.burst(GameState.player.x + GameState.player.w/2,
                    GameState.player.y + GameState.player.h - GameState.cameraY,
                    '#ff6600', 15);
  }

  // ── PHASE DASH ──
  function doPhaseDash() {
    const player = GameState.player;
    const dist = AbilityUpgrades.getDashDistance(180);
    const dir = Input.isMovingLeft() ? -1 : 1;

    if (AbilityUpgrades.dashAutoTargets()) {
      // Find nearest platform
      let nearest = null, nearestDist = Infinity;
      for (const p of Platforms.getAll()) {
        const d = Math.hypot(p.x - player.x, p.y - player.y);
        if (d < nearestDist) { nearestDist = d; nearest = p; }
      }
      if (nearest) {
        player.x = nearest.x + nearest.w/2 - player.w/2;
        player.y = nearest.y - player.h;
        player.vy = Physics.BASE_JUMP;
      }
    } else {
      player.x += dir * dist;
    }

    player.dashPhasing = AbilityUpgrades.dashPhasesEnemies();

    if (AbilityUpgrades.dashResetsJump()) {
      player.vy = Math.min(player.vy, Physics.BASE_JUMP);
    }

    if (AbilityUpgrades.dashSlowsTime()) {
      GameState.timeSlowTimer = 60;
      GameState.timeSlowFactor = 0.4;
    }

    if (AbilityUpgrades.dashGivesShield()) {
      player.shielded = true;
      player.shieldTimer = 60;
    }

    if (AbilityUpgrades.dashHasTrail()) {
      Particles.trail(player.x + player.w/2,
                      player.y + player.h/2 - GameState.cameraY,
                      '#9900ff', 10);
    }

    Physics.wrapX(player, GameState.canvasW);
    Particles.burst(player.x + player.w/2,
                    player.y + player.h/2 - GameState.cameraY,
                    '#9900ff', 12);
  }

  // ── GRAVITY FLIP ──
  function doGravityFlip() {
    GameState.gravityFlipped = !GameState.gravityFlipped;
    const dur = AbilityUpgrades.getFlipDuration(BASE_DURATIONS.gravity_flip);
    state['gravity_flip'].active = true;
    state['gravity_flip'].duration = dur;
    GameState.player.vy = 0;

    if (AbilityUpgrades.flipSpawnsPlatforms()) {
      const canvasW = GameState.canvasW;
      for (let i = 0; i < 3; i++) {
        Platforms.addPlatform('normal',
          Math.random() * (canvasW - 70),
          GameState.cameraY + (GameState.gravityFlipped ? 80 : 400)
        );
      }
    }

    Particles.burst(GameState.player.x + GameState.player.w/2,
                    GameState.player.y + GameState.player.h/2 - GameState.cameraY,
                    '#00f5ff', 20);
    GameState.screenShake = 8;
  }

  // ── ENERGY SHIELD ──
  function doEnergyShield() {
    const player = GameState.player;
    const dur = AbilityUpgrades.getShieldDuration(BASE_DURATIONS.energy_shield);
    player.shielded = true;
    player.shieldHits = AbilityUpgrades.getShieldHits();
    player.shieldTimer = dur;
    player.reflectBullets = AbilityUpgrades.shieldReflects();
    player.shieldBig = AbilityUpgrades.shieldIsBigger();
    state['energy_shield'].active = true;
    state['energy_shield'].duration = dur;
  }

  // ── PULSE SLAM ──
  function doPulseSlam() {
    const player = GameState.player;
    if (!player.onGround) {
      player.slamming = true;
      player.vy = 20 * AbilityUpgrades.getSlamSpeedMult();
    }
    state['pulse_slam'].active = true;
  }

  // ── DRONE ──
  function doDrone() {
    const count = AbilityUpgrades.getDroneCount();
    GameState.drones = [];
    for (let i = 0; i < count; i++) {
      GameState.drones.push({
        x: GameState.player.x + GameState.player.w/2,
        y: GameState.player.y - 30 - i * 25,
        angle: (i / count) * Math.PI * 2,
        shootTimer: 0,
        orbitRadius: 40 + i * 10,
        elite: AbilityUpgrades.droneIsElite(),
      });
    }
    const dur = AbilityUpgrades.getDroneCount() * BASE_DURATIONS.drone / AbilityUpgrades.getDroneCount();
    state['drone'].active = true;
    state['drone'].duration = BASE_DURATIONS.drone;
  }

  // ── TIME DISTORT ──
  function doTimeDistort() {
    const dur = AbilityUpgrades.getSlowDuration(BASE_DURATIONS.time_distort);
    const factor = AbilityUpgrades.getSlowFactor();
    GameState.timeSlowTimer = dur;
    GameState.timeSlowFactor = factor;
    GameState.timeSlowPlayerUnaffected = AbilityUpgrades.slowPlayerUnaffected();
    state['time_distort'].active = true;
    state['time_distort'].duration = dur;
    Particles.ring(GameState.player.x + GameState.player.w/2,
                   GameState.player.y + GameState.player.h/2 - GameState.cameraY,
                   '#00f5ff', 100);
  }

  // ── PLATFORM FORGE ──
  function doPlatformForge() {
    const player = GameState.player;
    const count = AbilityUpgrades.getForgeCount();
    const w = AbilityUpgrades.getForgeWidth(70);
    const type = AbilityUpgrades.forgeIsBoost() ? 'boost' : 'normal';

    for (let i = 0; i < count; i++) {
      const px = player.x + (i - Math.floor(count/2)) * (w + 10);
      const py = player.y + player.h + 20 + i * 40;
      const p = {
        type, x: px, y: py, w, h: 12,
        broken: false, breakTimer: 0,
        phaseTimer: 0, phaseVisible: true,
        moveDir: AbilityUpgrades.forgeIsMoving() ? 1 : 0,
        moveSpeed: 1.5,
        forged: true,
        forgeLife: AbilityUpgrades.getForgeDuration(180),
        hasCoin: false, coinCollected: false,
      };
      Platforms.getAll().push(p);
    }
    state['platform_forge'].active = true;
    SFX.play('forge');
  }

  // ── CHAOS ENGINE ──
  function doChaosEngine() {
    const effects = buildChaosPool();
    const count = AbilityUpgrades.chaosChains() ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * effects.length);
      applyChaosEffect(effects[idx]);
    }
    if (AbilityUpgrades.chaosDoubles()) {
      const idx = Math.floor(Math.random() * effects.length);
      applyChaosEffect(effects[idx]);
    }
  }

  function buildChaosPool() {
    let positive = [
      'mega_jump', 'coins_shower', 'kill_all', 'full_heal', 'boost_speed',
      'slow_enemies', 'free_platforms', 'score_bonus', 'shield',
    ];
    let negative = ['gravity_surge', 'speed_cut', 'lose_coins'];

    if (AbilityUpgrades.chaosHasBetterPool()) positive.push('overdrive_burst', 'invincible');
    if (AbilityUpgrades.chaosFewerNegatives() || AbilityUpgrades.chaosNoNegatives()) negative = [];
    if (AbilityUpgrades.chaosAlwaysPositive()) return positive;
    if (AbilityUpgrades.chaosPositiveBias()) {
      return [...positive, ...positive, ...positive, ...negative];
    }
    return [...positive, ...positive, ...negative];
  }

  function applyChaosEffect(effect) {
    const dur = AbilityUpgrades.chaosLongDuration() ? 300 : 180;
    const player = GameState.player;

    switch (effect) {
      case 'mega_jump':     player.vy = -25; break;
      case 'coins_shower':  Coins.showerCoins(GameState.canvasW, GameState.cameraY); break;
      case 'kill_all':      for (const e of Enemies.getAll()) Enemies.killEnemy(e); break;
      case 'full_heal':     if (player.health < player.maxHealth) player.health = player.maxHealth; break;
      case 'boost_speed':   GameState.speedBoostTimer = dur; break;
      case 'slow_enemies':  GameState.timeSlowTimer = dur; GameState.timeSlowFactor = 0.5; break;
      case 'free_platforms':
        for (let i = 0; i < 4; i++) {
          Platforms.addPlatform('spring', Math.random() * GameState.canvasW, player.y + i * 40);
        }
        break;
      case 'score_bonus':   GameState.score += 100; UI.showToast('+100 CHAOS BONUS!'); break;
      case 'shield':        player.shielded = true; player.shieldTimer = 120; player.shieldHits = 2; break;
      case 'overdrive_burst': player.gravityMult = 0.5; GameState.overdriveTimer = 120; break;
      case 'invincible':    player.invincible = true; player.invincibleTimer = dur; break;
      case 'gravity_surge': GameState.player.vy = 20; break;
      case 'speed_cut':     GameState.speedCutTimer = 90; break;
      case 'lose_coins':    GameState.coins = Math.max(0, GameState.coins - 20); break;
    }
    UI.showToast('CHAOS: ' + effect.replace(/_/g, ' ').toUpperCase());
    SFX.play('chaos');
  }

  // ── OVERDRIVE ──
  function doOverdrive() {
    const dur = AbilityUpgrades.getOverdriveDuration(BASE_DURATIONS.overdrive);
    const mult = AbilityUpgrades.getOverdriveMult();
    GameState.overdriveTimer = dur;
    GameState.overdriveMult = mult;
    const player = GameState.player;

    player.jumpVelocityMult = 1 + 0.4 * mult;
    player.moveSpeedMult = 1 + 0.3 * mult;
    if (AbilityUpgrades.overdriveReducesGravity()) player.gravityMult = 0.5;
    if (AbilityUpgrades.overdriveBoostsSpeed()) player.moveSpeedMult *= 1.5;

    state['overdrive'].active = true;
    state['overdrive'].duration = dur;
    GameState.screenShake = 10;
    Particles.burst(player.x + player.w/2,
                    player.y + player.h/2 - GameState.cameraY,
                    '#ffee00', 25);
    SFX.play('overdrive');
  }

  function update(dt) {
    // Tick cooldowns and active durations
    for (const [id, s] of Object.entries(state)) {
      if (s.cooldown > 0) {
        const tick = GameState.overdriveTimer > 0 && AbilityUpgrades.overdriveBoostsAbilities() ? dt * 2 : dt;
        s.cooldown = Math.max(0, s.cooldown - tick);
      }
      if (s.active && s.duration > 0) {
        s.duration -= dt;
        if (s.duration <= 0) {
          s.active = false;
          onAbilityEnd(id);
        }
      }
    }

    // Tick gravity flip duration
    if (state['gravity_flip'] && !state['gravity_flip'].active && GameState.gravityFlipped) {
      GameState.gravityFlipped = false;
    }

    // Handle forged platform life
    for (const p of Platforms.getAll()) {
      if (p.forged) {
        p.forgeLife--;
        if (p.forgeLife <= 0) p.broken = true;
      }
    }

    // Drone orbit & shooting
    if (GameState.drones && GameState.drones.length > 0 && state['drone'] && state['drone'].active) {
      const player = GameState.player;
      for (const drone of GameState.drones) {
        drone.angle += 0.04;
        drone.x = player.x + player.w/2 + Math.cos(drone.angle) * drone.orbitRadius;
        drone.y = player.y + player.h/2 + Math.sin(drone.angle) * drone.orbitRadius - GameState.cameraY;

        if (AbilityUpgrades.droneShoots()) {
          const fireMult = AbilityUpgrades.getDroneFireMult();
          const interval = Math.round(90 / fireMult);
          drone.shootTimer++;
          if (drone.shootTimer >= interval) {
            drone.shootTimer = 0;
            // Find nearest enemy
            let target = null, nearestD = Infinity;
            for (const e of Enemies.getAll()) {
              if (e.dead) continue;
              const d = Math.hypot(e.x - drone.x, (e.y - GameState.cameraY) - drone.y);
              if (d < nearestD) { nearestD = d; target = e; }
            }
            if (target) {
              const dx = (target.x + target.w/2) - drone.x;
              const dy = (target.y - GameState.cameraY + target.h/2) - drone.y;
              const dist = Math.hypot(dx, dy);
              const spd = drone.elite ? 8 : 5;
              const dmg = drone.elite ? 3 : 1;
              Projectiles.addPlayerBullet(
                drone.x, drone.y + GameState.cameraY,
                (dx/dist) * spd, (dy/dist) * spd,
                dmg,
                {
                  r: drone.elite ? 7 : 5,
                  color: '#9900ff',
                  glow: '#9900ff',
                  explosive: AbilityUpgrades.droneIsExplosive(),
                }
              );
            }
          }
        }
      }
    }
  }

  function onAbilityEnd(id) {
    switch (id) {
      case 'gravity_flip':
        GameState.gravityFlipped = false;
        if (AbilityUpgrades.flipPullsEnemies()) {
          // Enemies snap back
        }
        break;
      case 'energy_shield':
        GameState.player.shielded = false;
        break;
      case 'drone':
        GameState.drones = [];
        break;
      case 'time_distort':
        if (AbilityUpgrades.slowFreezesAtEnd()) {
          GameState.freezeTimer = 90;
        }
        GameState.timeSlowTimer = 0;
        GameState.timeSlowFactor = 1;
        break;
      case 'overdrive':
        GameState.overdriveTimer = 0;
        GameState.player.jumpVelocityMult = 1;
        GameState.player.moveSpeedMult = 1;
        GameState.player.gravityMult = 1;
        break;
    }
  }

  function getState(abilityId) { return state[abilityId]; }
  function getAllStates() { return state; }
  function getCooldown(id) { return state[id] ? state[id].cooldown : 0; }
  function getMaxCooldown(id) {
    const cdr = 1 - PlayerUpgrades.getCooldownReduction();
    return BASE_COOLDOWNS[id] * cdr;
  }
  function isActive(id) { return state[id] ? state[id].active : false; }

  return { init, activate, update, getState, getAllStates, getCooldown, getMaxCooldown, isActive };
})();
