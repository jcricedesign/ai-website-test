(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('display') !== '1') return;

  const ROUTES = ['/', '/work/', '/barber-game/', '/career/', '/playground/'];
  let lastPointer = { x: null, y: null };

  document.documentElement.dataset.displayMode = '1';

  function userActivity() {
    // Screensaver intentionally disabled while voice control is being developed.
  }

  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  }

  function presentationStops() {
    const selectors = [
      '[data-presentation-stop]',
      'main > section',
      '.project-story',
      '.project-media',
      'main > article',
      'footer'
    ];
    const seen = new Set();
    const stops = [];
    document.querySelectorAll(selectors.join(',')).forEach(el => {
      if (!seen.has(el) && visible(el)) { seen.add(el); stops.push(el); }
    });
    stops.sort((a, b) => a.getBoundingClientRect().top + scrollY - (b.getBoundingClientRect().top + scrollY));
    return stops;
  }

  function normalizedPath() {
    let p = location.pathname;
    return p.endsWith('/') ? p : p + '/';
  }

  function goRoute(direction) {
    const p = normalizedPath();
    const i = ROUTES.indexOf(p);
    const base = i >= 0 ? i : 0;
    const next = Math.max(0, Math.min(ROUTES.length - 1, base + direction));
    if (next === base) return false;
    location.href = `${ROUTES[next]}?display=1`;
    return true;
  }

  function goHome() {
    userActivity();
    if (normalizedPath() === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    location.href = '/?display=1';
  }

  function stepPresentation(direction) {
    userActivity();
    const stops = presentationStops();
    if (!stops.length) {
      window.scrollBy({ top: direction * innerHeight * 0.72, behavior: 'smooth' });
      return;
    }
    const viewportFocus = scrollY + innerHeight * 0.46;
    const positions = stops.map(el => el.getBoundingClientRect().top + scrollY);
    let index;
    if (direction > 0) index = positions.findIndex(y => y > viewportFocus + 24);
    else {
      index = -1;
      for (let i = positions.length - 1; i >= 0; i--) if (positions[i] < viewportFocus - 24) { index = i; break; }
    }
    if (index < 0 || index >= stops.length) {
      if (!goRoute(direction)) return;
      return;
    }
    stops[index].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }

  function pointerActivity(event) {
    if (lastPointer.x !== null) {
      const dx = Math.abs(event.clientX - lastPointer.x), dy = Math.abs(event.clientY - lastPointer.y);
      if (dx < 3 && dy < 3) return;
    }
    lastPointer = { x: event.clientX, y: event.clientY };
    userActivity();
  }

  window.addEventListener('pointermove', pointerActivity, { passive: true });
  window.addEventListener('pointerdown', userActivity, { passive: true });
  window.addEventListener('wheel', userActivity, { passive: true });
  window.addEventListener('touchstart', userActivity, { passive: true });
  window.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      stepPresentation(1);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      stepPresentation(-1);
      return;
    }
    if (event.key === 'F8') {
      event.preventDefault();
      goHome();
      return;
    }
    userActivity();
  });
})();
