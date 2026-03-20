// ═══════════════════════════════════════════
//  PLAYERUPGRADES.JS — Permanent stat upgrades
// ═══════════════════════════════════════════

const PlayerUpgrades = (() => {
  // 5 upgrades, each with 5 levels
  const DEFS = [
    {
      id: 'health',
      name: 'Health System',
      icon: '❤️',
      levels: [
        { desc: '+1 hit point',      price: 50,  bonus: 1 },
        { desc: '+2 hit points',     price: 80,  bonus: 2 },
        { desc: '+3 hit points',     price: 120, bonus: 3 },
        { desc: 'Regen over time',   price: 180, bonus: 4 },
        { desc: 'Revive once/run',   price: 250, bonus: 5 },
      ],
    },
    {
      id: 'score_mult',
      name: 'Score Multiplier',
      icon: '⭐',
      levels: [
        { desc: '+10% score',   price: 40,  bonus: 0.10 },
        { desc: '+20% score',   price: 70,  bonus: 0.20 },
        { desc: '+30% score',   price: 110, bonus: 0.30 },
        { desc: '+40% score',   price: 160, bonus: 0.40 },
        { desc: '+50% score',   price: 220, bonus: 0.50 },
      ],
    },
    {
      id: 'jump_mult',
      name: 'Jump Multiplier',
      icon: '↑',
      levels: [
        { desc: '+5% jump',    price: 40,  bonus: 0.05 },
        { desc: '+10% jump',   price: 65,  bonus: 0.10 },
        { desc: '+15% jump',   price: 100, bonus: 0.15 },
        { desc: '+20% jump',   price: 150, bonus: 0.20 },
        { desc: '+25% jump',   price: 200, bonus: 0.25 },
      ],
    },
    {
      id: 'currency_boost',
      name: 'Currency Boost',
      icon: '◈',
      levels: [
        { desc: '+10% coins',   price: 40,  bonus: 0.10 },
        { desc: '+20% coins',   price: 70,  bonus: 0.20 },
        { desc: '+30% coins',   price: 100, bonus: 0.30 },
        { desc: '+40% coins',   price: 140, bonus: 0.40 },
        { desc: '+50% coins',   price: 190, bonus: 0.50 },
      ],
    },
    {
      id: 'cooldown_reduction',
      name: 'Cooldown Reduction',
      icon: '⏱',
      levels: [
        { desc: '-5% cooldowns',  price: 50,  bonus: 0.05 },
        { desc: '-10% cooldowns', price: 80,  bonus: 0.10 },
        { desc: '-15% cooldowns', price: 120, bonus: 0.15 },
        { desc: '-20% cooldowns', price: 170, bonus: 0.20 },
        { desc: '-25% cooldowns', price: 230, bonus: 0.25 },
      ],
    },
  ];

  function getLevel(id) {
    return GameState.playerUpgradeLevels[id] || 0;
  }

  function getMaxHealth() {
    const lvl = getLevel('health');
    if (lvl === 0) return 0; // no health system
    const bonuses = [1, 2, 3, 4, 5];
    return bonuses[Math.min(lvl - 1, 4)];
  }

  function hasHealthSystem() { return getLevel('health') > 0; }
  function hasRegen()         { return getLevel('health') >= 4; }
  function hasRevive()        { return getLevel('health') >= 5; }

  function getScoreBonus() {
    const lvl = getLevel('score_mult');
    if (lvl === 0) return 0;
    return DEFS[1].levels[lvl - 1].bonus;
  }

  function getJumpBonus() {
    const lvl = getLevel('jump_mult');
    if (lvl === 0) return 0;
    return DEFS[2].levels[lvl - 1].bonus;
  }

  function getCurrencyBoost() {
    const lvl = getLevel('currency_boost');
    if (lvl === 0) return 0;
    return DEFS[3].levels[lvl - 1].bonus;
  }

  function getCooldownReduction() {
    const lvl = getLevel('cooldown_reduction');
    if (lvl === 0) return 0;
    return DEFS[4].levels[lvl - 1].bonus;
  }

  function buyLevel(id, targetLevel) {
    const def = DEFS.find(d => d.id === id);
    if (!def) return false;
    const current = getLevel(id);
    if (targetLevel !== current + 1) return false;
    const levelDef = def.levels[targetLevel - 1];
    if (!levelDef) return false;
    if (GameState.totalCoins < levelDef.price) return false;

    GameState.totalCoins -= levelDef.price;
    GameState.playerUpgradeLevels[id] = targetLevel;
    Save.save();
    return true;
  }

  function getDefs() { return DEFS; }

  return {
    getLevel, getMaxHealth, hasHealthSystem, hasRegen, hasRevive,
    getScoreBonus, getJumpBonus, getCurrencyBoost, getCooldownReduction,
    buyLevel, getDefs,
  };
})();
