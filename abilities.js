// ═══════════════════════════════════════════
//  ABILITIES.JS — All 10 abilities, fully implemented
// ═══════════════════════════════════════════

const Abilities = (() => {
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

  const BASE_DURATIONS = {
    gravity_flip:   180,
    energy_shield:  200,
    drone:          600,
    time_distort:   180,
    overdrive:      240,
  };

  let state = {};

  function init() {
    state = {};
    for (const id of Object.keys(BASE_COOLDOWNS)) {
      const maxCharges = id === 'rocket_surge' ? AbilityUpgrades.rocketCharges() : 1;
      state[id] = {
        cooldown: 0,
        active: false,
        duration: 0,
        charges: maxCharges,
        maxCharges,
      };
    }
  }

  function activate(abilityId) {
    const s = state[abilityId];
    if (!s) return false;
    if (!GameState.ownedAbilities[abilityId]) return false;

    // Charge-based abilities (Rocket with rs_7)
    if (abilityId === 'rocket_surge' && s.maxCharges > 1) {
      if (s.charges <= 0) return false; // waiting on recharge
      s.charges--;
      doRocketSurge();
      // Only start cooldown when all charges are spent
      if (s.charges <= 0) {
        const cdr = 1 - PlayerUpgrades.getCooldownReduction();
        s.cooldown = Math.max(30, BASE_COOLDOWNS[abilityId] * cdr);
      }
      SFX.play('ability_use');
      return true;
    }

    if (s.cooldown > 0) return false;

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

    const cdr = 1 - PlayerUpgrades.getCooldownReduction();
    let cd = BASE_COOLDOWNS[abilityId] * cdr;
    if (abilityId === 'gravity_flip') cd *= AbilityUpgrades.getFlipCooldownMult();
    if (abilityId === 'time_distort') cd *= AbilityUpgrades.getSlowCooldownMult();
    if (abilityId === 'overdrive')    cd *= AbilityUpgrades.getOverdriveCooldownMult();

    s.cooldown = Math.max(30, cd);
    SFX.play('ability_use');
    return true;
  }

  // ── ROCKET SURGE ──────────────────────────────────────────
  function doRocketSurge() {
    const player = GameState.player;
    const vel = AbilityUpgrades.getRocketMultiplier(-22);
    player.vy = vel;
    player.rocketActive = true;
    player.rocketSteering = AbilityUpgrades.rocketHasSteering();
    player.rocketTimer = 50;

    // rs_3: damage trail — handled in player.js update
    // rs_4: break platforms on launch
    if (AbilityUpgrades.rocketBreaksPlatforms()) {
      for (const p of Platforms.getAll()) {
        const dist = Math.hypot(p.x + p.w/2 - (player.x + player.w/2), p.y - player.y);
        if (dist < 80 && (p.type === 'breaking' || p.type === 'normal')) {
          p.broken = true; p.breakTimer = 0;
        }
      }
    }

    // rs_6: damages enemies you pass through — handled in player.js update
    // rs_8: shockwave on launch
    if (AbilityUpgrades.rocketHasShockwave()) {
      Particles.shockwave(player.x + player.w/2, player.y + player.h - GameState.cameraY, '#ff6600', 100);
      for (const e of Enemies.getAll()) {
        if (e.dead) continue;
        const d = Math.hypot(e.x + e.w/2 - (player.x + player.w/2), e.y - player.y);
        if (d < 100) Enemies.hitEnemy(e, 2);
      }
    }

    // rs_9: pull nearby coins
    if (AbilityUpgrades.rocketPullsCoins()) {
      Coins.pullNearby(player.x + player.w/2, player.y + player.h/2, 250);
    }

    Particles.burst(player.x + player.w/2, player.y + player.h - GameState.cameraY, '#ff6600', 18);
    state['rocket_surge'].active = true;
    state['rocket_surge'].duration = 50;
  }

  // ── PHASE DASH ────────────────────────────────────────────
  function doPhaseDash() {
    const player = GameState.player;
    const fromX = player.x + player.w/2;
    const fromY = player.y + player.h/2 - GameState.cameraY;

    // pd_4: trail from SOURCE position (before moving)
    if (AbilityUpgrades.dashHasTrail()) {
      for (let i = 0; i < 8; i++) {
        Particles.burst(fromX + (Math.random()-0.5)*20, fromY + (Math.random()-0.5)*20, '#9900ff', 3);
      }
    }

    const dir = Input.isMovingLeft() ? -1 : 1;

    if (AbilityUpgrades.dashAutoTargets()) {
      // pd_6: teleport to nearest safe platform above
      let nearest = null, nearestDist = Infinity;
      for (const p of Platforms.getAll()) {
        if (p.broken || p.cracking) continue;
        if (p.type === 'spiky' || p.type === 'phase') continue;
        if (p.y >= player.y) continue; // must be above
        const d = Math.hypot(p.x + p.w/2 - (player.x + player.w/2), p.y - player.y);
        if (d < nearestDist) { nearestDist = d; nearest = p; }
      }
      if (nearest) {
        player.x = nearest.x + nearest.w/2 - player.w/2;
        player.y = nearest.y - player.h;
        player.vy = Physics.BASE_JUMP;
      }
    } else {
      const dist = AbilityUpgrades.getDashDistance(180);
      player.x += dir * dist;
    }

    // pd_5: double dash — queue a second activation in 15 frames
    if (AbilityUpgrades.dashIsDouble()) {
      state['phase_dash']._doubleQueued = true;
      state['phase_dash']._doubleTimer = 15;
    }

    // pd_3: phase through enemies briefly
    player.dashPhasing = AbilityUpgrades.dashPhasesEnemies();
    if (player.dashPhasing) {
      player.dashPhaseTimer = 45;
    }

    // pd_7: reset jump velocity
    if (AbilityUpgrades.dashResetsJump()) {
      player.vy = Physics.BASE_JUMP;
    }

    // pd_8: slow time briefly
    if (AbilityUpgrades.dashSlowsTime()) {
      GameState.timeSlowTimer = 90;
      GameState.timeSlowFactor = 0.35;
    }

    // pd_9: brief invincibility on arrival
    if (AbilityUpgrades.dashGivesShield()) {
      player.invincible = true;
      player.invincibleTimer = 60;
    }

    Physics.wrapX(player, GameState.canvasW);

    // Trail at DESTINATION
    const toX = player.x + player.w/2;
    const toY = player.y + player.h/2 - GameState.cameraY;
    Particles.burst(toX, toY, '#9900ff', 14);

    // pd_4: draw line of particles between source and destination
    if (AbilityUpgrades.dashHasTrail()) {
      const steps = 8;
      for (let i = 1; i < steps; i++) {
        const tx = fromX + (toX - fromX) * (i / steps);
        const ty = fromY + (toY - fromY) * (i / steps);
        Particles.burst(tx, ty, '#cc00ff', 4);
      }
    }
  }

  // ── GRAVITY FLIP ──────────────────────────────────────────
  function doGravityFlip() {
    GameState.gravityFlipped = !GameState.gravityFlipped;
    const dur = AbilityUpgrades.getFlipDuration(BASE_DURATIONS.gravity_flip);
    state['gravity_flip'].active = true;
    state['gravity_flip'].duration = dur;
    GameState.player.vy = 0; // reset velocity on flip

    // gf_4: pull enemies toward ceiling
    if (AbilityUpgrades.flipPullsEnemies()) {
      for (const e of Enemies.getAll()) {
        if (e.dead) continue;
        e.vy = GameState.gravityFlipped ? -3 : 3;
      }
    }

    // gf_6: slow enemies while flipped
    if (AbilityUpgrades.flipSlowsEnemies() && GameState.gravityFlipped) {
      GameState.timeSlowTimer = dur;
      GameState.timeSlowFactor = 0.5;
    }

    // gf_7: spawn safe platforms near ceiling
    if (AbilityUpgrades.flipSpawnsPlatforms()) {
      const canvasW = GameState.canvasW;
      const spawnY = GameState.cameraY + (GameState.gravityFlipped ? 80 : GameState.canvasH - 80);
      for (let i = 0; i < 3; i++) {
        Platforms.addPlatform('normal', Math.random() * (canvasW - 70) + 35, spawnY + i * 70);
      }
    }

    Particles.burst(GameState.player.x + GameState.player.w/2,
                    GameState.player.y + GameState.player.h/2 - GameState.cameraY,
                    '#00f5ff', 24);
    GameState.screenShake = 8;
  }

  // ── ENERGY SHIELD ─────────────────────────────────────────
  // NERFED: base = 1 hit, 90 frames. Upgrades add hits and duration.
  function doEnergyShield() {
    const player = GameState.player;
    const dur = AbilityUpgrades.getShieldDuration(90); // BASE 90 frames (1.5s), not 200
    player.shielded = true;
    player.shieldHits = AbilityUpgrades.getShieldHits(); // 1 base, up to 3 with upgrades
    player.shieldTimer = dur;
    player.reflectBullets = AbilityUpgrades.shieldReflects();
    player.shieldBig = AbilityUpgrades.shieldIsBigger();
    state['energy_shield'].active = true;
    state['energy_shield'].duration = dur;
    Particles.ring(player.x + player.w/2, player.y + player.h/2 - GameState.cameraY, '#00f5ff', 60);
  }

  // ── PULSE SLAM ────────────────────────────────────────────
  function doPulseSlam() {
    const player = GameState.player;
    player.slamming = true;
    player.vy = 22 * AbilityUpgrades.getSlamSpeedMult();
    // ps_8: pull enemies into slam zone
    if (AbilityUpgrades.slamPullsEnemies()) {
      for (const e of Enemies.getAll()) {
        if (e.dead) continue;
        const dx = (player.x + player.w/2) - (e.x + e.w/2);
        const dy = (player.y + player.h/2) - (e.y + e.h/2);
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < 200) { e.vx += (dx/d) * 3; if (!e.useScreenY) e.vy += (dy/d) * 3; }
      }
    }
    state['pulse_slam'].active = true;
  }

  // ── DRONE ─────────────────────────────────────────────────
  function doDrone() {
    const count = AbilityUpgrades.getDroneCount();
    GameState.drones = [];
    for (let i = 0; i < count; i++) {
      GameState.drones.push({
        x: GameState.player.x + GameState.player.w/2,
        y: GameState.player.y - 30,
        angle: (i / count) * Math.PI * 2,
        shootTimer: 0,
        orbitRadius: 50 + i * 15,
        elite: AbilityUpgrades.droneIsElite(),
      });
    }
    state['drone'].active = true;
    state['drone'].duration = BASE_DURATIONS.drone;
  }

  // ── TIME DISTORT ──────────────────────────────────────────
  function doTimeDistort() {
    const dur = AbilityUpgrades.getSlowDuration(180);
    const factor = AbilityUpgrades.getSlowFactor();
    GameState.timeSlowTimer = dur;
    GameState.timeSlowFactor = factor;
    GameState.timeSlowPlayerUnaffected = AbilityUpgrades.slowPlayerUnaffected();
    state['time_distort'].active = true;
    state['time_distort'].duration = dur;
    Particles.ring(GameState.player.x + GameState.player.w/2,
                   GameState.player.y + GameState.player.h/2 - GameState.cameraY,
                   '#00f5ff', 120);
    UI.showToast('⏱ TIME DISTORTED!', 1500);
  }

  // ── PLATFORM FORGE ────────────────────────────────────────
  function doPlatformForge() {
    const player = GameState.player;
    const count = AbilityUpgrades.getForgeCount();
    const w = AbilityUpgrades.getForgeWidth(70);
    const type = AbilityUpgrades.forgeIsBoost() ? 'boost' : 'normal';
    const life = AbilityUpgrades.getForgeDuration(180);

    if (AbilityUpgrades.forgeAutoPlaces()) {
      // pf_7: place platforms under player's current trajectory
      for (let i = 0; i < count; i++) {
        Platforms.getAll().push({
          type, x: player.x - w/2 + player.w/2, y: player.y + player.h + 5 + i * 70,
          w, h: 12, broken: false, breakTimer: 0, phaseTimer: 0, phaseVisible: true,
          moveDir: AbilityUpgrades.forgeIsMoving() ? 1 : 0, moveSpeed: 1.5,
          forged: true, forgeLife: life, hasCoin: false, coinCollected: false,
        });
      }
    } else {
      for (let i = 0; i < count; i++) {
        const px = player.x + player.w/2 + (i - Math.floor(count/2)) * (w + 15) - w/2;
        const py = player.y + player.h + 10;
        Platforms.getAll().push({
          type, x: px, y: py, w, h: 12,
          broken: false, breakTimer: 0, phaseTimer: 0, phaseVisible: true,
          moveDir: AbilityUpgrades.forgeIsMoving() ? 1 : 0, moveSpeed: 1.5,
          forged: true, forgeLife: life, hasCoin: false, coinCollected: false,
        });
      }
    }

    // pf_9: chain path — also forge 2 platforms further up
    if (AbilityUpgrades.forgeChains()) {
      for (let i = 0; i < 2; i++) {
        const px = Math.random() * (GameState.canvasW - w - 20) + 10;
        const py = player.y - 80 - i * 100;
        Platforms.getAll().push({
          type, x: px, y: py, w, h: 12,
          broken: false, breakTimer: 0, phaseTimer: 0, phaseVisible: true,
          moveDir: 0, moveSpeed: 0, forged: true, forgeLife: life,
          hasCoin: false, coinCollected: false,
        });
      }
    }

    state['platform_forge'].active = true;
    SFX.play('forge');
    Particles.burst(player.x + player.w/2, player.y + player.h - GameState.cameraY, '#9900ff', 12);
  }

  // ── CHAOS ENGINE ──────────────────────────────────────────
  function doChaosEngine() {
    const effects = buildChaosPool();
    let count = 1;
    if (AbilityUpgrades.chaosChains()) count = 2;
    if (AbilityUpgrades.chaosDoubles()) count = Math.max(count, 2);

    const chosen = [];
    for (let i = 0; i < count; i++) {
      chosen.push(effects[Math.floor(Math.random() * effects.length)]);
    }
    // Deduplicate if needed, then apply
    chosen.forEach(e => applyChaosEffect(e));
  }

  function buildChaosPool() {
    let positive = [
      'mega_jump', 'coins_shower', 'kill_all', 'full_heal', 'boost_speed',
      'slow_enemies', 'free_platforms', 'score_bonus', 'shield',
    ];
    if (AbilityUpgrades.chaosHasBetterPool()) positive.push('overdrive_burst', 'invincible', 'super_jump');
    if (AbilityUpgrades.chaosHasRare()) positive.push('mega_coins', 'kill_and_heal');

    let negative = ['gravity_surge', 'speed_cut', 'lose_coins'];
    if (AbilityUpgrades.chaosFewerNegatives()) negative = ['speed_cut'];
    if (AbilityUpgrades.chaosNoNegatives() || AbilityUpgrades.chaosAlwaysPositive()) negative = [];

    if (AbilityUpgrades.chaosAlwaysPositive()) return positive;
    if (AbilityUpgrades.chaosPositiveBias()) return [...positive, ...positive, ...positive, ...negative];
    return [...positive, ...positive, ...negative];
  }

  function applyChaosEffect(effect) {
    const dur = AbilityUpgrades.chaosLongDuration() ? 300 : 180;
    const player = GameState.player;
    const labels = {
      mega_jump:      '🚀 MEGA JUMP!',      super_jump:     '🚀🚀 SUPER JUMP!',
      coins_shower:   '◈ COIN SHOWER!',      mega_coins:     '◈◈ MEGA COINS!',
      kill_all:       '💀 ENEMIES WIPED!',   kill_and_heal:  '💀❤️ KILL & HEAL!',
      full_heal:      '❤️ FULL HEAL!',       boost_speed:    '⚡ SPEED BOOST!',
      slow_enemies:   '⏱ SLOW FIELD!',       free_platforms: '🪄 FREE PLATFORMS!',
      score_bonus:    '⭐ +200 SCORE!',       shield:         '🛡 SHIELD!',
      overdrive_burst:'🔥 OVERDRIVE!',        invincible:     '✨ INVINCIBLE!',
      gravity_surge:  '⬇ GRAVITY SURGE!',    speed_cut:      '🐢 SPEED CUT!',
      lose_coins:     '💸 COIN DRAIN!',
    };

    switch (effect) {
      case 'mega_jump':     player.vy = -22; break;                        // was -28
      case 'super_jump':    player.vy = -30; break;                        // was -38
      case 'coins_shower':  Coins.showerCoins(GameState.canvasW, GameState.cameraY); break;
      case 'mega_coins':
        Coins.showerCoins(GameState.canvasW, GameState.cameraY);
        Coins.showerCoins(GameState.canvasW, GameState.cameraY);
        break;
      case 'kill_all':
        for (const e of Enemies.getAll()) Enemies.killEnemy(e);
        break;
      case 'kill_and_heal':
        for (const e of Enemies.getAll()) Enemies.killEnemy(e);
        if (player.health < player.maxHealth) player.health = Math.min(player.maxHealth, player.health + 1);
        break;
      case 'full_heal':
        if (player.health < player.maxHealth) player.health = player.maxHealth;
        break;
      case 'boost_speed':   GameState.speedBoostTimer = dur; break;
      case 'slow_enemies':
        GameState.timeSlowTimer = dur;
        GameState.timeSlowFactor = 0.5;
        break;
      case 'free_platforms':
        for (let i = 0; i < 4; i++) {
          Platforms.addPlatform('normal', Math.random() * GameState.canvasW, player.y - 60 - i * 80);
        }
        break;
      case 'score_bonus':   GameState.score += 150; break;
      case 'shield':
        player.shielded = true;
        player.shieldTimer = 90;
        player.shieldHits = 1;
        break;
      case 'overdrive_burst':                                              // nerfed
        player.gravityMult      = 0.82;
        player.jumpVelocityMult = 1.15;
        player.moveSpeedMult    = 1.15;
        GameState.overdriveTimer = 120;
        GameState.overdriveMult  = 1.0;
        break;
      case 'invincible':
        player.invincible = true;
        player.invincibleTimer = Math.min(dur, 150);                       // cap at 2.5s
        break;
      case 'gravity_surge': player.vy = 18; break;
      case 'speed_cut':     GameState.speedCutTimer = 90; break;
      case 'lose_coins': {
        const loss = Math.floor(GameState.coins * 0.1);
        GameState.coins = Math.max(0, GameState.coins - loss);
        GameState.totalCoins = Math.max(0, GameState.totalCoins - loss);
        break;
      }
    }
    UI.showToast('CHAOS: ' + (labels[effect] || effect), 2000);
    SFX.play('chaos');
  }

  // ── OVERDRIVE — nerfed to ~30% of previous power ─────────
  function doOverdrive() {
    const dur = AbilityUpgrades.getOverdriveDuration(BASE_DURATIONS.overdrive);
    const mult = AbilityUpgrades.getOverdriveMult(); // 1.0 base, 1.5 with od_2
    GameState.overdriveTimer = dur;
    GameState.overdriveMult = mult;
    const player = GameState.player;

    // od_2 upgrade: 15% jump boost (was 50%), 12% speed boost (was 40%)
    player.jumpVelocityMult = 1 + 0.15 * mult;
    player.moveSpeedMult    = 1 + 0.12 * mult;

    // od_6: slight gravity reduction
    if (AbilityUpgrades.overdriveReducesGravity()) player.gravityMult = 0.82;

    // od_7: small extra speed
    if (AbilityUpgrades.overdriveBoostsSpeed()) player.moveSpeedMult *= 1.15;

    // od_9: max power — still capped and balanced
    if (AbilityUpgrades.overdriveMaxPower()) {
      player.jumpVelocityMult = 1.35;
      player.moveSpeedMult    = 1.30;
      player.gravityMult      = 0.78;
    }

    state['overdrive'].active   = true;
    state['overdrive'].duration = dur;
    GameState.screenShake = 6;
    Particles.burst(player.x + player.w/2, player.y + player.h/2 - GameState.cameraY, '#ffee00', 18);
    SFX.play('overdrive');
    UI.showToast('⚡ OVERDRIVE!', 1200);
  }

  // ── UPDATE ────────────────────────────────────────────────
  function update(dt) {
    for (const [id, s] of Object.entries(state)) {
      // Cooldown tick
      if (s.cooldown > 0) {
        const tick = GameState.overdriveTimer > 0 && AbilityUpgrades.overdriveBoostsAbilities()
          ? dt * 2 : dt;
        s.cooldown = Math.max(0, s.cooldown - tick);
        // Recharge charges when cooldown finishes
        if (s.cooldown === 0 && s.charges < s.maxCharges) {
          s.charges = s.maxCharges;
        }
      }

      // Active duration tick
      if (s.active && s.duration > 0) {
        s.duration -= dt;
        if (s.duration <= 0) {
          s.active = false;
          onAbilityEnd(id);
        }
      }
    }

    // Gravity flip: end when duration expires
    if (state['gravity_flip'] && !state['gravity_flip'].active && GameState.gravityFlipped) {
      GameState.gravityFlipped = false;
    }

    // Phase dash: double-dash timer
    const ds = state['phase_dash'];
    if (ds && ds._doubleQueued) {
      ds._doubleTimer--;
      if (ds._doubleTimer <= 0) {
        ds._doubleQueued = false;
        // Second dash: just horizontal, no platform teleport
        const player = GameState.player;
        const dir = player.facing || 1;
        const dist = AbilityUpgrades.getDashDistance(180) * 0.7;
        player.x += dir * dist;
        Physics.wrapX(player, GameState.canvasW);
        Particles.burst(player.x + player.w/2, player.y + player.h/2 - GameState.cameraY, '#cc00ff', 10);
      }
    }

    // Phase enemy-phasing timer
    const player = GameState.player;
    if (player && player.dashPhasing && player.dashPhaseTimer > 0) {
      player.dashPhaseTimer -= dt;
      if (player.dashPhaseTimer <= 0) player.dashPhasing = false;
    }

    // Forged platform life
    for (const p of Platforms.getAll()) {
      if (p.forged) {
        p.forgeLife -= dt;
        if (p.forgeLife <= 0) { p.broken = true; p.breakTimer = 0; }
      }
    }

    // Time distort: extend on kill
    if (AbilityUpgrades.slowExtendsOnKill() && GameState.timeSlowTimer > 0) {
      const kills = Enemies.getAll().filter(e => e.justKilled);
      if (kills.length > 0) GameState.timeSlowTimer += kills.length * 30;
      kills.forEach(e => e.justKilled = false);
    }

    // Drone orbit & shooting
    if (GameState.drones?.length > 0 && state['drone']?.active) {
      for (const drone of GameState.drones) {
        drone.angle += 0.045 * dt;
        drone.x = player.x + player.w/2 + Math.cos(drone.angle) * drone.orbitRadius;
        drone.y = player.y + player.h/2 + Math.sin(drone.angle) * drone.orbitRadius - GameState.cameraY;

        if (AbilityUpgrades.droneShoots()) {
          const interval = Math.round(90 / AbilityUpgrades.getDroneFireMult());
          drone.shootTimer += dt;
          if (drone.shootTimer >= interval) {
            drone.shootTimer = 0;
            let target = null, nd = Infinity;
            for (const e of Enemies.getAll()) {
              if (e.dead) continue;
              const d = Math.hypot(e.x + e.w/2 - drone.x, (e.y - GameState.cameraY) + e.h/2 - drone.y);
              if (d < nd && d < 350) { nd = d; target = e; }
            }
            if (target) {
              const dx = (target.x + target.w/2) - drone.x;
              const dy = (target.y - GameState.cameraY + target.h/2) - drone.y;
              const dist = Math.hypot(dx, dy);
              const spd = drone.elite ? 9 : 5;
              const dmg = drone.elite ? 3 : 1;
              Projectiles.addPlayerBullet(
                drone.x, drone.y + GameState.cameraY,
                (dx/dist) * spd, (dy/dist) * spd, dmg,
                {
                  r: drone.elite ? 4 : 2,
                  color: drone.elite ? '#ffee00' : '#9900ff',
                  glow:  drone.elite ? '#ffee00' : '#9900ff',
                  explosive: AbilityUpgrades.droneIsExplosive(),
                  // dr_5: status (slow effect on hit)
                  poison: AbilityUpgrades.droneAppliesStatus(),
                }
              );
            }
          }
        }

        // dr_6: shield assist — tiny shield restore on hit (handled passively)
      }
    }
  }

  function onAbilityEnd(id) {
    switch (id) {
      case 'gravity_flip':
        GameState.gravityFlipped = false;
        GameState.timeSlowTimer = 0; // end any flip-triggered slow
        break;
      case 'energy_shield':
        GameState.player.shielded = false;
        break;
      case 'drone':
        GameState.drones = [];
        break;
      case 'time_distort':
        if (AbilityUpgrades.slowFreezesAtEnd()) GameState.freezeTimer = 90;
        GameState.timeSlowTimer = 0;
        GameState.timeSlowFactor = 1;
        break;
      case 'overdrive':
        GameState.overdriveTimer = 0;
        GameState.overdriveMult = 1;
        if (GameState.player) {
          GameState.player.jumpVelocityMult = 1;
          GameState.player.moveSpeedMult = 1;
          GameState.player.gravityMult = 1;
        }
        break;
      case 'rocket_surge':
        if (GameState.player) GameState.player.rocketActive = false;
        break;
    }
  }

  function getState(id) { return state[id]; }
  function getAllStates() { return state; }
  function getCooldown(id) { return state[id] ? state[id].cooldown : 0; }
  function getMaxCooldown(id) {
    const cdr = 1 - PlayerUpgrades.getCooldownReduction();
    return BASE_COOLDOWNS[id] * cdr;
  }
  function isActive(id) { return state[id] ? state[id].active : false; }
  function getCharges(id) { return state[id] ? state[id].charges : 0; }

  return { init, activate, update, getState, getAllStates, getCooldown, getMaxCooldown, isActive, getCharges };
})();
