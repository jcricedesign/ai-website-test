(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('display') !== '1') return;

  const IDLE_MS = 60_000;
  const START_DWELL_MS = 3_000;
  const EDGE_DWELL_MIN = 4_000;
  const EDGE_DWELL_MAX = 8_000;
  const STEP_MIN = 150;
  const STEP_MAX = 420;
  const PAUSE_MIN = 1_800;
  const PAUSE_MAX = 5_500;

  let idleTimer = null;
  let stepTimer = null;
  let active = false;
  let direction = 1;
  let lastPointer = { x: null, y: null };

  document.documentElement.dataset.displayMode = '1';

  const randomBetween = (min, max) => Math.round(min + Math.random() * (max - min));

  function clearMotion() {
    if (stepTimer) clearTimeout(stepTimer);
    stepTimer = null;
  }

  function setDisplayState(on) {
    document.documentElement.classList.toggle('jcr-attract-active', on);
    document.body.style.cursor = on ? 'none' : '';
  }

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function scheduleStep(delay) {
    if (!active) return;
    clearMotion();
    stepTimer = setTimeout(takeStep, delay);
  }

  function takeStep() {
    if (!active) return;

    const bottom = maxScroll();
    const y = window.scrollY;

    if (bottom < 2) {
      scheduleStep(randomBetween(EDGE_DWELL_MIN, EDGE_DWELL_MAX));
      return;
    }

    if (direction > 0 && y >= bottom - 4) {
      direction = -1;
      scheduleStep(randomBetween(EDGE_DWELL_MIN, EDGE_DWELL_MAX));
      return;
    }

    if (direction < 0 && y <= 4) {
      direction = 1;
      scheduleStep(randomBetween(EDGE_DWELL_MIN, EDGE_DWELL_MAX));
      return;
    }

    // Move in irregular, wheel-like gestures instead of a continuous crawl.
    // Browser smooth scrolling supplies the ease/elasticity; randomized step
    // size and dwell keep the motion from settling into a mechanical rhythm.
    const amount = randomBetween(STEP_MIN, STEP_MAX) * direction;
    const target = Math.max(0, Math.min(bottom, y + amount));
    window.scrollTo({ top: target, behavior: 'smooth' });

    scheduleStep(randomBetween(PAUSE_MIN, PAUSE_MAX));
  }

  function startAttractMode() {
    if (active) return;
    active = true;
    direction = window.scrollY >= maxScroll() - 4 ? -1 : 1;
    setDisplayState(true);
    scheduleStep(START_DWELL_MS);
  }

  function stopAttractMode() {
    if (!active) return;
    clearMotion();
    active = false;
    setDisplayState(false);
  }

  function armIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(startAttractMode, IDLE_MS);
  }

  function userActivity() {
    stopAttractMode();
    armIdleTimer();
  }

  function pointerActivity(event) {
    // Ignore tiny sensor noise from a stationary mouse on kiosk hardware.
    if (lastPointer.x !== null) {
      const dx = Math.abs(event.clientX - lastPointer.x);
      const dy = Math.abs(event.clientY - lastPointer.y);
      if (dx < 3 && dy < 3) return;
    }
    lastPointer = { x: event.clientX, y: event.clientY };
    userActivity();
  }

  window.addEventListener('pointermove', pointerActivity, { passive: true });
  window.addEventListener('pointerdown', userActivity, { passive: true });
  window.addEventListener('wheel', userActivity, { passive: true });
  window.addEventListener('touchstart', userActivity, { passive: true });
  window.addEventListener('keydown', userActivity);

  window.addEventListener('pageshow', armIdleTimer);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearMotion();
      return;
    }
    if (active) scheduleStep(1000);
    else armIdleTimer();
  });

  armIdleTimer();
})();
