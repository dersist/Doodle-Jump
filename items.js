// ═══════════════════════════════════════════
//  ITEMS.JS — Item definitions (100 total)
//  10 base abilities + 90 upgrade items
// ═══════════════════════════════════════════

const Items = (() => {
  // BASE ABILITY DEFINITIONS (10)
  const BASE_ABILITIES = [
    {
      id: 'rocket_surge',
      name: 'Rocket Surge',
      icon: '🚀',
      desc: 'Vertical launch — blast straight up at high speed',
      price: 80,
      type: 'ability',
    },
    {
      id: 'phase_dash',
      name: 'Phase Dash',
      icon: '⚡',
      desc: 'Teleport/dash in movement direction',
      price: 100,
      type: 'ability',
    },
    {
      id: 'gravity_flip',
      name: 'Gravity Flip',
      icon: '🔄',
      desc: 'Reverse gravity temporarily',
      price: 120,
      type: 'ability',
    },
    {
      id: 'energy_shield',
      name: 'Energy Shield',
      icon: '🛡️',
      desc: 'Protective barrier that absorbs damage',
      price: 90,
      type: 'ability',
    },
    {
      id: 'pulse_slam',
      name: 'Pulse Slam',
      icon: '💥',
      desc: 'Enhanced downward slam with shockwave',
      price: 75,
      type: 'ability',
    },
    {
      id: 'drone',
      name: 'Drone Companion',
      icon: '🤖',
      desc: 'AI drone that assists in combat',
      price: 110,
      type: 'ability',
    },
    {
      id: 'time_distort',
      name: 'Time Distortion',
      icon: '⏱️',
      desc: 'Slow time for everyone except yourself',
      price: 140,
      type: 'ability',
    },
    {
      id: 'platform_forge',
      name: 'Platform Forge',
      icon: '🔨',
      desc: 'Create solid platforms from energy',
      price: 130,
      type: 'ability',
    },
    {
      id: 'chaos_engine',
      name: 'Chaos Engine',
      icon: '🎲',
      desc: 'Random powerful effect — unpredictable but potent',
      price: 60,
      type: 'ability',
    },
    {
      id: 'overdrive',
      name: 'Overdrive Core',
      icon: '⚡',
      desc: 'Full stat boost — go beyond your limits',
      price: 160,
      type: 'ability',
    },
  ];

  // UPGRADE DEFINITIONS (9 per ability = 90 total)
  const UPGRADES_BY_ABILITY = {
    rocket_surge: [
      { id: 'rs_1', name: '+10% boost',          desc: 'Rocket launches 10% higher',           price: 30 },
      { id: 'rs_2', name: '+20% boost',           desc: 'Rocket launches 20% higher',           price: 45 },
      { id: 'rs_3', name: 'Damage trail',         desc: 'Leaves fire trail that hurts enemies',  price: 60 },
      { id: 'rs_4', name: 'Break platforms',      desc: 'Shatters weak platforms on launch',     price: 50 },
      { id: 'rs_5', name: 'Mid-air steering',     desc: 'Steer horizontally while ascending',    price: 70 },
      { id: 'rs_6', name: 'Enemy collision dmg',  desc: 'Damages enemies you pass through',      price: 65 },
      { id: 'rs_7', name: '2 charges',            desc: 'Ability gains second charge',           price: 90 },
      { id: 'rs_8', name: 'Start shockwave',      desc: 'Launch emits ground shockwave',         price: 80 },
      { id: 'rs_9', name: 'Coin pull',            desc: 'Pulls nearby coins on launch',          price: 55 },
    ],
    phase_dash: [
      { id: 'pd_1', name: 'Longer dash',          desc: 'Dash travels 50% further',              price: 30 },
      { id: 'pd_2', name: 'Faster dash',          desc: 'Dash executes twice as fast',           price: 35 },
      { id: 'pd_3', name: 'Phase enemies',        desc: 'Pass through enemies without damage',   price: 55 },
      { id: 'pd_4', name: 'Damage trail',         desc: 'Phantom trail hurts enemies',           price: 60 },
      { id: 'pd_5', name: 'Double dash',          desc: 'Dash twice in succession',              price: 75 },
      { id: 'pd_6', name: 'Auto-target platform', desc: 'Teleports you to nearest platform',     price: 85 },
      { id: 'pd_7', name: 'Reset jump',           desc: 'Refreshes your jump velocity',          price: 70 },
      { id: 'pd_8', name: 'Slow time briefly',    desc: 'Slows time for 1 second on use',        price: 90 },
      { id: 'pd_9', name: 'Shield on arrival',    desc: 'Brief invincibility on dash end',       price: 80 },
    ],
    gravity_flip: [
      { id: 'gf_1', name: 'Longer duration',      desc: '+50% flip duration',                    price: 30 },
      { id: 'gf_2', name: 'Faster switch',        desc: 'Gravity reverses instantly',            price: 35 },
      { id: 'gf_3', name: 'Fall protection',      desc: 'No fall damage during flip',            price: 40 },
      { id: 'gf_4', name: 'Pull enemies',         desc: 'Enemies are pulled toward ceiling',     price: 60 },
      { id: 'gf_5', name: 'Shoot while flipped',  desc: 'Maintain fire rate during flip',        price: 50 },
      { id: 'gf_6', name: 'Slow enemies',         desc: 'Enemies move at half speed while on',   price: 70 },
      { id: 'gf_7', name: 'Safe platforms',       desc: 'Spawns platforms near ceiling',         price: 75 },
      { id: 'gf_8', name: 'Lower cooldown',       desc: 'Cooldown reduced by 25%',               price: 65 },
      { id: 'gf_9', name: 'Slam synergy',         desc: 'Slam while flipped = mega jump',        price: 85 },
    ],
    energy_shield: [
      { id: 'es_1', name: 'Longer duration',      desc: '+50% shield duration',                  price: 30 },
      { id: 'es_2', name: 'Stronger shield',      desc: 'Absorbs 2 hits instead of 1',           price: 50 },
      { id: 'es_3', name: 'Reflect projectiles',  desc: 'Bounces enemy bullets back',            price: 65 },
      { id: 'es_4', name: 'Regen',                desc: 'Slowly restore health while shielded',  price: 70 },
      { id: 'es_5', name: 'Explodes on break',    desc: 'Shield burst deals AoE damage',         price: 80 },
      { id: 'es_6', name: 'Multi-hit (3)',        desc: 'Shield absorbs 3 hits',                 price: 75 },
      { id: 'es_7', name: 'Damage reduction',     desc: '30% less damage even when down',        price: 85 },
      { id: 'es_8', name: 'Bigger radius',        desc: 'Shield extends further from body',      price: 60 },
      { id: 'es_9', name: 'Energy → health',      desc: 'Convert shield hits to 0.5 HP',         price: 90 },
    ],
    pulse_slam: [
      { id: 'ps_1', name: 'Faster slam',          desc: 'Slam descends 50% faster',              price: 25 },
      { id: 'ps_2', name: 'Bigger radius',        desc: 'Shockwave hits wider area',             price: 35 },
      { id: 'ps_3', name: 'Break platforms',      desc: 'Shatters all platform types',           price: 40 },
      { id: 'ps_4', name: 'Damage enemies',       desc: 'Deals damage to nearby enemies',        price: 50 },
      { id: 'ps_5', name: 'Shockwave',            desc: 'Visible shockwave ring on landing',     price: 55 },
      { id: 'ps_6', name: 'Multi-pulse (3)',      desc: 'Emits 3 pulses on landing',             price: 70 },
      { id: 'ps_7', name: 'Bounce upward',        desc: 'Slam gives extra vertical boost',       price: 60 },
      { id: 'ps_8', name: 'Pull enemies',         desc: 'Enemies pulled into slam zone',         price: 65 },
      { id: 'ps_9', name: 'Chain pulses',         desc: 'Pulses chain between enemies',          price: 80 },
    ],
    drone: [
      { id: 'dr_1', name: 'Drone shoots',         desc: 'Drone fires at nearby enemies',         price: 35 },
      { id: 'dr_2', name: 'Faster fire rate',     desc: 'Drone fires 50% more often',            price: 40 },
      { id: 'dr_3', name: 'Better aim',           desc: 'Drone leads targets perfectly',         price: 45 },
      { id: 'dr_4', name: '2 drones',             desc: 'Summons a second drone',                price: 70 },
      { id: 'dr_5', name: 'Status effects',       desc: 'Drone shots slow enemies',              price: 60 },
      { id: 'dr_6', name: 'Shield assist',        desc: 'Drone generates mini shield on hit',    price: 75 },
      { id: 'dr_7', name: '3 drones',             desc: 'Summons a third drone',                 price: 90 },
      { id: 'dr_8', name: 'Explosive shots',      desc: 'Drone shots explode on impact',         price: 85 },
      { id: 'dr_9', name: 'Elite drone',          desc: 'All drones powered up massively',       price: 100 },
    ],
    time_distort: [
      { id: 'td_1', name: 'Longer duration',      desc: '+50% slow duration',                    price: 30 },
      { id: 'td_2', name: 'Stronger slow',        desc: 'Slow factor: 0.3x instead of 0.5x',    price: 45 },
      { id: 'td_3', name: 'Player unaffected',    desc: 'You move at full speed during slow',    price: 60 },
      { id: 'td_4', name: 'Enemy slow only',      desc: 'Only slows enemies, not bullets',       price: 50 },
      { id: 'td_5', name: 'Extend on kill',       desc: 'Each kill adds 0.5s to duration',       price: 65 },
      { id: 'td_6', name: 'Affects bullets',      desc: 'Your bullets speed up 2x during slow',  price: 70 },
      { id: 'td_7', name: 'Damage boost',         desc: '+50% damage dealt while active',        price: 75 },
      { id: 'td_8', name: 'Lower cooldown',       desc: 'Cooldown reduced by 30%',               price: 60 },
      { id: 'td_9', name: 'Freeze at end',        desc: 'Enemies briefly frozen on expiry',      price: 90 },
    ],
    platform_forge: [
      { id: 'pf_1', name: 'Stronger platform',    desc: 'Forged platforms last 50% longer',      price: 30 },
      { id: 'pf_2', name: 'Bigger platform',      desc: 'Platforms are 50% wider',               price: 35 },
      { id: 'pf_3', name: 'Moving platform',      desc: 'Forged platforms slide back and forth',  price: 55 },
      { id: 'pf_4', name: 'Boost platform',       desc: 'Forged platforms give extra jump',      price: 60 },
      { id: 'pf_5', name: 'Durable',              desc: 'Platforms last 3x longer',              price: 50 },
      { id: 'pf_6', name: 'Multiple (3)',         desc: 'Forge 3 platforms at once',             price: 80 },
      { id: 'pf_7', name: 'Auto-place',           desc: 'Platforms appear under your feet',      price: 70 },
      { id: 'pf_8', name: 'Trap enemies',         desc: 'Platforms slow/damage enemies on touch', price: 75 },
      { id: 'pf_9', name: 'Chain path',           desc: 'Auto-generate safe path ahead of you',  price: 95 },
    ],
    chaos_engine: [
      { id: 'ce_1', name: 'Better odds',          desc: 'Better pool of random effects',         price: 25 },
      { id: 'ce_2', name: 'Fewer negatives',      desc: 'Removes worst negative effects',        price: 35 },
      { id: 'ce_3', name: 'Double effects',       desc: 'All effects apply twice',               price: 50 },
      { id: 'ce_4', name: 'Positive bias',        desc: '75% chance of positive effect',         price: 55 },
      { id: 'ce_5', name: 'Rare effects',         desc: 'Unlocks powerful rare outcomes',        price: 70 },
      { id: 'ce_6', name: 'Chain effects',        desc: 'Roll 2 effects per activation',         price: 65 },
      { id: 'ce_7', name: 'Longer duration',      desc: 'All effects last twice as long',        price: 60 },
      { id: 'ce_8', name: 'Remove worst',         desc: 'Removes all negative outcomes',         price: 80 },
      { id: 'ce_9', name: 'Always positive',      desc: 'Chaos Engine always buffs you',         price: 100 },
    ],
    overdrive: [
      { id: 'od_1', name: 'Longer duration',      desc: '+50% overdrive duration',               price: 35 },
      { id: 'od_2', name: 'Stronger boost',       desc: 'All stats boosted by 50% more',         price: 50 },
      { id: 'od_3', name: 'Lower cooldown',       desc: 'Cooldown reduced by 25%',               price: 45 },
      { id: 'od_4', name: 'Lifesteal',            desc: 'Gain HP per enemy killed during OD',    price: 70 },
      { id: 'od_5', name: 'Ability boost',        desc: 'Other abilities recharge 2x faster',    price: 75 },
      { id: 'od_6', name: 'Gravity reduction',    desc: 'Gravity halved during overdrive',       price: 65 },
      { id: 'od_7', name: 'Speed boost',          desc: '+50% movement speed',                   price: 55 },
      { id: 'od_8', name: 'Auto-shoot buff',      desc: 'Fire rate doubled, bullets pierce',     price: 80 },
      { id: 'od_9', name: 'Max power mode',       desc: 'All upgrades amplified for duration',   price: 100 },
    ],
  };

  function getBaseAbility(id) {
    return BASE_ABILITIES.find(a => a.id === id);
  }

  function getUpgradesForAbility(abilityId) {
    return UPGRADES_BY_ABILITY[abilityId] || [];
  }

  function getAllBaseAbilities() { return BASE_ABILITIES; }

  function getUpgrade(abilityId, upgradeId) {
    const ups = UPGRADES_BY_ABILITY[abilityId] || [];
    return ups.find(u => u.id === upgradeId);
  }

  return { getAllBaseAbilities, getBaseAbility, getUpgradesForAbility, getUpgrade };
})();
