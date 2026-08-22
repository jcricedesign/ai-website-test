(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('display') !== '1') return;

  const IDLE_MS = 60_000;
  const START_DWELL_MS = 2_500;
  const EDGE_DWELL_MIN = 3_500;
  const EDGE_DWELL_MAX = 6_500;
  const STEP_MIN = 420;
  const STEP_MAX = 900;
  const MOVE_MIN_MS = 320;
  const MOVE_MAX_MS = 620;
  const PAUSE_MIN = 900;
  const PAUSE_MAX = 2_800;
  const RECOIL_MIN = 18;
  const RECOIL_MAX = 55;
  const PAGE_DWELL_MIN = 22_000;
  const PAGE_DWELL_MAX = 38_000;
  const FADE_MS = 450;
  const SESSION_KEY = 'jcr-attract-running';
  const ROUTES = ['/', '/work/', '/barber-game/'];

  let idleTimer = null;
  let stepTimer = null;
  let pageTimer = null;
  let motionFrame = null;
  let active = false;
  let direction = 1;
  let lastPointer = { x: null, y: null };

  document.documentElement.dataset.displayMode = '1';

  const randomBetween = (min, max) => Math.round(min + Math.random() * (max - min));
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  function clearMotion() {
    if (stepTimer) clearTimeout(stepTimer);
    if (pageTimer) clearTimeout(pageTimer);
    if (motionFrame) cancelAnimationFrame(motionFrame);
    stepTimer = null;
    pageTimer = null;
    motionFrame = null;
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

  function animateScroll(target, duration, done) {
    const start = window.scrollY;
    const distance = target - start;
    const startTime = performance.now();

    function frame(now) {
      if (!active) return;
      const t = Math.min(1, (now - startTime) / duration);
      window.scrollTo(0, start + distance * easeOutCubic(t));
      if (t < 1) motionFrame = requestAnimationFrame(frame);
      else {
        motionFrame = null;
        if (done) done();
      }
    }

    motionFrame = requestAnimationFrame(frame);
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
    const duration = randomBetween(MOVE_MIN_MS, MOVE_MAX_MS);

    animateScroll(target, duration, () => {
      if (!active) return;
      const recoil = randomBetween(RECOIL_MIN, RECOIL_MAX) * -direction;
      const settle = Math.max(0, Math.min(bottom, window.scrollY + recoil));
      animateScroll(settle, randomBetween(120, 220), () => {
        scheduleStep(randomBetween(PAUSE_MIN, PAUSE_MAX));
      });
    });
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

  if (sessionStorage.getItem(SESSION_KEY) === '1') {
    setTimeout(startAttractMode, 700);
  } else {
    armIdleTimer();
  }
})();
