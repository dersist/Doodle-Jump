// ═══════════════════════════════════════════
//  ABILITYUPGRADES.JS — Upgrade modifiers
//  Applies purchased upgrades to ability behavior
// ═══════════════════════════════════════════

const AbilityUpgrades = (() => {
  // Check if a specific upgrade is purchased
  function has(abilityId, upgradeId) {
    const owned = GameState.ownedAbilities[abilityId];
    if (!owned) return false;
    return owned.upgrades && owned.upgrades.includes(upgradeId);
  }

  // ── ROCKET SURGE modifiers ──
  function getRocketMultiplier(baseVel) {
    let mult = 1.0;
    if (has('rocket_surge', 'rs_1')) mult += 0.10;
    if (has('rocket_surge', 'rs_2')) mult += 0.20;
    return baseVel * mult;
  }

  function rocketHasDamageTrail()       { return has('rocket_surge', 'rs_3'); }
  function rocketBreaksPlatforms()       { return has('rocket_surge', 'rs_4'); }
  function rocketHasSteering()           { return has('rocket_surge', 'rs_5'); }
  function rocketDamagesOnContact()      { return has('rocket_surge', 'rs_6'); }
  function rocketCharges()               { return has('rocket_surge', 'rs_7') ? 2 : 1; }
  function rocketHasShockwave()          { return has('rocket_surge', 'rs_8'); }
  function rocketPullsCoins()            { return has('rocket_surge', 'rs_9'); }

  // ── PHASE DASH modifiers ──
  function getDashDistance(baseDist) {
    if (has('phase_dash', 'pd_1')) baseDist *= 1.5;
    return baseDist;
  }
  function dashIsFast()                  { return has('phase_dash', 'pd_2'); }
  function dashPhasesEnemies()           { return has('phase_dash', 'pd_3'); }
  function dashHasTrail()                { return has('phase_dash', 'pd_4'); }
  function dashIsDouble()                { return has('phase_dash', 'pd_5'); }
  function dashAutoTargets()             { return has('phase_dash', 'pd_6'); }
  function dashResetsJump()              { return has('phase_dash', 'pd_7'); }
  function dashSlowsTime()               { return has('phase_dash', 'pd_8'); }
  function dashGivesShield()             { return has('phase_dash', 'pd_9'); }

  // ── GRAVITY FLIP modifiers ──
  function getFlipDuration(base) {
    if (has('gravity_flip', 'gf_1')) base *= 1.5;
    return base;
  }
  function flipIsInstant()               { return has('gravity_flip', 'gf_2'); }
  function flipHasFallProtection()       { return has('gravity_flip', 'gf_3'); }
  function flipPullsEnemies()            { return has('gravity_flip', 'gf_4'); }
  function flipCanShoot()                { return has('gravity_flip', 'gf_5'); }
  function flipSlowsEnemies()            { return has('gravity_flip', 'gf_6'); }
  function flipSpawnsPlatforms()         { return has('gravity_flip', 'gf_7'); }
  function getFlipCooldownMult()         { return has('gravity_flip', 'gf_8') ? 0.75 : 1.0; }
  function flipSlamSynergy()             { return has('gravity_flip', 'gf_9'); }

  // ── ENERGY SHIELD modifiers ──
  function getShieldDuration(base) {
    if (has('energy_shield', 'es_1')) base *= 1.5;
    return base;
  }
  function getShieldHits()               { 
    let h = 1;
    if (has('energy_shield', 'es_2')) h = 2;
    if (has('energy_shield', 'es_6')) h = 3;
    return h;
  }
  function shieldReflects()              { return has('energy_shield', 'es_3'); }
  function shieldRegens()                { return has('energy_shield', 'es_4'); }
  function shieldExplodes()              { return has('energy_shield', 'es_5'); }
  function shieldReducesDmg()            { return has('energy_shield', 'es_7') ? 0.7 : 1.0; }
  function shieldIsBigger()              { return has('energy_shield', 'es_8'); }
  function shieldConvertsToHp()          { return has('energy_shield', 'es_9'); }

  // ── PULSE SLAM modifiers ──
  function getSlamSpeedMult()            { return has('pulse_slam', 'ps_1') ? 1.5 : 1.0; }
  function getSlamRadius(base)           { return has('pulse_slam', 'ps_2') ? base * 1.5 : base; }
  function slamBreaksAll()               { return has('pulse_slam', 'ps_3'); }
  function slamDamagesEnemies()          { return has('pulse_slam', 'ps_4'); }
  function slamHasShockwave()            { return has('pulse_slam', 'ps_5'); }
  function slamPulseCount()              { return has('pulse_slam', 'ps_6') ? 3 : 1; }
  function slamBouncesUp()               { return has('pulse_slam', 'ps_7'); }
  function slamPullsEnemies()            { return has('pulse_slam', 'ps_8'); }
  function slamChains()                  { return has('pulse_slam', 'ps_9'); }

  // ── DRONE modifiers ──
  function droneShoots()                 { return has('drone', 'dr_1'); }
  function getDroneFireMult()            { return has('drone', 'dr_2') ? 1.5 : 1.0; }
  function droneAimsWell()               { return has('drone', 'dr_3'); }
  function getDroneCount()               { 
    if (has('drone', 'dr_7')) return 3;
    if (has('drone', 'dr_4')) return 2;
    return 1;
  }
  function droneAppliesStatus()          { return has('drone', 'dr_5'); }
  function droneAssistsShield()          { return has('drone', 'dr_6'); }
  function droneIsExplosive()            { return has('drone', 'dr_8'); }
  function droneIsElite()                { return has('drone', 'dr_9'); }

  // ── TIME DISTORT modifiers ──
  function getSlowDuration(base)         { return has('time_distort', 'td_1') ? base * 1.5 : base; }
  function getSlowFactor()               { return has('time_distort', 'td_2') ? 0.3 : 0.5; }
  function slowPlayerUnaffected()        { return has('time_distort', 'td_3'); }
  function slowOnlyEnemies()             { return has('time_distort', 'td_4'); }
  function slowExtendsOnKill()           { return has('time_distort', 'td_5'); }
  function slowBoostsBullets()           { return has('time_distort', 'td_6'); }
  function slowBoostsDmg()               { return has('time_distort', 'td_7') ? 1.5 : 1.0; }
  function getSlowCooldownMult()         { return has('time_distort', 'td_8') ? 0.7 : 1.0; }
  function slowFreezesAtEnd()            { return has('time_distort', 'td_9'); }

  // ── PLATFORM FORGE modifiers ──
  function getForgeDuration(base)        { 
    if (has('platform_forge', 'pf_5')) return base * 3;
    if (has('platform_forge', 'pf_1')) return base * 1.5;
    return base;
  }
  function getForgeWidth(base)           { return has('platform_forge', 'pf_2') ? base * 1.5 : base; }
  function forgeIsMoving()               { return has('platform_forge', 'pf_3'); }
  function forgeIsBoost()                { return has('platform_forge', 'pf_4'); }
  function getForgeCount()               { return has('platform_forge', 'pf_6') ? 3 : 1; }
  function forgeAutoPlaces()             { return has('platform_forge', 'pf_7'); }
  function forgeTrapsEnemies()           { return has('platform_forge', 'pf_8'); }
  function forgeChains()                 { return has('platform_forge', 'pf_9'); }

  // ── CHAOS ENGINE modifiers ──
  function chaosHasBetterPool()          { return has('chaos_engine', 'ce_1'); }
  function chaosFewerNegatives()         { return has('chaos_engine', 'ce_2'); }
  function chaosDoubles()                { return has('chaos_engine', 'ce_3'); }
  function chaosPositiveBias()           { return has('chaos_engine', 'ce_4'); }
  function chaosHasRare()                { return has('chaos_engine', 'ce_5'); }
  function chaosChains()                 { return has('chaos_engine', 'ce_6'); }
  function chaosLongDuration()           { return has('chaos_engine', 'ce_7'); }
  function chaosNoNegatives()            { return has('chaos_engine', 'ce_8'); }
  function chaosAlwaysPositive()         { return has('chaos_engine', 'ce_9'); }

  // ── OVERDRIVE modifiers ──
  function getOverdriveDuration(base)    { return has('overdrive', 'od_1') ? base * 1.5 : base; }
  function getOverdriveMult()            { return has('overdrive', 'od_2') ? 1.5 : 1.0; }
  function getOverdriveCooldownMult()    { return has('overdrive', 'od_3') ? 0.75 : 1.0; }
  function overdriveHasLifesteal()       { return has('overdrive', 'od_4'); }
  function overdriveBoostsAbilities()    { return has('overdrive', 'od_5'); }
  function overdriveReducesGravity()     { return has('overdrive', 'od_6'); }
  function overdriveBoostsSpeed()        { return has('overdrive', 'od_7'); }
  function overdriveAutoShoot()          { return has('overdrive', 'od_8'); }
  function overdriveMaxPower()           { return has('overdrive', 'od_9'); }

  return {
    has,
    getRocketMultiplier, rocketHasDamageTrail, rocketBreaksPlatforms,
    rocketHasSteering, rocketDamagesOnContact, rocketCharges,
    rocketHasShockwave, rocketPullsCoins,
    getDashDistance, dashIsFast, dashPhasesEnemies, dashHasTrail,
    dashIsDouble, dashAutoTargets, dashResetsJump, dashSlowsTime, dashGivesShield,
    getFlipDuration, flipIsInstant, flipHasFallProtection, flipPullsEnemies,
    flipCanShoot, flipSlowsEnemies, flipSpawnsPlatforms, getFlipCooldownMult, flipSlamSynergy,
    getShieldDuration, getShieldHits, shieldReflects, shieldRegens,
    shieldExplodes, shieldReducesDmg, shieldIsBigger, shieldConvertsToHp,
    getSlamSpeedMult, getSlamRadius, slamBreaksAll, slamDamagesEnemies,
    slamHasShockwave, slamPulseCount, slamBouncesUp, slamPullsEnemies, slamChains,
    droneShoots, getDroneFireMult, droneAimsWell, getDroneCount,
    droneAppliesStatus, droneAssistsShield, droneIsExplosive, droneIsElite,
    getSlowDuration, getSlowFactor, slowPlayerUnaffected, slowOnlyEnemies,
    slowExtendsOnKill, slowBoostsBullets, slowBoostsDmg, getSlowCooldownMult, slowFreezesAtEnd,
    getForgeDuration, getForgeWidth, forgeIsMoving, forgeIsBoost,
    getForgeCount, forgeAutoPlaces, forgeTrapsEnemies, forgeChains,
    chaosHasBetterPool, chaosFewerNegatives, chaosDoubles, chaosPositiveBias,
    chaosHasRare, chaosChains, chaosLongDuration, chaosNoNegatives, chaosAlwaysPositive,
    getOverdriveDuration, getOverdriveMult, getOverdriveCooldownMult,
    overdriveHasLifesteal, overdriveBoostsAbilities, overdriveReducesGravity,
    overdriveBoostsSpeed, overdriveAutoShoot, overdriveMaxPower,
  };
})();
