(() => {
  const KEY = 'korzhany_hub_layout';
  const root = document.documentElement;
  let accountLoaded = false;

  const normalize = (value) => value === 'modern' ? 'modern' : 'classic';

  const GLYPHS = {
    codeBtn: '⌁',
    rollBtn: '◎',
    quickRollBtn: '↯',
    watchtimeBtn: '◷',
    smsTopBtn: '≋',
    // v514: search is text-only (no leading magnifier).
    searchBtn: '',
    onlyNeverWonBtn: '◇',
    boostSettingsBtnV428: '⚙',
    timerToggle: '▶',
    copyBtn: '⧉',
    resetParticipantsBtn: '↺'
  };

  function decorateControlsV409() {
    for (const [id, glyph] of Object.entries(GLYPHS)) {
      const el = document.getElementById(id);
      if (el) el.dataset.glyph = glyph;
    }
  }

  function modernParticipantActionsV409(enable) {
    const participants = document.getElementById('participantsPanel');
    const left = document.getElementById('controls');
    const reset = document.getElementById('resetParticipantsBtn');
    const copy = document.getElementById('copyBtn');
    const code = document.getElementById('codeBtn');
    if (!participants || !left || !reset || !copy) return;

    let dock = document.getElementById('participantActionsV409');

    if (enable) {
      if (!dock) {
        dock = document.createElement('div');
        dock.id = 'participantActionsV409';
        dock.className = 'participants-actions-v409';
        dock.setAttribute('aria-label', 'Действия со списком участников');
      }
      participants.appendChild(dock);
      dock.appendChild(copy);
      dock.appendChild(reset);
    } else {
      // Return the exact same nodes, so all existing event listeners stay intact.
      if (code && reset.parentElement !== left) left.insertBefore(reset, code);
      if (copy.parentElement !== participants) participants.appendChild(copy);
      dock?.remove();
    }
  }



  function modernHubTagV412(enable) {
    const hub = document.getElementById('logoutBtnV216');
    const top = document.getElementById('topActiveV168') || document.querySelector('.top-active-v168');
    if (!hub) return;
    if (enable && top) {
      if (hub.parentElement !== top) top.appendChild(hub);
      hub.classList.add('top3-hub-tag-v412');
      hub.setAttribute('title', 'Вернуться в HUB');
    } else {
      hub.classList.remove('top3-hub-tag-v412');
      if (hub.parentElement !== document.body) document.body.appendChild(hub);
    }
  }

  async function syncAccountBadgeV409() {
    if (accountLoaded) return;
    const badge = document.querySelector('#winnersPanel .winner-brand');
    if (!badge) return;
    try {
      const response = await fetch('/api/access/me', {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      if (!response.ok) return;
      const profile = await response.json();
      if (!profile?.ok || !profile.login) return;
      badge.textContent = String(profile.login);
      badge.dataset.accountLogin = String(profile.login);
      badge.title = `Аккаунт HUB: ${profile.login}`;
      accountLoaded = true;
    } catch (_) {
      // Keep the legacy badge if the profile endpoint is temporarily unavailable.
    }
  }

  function apply(value) {
    const layout = normalize(value);
    const modern = layout === 'modern';

    root.classList.toggle('product-layout-modern', modern);
    root.classList.toggle('product-layout-classic', !modern);
    root.dataset.productLayout = layout;

    if (document.body) {
      document.body.classList.toggle('product-layout-modern', modern);
      document.body.classList.toggle('product-layout-classic', !modern);
      document.body.dataset.productLayout = layout;
      decorateControlsV409();
      modernParticipantActionsV409(modern);
      modernHubTagV412(modern);
      syncAccountBadgeV409();
    }

    // Visual shell only: IDs, handlers and runtime state are never replaced.
    document.dispatchEvent(new CustomEvent('korzhany:product-layout', { detail: { layout } }));
  }

  const initial = normalize(localStorage.getItem(KEY));
  apply(initial);

  document.addEventListener('DOMContentLoaded', () => apply(localStorage.getItem(KEY)));
  window.addEventListener('storage', (event) => {
    if (event.key === KEY) apply(event.newValue);
  });

  window.KorzhanyProductLayout = {
    get: () => normalize(localStorage.getItem(KEY)),
    refresh: () => apply(localStorage.getItem(KEY))
  };
})();
