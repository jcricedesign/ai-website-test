(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('display') !== '1') return;

  const IDLE_MS = 60_000;
  const EDGE_DWELL_MS = 7_000;
  const START_DWELL_MS = 5_000;
  const SCROLL_PX_PER_SECOND = 22;

  let idleTimer = null;
  let dwellTimer = null;
  let animationFrame = null;
  let active = false;
  let direction = 1;
  let lastFrame = 0;
  let lastPointer = { x: null, y: null };

  document.documentElement.dataset.displayMode = '1';

  function clearMotion() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (dwellTimer) clearTimeout(dwellTimer);
    animationFrame = null;
    dwellTimer = null;
    lastFrame = 0;
  }

  function setDisplayState(on) {
    document.documentElement.classList.toggle('jcr-attract-active', on);
    document.body.style.cursor = on ? 'none' : '';
  }

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function scheduleMotion(delay = START_DWELL_MS) {
    if (!active) return;
    dwellTimer = setTimeout(() => {
      lastFrame = 0;
      animationFrame = requestAnimationFrame(scrollFrame);
    }, delay);
  }

  function scrollFrame(timestamp) {
    if (!active) return;

    if (!lastFrame) lastFrame = timestamp;
    const elapsed = Math.min((timestamp - lastFrame) / 1000, 0.1);
    lastFrame = timestamp;

    const bottom = maxScroll();
    const y = window.scrollY;

    if (bottom < 2) {
      direction *= -1;
      animationFrame = null;
      scheduleMotion(EDGE_DWELL_MS);
      return;
    }

    if (direction > 0 && y >= bottom - 2) {
      window.scrollTo(0, bottom);
      direction = -1;
      animationFrame = null;
      scheduleMotion(EDGE_DWELL_MS);
      return;
    }

    if (direction < 0 && y <= 2) {
      window.scrollTo(0, 0);
      direction = 1;
      animationFrame = null;
      scheduleMotion(EDGE_DWELL_MS);
      return;
    }

    window.scrollBy(0, direction * SCROLL_PX_PER_SECOND * elapsed);
    animationFrame = requestAnimationFrame(scrollFrame);
  }

  function startAttractMode() {
    if (active) return;
    active = true;
    direction = window.scrollY >= maxScroll() - 2 ? -1 : 1;
    setDisplayState(true);
    scheduleMotion();
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
    // Ignore tiny sensor noise from a stationary mouse. This is especially
    // useful on kiosk hardware where an attached mouse can jitter by a pixel.
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
    if (active) scheduleMotion(1000);
    else armIdleTimer();
  });

  armIdleTimer();
})();
