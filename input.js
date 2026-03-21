// ═══════════════════════════════════════════
//  INPUT.JS — Controls handling
// ═══════════════════════════════════════════

const Input = (() => {
  const keys = {};
  const justPressed = {};
  const justReleased = {};

  let touchLeft = false;
  let touchRight = false;
  let touchShoot = false;

  function init() {
    window.addEventListener('keydown', (e) => {
      if (!keys[e.code]) justPressed[e.code] = true;
      keys[e.code] = true;
      // Prevent page scroll during gameplay
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      keys[e.code] = false;
      justReleased[e.code] = true;
    });

    // Touch controls
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
  }

  function handleTouchStart(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const x = touch.clientX;
      const w = window.innerWidth;
      if (x < w * 0.35) touchLeft = true;
      else if (x > w * 0.65) touchRight = true;
      else touchShoot = true;
    }
  }

  function handleTouchEnd(e) {
    e.preventDefault();
    touchLeft = false;
    touchRight = false;
    touchShoot = false;
  }

  function isDown(code) {
    if (code === 'ArrowLeft'  || code === 'KeyA') return keys[code] || touchLeft;
    if (code === 'ArrowRight' || code === 'KeyD') return keys[code] || touchRight;
    return !!keys[code];
  }

  function wasJustPressed(code) { return !!justPressed[code]; }
  function wasJustReleased(code) { return !!justReleased[code]; }

  function clearFrame() {
    for (const k in justPressed)  delete justPressed[k];
    for (const k in justReleased) delete justReleased[k];
  }

  function isMovingLeft()   { return isDown('ArrowLeft')  || isDown('KeyA'); }
  function isMovingRight()  { return isDown('ArrowRight') || isDown('KeyD'); }
  // Shoot: hold W or ArrowUp (touch centre)
  function isShooting()     { return isDown('ArrowUp') || isDown('KeyW') || touchShoot; }
  // Slam: S, ArrowDown, or Shift
  function isSlamming()     { return isDown('ArrowDown') || isDown('KeyS') || isDown('ShiftLeft'); }
  // Space = quick-restart (just-press, not hold)
  function isQuickRestart() { return wasJustPressed('Space'); }
  // P = pause toggle in-game
  function isPausePressed() { return wasJustPressed('KeyP'); }
  // Escape = context-aware (handled in main.js update)
  function isEscapePressed(){ return wasJustPressed('Escape'); }
  // T = toggle speedrun timer
  function isTimerToggle()  { return wasJustPressed('KeyT'); }

  function getAbilitySlot() {
    if (wasJustPressed('Digit1') || wasJustPressed('Numpad1')) return 1;
    if (wasJustPressed('Digit2') || wasJustPressed('Numpad2')) return 2;
    if (wasJustPressed('Digit3') || wasJustPressed('Numpad3')) return 3;
    return 0;
  }

  return {
    init, isDown, wasJustPressed, wasJustReleased, clearFrame,
    isMovingLeft, isMovingRight, isShooting, isSlamming,
    isQuickRestart, getAbilitySlot, isPausePressed, isEscapePressed, isTimerToggle,
  };
})();
