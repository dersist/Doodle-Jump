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
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
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
    if (code === 'ArrowLeft' || code === 'KeyA') return keys[code] || touchLeft;
    if (code === 'ArrowRight' || code === 'KeyD') return keys[code] || touchRight;
    if (code === 'ArrowUp' || code === 'KeyW') return keys[code] || touchShoot;
    return !!keys[code];
  }

  function wasJustPressed(code) {
    return !!justPressed[code];
  }

  function wasJustReleased(code) {
    return !!justReleased[code];
  }

  function clearFrame() {
    for (const k in justPressed) delete justPressed[k];
    for (const k in justReleased) delete justReleased[k];
  }

  function isMovingLeft()  { return isDown('ArrowLeft') || isDown('KeyA'); }
  function isMovingRight() { return isDown('ArrowRight') || isDown('KeyD'); }
  function isShooting()    { return isDown('Space') || isDown('ArrowUp') || isDown('KeyW'); }
  function isSlamming()    { return isDown('ArrowDown') || isDown('KeyS') || isDown('ShiftLeft'); }

  function getAbilitySlot() {
    if (wasJustPressed('Digit1') || wasJustPressed('Numpad1')) return 1;
    if (wasJustPressed('Digit2') || wasJustPressed('Numpad2')) return 2;
    if (wasJustPressed('Digit3') || wasJustPressed('Numpad3')) return 3;
    return 0;
  }

  function isPausePressed() { return wasJustPressed('Escape') || wasJustPressed('KeyP'); }
  function isTimerToggle() { return wasJustPressed('KeyT'); }

  return { init, isDown, wasJustPressed, wasJustReleased, clearFrame,
           isMovingLeft, isMovingRight, isShooting, isSlamming, getAbilitySlot,
           isPausePressed, isTimerToggle };
})();
