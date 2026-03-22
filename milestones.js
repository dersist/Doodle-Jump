// ═══════════════════════════════════════════════════════════════
//  MILESTONES.JS — Height milestone rewards every 1,000 height
//  Coins scale: 1k=50, 2k=75, 3k=100, 4k=130... increasing
// ═══════════════════════════════════════════════════════════════
const Milestones = (() => {
  let lastMilestoneScore = 0; // highest milestone checked this run

  function reset() { lastMilestoneScore = 0; }

  function coinsForMilestone(n) {
    // n = milestone number (1 = first 1k, 2 = 2k, etc.)
    // 50, 75, 100, 130, 160, 200, 250, 300, 375, 450...
    return Math.floor(50 * Math.pow(1.2, n - 1));
  }

  // Called every frame from main update. Returns reward if new milestone hit, else null.
  function check(score) {
    const milestone = Math.floor(score / 1000);
    if (milestone <= 0 || milestone <= lastMilestoneScore) return null;

    lastMilestoneScore = milestone;
    const coins = coinsForMilestone(milestone);

    // Award coins
    GameState.totalCoins += coins;
    GameState.coins += coins; // also show in HUD
    if (typeof RunStats !== 'undefined') RunStats.coinsCollected += coins;

    // Track milestone history
    if (!GameState.milestonesReached) GameState.milestonesReached = 0;
    GameState.milestonesReached++;
    Save.save();

    // Show toast
    UI.showToast(`🏁 HEIGHT ${(milestone * 1000).toLocaleString()}! +${coins}◈`, 2000);
    SFX.play('purchase');

    // Floating coins particle at player
    if (GameState.player) {
      const p = GameState.player;
      Particles.coins(p.x + p.w/2, p.y + p.h/2 - GameState.cameraY, coins);
    }

    return { milestone, coins };
  }

  function getNextMilestone(score) {
    const next = (Math.floor(score / 1000) + 1) * 1000;
    return { height: next, coins: coinsForMilestone(next / 1000) };
  }

  return { reset, check, getNextMilestone, coinsForMilestone };
})();
