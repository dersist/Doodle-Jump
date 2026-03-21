// ═══════════════════════════════════════════
//  GUNUPGRADES.JS — Weapon modification system
//  Parts bought in any order → unlock button appears
// ═══════════════════════════════════════════

const GunUpgrades = (() => {

  // ── DEFINITIONS ─────────────────────────────────────────────
  // Each upgrade has 5 parts (any order) + unlock price + effect description
  const DEFS = [
    {
      id: 'double_shot',
      name: 'Double Shot',
      icon: '⚡',
      desc: 'Fires two parallel bullets per shot',
      unlockPrice: 420,
      parts: [
        { id: 'ds_1', name: 'Barrel Blueprint',  price: 40  },
        { id: 'ds_2', name: 'Barrel Tip',        price: 80  },
        { id: 'ds_3', name: 'Barrel Shaft',      price: 100 },
        { id: 'ds_4', name: 'Gun Attachment',    price: 140 },
        { id: 'ds_5', name: 'Assembly',          price: 180 },
      ],
    },
    {
      id: 'rapid_fire',
      name: 'Rapid Fire',
      icon: '🔥',
      desc: 'Fire rate increased by 60%',
      unlockPrice: 350,
      parts: [
        { id: 'rf_1', name: 'Trigger Spring',    price: 30  },
        { id: 'rf_2', name: 'Feed Ramp',         price: 60  },
        { id: 'rf_3', name: 'Bolt Carrier',      price: 90  },
        { id: 'rf_4', name: 'Auto Sear',         price: 120 },
        { id: 'rf_5', name: 'Timing Module',     price: 160 },
      ],
    },
    {
      id: 'explosive_rounds',
      name: 'Explosive Rounds',
      icon: '💥',
      desc: 'Bullets explode on impact, dealing splash damage',
      unlockPrice: 480,
      parts: [
        { id: 'er_1', name: 'Primer Compound',   price: 50  },
        { id: 'er_2', name: 'Payload Casing',    price: 90  },
        { id: 'er_3', name: 'Detonator Pin',     price: 120 },
        { id: 'er_4', name: 'Shrapnel Core',     price: 160 },
        { id: 'er_5', name: 'Blast Cap',         price: 200 },
      ],
    },
    {
      id: 'piercing_shot',
      name: 'Piercing Shot',
      icon: '🗡️',
      desc: 'Bullets pass through up to 3 enemies',
      unlockPrice: 440,
      parts: [
        { id: 'ps_1', name: 'Tungsten Core',     price: 45  },
        { id: 'ps_2', name: 'Penetrator Tip',    price: 75  },
        { id: 'ps_3', name: 'Sabot Shell',       price: 110 },
        { id: 'ps_4', name: 'Hardened Jacket',   price: 150 },
        { id: 'ps_5', name: 'Kinetic Driver',    price: 190 },
      ],
    },
    {
      id: 'triple_spread',
      name: 'Triple Spread',
      icon: '📡',
      desc: 'Fires 3 bullets in a spread pattern',
      unlockPrice: 550,
      parts: [
        { id: 'ts_1', name: 'Spread Manifold',   price: 60  },
        { id: 'ts_2', name: 'Choke Plate',       price: 100 },
        { id: 'ts_3', name: 'Divergence Ring',   price: 140 },
        { id: 'ts_4', name: 'Triple Barrel Rig', price: 180 },
        { id: 'ts_5', name: 'Pattern Lock',      price: 220 },
      ],
    },
    {
      id: 'ricochet',
      name: 'Ricochet',
      icon: '🪃',
      desc: 'Bullets bounce off screen edges once before expiring',
      unlockPrice: 400,
      parts: [
        { id: 'rc_1', name: 'Rubber Coat',       price: 35  },
        { id: 'rc_2', name: 'Gyro Stabilizer',   price: 65  },
        { id: 'rc_3', name: 'Elastic Tip',       price: 100 },
        { id: 'rc_4', name: 'Spin Engine',       price: 140 },
        { id: 'rc_5', name: 'Rebound Alloy',     price: 180 },
      ],
    },
    {
      id: 'heavy_caliber',
      name: 'Heavy Caliber',
      icon: '🔨',
      desc: '+150% damage, bullets are larger and slower',
      unlockPrice: 475,
      parts: [
        { id: 'hc_1', name: 'Oversized Chamber', price: 50  },
        { id: 'hc_2', name: 'Reinforced Barrel', price: 85  },
        { id: 'hc_3', name: 'High-Grain Powder', price: 120 },
        { id: 'hc_4', name: 'Muzzle Brake',      price: 160 },
        { id: 'hc_5', name: 'Hardened Receiver', price: 200 },
      ],
    },
    {
      id: 'poison_rounds',
      name: 'Poison Rounds',
      icon: '☠️',
      desc: 'Hit enemies take 1 damage per second for 4 seconds',
      unlockPrice: 430,
      parts: [
        { id: 'pr_1', name: 'Toxin Vial',        price: 40  },
        { id: 'pr_2', name: 'Hollow Tip',        price: 70  },
        { id: 'pr_3', name: 'Nano Injector',     price: 110 },
        { id: 'pr_4', name: 'Delayed Fuse',      price: 150 },
        { id: 'pr_5', name: 'Venom Core',        price: 190 },
      ],
    },
    {
      id: 'chain_lightning',
      name: 'Chain Lightning',
      icon: '⚡',
      desc: 'Killing an enemy arcs electricity to 2 nearby enemies',
      unlockPrice: 510,
      parts: [
        { id: 'cl_1', name: 'Tesla Coil',        price: 55  },
        { id: 'cl_2', name: 'Arc Conductor',     price: 95  },
        { id: 'cl_3', name: 'Charge Cell',       price: 130 },
        { id: 'cl_4', name: 'Jump Wire',         price: 170 },
        { id: 'cl_5', name: 'Static Amplifier',  price: 210 },
      ],
    },
    {
      id: 'mega_bullet',
      name: 'Mega Bullet',
      icon: '🔮',
      desc: 'Every 5th shot fires a giant slow bullet with 4x damage',
      unlockPrice: 455,
      parts: [
        { id: 'mb_1', name: 'Dense Core',        price: 45  },
        { id: 'mb_2', name: 'Mass Driver',       price: 80  },
        { id: 'mb_3', name: 'Coil Array',        price: 115 },
        { id: 'mb_4', name: 'Gravity Well',      price: 155 },
        { id: 'mb_5', name: 'Singularity Tip',   price: 195 },
      ],
    },
  ];

  // ── STATE ────────────────────────────────────────────────────
  // Stored in GameState.gunUpgrades = { id: { parts: [], unlocked: bool } }

  function getState(id) {
    if (!GameState.gunUpgrades) GameState.gunUpgrades = {};
    if (!GameState.gunUpgrades[id]) GameState.gunUpgrades[id] = { parts: [], unlocked: false };
    return GameState.gunUpgrades[id];
  }

  function hasPart(upgradeId, partId) {
    return getState(upgradeId).parts.includes(partId);
  }

  function isUnlocked(id) {
    return getState(id).unlocked;
  }

  function allPartsOwned(id) {
    const def = DEFS.find(d => d.id === id);
    if (!def) return false;
    const state = getState(id);
    return def.parts.every(p => state.parts.includes(p.id));
  }

  function buyPart(upgradeId, partId) {
    const def = DEFS.find(d => d.id === upgradeId);
    if (!def) return false;
    const part = def.parts.find(p => p.id === partId);
    if (!part) return false;
    const state = getState(upgradeId);
    if (state.parts.includes(partId)) return false;
    if (GameState.totalCoins < part.price) {
      UI.showToast('NOT ENOUGH COINS!');
      return false;
    }
    GameState.totalCoins -= part.price;
    state.parts.push(partId);
    Save.save();
    return true;
  }

  function unlock(upgradeId) {
    const def = DEFS.find(d => d.id === upgradeId);
    if (!def) return false;
    if (!allPartsOwned(upgradeId)) return false;
    const state = getState(upgradeId);
    if (state.unlocked) return false;
    if (GameState.totalCoins < def.unlockPrice) {
      UI.showToast('NOT ENOUGH COINS!');
      return false;
    }
    GameState.totalCoins -= def.unlockPrice;
    state.unlocked = true;
    Save.save();
    return true;
  }

  function getDefs() { return DEFS; }
  function getDef(id) { return DEFS.find(d => d.id === id); }

  // ── ACTIVE EFFECT GETTERS ────────────────────────────────────
  function has(id) { return isUnlocked(id); }

  // Bullet count
  function getBulletCount() {
    if (has('triple_spread')) return 3;
    if (has('double_shot')) return 2;
    return 1;
  }
  function getBulletSpread() { return has('triple_spread') ? 0.3 : (has('double_shot') ? 0.12 : 0); }

  // Fire rate multiplier (lower = faster)
  function getFireRateMult() { return has('rapid_fire') ? 0.4 : 1; }

  // Damage multiplier
  function getDamageMult() { return has('heavy_caliber') ? 2.5 : 1; }

  // Bullet size
  function getBulletRadius() { return has('heavy_caliber') ? 4 : 2; }

  // Bullet speed multiplier
  function getBulletSpeedMult() { return has('heavy_caliber') ? 0.55 : 1; }

  // Piercing hits
  function getPiercingHits() { return has('piercing_shot') ? 3 : 0; }

  // Explosive
  function isExplosive() { return has('explosive_rounds'); }

  // Ricochet
  function canRicochet() { return has('ricochet'); }

  // Poison
  function hasPoison() { return has('poison_rounds'); }

  // Chain lightning
  function hasChainLightning() { return has('chain_lightning'); }

  // Mega bullet counter
  let megaCounter = 0;
  function resetMegaCounter() { megaCounter = 0; }
  function shouldFireMega() {
    if (!has('mega_bullet')) return false;
    megaCounter++;
    if (megaCounter >= 5) { megaCounter = 0; return true; }
    return false;
  }

  return {
    getDefs, getDef, getState, hasPart, isUnlocked, allPartsOwned,
    buyPart, unlock, has,
    getBulletCount, getBulletSpread, getFireRateMult, getDamageMult,
    getBulletRadius, getBulletSpeedMult, getPiercingHits,
    isExplosive, canRicochet, hasPoison, hasChainLightning,
    shouldFireMega, resetMegaCounter,
  };
})();
