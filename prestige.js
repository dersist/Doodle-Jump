// ═══════════════════════════════════════════════════════════════
//  PRESTIGE.JS — Ascension system
//  Heights: 10k, 15k, 20k, 25k... (+5k each)
//  Each ascension unlocks a permanent passive bonus
// ═══════════════════════════════════════════════════════════════
const Prestige = (() => {

  const PASSIVES = [
    { id:'p1', name:'Nimble Legs',    desc:'+5% jump velocity permanently',        icon:'🦵' },
    { id:'p2', name:'Coin Magnet',    desc:'Enemies drop +1 coin on kill',          icon:'🧲' },
    { id:'p3', name:'Solid Ground',   desc:'+10% platform size',                    icon:'🪨' },
    { id:'p4', name:'Gold Rush',      desc:'+10% coins earned per run',             icon:'💰' },
    { id:'p5', name:'Iron Will',      desc:'+1 max HP permanently',                 icon:'❤️' },
    { id:'p6', name:'Flow State',     desc:'Ability cooldowns -5%',                 icon:'⚡' },
    { id:'p7', name:'Hair Trigger',   desc:'+10% bullet speed & fire rate',         icon:'🔫' },
    { id:'p8', name:'Bounty Hunter',  desc:'Every 50th bounce awards a free coin',  icon:'🏆' },
    { id:'p9', name:'Lucky Box',      desc:'Loot box cooldown -1 minute',           icon:'🎁' },
    { id:'p10',name:'Ascendant',      desc:'All previous bonuses doubled',          icon:'✨' },
  ];

  function getState() {
    if (!GameState.prestige) GameState.prestige = { level: 0, passives: [] };
    return GameState.prestige;
  }

  function getRequiredHeight(level) {
    // Cumulative total height thresholds (exponentially increasing)
    // 0→1: 100k,  1→2: 500k,  2→3: 1.5M,  3→4: 3.5M,  4→5: 7.5M
    // 5→6: 15M,   6→7: 30M,   7→8: 60M,   8→9: 120M,  9→10: 250M
    const thresholds = [100000, 500000, 1500000, 3500000, 7500000,
                        15000000, 30000000, 60000000, 120000000, 250000000];
    return thresholds[Math.min(level, thresholds.length - 1)];
  }

  function getTotalHeight() {
    return GameState.totalHeightJumped || 0;
  }

  function getLevel() { return getState().level; }

  function canAscend() {
    const st = getState();
    if (st.level >= 10) return false;
    return getTotalHeight() >= getRequiredHeight(st.level);
  }

  function ascend() {
    if (!canAscend()) return false;
    const st = getState();
    const newLevel = st.level + 1;
    st.level = newLevel;
    const passive = PASSIVES[Math.min(newLevel - 1, PASSIVES.length - 1)];
    if (passive && !st.passives.includes(passive.id)) st.passives.push(passive.id);

    // Coin reward scales with ascension level
    const coinScale = [500, 1500, 3000, 5000, 8000, 12000, 20000, 35000, 60000, 100000];
    const bonus = coinScale[Math.min(newLevel - 1, coinScale.length - 1)];
    GameState.totalCoins += bonus;
    Save.save();

    UI.showToast(`✨ ASCENSION ${newLevel}! +${bonus}◈ — ${passive.icon} ${passive.name} unlocked!`, 4000);
    SFX.play('revive');

    // Show ascension screen
    showAscensionModal(newLevel, passive, bonus);
    return true;
  }

  function hasPassive(id) {
    const st = getState();
    if (!st.passives.includes(id)) return false;
    return true;
  }

  // Multiplied passives for ascendant (level 10)
  function passiveMult() { return hasPassive('p10') ? 2 : 1; }

  // ── Getters used by other systems ────────────────────────
  function jumpBonus()        { return hasPassive('p1') ? 1 + 0.05 * passiveMult() : 1; }
  function enemyCoinBonus()   { return hasPassive('p2') ? 1 * passiveMult() : 0; }
  function platScaleBonus()   { return hasPassive('p3') ? 1 + 0.10 * passiveMult() : 1; }
  function runCoinBonus()     { return hasPassive('p4') ? 1 + 0.10 * passiveMult() : 1; }
  function hpBonus()          { return hasPassive('p5') ? 1 * passiveMult() : 0; }
  function cooldownBonus()    { return hasPassive('p6') ? 0.05 * passiveMult() : 0; }
  function bulletBonus()      { return hasPassive('p7') ? 1 + 0.10 * passiveMult() : 1; }
  function bountyBonus()      { return hasPassive('p8'); }
  function lootboxBonus()     { return hasPassive('p9') ? 60000 * passiveMult() : 0; } // ms reduction
  function isAscendant()      { return hasPassive('p10'); }

  function showAscensionModal(level, passive, bonus) {
    const modal = document.getElementById('ascension-modal');
    if (!modal) return;
    document.getElementById('asc-level').textContent    = level;
    document.getElementById('asc-coins').textContent    = `+${bonus} ◈`;
    document.getElementById('asc-passive-icon').textContent = passive.icon;
    document.getElementById('asc-passive-name').textContent = passive.name;
    document.getElementById('asc-passive-desc').textContent = passive.desc;
    document.getElementById('asc-next').textContent =
      level >= 10 ? 'MAX ASCENSION REACHED' : `Next: ${getRequiredHeight(level).toLocaleString()} total height`;
    modal.style.display = 'flex';
    void modal.offsetWidth; modal.classList.add('asc-in');
    document.getElementById('asc-close')?.addEventListener('click', () => {
      modal.classList.remove('asc-in');
      setTimeout(() => { modal.style.display = 'none'; }, 300);
    }, { once: true });
  }

  function getPassiveList() { return PASSIVES; }
  function getUnlocked()    { return getState().passives; }
  function getNextHeight()  { return getRequiredHeight(getLevel()); }

  return {
    getLevel, canAscend, ascend, hasPassive,
    jumpBonus, enemyCoinBonus, platScaleBonus, runCoinBonus,
    hpBonus, cooldownBonus, bulletBonus, bountyBonus, lootboxBonus, isAscendant,
    getPassiveList, getUnlocked, getNextHeight, getRequiredHeight,
  };
})();
