(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const MIN_DISPLAY_WIDTH = 900;
  const MIN_DISPLAY_HEIGHT = 500;
  if (params.get('display') !== '1' || innerWidth < MIN_DISPLAY_WIDTH || innerHeight < MIN_DISPLAY_HEIGHT) return;

  const ROUTES = ['/', '/work/', '/barber-game/', '/career/', '/playground/'];
  const FEEDBACK_URL = 'http://127.0.0.1:8765/api/feedback';
  const SCREENSAVER_URL = '/playground/display-screensaver/?ambient=1';
  const IDLE_MS = 60000;
  let lastPointer = { x: null, y: null };
  let feedbackTimer = null;
  let feedbackSeq = 0;
  let idleTimer = null;
  let screensaverVisible = false;

  document.documentElement.dataset.displayMode = '1';

  function screensaverEl() {
    return document.getElementById('jcr-display-screensaver');
  }

  function ensureScreensaverFrame() {
    let frame = screensaverEl();
    if (frame) return frame;

    frame = document.createElement('iframe');
    frame.id = 'jcr-display-screensaver';
    frame.src = SCREENSAVER_URL;
    frame.tabIndex = -1;
    frame.setAttribute('aria-label', 'Ambient display resting state');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = [
      'position:fixed',
      'inset:0',
      'width:100%',
      'height:100%',
      'border:0',
      'z-index:2147483000',
      'background:#070809',
      'opacity:0',
      'visibility:hidden',
      'transition:opacity .8s ease',
      'pointer-events:none'
    ].join(';');
    document.body.appendChild(frame);
    return frame;
  }

  function showScreensaver() {
    if (document.hidden || screensaverVisible) return;
    const frame = ensureScreensaverFrame();
    clearTimeout(idleTimer);
    screensaverVisible = true;
    frame.setAttribute('aria-hidden', 'false');
    frame.style.visibility = 'visible';
    requestAnimationFrame(() => requestAnimationFrame(() => { frame.style.opacity = '1'; }));
  }

  function hideScreensaver() {
    const frame = screensaverEl();
    screensaverVisible = false;
    if (!frame) return;
    frame.setAttribute('aria-hidden', 'true');
    frame.style.opacity = '0';
    setTimeout(() => {
      if (!screensaverVisible) frame.style.visibility = 'hidden';
    }, 850);
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    if (document.hidden || screensaverVisible) return;
    idleTimer = setTimeout(showScreensaver, IDLE_MS);
  }

  function userActivity() {
    if (screensaverVisible) hideScreensaver();
    resetIdle();
  }

  function ensureFeedback() {
    let el = document.getElementById('jcr-display-feedback');
    if (el) return el;

    const style = document.createElement('style');
    style.textContent = `
      #jcr-display-feedback{
        position:fixed;left:50%;bottom:6vh;z-index:2147483647;
        transform:translate(-50%,36px);opacity:0;pointer-events:none;
        box-sizing:border-box;width:min(76vw,1200px);min-height:16vh;
        padding:3.2vh 5vw;display:flex;flex-direction:column;align-items:center;justify-content:center;
        border:2px solid rgba(255,255,255,.20);border-radius:3vh;
        background:rgba(0,0,0,.90);color:#fff;text-align:center;
        font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
        transition:opacity .65s ease,transform .28s ease;
        box-shadow:0 16px 50px rgba(0,0,0,.38)
      }
      #jcr-display-feedback.jcr-visible{opacity:1;transform:translate(-50%,0);transition:opacity .18s ease,transform .22s ease}
      #jcr-display-feedback .jcr-feedback-label{font-size:clamp(54px,7vh,92px);line-height:1;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      #jcr-display-feedback .jcr-feedback-detail{margin-top:1.4vh;font-size:clamp(30px,3.6vh,52px);line-height:1.1;color:rgba(255,255,255,.72)}
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

  function showFeedback(label, detail = '', duration = 2100) {
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
        if ((data.label || '').toLowerCase() === 'screensaver') {
          showScreensaver();
        } else {
          hideScreensaver();
          resetIdle();
          showFeedback(data.label, data.detail || '', data.duration || 2100);
        }
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
    if (event.key === 'F9') {
      event.preventDefault();
      showScreensaver();
      return;
    }
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
      userActivity();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      userActivity();
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

  document.addEventListener('visibilitychange', () => {
    clearTimeout(idleTimer);
    if (!document.hidden) resetIdle();
  });
  window.addEventListener('pageshow', resetIdle, { passive: true });
  window.addEventListener('resize', () => {
    if (innerWidth < MIN_DISPLAY_WIDTH || innerHeight < MIN_DISPLAY_HEIGHT) {
      clearTimeout(idleTimer);
      hideScreensaver();
    } else {
      resetIdle();
    }
  }, { passive: true });

  ensureFeedback();
  setTimeout(ensureScreensaverFrame, 1200);
  resetIdle();
  pollFeedback();
})();
