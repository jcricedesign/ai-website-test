(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('display') !== '1') return;

  const ROUTES = ['/', '/work/', '/barber-game/', '/career/', '/playground/'];
  const FEEDBACK_URL = 'http://127.0.0.1:8765/api/feedback';
  let lastPointer = { x: null, y: null };
  let feedbackTimer = null;
  let feedbackSeq = 0;

  document.documentElement.dataset.displayMode = '1';

  function userActivity() {
    // Screensaver intentionally disabled while voice control is being developed.
  }

  function ensureFeedback() {
    let el = document.getElementById('jcr-display-feedback');
    if (el) return el;

    const style = document.createElement('style');
    style.textContent = `
      #jcr-display-feedback{
        position:fixed;left:50%;bottom:7vh;z-index:2147483647;
        transform:translate(-50%,18px);opacity:0;pointer-events:none;
        min-width:180px;max-width:min(70vw,680px);padding:14px 22px 15px;
        border:1px solid rgba(255,255,255,.20);border-radius:999px;
        background:rgba(0,0,0,.90);color:#fff;text-align:center;
        font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
        transition:opacity .18s ease,transform .22s ease;
        box-shadow:0 10px 34px rgba(0,0,0,.35)
      }
      #jcr-display-feedback.jcr-visible{opacity:1;transform:translate(-50%,0)}
      #jcr-display-feedback .jcr-feedback-label{font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
      #jcr-display-feedback .jcr-feedback-detail{margin-top:4px;font-size:12px;color:rgba(255,255,255,.68)}
    `;
    document.head.appendChild(style);

    el = document.createElement('div');
    el.id = 'jcr-display-feedback';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="jcr-feedback-label"></div><div class="jcr-feedback-detail"></div>';
    document.body.appendChild(el);
    return el;
  }

  function showFeedback(label, detail = '', duration = 1100) {
    if (!label) return;
    const el = ensureFeedback();
    el.querySelector('.jcr-feedback-label').textContent = label;
    const detailEl = el.querySelector('.jcr-feedback-detail');
    detailEl.textContent = detail;
    detailEl.style.display = detail ? '' : 'none';
    clearTimeout(feedbackTimer);
    requestAnimationFrame(() => el.classList.add('jcr-visible'));
    if (duration > 0) feedbackTimer = setTimeout(() => el.classList.remove('jcr-visible'), duration);
  }

  async function pollFeedback() {
    try {
      const response = await fetch(`${FEEDBACK_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('feedback unavailable');
      const data = await response.json();
      if (data.ok && data.seq > feedbackSeq) {
        feedbackSeq = data.seq;
        showFeedback(data.label, data.detail || '', data.duration || 1100);
      }
    } catch (_) {
      // Feedback is optional; presentation controls continue to work if unavailable.
    } finally {
      setTimeout(pollFeedback, 250);
    }
  }

  function visible(el) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  }

  function presentationStops() {
    const selectors = ['[data-presentation-stop]','main > section','.project-story','.project-media','main > article','footer'];
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
    if (event.key === 'Home') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      return;
    }
    if (event.key === 'F8') {
      event.preventDefault();
      goHome();
      return;
    }
    userActivity();
  });

  ensureFeedback();
  pollFeedback();
})();
