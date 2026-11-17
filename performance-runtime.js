/* KORZHANY HUB v490 — stable selective-motion runtime.
   Keeps UI work off hot interaction frames without dynamically changing visual quality.
   v488 intentionally freezes decorative quality to prevent Chromium repaint flicker. */
(() => {
  'use strict';
  if (window.__KORZHANY_PERF_V490__) return;
  window.__KORZHANY_PERF_V490__ = true;
  // Global contract for HUB modules: decorative motion must never fight live UI paints.
  window.__KORZHANY_STATIC_UI__ = true;

  const root = document.documentElement;
  root.classList.add('kor-perf-runtime');

  const nativeSetInterval = window.setInterval.bind(window);
  const nativeClearInterval = window.clearInterval.bind(window);
  const nativeSetTimeout = window.setTimeout.bind(window);
  const ric = typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback.bind(window)
    : (cb, opts = {}) => nativeSetTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), Math.min(24, Number(opts.timeout || 24)));

  function idleInterval(fn, ms = 1000, options = {}) {
    const delay = Math.max(80, Number(ms) || 1000);
    const timeout = Math.max(80, Math.min(delay, Number(options.timeout || 480)));
    return nativeSetInterval(() => {
      if (document.hidden && options.runWhenHidden !== true) return;
      ric(() => {
        if (document.hidden && options.runWhenHidden !== true) return;
        try { fn(); } catch (err) { console.error('[KOR PERF idleInterval]', err); }
      }, { timeout });
    }, delay);
  }

  function idleTask(fn, timeout = 360) {
    return ric(() => {
      if (document.hidden) return;
      try { fn(); } catch (err) { console.error('[KOR PERF idleTask]', err); }
    }, { timeout: Math.max(80, Number(timeout) || 360) });
  }

  const api = window.KorPerf = Object.assign(window.KorPerf || {}, {
    version: 490,
    idleInterval,
    idleTask,
    clearInterval: nativeClearInterval,
    quality: 'stable',
    fps: 60
  });

  // Preload the current Sakura background before large translucent panels paint.
  try {
    const theme = localStorage.getItem('rostyasha_theme');
    if (theme === 'sakura') {
      const time = localStorage.getItem('korzhany_hub_time') === 'night' ? 'night' : 'day';
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.fetchPriority = 'high';
      link.href = time === 'night' ? '/assets/sakura-theme-bg-night.webp' : '/assets/sakura-theme-bg.webp';
      document.head.appendChild(link);
    }
  } catch (_) {}

  // Intent-based internal prefetch: a hovered HUB tile is usually the next page.
  const prefetched = new Set();
  let prefetchTimer = 0;
  function prefetchAnchor(anchor) {
    if (!anchor || !anchor.href) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch (_) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (/\/(?:logout|api|auth)(?:\/|$)/i.test(url.pathname)) return;
    const key = url.pathname + url.search;
    if (prefetched.has(key)) return;
    prefetched.add(key);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = url.href;
    document.head.appendChild(link);
  }
  document.addEventListener('pointerover', (event) => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    clearTimeout(prefetchTimer);
    prefetchTimer = nativeSetTimeout(() => prefetchAnchor(anchor), 12);
  }, { passive: true });
  document.addEventListener('focusin', (event) => {
    const anchor = event.target.closest?.('a[href]');
    if (anchor) idleTask(() => prefetchAnchor(anchor), 180);
  });

  // v488: monitor FPS for diagnostics only. v486 changed blur/atmosphere classes
  // while the page was live; on Chromium (especially at non-100% zoom) that can
  // invalidate huge backdrop-filter layers and make the whole HUB visibly flash.
  // Visual quality is now fixed for the lifetime of the page.
  let frameCount = 0;
  let sampleStart = performance.now();
  function fpsFrame(now) {
    frameCount += 1;
    const elapsed = now - sampleStart;
    if (elapsed >= 2000) {
      api.fps = Math.round((frameCount * 1000) / Math.max(1, elapsed));
      frameCount = 0;
      sampleStart = now;
    }
    requestAnimationFrame(fpsFrame);
  }
  requestAnimationFrame(fpsFrame);

  // Never switch global animation/blur classes on visibility changes. Doing so
  // repainted every card/button at once when returning to the tab.
  document.addEventListener('visibilitychange', () => {
    frameCount = 0;
    sampleStart = performance.now();
  });

  // v488: no page entrance opacity/scale animation; first paint stays stable.
})();

/* V496_INPUT_FAST_LANE: warm likely destinations before the user clicks them. */
(() => {
  if (window.__KORZHANY_V496_FAST_LANE__) return;
  window.__KORZHANY_V496_FAST_LANE__ = true;

  const warmed = new Set();

  function warmAnchor(anchor) {
    if (!anchor?.href) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch (_) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (/\/(?:api|auth|logout)(?:\/|$)/i.test(url.pathname)) return;

    const key = url.pathname + url.search;
    if (warmed.has(key)) return;
    warmed.add(key);

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'document';
    link.href = url.href;
    document.head.appendChild(link);
  }

  // Hover/focus starts warming immediately; pointerdown is a final safety net.
  document.addEventListener('pointerover', (event) => {
    const a = event.target.closest?.('a[href]');
    if (a) warmAnchor(a);
  }, { passive:true });
  document.addEventListener('pointerdown', (event) => {
    const a = event.target.closest?.('a[href]');
    if (a) warmAnchor(a);
  }, { capture:true, passive:true });
  document.addEventListener('focusin', (event) => {
    const a = event.target.closest?.('a[href]');
    if (a) warmAnchor(a);
  });

  // HUB has only a small set of modules. Warm them during idle so normal clicks
  // usually hit an already-fetched document without blocking the first paint.
  const warmHubDestinations = () => {
    document.querySelectorAll(
      'a.hub-modern-card[href],a.hub-card[href],a[data-hub-activity][href],a.mg-back[href]'
    ).forEach(warmAnchor);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      (window.requestIdleCallback || ((cb) => setTimeout(cb, 80)))(warmHubDestinations, { timeout:700 });
    }, { once:true });
  } else {
    (window.requestIdleCallback || ((cb) => setTimeout(cb, 80)))(warmHubDestinations, { timeout:700 });
  }
})();
