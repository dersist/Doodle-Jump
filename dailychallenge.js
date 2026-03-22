// ═══════════════════════════════════════════════════════════════
//  DAILYCHALLENGE.JS — 3 daily challenges, always coin rewards
//  Resets daily at midnight. Seeded by date so everyone gets same.
// ═══════════════════════════════════════════════════════════════
const DailyChallenge = (() => {
  const LS_KEY = 'neon_daily_v1';

  const CHALLENGE_TYPES = [
    { type:'height',   desc:(n) => `Reach height ${n.toLocaleString()} in a single run`, targets:[500,1000,2000,3000,5000,8000,10000], rewards:[100,150,200,250,300,400,500] },
    { type:'kills',    desc:(n) => `Kill ${n} enemies in a single run`,                  targets:[3,5,10,15,25,40,60], rewards:[100,150,200,250,300,400,500] },
    { type:'bounces',  desc:(n) => `Bounce on ${n} platforms in a single run`,           targets:[20,40,80,120,200,300,500], rewards:[100,120,150,200,250,350,450] },
    { type:'coins',    desc:(n) => `Collect ${n} coins in a single run`,                 targets:[20,40,80,150,250,400,600], rewards:[100,130,175,225,300,400,500] },
    { type:'survive',  desc:(n) => `Survive ${n} seconds in a single run`,               targets:[30,60,120,180,300,480,600], rewards:[100,150,200,275,350,425,500] },
    { type:'combo',    desc:(n) => `Reach a ${n}x combo`,                                targets:[2,3,4,5,6,8,10], rewards:[120,160,220,280,350,425,500] },
    { type:'nodamage', desc:(n) => `Reach height ${n} without taking damage`,            targets:[200,500,1000,2000,3500,5000,8000], rewards:[150,200,280,350,400,450,500] },
  ];

  function dateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  // Deterministic seeded random from date string
  function seededRand(seed, index) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    h ^= index * 2654435761;
    h = (h ^ (h >>> 16)) * 2246822519;
    return ((h ^ (h >>> 13)) >>> 0) / 4294967295;
  }

  function generateChallenges(dateStr) {
    const challenges = [];
    const usedTypes = new Set();
    for (let i = 0; i < 3; i++) {
      let typeIdx;
      do { typeIdx = Math.floor(seededRand(dateStr, i * 7 + 1) * CHALLENGE_TYPES.length); }
      while (usedTypes.has(typeIdx));
      usedTypes.add(typeIdx);

      const ct = CHALLENGE_TYPES[typeIdx];
      const diffIdx = Math.floor(seededRand(dateStr, i * 7 + 2) * ct.targets.length);
      challenges.push({
        id: `${dateStr}_${i}`,
        type: ct.type,
        target: ct.targets[diffIdx],
        reward: ct.rewards[diffIdx],
        desc: ct.desc(ct.targets[diffIdx]),
        completed: false,
        progress: 0,
      });
    }
    return challenges;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.dateKey !== dateKey()) return null; // expired
      return data;
    } catch(e) { return null; }
  }

  function saveState(challenges) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ dateKey: dateKey(), challenges }));
    } catch(e) {}
  }

  let _challenges = null;

  function getChallenges() {
    if (_challenges) return _challenges;
    const saved = loadState();
    _challenges = saved ? saved.challenges : generateChallenges(dateKey());
    saveState(_challenges); // persist generated challenges
    return _challenges;
  }

  // Called at end of run with run stats
  function checkRunResults(stats) {
    const chs = getChallenges();
    let anyNew = false;
    for (const ch of chs) {
      if (ch.completed) continue;
      let progress = 0;
      switch (ch.type) {
        case 'height':    progress = stats.height || 0; break;
        case 'kills':     progress = stats.enemiesKilled || 0; break;
        case 'bounces':   progress = stats.platformsBounced || 0; break;
        case 'coins':     progress = stats.coinsCollected || 0; break;
        case 'survive':   progress = stats.timeSeconds || 0; break;
        case 'combo':     progress = stats.maxCombo || 0; break;
        case 'nodamage':  progress = stats.damageTaken === 0 ? (stats.height || 0) : 0; break;
      }
      ch.progress = Math.max(ch.progress || 0, progress);
      if (progress >= ch.target) {
        ch.completed = true;
        anyNew = true;
        GameState.totalCoins += ch.reward;
        setTimeout(() => {
          UI.showToast(`✅ DAILY COMPLETE! ${ch.desc.substring(0,30)}... +${ch.reward}◈`, 3000);
          SFX.play('loot_rare');
        }, 2000 + chs.indexOf(ch) * 1000);
      }
    }
    if (anyNew) {
      Save.save();
      saveState(chs);
    }
  }

  function getTimeUntilReset() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return tomorrow - now;
  }

  return { getChallenges, checkRunResults, getTimeUntilReset };
})();
