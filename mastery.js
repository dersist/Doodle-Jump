// ═══════════════════════════════════════════════════════════════
//  MASTERY.JS — Ability mastery system
//  Stars: 50, 150, 500, 1500, 5000 uses (exponential)
//  Each star grants a passive that applies always, even unequipped
// ═══════════════════════════════════════════════════════════════
const Mastery = (() => {
  // Uses needed for each star (index 0 = 1st star, etc.)
  const STAR_THRESHOLDS = [50, 150, 500, 1500, 5000];

  // Passive descriptions per ability per star
  const PASSIVES = {
    rocket_surge: [
      { stars:1, icon:'🚀', desc:'+3% jump velocity always'              },
      { stars:2, icon:'🚀', desc:'+6% jump velocity always'              },
      { stars:3, icon:'💥', desc:'Landing emits a 1-dmg shockwave nearby' },
      { stars:4, icon:'🚀', desc:'+10% jump velocity always'             },
      { stars:5, icon:'🔄', desc:'Auto-rocket triggers once if you fall 200px below peak' },
    ],
    phase_dash: [
      { stars:1, icon:'💨', desc:'+5% move speed always'                 },
      { stars:2, icon:'💨', desc:'+10% move speed always'                },
      { stars:3, icon:'🗡️', desc:'Passing through enemy deals 1 damage'  },
      { stars:4, icon:'💨', desc:'+15% move speed always'                },
      { stars:5, icon:'♾️', desc:'Phase dash has 1 free charge per run'  },
    ],
    gravity_flip: [
      { stars:1, icon:'🔄', desc:'Flip cooldown -5% always'              },
      { stars:2, icon:'🔄', desc:'Flip cooldown -10% always'             },
      { stars:3, icon:'😵', desc:'Flip briefly stuns enemies (0.5s)'     },
      { stars:4, icon:'🔄', desc:'Flip cooldown -15% always'             },
      { stars:5, icon:'⏱️', desc:'Gravity flip duration +50% always'     },
    ],
    energy_shield: [
      { stars:1, icon:'🛡️', desc:'Shield lasts +1s always'              },
      { stars:2, icon:'🛡️', desc:'Shield lasts +2s always'              },
      { stars:3, icon:'💫', desc:'Shield break knocks enemies back'       },
      { stars:4, icon:'🪙', desc:'Coins restore 1 shield hit'            },
      { stars:5, icon:'🆘', desc:'Auto-shield activates at 1 HP (1/run)' },
    ],
    pulse_slam: [
      { stars:1, icon:'⬇️', desc:'Slam deals +1 damage always'           },
      { stars:2, icon:'⭕', desc:'Slam radius +25% always'               },
      { stars:3, icon:'🪙', desc:'Slam pulls coins from nearby enemies'   },
      { stars:4, icon:'⬇️', desc:'Slam deals +2 damage always'           },
      { stars:5, icon:'🌊', desc:'Slam auto-fires 3 pulses on landing'   },
    ],
    drone: [
      { stars:1, icon:'🤖', desc:'Drone lasts 5s longer'                 },
      { stars:2, icon:'🤖', desc:'Drone lasts 12s longer'                },
      { stars:3, icon:'🔄', desc:'Drone auto-redeploys 30s after expiring'},
      { stars:4, icon:'🔥', desc:'Drone fire rate +30% always'           },
      { stars:5, icon:'⚡', desc:'A mini drone is always active passively'},
    ],
    time_distort: [
      { stars:1, icon:'⏱️', desc:'+5% bullet damage during slow'         },
      { stars:2, icon:'⏱️', desc:'+12% bullet damage during slow'        },
      { stars:3, icon:'🧊', desc:'Slow freezes enemy bullets mid-air'    },
      { stars:4, icon:'⏱️', desc:'+20% bullet damage during slow'        },
      { stars:5, icon:'⚡', desc:'You move 150% speed during time distort'},
    ],
    platform_forge: [
      { stars:1, icon:'🔧', desc:'Forged platforms last 15% longer'      },
      { stars:2, icon:'🔧', desc:'Forged platforms last 30% longer'      },
      { stars:3, icon:'🪙', desc:'Bouncing on forged pad gives +2 coins' },
      { stars:4, icon:'🔧', desc:'Forged platforms last 60% longer'      },
      { stars:5, icon:'🏗️', desc:'Forge always creates 2 platforms min'  },
    ],
    chaos_engine: [
      { stars:1, icon:'🎲', desc:'+5% chance of positive chaos effect'   },
      { stars:2, icon:'🎲', desc:'+12% chance of positive chaos effect'  },
      { stars:3, icon:'⏳', desc:'Chaos effects last 30% longer'         },
      { stars:4, icon:'🎲', desc:'+20% chance of positive chaos effect'  },
      { stars:5, icon:'🎰', desc:'Chaos always fires 2 effects minimum'  },
    ],
    overdrive: [
      { stars:1, icon:'⚡', desc:'Overdrive lasts 8% longer'             },
      { stars:2, icon:'⚡', desc:'Overdrive lasts 18% longer'            },
      { stars:3, icon:'🪙', desc:'+1 coin per bounce during overdrive'   },
      { stars:4, icon:'⚡', desc:'Overdrive lasts 30% longer'            },
      { stars:5, icon:'🔥', desc:'Overdrive cooldown -30% always'        },
    ],
  };

  function getState() {
    if (!GameState.mastery) GameState.mastery = {};
    return GameState.mastery;
  }

  function getUses(abilityId) {
    return getState()[abilityId]?.uses || 0;
  }

  function getStars(abilityId) {
    const uses = getUses(abilityId);
    let stars = 0;
    for (const threshold of STAR_THRESHOLDS) {
      if (uses >= threshold) stars++;
      else break;
    }
    return stars;
  }

  function recordUse(abilityId) {
    const st = getState();
    if (!st[abilityId]) st[abilityId] = { uses: 0, stars: 0 };
    st[abilityId].uses++;

    const oldStars = st[abilityId].stars || 0;
    const newStars = getStars(abilityId);
    if (newStars > oldStars) {
      st[abilityId].stars = newStars;
      const passive = PASSIVES[abilityId]?.[newStars - 1];
      UI.showToast(`⭐ MASTERY! ${abilityId.replace('_',' ').toUpperCase()} reached ${newStars}★${passive ? ': ' + passive.desc : ''}`, 3000);
      SFX.play('loot_uncommon');
      Save.save();
    }
  }

  // Checks if ability has N or more stars
  function hasStar(abilityId, n) { return getStars(abilityId) >= n; }

  // ── Passive getters (used in abilities/player/etc.) ────────
  function rocketJumpBonus()     { const s = getStars('rocket_surge');   return s >= 4 ? 1.10 : s >= 2 ? 1.06 : s >= 1 ? 1.03 : 1.0; }
  function dashSpeedBonus()      { const s = getStars('phase_dash');     return s >= 4 ? 1.15 : s >= 2 ? 1.10 : s >= 1 ? 1.05 : 1.0; }
  function flipCDRBonus()        { const s = getStars('gravity_flip');   return s >= 4 ? 0.15 : s >= 2 ? 0.10 : s >= 1 ? 0.05 : 0; }
  function shieldDurBonus()      { const s = getStars('energy_shield');  return s >= 2 ? 120 : s >= 1 ? 60 : 0; } // frames
  function slamDmgBonus()        { const s = getStars('pulse_slam');     return s >= 4 ? 2 : s >= 1 ? 1 : 0; }
  function slamRadBonus()        { const s = getStars('pulse_slam');     return s >= 2 ? 1.25 : 1.0; }
  function droneDurBonus()       { const s = getStars('drone');          return s >= 2 ? 12*60 : s >= 1 ? 5*60 : 0; } // frames
  function droneFireBonus()      { return hasStar('drone', 4) ? 1.30 : 1.0; }
  function tdDmgBonus()          { const s = getStars('time_distort');   return s >= 4 ? 1.20 : s >= 2 ? 1.12 : s >= 1 ? 1.05 : 1.0; }
  function forgeDurBonus()       { const s = getStars('platform_forge'); return s >= 4 ? 1.60 : s >= 2 ? 1.30 : s >= 1 ? 1.15 : 1.0; }
  function chaosPositiveBonus()  { const s = getStars('chaos_engine');   return s >= 4 ? 0.20 : s >= 2 ? 0.12 : s >= 1 ? 0.05 : 0; }
  function overdriveExtBonus()   { const s = getStars('overdrive');      return s >= 4 ? 1.30 : s >= 2 ? 1.18 : s >= 1 ? 1.08 : 1.0; }
  function overdriveCD()         { return hasStar('overdrive', 5) ? 0.70 : 1.0; } // multiplier

  function getNextThreshold(abilityId) {
    const uses = getUses(abilityId);
    const stars = getStars(abilityId);
    if (stars >= 5) return null;
    return STAR_THRESHOLDS[stars];
  }

  function getPassives(abilityId) { return PASSIVES[abilityId] || []; }
  function getAllStars() {
    const out = {};
    for (const id of Object.keys(PASSIVES)) out[id] = getStars(id);
    return out;
  }

  return {
    recordUse, getUses, getStars, hasStar, getNextThreshold,
    getPassives, getAllStars, getState,
    rocketJumpBonus, dashSpeedBonus, flipCDRBonus, shieldDurBonus,
    slamDmgBonus, slamRadBonus, droneDurBonus, droneFireBonus,
    tdDmgBonus, forgeDurBonus, chaosPositiveBonus,
    overdriveExtBonus, overdriveCD,
  };
})();
