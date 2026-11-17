(() => {
  const STORAGE_KEY = 'rostyasha_theme';
  const TIME_KEY = 'korzhany_hub_time';
  const WALLPAPER_ENABLED_KEY = 'korzhany_wallpaper_enabled_v497';
  const WALLPAPER_DIM_KEY = 'korzhany_wallpaper_dim_v497';
  const WALLPAPER_BLUR_KEY = 'korzhany_wallpaper_blur_v497';
  const WALLPAPER_SAT_KEY = 'korzhany_wallpaper_sat_v497';
  const WALLPAPER_NAME_KEY = 'korzhany_wallpaper_name_v497';
  const WALLPAPER_BOOT_KEY = 'korzhany_wallpaper_boot_v498';
  const WALLPAPER_BOOT_VERSION_KEY = 'korzhany_wallpaper_boot_version_v506';
  const DB_NAME = 'korzhany_visual_prefs_v497';
  const DB_STORE = 'assets';
  const DB_KEY = 'wallpaper';

  const THEMES = [
    { value: 'sakura', label: 'SAKURA' },
    { value: 'neon', label: 'NEON' },
    { value: 'emerald', label: 'EMERALD' },
    { value: 'obsidian', label: 'OBSIDIAN' },
    { value: 'royal', label: 'ROYAL' },
    { value: 'amber', label: 'AMBER' }
  ];
  const VALID = new Set(THEMES.map((item) => item.value));
  const LEGACY_MAP = { pink:'sakura', wine:'sakura', aurora:'emerald', mint:'emerald' };
  const normalize = (v) => VALID.has(v) ? v : (LEGACY_MAP[v] || 'royal');
  const normalizeTime = (v) => v === 'night' ? 'night' : 'day';
  const clamp = (n, min, max, fallback) => {
    const x = Number(n);
    return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : fallback;
  };

  let wallpaperObjectUrl = '';
  let wallpaperBlob = null;
  let wallpaperSourceBlob = null;
  let wallpaperApplyToken = 0;
  let wallpaperRaf = 0;

  function updateWallpaperVariables(settings = wallpaperSettings()) {
    const root = document.documentElement;
    root.style.setProperty('--kor-wallpaper-dim-alpha', String(Math.min(.88, settings.dim / 100)));
    root.style.setProperty('--kor-wallpaper-blur', `${settings.blur}px`);
    root.style.setProperty('--kor-wallpaper-saturation', `${settings.sat / 100}`);
    // v506: when the user asks for a neutral image (0 blur / 100% saturation),
    // bypass CSS filters completely so Chromium can present the source pixels
    // without an unnecessary offscreen filtered texture.
    root.classList.toggle('kor-wallpaper-filter-free', settings.blur <= 0 && settings.sat === 100);
  }

  function wallpaperTintForTheme(theme) {
    return ({ sakura:'58,3,10', neon:'5,10,18', emerald:'6,16,13', obsidian:'8,9,12', royal:'12,7,20', amber:'17,12,7' })[normalize(theme)] || '8,9,12';
  }

  function applyBootDataUrl(dataUrl) {
    if (!dataUrl) return;
    const root = document.documentElement;
    root.style.setProperty('--kor-wallpaper-boot-url', `url("${dataUrl}")`);
    root.classList.add('kor-wallpaper-boot-ready');
  }

  async function decodeBlobToCanvas(blob, maxSide = 1760) {
    let source = null;
    let revoke = '';
    try {
      if ('createImageBitmap' in window) {
        source = await createImageBitmap(blob);
      } else {
        revoke = URL.createObjectURL(blob);
        source = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = revoke;
        });
      }
      const sw = source.width || source.naturalWidth || 1;
      const sh = source.height || source.naturalHeight || 1;
      const scale = Math.min(1, maxSide / Math.max(sw, sh));
      const w = Math.max(1, Math.round(sw * scale));
      const h = Math.max(1, Math.round(sh * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { alpha:false });
      ctx.drawImage(source, 0, 0, w, h);
      return canvas;
    } finally {
      try { source?.close?.(); } catch (_) {}
      if (revoke) URL.revokeObjectURL(revoke);
    }
  }

  async function createAndStoreBootWallpaper(blob) {
    if (!blob) return '';
    // v506: boot image is preview-only. Try a sharper preview first, but keep
    // quota-safe fallbacks for browsers with a small localStorage allowance.
    const viewportSide = Math.max(1920, Math.round(Math.max(window.innerWidth || 0, window.innerHeight || 0) * Math.min(window.devicePixelRatio || 1, 1.5)));
    const target = Math.min(2560, viewportSide);
    const attempts = [[target,.86],[2048,.82],[1760,.76],[1440,.72],[1120,.68]];
    for (const [side, quality] of attempts) {
      try {
        const canvas = await decodeBlobToCanvas(blob, side);
        const data = canvas.toDataURL('image/webp', quality);
        localStorage.setItem(WALLPAPER_BOOT_KEY, data);
        localStorage.setItem(WALLPAPER_BOOT_VERSION_KEY, '506');
        applyBootDataUrl(data);
        return data;
      } catch (_) {}
    }
    try {
      localStorage.removeItem(WALLPAPER_BOOT_KEY);
      localStorage.removeItem(WALLPAPER_BOOT_VERSION_KEY);
    } catch (_) {}
    document.documentElement.style.removeProperty('--kor-wallpaper-boot-url');
    document.documentElement.classList.remove('kor-wallpaper-boot-ready');
    return '';
  }

  function fullWallpaperUrl(blob) {
    if (!blob) return '';
    if (!wallpaperObjectUrl) wallpaperObjectUrl = URL.createObjectURL(blob);
    return wallpaperObjectUrl;
  }

  function preloadObjectUrl(url) {
    if (!url) return Promise.resolve();
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
      if (img.decode) img.decode().then(resolve, resolve);
    });
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    });
  }

  async function readWallpaperBlob() {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readonly');
        const req = tx.objectStore(DB_STORE).get(DB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch (_) { return null; }
  }

  async function writeWallpaperBlob(blob) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(blob, DB_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function deleteWallpaperBlob() {
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).delete(DB_KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (_) {}
  }

  function applyTime(value, persist = false) {
    const next = normalizeTime(value);
    if (persist) localStorage.setItem(TIME_KEY, next);
    const root = document.documentElement;
    root.classList.toggle('kor-time-night', next === 'night');
    root.classList.toggle('kor-time-day', next !== 'night');
    root.dataset.korTime = next;
    if (document.body) {
      document.body.classList.toggle('kor-time-night', next === 'night');
      document.body.classList.toggle('kor-time-day', next !== 'night');
      document.body.dataset.korTime = next;
    }
    document.dispatchEvent(new CustomEvent('korzhany-time-change', { detail: { time: next } }));
    return next;
  }

  function ensureThemeOptions(select) {
    if (!select || select.tagName !== 'SELECT') return;
    const wanted = normalize(select.value || localStorage.getItem(STORAGE_KEY) || 'royal');
    const expectedValues = THEMES.map((item) => item.value);
    const currentValues = Array.from(select.options || []).map((option) => option.value);
    if (currentValues.length !== expectedValues.length || expectedValues.some((v, i) => currentValues[i] !== v)) {
      select.replaceChildren(...THEMES.map((item) => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        return option;
      }));
    }
    select.value = wanted;
  }

  function apply(theme, persist = false) {
    const next = normalize(theme);
    if (persist || localStorage.getItem(STORAGE_KEY) !== next) localStorage.setItem(STORAGE_KEY, next);
    const allThemeClasses = [...THEMES.map((item) => `theme-${item.value}`), 'theme-pink','theme-wine','theme-aurora','theme-mint'];
    const root = document.documentElement;
    root.classList.remove(...allThemeClasses);
    root.classList.add(`theme-${next}`);
    root.dataset.korTheme = next;
    root.style.setProperty('--kor-wallpaper-tint-rgb', wallpaperTintForTheme(next));
    if (document.body) {
      document.body.classList.remove(...allThemeClasses);
      document.body.classList.add(`theme-${next}`);
      document.body.dataset.korTheme = next;
    }
    document.querySelectorAll('[data-global-theme-select], #themeSelect').forEach((el) => {
      ensureThemeOptions(el);
      if (el.value !== next) el.value = next;
    });
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      const active = button.dataset.themeChoice === next;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const trigger = document.getElementById('hubPaletteTrigger');
    if (trigger) trigger.dataset.activeTheme = next;
    document.dispatchEvent(new CustomEvent('korzhany-theme-change', { detail: { theme: next } }));
    return next;
  }

  function wallpaperSettings() {
    return {
      enabled: localStorage.getItem(WALLPAPER_ENABLED_KEY) === '1',
      dim: clamp(localStorage.getItem(WALLPAPER_DIM_KEY), 0, 90, 48),
      blur: clamp(localStorage.getItem(WALLPAPER_BLUR_KEY), 0, 20, 1),
      sat: clamp(localStorage.getItem(WALLPAPER_SAT_KEY), 40, 180, 100),
      name: localStorage.getItem(WALLPAPER_NAME_KEY) || ''
    };
  }

  function ensureWallpaperLayer() {
    if (!document.body) return null;
    let layer = document.getElementById('korWallpaperLayerV497');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'korWallpaperLayerV497';
      layer.setAttribute('aria-hidden', 'true');
      document.body.prepend(layer);
    }
    return layer;
  }

  function syncWallpaperControls() {
    const s = wallpaperSettings();
    const dim = document.getElementById('hubWallpaperDim');
    const blur = document.getElementById('hubWallpaperBlur');
    const sat = document.getElementById('hubWallpaperSat');
    const name = document.getElementById('hubWallpaperName');
    if (dim) dim.value = String(s.dim);
    if (blur) blur.value = String(s.blur);
    if (sat) sat.value = String(s.sat);
    if (name) name.textContent = s.enabled && s.name ? s.name : 'Стандартный фон';
    const dimOut = document.getElementById('hubWallpaperDimValue');
    const blurOut = document.getElementById('hubWallpaperBlurValue');
    const satOut = document.getElementById('hubWallpaperSatValue');
    if (dimOut) dimOut.textContent = `${s.dim}%`;
    if (blurOut) blurOut.textContent = `${s.blur}px`;
    if (satOut) satOut.textContent = `${s.sat}%`;
    const remove = document.getElementById('hubWallpaperRemove');
    if (remove) remove.disabled = !s.enabled;
  }

  async function applyWallpaper(options = {}) {
    if (!document.body) return;
    const token = ++wallpaperApplyToken;
    const s = wallpaperSettings();
    const root = document.documentElement;
    const layer = ensureWallpaperLayer();
    updateWallpaperVariables(s);
    root.style.setProperty('--kor-wallpaper-tint-rgb', wallpaperTintForTheme(window.KorzhanyTheme?.get?.() || localStorage.getItem(STORAGE_KEY) || initial));

    if (!s.enabled) {
      root.classList.remove('kor-custom-wallpaper','kor-wallpaper-pending','kor-wallpaper-ready','kor-wallpaper-boot-ready','kor-wallpaper-full-ready');
      document.body.classList.remove('kor-custom-wallpaper');
      if (layer) {
        layer.classList.remove('kor-wallpaper-switching','kor-wallpaper-full');
        layer.style.backgroundImage = '';
      }
      root.style.removeProperty('--kor-wallpaper-boot-url');
      syncWallpaperControls();
      document.dispatchEvent(new CustomEvent('korzhany-wallpaper-change', { detail:{ enabled:false } }));
      return;
    }

    root.classList.add('kor-custom-wallpaper');
    document.body.classList.add('kor-custom-wallpaper');

    // v506: the localStorage WebP is only an instant first-paint preview.
    // The final wallpaper is ALWAYS the untouched original Blob from IndexedDB.
    // Both use identical cover/center geometry, so the swap only sharpens the
    // image and never changes its crop/position.
    let boot = localStorage.getItem(WALLPAPER_BOOT_KEY) || '';
    if (boot) applyBootDataUrl(boot);
    else root.classList.add('kor-wallpaper-pending');

    if (!wallpaperBlob) wallpaperBlob = await readWallpaperBlob();
    if (token !== wallpaperApplyToken) return;

    if (!wallpaperBlob) {
      // If IndexedDB is temporarily unavailable but an instant preview exists,
      // keep it instead of flashing the default wallpaper.
      if (boot) {
        root.classList.remove('kor-wallpaper-pending');
        root.classList.add('kor-wallpaper-ready');
        syncWallpaperControls();
        document.dispatchEvent(new CustomEvent('korzhany-wallpaper-change', { detail:{ enabled:true, previewOnly:true, name:s.name } }));
        return;
      }
      localStorage.setItem(WALLPAPER_ENABLED_KEY, '0');
      root.classList.remove('kor-custom-wallpaper','kor-wallpaper-pending','kor-wallpaper-ready','kor-wallpaper-boot-ready','kor-wallpaper-full-ready');
      document.body.classList.remove('kor-custom-wallpaper');
      syncWallpaperControls();
      return;
    }

    if (!boot) {
      boot = await createAndStoreBootWallpaper(wallpaperBlob);
      if (token !== wallpaperApplyToken) return;
    }

    // Upgrade old v498/v500 low-resolution preview in the background. It is
    // never used as the final wallpaper anymore.
    if (localStorage.getItem(WALLPAPER_BOOT_VERSION_KEY) !== '506') {
      setTimeout(() => { if (wallpaperBlob) createAndStoreBootWallpaper(wallpaperBlob).catch(() => {}); }, 0);
    }

    const originalUrl = fullWallpaperUrl(wallpaperBlob);
    if (originalUrl && layer) {
      await preloadObjectUrl(originalUrl);
      if (token !== wallpaperApplyToken) return;
      layer.classList.remove('kor-wallpaper-switching');
      layer.style.backgroundImage = `url("${originalUrl}")`;
      // Two rAFs ensure the browser has committed the original image before
      // fading it over the identically-cropped preview. No resize/teleport.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (token !== wallpaperApplyToken) return;
        layer.classList.add('kor-wallpaper-full');
        root.classList.add('kor-wallpaper-full-ready');
      }));
    }

    root.classList.remove('kor-wallpaper-pending');
    root.classList.add('kor-wallpaper-ready');
    syncWallpaperControls();
    document.dispatchEvent(new CustomEvent('korzhany-wallpaper-change', { detail:{ enabled:true, fullQuality:!!originalUrl, name:s.name } }));
  }

  async function setWallpaperFile(file) {
    if (!file || !String(file.type || '').startsWith('image/')) throw new Error('Выбери изображение');
    if (file.size > 20 * 1024 * 1024) throw new Error('Файл слишком большой (макс. 20 МБ)');
    await writeWallpaperBlob(file);
    if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl);
    wallpaperObjectUrl = '';
    wallpaperBlob = file;
    wallpaperSourceBlob = null;
    localStorage.setItem(WALLPAPER_ENABLED_KEY, '1');
    localStorage.setItem(WALLPAPER_NAME_KEY, file.name || 'Свои обои');
    await createAndStoreBootWallpaper(file);
    await applyWallpaper({ crossfade:true });
  }

  async function removeWallpaper() {
    await deleteWallpaperBlob();
    wallpaperBlob = null;
    wallpaperSourceBlob = null;
    if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl);
    wallpaperObjectUrl = '';
    localStorage.setItem(WALLPAPER_ENABLED_KEY, '0');
    localStorage.removeItem(WALLPAPER_NAME_KEY);
    localStorage.removeItem(WALLPAPER_BOOT_KEY);
    localStorage.removeItem(WALLPAPER_BOOT_VERSION_KEY);
    await applyWallpaper();
  }

  function bindWallpaperControls() {
    const input = document.getElementById('hubWallpaperInput');
    const upload = document.getElementById('hubWallpaperUpload');
    const remove = document.getElementById('hubWallpaperRemove');
    const dim = document.getElementById('hubWallpaperDim');
    const blur = document.getElementById('hubWallpaperBlur');
    const sat = document.getElementById('hubWallpaperSat');
    if (upload && input) upload.addEventListener('click', () => input.click());
    if (input) input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try { await setWallpaperFile(file); }
      catch (err) { const label=document.getElementById('hubWallpaperName'); if(label) label.textContent=err?.message || 'Не удалось загрузить обои'; }
      input.value = '';
    });
    if (remove) remove.addEventListener('click', () => removeWallpaper());

    // v501: hydrate controls from persisted preferences BEFORE listeners bind.
    // Older builds called paint() against the HTML defaults (48/1/100) on every
    // HUB visit, silently overwriting the user's saved wallpaper tuning.
    syncWallpaperControls();

    const bindRange = (el, key, min, max, fallback, outputId, suffix = '') => {
      if (!el) return;
      const output = outputId ? document.getElementById(outputId) : null;
      const paint = (persist = true) => {
        wallpaperRaf = 0;
        const value = clamp(el.value, min, max, fallback);
        if (persist) localStorage.setItem(key, String(value));
        updateWallpaperVariables();
        if (output) output.textContent = `${value}${suffix}`;
      };
      const commit = () => {
        if (!wallpaperRaf) wallpaperRaf = requestAnimationFrame(() => paint(true));
      };
      el.addEventListener('input', commit, { passive:true });
      el.addEventListener('change', () => paint(true));
      paint(false);
    };
    bindRange(dim, WALLPAPER_DIM_KEY, 0, 90, 48, 'hubWallpaperDimValue', '%');
    bindRange(blur, WALLPAPER_BLUR_KEY, 0, 20, 1, 'hubWallpaperBlurValue', 'px');
    bindRange(sat, WALLPAPER_SAT_KEY, 40, 180, 100, 'hubWallpaperSatValue', '%');
  }

  const initial = normalize(localStorage.getItem(STORAGE_KEY) || 'royal');
  const initialTime = normalizeTime(localStorage.getItem(TIME_KEY) || 'day');
  document.documentElement.classList.add(`theme-${initial}`, `kor-time-${initialTime}`);
  document.documentElement.dataset.korTheme = initial;
  document.documentElement.style.setProperty('--kor-wallpaper-tint-rgb', wallpaperTintForTheme(initial));
  updateWallpaperVariables();
  if (localStorage.getItem(WALLPAPER_ENABLED_KEY) === '1') {
    document.documentElement.classList.add('kor-custom-wallpaper');
    const boot = localStorage.getItem(WALLPAPER_BOOT_KEY);
    if (boot) applyBootDataUrl(boot); else document.documentElement.classList.add('kor-wallpaper-pending');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-global-theme-select], #themeSelect').forEach(ensureThemeOptions);
    apply(initial, false);
    applyTime(localStorage.getItem(TIME_KEY) || initialTime, false);
    document.querySelectorAll('[data-global-theme-select]').forEach((select) => {
      ensureThemeOptions(select);
      select.value = initial;
      select.addEventListener('change', () => apply(select.value, true));
    });
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.addEventListener('click', () => apply(button.dataset.themeChoice, true));
    });
    bindWallpaperControls();
    applyWallpaper();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && event.newValue) apply(event.newValue, false);
    if (event.key === TIME_KEY) applyTime(event.newValue || 'day', false);
    if ([WALLPAPER_ENABLED_KEY,WALLPAPER_NAME_KEY,WALLPAPER_BOOT_KEY].includes(event.key)) applyWallpaper();
    if ([WALLPAPER_DIM_KEY,WALLPAPER_BLUR_KEY,WALLPAPER_SAT_KEY].includes(event.key)) updateWallpaperVariables();
  });

  window.addEventListener('beforeunload', () => {
    if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl);
  });

  window.KorzhanyTime = {
    get: () => normalizeTime(localStorage.getItem(TIME_KEY) || initialTime),
    set: (v) => applyTime(v, true)
  };
  window.KorzhanyTheme = {
    get: () => normalize(localStorage.getItem(STORAGE_KEY) || initial),
    set: (v) => apply(v, true),
    themes: THEMES.map((item) => ({ ...item }))
  };
  window.KorzhanyWallpaper = {
    get: wallpaperSettings,
    setFile: setWallpaperFile,
    remove: removeWallpaper,
    refresh: applyWallpaper
  };
})();
