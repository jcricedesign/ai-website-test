(() => {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('display') !== '1') return;

  const IDLE_MS = 60_000;
  let idleTimer = null;
  let active = false;
  let iframe = null;
  let lastPointer = { x: null, y: null };

  document.documentElement.dataset.displayMode = '1';

  function ensureScreensaver() {
    if (iframe) return iframe;
    iframe = document.createElement('iframe');
    iframe.src = '/playground/display-screensaver/';
    iframe.title = 'Display screensaver';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    Object.assign(iframe.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      border: '0',
      margin: '0',
      padding: '0',
      zIndex: '2147483647',
      opacity: '0',
      visibility: 'hidden',
      pointerEvents: 'none',
      background: '#080808',
      transition: 'opacity 650ms ease, visibility 0s linear 650ms'
    });
    document.body.appendChild(iframe);
    return iframe;
  }

  function startScreensaver() {
    if (active) return;
    active = true;
    const frame = ensureScreensaver();
    frame.style.visibility = 'visible';
    frame.style.transition = 'opacity 650ms ease';
    requestAnimationFrame(() => { frame.style.opacity = '1'; });
    document.body.style.cursor = 'none';
    document.documentElement.classList.add('jcr-screensaver-active');
  }

  function stopScreensaver() {
    if (!active) return;
    active = false;
    document.documentElement.classList.remove('jcr-screensaver-active');
    document.body.style.cursor = '';
    if (iframe) {
      iframe.style.opacity = '0';
      iframe.style.transition = 'opacity 300ms ease, visibility 0s linear 300ms';
      setTimeout(() => {
        if (!active && iframe) iframe.style.visibility = 'hidden';
      }, 320);
    }
  }

  function armIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(startScreensaver, IDLE_MS);
  }

  function userActivity() {
    stopScreensaver();
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

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (idleTimer) clearTimeout(idleTimer);
      return;
    }
    if (!active) armIdleTimer();
  });

  armIdleTimer();
})();
