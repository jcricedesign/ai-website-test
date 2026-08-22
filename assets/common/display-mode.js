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
  const PAGE_DWELL_MIN = 22_000;
  const PAGE_DWELL_MAX = 38_000;
  const FADE_MS = 450;
  const SESSION_KEY = 'jcr-attract-running';
  const ROUTES = ['/', '/work/', '/barber-game/'];

  let idleTimer = null;
  let stepTimer = null;
  let pageTimer = null;
  let active = false;
  let direction = 1;
  let lastPointer = { x: null, y: null };

  document.documentElement.dataset.displayMode = '1';

  const randomBetween = (min, max) => Math.round(min + Math.random() * (max - min));

  function clearMotion() {
    if (stepTimer) clearTimeout(stepTimer);
    if (pageTimer) clearTimeout(pageTimer);
    stepTimer = null;
    pageTimer = null;
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
    if (stepTimer) clearTimeout(stepTimer);
    stepTimer = setTimeout(takeStep, delay);
  }

  function currentRouteIndex() {
    let path = window.location.pathname;
    if (!path.endsWith('/')) path += '/';
    const index = ROUTES.indexOf(path);
    return index >= 0 ? index : 0;
  }

  function fadeToNextPage() {
    if (!active) return;
    const next = ROUTES[(currentRouteIndex() + 1) % ROUTES.length];
    sessionStorage.setItem(SESSION_KEY, '1');
    document.body.style.transition = `opacity ${FADE_MS}ms ease`;
    document.body.style.opacity = '0';
    setTimeout(() => {
      window.location.href = `${next}?display=1`;
    }, FADE_MS);
  }

  function schedulePageChange() {
    if (!active) return;
    if (pageTimer) clearTimeout(pageTimer);
    pageTimer = setTimeout(fadeToNextPage, randomBetween(PAGE_DWELL_MIN, PAGE_DWELL_MAX));
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

    const amount = randomBetween(STEP_MIN, STEP_MAX) * direction;
    const target = Math.max(0, Math.min(bottom, y + amount));
    window.scrollTo({ top: target, behavior: 'smooth' });
    scheduleStep(randomBetween(PAUSE_MIN, PAUSE_MAX));
  }

  function startAttractMode() {
    if (active) return;
    active = true;
    sessionStorage.setItem(SESSION_KEY, '1');
    direction = window.scrollY >= maxScroll() - 4 ? -1 : 1;
    setDisplayState(true);
    scheduleStep(START_DWELL_MS);
    schedulePageChange();
  }

  function stopAttractMode() {
    if (!active) return;
    clearMotion();
    active = false;
    sessionStorage.removeItem(SESSION_KEY);
    setDisplayState(false);
    document.body.style.opacity = '';
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

  document.body.style.opacity = '1';

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearMotion();
      return;
    }
    if (active) {
      scheduleStep(1000);
      schedulePageChange();
    } else {
      armIdleTimer();
    }
  });

  // A page navigation created by attract mode should continue the tour
  // immediately rather than imposing another full idle wait.
  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    setTimeout(startAttractMode, 700);
  } else {
    armIdleTimer();
  }
})();
