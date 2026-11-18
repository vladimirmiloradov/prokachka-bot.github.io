/* v486: shared low-priority scheduler for legacy visual guards.
   Real timers/roulette logic keep native setInterval; DOM maintenance is deferred to idle frames. */
const korIdleIntervalV486 = (fn, ms, options = {}) =>
  (window.KorPerf && typeof window.KorPerf.idleInterval === 'function')
    ? window.KorPerf.idleInterval(fn, ms, options)
    : window.setInterval(fn, ms);

/* v220: hard TOP-3 criteria fix + new browser session reset */
(function () {
  const TOP3_KEYS_V220 = {
    kd: ['rostyasha_v169_min_kd', 'rostyasha_v169_top3_min_kd', 'rostyasha_v168_top3_min_kd'],
    minutes: ['rostyasha_v169_min_minutes', 'rostyasha_v169_top3_min_minutes', 'rostyasha_v168_top3_min_minutes'],
    messages: ['rostyasha_v169_min_messages', 'rostyasha_v169_top3_min_messages', 'rostyasha_v168_top3_min_messages']
  };

  function q(id) { return document.getElementById(id); }

  function modalV220(opts) {
    if (typeof window.__v213StyledModal === 'function') return window.__v213StyledModal(opts);
    if (opts.mode === 'prompt') return Promise.resolve(prompt(opts.body || opts.title || '', opts.value || ''));
    if (opts.mode === 'confirm') return Promise.resolve(confirm(opts.body || opts.title || 'Подтвердить?'));
    alert(Array.isArray(opts.body) ? opts.body.join('\n') : (opts.body || opts.title || ''));
    return Promise.resolve(true);
  }

  function setTop3ValueV220(key, value) {
    const n = Number(String(value || '').replace(',', '.').trim());
    if (!Number.isFinite(n) || n < 0) return null;

    const finalValue = key === 'kd' ? n : Math.floor(n);
    for (const storageKey of TOP3_KEYS_V220[key] || []) {
      localStorage.setItem(storageKey, String(finalValue));
    }

    // Also sync object-style keys from earlier experimental versions.
    for (const objKey of ['rostyasha_v169_top3_criteria', 'rostyasha_v168_top3_criteria', 'rostyasha_top3_criteria']) {
      let obj = {};
      try { obj = JSON.parse(localStorage.getItem(objKey) || '{}') || {}; } catch (e) {}
      obj[key] = finalValue;
      localStorage.setItem(objKey, JSON.stringify(obj));
    }

    return finalValue;
  }

  function getCurrentValueV220(key, fallback) {
    for (const storageKey of TOP3_KEYS_V220[key] || []) {
      const n = Number(localStorage.getItem(storageKey));
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return fallback;
  }

  function updateLabelsV220() {
    const kd = q('top3CritKdV169');
    const min = q('top3CritMinV169');
    const sms = q('top3CritSmsV169');

    if (kd) kd.textContent = `КД ${Number(getCurrentValueV220('kd', 2.0)).toFixed(1)}`;
    if (min) min.textContent = `${Math.floor(getCurrentValueV220('minutes', 180))} мин`;
    if (sms) sms.textContent = `${Math.floor(getCurrentValueV220('messages', 360))} смс`;
  }

  document.addEventListener('click', async (e) => {
    const target = e.target.closest?.('#top3CritKdV169, #top3CritMinV169, #top3CritSmsV169');
    if (!target) return;

    // Kill older handlers that stored values into wrong localStorage keys.
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const map = {
      top3CritKdV169: {
        key: 'kd',
        title: 'КД ДЛЯ ТОП-3',
        body: 'Минимальный КД для бонуса. Например: 2.0 или 3.0',
        fallback: 2.0
      },
      top3CritMinV169: {
        key: 'minutes',
        title: 'МИНУТЫ ДЛЯ ТОП-3',
        body: 'Минимум минут для бонуса. Например: 180',
        fallback: 180
      },
      top3CritSmsV169: {
        key: 'messages',
        title: 'СМС ДЛЯ ТОП-3',
        body: 'Минимум сообщений для бонуса. Например: 360',
        fallback: 360
      }
    };

    const data = map[target.id];
    const current = getCurrentValueV220(data.key, data.fallback);

    const value = await modalV220({
      title: data.title,
      body: data.body,
      mode: 'prompt',
      value: data.key === 'kd' ? Number(current).toFixed(1) : String(Math.floor(current)),
      placeholder: String(current)
    });

    if (value === null || value === undefined) return;

    const saved = setTop3ValueV220(data.key, value);
    if (saved === null) {
      await modalV220({ title: 'ОШИБКА', body: 'Введи нормальное число', mode: 'alert' });
      return;
    }

    updateLabelsV220();

    // Refresh TOP-3 block without relying on broken old handlers.
    setTimeout(() => {
      updateLabelsV220();
      window.dispatchEvent(new Event('storage'));
    }, 50);
  }, true);

  function startNewBrowserSessionV220() {
    // One reset per browser tab/session. Refreshing page does not reset.
    if (sessionStorage.getItem('rostyasha_v220_session_started') === '1') return;
    sessionStorage.setItem('rostyasha_v220_session_started', '1');

    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      try {
        if (typeof send === 'function' && window.ws && window.ws.readyState === WebSocket.OPEN) {
          send('reset_session_stats');
          clearInterval(timer);
          return;
        }
      } catch (e) {}

      if (attempts > 25) clearInterval(timer);
    }, 400);
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(updateLabelsV220, 300);
    setTimeout(updateLabelsV220, 1000);
    setTimeout(startNewBrowserSessionV220, 1200);
  });

  if (document.body) {
    setTimeout(updateLabelsV220, 300);
    setTimeout(updateLabelsV220, 1000);
    setTimeout(startNewBrowserSessionV220, 1200);
  }

  korIdleIntervalV486(updateLabelsV220, 5000);
})();



/* v217: remove old frontend ADMIN_KEY gate after secure server login */
(function () {
  function oldGateLooksLikeAdminKey(el) {
    if (!el) return false;
    const txt = (el.innerText || el.textContent || '').toLowerCase();
    return txt.includes('admin_key') || txt.includes('введи admin_key') || txt.includes('после входа откроется панель');
  }

  function fillOldAdminKeyGateV217() {
    if (!window.__SERVER_AUTH_OK__) return;

    try {
      const key = window.__ADMIN_KEY_FROM_SERVER__ || localStorage.getItem('rostyasha_admin_key') || '12345';
      localStorage.setItem('rostyasha_admin_key', key);
      localStorage.setItem('adminKey', key);
      localStorage.setItem('ADMIN_KEY', key);
    } catch (e) {}

    const allInputs = Array.from(document.querySelectorAll('input'));
    const keyInput = allInputs.find(i => {
      const p = `${i.placeholder || ''} ${i.name || ''} ${i.id || ''}`.toLowerCase();
      return p.includes('admin') || p.includes('key') || oldGateLooksLikeAdminKey(i.closest('form')) || oldGateLooksLikeAdminKey(i.closest('div'));
    });

    if (keyInput) {
      keyInput.value = window.__ADMIN_KEY_FROM_SERVER__ || '12345';
      keyInput.dispatchEvent(new Event('input', { bubbles: true }));
      keyInput.dispatchEvent(new Event('change', { bubbles: true }));

      const root = keyInput.closest('form') || keyInput.closest('div') || document.body;
      const btn = root.querySelector('button, input[type="submit"]');
      if (btn) setTimeout(() => btn.click(), 50);
    }

    // If old gate still remains as an overlay, hide only the small admin-key login box, not winner modals.
    setTimeout(() => {
      Array.from(document.body.children).forEach(el => {
        if (oldGateLooksLikeAdminKey(el)) {
          el.classList.add('v217-old-admin-gate-hidden');
        }
      });
    }, 250);
  }

  if (document.body) {
    setTimeout(fillOldAdminKeyGateV217, 50);
    setTimeout(fillOldAdminKeyGateV217, 300);
    setTimeout(fillOldAdminKeyGateV217, 900);
  }
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(fillOldAdminKeyGateV217, 50);
    setTimeout(fillOldAdminKeyGateV217, 300);
    setTimeout(fillOldAdminKeyGateV217, 900);
  });
})();



/* v65-reroll-actual-fix: priority mode tracker */
(function () {
  function q(id) { return document.getElementById(id); }

  function setMode(mode) {
    window.__rostyashaRerollMode = mode;
    localStorage.setItem('rostyasha_reroll_mode', mode);
  }

  document.addEventListener('click', function (e) {
    const quick = e.target.closest && e.target.closest('#quickRollBtn');
    const startRoulette = e.target.closest && e.target.closest('#startRouletteBtn');

    if (quick) {
      setMode('quick');
      return;
    }

    if (startRoulette) {
      setMode('roulette');

      const durationSec = Math.max(1, Math.min(120, Number(q('rollDurationInput')?.value || 5)));
      const mode = q('rouletteModeSelect')?.value || 'normal';

      localStorage.setItem('rostyasha_roll_duration', String(durationSec));
      localStorage.setItem('rostyasha_roll_mode', mode);
    }
  }, true);
})();


/* v49: hard diagnostics */
window.__rostyDiag = {
  set(id, value, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = String(value);
    el.classList.remove('ok', 'bad', 'warn');
    if (cls) el.classList.add(cls);
  },
  error(msg) {
    this.set('diagError', msg || 'ошибка', 'bad');
    console.error('[ROSTYASHA DIAG]', msg);
  }
};

window.addEventListener('error', (e) => {
  window.__rostyDiag?.error(e.message || 'frontend error');
});
window.addEventListener('unhandledrejection', (e) => {
  window.__rostyDiag?.error(e.reason?.message || e.reason || 'promise error');
});
document.addEventListener('DOMContentLoaded', () => {
  window.__rostyDiag?.set('diagPage', 'загружен', 'ok');
});


/* v49: websocket constructor monitor */
(function () {
  const NativeWebSocket = window.WebSocket;
  window.WebSocket = function (...args) {
    window.__rostyDiag?.set('diagWs', 'подключение...', 'warn');
    const ws = new NativeWebSocket(...args);
    ws.addEventListener('open', () => window.__rostyDiag?.set('diagWs', 'подключён', 'ok'));
    ws.addEventListener('close', () => window.__rostyDiag?.set('diagWs', 'закрыт', 'bad'));
    ws.addEventListener('error', () => window.__rostyDiag?.set('diagWs', 'ошибка', 'bad'));
    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const s = msg.state || msg.payload?.state || msg.payload || {};
        const twitch = s.twitch || msg.state?.twitch || null;
        if (twitch) {
          window.__rostyDiag?.set('diagTwitch', twitch.connected ? 'подключён' : 'не подключён', twitch.connected ? 'ok' : 'bad');
          window.__rostyDiag?.set('diagChannel', twitch.channel || '—', twitch.connected ? 'ok' : 'warn');
        }
      } catch {}
    });
    return ws;
  };
  window.WebSocket.prototype = NativeWebSocket.prototype;
  // Статические константы оболочка не наследует: без них `ws.readyState !== WebSocket.OPEN`
  // всегда истинно, и send() считал соединение закрытым (не работали вход по ключу и команды по WS).
  ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(k => { window.WebSocket[k] = NativeWebSocket[k]; });
})();
const qs = new URLSearchParams(location.search);
let adminKey = qs.get('key') || localStorage.getItem('rostyasha_admin_key') || '';
let ws;
let state = {};
let timerSeconds = 10 * 60;
let timerInterval = null;
let rollTimer = null;
let wheelAnim = null;
let wheelState = {
  names: [],
  rotation: 0,
  durationMs: 4800,
  mode: 'normal'
};

// v486: many chat/state packets can arrive inside one display frame. Keep the
// newest authoritative state immediately available, but paint at most once per frame.
let renderRafV486 = 0;
let pendingRenderStateV486 = null;
function queueRenderV486(next) {
  state = next || {};
  window.state = state;
  pendingRenderStateV486 = state;
  if (renderRafV486) return;
  renderRafV486 = requestAnimationFrame(() => {
    renderRafV486 = 0;
    const snapshot = pendingRenderStateV486;
    pendingRenderStateV486 = null;
    render(snapshot);
  });
}

const $ = id => document.getElementById(id);
const setText = (id, value) => { const el = $(id); if (!el) return; const next = String(value ?? ''); if (el.textContent !== next) el.textContent = next; };
const setHTML = (id, value) => { const el = $(id); if (!el) return; const next = String(value ?? ''); if (el.innerHTML !== next) el.innerHTML = next; };
const setClass = (id, cls) => { const el = $(id); if (el) el.className = cls; };
const removeClass = (id, cls) => { const el = $(id); if (el) el.classList.remove(cls); };
const toggleClass = (id, cls, force) => { const el = $(id); if (el) el.classList.toggle(cls, force); };


function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}?key=${encodeURIComponent(adminKey)}`);
  try { window.ws = ws; } catch(e) {}

  ws.addEventListener('close', () => setTimeout(connect, 2000));

  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);

    if (msg.payload?.needsKey) {
      showAuth();
      return;
    }

    if (msg.type === 'auth_ok') {
      localStorage.setItem('rostyasha_admin_key', adminKey);
      hideAuth();
      toast('Панель открыта');
    }

    if (msg.type === 'auth_fail') {
      showAuth('Неверный ключ');
      return;
    }

    if (msg.type === 'winner_replaced_v489' && msg.payload?.winner) {
      // v492: QUICK reroll is an in-place data swap. Never full-render the page here:
      // full render was rebuilding winner UI and caused the visible flash/teleport.
      if (msg.state) {
        state = msg.state || {};
        window.state = state;
      }
      try { window.__v489ApplyWinner?.(msg.payload.winner, msg.state || state); }
      catch (e) { console.warn('[v492 winner replace ws]', e); }
      return;
    }

    if (msg.state) queueRenderV486(msg.state);

    if (msg.type === 'rolling_start') startRolling(msg.payload || {});
    if (msg.type === 'elimination_out' && msg.payload?.username) showEliminated(msg.payload || {});
    if (msg.type === 'winner' && msg.payload?.username) {
      // v430: winner must be opened exactly once through the final wrapped handler.
      // The legacy showWinner() schedules showVisual('idleBox') after 7 seconds,
      // which used to hide the winner card while leaving WINNER CHAT visible.
      // That race produced the broken layout seen intermittently.
      try {
        if (typeof window.showWinner === 'function') window.showWinner(msg.payload || {});
        else showWinner(msg.payload.username, msg.payload.mode);
      } catch (e) {
        console.error('[v430 winner open]', e);
      }
    }
    if (msg.type === 'notice') handleNotice(msg.payload || {});
  });
}

function send(type, payload = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    toast('Нет подключения к серверу');
    return;
  }
  ws.send(JSON.stringify({ type, ...payload }));
}

function showAuth(error = '') {
  $('auth').classList.remove('hidden');
  $('authError').textContent = error;
}

function hideAuth() {
  $('auth').classList.add('hidden');
  $('authError').textContent = '';
}


/* v219: Twitch chat color/badge render helpers */
function chatColorV219(m) {
  if (m && /^#[0-9a-f]{6}$/i.test(String(m.color || ''))) return m.color;

  const palette = [
    '#FF5C8A', '#9146FF', '#00A3FF', '#00C7A7', '#FFB000',
    '#FF6B35', '#2ECC71', '#E056FD', '#F368E0', '#48DBFB',
    '#FDCB6E', '#55EFC4', '#74B9FF', '#FD79A8', '#A29BFE',
    '#FAB1A0', '#00CEC9', '#E17055', '#81ECEC', '#FFEAA7'
  ];

  const s = String(m?.username || m?.displayName || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

function chatRolesV219(m) {
  const roles = Array.isArray(m?.roles) ? [...m.roles] : [];
  if (m?.isBroadcaster && !roles.includes('СТРИМЕР')) roles.push('СТРИМЕР');
  if (m?.isMod && !m?.isBroadcaster && !roles.includes('МОДЕР')) roles.push('МОДЕР');
  if (m?.isVip && !roles.includes('VIP')) roles.push('VIP');
  if (m?.isBot && !roles.includes('БОТ')) roles.push('БОТ');
  return roles;
}

function chatBadgesHtmlV219(m) {
  // v508: keep Twitch role data in state for permissions/filters, but do not render
  // visual role labels (VIP/MODERATOR/BROADCASTER/BOT/etc.) in any chat surface.
  return '';
}

function chatMessageHtmlV219(m) {
  const name = m?.displayName || m?.username || '';
  const color = chatColorV219(m);
  return `
    <div class="chat-msg chat-msg-v219">
      <span class="time">[${esc(m?.time || '')}]</span>
      ${chatBadgesHtmlV219(m)}
      <b class="chat-name-v219" style="color:${esc(color)}">${esc(name)}:</b>
      <span class="chat-text-v219">${esc(m?.text || '')}</span>
    </div>
  `;
}

const renderCacheV486 = {
  participants: '',
  chat: '',
  winners: '',
  blacklist: '',
  logs: ''
};

function render(next) {
  state = next || {};
  window.state = state;
  const s = state.settings || {};
  const code = s.codeWord || '+';
  const participants = Array.isArray(state.participants) ? state.participants : [];
  const chat = Array.isArray(state.chat) ? state.chat : [];
  const winners = Array.isArray(state.winners) ? state.winners : [];
  const blacklist = Array.isArray(state.blacklist) ? state.blacklist : [];

  setText('brand', s.title || '');
  setText('codeBanner', code);
  setText('codeCenter', code);
  setText('codeBtnText', code);
  setText('participantsCount', participants.length);
  setText('centerCount', participants.length);
  setText('channelName', state.twitch?.channel ? state.twitch.channel.toUpperCase() : 'ROSTYASHA1');

  if ($('giveawayActive')) $('giveawayActive').checked = true;
  if ($('onlyNeverWon')) $('onlyNeverWon').checked = Boolean(s.onlyNeverWon);
  if ($('showWinners')) $('showWinners').checked = true;

  if ($('onlyNeverWonBtn')) {
    const onlyNeverWonActive = (window.__wokoNeverWonPending && Date.now() < window.__wokoNeverWonPending.until)
      ? window.__wokoNeverWonPending.value : Boolean(s.onlyNeverWon);
    $('onlyNeverWonBtn').classList.toggle('active-toggle', onlyNeverWonActive);
    $('onlyNeverWonBtn').textContent = onlyNeverWonActive ? 'ВКЛ' : 'ВЫКЛ';
    $('onlyNeverWonBtn').setAttribute('aria-pressed', onlyNeverWonActive ? 'true' : 'false');
    if ($('onlyNeverWonBtn').dataset.active !== (onlyNeverWonActive ? 'true' : 'false')) {
      $('onlyNeverWonBtn').dataset.active = onlyNeverWonActive ? 'true' : 'false';
    }
  }

  removeClass('chatPanel', 'hidden');
  removeClass('participantsPanel', 'hidden');
  toggleClass('winnersPanel', 'hidden', s.showWinners === false);

  toggleClass('dot', 'connected', Boolean(state.twitch?.connected));
  setText('connectionText', state.twitch?.connected ? `Twitch подключён: ${state.twitch.channel}` : 'Twitch не подключён');

  // Participants: rebuilding hundreds of rows on every WebSocket state caused visible micro-freezes.
  // Rebuild only when the participant/SMS payload actually changed.
  const participantSig = participants.map(u => `${u}:${Number(state.messages?.[u] || 0)}`).join('\u001f');
  const participantsList = $('participantsList');
  if (participantsList && participantSig !== renderCacheV486.participants) {
    renderCacheV486.participants = participantSig;
    if (!participants.length) {
      participantsList.className = 'list empty';
      participantsList.innerHTML = 'Нет участников';
    } else {
      participantsList.className = 'list';
      participantsList.innerHTML = participants.map((u, i) => `
        <div class="participant">
          <span>${i + 1}. ${esc(u)}</span>
          <span class="sms">${state.messages?.[u] || 0}</span>
          <span class="remove" data-remove="${esc(u)}">×</span>
        </div>
      `).join('');
    }
  }

  // Chat: keep a bounded DOM and never repaint it if the message payload did not change.
  const visibleChat = chat.slice(-180);
  const chatSig = visibleChat.map(m => `${m?.time || ''}\u001d${m?.displayName || m?.username || ''}\u001d${m?.text || ''}\u001d${(m?.roles || []).join(',')}`).join('\u001e');
  const chatList = $('chatList');
  if (chatList && chatSig !== renderCacheV486.chat) {
    const nearBottom = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 80;
    renderCacheV486.chat = chatSig;
    chatList.innerHTML = visibleChat.length
      ? visibleChat.map(m => chatMessageHtmlV219(m)).join('')
      : '<div class="chat-msg chat-msg-v219">Чат пока пустой</div>';
    window.__v486PrimaryChatRenderReady = true;
    if (nearBottom || visibleChat.length <= 2) requestAnimationFrame(() => { chatList.scrollTop = chatList.scrollHeight; });
  }

  // v482+ owns the final winners block. Keep the legacy renderer only as a startup fallback.
  if (typeof window.__v484RenderWinners !== 'function') {
    const winnerSig = winners.slice(0, 10).map(w => String(w?.username || '')).join('\u001f');
    if ($('winnersList') && winnerSig !== renderCacheV486.winners) {
      renderCacheV486.winners = winnerSig;
      $('winnersList').innerHTML = winners.length ? winners.slice(0, 10).map((w, i) => `
        <div class="winner-row winner-row-v98"><span>${i + 1}. ${esc(w.username)}</span></div>
      `).join('') : '<div class="winner-row winner-row-v98"><span>Пока нет победителей</span></div>';
    }
  }

  const blackSig = blacklist.join('\u001f');
  if ($('blackList') && blackSig !== renderCacheV486.blacklist) {
    renderCacheV486.blacklist = blackSig;
    $('blackList').innerHTML = blacklist.length ? blacklist.map(u => `
      <div class="black-item"><b>${esc(u)}</b><span data-unblack="${esc(u)}">убрать</span></div>
    `).join('') : '<div class="black-item">Пусто</div>';
  }

  const logs = Array.isArray(state.logs) ? state.logs.slice(0, 10) : [];
  const logsSig = logs.map(l => `${l?.time || ''}\u001d${l?.text || ''}`).join('\u001e');
  if ($('logsList') && logsSig !== renderCacheV486.logs) {
    renderCacheV486.logs = logsSig;
    $('logsList').innerHTML = logs.map(l => `<div class="log-item">${esc(l.time)} — ${esc(l.text)}</div>`).join('') || '<div class="log-item">Пусто</div>';
  }
}

function esc(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.remove('hidden');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => $('toast').classList.add('hidden'), 2600);
}

function handleNotice(p) {
  const map = {
    no_participants: 'Нет участников для рулетки',
    no_candidates: 'Нет кандидатов для быстрого ролла',
    blacklist: 'Ник в чёрном списке',
    exists: 'Участник уже есть',
    won_before: 'Участник уже выигрывал',
    already_rolling: 'Рулетка уже крутится'
  };
  toast(map[p.reason] || 'Не получилось');
}

function showVisual(id) {
  const wrap = document.querySelector('.center-visual');
  ['idleBox', 'rollingBox', 'eliminatedBox', 'winnerBox'].forEach(x => {
    if ($(x)) $(x).classList.add('hidden');
  });

  if (id === 'idleBox') {
    if (wrap) wrap.classList.remove('roulette-active', 'winner-mode');
    hideWheel();
    return;
  }

  if (wrap) {
    wrap.classList.add('roulette-active');
    wrap.classList.toggle('winner-mode', id === 'winnerBox');
  }

  if ($(id)) $(id).classList.remove('hidden');
}



function getWheelNames(payload = {}) {
  const list = (payload.names && payload.names.length)
    ? payload.names
    : ((state.participants || []).length ? state.participants : []);
  return list.length ? list.slice(0, 36) : ['---'];
}

function segmentColor(i) {
  const palette = [
    '#b88a3b', '#4f8f68', '#8f4a69', '#4d6f91',
    '#9b6a46', '#5f5b9c', '#a05c75', '#3f7f84',
    '#a88457', '#6f4d8f', '#78924a', '#8a5a4a'
  ];
  return palette[i % palette.length];
}

function renderWheel(names = []) {
  const wheel = $('rouletteWheel');
  if (!wheel) return;

  const safe = names.length ? names : ['---'];
  const count = safe.length;
  const step = 360 / count;

  let gradient = '';
  for (let i = 0; i < count; i++) {
    const a1 = i * step;
    const a2 = (i + 1) * step;
    const fill = segmentColor(i);
    gradient += `${fill} ${a1}deg ${a2}deg${i === count - 1 ? '' : ', '}`;
  }

  wheel.style.background = `conic-gradient(${gradient})`;

  wheel.innerHTML = '<div class="wheel-center">R</div>' + safe.map((name, i) => {
    const angle = i * step + step / 2;
    const label = String(name).length > 13 ? String(name).slice(0, 12) + '…' : String(name);
    return `<div class="wheel-name" style="--a:${angle}deg">${esc(label)}</div>`;
  }).join('');
}

function setWheelRotation(deg) {
  const wheel = $('rouletteWheel');
  if (!wheel) return;
  wheel.style.transform = `rotate(${deg}deg)`;
  wheelState.rotation = deg;
}

function getNameUnderPointer(rotationDeg) {
  const names = wheelState.names && wheelState.names.length ? wheelState.names : ['---'];
  const count = names.length;
  const step = 360 / count;

  // HARD POINTER SYNC: pointer is fixed at 12 o'clock and conic sector 0
  // also starts at 12 o'clock. The sector under the pointer is therefore
  // determined only by the inverse of the real wheel rotation.
  const normalized = ((-Number(rotationDeg || 0) % 360) + 360) % 360;
  const index = Math.min(count - 1, Math.floor(normalized / step));
  return names[index] || names[0] || '---';
}

function updateRollingNameFromWheel(rotationDeg) {
  const name = getNameUnderPointer(rotationDeg);
  const el = $('rollingName');
  if (!el) return;

  const next = '@' + name;
  if (el.textContent !== next) {
    el.textContent = next;
    el.classList.remove('name-pop');
    void el.offsetWidth;
    el.classList.add('name-pop');
  }
}

function cancelWheelAnimation() {
  if (wheelAnim) {
    cancelAnimationFrame(wheelAnim);
    wheelAnim = null;
  }
}

function showWheel(payload = {}) {
  

  const wrap = $('rouletteWheelWrap');
  if (!wrap) return;

  const names = getWheelNames(payload);
  wheelState.names = names;
  wheelState.durationMs = Math.max(1000, Number(payload.durationMs || 4800));
  wheelState.mode = payload.mode || 'normal';

  renderWheel(names);

  wrap.classList.remove('hidden', 'winner-spin');
  wrap.classList.add('rolling-spin');

  
  startSyncedWheelSpin(wheelState.durationMs);
  
}

function startSyncedWheelSpin(durationMs = 4800) {
  cancelWheelAnimation();

  const names = wheelState.names && wheelState.names.length ? wheelState.names : ['---'];
  const count = names.length;
  const step = 360 / count;

  const start = performance.now();
  const startRot = 0;

  // More turns for longer duration, but still smooth.
  const turns = Math.max(7, Math.min(26, Math.round(durationMs / 430)));
  const targetExtra = turns * 360 + Math.floor(Math.random() * count) * step + step / 2;
  const targetRot = startRot + targetExtra;

  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  function frame(now) {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = easeOutCubic(t);
    const rot = startRot + (targetRot - startRot) * eased;

    setWheelRotation(rot);
    updateRollingNameFromWheel(rot);

    if (t < 1) {
      wheelAnim = requestAnimationFrame(frame);
    } else {
      wheelAnim = null;
      setWheelRotation(targetRot);
      updateRollingNameFromWheel(targetRot);
    }
  }

  wheelAnim = requestAnimationFrame(frame);
}

function stopWheelWinner(username = '') {
  cancelWheelAnimation();

  const wrap = $('rouletteWheelWrap');
  if (!wrap) return;

  wrap.classList.remove('rolling-spin');
  wrap.classList.add('winner-spin');

  // Keep wheel on the winner if that name exists.
  const names = wheelState.names && wheelState.names.length ? wheelState.names : [];
  const idx = names.findIndex(n => String(n).toLowerCase() === String(username).toLowerCase());
  if (idx >= 0) {
    const step = 360 / names.length;
    const target = -(idx * step + step / 2);
    setWheelRotation(target);
  }

  const wheel = $('rouletteWheel');
  const center = wheel?.querySelector('.wheel-center');
  if (center) center.textContent = '✓';
}

function hideWheel() {
  cancelWheelAnimation();
  const wrap = $('rouletteWheelWrap');
  if (!wrap) return;
  wrap.classList.add('hidden');
  wrap.classList.remove('rolling-spin', 'winner-spin');
}

function startRolling(payload = {}) {
  

  showVisual('rollingBox');
  clearInterval(rollTimer);

  if ($('rollStatusText')) {
    $('rollStatusText').textContent = payload.mode === 'elimination' ? 'НА ВЫБЫВАНИЕ' : 'ОБЫЧНАЯ РУЛЕТКА';
  }

  
  showWheel(payload);
  
}

function showEliminated(payload = {}) {
  clearInterval(rollTimer);

  if ($('eliminatedName')) {
    $('eliminatedName').textContent = '@' + payload.username;
    $('eliminatedName').classList.remove('eliminated-pop');
    void $('eliminatedName').offsetWidth;
    $('eliminatedName').classList.add('eliminated-pop');
  }

  if ($('remainingText')) {
    $('remainingText').textContent = `Осталось: ${payload.remaining}`;
  }

  showVisual('eliminatedBox');
  showWheel({ mode: 'elimination', names: payload.names || [], durationMs: payload.durationMs || 1000 });

  const delay = Math.max(350, Math.min(900, Number(payload.durationMs || 1000) - 120));
  setTimeout(() => {
    if (state.rolling && (payload.remaining || 0) > 1) {
      startRolling({ mode: 'elimination', names: payload.names || state.participants || [] });
    }
  }, delay);
}

function showWinner(username, mode = '') {
  
  clearInterval(rollTimer);
  if ($('winnerName')) {
    $('winnerName').textContent = username;
    $('winnerName').classList.remove('winner-pop');
    void $('winnerName').offsetWidth;
    $('winnerName').classList.add('winner-pop');
  }

  const label = $('winnerBox')?.querySelector('.winner-label');
  if (label) {
    label.textContent = mode === 'elimination' ? 'ПОСЛЕДНИЙ ОСТАВШИЙСЯ' : 'ПОБЕДИТЕЛЬ';
  }

  showVisual('winnerBox');
  stopWheelWinner(username);
  setTimeout(() => showVisual('idleBox'), 7000);
}

function renderTimer() {
  const h = Math.floor(timerSeconds / 3600);
  const m = Math.floor((timerSeconds % 3600) / 60);
  const s = timerSeconds % 60;
  $('timer').textContent = [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

$('authBtn').addEventListener('click', () => {
  adminKey = $('authKey').value.trim();
  send('auth', { key: adminKey });
});

$('authKey').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('authBtn').click();
});

$('resetParticipantsBtn').addEventListener('click', () => {
  if (confirm('Сбросить участников?')) send('reset_participants');
});

$('codeBtn').addEventListener('click', async (e) => {
  e?.preventDefault?.();
  if (typeof window.__v484OpenCodeModal === 'function') {
    await window.__v484OpenCodeModal();
    return;
  }
  if (typeof window.__v213StyledModal === 'function') {
    const value = await window.__v213StyledModal({
      title: 'КОД УЧАСТИЯ', body: 'Введи новое кодовое слово:', mode: 'prompt',
      value: state.settings?.codeWord || '+', placeholder: '+'
    });
    if (value && String(value).trim()) send('set_code', { code: String(value).trim() });
  }
});

$('rollBtn').addEventListener('click', () => {
  openRoulettePopup();
});
$('quickRollBtn').addEventListener('click', () => send('quick_roll'));

if ($('onlyNeverWonBtn')) {
  $('onlyNeverWonBtn').addEventListener('click', () => {
    const btn = $('onlyNeverWonBtn');
    const next = btn.getAttribute('aria-pressed') !== 'true';
    if ($('onlyNeverWon')) $('onlyNeverWon').checked = next;
    btn.classList.toggle('active-toggle', next);
    btn.textContent = next ? 'ВКЛ' : 'ВЫКЛ';
    btn.setAttribute('aria-pressed', String(next));
    btn.dataset.active = String(next);
    send('set_setting', { name: 'onlyNeverWon', value: next });
  });
}

$('copyBtn').addEventListener('click', async () => {
  await navigator.clipboard.writeText((state.participants || []).join('\n'));
  toast('Участники скопированы');
});

$('watchtimeBtn').addEventListener('click', () => {
  const rows = Object.entries(state.watchtime || {})
    .filter(([k]) => !k.endsWith('__lastSeen'))
    .sort((a,b) => b[1] - a[1])
    .slice(0, 15)
    .map(([u, sec], i) => `${i+1}. ${u} — ${Math.floor(sec/60)} мин`)
    .join('\n');
  alert(rows || 'Watchtime пока пустой');
});

$('smsTopBtn').addEventListener('click', () => {
  const rows = Object.entries(state.messages || {})
    .sort((a,b) => b[1] - a[1])
    .slice(0, 15)
    .map(([u, c], i) => `${i+1}. ${u} — ${c} смс`)
    .join('\n');
  alert(rows || 'SMS топ пустой');
});

$('searchBtn').addEventListener('click', () => {
  const u = prompt('Ник:');
  if (!u) return;
  const user = u.trim().toLowerCase();
  const sms = state.messages?.[user] || 0;
  const wt = Math.floor((state.watchtime?.[user] || 0) / 60);
  const participant = (state.participants || []).includes(user) ? 'да' : 'нет';
  const wins = (state.winners || []).filter(w => w.username === user).length;
  alert(`Ник: ${user}\nВ участниках: ${participant}\nSMS: ${sms}\nWatchtime: ${wt} мин\nПобед: ${wins}`);
});

if ($('clearWinnersBtn')) {
  if ($('clearWinnersBtn')) $('clearWinnersBtn').addEventListener('click', () => {
    if (confirm('Очистить победителей?')) send('clear_winners');
  });
}

if ($('resetStatsBtn')) {
  if ($('resetStatsBtn')) $('resetStatsBtn').addEventListener('click', () => {
    if (confirm('Сбросить статистику сообщений/watchtime/чат?')) send('reset_stats');
  });
}

$('blackAddBtn').addEventListener('click', () => {
  const username = $('blackNick').value.trim();
  if (!username) return;
  send('blacklist_add', { username });
  $('blackNick').value = '';
});

$('chatSendBtn').addEventListener('click', () => {
  const text = $('chatMessage').value.trim();
  if (!text) return;
  send('send_chat', { text });
  $('chatMessage').value = '';
});

$('chatMessage').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('chatSendBtn').click();
});

document.querySelectorAll('[data-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    timerSeconds = Math.max(0, timerSeconds + Number(btn.dataset.add));
    renderTimer();
  });
});

$('timerToggle').addEventListener('click', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    toast('Таймер на паузе');
  } else {
    timerInterval = setInterval(() => {
      timerSeconds = Math.max(0, timerSeconds - 1);
      renderTimer();
      if (timerSeconds === 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        toast('Таймер завершён');
      }
    }, 1000);
    toast('Таймер запущен');
  }
});

if ($('hideControlsBtn')) {
  if ($('hideControlsBtn')) $('hideControlsBtn').addEventListener('click', () => {
    document.querySelector('.site').classList.toggle('controls-hidden');
  });
}



function openRoulettePopup() {
  const popup = $('roulettePopup');
  if (!popup) return;

  if ($('rollDurationInput')) {
    $('rollDurationInput').value = localStorage.getItem('rostyasha_roll_duration') || '5';
  }
  if ($('rouletteModeSelect')) {
    $('rouletteModeSelect').value = localStorage.getItem('rostyasha_roll_mode') || 'normal';
  }

  popup.classList.remove('hidden');
  setTimeout(() => $('rollDurationInput')?.focus(), 50);
}

function closeRoulettePopup() {
  const popup = $('roulettePopup');
  if (popup) popup.classList.add('hidden');
}

function startRouletteFromPopup() {
  const duration = Math.max(1, Math.min(120, Number($('rollDurationInput')?.value || 5)));
  const mode = $('rouletteModeSelect')?.value || 'normal';

  localStorage.setItem('rostyasha_roll_duration', String(duration));
  localStorage.setItem('rostyasha_roll_mode', mode);

  closeRoulettePopup();
  send('roll', { mode, durationSec: duration });
}

function initRouletteControls() {
  const duration = localStorage.getItem('rostyasha_roll_duration') || '5';
  const mode = localStorage.getItem('rostyasha_roll_mode') || 'normal';

  if ($('rollDurationInput')) $('rollDurationInput').value = duration;
  if ($('rouletteModeSelect')) $('rouletteModeSelect').value = mode;

  if ($('rollDurationInput')) {
    $('rollDurationInput').addEventListener('change', () => {
      const value = Math.max(1, Math.min(120, Number($('rollDurationInput').value || 5)));
      $('rollDurationInput').value = value;
      localStorage.setItem('rostyasha_roll_duration', String(value));
    });

    $('rollDurationInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startRouletteFromPopup();
      if (e.key === 'Escape') closeRoulettePopup();
    });
  }

  if ($('rouletteModeSelect')) {
    $('rouletteModeSelect').addEventListener('change', () => {
      localStorage.setItem('rostyasha_roll_mode', $('rouletteModeSelect').value || 'normal');
    });

    $('rouletteModeSelect').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startRouletteFromPopup();
      if (e.key === 'Escape') closeRoulettePopup();
    });
  }

  if ($('startRouletteBtn')) $('startRouletteBtn').addEventListener('click', startRouletteFromPopup);
  if ($('cancelRouletteBtn')) $('cancelRouletteBtn').addEventListener('click', closeRoulettePopup);

  if ($('roulettePopup')) {
    $('roulettePopup').addEventListener('click', (e) => {
      if (e.target === $('roulettePopup')) closeRoulettePopup();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRoulettePopup();
  });
}

initRouletteControls();

renderTimer();
connect();

// Theme switcher: v497 uses one global palette engine on every page.
function applyTheme(theme) {
  const legacyMap = { pink:'sakura', wine:'sakura', aurora:'emerald', mint:'emerald' };
  const validThemes = ['sakura', 'neon', 'emerald', 'obsidian', 'royal', 'amber'];
  const requested = legacyMap[theme] || theme;
  const next = validThemes.includes(requested) ? requested : 'sakura';
  if (window.KorzhanyTheme?.set) {
    window.KorzhanyTheme.set(next);
  } else {
    document.documentElement.classList.remove('theme-pink','theme-wine','theme-aurora','theme-mint',...validThemes.map(v => `theme-${v}`));
    document.body.classList.remove('theme-pink','theme-wine','theme-aurora','theme-mint',...validThemes.map(v => `theme-${v}`));
    document.documentElement.classList.add(`theme-${next}`);
    document.body.classList.add(`theme-${next}`);
    localStorage.setItem('rostyasha_theme', next);
  }
  const select = document.getElementById('themeSelect');
  if (select) select.value = next;
}

applyTheme(localStorage.getItem('rostyasha_theme') || 'sakura');

const themeSelect = document.getElementById('themeSelect');
if (themeSelect) {
  themeSelect.addEventListener('change', () => applyTheme(themeSelect.value));
}


/* v32: hard fix for roulette popup start button */
(function () {
  function safeNumber(value, fallback = 5) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(1, Math.min(120, Math.round(n)));
  }

  function closePopupHard() {
    const popup = document.getElementById('roulettePopup');
    if (popup) popup.classList.add('hidden');
  }

  function openPopupHard() {
    const popup = document.getElementById('roulettePopup');
    const durationInput = document.getElementById('rollDurationInput');
    const modeSelect = document.getElementById('rouletteModeSelect');

    if (!popup) return;

    if (durationInput) durationInput.value = localStorage.getItem('rostyasha_roll_duration') || durationInput.value || '5';
    if (modeSelect) modeSelect.value = localStorage.getItem('rostyasha_roll_mode') || modeSelect.value || 'normal';

    popup.classList.remove('hidden');
    setTimeout(() => durationInput && durationInput.focus(), 50);
  }

  function startPopupRouletteHard() {
    const durationInput = document.getElementById('rollDurationInput');
    const modeSelect = document.getElementById('rouletteModeSelect');

    const duration = safeNumber(durationInput ? durationInput.value : 5, 5);
    const mode = modeSelect ? (modeSelect.value || 'normal') : 'normal';

    if (durationInput) durationInput.value = String(duration);
    localStorage.setItem('rostyasha_roll_duration', String(duration));
    localStorage.setItem('rostyasha_roll_mode', mode);

    closePopupHard();

    if (typeof send === 'function') {
      send('roll', { mode, durationSec: duration });
    } else if (window.ws && window.ws.readyState === 1) {
      window.ws.send(JSON.stringify({ type: 'roll', mode, durationSec: duration }));
    } else {
      alert('Панель ещё не подключилась к серверу. Обнови страницу Ctrl+F5.');
    }
  }

  window.openRoulettePopup = openPopupHard;
  window.closeRoulettePopup = closePopupHard;
  window.startRouletteFromPopup = startPopupRouletteHard;

  function bindHard() {
    const rollBtn = document.getElementById('rollBtn');
    const startBtn = document.getElementById('startRouletteBtn');
    const cancelBtn = document.getElementById('cancelRouletteBtn');
    const popup = document.getElementById('roulettePopup');
    const durationInput = document.getElementById('rollDurationInput');

    if (rollBtn && !rollBtn.dataset.v32Bound) {
      rollBtn.dataset.v32Bound = '1';
      rollBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openPopupHard();
      }, true);
    }

    if (startBtn && !startBtn.dataset.v32Bound) {
      startBtn.dataset.v32Bound = '1';
      startBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        startPopupRouletteHard();
      }, true);
    }

    if (cancelBtn && !cancelBtn.dataset.v32Bound) {
      cancelBtn.dataset.v32Bound = '1';
      cancelBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closePopupHard();
      }, true);
    }

    if (popup && !popup.dataset.v32Bound) {
      popup.dataset.v32Bound = '1';
      popup.addEventListener('click', function (e) {
        if (e.target === popup) closePopupHard();
      });
    }

    if (durationInput && !durationInput.dataset.v32Bound) {
      durationInput.dataset.v32Bound = '1';
      durationInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') startPopupRouletteHard();
        if (e.key === 'Escape') closePopupHard();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindHard);
  } else {
    bindHard();
  }

  setTimeout(bindHard, 300);
  setTimeout(bindHard, 1000);
})();


/* v61: HTTP button commands, bypass WebSocket send */
(function () {
  function key() {
    try {
      return new URLSearchParams(location.search).get('key') || localStorage.getItem('rostyasha_admin_key') || '12345';
    } catch {
      return '12345';
    }
  }

  async function cmd(type, params = {}) {
    const qs = new URLSearchParams({ key: key(), ...params });
    const url = `/api/cmd/${encodeURIComponent(type)}?${qs.toString()}`;

    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      const data = await res.json();

      if (data.state && typeof render === 'function') render(data.state);

      if (!data.ok) {
        if (typeof toast === 'function') {
          const map = {
            no_participants: 'Нет участников',
            already_rolling: 'Рулетка уже крутится',
            bad_key: 'Неверный ключ панели'
          };
          toast(map[data.reason] || ('Ошибка: ' + (data.reason || type)));
        }
        console.warn('[v61 cmd failed]', type, data);
        return false;
      }

      console.log('[v61 cmd ok]', type, data);
      return true;
    } catch (e) {
      console.error('[v61 cmd error]', type, e);
      if (typeof toast === 'function') toast('HTTP команда не дошла до сервера');
      return false;
    }
  }

  document.addEventListener('click', function (e) {
    const reset = e.target.closest && e.target.closest('#resetParticipantsBtn');
    const quick = e.target.closest && e.target.closest('#quickRollBtn');
    const startRoulette = e.target.closest && e.target.closest('#startRouletteBtn');
    const codeBtn = null; // v484: let the styled code modal handle this

    if (reset) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (confirm('Сбросить участников?')) cmd('reset_participants');
      return;
    }

    if (quick) {
      e.preventDefault();
      e.stopImmediatePropagation();
      cmd('quick_roll');
      return;
    }

    if (startRoulette) {
      e.preventDefault();
      e.stopImmediatePropagation();

      const durationSec = Math.max(1, Math.min(120, Number(document.getElementById('rollDurationInput')?.value || 5)));
      const mode = document.getElementById('rouletteModeSelect')?.value || 'normal';

      localStorage.setItem('rostyasha_roll_duration', String(durationSec));
      localStorage.setItem('rostyasha_roll_mode', mode);

      const popup = document.getElementById('roulettePopup');
      if (popup) popup.classList.add('hidden');

      cmd('roll', { mode, durationSec });
      return;
    }

    if (codeBtn) {
      e.preventDefault();
      e.stopImmediatePropagation();

      const current = (window.state && window.state.settings && window.state.settings.codeWord) || '+';
      const value = prompt('Новое кодовое слово:', current);
      if (value && value.trim()) cmd('set_code', { code: value.trim() });
      return;
    }
  }, true);
})();


/* v62: restored safe features on top of working HTTP buttons */
(function () {
  let v62LastRoll = { type: 'roll', mode: 'normal', durationSec: 5 };
  let v62WinnerChat = null;
  let v62WinnerTimer = null;
  let v62WinnerLastCount = -1;
  let v62WinnerHistoryV482 = [];

  function clean(name) {
    return String(name || '').replace(/^@/, '').trim().toLowerCase();
  }

  function fmt(ms) {
    const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h) return `${h} ч ${m} мин`;
    if (m) return `${m} мин ${s} сек`;
    return `${s} сек`;
  }

  function localDetails(username, details) {
    if (details) return details;
    const u = clean(username);
    const messages = Number(state.messages?.[u] || 0);
    const watchMs = Number(state.watchtime?.[u] || 0) * 1000;
    const mins = watchMs / 60000;
    const kd = mins > 0 ? messages / mins : messages;
    const kdOk = messages >= Math.ceil(mins * 0.5);
    return {
      followText: 'нет данных',
      watchMs,
      messages,
      kdOk,
      kdText: `${kd.toFixed(2)} · ${kdOk ? 'В КД' : 'НЕ В КД'}`
    };
  }

  function v62Cmd(type, params = {}) {
    const key = new URLSearchParams(location.search).get('key') || localStorage.getItem('rostyasha_admin_key') || '12345';
    const qs = new URLSearchParams({ key, ...params });
    return fetch(`/api/cmd/${encodeURIComponent(type)}?${qs.toString()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data.state && typeof render === 'function') render(data.state);
        if (!data.ok && typeof toast === 'function') {
          const map = { no_participants: 'Нет участников', already_rolling: 'Рулетка уже крутится' };
          toast(map[data.reason] || 'Команда не выполнена');
        }
        return data;
      })
      .catch(e => {
        console.error('[v62 HTTP cmd]', e);
        if (typeof toast === 'function') toast('Команда не дошла до сервера');
      });
  }

  function wheelNames(payload = {}) {
    const list = Array.isArray(payload.names) && payload.names.length ? payload.names : (state.participants || []);
    return list.map(clean).filter(Boolean).slice(0, 48);
  }

  function renderWheelV62(names) {
    const wheel = $('rouletteWheel');
    if (!wheel) return;

    const safe = names.length ? names : ['---'];
    const count = safe.length;
    const step = 360 / count;
    const colors = ['#b8872f', '#4f9b6b', '#9b4fd8', '#d94c72', '#5b7ce2', '#d8672f', '#6fcf97', '#e2c85b', '#7c4bd9', '#d9578a', '#54a8c7', '#c96b3c'];

    const sectors = safe.map((_, i) => `${colors[i % colors.length]} ${i * step}deg ${(i + 1) * step}deg`).join(', ');
    wheel.style.background = `conic-gradient(from -90deg, ${sectors})`;

    wheel.innerHTML = safe.map((name, i) => {
      const angle = i * step + step / 2;
      const label = String(name).length > 13 ? String(name).slice(0, 12) + '…' : String(name);
      return `<div class="wheel-name" style="--a:${angle}deg"><span>${esc(label.toUpperCase())}</span></div>`;
    }).join('') + '<div class="wheel-center">R</div>';
  }

  function setRot(deg) {
    wheelState.rotation = Number(deg || 0);
    const wheel = $('rouletteWheel');
    if (wheel) wheel.style.transform = `rotate(${wheelState.rotation}deg)`;
  }

  function animateToWinner(names, winner, durationMs) {
    cancelWheelAnimation();

    const safe = names.length ? names : ['---'];
    const step = 360 / safe.length;
    let idx = safe.findIndex(n => clean(n) === clean(winner));
    if (idx < 0) idx = Math.floor(Math.random() * safe.length);

    const startRot = Number(wheelState.rotation || 0);
    const targetCenter = idx * step + step / 2;
    const desired = -targetCenter;
    const norm = x => ((x % 360) + 360) % 360;

    let delta = norm(desired) - norm(startRot);
    if (delta <= 0) delta += 360;

    const turns = Math.max(6, Math.min(16, Math.round(durationMs / 650)));
    const endRot = startRot + turns * 360 + delta;
    const start = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 4);

    function frame(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const rot = startRot + (endRot - startRot) * ease(t);
      setRot(rot);

      if ($('rollingName')) {
        // v495/v496: top nickname follows the REAL sector under the fixed pointer.
        // Do not advance names by elapsed time: during deceleration that desynchronizes
        // the label from the wheel. 0deg is the top pointer because wheel sectors are
        // rendered with conic-gradient(from -90deg, ...).
        const pointerAngle = ((-rot % 360) + 360) % 360;
        const liveIdx = Math.min(safe.length - 1, Math.floor(pointerAngle / step));
        if (frame.__v496LastPointerIndex !== liveIdx) {
          frame.__v496LastPointerIndex = liveIdx;
          $('rollingName').textContent = '@' + safe[liveIdx];
        }
      }

      if (t < 1) {
        wheelAnim = requestAnimationFrame(frame);
      } else {
        wheelAnim = null;
        setRot(endRot);
        if ($('rollingName')) $('rollingName').textContent = winner ? '@' + clean(winner) : '---';
        const center = $('rouletteWheel')?.querySelector('.wheel-center');
        if (center) center.textContent = '✓';
      }
    }

    wheelAnim = requestAnimationFrame(frame);
  }

  window.startRolling = function(payload = {}) {
    showVisual('rollingBox');
    clearInterval(rollTimer);

    if ($('rollStatusText')) {
      $('rollStatusText').textContent = payload.mode === 'elimination' ? 'НА ВЫБЫВАНИЕ' : 'ОБЫЧНАЯ РУЛЕТКА';
    }

    const names = wheelNames(payload);
    const winner = clean(payload.winner || '');
    const durationMs = Math.max(1000, Number(payload.durationMs || 4800));

    wheelState.names = names;
    wheelState.durationMs = durationMs;
    wheelState.mode = payload.mode || 'normal';
    wheelState.winner = winner;

    const wrap = $('rouletteWheelWrap');
    if (wrap) {
      wrap.classList.remove('hidden', 'winner-spin');
      wrap.classList.add('rolling-spin');
    }

    $('winnerChatBox')?.classList.add('hidden');
    renderWheelV62(names);
    animateToWinner(names, winner, durationMs);
  };

  window.showWinner = function(usernameOrPayload, mode = '', details = null) {
    clearInterval(rollTimer);
    const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
    const username = clean(payload?.username || usernameOrPayload || wheelState.winner || '');
    if (!username) return;

    const finalMode = payload?.mode || mode || '';
    const finalDetails = localDetails(username, payload?.details || details);

    if ($('winnerName')) {
      $('winnerName').textContent = username;
      $('winnerName').classList.remove('winner-pop');
      void $('winnerName').offsetWidth;
      $('winnerName').classList.add('winner-pop');
    }

    const label = $('winnerBox')?.querySelector('.winner-label');
    if (label) {
      label.textContent = finalMode === 'elimination' ? 'ПОСЛЕДНИЙ ОСТАВШИЙСЯ' : finalMode === 'quick' ? 'БЫСТРЫЙ ПОБЕДИТЕЛЬ' : 'ПОБЕДИТЕЛЬ';
    }

    $('winnerDetails')?.classList.remove('hidden');
    if ($('winnerFollowInfo')) $('winnerFollowInfo').textContent = finalDetails.followText || 'нет данных';
    if ($('winnerWatchInfo')) $('winnerWatchInfo').textContent = fmt(finalDetails.watchMs || 0);
    if ($('winnerMsgInfo')) $('winnerMsgInfo').textContent = String(finalDetails.messages ?? 0);
    if ($('winnerKdInfo')) {
      $('winnerKdInfo').textContent = finalDetails.kdText || '—';
      $('winnerKdInfo').classList.toggle('kd-ok', Boolean(finalDetails.kdOk));
      $('winnerKdInfo').classList.toggle('kd-bad', !finalDetails.kdOk);
    }

    showVisual('winnerBox');
    stopWheelWinner(username);
    startWinnerChatV62(username);
  };

  function chatTsV482(m) {
    const direct = Number(m?.ts || m?.timestamp || m?.createdAtMs || 0);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const raw = String(m?.time || '');
    const mt = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!mt) return 0;
    const d = new Date();
    d.setHours(Number(mt[1]), Number(mt[2]), Number(mt[3] || 0), 0);
    let ts = d.getTime();
    if (ts > Date.now() + 60_000) ts -= 24 * 60 * 60 * 1000;
    return ts;
  }

  function winnerMessages(username) {
    const u = clean(username);
    const cutoff = Date.now() - 5 * 60 * 1000;
    const merged = [...(v62WinnerHistoryV482 || []), ...((state && state.chat) || [])];
    const seen = new Set();
    return merged.filter(m => {
      if (clean(m?.username) !== u) return false;
      const ts = chatTsV482(m);
      if (ts && ts < cutoff) return false;
      const key = `${ts}|${m?.username || ''}|${m?.text || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a,b) => chatTsV482(a) - chatTsV482(b));
  }

  async function loadWinnerHistoryV482(username) {
    const u = clean(username);
    if (!u) return;
    try {
      const res = await fetch(`/api/v482/winner-chat?user=${encodeURIComponent(u)}&minutes=5`, { cache: 'no-store', credentials: 'same-origin' });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.messages) && v62WinnerChat && clean(v62WinnerChat.username) === u) {
        v62WinnerHistoryV482 = data.messages;
        renderWinnerChatV62(true);
      }
    } catch (e) {
      console.warn('[v482 winner history]', e);
    }
  }

  function winnerTimerSettingsV428() {
    const settings = (window.state && window.state.settings) || {};
    let storedEnabled = null;
    let storedSeconds = null;
    try {
      storedEnabled = localStorage.getItem('korzhany_winner_timer_enabled');
      storedSeconds = localStorage.getItem('korzhany_winner_timer_sec');
    } catch (_) {}
    // v509: the value saved from the Boost Bot settings UI is authoritative on this browser.
    // Server state is the fallback, not the other way around, so a stale state snapshot cannot
    // silently force the old 15 second default after navigation/reconnect.
    const rawEnabled = storedEnabled ?? settings.winnerResponseTimerEnabled ?? true;
    const rawSeconds = storedSeconds ?? settings.winnerResponseTimerSec ?? 15;
    const enabled = rawEnabled !== false && rawEnabled !== 'false' && rawEnabled !== 0 && rawEnabled !== '0';
    const seconds = Math.max(5, Math.min(300, Math.floor(Number(rawSeconds || 15))));
    return { enabled, seconds };
  }

  function stopWinnerTimerV428() {
    if (v62WinnerTimer) clearInterval(v62WinnerTimer);
    v62WinnerTimer = null;
  }

  function startWinnerChatV62(username) {
    stopWinnerTimerV428();
    v62WinnerLastCount = -1;

    const timer = winnerTimerSettingsV428();
    v62WinnerHistoryV482 = [];
    v62WinnerChat = {
      username,
      startedAt: Date.now(),
      initialCount: winnerMessages(username).length,
      answered: false,
      answeredAt: null,
      timedOut: false,
      timerEnabled: timer.enabled,
      timerSeconds: timer.seconds
    };

    const chatBoxV482 = $('winnerChatBox');
    chatBoxV482?.classList.remove('hidden');
    chatBoxV482?.classList.add('v482-waiting');
    chatBoxV482?.classList.remove('v482-answered');
    renderWinnerChatV62(true);
    loadWinnerHistoryV482(username);
    // v512: only render the history in the legacy chat layer.
    // One authoritative response clock owns countdown, success and timeout.
    if (!window.__v512TimerInstalled) {
      v62WinnerTimer = setInterval(() => renderWinnerChatV62(false), 200);
    }
  }

  function renderWinnerChatV62(force = false) {
    if (!v62WinnerChat) return;

    const msgs = winnerMessages(v62WinnerChat.username);
    // v513: five-minute message history is DISPLAY-ONLY. The authoritative
    // stopwatch alone decides whether a *new* message was received in time.
    // The legacy answeredAt/timedOut flags must not compete with it.
    if (!window.__v512TimerInstalled) {
      const freshAnswer = msgs.find(m => chatTsV482(m) >= v62WinnerChat.startedAt - 50);
      if (freshAnswer && !v62WinnerChat.answered) {
        v62WinnerChat.answered = true;
        v62WinnerChat.answeredAt = Math.max(v62WinnerChat.startedAt, chatTsV482(freshAnswer) || Date.now());
        stopWinnerTimerV428();
      }
    }
    const chatBoxV482 = $('winnerChatBox');

    if ($('winnerChatNick')) $('winnerChatNick').textContent = v62WinnerChat.username;

    const list = $('winnerChatMessages');
    if (list && (force || msgs.length !== v62WinnerLastCount)) {
      const wasBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
      list.innerHTML = msgs.length
        ? msgs.slice(-80).map(m => `<div class="winner-chat-msg winner-chat-msg-v219"><span class="wc-time">[${esc(m.time || '')}]</span>${chatBadgesHtmlV219(m)}<span class="wc-name" style="color:${esc(chatColorV219(m))}">${esc(m.displayName || m.username)}:</span><span class="wc-text">${esc(m.text || '')}</span></div>`).join('')
        : '<div class="winner-chat-empty">Пока сообщений от победителя нет</div>';
      v62WinnerLastCount = msgs.length;
      if (force || wasBottom) requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
    }

    // v512: old v62 status detection scans a 5-minute history, and its timer is
    // stopped by unrelated legacy close/start calls. History is presentation ONLY.
    // The independent clock below checks live state.chat after the win event.
    if (window.__v512TimerInstalled) return;

    const elapsed = Math.max(0, Math.floor(((v62WinnerChat.answeredAt || Date.now()) - v62WinnerChat.startedAt) / 1000));
    const limit = Math.max(5, Number(v62WinnerChat.timerSeconds || 15));
    const timerEnabled = Boolean(v62WinnerChat.timerEnabled);
    const remaining = Math.max(0, limit - elapsed);

    if (timerEnabled && !v62WinnerChat.answered && elapsed >= limit) {
      v62WinnerChat.timedOut = true;
      stopWinnerTimerV428();
    }

    const answeredOnTime = Boolean(v62WinnerChat.answered && (!timerEnabled || elapsed <= limit));
    const expired = Boolean(timerEnabled && (v62WinnerChat.timedOut || elapsed >= limit) && !answeredOnTime);
    if (chatBoxV482) {
      chatBoxV482.classList.toggle('v482-answered', answeredOnTime);
      chatBoxV482.classList.toggle('v482-waiting', !answeredOnTime && !expired);
      chatBoxV482.classList.toggle('v509-timeout', expired);
      chatBoxV482.classList.toggle('v507-response-waiting', !answeredOnTime && !expired);
    }

    const stopwatch = $('winnerReplyStopwatch');
    if (stopwatch) {
      if (!timerEnabled) {
        stopwatch.textContent = '∞';
        stopwatch.title = 'Таймер ответа отключён';
      } else if (v62WinnerChat.answered) {
        // On-time answer: show response time. Late answer: the countdown had already reached zero.
        stopwatch.textContent = elapsed <= limit ? `${elapsed} сек` : '0 сек';
        stopwatch.title = elapsed <= limit ? `Ответ за ${elapsed} сек` : `Ответ получен поздно, через ${elapsed} сек`;
      } else {
        stopwatch.textContent = `${remaining} сек`;
        stopwatch.title = `Осталось ${remaining} из ${limit} сек`;
      }
      stopwatch.classList.toggle('timer-ok', v62WinnerChat.answered && (!timerEnabled || elapsed <= limit));
      stopwatch.classList.toggle('timer-bad', timerEnabled && ((v62WinnerChat.answered && elapsed > limit) || (!v62WinnerChat.answered && elapsed >= limit)));
      stopwatch.classList.toggle('timer-disabled-v428', !timerEnabled);
    }

    const status = $('winnerReplyStatus');
    if (status) {
      if (!timerEnabled && v62WinnerChat.answered) {
        status.textContent = `Победитель ответил — ${elapsed} сек`;
        status.classList.add('status-ok');
        status.classList.remove('status-bad');
      } else if (!timerEnabled) {
        status.textContent = 'Таймер ответа отключён. Ждём сообщение победителя в чат...';
        status.classList.remove('status-ok', 'status-bad');
      } else if (v62WinnerChat.answered && elapsed <= limit) {
        status.textContent = `Победитель ответил вовремя — ${elapsed} сек`;
        status.classList.add('status-ok');
        status.classList.remove('status-bad');
      } else if (v62WinnerChat.answered && elapsed > limit) {
        status.textContent = `Победитель ответил, но поздно — ${elapsed} сек`;
        status.classList.add('status-bad');
        status.classList.remove('status-ok');
      } else if (elapsed >= limit) {
        status.textContent = `${limit} сек истекли — ответа нет`;
        status.classList.add('status-bad');
        status.classList.remove('status-ok');
      } else {
        status.textContent = `Ждём ответ победителя — осталось ${remaining} сек`;
        status.classList.remove('status-ok', 'status-bad');
      }
    }
  }

  const oldRender = window.render || render;
  window.render = function(next) {
    oldRender(next);
    renderWinnerChatV62(false);
  };

  function closeWinnerV62() {
    if (v62WinnerTimer) clearInterval(v62WinnerTimer);
    v62WinnerTimer = null;
    v62WinnerChat = null;
    $('winnerChatBox')?.classList.add('hidden');
    $('winnerBox')?.classList.add('hidden');
    $('rollingBox')?.classList.add('hidden');
    $('rouletteWheelWrap')?.classList.add('hidden');
    showVisual('idleBox');
  }

  // v288: expose real close so SAVE can close the same flow as the cross.
  window.__closeWinnerV62 = closeWinnerV62;

  document.addEventListener('click', function(e) {
    const close = e.target.closest && e.target.closest('#winnerCloseBtn');
    const reroll = e.target.closest && e.target.closest('#winnerRerollBtn_OLD_DISABLED');
    const quick = e.target.closest && e.target.closest('#quickRollBtn');
    const startRoulette = e.target.closest && e.target.closest('#startRouletteBtn');

    if (quick) {
      v62LastRoll = { type: 'quick' };
      return;
    }

    if (startRoulette) {
      const durationSec = Math.max(1, Math.min(120, Number($('rollDurationInput')?.value || 5)));
      const mode = $('rouletteModeSelect')?.value || 'normal';
      v62LastRoll = { type: 'roll', mode, durationSec };
      return;
    }

    if (close) {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeWinnerV62();
      return;
    }

    if (reroll) {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeWinnerV62();
      if (v62LastRoll.type === 'quick') {
        v62Cmd('quick_roll');
      } else {
        v62Cmd('roll', { mode: v62LastRoll.mode || 'normal', durationSec: v62LastRoll.durationSec || 5 });
      }
      return;
    }
  }, true);

  window.__v62RenderWinnerChat = renderWinnerChatV62;
  window.__v489StartWinnerChat = startWinnerChatV62;
})();


/* v63: winner controls + wheel/chat layout finalizer */
(function () {
  let v63LastRoll = { type: 'roll', mode: 'normal', durationSec: 5 };
  let v63ChatDelay = null;

  function q(id) { return document.getElementById(id); }
  function clean(name) { return String(name || '').replace(/^@/, '').trim().toLowerCase(); }

  function adminKey() {
    return new URLSearchParams(location.search).get('key') || localStorage.getItem('rostyasha_admin_key') || '12345';
  }

  async function httpCmd(type, params = {}) {
    const qs = new URLSearchParams({ key: adminKey(), ...params });
    try {
      const res = await fetch(`/api/cmd/${encodeURIComponent(type)}?${qs.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.state && typeof render === 'function') render(data.state);
      if (!data.ok && typeof toast === 'function') {
        const map = { no_participants: 'Нет участников', already_rolling: 'Рулетка уже крутится' };
        toast(map[data.reason] || 'Команда не выполнена');
      }
      return data;
    } catch (e) {
      console.error('[v63 httpCmd]', e);
      if (typeof toast === 'function') toast('Команда не дошла до сервера');
      return null;
    }
  }

  function hardHideWinner() {
    if (v63ChatDelay) clearTimeout(v63ChatDelay);
    v63ChatDelay = null;

    try { clearInterval(window.v62WinnerTimer); } catch {}
    q('winnerBox')?.classList.add('hidden');
    q('winnerChatBox')?.classList.add('hidden');
    q('rouletteWheelWrap')?.classList.add('hidden');
    q('rouletteWheelWrap')?.classList.remove('rolling-spin', 'winner-spin');
    document.body.classList.remove('v63-rolling', 'v63-winner');
    if (typeof showVisual === 'function') showVisual('idleBox');
  }

  function reroll() {
    hardHideWinner();

    if (v63LastRoll.type === 'quick') {
      if (typeof showVisual === 'function') showVisual('rollingBox');
      if (q('rollStatusText')) q('rollStatusText').textContent = 'БЫСТРЫЙ РЕРОЛЛ';
      if (q('rollingName')) q('rollingName').textContent = '---';
      httpCmd('quick_roll');
      return;
    }

    if (typeof showVisual === 'function') showVisual('rollingBox');
    if (q('rollStatusText')) q('rollStatusText').textContent = 'РОЛЛИМ...';
    if (q('rollingName')) q('rollingName').textContent = '---';
    httpCmd('roll', {
      mode: v63LastRoll.mode || 'normal',
      durationSec: v63LastRoll.durationSec || 5
    });
  }

  function makeWinnerDetailsLines() {
    const details = q('winnerDetails');
    if (!details) return;
    details.querySelectorAll('div').forEach(row => {
      row.classList.add('winner-detail-row');
      const span = row.querySelector('span');
      const b = row.querySelector('b');
      if (span) span.classList.add('winner-detail-label');
      if (b) b.classList.add('winner-detail-value');
    });
  }

  function movePulseToWheel() {
    document.body.classList.add('v63-rolling');
    q('rouletteWheelWrap')?.classList.remove('hidden');
  }

  function hideWheelShowChatLater(mode) {
    if (v63ChatDelay) clearTimeout(v63ChatDelay);
    v63ChatDelay = null;

    const isQuick = mode === 'quick';

    if (isQuick) {
      q('rouletteWheelWrap')?.classList.add('hidden');
      q('winnerChatBox')?.classList.remove('hidden');
      return;
    }

    v63ChatDelay = setTimeout(() => {
      q('rouletteWheelWrap')?.classList.add('hidden');
      q('rouletteWheelWrap')?.classList.remove('rolling-spin', 'winner-spin');
      q('winnerChatBox')?.classList.remove('hidden');
    }, 1000);
  }

  const oldStartRolling = window.startRolling;
  window.startRolling = function(payload = {}) {
    document.body.classList.add('v63-rolling');
    document.body.classList.remove('v63-winner');
    q('winnerChatBox')?.classList.add('hidden');

    if (typeof oldStartRolling === 'function') {
      oldStartRolling(payload);
    }

    setTimeout(movePulseToWheel, 0);
  };

  const oldShowWinner = window.showWinner;
  window.showWinner = function(usernameOrPayload, mode = '', details = null) {
    const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
    const finalMode = payload?.mode || mode || '';
    document.body.classList.remove('v63-rolling');
    document.body.classList.add('v63-winner');

    if (typeof oldShowWinner === 'function') {
      oldShowWinner(usernameOrPayload, mode, details);
    }

    makeWinnerDetailsLines();

    // force correct real nick in chat, if old logic glitched
    const username = clean(payload?.username || usernameOrPayload || window.wheelState?.winner || '');
    if (username && q('winnerChatNick')) q('winnerChatNick').textContent = username;
    if (username && q('winnerName')) q('winnerName').textContent = username;

    hideWheelShowChatLater(finalMode);
  };

  document.addEventListener('click', function (e) {
    const close = e.target.closest && e.target.closest('#winnerCloseBtn');
    const rerollBtn = e.target.closest && e.target.closest('#winnerRerollBtn_OLD_DISABLED');
    const quick = e.target.closest && e.target.closest('#quickRollBtn');
    const startRoulette = e.target.closest && e.target.closest('#startRouletteBtn');

    if (quick) {
      v63LastRoll = { type: 'quick' };
      return;
    }

    if (startRoulette) {
      const durationSec = Math.max(1, Math.min(120, Number(q('rollDurationInput')?.value || 5)));
      const mode = q('rouletteModeSelect')?.value || 'normal';
      v63LastRoll = { type: 'roll', mode, durationSec };
      return;
    }

    if (close) {
      e.preventDefault();
      e.stopImmediatePropagation();
      hardHideWinner();
      return;
    }

    if (rerollBtn) {
      e.preventDefault();
      e.stopImmediatePropagation();
      reroll();
      return;
    }
  }, true);

  document.addEventListener('DOMContentLoaded', makeWinnerDetailsLines);
  setTimeout(makeWinnerDetailsLines, 500);
})();


/* v64: immediate chat + block-bound pulse */
(function () {
  function q(id) { return document.getElementById(id); }
  function clean(name) { return String(name || '').replace(/^@/, '').trim().toLowerCase(); }

  let lastWinnerModeV64 = '';

  function setModeClasses(mode) {
    document.body.classList.remove('v64-quick-winner', 'v64-roulette-winner', 'v64-wheel-rolling');
    if (mode === 'quick') document.body.classList.add('v64-quick-winner');
    else document.body.classList.add('v64-roulette-winner');
  }

  // Override startRolling to mark wheel rolling and keep pulse on wheel only.
  const prevStartRollingV64 = window.startRolling;
  window.startRolling = function(payload = {}) {
    document.body.classList.remove('v64-quick-winner', 'v64-roulette-winner');
    document.body.classList.add('v64-wheel-rolling');

    q('winnerChatBox')?.classList.add('hidden');

    if (typeof prevStartRollingV64 === 'function') {
      prevStartRollingV64(payload);
    }

    q('rouletteWheelWrap')?.classList.remove('hidden');
    q('rouletteWheelWrap')?.classList.add('rolling-spin');
  };

  // Override showWinner after older v62/v63 logic:
  // - no 1 sec delay
  // - hide wheel immediately for roulette
  // - chat appears immediately
  // - pulse classes are block-bound.
  const prevShowWinnerV64 = window.showWinner;
  window.showWinner = function(usernameOrPayload, mode = '', details = null) {
    const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
    const finalMode = payload?.mode || mode || '';
    lastWinnerModeV64 = finalMode;

    document.body.classList.remove('v64-wheel-rolling');

    if (typeof prevShowWinnerV64 === 'function') {
      prevShowWinnerV64(usernameOrPayload, mode, details);
    }

    setModeClasses(finalMode);

    // Hide the wheel immediately after roulette winner is displayed.
    // Quick roll has no wheel anyway.
    q('rouletteWheelWrap')?.classList.add('hidden');
    q('rouletteWheelWrap')?.classList.remove('rolling-spin', 'winner-spin');

    // Chat should appear immediately and stay close to winner block.
    q('winnerChatBox')?.classList.remove('hidden');

    // Fix nick if previous layer glitched.
    const username = clean(payload?.username || usernameOrPayload || window.wheelState?.winner || '');
    if (username) {
      if (q('winnerName')) q('winnerName').textContent = username;
      if (q('winnerChatNick')) q('winnerChatNick').textContent = username;
    }
  };

  // Extra hard close clears all pulse classes.
  document.addEventListener('click', function(e) {
    const close = e.target.closest && e.target.closest('#winnerCloseBtn');
    if (!close) return;
    document.body.classList.remove('v64-quick-winner', 'v64-roulette-winner', 'v64-wheel-rolling');
    q('winnerChatBox')?.classList.add('hidden');
    q('rouletteWheelWrap')?.classList.add('hidden');
  }, true);

  // Keep reroll in rolling mode.
  document.addEventListener('click', function(e) {
    const reroll = e.target.closest && e.target.closest('#winnerRerollBtn_OLD_DISABLED');
    if (!reroll) return;
    document.body.classList.remove('v64-quick-winner', 'v64-roulette-winner');
  }, true);
})();


/* v65: reroll repeats the actual winner mode */
(function () {
  let actualLastWinnerModeV65 = null;
  let actualLastRouletteSettingsV65 = {
    mode: localStorage.getItem('rostyasha_roll_mode') || 'normal',
    durationSec: Number(localStorage.getItem('rostyasha_roll_duration') || 5)
  };

  function q(id) { return document.getElementById(id); }

  function keyV65() {
    return new URLSearchParams(location.search).get('key') || localStorage.getItem('rostyasha_admin_key') || '12345';
  }

  async function cmdV65(type, params = {}) {
    const qs = new URLSearchParams({ key: keyV65(), ...params });
    try {
      const res = await fetch(`/api/cmd/${encodeURIComponent(type)}?${qs.toString()}`, { cache: 'no-store' });
      const data = await res.json();

      if (data.state && typeof render === 'function') render(data.state);

      if (!data.ok && typeof toast === 'function') {
        const map = {
          no_participants: 'Нет участников',
          already_rolling: 'Рулетка уже крутится',
          bad_key: 'Неверный ключ панели'
        };
        toast(map[data.reason] || 'Команда не выполнена');
      }

      return data;
    } catch (e) {
      console.error('[v65 cmd]', e);
      if (typeof toast === 'function') toast('Команда не дошла до сервера');
      return null;
    }
  }

  function closeWinnerOnlyV65() {
    document.body.classList.remove('v64-quick-winner', 'v64-roulette-winner', 'v64-wheel-rolling');
    q('winnerBox')?.classList.add('hidden');
    q('winnerChatBox')?.classList.add('hidden');
    q('rouletteWheelWrap')?.classList.add('hidden');
    q('rouletteWheelWrap')?.classList.remove('rolling-spin', 'winner-spin');
    if (typeof showVisual === 'function') showVisual('idleBox');
  }

  function setRollingUiV65(label) {
    if (typeof showVisual === 'function') showVisual('rollingBox');
    if (q('rollStatusText')) q('rollStatusText').textContent = label;
    if (q('rollingName')) q('rollingName').textContent = '---';
    q('winnerChatBox')?.classList.add('hidden');
  }

  function startQuickRerollV65() {
    closeWinnerOnlyV65();
    actualLastWinnerModeV65 = 'quick';
    setRollingUiV65('БЫСТРЫЙ РЕРОЛЛ');
    cmdV65('quick_roll');
  }

  function startRouletteRerollV65() {
    closeWinnerOnlyV65();
    actualLastWinnerModeV65 = 'roulette';

    const mode = actualLastRouletteSettingsV65.mode || localStorage.getItem('rostyasha_roll_mode') || 'normal';
    const durationSec = Number(actualLastRouletteSettingsV65.durationSec || localStorage.getItem('rostyasha_roll_duration') || 5);

    setRollingUiV65('РОЛЛИМ...');
    cmdV65('roll', { mode, durationSec });
  }

  // Track what user actually started.
  document.addEventListener('click', function (e) {
    const quick = e.target.closest && e.target.closest('#quickRollBtn');
    const startRoulette = e.target.closest && e.target.closest('#startRouletteBtn');

    if (quick) {
      actualLastWinnerModeV65 = 'quick';
      return;
    }

    if (startRoulette) {
      const durationSec = Math.max(1, Math.min(120, Number(q('rollDurationInput')?.value || 5)));
      const mode = q('rouletteModeSelect')?.value || 'normal';
      actualLastRouletteSettingsV65 = { mode, durationSec };
      localStorage.setItem('rostyasha_roll_mode', mode);
      localStorage.setItem('rostyasha_roll_duration', String(durationSec));
      actualLastWinnerModeV65 = 'roulette';
      return;
    }
  }, true);

  // Track by real server winner payload too, this is more reliable than button memory.
  const prevShowWinnerV65 = window.showWinner;
  window.showWinner = function(usernameOrPayload, mode = '', details = null) {
    const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
    const winnerMode = payload?.mode || mode || '';

    if (winnerMode === 'quick') actualLastWinnerModeV65 = 'quick';
    else if (winnerMode) actualLastWinnerModeV65 = 'roulette';

    if (typeof prevShowWinnerV65 === 'function') {
      return prevShowWinnerV65(usernameOrPayload, mode, details);
    }
  };

  // Override reroll button after all older handlers.
  document.addEventListener('click', function(e) {
    const reroll = e.target.closest && e.target.closest('#winnerRerollBtn_OLD_DISABLED');
    if (!reroll) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (actualLastWinnerModeV65 === 'quick') {
      startQuickRerollV65();
    } else {
      startRouletteRerollV65();
    }
  }, true);

  window.__v65RerollMode = () => actualLastWinnerModeV65;
})();



/* v65-reroll-actual-fix: single real reroll handler */
(function () {
  function q(id) { return document.getElementById(id); }

  function adminKey() {
    return new URLSearchParams(location.search).get('key') || localStorage.getItem('rostyasha_admin_key') || '12345';
  }

  function getMode() {
    return window.__rostyashaRerollMode || localStorage.getItem('rostyasha_reroll_mode') || 'roulette';
  }

  async function cmd(type, params = {}) {
    const qs = new URLSearchParams({ key: adminKey(), ...params });

    try {
      const res = await fetch(`/api/cmd/${encodeURIComponent(type)}?${qs.toString()}`, {
        method: 'GET',
        cache: 'no-store'
      });
      const data = await res.json();

      if (data.state && typeof render === 'function') render(data.state);

      if (!data.ok && typeof toast === 'function') {
        const map = {
          no_participants: 'Нет участников',
          no_candidates: 'Нет участников',
          already_rolling: 'Рулетка уже крутится',
          bad_key: 'Неверный ключ панели'
        };
        toast(map[data.reason] || 'Команда не выполнена');
      }

      return data;
    } catch (e) {
      console.error('[real reroll cmd]', e);
      if (typeof toast === 'function') toast('Команда не дошла до сервера');
      return null;
    }
  }

  function hideCurrentWinner() {
    q('winnerBox')?.classList.add('hidden');
    q('winnerChatBox')?.classList.add('hidden');
    q('rouletteWheelWrap')?.classList.add('hidden');
    q('rouletteWheelWrap')?.classList.remove('rolling-spin', 'winner-spin');

    if (typeof showVisual === 'function') showVisual('rollingBox');
  }

  function showQuickLoading() {
    hideCurrentWinner();
    if (q('rollStatusText')) q('rollStatusText').textContent = 'БЫСТРЫЙ РЕРОЛЛ';
    if (q('rollingName')) q('rollingName').textContent = '---';
    q('rouletteWheelWrap')?.classList.add('hidden');
  }

  function showRouletteLoading() {
    hideCurrentWinner();
    if (q('rollStatusText')) q('rollStatusText').textContent = 'РОЛЛИМ...';
    if (q('rollingName')) q('rollingName').textContent = '---';
  }

  async function doReroll() {
    const mode = getMode();

    if (mode === 'quick') {
      window.__rostyashaRerollMode = 'quick';
      localStorage.setItem('rostyasha_reroll_mode', 'quick');
      showQuickLoading();
      await cmd('quick_roll');
      return;
    }

    window.__rostyashaRerollMode = 'roulette';
    localStorage.setItem('rostyasha_reroll_mode', 'roulette');

    const durationSec = Math.max(1, Math.min(120, Number(localStorage.getItem('rostyasha_roll_duration') || q('rollDurationInput')?.value || 5)));
    const rouletteMode = localStorage.getItem('rostyasha_roll_mode') || q('rouletteModeSelect')?.value || 'normal';

    showRouletteLoading();
    await cmd('roll', { mode: rouletteMode, durationSec });
  }

  document.addEventListener('click', function (e) {
    const reroll = e.target.closest && e.target.closest('#winnerRerollBtn');
    if (!reroll) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    doReroll();
  }, true);

  // Track actual winner mode too, in case winner came from server/bot command.
  const oldShowWinner = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinner && !window.__rostyashaRealRerollWrapped) {
    window.__rostyashaRealRerollWrapped = true;
    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const realMode = payload?.mode || mode || '';

      if (realMode === 'quick') {
        window.__rostyashaRerollMode = 'quick';
        localStorage.setItem('rostyasha_reroll_mode', 'quick');
      } else if (realMode) {
        window.__rostyashaRerollMode = 'roulette';
        localStorage.setItem('rostyasha_reroll_mode', 'roulette');
      }

      return oldShowWinner(usernameOrPayload, mode, details);
    };
  }
})();


/* v65-bigger-real-impulses: insert real wheel impulse layers and mark quick winners */
(function () {
  function ensureWheelImpulses() {
    const wrap = document.getElementById('rouletteWheelWrap');
    if (!wrap) return;

    if (!wrap.querySelector('.wheel-real-impulse.impulse-1')) {
      ['impulse-1', 'impulse-2', 'impulse-3'].forEach(cls => {
        const el = document.createElement('div');
        el.className = 'wheel-real-impulse ' + cls;
        wrap.insertBefore(el, wrap.firstChild);
      });
    }
  }

  function setQuickWinnerMode(isQuick) {
    document.body.classList.toggle('quick-roll-winner', Boolean(isQuick));
  }

  document.addEventListener('DOMContentLoaded', ensureWheelImpulses);
  korIdleIntervalV486(ensureWheelImpulses, 2500);

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#quickRollBtn')) {
      setQuickWinnerMode(true);
    }

    if (e.target.closest && e.target.closest('#startRouletteBtn')) {
      setQuickWinnerMode(false);
    }
  }, true);

  const oldShowWinner = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinner && !window.__bigWheelPulseShowWrapped) {
    window.__bigWheelPulseShowWrapped = true;

    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const realMode = payload?.mode || mode || '';

      setQuickWinnerMode(realMode === 'quick');

      return oldShowWinner(usernameOrPayload, mode, details);
    };
  }
})();


/* v65-strong-impulses-random-wheel: visible impulse layers + random wheel route */
(function () {
  function ensureStrongImpulses() {
    const wrap = document.getElementById('rouletteWheelWrap');
    if (!wrap) return;

    ['impulse-1', 'impulse-2', 'impulse-3', 'impulse-4'].forEach(cls => {
      if (!wrap.querySelector('.wheel-real-impulse.' + cls)) {
        const el = document.createElement('div');
        el.className = 'wheel-real-impulse ' + cls;
        wrap.insertBefore(el, wrap.firstChild);
      }
    });

    if (!wrap.querySelector('.wheel-extra-shockwave')) {
      const shock = document.createElement('div');
      shock.className = 'wheel-extra-shockwave';
      wrap.insertBefore(shock, wrap.firstChild);
    }
  }

  document.addEventListener('DOMContentLoaded', ensureStrongImpulses);
  korIdleIntervalV486(ensureStrongImpulses, 2500);

  // Randomize roulette animation path while keeping the preselected winner under the pointer.
  function patchStartRolling() {
    const oldStart = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
    if (!oldStart || window.__randomWheelRoutePatchedV65) return;

    window.__randomWheelRoutePatchedV65 = true;

    window.startRolling = function (payload = {}) {
      ensureStrongImpulses();

      try {
        const wheel = document.getElementById('rouletteWheel');
        const names = Array.isArray(payload.names) ? payload.names : [];
        const winner = String(payload.winner || '').replace(/^@/, '').trim().toLowerCase();

        if (wheel && names.length > 1 && winner) {
          // Random visual offset means the wheel never starts from the same place.
          const randomStart = Math.floor(Math.random() * 360);
          const randomTurns = 7 + Math.floor(Math.random() * 7);
          const randomJitter = (Math.random() * 0.62 - 0.31); // stays inside winner sector

          payload = {
            ...payload,
            randomStart,
            randomTurns,
            randomJitter
          };

          wheel.style.setProperty('--random-start-v65', randomStart + 'deg');
        }
      } catch (e) {
        console.error('[random wheel route patch]', e);
      }

      return oldStart(payload);
    };
  }

  patchStartRolling();
  setTimeout(patchStartRolling, 300);
  setTimeout(patchStartRolling, 1000);

  // If the internal animation function reads payload random fields, fine.
  // If not, force random visual rotation at roll start so route still looks different.
  document.addEventListener('click', function (e) {
    if (!(e.target.closest && e.target.closest('#startRouletteBtn'))) return;

    setTimeout(() => {
      const wheel = document.getElementById('rouletteWheel');
      if (!wheel) return;
      const randomStart = Math.floor(Math.random() * 360);
      wheel.style.transform = `rotate(${randomStart}deg)`;
      wheel.style.setProperty('--random-start-v65', randomStart + 'deg');
    }, 30);
  }, true);
})();


/* v65-constant-wheel-live-name: constant speed, live pointer nickname, random stop inside sector */
(function () {
  let constantWheelAnim = null;
  let lastWheelRotationV65 = Math.floor(Math.random() * 360);

  const $v = id => document.getElementById(id);
  const cleanV = v => String(v || '').replace(/^@/, '').trim().toLowerCase();
  const escV = v => String(v ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[ch]));

  const paletteV = [
    '#b8872f', '#4f9b6b', '#9b4fd8', '#d94c72',
    '#5b7ce2', '#d8672f', '#6fcf97', '#e2c85b',
    '#7c4bd9', '#d9578a', '#54a8c7', '#c96b3c'
  ];

  function namesFromPayloadV(payload = {}) {
    const arr = Array.isArray(payload.names) && payload.names.length
      ? payload.names
      : (Array.isArray(state?.participants) ? state.participants : []);
    const safe = arr.map(cleanV).filter(Boolean);
    return safe.length ? safe : ['---'];
  }

  function renderWheelConstantV(names) {
    const wheel = $v('rouletteWheel');
    if (!wheel) return;

    const safe = names.length ? names : ['---'];
    const step = 360 / safe.length;

    const sectors = safe.map((_, i) => {
      return `${paletteV[i % paletteV.length]} ${i * step}deg ${(i + 1) * step}deg`;
    }).join(', ');

    wheel.style.background = `conic-gradient(from -90deg, ${sectors})`;
    wheel.innerHTML = safe.map((name, i) => {
      const angle = i * step + step / 2;
      const label = String(name).length > 14 ? String(name).slice(0, 13) + '…' : String(name);
      return `<div class="wheel-name" style="--a:${angle}deg"><span>${escV(label.toUpperCase())}</span></div>`;
    }).join('') + '<div class="wheel-center">R</div>';
  }

  function setWheelRotationConstantV(deg) {
    lastWheelRotationV65 = Number(deg || 0);
    const wheel = $v('rouletteWheel');
    if (wheel) wheel.style.transform = `rotate(${lastWheelRotationV65}deg)`;
    updateLiveNameV(lastWheelRotationV65);
  }

  function nameUnderPointerV(rotationDeg, names) {
    const safe = names.length ? names : ['---'];
    const step = 360 / safe.length;

    // Wheel CSS starts at -90deg, pointer is at top.
    // Segment under top pointer is based on negative wheel rotation.
    const normalized = ((-rotationDeg % 360) + 360) % 360;
    const idx = Math.floor(normalized / step) % safe.length;
    return safe[idx] || safe[0] || '---';
  }

  function updateLiveNameV(rotationDeg, namesArg) {
    const names = namesArg || window.__constantWheelNamesV65 || ['---'];
    const name = nameUnderPointerV(rotationDeg, names);
    const el = $v('rollingName');
    if (!el) return;

    const next = '@' + name;
    if (el.textContent !== next) {
      el.textContent = next;
      el.classList.remove('name-pop');
      void el.offsetWidth;
      el.classList.add('name-pop');
    }
  }

  function cancelConstantWheelV() {
    if (constantWheelAnim) {
      cancelAnimationFrame(constantWheelAnim);
      constantWheelAnim = null;
    }
    try {
      if (typeof cancelWheelAnimation === 'function') cancelWheelAnimation();
    } catch {}
  }

  function targetRotationForWinnerV(names, winner) {
    const safe = names.length ? names : ['---'];
    const step = 360 / safe.length;
    let idx = safe.findIndex(n => cleanV(n) === cleanV(winner));
    if (idx < 0) idx = Math.floor(Math.random() * safe.length);

    // Stop randomly inside the winner sector, not at the line and not always center.
    // 0.24 - 0.76 keeps it away from both borders.
    const inside = 0.24 + Math.random() * 0.52;
    const pointInsideSector = idx * step + inside * step;

    // Rotate wheel so that this point is under top pointer.
    return -pointInsideSector;
  }

  function animateConstantToWinnerV(names, winner, durationMs) {
    cancelConstantWheelV();

    const safe = names.length ? names : ['---'];
    const duration = Math.max(1000, Number(durationMs || 5000));

    const start = performance.now();
    const startRot = lastWheelRotationV65 + Math.floor(Math.random() * 360);

    const baseTarget = targetRotationForWinnerV(safe, winner);
    const norm = x => ((x % 360) + 360) % 360;

    let deltaToTarget = norm(baseTarget) - norm(startRot);
    if (deltaToTarget <= 0) deltaToTarget += 360;

    // Constant speed: number of full turns depends on duration.
    // More seconds = more rotations, but speed stays steady.
    const rotationsPerSecond = 1.55 + Math.random() * 0.55;
    const turns = Math.max(3, Math.round(duration / 1000 * rotationsPerSecond));
    const endRot = startRot + turns * 360 + deltaToTarget;

    // Linear movement = one speed for the whole duration.
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const rot = startRot + (endRot - startRot) * t;

      setWheelRotationConstantV(rot);

      if (t < 1) {
        constantWheelAnim = requestAnimationFrame(frame);
      } else {
        constantWheelAnim = null;
        setWheelRotationConstantV(endRot);
        updateLiveNameV(endRot, safe);

        const center = $v('rouletteWheel')?.querySelector('.wheel-center');
        if (center) center.textContent = '✓';
      }
    }

    setWheelRotationConstantV(startRot);
    constantWheelAnim = requestAnimationFrame(frame);
  }

  function ensureImpulsesV() {
    const wrap = $v('rouletteWheelWrap');
    if (!wrap) return;

    ['impulse-1', 'impulse-2', 'impulse-3', 'impulse-4'].forEach(cls => {
      if (!wrap.querySelector('.wheel-real-impulse.' + cls)) {
        const el = document.createElement('div');
        el.className = 'wheel-real-impulse ' + cls;
        wrap.insertBefore(el, wrap.firstChild);
      }
    });

    if (!wrap.querySelector('.wheel-extra-shockwave')) {
      const shock = document.createElement('div');
      shock.className = 'wheel-extra-shockwave';
      wrap.insertBefore(shock, wrap.firstChild);
    }
  }

  // Final override. This replaces old ease-out / same-route animation.
  window.startRolling = function (payload = {}) {
    ensureImpulsesV();

    if (typeof showVisual === 'function') showVisual('rollingBox');
    try { clearInterval(rollTimer); } catch {}

    if ($v('rollStatusText')) {
      $v('rollStatusText').textContent = payload.mode === 'elimination' ? 'НА ВЫБЫВАНИЕ' : 'РОЛЛИМ...';
    }

    const names = namesFromPayloadV(payload);
    const winner = cleanV(payload.winner || '');
    const durationMs = Math.max(1000, Number(payload.durationMs || 5000));

    window.__constantWheelNamesV65 = names;

    try {
      if (typeof wheelState === 'object') {
        wheelState.names = names;
        wheelState.durationMs = durationMs;
        wheelState.mode = payload.mode || 'normal';
        wheelState.winner = winner;
      }
    } catch {}

    const wrap = $v('rouletteWheelWrap');
    if (wrap) {
      wrap.classList.remove('hidden', 'winner-spin');
      wrap.classList.add('rolling-spin');
    }

    $v('winnerChatBox')?.classList.add('hidden');
    renderWheelConstantV(names);
    animateConstantToWinnerV(names, winner, durationMs);
  };

  document.addEventListener('DOMContentLoaded', ensureImpulsesV);
  korIdleIntervalV486(ensureImpulsesV, 2500);
})();

/* v71: rotation process copied from uploaded working file */
(function () {
  let wheelAnimV71 = null;
  let wheelStateV71 = {
    names: [],
    rotation: 0,
    durationMs: 4800,
    mode: 'normal'
  };

  const $v71 = id => document.getElementById(id);
  const cleanV71 = v => String(v || '').replace(/^@/, '').trim().toLowerCase();
  const escV71 = v => String(v ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[ch]));

  function getWheelNamesV71(payload = {}) {
    const fromPayload = Array.isArray(payload.names) ? payload.names : [];
    const fromState = Array.isArray(window.state?.participants) ? window.state.participants : [];
    const source = fromPayload.length ? fromPayload : fromState;
    const names = source.map(cleanV71).filter(Boolean);
    return names.length ? names : ['---'];
  }

  function segmentColorV71(i) {
    const colors = [
      '#b8872f', '#4f9b6b', '#9b4fd8', '#d94c72',
      '#5b7ce2', '#d8672f', '#6fcf97', '#e2c85b',
      '#7c4bd9', '#d9578a', '#54a8c7', '#c96b3c'
    ];
    return colors[i % colors.length];
  }

  function renderWheelV71(names = []) {
    const wheel = $v71('rouletteWheel');
    if (!wheel) return;

    const safe = names.length ? names : ['---'];
    const count = safe.length;
    const step = 360 / count;

    let gradient = '';
    for (let i = 0; i < count; i++) {
      const a1 = i * step;
      const a2 = (i + 1) * step;
      const fill = segmentColorV71(i);
      gradient += `${fill} ${a1}deg ${a2}deg${i === count - 1 ? '' : ', '}`;
    }

    wheel.style.animation = 'none';
    wheel.style.transition = 'none';
    wheel.style.background = `conic-gradient(${gradient})`;

    wheel.innerHTML = '<div class="wheel-center">R</div>' + safe.map((name, i) => {
      const angle = i * step + step / 2;
      const label = String(name).length > 13 ? String(name).slice(0, 12) + '…' : String(name);
      return `<div class="wheel-name" style="--a:${angle}deg"><span>${escV71(label.toUpperCase())}</span></div>`;
    }).join('');
  }

  function setWheelRotationV71(deg) {
    const wheel = $v71('rouletteWheel');
    if (!wheel) return;
    wheel.style.transform = `rotate(${deg}deg)`;
    wheelStateV71.rotation = deg;
  }

  function getNameUnderPointerV71(rotationDeg) {
    const names = wheelStateV71.names && wheelStateV71.names.length ? wheelStateV71.names : ['---'];
    const count = names.length;
    const step = 360 / count;

    // Pointer is at the top of wheel. Conic segment 0 starts at top in CSS.
    // Since wheel rotates clockwise, the segment under pointer is negative rotation.
    const normalized = ((-rotationDeg % 360) + 360) % 360;
    const index = Math.floor(normalized / step) % count;
    return names[index] || names[0] || '---';
  }

  function updateRollingNameFromWheelV71(rotationDeg) {
    const name = getNameUnderPointerV71(rotationDeg);
    const el = $v71('rollingName');
    if (!el) return;

    const next = '@' + name;
    if (el.textContent !== next) {
      el.textContent = next;
      el.classList.remove('name-pop');
      void el.offsetWidth;
      el.classList.add('name-pop');
    }
  }

  function cancelWheelAnimationV71() {
    if (wheelAnimV71) {
      cancelAnimationFrame(wheelAnimV71);
      wheelAnimV71 = null;
    }
    try {
      if (typeof cancelWheelAnimation === 'function') cancelWheelAnimation();
    } catch {}
  }

  function startSyncedWheelSpinV71(durationMs = 4800) {
    cancelWheelAnimationV71();

    const names = wheelStateV71.names && wheelStateV71.names.length ? wheelStateV71.names : ['---'];
    const count = names.length;
    const step = 360 / count;

    const start = performance.now();
    const startRot = 0;

    // Same process as uploaded file:
    // more turns for longer duration, smooth ease-out.
    const turns = Math.max(4, Math.min(18, Math.round(durationMs / 700)));
    const targetExtra = turns * 360 + Math.floor(Math.random() * count) * step + step / 2;
    const targetRot = startRot + targetExtra;

    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    function frame(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const rot = startRot + (targetRot - startRot) * eased;

      setWheelRotationV71(rot);
      updateRollingNameFromWheelV71(rot);

      if (t < 1) {
        wheelAnimV71 = requestAnimationFrame(frame);
      } else {
        wheelAnimV71 = null;
        setWheelRotationV71(targetRot);
        updateRollingNameFromWheelV71(targetRot);
      }
    }

    wheelAnimV71 = requestAnimationFrame(frame);
  }

  function showWheelV71(payload = {}) {
    const wrap = $v71('rouletteWheelWrap');
    if (!wrap) return;

    const names = getWheelNamesV71(payload);
    wheelStateV71.names = names;
    wheelStateV71.durationMs = Math.max(1000, Number(payload.durationMs || 4800));
    wheelStateV71.mode = payload.mode || 'normal';

    renderWheelV71(names);

    wrap.classList.remove('hidden', 'winner-spin');
    wrap.classList.add('rolling-spin');

    startSyncedWheelSpinV71(wheelStateV71.durationMs);
  }

  function startRollingV71(payload = {}) {
    if (typeof showVisual === 'function') showVisual('rollingBox');

    try { clearInterval(rollTimer); } catch {}

    const status = $v71('rollStatusText');
    if (status) {
      status.textContent = payload.mode === 'elimination' ? 'НА ВЫБЫВАНИЕ' : 'ОБЫЧНАЯ РУЛЕТКА';
    }

    showWheelV71(payload);
  }

  // Override only the wheel rotation process.
  window.startRolling = startRollingV71;
  window.__v71StartRolling = startRollingV71;
  window.__v71ShowWheel = showWheelV71;
  window.__v71StartSyncedWheelSpin = startSyncedWheelSpinV71;
})();




/* v80: connection-safe lightweight UI controls */
(function () {
  function q(id) { return document.getElementById(id); }

  function setRollingUIV80(isRolling) {
    document.body.classList.toggle('v80-rolling', Boolean(isRolling));
    if (isRolling) q('winnerChatBox')?.classList.add('hidden');
  }

  function ensureActionsV80() {
    const winnerBox = q('winnerBox') || document.querySelector('.winner-visual');
    if (!winnerBox || winnerBox.classList.contains('hidden')) return;

    const reroll =
      q('winnerRerollBtn') ||
      q('winnerRerollFixedBtn') ||
      winnerBox.querySelector('.winner-reroll');

    if (!reroll) return;

    let wrap = q('winnerActionsV80');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'winnerActionsV80';
      wrap.className = 'winner-actions-v80';
      document.body.appendChild(wrap);
    }

    if (reroll.parentNode !== wrap) wrap.appendChild(reroll);

    reroll.classList.add('winner-action-btn-v80');
    reroll.textContent = 'РЕРОЛЛ';

    let check = q('winnerCheckBtnV80');
    if (!check) {
      check = document.createElement('button');
      check.id = 'winnerCheckBtnV80';
      check.className = 'winner-action-btn-v80 winner-check-v80';
      check.type = 'button';
      check.textContent = 'ПРОВЕРКА';

      check.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        const chat = q('winnerChatBox');
        if (chat) chat.classList.remove('hidden');

        if (typeof toast === 'function') toast('Проверка победителя');
      }, true);

      wrap.appendChild(check);
    }
  }

  const oldStart = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStart && !window.__v80StartWrapped) {
    window.__v80StartWrapped = true;
    window.startRolling = function () {
      setRollingUIV80(true);
      return oldStart.apply(this, arguments);
    };
  }

  const oldWinner = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldWinner && !window.__v80WinnerWrapped) {
    window.__v80WinnerWrapped = true;
    window.showWinner = function () {
      setRollingUIV80(false);
      const result = oldWinner.apply(this, arguments);
      requestAnimationFrame(ensureActionsV80);
      setTimeout(ensureActionsV80, 80);
      return result;
    };
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#startRouletteBtn')) {
      setRollingUIV80(true);
    }

    if (e.target.closest && (e.target.closest('#quickRollBtn') || e.target.closest('#winnerCloseBtn'))) {
      setRollingUIV80(false);
    }
  }, true);

  document.addEventListener('DOMContentLoaded', ensureActionsV80);
  window.__v80EnsureActions = ensureActionsV80;
})();



/* v81: fixed centered action buttons, no moving original reroll */
(function () {
  function q(id) { return document.getElementById(id); }

  function findOriginalRerollV81() {
    return (
      q('winnerRerollBtn') ||
      q('winnerRerollFixedBtn') ||
      document.querySelector('.winner-reroll')
    );
  }

  function ensureActionsV81() {
    const winner = q('winnerBox') || document.querySelector('.winner-visual');
    if (!winner || winner.classList.contains('hidden')) {
      const existing = q('winnerActionsV81');
      if (existing) existing.classList.add('hidden');
      return;
    }

    let wrap = q('winnerActionsV81');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'winnerActionsV81';
      wrap.className = 'winner-actions-v81';

      const rerollProxy = document.createElement('button');
      rerollProxy.id = 'winnerRerollProxyV81';
      rerollProxy.className = 'winner-action-btn-v81 winner-reroll-proxy-v81';
      rerollProxy.type = 'button';
      rerollProxy.textContent = 'РЕРОЛЛ';

      rerollProxy.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        const original = findOriginalRerollV81();
        if (original && original !== rerollProxy) {
          original.click();
          return;
        }

        if (typeof toast === 'function') toast('Реролл не найден');
      }, true);

      const check = document.createElement('button');
      check.id = 'winnerCheckBtnV81';
      check.className = 'winner-action-btn-v81 winner-check-v81';
      check.type = 'button';
      check.textContent = 'ПРОВЕРКА';

      check.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        const chat = q('winnerChatBox');
        if (chat) chat.classList.remove('hidden');

        if (typeof toast === 'function') toast('Проверка победителя');
      }, true);

      wrap.appendChild(rerollProxy);
      wrap.appendChild(check);
      document.body.appendChild(wrap);
    }

    wrap.classList.remove('hidden');

    // Keep old reroll button alive for its logic, but don't show it visually.
    const original = findOriginalRerollV81();
    if (original && original.id !== 'winnerRerollProxyV81') {
      original.classList.add('v81-original-reroll-hidden');
    }
  }

  const oldShowWinner = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinner && !window.__v81ShowWinnerWrapped) {
    window.__v81ShowWinnerWrapped = true;
    window.showWinner = function () {
      const result = oldShowWinner.apply(this, arguments);
      requestAnimationFrame(ensureActionsV81);
      setTimeout(ensureActionsV81, 0);
      setTimeout(ensureActionsV81, 120);
      return result;
    };
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest && (e.target.closest('#winnerCloseBtn') || e.target.closest('#startRouletteBtn') || e.target.closest('#quickRollBtn'))) {
      q('winnerActionsV81')?.classList.add('hidden');
    }
  }, true);

  document.addEventListener('DOMContentLoaded', ensureActionsV81);
  window.__v81EnsureActions = ensureActionsV81;
})();



/* v82: action buttons visible only on winner screen */
(function () {
  function q(id) { return document.getElementById(id); }

  function winnerIsReallyVisibleV82() {
    const winner = q('winnerBox') || document.querySelector('.winner-visual');
    if (!winner) return false;
    if (winner.classList.contains('hidden')) return false;

    const style = window.getComputedStyle(winner);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;

    const rect = winner.getBoundingClientRect();
    return rect.width > 100 && rect.height > 80;
  }

  function hideActionsV82() {
    document.body.classList.remove('v82-winner-active');
    ['winnerActionsV78', 'winnerActionsV79', 'winnerActionsV80', 'winnerActionsV81'].forEach(id => {
      const el = q(id);
      if (el) {
        el.classList.add('hidden');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      }
    });
  }

  function showActionsV82() {
    if (!winnerIsReallyVisibleV82()) {
      hideActionsV82();
      return;
    }

    document.body.classList.add('v82-winner-active');

    const actions = q('winnerActionsV81') || q('winnerActionsV80') || q('winnerActionsV78');
    if (actions) {
      actions.classList.remove('hidden');
      actions.style.removeProperty('display');
      actions.style.removeProperty('visibility');
      actions.style.removeProperty('opacity');
      actions.style.removeProperty('pointer-events');
    }
  }

  const oldShowWinner = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinner && !window.__v82ShowWinnerWrapped) {
    window.__v82ShowWinnerWrapped = true;

    window.showWinner = function () {
      const result = oldShowWinner.apply(this, arguments);
      requestAnimationFrame(showActionsV82);
      setTimeout(showActionsV82, 80);
      setTimeout(showActionsV82, 250);
      return result;
    };
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest && (
      e.target.closest('#winnerCloseBtn') ||
      e.target.closest('#startRouletteBtn') ||
      e.target.closest('#rollBtn') ||
      e.target.closest('#quickRollBtn') ||
      e.target.closest('#resetParticipantsBtn')
    )) {
      hideActionsV82();
    }
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    hideActionsV82();
    setTimeout(() => {
      if (winnerIsReallyVisibleV82()) showActionsV82();
      else hideActionsV82();
    }, 300);
  });

  window.__v82HideActions = hideActionsV82;
  window.__v82ShowActions = showActionsV82;
})();



/* v83: force-hide winner action buttons on reroll, roulette, quick roll, close */
(function () {
  function q(id) { return document.getElementById(id); }

  function hideActionsV83() {
    document.body.classList.remove('v82-winner-active');
    document.body.classList.remove('v83-winner-actions-active');

    [
      'winnerActionsV78',
      'winnerActionsV79',
      'winnerActionsV80',
      'winnerActionsV81'
    ].forEach(id => {
      const el = q(id);
      if (!el) return;
      el.classList.add('hidden');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function winnerVisibleV83() {
    const winner = q('winnerBox') || document.querySelector('.winner-visual');
    if (!winner || winner.classList.contains('hidden')) return false;

    const style = getComputedStyle(winner);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;

    const rect = winner.getBoundingClientRect();
    return rect.width > 100 && rect.height > 80;
  }

  function showActionsV83() {
    if (!winnerVisibleV83()) {
      hideActionsV83();
      return;
    }

    const actions = q('winnerActionsV81') || q('winnerActionsV80') || q('winnerActionsV78');
    if (!actions) return;

    document.body.classList.add('v82-winner-active');
    document.body.classList.add('v83-winner-actions-active');

    actions.classList.remove('hidden');
    actions.style.removeProperty('display');
    actions.style.removeProperty('visibility');
    actions.style.removeProperty('opacity');
    actions.style.removeProperty('pointer-events');
  }

  // Hide buttons BEFORE old handlers do reroll/roll/close.
  document.addEventListener('click', function (e) {
    const shouldHide =
      e.target.closest?.('#winnerRerollBtn') ||
      e.target.closest?.('#winnerRerollFixedBtn') ||
      e.target.closest?.('#winnerRerollProxyV81') ||
      e.target.closest?.('#startRouletteBtn') ||
      e.target.closest?.('#rollBtn') ||
      e.target.closest?.('#quickRollBtn') ||
      e.target.closest?.('#winnerCloseBtn') ||
      e.target.closest?.('#resetParticipantsBtn');

    if (shouldHide) {
      hideActionsV83();
      setTimeout(hideActionsV83, 0);
      setTimeout(hideActionsV83, 80);
      setTimeout(hideActionsV83, 250);
    }
  }, true);

  // Wrap startRolling: when any roulette starts, buttons disappear.
  const oldStart = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStart && !window.__v83StartWrapped) {
    window.__v83StartWrapped = true;
    window.startRolling = function () {
      hideActionsV83();
      return oldStart.apply(this, arguments);
    };
  }

  // Wrap showWinner: after final winner screen appears, buttons can return.
  const oldWinner = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldWinner && !window.__v83WinnerWrapped) {
    window.__v83WinnerWrapped = true;
    window.showWinner = function () {
      const result = oldWinner.apply(this, arguments);
      requestAnimationFrame(showActionsV83);
      setTimeout(showActionsV83, 80);
      setTimeout(showActionsV83, 250);
      return result;
    };
  }

  // If old code leaves buttons visible while winner is not visible, hide them.
  korIdleIntervalV486(() => {
    const anyActions =
      q('winnerActionsV81') ||
      q('winnerActionsV80') ||
      q('winnerActionsV78');

    if (!anyActions) return;

    if (!winnerVisibleV83()) {
      hideActionsV83();
    }
  }, 1600, { timeout: 600 });

  document.addEventListener('DOMContentLoaded', hideActionsV83);

  window.__v83HideActions = hideActionsV83;
  window.__v83ShowActions = showActionsV83;
})();



/* v94: fish quote show only with winner */
(function () {
  function q(id) { return document.getElementById(id); }

  function winnerVisibleV94() {
    const winner = q('winnerBox') || document.querySelector('.winner-visual');
    if (!winner || winner.classList.contains('hidden')) return false;

    const st = getComputedStyle(winner);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity || 1) === 0) return false;

    const rect = winner.getBoundingClientRect();
    return rect.width > 100 && rect.height > 80;
  }

  function getChatV94() {
    return q('winnerChatBox') || document.querySelector('.winner-chat-box');
  }

  function hideQuoteV94() {
    document.body.classList.remove('v94-winner-quote-active');
    const quote = q('winnerFishQuoteV94') || q('winnerFishQuoteV87');
    if (quote) quote.classList.add('hidden');
  }

  function ensureQuoteV94() {
    // v517: fish-quote feature has been removed; never create or revive legacy overlays.
    return;
    if (!winnerVisibleV94()) {
      hideQuoteV94();
      return;
    }

    const chat = getChatV94();
    if (!chat || chat.classList.contains('hidden')) {
      hideQuoteV94();
      return;
    }

    let quote = q('winnerFishQuoteV94');
    if (!quote) {
      quote = document.createElement('div');
      quote.id = 'winnerFishQuoteV94';
      quote.className = 'winner-fish-quote-v94 hidden';
      quote.innerHTML = '';
      document.body.appendChild(quote);
    }

    const rect = chat.getBoundingClientRect();
    quote.style.setProperty('left', `${Math.round(rect.left + rect.width / 2)}px`);
    quote.style.setProperty('top', `${Math.round(rect.bottom + 18)}px`);
    quote.style.setProperty('width', `${Math.round(rect.width)}px`);

    document.body.classList.add('v94-winner-quote-active');
    quote.classList.remove('hidden');
  }

  const oldShowWinner = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinner && !window.__v94QuoteWrapped) {
    window.__v94QuoteWrapped = true;

    window.showWinner = function () {
      const result = oldShowWinner.apply(this, arguments);
      requestAnimationFrame(ensureQuoteV94);
      setTimeout(ensureQuoteV94, 80);
      setTimeout(ensureQuoteV94, 250);
      setTimeout(ensureQuoteV94, 700);
      return result;
    };
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest && (
      e.target.closest('#winnerCloseBtn') ||
      e.target.closest('#startRouletteBtn') ||
      e.target.closest('#rollBtn') ||
      e.target.closest('#quickRollBtn') ||
      e.target.closest('#winnerRerollBtn') ||
      e.target.closest('#winnerRerollFixedBtn') ||
      e.target.closest('#winnerRerollProxyV81') ||
      e.target.closest('#winnerRerollProxyV91') ||
      e.target.closest('#resetParticipantsBtn')
    )) {
      hideQuoteV94();
    }
  }, true);

  window.addEventListener('resize', () => setTimeout(ensureQuoteV94, 80));
  document.addEventListener('DOMContentLoaded', hideQuoteV94);

  window.__v94EnsureFishQuote = ensureQuoteV94;
  window.__v94HideFishQuote = hideQuoteV94;
})();



/* v95: hard quote cleanup + exact button line + check link */
(function () {
  const CHECK_URL_V95 = 'https://followage.showmasterokda.com/';

  function q(id) { return document.getElementById(id); }

  function winnerVisibleV95() {
    const winner = q('winnerBox') || document.querySelector('.winner-visual');
    if (!winner || winner.classList.contains('hidden')) return false;

    const st = getComputedStyle(winner);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity || 1) === 0) return false;

    const r = winner.getBoundingClientRect();
    return r.width > 100 && r.height > 80;
  }

  function chatVisibleV95() {
    const chat = q('winnerChatBox') || document.querySelector('.winner-chat-box');
    if (!chat || chat.classList.contains('hidden')) return false;

    const st = getComputedStyle(chat);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity || 1) === 0) return false;

    const r = chat.getBoundingClientRect();
    return r.width > 100 && r.height > 80;
  }

  function hideQuoteV95() {
    document.body.classList.remove('v95-winner-active');

    ['winnerFishQuoteV94', 'winnerFishQuoteV87'].forEach(id => {
      const quote = q(id);
      if (!quote) return;

      quote.classList.add('hidden');
      quote.style.setProperty('display', 'none', 'important');
      quote.style.setProperty('visibility', 'hidden', 'important');
      quote.style.setProperty('opacity', '0', 'important');
      quote.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function showQuoteV95() {
    // v517: fish-quote feature has been removed; never create or revive legacy overlays.
    return;
    if (!winnerVisibleV95() || !chatVisibleV95()) {
      hideQuoteV95();
      return;
    }

    const chat = q('winnerChatBox') || document.querySelector('.winner-chat-box');
    let quote = q('winnerFishQuoteV95');

    if (!quote) {
      quote = document.createElement('div');
      quote.id = 'winnerFishQuoteV95';
      quote.className = 'winner-fish-quote-v95 hidden';
      quote.innerHTML = '';
      document.body.appendChild(quote);
    }

    const r = chat.getBoundingClientRect();

    quote.style.setProperty('left', `${Math.round(r.left + r.width / 2)}px`);
    quote.style.setProperty('top', `${Math.round(r.bottom + 18)}px`);
    quote.style.setProperty('width', `${Math.round(r.width)}px`);

    document.body.classList.add('v95-winner-active');

    quote.classList.remove('hidden');
    quote.style.removeProperty('display');
    quote.style.removeProperty('visibility');
    quote.style.removeProperty('opacity');
    quote.style.removeProperty('pointer-events');

    // Hide old quotes completely so only v95 quote is used.
    ['winnerFishQuoteV94', 'winnerFishQuoteV87'].forEach(id => {
      const old = q(id);
      if (old && old !== quote) {
        old.classList.add('hidden');
        old.style.setProperty('display', 'none', 'important');
        old.style.setProperty('visibility', 'hidden', 'important');
        old.style.setProperty('opacity', '0', 'important');
        old.style.setProperty('pointer-events', 'none', 'important');
      }
    });
  }

  function getActionsV95() {
    return (
      q('winnerActionsV92') ||
      q('winnerActionsV91') ||
      q('winnerActionsV81') ||
      q('winnerActionsV80') ||
      q('winnerActionsV79') ||
      q('winnerActionsV78')
    );
  }

  function placeButtonsV95() {
    const chat = q('winnerChatBox') || document.querySelector('.winner-chat-box');
    const actions = getActionsV95();

    if (!chat || !actions || !winnerVisibleV95()) return;

    // Put inside chat; then CSS can position relative to chat header.
    if (actions.parentNode !== chat) {
      chat.appendChild(actions);
    }

    actions.classList.add('winner-actions-v95-line');
    actions.classList.remove('hidden');

    ['left', 'top', 'right', 'bottom', 'transform', 'margin'].forEach(p => actions.style.removeProperty(p));
  }

  function hideWinnerStuffV95() {
    hideQuoteV95();

    const actions = getActionsV95();
    if (actions) {
      actions.classList.remove('winner-actions-v95-line');
    }
  }

  // Patch every CHECK button click: always open the requested site.
  document.addEventListener('click', function (e) {
    const check =
      e.target.closest?.('#winnerCheckBtnV92') ||
      e.target.closest?.('#winnerCheckBtnV91') ||
      e.target.closest?.('#winnerCheckBtnV81') ||
      e.target.closest?.('#winnerCheckBtnV80') ||
      e.target.closest?.('#winnerCheckBtnV79') ||
      e.target.closest?.('#winnerCheckBtnV78') ||
      e.target.closest?.('.winner-check-v92') ||
      e.target.closest?.('.winner-check-v91') ||
      e.target.closest?.('.winner-check-v81') ||
      e.target.closest?.('.winner-check-v80') ||
      e.target.closest?.('.winner-check-v79') ||
      e.target.closest?.('.winner-check-v78');

    if (!check) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    window.open(CHECK_URL_V95, '_blank', 'noopener,noreferrer');

    if (typeof toast === 'function') toast('Открываю проверку');
  }, true);

  const oldShowWinner = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinner && !window.__v95ShowWinnerWrapped) {
    window.__v95ShowWinnerWrapped = true;

    window.showWinner = function () {
      const result = oldShowWinner.apply(this, arguments);

      requestAnimationFrame(() => {
        placeButtonsV95();
        showQuoteV95();
      });

      setTimeout(() => {
        placeButtonsV95();
        showQuoteV95();
      }, 80);

      setTimeout(() => {
        placeButtonsV95();
        showQuoteV95();
      }, 250);

      return result;
    };
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest && (
      e.target.closest('#winnerCloseBtn') ||
      e.target.closest('.winner-close') ||
      e.target.closest('#startRouletteBtn') ||
      e.target.closest('#rollBtn') ||
      e.target.closest('#quickRollBtn') ||
      e.target.closest('#winnerRerollBtn') ||
      e.target.closest('#winnerRerollFixedBtn') ||
      e.target.closest('#winnerRerollProxyV81') ||
      e.target.closest('#winnerRerollProxyV91') ||
      e.target.closest('#winnerRerollProxyV92') ||
      e.target.closest('#resetParticipantsBtn')
    )) {
      hideWinnerStuffV95();
      setTimeout(hideWinnerStuffV95, 0);
      setTimeout(hideWinnerStuffV95, 120);
    }
  }, true);

  document.addEventListener('DOMContentLoaded', hideWinnerStuffV95);

  window.addEventListener('resize', () => {
    if (winnerVisibleV95()) {
      setTimeout(() => {
        placeButtonsV95();
        showQuoteV95();
      }, 80);
    } else {
      hideWinnerStuffV95();
    }
  });

  window.__v95HideQuote = hideQuoteV95;
  window.__v95ShowQuote = showQuoteV95;
  window.__v95PlaceButtons = placeButtonsV95;
})();



/* v96: quote disappears when winner closes + nicer wheel pointer support */
(function () {
  function q(id) { return document.getElementById(id); }

  function winnerVisibleV96() {
    const winner = q('winnerBox') || document.querySelector('.winner-visual');
    if (!winner || winner.classList.contains('hidden')) return false;

    const st = getComputedStyle(winner);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity || 1) === 0) return false;

    const rect = winner.getBoundingClientRect();
    return rect.width > 100 && rect.height > 80;
  }

  function chatVisibleV96() {
    const chat = q('winnerChatBox') || document.querySelector('.winner-chat-box');
    if (!chat || chat.classList.contains('hidden')) return false;

    const st = getComputedStyle(chat);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity || 1) === 0) return false;

    const rect = chat.getBoundingClientRect();
    return rect.width > 100 && rect.height > 80;
  }

  function hideQuoteV96() {
    document.body.classList.remove('v95-winner-active', 'v94-winner-quote-active', 'v96-winner-active');

    ['winnerFishQuoteV95', 'winnerFishQuoteV94', 'winnerFishQuoteV87'].forEach(id => {
      const quote = q(id);
      if (!quote) return;
      quote.classList.add('hidden');
      quote.style.setProperty('display', 'none', 'important');
      quote.style.setProperty('visibility', 'hidden', 'important');
      quote.style.setProperty('opacity', '0', 'important');
      quote.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function showQuoteV96() {
    // v517: fish-quote feature has been removed; never create or revive legacy overlays.
    return;
    if (!winnerVisibleV96() || !chatVisibleV96()) {
      hideQuoteV96();
      return;
    }

    const chat = q('winnerChatBox') || document.querySelector('.winner-chat-box');
    let quote = q('winnerFishQuoteV95') || q('winnerFishQuoteV96');

    if (!quote) {
      quote = document.createElement('div');
      quote.id = 'winnerFishQuoteV96';
      quote.className = 'winner-fish-quote-v96 hidden';
      quote.innerHTML = '';
      document.body.appendChild(quote);
    }

    const r = chat.getBoundingClientRect();
    quote.style.setProperty('left', `${Math.round(r.left + r.width / 2)}px`);
    quote.style.setProperty('top', `${Math.round(r.bottom + 18)}px`);
    quote.style.setProperty('width', `${Math.round(r.width)}px`);

    document.body.classList.add('v96-winner-active', 'v95-winner-active');

    quote.classList.remove('hidden');
    quote.style.removeProperty('display');
    quote.style.removeProperty('visibility');
    quote.style.removeProperty('opacity');
    quote.style.removeProperty('pointer-events');
  }

  // Add a class to the wheel wrapper so CSS can replace the old ugly pointer.
  function markWheelV96() {
    const wrap =
      q('rouletteWheelWrap') ||
      document.querySelector('.roulette-wheel-wrap') ||
      document.querySelector('[class*="wheel" i]');

    if (wrap) wrap.classList.add('v96-wheel-pointer');
  }

  const oldShowWinner = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinner && !window.__v96ShowWinnerWrapped) {
    window.__v96ShowWinnerWrapped = true;

    window.showWinner = function () {
      const result = oldShowWinner.apply(this, arguments);
      requestAnimationFrame(showQuoteV96);
      setTimeout(showQuoteV96, 80);
      setTimeout(showQuoteV96, 250);
      return result;
    };
  }

  const oldStartRolling = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStartRolling && !window.__v96StartRollingWrapped) {
    window.__v96StartRollingWrapped = true;

    window.startRolling = function () {
      hideQuoteV96();
      const result = oldStartRolling.apply(this, arguments);
      requestAnimationFrame(markWheelV96);
      setTimeout(markWheelV96, 80);
      return result;
    };
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest && (
      e.target.closest('#winnerCloseBtn') ||
      e.target.closest('.winner-close') ||
      e.target.closest('[aria-label="close" i]') ||
      e.target.closest('#startRouletteBtn') ||
      e.target.closest('#rollBtn') ||
      e.target.closest('#quickRollBtn') ||
      e.target.closest('#winnerRerollBtn') ||
      e.target.closest('#winnerRerollFixedBtn') ||
      e.target.closest('#winnerRerollProxyV81') ||
      e.target.closest('#winnerRerollProxyV91') ||
      e.target.closest('#winnerRerollProxyV92') ||
      e.target.closest('#resetParticipantsBtn')
    )) {
      hideQuoteV96();
      setTimeout(hideQuoteV96, 0);
      setTimeout(hideQuoteV96, 80);
      setTimeout(hideQuoteV96, 250);
    }
  }, true);

  // Guard, but light: if winner is not visible, quote must not exist on screen.
  korIdleIntervalV486(() => {
    const quote =
      q('winnerFishQuoteV95') ||
      q('winnerFishQuoteV96') ||
      q('winnerFishQuoteV94') ||
      q('winnerFishQuoteV87');

    if (!quote) return;

    if (!winnerVisibleV96() || !chatVisibleV96()) {
      hideQuoteV96();
    }
  }, 1800, { timeout: 650 });

  document.addEventListener('DOMContentLoaded', () => {
    hideQuoteV96();
    markWheelV96();
  });

  window.__v96HideQuote = hideQuoteV96;
  window.__v96ShowQuote = showQuoteV96;
  window.__v96MarkWheel = markWheelV96;
})();



/* v97: instant quote hide + blacklist HTTP fallback */
(function () {
  function q(id) { return document.getElementById(id); }

  function hardHideAllQuotesV97() {
    document.body.classList.remove(
      'v95-winner-active',
      'v94-winner-quote-active',
      'v96-winner-active',
      'v97-winner-active'
    );

    ['winnerFishQuoteV95', 'winnerFishQuoteV96', 'winnerFishQuoteV94', 'winnerFishQuoteV87'].forEach(id => {
      const el = q(id);
      if (!el) return;
      el.classList.add('hidden');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.remove();
    });
  }

  async function httpCmdV97(type, params = {}) {
    const key = new URLSearchParams(location.search).get('key') || '12345';
    const url = new URL(`/api/cmd/${type}`, location.origin);
    url.searchParams.set('key', key);

    Object.entries(params).forEach(([k, v]) => {
      if (typeof v !== 'undefined' && v !== null) url.searchParams.set(k, String(v));
    });

    const res = await fetch(url.toString(), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false) {
      throw new Error(data.reason || `HTTP ${res.status}`);
    }

    if (data.state && typeof render === 'function') {
      render(data.state);
    }

    return data;
  }

  // Blacklist save via HTTP, not WebSocket.
  document.addEventListener('click', async function (e) {
    const btn = e.target.closest?.('#blackAddBtn');
    if (!btn) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const input = q('blackNick');
    const username = String(input?.value || '').trim();

    if (!username) return;

    btn.disabled = true;

    try {
      await httpCmdV97('blacklist_add', { username });
      if (input) input.value = '';
      if (typeof toast === 'function') toast(`Добавлен в чёрный список: ${username.replace(/^@/, '').toLowerCase()}`);
    } catch (err) {
      if (typeof toast === 'function') toast(`Ошибка ЧС: ${err.message || 'сервер'}`);
    } finally {
      btn.disabled = false;
    }
  }, true);

  // Blacklist remove via HTTP too.
  document.addEventListener('click', async function (e) {
    const item = e.target.closest?.('[data-unblack]');
    if (!item) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const username = item.dataset.unblack;
    if (!username) return;

    try {
      await httpCmdV97('blacklist_remove', { username });
      if (typeof toast === 'function') toast(`Удалён из ЧС: ${username}`);
    } catch (err) {
      if (typeof toast === 'function') toast(`Ошибка ЧС: ${err.message || 'сервер'}`);
    }
  }, true);

  // Instant hide on any closing/rolling action; no delays.
  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && (
      e.target.closest('#winnerCloseBtn') ||
      e.target.closest('.winner-close') ||
      e.target.closest('[aria-label="close" i]') ||
      e.target.closest('#startRouletteBtn') ||
      e.target.closest('#rollBtn') ||
      e.target.closest('#quickRollBtn') ||
      e.target.closest('#winnerRerollBtn') ||
      e.target.closest('#winnerRerollFixedBtn') ||
      e.target.closest('#winnerRerollProxyV81') ||
      e.target.closest('#winnerRerollProxyV91') ||
      e.target.closest('#winnerRerollProxyV92') ||
      e.target.closest('#resetParticipantsBtn')
    )) {
      hardHideAllQuotesV97();
    }
  }, true);

  document.addEventListener('click', function (e) {
    if (e.target.closest && (
      e.target.closest('#winnerCloseBtn') ||
      e.target.closest('.winner-close') ||
      e.target.closest('[aria-label="close" i]') ||
      e.target.closest('#startRouletteBtn') ||
      e.target.closest('#rollBtn') ||
      e.target.closest('#quickRollBtn') ||
      e.target.closest('#winnerRerollBtn') ||
      e.target.closest('#winnerRerollFixedBtn') ||
      e.target.closest('#winnerRerollProxyV81') ||
      e.target.closest('#winnerRerollProxyV91') ||
      e.target.closest('#winnerRerollProxyV92') ||
      e.target.closest('#resetParticipantsBtn')
    )) {
      hardHideAllQuotesV97();
    }
  }, true);

  document.addEventListener('DOMContentLoaded', hardHideAllQuotesV97);

  window.__v97HardHideQuotes = hardHideAllQuotesV97;
  window.__v97HttpCmd = httpCmdV97;
})();



/* v98: CHECK opens followage with winner nick */
(function () {
  const BASE_URL_V98 = 'https://followage.showmasterokda.com/';

  function q(id) { return document.getElementById(id); }
  function cleanNickV98(v) { return String(v || '').replace(/^@/, '').trim(); }

  function getWinnerNickV98() {
    const direct =
      q('winnerName')?.textContent ||
      document.querySelector('.winner-name')?.textContent ||
      document.querySelector('#winnerBox [class*="name" i]')?.textContent ||
      window.state?.lastWinner?.username ||
      window.state?.lastWinner?.winner ||
      '';
    const cleaned = cleanNickV98(direct);
    if (cleaned) return cleaned;

    const winners = Array.isArray(window.state?.winners) ? window.state.winners : [];
    return cleanNickV98(winners[0]?.username || winners[0]?.winner || '');
  }

  function openCheckV98() {
    const nick = getWinnerNickV98();
    const url = new URL(BASE_URL_V98);

    if (nick) {
      url.searchParams.set('username', nick);
      url.searchParams.set('user', nick);
      url.searchParams.set('q', nick);
      url.searchParams.set('search', nick);
      try { navigator.clipboard?.writeText(nick).catch(() => {}); } catch {}
    }

    window.open(url.toString(), '_blank', 'noopener,noreferrer');
    if (typeof toast === 'function') toast(nick ? `Открываю проверку: ${nick}` : 'Открываю проверку');
  }

  document.addEventListener('click', function (e) {
    const check =
      e.target.closest?.('#winnerCheckBtnV92') ||
      e.target.closest?.('#winnerCheckBtnV91') ||
      e.target.closest?.('#winnerCheckBtnV81') ||
      e.target.closest?.('#winnerCheckBtnV80') ||
      e.target.closest?.('#winnerCheckBtnV79') ||
      e.target.closest?.('#winnerCheckBtnV78') ||
      e.target.closest?.('.winner-check-v92') ||
      e.target.closest?.('.winner-check-v91') ||
      e.target.closest?.('.winner-check-v81') ||
      e.target.closest?.('.winner-check-v80') ||
      e.target.closest?.('.winner-check-v79') ||
      e.target.closest?.('.winner-check-v78');

    if (!check) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openCheckV98();
  }, true);

  window.__v98OpenCheck = openCheckV98;
})();

/* v98: force winner list without money */
(function () {
  function escV98(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function fixWinnersListV98() {
    if (typeof window.__v484RenderWinners === 'function') { return; }
    const list = document.getElementById('winnersList');
    if (!list) return;

    const winners = window.state?.winners || [];
    list.innerHTML = winners.length
      ? winners.slice(0, 10).map((w, i) =>
          `<div class="winner-row winner-row-v98"><span>${i + 1}. ${escV98(w.username || w.winner || '')}</span></div>`
        ).join('')
      : '<div class="winner-row winner-row-v98"><span>Пока нет победителей</span></div>';
  }

  const oldRender = window.render || (typeof render === 'function' ? render : null);
  if (oldRender && !window.__v98WinnerListWrapped) {
    window.__v98WinnerListWrapped = true;
    window.render = function () {
      const result = oldRender.apply(this, arguments);
      fixWinnersListV98();
      return result;
    };
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(fixWinnersListV98, 200));
  window.__v98FixWinnersList = fixWinnersListV98;
})();



/* v99: HARD visible fixes - winners list, arrow, check nick */
(function () {
  const FOLLOWAGE_URL_V99 = 'https://followage.showmasterokda.com/';

  function q(id) { return document.getElementById(id); }

  function escV99(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function cleanNickV99(v) {
    return String(v || '').replace(/^@/, '').trim();
  }

  function getWinnerNickV99() {
    const fromDom =
      q('winnerName')?.textContent ||
      document.querySelector('.winner-name')?.textContent ||
      document.querySelector('#winnerBox [class*="name" i]')?.textContent ||
      '';

    const cleanedDom = cleanNickV99(fromDom);
    if (cleanedDom) return cleanedDom;

    const last =
      window.state?.lastWinner?.username ||
      window.state?.lastWinner?.winner ||
      '';

    const cleanedLast = cleanNickV99(last);
    if (cleanedLast) return cleanedLast;

    const winners = Array.isArray(window.state?.winners) ? window.state.winners : [];
    return cleanNickV99(winners[0]?.username || winners[0]?.winner || '');
  }

  function forceWinnersListV99() {
    if (typeof window.__v484RenderWinners === 'function') { return; }
    const list = q('winnersList');
    if (!list) return;

    const winners = Array.isArray(window.state?.winners) ? window.state.winners : [];

    if (!winners.length) {
      list.innerHTML = '<div class="winner-row winner-row-v99"><span>Пока нет победителей</span></div>';
      return;
    }

    list.innerHTML = winners.slice(0, 10).map((w, i) => {
      const name = escV99(w.username || w.winner || w.nick || '');
      return `<div class="winner-row winner-row-v99"><span>${i + 1}. ${name}</span></div>`;
    }).join('');
  }

  function ensureArrowV99() {
    const wrap =
      q('rouletteWheelWrap') ||
      document.querySelector('.roulette-wheel-wrap');

    if (!wrap) return;

    wrap.classList.add('v99-arrow-wrap');

    // Remove visual old pointer if it exists, but keep DOM harmless.
    const old = wrap.querySelector('.wheel-pointer');
    if (old) old.classList.add('v99-old-pointer-hidden');

    let arrow = q('wheelPointerV99');
    if (!arrow) {
      arrow = document.createElement('div');
      arrow.id = 'wheelPointerV99';
      arrow.className = 'wheel-pointer-v99';
      arrow.innerHTML = '<div class="wheel-pointer-v99-inner"></div><div class="wheel-pointer-v99-tip"></div>';
      wrap.appendChild(arrow);
    } else if (arrow.parentNode !== wrap) {
      wrap.appendChild(arrow);
    }

    arrow.classList.remove('hidden');
  }

  function openCheckWithWinnerV99() {
    const nick = getWinnerNickV99();
    const url = new URL(FOLLOWAGE_URL_V99);

    if (nick) {
      url.searchParams.set('username', nick);
      url.searchParams.set('user', nick);
      url.searchParams.set('q', nick);
      url.searchParams.set('search', nick);
      url.hash = `user=${encodeURIComponent(nick)}`;

      try {
        navigator.clipboard?.writeText(nick).catch(() => {});
      } catch {}
    }

    window.open(url.toString(), '_blank', 'noopener,noreferrer');

    if (typeof toast === 'function') {
      toast(nick ? `Проверка: ${nick} скопирован` : 'Открываю проверку');
    }
  }

  // Wrap render: after any state update, overwrite winners list with clean version.
  const oldRender = window.render || (typeof render === 'function' ? render : null);
  if (oldRender && !window.__v99RenderWrapped) {
    window.__v99RenderWrapped = true;
    window.render = function () {
      const result = oldRender.apply(this, arguments);
      forceWinnersListV99();
      ensureArrowV99();
      return result;
    };
  }

  // After roulette starts, force arrow visible.
  const oldStartRolling = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStartRolling && !window.__v99StartWrapped) {
    window.__v99StartWrapped = true;
    window.startRolling = function () {
      const result = oldStartRolling.apply(this, arguments);
      requestAnimationFrame(ensureArrowV99);
      setTimeout(ensureArrowV99, 50);
      setTimeout(ensureArrowV99, 200);
      return result;
    };
  }

  document.addEventListener('click', function (e) {
    const check =
      e.target.closest?.('#winnerCheckBtnV92') ||
      e.target.closest?.('#winnerCheckBtnV91') ||
      e.target.closest?.('#winnerCheckBtnV81') ||
      e.target.closest?.('#winnerCheckBtnV80') ||
      e.target.closest?.('#winnerCheckBtnV79') ||
      e.target.closest?.('#winnerCheckBtnV78') ||
      e.target.closest?.('.winner-check-v92') ||
      e.target.closest?.('.winner-check-v91') ||
      e.target.closest?.('.winner-check-v81') ||
      e.target.closest?.('.winner-check-v80') ||
      e.target.closest?.('.winner-check-v79') ||
      e.target.closest?.('.winner-check-v78');

    if (!check) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    openCheckWithWinnerV99();
  }, true);

  document.addEventListener('DOMContentLoaded', function () {
    forceWinnersListV99();
    ensureArrowV99();
    setTimeout(forceWinnersListV99, 250);
    setTimeout(ensureArrowV99, 250);
  });

  // v486: compatibility safety runs only during browser idle time.
  korIdleIntervalV486(function () {
    forceWinnersListV99();
    ensureArrowV99();
  }, 3500, { timeout: 800 });

  window.__v99ForceWinnersList = forceWinnersListV99;
  window.__v99EnsureArrow = ensureArrowV99;
  window.__v99OpenCheck = openCheckWithWinnerV99;
})();



/* v100: arrow positioned by real wheel + DOM winner list cleanup + check nick */
(function () {
  const CHECK_BASE_V100 = 'https://followage.showmasterokda.com/';

  function q(id) { return document.getElementById(id); }

  function cleanNickV100(v) {
    return String(v || '').replace(/^@/, '').trim();
  }

  function getWinnerNickV100() {
    const dom =
      q('winnerName')?.textContent ||
      document.querySelector('.winner-name')?.textContent ||
      document.querySelector('#winnerBox [class*="name" i]')?.textContent ||
      '';

    if (cleanNickV100(dom)) return cleanNickV100(dom);

    const winners = Array.isArray(window.state?.winners) ? window.state.winners : [];
    return cleanNickV100(
      window.state?.lastWinner?.username ||
      window.state?.lastWinner?.winner ||
      winners[0]?.username ||
      winners[0]?.winner ||
      ''
    );
  }

  function cleanupWinnersListV100() {
    if (typeof window.__v484RenderWinners === 'function') { return; }
    const list = q('winnersList');
    if (!list) return;

    list.querySelectorAll('.winner-row').forEach((row, index) => {
      const first = row.querySelector('span');
      if (!first) return;

      const text = first.textContent || '';
      row.innerHTML = `<span>${text}</span>`;
      row.classList.add('winner-row-v100');
    });
  }

  function ensureArrowV100() {
    const wrap = q('rouletteWheelWrap') || document.querySelector('.roulette-wheel-wrap');
    const wheel = q('rouletteWheel') || document.querySelector('.roulette-wheel');

    if (!wrap || !wheel) return;

    wrap.classList.add('v100-arrow-wrap');
    wheel.classList.add('v100-arrow-wheel');

    const old = wrap.querySelector('.wheel-pointer');
    if (old) old.classList.add('v100-old-pointer-hidden');

    let arrow = q('wheelPointerV100');
    if (!arrow) {
      arrow = document.createElement('div');
      arrow.id = 'wheelPointerV100';
      arrow.className = 'wheel-pointer-v100';
      arrow.innerHTML = '<div class="wheel-pointer-v100-body"></div><div class="wheel-pointer-v100-tip"></div>';
      wrap.appendChild(arrow);
    }

    if (arrow.parentNode !== wrap) wrap.appendChild(arrow);

    const wrapRect = wrap.getBoundingClientRect();
    const wheelRect = wheel.getBoundingClientRect();

    const arrowHeight = 58;
    const tipOverlap = 4;

    const left = (wheelRect.left - wrapRect.left) + wheelRect.width / 2;
    const top = (wheelRect.top - wrapRect.top) - arrowHeight + tipOverlap;

    arrow.style.setProperty('--v100-arrow-left', `${Math.round(left)}px`);
    arrow.style.setProperty('--v100-arrow-top', `${Math.round(top)}px`);
    arrow.classList.remove('hidden');
  }

  function openCheckV100() {
    const nick = getWinnerNickV100();
    const url = new URL(CHECK_BASE_V100);

    if (nick) {
      url.searchParams.set('username', nick);
      url.searchParams.set('user', nick);
      url.searchParams.set('q', nick);
      url.searchParams.set('search', nick);
      url.searchParams.set('nick', nick);
      url.hash = `username=${encodeURIComponent(nick)}`;

      try {
        navigator.clipboard?.writeText(nick).catch(() => {});
      } catch {}
    }

    window.open(url.toString(), '_blank', 'noopener,noreferrer');

    if (typeof toast === 'function') {
      toast(nick ? `Ник скопирован: ${nick}` : 'Открываю проверку');
    }
  }

  const oldRender = window.render || (typeof render === 'function' ? render : null);
  if (oldRender && !window.__v100RenderWrapped) {
    window.__v100RenderWrapped = true;
    window.render = function () {
      const result = oldRender.apply(this, arguments);
      cleanupWinnersListV100();
      requestAnimationFrame(ensureArrowV100);
      return result;
    };
  }

  const oldStart = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStart && !window.__v100StartWrapped) {
    window.__v100StartWrapped = true;
    window.startRolling = function () {
      const result = oldStart.apply(this, arguments);
      requestAnimationFrame(ensureArrowV100);
      setTimeout(ensureArrowV100, 60);
      setTimeout(ensureArrowV100, 250);
      return result;
    };
  }

  document.addEventListener('click', function (e) {
    const check =
      e.target.closest?.('#winnerCheckBtnV92') ||
      e.target.closest?.('#winnerCheckBtnV91') ||
      e.target.closest?.('#winnerCheckBtnV81') ||
      e.target.closest?.('#winnerCheckBtnV80') ||
      e.target.closest?.('#winnerCheckBtnV79') ||
      e.target.closest?.('#winnerCheckBtnV78') ||
      e.target.closest?.('.winner-check-v92') ||
      e.target.closest?.('.winner-check-v91') ||
      e.target.closest?.('.winner-check-v81') ||
      e.target.closest?.('.winner-check-v80') ||
      e.target.closest?.('.winner-check-v79') ||
      e.target.closest?.('.winner-check-v78');

    if (!check) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    openCheckV100();
  }, true);

  window.addEventListener('resize', () => setTimeout(ensureArrowV100, 80));

  document.addEventListener('DOMContentLoaded', function () {
    cleanupWinnersListV100();
    ensureArrowV100();
    setTimeout(cleanupWinnersListV100, 300);
    setTimeout(ensureArrowV100, 300);
  });

  korIdleIntervalV486(function () {
    cleanupWinnersListV100();
    ensureArrowV100();
  }, 3500, { timeout: 800 });

  window.__v100CleanupWinnersList = cleanupWinnersListV100;
  window.__v100EnsureArrow = ensureArrowV100;
  window.__v100OpenCheck = openCheckV100;
})();



/* v101: stable arrow + stronger winner nick copy/check */
(function () {
  const CHECK_BASE_V101 = 'https://followage.showmasterokda.com/';

  function q(id) { return document.getElementById(id); }

  function cleanNickV101(v) {
    return String(v || '')
      .replace(/^@/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getWinnerNickV101() {
    const candidates = [
      q('winnerName')?.textContent,
      document.querySelector('.winner-name')?.textContent,
      document.querySelector('#winnerBox [class*="name" i]')?.textContent,
      document.querySelector('#winnerBox')?.textContent?.match(/@[A-Za-z0-9_]+/)?.[0],
      window.state?.lastWinner?.username,
      window.state?.lastWinner?.winner
    ];

    for (const c of candidates) {
      const n = cleanNickV101(c);
      if (n && !/победитель|быстрый|фолловит|канал|смотрит|стрим|сообщений|коэффициент/i.test(n)) return n;
    }

    const winners = Array.isArray(window.state?.winners) ? window.state.winners : [];
    const n = cleanNickV101(winners[0]?.username || winners[0]?.winner || winners[0]?.nick || '');
    return n;
  }

  async function copyTextV101(text) {
    if (!text) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch {
      return false;
    }
  }

  function ensureStableArrowV101() {
    const wrap = q('rouletteWheelWrap') || document.querySelector('.roulette-wheel-wrap');
    if (!wrap) return;

    wrap.classList.add('v101-fixed-arrow-wrap');

    // Hide older custom arrows.
    ['wheelPointerV99', 'wheelPointerV100'].forEach(id => q(id)?.remove());

    const old = wrap.querySelector('.wheel-pointer');
    if (old) old.classList.add('v101-old-pointer-hidden');

    let arrow = q('wheelPointerV101');
    if (!arrow) {
      arrow = document.createElement('div');
      arrow.id = 'wheelPointerV101';
      arrow.className = 'wheel-pointer-v101';
      arrow.innerHTML = '<div class="wheel-pointer-v101-body"></div><div class="wheel-pointer-v101-tip"></div>';
      wrap.appendChild(arrow);
    } else if (arrow.parentNode !== wrap) {
      wrap.appendChild(arrow);
    }

    arrow.classList.remove('hidden');

    // No getBoundingClientRect on rotating wheel. Position is fixed by CSS.
    arrow.style.removeProperty('left');
    arrow.style.removeProperty('top');
    arrow.style.removeProperty('transform');
  }

  async function openCheckV101() {
    const nick = getWinnerNickV101();
    const copied = await copyTextV101(nick);

    const url = new URL(CHECK_BASE_V101);

    if (nick) {
      url.searchParams.set('username', nick);
      url.searchParams.set('user', nick);
      url.searchParams.set('q', nick);
      url.searchParams.set('search', nick);
      url.searchParams.set('nick', nick);
      url.hash = `username=${encodeURIComponent(nick)}`;
    }

    window.open(url.toString(), '_blank', 'noopener,noreferrer');

    if (typeof toast === 'function') {
      if (nick && copied) toast(`Ник скопирован: ${nick}`);
      else if (nick) toast(`Открыл проверку: ${nick}`);
      else toast('Открываю проверку');
    }
  }

  const oldStart = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStart && !window.__v101StartWrapped) {
    window.__v101StartWrapped = true;
    window.startRolling = function () {
      const result = oldStart.apply(this, arguments);
      requestAnimationFrame(ensureStableArrowV101);
      setTimeout(ensureStableArrowV101, 100);
      return result;
    };
  }

  const oldRender = window.render || (typeof render === 'function' ? render : null);
  if (oldRender && !window.__v101RenderWrapped) {
    window.__v101RenderWrapped = true;
    window.render = function () {
      const result = oldRender.apply(this, arguments);
      ensureStableArrowV101();
      return result;
    };
  }

  document.addEventListener('click', function (e) {
    const check =
      e.target.closest?.('#winnerCheckBtnV92') ||
      e.target.closest?.('#winnerCheckBtnV91') ||
      e.target.closest?.('#winnerCheckBtnV81') ||
      e.target.closest?.('#winnerCheckBtnV80') ||
      e.target.closest?.('#winnerCheckBtnV79') ||
      e.target.closest?.('#winnerCheckBtnV78') ||
      e.target.closest?.('.winner-check-v92') ||
      e.target.closest?.('.winner-check-v91') ||
      e.target.closest?.('.winner-check-v81') ||
      e.target.closest?.('.winner-check-v80') ||
      e.target.closest?.('.winner-check-v79') ||
      e.target.closest?.('.winner-check-v78');

    if (!check) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    openCheckV101();
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    ensureStableArrowV101();
    setTimeout(ensureStableArrowV101, 300);
  });

  window.__v101EnsureStableArrow = ensureStableArrowV101;
  window.__v101OpenCheck = openCheckV101;
})();



/* v102: CHECK exact user=@nick link */
(function () {
  const CHECK_BASE_V102 = 'https://followage.showmasterokda.com/';

  function q(id) { return document.getElementById(id); }

  function cleanNickV102(v) {
    return String(v || '')
      .replace(/^@/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getWinnerNickV102() {
    const candidates = [
      q('winnerName')?.textContent,
      document.querySelector('.winner-name')?.textContent,
      document.querySelector('#winnerBox [class*="name" i]')?.textContent,
      document.querySelector('#winnerBox')?.textContent?.match(/@[A-Za-z0-9_]+/)?.[0],
      window.state?.lastWinner?.username,
      window.state?.lastWinner?.winner
    ];

    for (const c of candidates) {
      const n = cleanNickV102(c);
      if (n && !/победитель|быстрый|фолловит|канал|смотрит|стрим|сообщений|коэффициент/i.test(n)) return n;
    }

    const winners = Array.isArray(window.state?.winners) ? window.state.winners : [];
    return cleanNickV102(winners[0]?.username || winners[0]?.winner || winners[0]?.nick || '');
  }

  async function copyTextV102(text) {
    if (!text) return false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return !!ok;
    } catch {
      return false;
    }
  }

  async function openCheckV102() {
    const nick = getWinnerNickV102();
    const url = new URL(CHECK_BASE_V102);

    if (nick) {
      const userParam = '@' + nick;
      url.searchParams.set('user', userParam);
      await copyTextV102(userParam);
    }

    window.open(url.toString(), '_blank', 'noopener,noreferrer');

    if (typeof toast === 'function') {
      toast(nick ? `Проверка: @${nick}` : 'Открываю проверку');
    }
  }

  document.addEventListener('click', function (e) {
    const check =
      e.target.closest?.('#winnerCheckBtnV92') ||
      e.target.closest?.('#winnerCheckBtnV91') ||
      e.target.closest?.('#winnerCheckBtnV81') ||
      e.target.closest?.('#winnerCheckBtnV80') ||
      e.target.closest?.('#winnerCheckBtnV79') ||
      e.target.closest?.('#winnerCheckBtnV78') ||
      e.target.closest?.('.winner-check-v92') ||
      e.target.closest?.('.winner-check-v91') ||
      e.target.closest?.('.winner-check-v81') ||
      e.target.closest?.('.winner-check-v80') ||
      e.target.closest?.('.winner-check-v79') ||
      e.target.closest?.('.winner-check-v78');

    if (!check) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    openCheckV102();
  }, true);

  window.__v102OpenCheck = openCheckV102;
})();



/* v103: exact check URL + HTTP onlyNeverWon/remove participant */
(function () {
  const CHECK_BASE_V103 = 'https://followage.showmasterokda.com/';

  function q(id) { return document.getElementById(id); }

  function keyV103() {
    return new URLSearchParams(location.search).get('key') || localStorage.getItem('rostyasha_admin_key') || '12345';
  }

  async function httpCmdV103(type, params = {}) {
    const url = new URL(`/api/cmd/${type}`, location.origin);
    url.searchParams.set('key', keyV103());

    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }

    const res = await fetch(url.toString(), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false) {
      throw new Error(data.reason || `HTTP ${res.status}`);
    }

    if (data.state) {
      window.state = data.state;
      if (typeof render === 'function') render(data.state);
    }

    return data;
  }

  function cleanNickV103(v) {
    return String(v || '')
      .replace(/^@/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function winnerNickV103() {
    const candidates = [
      q('winnerName')?.textContent,
      document.querySelector('.winner-name')?.textContent,
      document.querySelector('#winnerBox [class*="name" i]')?.textContent,
      document.querySelector('#winnerBox')?.textContent?.match(/@[A-Za-z0-9_]+/)?.[0],
      window.state?.lastWinner?.username,
      window.state?.lastWinner?.winner
    ];

    for (const c of candidates) {
      const n = cleanNickV103(c);
      if (n && !/победитель|быстрый|фолловит|канал|смотрит|стрим|сообщений|коэффициент|нет данных/i.test(n)) {
        return n;
      }
    }

    const winners = Array.isArray(window.state?.winners) ? window.state.winners : [];
    return cleanNickV103(winners[0]?.username || winners[0]?.winner || winners[0]?.nick || '');
  }

  async function copyV103(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return !!ok;
    } catch {
      return false;
    }
  }

  async function openCheckV103() {
    const nick = winnerNickV103();
    const url = new URL(CHECK_BASE_V103);

    if (nick) {
      const userParam = '@' + nick;
      url.searchParams.set('user', userParam); // gives ?user=%40nick
      await copyV103(userParam);
    }

    window.open(url.toString(), '_blank', 'noopener,noreferrer');

    if (typeof toast === 'function') {
      toast(nick ? `Проверка: @${nick}` : 'Открываю проверку');
    }
  }

  function syncOnlyNeverWonButtonV103() {
    const btn = q('onlyNeverWonBtn');
    const input = q('onlyNeverWon');
    const pending = window.__wokoNeverWonPending;
    const active = pending && Date.now() < pending.until
      ? pending.value : !!window.state?.settings?.onlyNeverWon;
    if (input) input.checked = active;
    if (btn) {
      btn.classList.toggle('active-toggle', active);
      btn.textContent = active ? 'ВКЛ' : 'ВЫКЛ';
      btn.setAttribute('aria-pressed', String(active));
      btn.dataset.active = String(active);
    }
  }

  async function toggleOnlyNeverWonV103(btn) {
    // Read the actual visible state, not potentially stale server state.
    const current = btn?.getAttribute('aria-pressed') === 'true';
    const next = !current;
    window.__wokoNeverWonPending = { value: next, until: Date.now() + 15000 };
    if (window.state) {
      window.state.settings = window.state.settings || {};
      window.state.settings.onlyNeverWon = next;
    }
    syncOnlyNeverWonButtonV103();
    if (btn) btn.disabled = true;
    try {
      // Use the same authenticated command as the other dashboard controls.
      const result = await httpCmdV103('set_setting', { name: 'onlyNeverWon', value: next });
      const serverValue = result?.state?.settings?.onlyNeverWon;
      if (typeof serverValue === 'boolean' && serverValue !== next) {
        throw new Error('Сервер не сохранил переключатель');
      }
      if (window.state) {
        window.state.settings = window.state.settings || {};
        window.state.settings.onlyNeverWon = next;
      }
      syncOnlyNeverWonButtonV103();
      if (typeof toast === 'function') toast('Ни разу не выигрывали: ' + (next ? 'ВКЛ' : 'ВЫКЛ'));
    } catch (err) {
      window.__wokoNeverWonPending = null;
      if (window.state?.settings) window.state.settings.onlyNeverWon = current;
      syncOnlyNeverWonButtonV103();
      if (typeof toast === 'function') toast('Не удалось сохранить: ' + (err.message || 'ошибка сервера'));
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function participantNameFromClickV103(target) {
    const row = target.closest?.('[data-user], [data-username], [data-nick], .participant-row, .participant-item, .user-row, li, div');
    if (!row) return '';

    const fromData = row.dataset?.user || row.dataset?.username || row.dataset?.nick || row.dataset?.name;
    if (fromData) return cleanNickV103(fromData);

    const text = String(row.textContent || '');
    const at = text.match(/@([a-zA-Z0-9_]+)/);
    if (at) return cleanNickV103(at[1]);

    // Usually row text looks like "1. nickname 1 ×"
    return cleanNickV103(
      text
        .replace(/^\s*\d+\.\s*/, '')
        .replace(/[×x]\s*$/i, '')
        .replace(/\b\d+\b\s*$/,'')
        .trim()
        .split(/\s+/)[0]
    );
  }

  async function removeParticipantV103(target) {
    const username = participantNameFromClickV103(target);
    if (!username) return;

    try {
      await httpCmdV103('remove_participant', { username });
      if (typeof toast === 'function') toast(`Удалён: ${username}`);
    } catch (err) {
      if (typeof toast === 'function') toast(`Ошибка удаления: ${err.message || 'сервер'}`);
    }
  }

  // CHECK button exact URL
  document.addEventListener('click', function (e) {
    const check =
      e.target.closest?.('#winnerCheckBtnV92') ||
      e.target.closest?.('#winnerCheckBtnV91') ||
      e.target.closest?.('#winnerCheckBtnV81') ||
      e.target.closest?.('#winnerCheckBtnV80') ||
      e.target.closest?.('#winnerCheckBtnV79') ||
      e.target.closest?.('#winnerCheckBtnV78') ||
      e.target.closest?.('.winner-check-v92') ||
      e.target.closest?.('.winner-check-v91') ||
      e.target.closest?.('.winner-check-v81') ||
      e.target.closest?.('.winner-check-v80') ||
      e.target.closest?.('.winner-check-v79') ||
      e.target.closest?.('.winner-check-v78');

    if (!check) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    openCheckV103();
  }, true);

  // ONLY NEVER WON via HTTP
  document.addEventListener('click', function (e) {
    const btn = e.target.closest?.('#onlyNeverWonBtn');
    if (!btn) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    toggleOnlyNeverWonV103(btn);
  }, true);

  // participant remove crosses via HTTP.
  document.addEventListener('click', function (e) {
    const target = e.target;

    const looksLikeRemove =
      target.closest?.('#participantsList button') ||
      target.closest?.('#participantsList [data-remove]') ||
      target.closest?.('#participantsList .remove') ||
      target.closest?.('#participantsList .delete') ||
      target.closest?.('#participantsList .x') ||
      (
        target.closest?.('#participantsList') &&
        /^[×x✕✖-]$/.test(String(target.textContent || '').trim())
      );

    if (!looksLikeRemove) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    removeParticipantV103(target);
  }, true);

  const oldRenderV103 = window.render || (typeof render === 'function' ? render : null);
  if (oldRenderV103 && !window.__v103RenderWrapped) {
    window.__v103RenderWrapped = true;
    window.render = function () {
      const result = oldRenderV103.apply(this, arguments);
      syncOnlyNeverWonButtonV103();
      return result;
    };
  }

  document.addEventListener('DOMContentLoaded', syncOnlyNeverWonButtonV103);

  window.__v103OpenCheck = openCheckV103;
  window.__v103HttpCmd = httpCmdV103;
  window.__v103ToggleOnlyNeverWon = toggleOnlyNeverWonV103;
})();



/* v104: absolute CHECK URL with @nick before old click handlers */
(function () {
  const CHECK_BASE_V104 = 'https://followage.showmasterokda.com/';

  function q(id) { return document.getElementById(id); }

  function cleanNickV104(v) {
    return String(v || '')
      .replace(/^@/, '')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .trim();
  }

  function getWinnerNickV104() {
    const winnerBox = q('winnerBox') || document.querySelector('.winner-visual');

    const fromWinnerBox = winnerBox?.textContent?.match(/@([a-zA-Z0-9_]+)/)?.[1];
    if (cleanNickV104(fromWinnerBox)) return cleanNickV104(fromWinnerBox);

    const candidates = [
      q('winnerName')?.textContent,
      document.querySelector('.winner-name')?.textContent,
      document.querySelector('#winnerBox [class*="name" i]')?.textContent,
      window.state?.lastWinner?.username,
      window.state?.lastWinner?.winner
    ];

    for (const c of candidates) {
      const n = cleanNickV104(c);
      if (n && !/winner|победитель|быстрый|фолловит|канал|стрим|сообщений|коэффициент/i.test(n)) {
        return n;
      }
    }

    const winners = Array.isArray(window.state?.winners) ? window.state.winners : [];
    return cleanNickV104(winners[0]?.username || winners[0]?.winner || winners[0]?.nick || '');
  }

  async function copyTextV104(text) {
    if (!text) return false;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return !!ok;
    } catch {
      return false;
    }
  }

  async function openCheckV104() {
    const nick = getWinnerNickV104();
    const userParam = nick ? '@' + nick : '';
    const url = nick
      ? CHECK_BASE_V104 + '?user=%40' + encodeURIComponent(nick)
      : CHECK_BASE_V104;

    if (userParam) await copyTextV104(userParam);

    window.open(url, '_blank', 'noopener,noreferrer');

    if (typeof toast === 'function') {
      toast(nick ? `Проверка: ${userParam}` : 'Открываю проверку');
    }
  }

  function isCheckButtonV104(target) {
    return !!(
      target.closest?.('#winnerCheckBtnV92') ||
      target.closest?.('#winnerCheckBtnV91') ||
      target.closest?.('#winnerCheckBtnV81') ||
      target.closest?.('#winnerCheckBtnV80') ||
      target.closest?.('#winnerCheckBtnV79') ||
      target.closest?.('#winnerCheckBtnV78') ||
      target.closest?.('.winner-check-v92') ||
      target.closest?.('.winner-check-v91') ||
      target.closest?.('.winner-check-v81') ||
      target.closest?.('.winner-check-v80') ||
      target.closest?.('.winner-check-v79') ||
      target.closest?.('.winner-check-v78') ||
      target.closest?.('[id*="winnerCheck"]') ||
      target.closest?.('[class*="winner-check"]')
    );
  }

  // pointerdown runs before old click handlers, so old empty URL cannot win.
  document.addEventListener('pointerdown', function (e) {
    if (!isCheckButtonV104(e.target)) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    openCheckV104();
  }, true);

  document.addEventListener('click', function (e) {
    if (!isCheckButtonV104(e.target)) return;

    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  window.__v104OpenCheck = openCheckV104;
  window.__v104GetWinnerNick = getWinnerNickV104;
})();



/* v112: carpet + rustic designer wheel experiment */
(function () {
  const carpetPaletteV112 = [
    '#8b1d21', '#c44b2d', '#d9a74e', '#f0d790',
    '#252b3a', '#6f171f', '#b8863a', '#f2c86d'
  ];

  function escV112(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function carpetSegmentColorV112(i) {
    return carpetPaletteV112[i % carpetPaletteV112.length];
  }

  function buildCarpetPatternV112(count, step) {
    const parts = [];

    for (let i = 0; i < count; i++) {
      const a1 = i * step;
      const a2 = (i + 1) * step;
      const main = carpetSegmentColorV112(i);
      const dark = i % 3 === 0 ? '#211c25' : '#4b1220';
      const gold = i % 2 === 0 ? '#f0c66c' : '#d99b3b';

      // Main sector with tiny woven stripes near each border.
      parts.push(`${dark} ${a1}deg ${a1 + Math.min(step * .025, 1.2)}deg`);
      parts.push(`${gold} ${a1 + Math.min(step * .025, 1.2)}deg ${a1 + Math.min(step * .045, 2.0)}deg`);
      parts.push(`${main} ${a1 + Math.min(step * .045, 2.0)}deg ${a2 - Math.min(step * .07, 3.0)}deg`);
      parts.push(`${gold} ${a2 - Math.min(step * .07, 3.0)}deg ${a2 - Math.min(step * .045, 2.0)}deg`);
      parts.push(`${dark} ${a2 - Math.min(step * .045, 2.0)}deg ${a2}deg`);
    }

    return `conic-gradient(${parts.join(', ')})`;
  }

  function carpetOrnamentsV112(names, step) {
    return names.map((name, i) => {
      const angle = i * step + step / 2;
      const mini1 = i * step + step * .25;
      const mini2 = i * step + step * .75;
      const label = String(name).length > 13 ? String(name).slice(0, 12) + '…' : String(name);

      return `
        <div class="carpet-spoke-v112" style="--a:${angle}deg"></div>
        <div class="carpet-diamond-v112 diamond-a" style="--a:${mini1}deg"></div>
        <div class="carpet-diamond-v112 diamond-b" style="--a:${mini2}deg"></div>
        <div class="wheel-name carpet-wheel-name-v112" style="--a:${angle}deg">${escV112(label)}</div>
      `;
    }).join('');
  }

  const oldRenderWheelV112 = window.renderWheel || (typeof renderWheel === 'function' ? renderWheel : null);

  window.renderWheel = function carpetRenderWheelV112(names = []) {
    const wheel = document.getElementById('rouletteWheel');
    if (!wheel) return oldRenderWheelV112 ? oldRenderWheelV112(names) : undefined;

    const safe = names.length ? names : ['---'];
    const count = safe.length;
    const step = 360 / count;

    wheel.classList.add('carpet-wheel-v112');
    wheel.style.background = `
      radial-gradient(circle at 50% 50%, rgba(255, 235, 176, .24) 0 8%, transparent 9%),
      radial-gradient(circle at 50% 50%, transparent 0 61%, rgba(241, 198, 101, .75) 61.5% 63%, rgba(79, 15, 31, .92) 63.2% 66%, transparent 66.4%),
      repeating-radial-gradient(circle at 50% 50%, rgba(255, 218, 132, .16) 0 2px, rgba(0,0,0,.07) 3px 5px, transparent 6px 13px),
      ${buildCarpetPatternV112(count, step)}
    `;

    wheel.innerHTML = `
      <div class="carpet-fringe-v112 carpet-fringe-top"></div>
      <div class="carpet-fringe-v112 carpet-fringe-bottom"></div>
      <div class="carpet-inner-medallion-v112"></div>
      <div class="wheel-center carpet-wheel-center-v112">R</div>
      ${carpetOrnamentsV112(safe, step)}
    `;
  };

  // Make sure current wheel is restyled after load/state update.
  const oldShowWheelV112 = window.showWheel || (typeof showWheel === 'function' ? showWheel : null);
  if (oldShowWheelV112 && !window.__v112ShowWheelWrapped) {
    window.__v112ShowWheelWrapped = true;
    window.showWheel = function () {
      const result = oldShowWheelV112.apply(this, arguments);
      const wheel = document.getElementById('rouletteWheel');
      if (wheel) wheel.classList.add('carpet-wheel-v112');
      return result;
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const wheel = document.getElementById('rouletteWheel');
    if (wheel) wheel.classList.add('carpet-wheel-v112');
  });

  window.__v112CarpetWheel = true;
})();



/* v113: proper elimination rounds + hard reroll with wheel */
(function () {
  function q(id) { return document.getElementById(id); }

  function adminKeyV113() {
    return new URLSearchParams(location.search).get('key') || localStorage.getItem('rostyasha_admin_key') || '12345';
  }

  async function cmdV113(type, params = {}) {
    const qs = new URLSearchParams({ key: adminKeyV113() });
    Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));

    const res = await fetch(`/api/cmd/${encodeURIComponent(type)}?${qs.toString()}`, {
      method: 'GET',
      cache: 'no-store'
    });

    const data = await res.json().catch(() => ({}));

    if (data.state) {
      window.state = data.state;
      if (typeof render === 'function') render(data.state);
    }

    if (!res.ok || data.ok === false) {
      if (typeof toast === 'function') {
        const map = {
          no_participants: 'Нет участников',
          no_candidates: 'Нет участников',
          already_rolling: 'Рулетка уже крутится',
          bad_key: 'Неверный ключ панели'
        };
        toast(map[data.reason] || 'Команда не выполнена');
      }
      return null;
    }

    return data;
  }

  function getDurationV113() {
    return Math.max(1, Math.min(120, Number(
      localStorage.getItem('rostyasha_roll_duration') ||
      q('rollDurationInput')?.value ||
      5
    )));
  }

  function getRouletteModeV113() {
    return localStorage.getItem('rostyasha_roll_mode') || q('rouletteModeSelect')?.value || 'normal';
  }

  function setRerollModeV113(mode) {
    window.__rostyashaRerollMode = mode === 'quick' ? 'quick' : 'roulette';
    localStorage.setItem('rostyasha_reroll_mode', window.__rostyashaRerollMode);
  }

  function hideWinnerForRerollV113() {
    q('winnerBox')?.classList.add('hidden');
    q('winnerChatBox')?.classList.add('hidden');

    document.body.classList.remove(
      'v95-winner-active',
      'v96-winner-active',
      'v64-quick-winner',
      'v64-roulette-winner'
    );

    ['winnerFishQuoteV95', 'winnerFishQuoteV96', 'winnerFishQuoteV94', 'winnerFishQuoteV87'].forEach(id => {
      const el = q(id);
      if (el) {
        el.classList.add('hidden');
        el.style.setProperty('display', 'none', 'important');
      }
    });

    if (typeof showVisual === 'function') showVisual('rollingBox');
  }

  function startWheelPreviewV113(mode, durationSec) {
    const names = (window.state?.participants || []).slice();
    if (typeof startRolling === 'function') {
      startRolling({
        mode: mode === 'elimination' ? 'elimination' : 'normal',
        names,
        durationMs: durationSec * 1000
      });
    }
  }

  async function hardRerollV113() {
    const mode = window.__rostyashaRerollMode || localStorage.getItem('rostyasha_reroll_mode') || 'roulette';

    if (mode === 'quick') {
      setRerollModeV113('quick');
      hideWinnerForRerollV113();
      if (q('rollStatusText')) q('rollStatusText').textContent = 'БЫСТРЫЙ РЕРОЛЛ';
      q('rouletteWheelWrap')?.classList.add('hidden');
      await cmdV113('quick_roll');
      return;
    }

    setRerollModeV113('roulette');

    const durationSec = getDurationV113();
    const rouletteMode = getRouletteModeV113();

    hideWinnerForRerollV113();
    if (q('rollStatusText')) q('rollStatusText').textContent = rouletteMode === 'elimination' ? 'НА ВЫБЫВАНИЕ' : 'РОЛЛИМ...';

    // Show wheel immediately so it never feels like instant winner.
    startWheelPreviewV113(rouletteMode, durationSec);

    await cmdV113('roll', { mode: rouletteMode, durationSec });
  }

  // Track actual winner mode.
  const oldShowWinnerV113 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV113 && !window.__v113ShowWinnerWrapped) {
    window.__v113ShowWinnerWrapped = true;
    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const realMode = payload?.mode || mode || '';

      if (realMode === 'quick') setRerollModeV113('quick');
      else if (realMode) setRerollModeV113('roulette');

      return oldShowWinnerV113.apply(this, arguments);
    };
  }

  // Reroll buttons: catch every visible proxy before older handlers.
  document.addEventListener('pointerdown', function (e) {
    // v487: the current winner reroll is reason-gated. Legacy v113 must never
    // start the wheel before the reason picker resolves.
    if (e.target.closest?.('#winnerReasonBtnV487, #v487ReasonModal')) return;
    const reroll =
      e.target.closest?.('#winnerRerollBtn') ||
      e.target.closest?.('#winnerRerollFixedBtn') ||
      e.target.closest?.('#winnerRerollProxyV81') ||
      e.target.closest?.('#winnerRerollProxyV91') ||
      e.target.closest?.('#winnerRerollProxyV92') ||
      e.target.closest?.('.winner-reroll') ||
      e.target.closest?.('[id*="Reroll"]') ||
      e.target.closest?.('[class*="reroll" i]');

    if (!reroll) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    hardRerollV113();
  }, true);

  document.addEventListener('click', function (e) {
    // v487: allow the modern reason picker and its trigger to own the event.
    if (e.target.closest?.('#winnerReasonBtnV487, #v487ReasonModal')) return;
    const reroll =
      e.target.closest?.('#winnerRerollBtn') ||
      e.target.closest?.('#winnerRerollFixedBtn') ||
      e.target.closest?.('#winnerRerollProxyV81') ||
      e.target.closest?.('#winnerRerollProxyV91') ||
      e.target.closest?.('#winnerRerollProxyV92') ||
      e.target.closest?.('.winner-reroll') ||
      e.target.closest?.('[id*="Reroll"]') ||
      e.target.closest?.('[class*="reroll" i]');

    if (!reroll) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  // If rolling_start has eliminationTarget/winner, make the wheel stop on it.
  const oldShowWheelV113 = window.showWheel || (typeof showWheel === 'function' ? showWheel : null);
  if (oldShowWheelV113 && !window.__v113ShowWheelWrapped) {
    window.__v113ShowWheelWrapped = true;
    window.showWheel = function (payload = {}) {
      const result = oldShowWheelV113.apply(this, arguments);

      const target = payload.eliminationTarget || payload.winner || '';
      if (target && typeof window.__v113TargetWheelStop === 'function') {
        window.__v113TargetWheelStop(target, payload.durationMs || 1000);
      }

      return result;
    };
  }

  window.__v113TargetWheelStop = function (targetName, durationMs = 1000) {
    if (!targetName || !window.wheelState && typeof wheelState === 'undefined') return;

    try {
      const ws = (typeof wheelState !== 'undefined') ? wheelState : window.wheelState;
      const names = ws.names && ws.names.length ? ws.names : [];
      const idx = names.findIndex(n => String(n).toLowerCase() === String(targetName).toLowerCase());
      if (idx < 0) return;

      if (typeof cancelWheelAnimation === 'function') cancelWheelAnimation();

      const count = names.length;
      const step = 360 / count;
      const start = performance.now();
      const startRot = 0;

      const turns = Math.max(3, Math.min(12, Math.round(Number(durationMs || 1000) / 550)));
      const targetAngleUnderPointer = idx * step + step / 2;
      const targetRot = turns * 360 - targetAngleUnderPointer;

      const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

      function frame(now) {
        const t = Math.min(1, (now - start) / Number(durationMs || 1000));
        const eased = easeOutCubic(t);
        const rot = startRot + (targetRot - startRot) * eased;

        if (typeof setWheelRotation === 'function') setWheelRotation(rot);
        if (typeof updateRollingNameFromWheel === 'function') updateRollingNameFromWheel(rot);

        if (t < 1) {
          window.__v113WheelAnim = requestAnimationFrame(frame);
        } else {
          window.__v113WheelAnim = null;
          if (typeof setWheelRotation === 'function') setWheelRotation(targetRot);
          if (typeof updateRollingNameFromWheel === 'function') updateRollingNameFromWheel(targetRot);
        }
      }

      if (window.__v113WheelAnim) cancelAnimationFrame(window.__v113WheelAnim);
      window.__v113WheelAnim = requestAnimationFrame(frame);
    } catch (e) {
      console.warn('[v113 target wheel stop]', e);
    }
  };

  // Elimination out: show eliminated nick; do NOT restart wheel here.
  window.showEliminated = function (payload = {}) {
    try {
      if (typeof clearInterval === 'function' && typeof rollTimer !== 'undefined') clearInterval(rollTimer);
    } catch {}

    if (payload.username && typeof stopWheelWinner === 'function') {
      stopWheelWinner(payload.username);
    }

    if (q('eliminatedName')) {
      q('eliminatedName').textContent = '@' + (payload.username || '');
      q('eliminatedName').classList.remove('eliminated-pop');
      void q('eliminatedName').offsetWidth;
      q('eliminatedName').classList.add('eliminated-pop');
    }

    if (q('remainingText')) {
      q('remainingText').textContent = `Осталось: ${payload.remaining}`;
    }

    if (typeof showVisual === 'function') showVisual('eliminatedBox');
  };

  window.__v113HardReroll = hardRerollV113;
})();



/* v114: wheel and winner use the same server target */
(function () {
  function q(id) { return document.getElementById(id); }

  function normV114(v) {
    return String(v || '').replace(/^@/, '').trim().toLowerCase();
  }

  function getTargetV114(payload = {}) {
    return payload.winner || payload.eliminationTarget || payload.username || payload.target || '';
  }

  function nameIndexV114(names, target) {
    const t = normV114(target);
    return (names || []).findIndex(n => normV114(n) === t);
  }

  function setRollingNameV114(name) {
    const el = q('rollingName');
    if (!el || !name) return;
    const next = '@' + String(name).replace(/^@/, '');
    if (el.textContent !== next) {
      el.textContent = next;
      el.classList.remove('name-pop');
      void el.offsetWidth;
      el.classList.add('name-pop');
    }
  }

  function setWheelRotV114(deg) {
    const wheel = q('rouletteWheel');
    if (!wheel) return;
    wheel.style.transform = `rotate(${deg}deg)`;
    try {
      if (typeof wheelState !== 'undefined') wheelState.rotation = deg;
      window.wheelState = typeof wheelState !== 'undefined' ? wheelState : window.wheelState;
    } catch {}
  }

  /*
    IMPORTANT:
    The old formula placed the "math sector" under pointer,
    but visually the label/sector can be opposite depending on CSS transforms.
    This one uses the same visual convention as current wheel labels:
    target index center is moved to top pointer.
  */
  function targetRotationV114(names, target, extraTurns = 8) {
    const idx = nameIndexV114(names, target);
    if (idx < 0 || !names.length) return null;

    const step = 360 / names.length;

    // Visual sync: sector center should land at top pointer.
    // With current conic/label CSS, positive rotation aligns the visible sector.
    const angle = idx * step + step / 2;
    return extraTurns * 360 - angle;
  }

  function animateToServerTargetV114(payload = {}) {
    const target = getTargetV114(payload);
    if (!target) return false;

    const names = (payload.names && payload.names.length)
      ? payload.names
      : ((typeof wheelState !== 'undefined' && wheelState.names) ? wheelState.names : []);

    const idx = nameIndexV114(names, target);
    if (idx < 0) return false;

    const durationMs = Math.max(700, Number(payload.durationMs || 4800));
    const turns = Math.max(4, Math.min(18, Math.round(durationMs / 700)));
    const finalRot = targetRotationV114(names, target, turns);
    if (finalRot === null) return false;

    if (typeof cancelWheelAnimation === 'function') cancelWheelAnimation();

    const start = performance.now();
    const startRot = 0;
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

    function frame(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const rot = startRot + (finalRot - startRot) * eased;

      setWheelRotV114(rot);

      // During spin, keep the top name alive. On final frame, lock it to server target.
      if (t < 1 && typeof updateRollingNameFromWheel === 'function') {
        updateRollingNameFromWheel(rot);
      } else {
        setRollingNameV114(target);
      }

      if (t < 1) {
        window.__v114WheelAnim = requestAnimationFrame(frame);
      } else {
        window.__v114WheelAnim = null;
        setWheelRotV114(finalRot);
        setRollingNameV114(target);
      }
    }

    if (window.__v114WheelAnim) cancelAnimationFrame(window.__v114WheelAnim);
    window.__v114WheelAnim = requestAnimationFrame(frame);
    return true;
  }

  // Wrap showWheel so normal roulette also stops on server winner, not random.
  const oldShowWheelV114 = window.showWheel || (typeof showWheel === 'function' ? showWheel : null);
  if (oldShowWheelV114 && !window.__v114ShowWheelWrapped) {
    window.__v114ShowWheelWrapped = true;
    window.showWheel = function (payload = {}) {
      const result = oldShowWheelV114.apply(this, arguments);

      const target = getTargetV114(payload);
      if (target) {
        // Restart animation immediately with the server-picked target.
        setTimeout(() => animateToServerTargetV114(payload), 0);
      }

      return result;
    };
  }

  // Wrap startRolling as backup: every rolling_start target becomes the single source of truth.
  const oldStartRollingV114 = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStartRollingV114 && !window.__v114StartRollingWrapped) {
    window.__v114StartRollingWrapped = true;
    window.startRolling = function (payload = {}) {
      window.__v114CurrentRollTarget = getTargetV114(payload) || '';
      const result = oldStartRollingV114.apply(this, arguments);

      if (window.__v114CurrentRollTarget) {
        setTimeout(() => animateToServerTargetV114(payload), 30);
      }

      return result;
    };
  }

  // Winner popup: if there was a server target from rolling_start, force popup and top label to it.
  const oldShowWinnerV114 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV114 && !window.__v114ShowWinnerWrapped) {
    window.__v114ShowWinnerWrapped = true;
    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const serverName = payload?.username || usernameOrPayload || window.__v114CurrentRollTarget || '';
      setRollingNameV114(serverName);

      const names = (typeof wheelState !== 'undefined' && wheelState.names) ? wheelState.names : [];
      const target = serverName || window.__v114CurrentRollTarget;

      if (target && names.length) {
        const rot = targetRotationV114(names, target, 0);
        if (rot !== null) setWheelRotV114(rot);
      }

      return oldShowWinnerV114.apply(this, arguments);
    };
  }

  // stopWheelWinner: final hard lock to the same name before wheel hides/changes.
  const oldStopWheelWinnerV114 = window.stopWheelWinner || (typeof stopWheelWinner === 'function' ? stopWheelWinner : null);
  if (oldStopWheelWinnerV114 && !window.__v114StopWheelWrapped) {
    window.__v114StopWheelWrapped = true;
    window.stopWheelWinner = function (username = '') {
      const names = (typeof wheelState !== 'undefined' && wheelState.names) ? wheelState.names : [];
      const target = username || window.__v114CurrentRollTarget || '';
      const rot = targetRotationV114(names, target, 0);
      if (rot !== null) {
        if (typeof cancelWheelAnimation === 'function') cancelWheelAnimation();
        setWheelRotV114(rot);
        setRollingNameV114(target);
      }

      const result = oldStopWheelWinnerV114.apply(this, arguments);

      // old function may use old sign formula; override it again.
      if (rot !== null) {
        setWheelRotV114(rot);
        setRollingNameV114(target);
      }

      return result;
    };
  }

  window.__v114AnimateToServerTarget = animateToServerTargetV114;
  window.__v114TargetRotation = targetRotationV114;
})();



/* v115: restore rolling nickname ticker, keep server winner final */
(function () {
  let tickerV115 = null;
  let tickerTargetV115 = '';
  let tickerNamesV115 = [];

  function q(id) { return document.getElementById(id); }

  function cleanV115(v) {
    return String(v || '').replace(/^@/, '').trim();
  }

  function setRollingNameV115(name, pop = true) {
    const el = q('rollingName');
    if (!el || !name) return;

    const next = '@' + cleanV115(name);
    if (el.textContent !== next) {
      el.textContent = next;
      if (pop) {
        el.classList.remove('name-pop');
        void el.offsetWidth;
        el.classList.add('name-pop');
      }
    }
  }

  function stopTickerV115(finalName = '') {
    if (tickerV115) {
      clearInterval(tickerV115);
      tickerV115 = null;
    }

    const target = cleanV115(finalName || tickerTargetV115);
    if (target) setRollingNameV115(target, true);
  }

  function startTickerV115(names = [], target = '', durationMs = 4800) {
    stopTickerV115();

    tickerNamesV115 = (names || []).map(cleanV115).filter(Boolean);
    tickerTargetV115 = cleanV115(target);

    if (!tickerNamesV115.length) return;

    let i = Math.floor(Math.random() * tickerNamesV115.length);
    const start = performance.now();
    const total = Math.max(700, Number(durationMs || 4800));

    setRollingNameV115(tickerNamesV115[i], true);

    tickerV115 = setInterval(() => {
      const elapsed = performance.now() - start;

      if (elapsed >= total - 120) {
        stopTickerV115(tickerTargetV115 || tickerNamesV115[i]);
        return;
      }

      i = (i + 1) % tickerNamesV115.length;
      setRollingNameV115(tickerNamesV115[i], true);
    }, 95);
  }

  function targetFromPayloadV115(payload = {}) {
    return payload.winner || payload.eliminationTarget || payload.username || payload.target || '';
  }

  // Start cycling names on every wheel start.
  const oldStartRollingV115 = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStartRollingV115 && !window.__v115StartRollingWrapped) {
    window.__v115StartRollingWrapped = true;
    window.startRolling = function (payload = {}) {
      const names = (payload.names && payload.names.length)
        ? payload.names
        : (window.state?.participants || []);

      const target = targetFromPayloadV115(payload);
      const durationMs = payload.durationMs || 4800;

      startTickerV115(names, target, durationMs);

      const result = oldStartRollingV115.apply(this, arguments);

      // Old v114 may instantly lock the rollingName; unlock it again for the duration.
      setTimeout(() => startTickerV115(names, target, durationMs), 40);

      return result;
    };
  }

  // When the real winner arrives, lock the ticker to that exact nick.
  const oldShowWinnerV115 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV115 && !window.__v115ShowWinnerWrapped) {
    window.__v115ShowWinnerWrapped = true;
    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const finalName = cleanV115(payload?.username || usernameOrPayload || tickerTargetV115);
      stopTickerV115(finalName);
      return oldShowWinnerV115.apply(this, arguments);
    };
  }

  // Elimination out also locks to eliminated name before next round starts.
  const oldShowEliminatedV115 = window.showEliminated || (typeof showEliminated === 'function' ? showEliminated : null);
  if (oldShowEliminatedV115 && !window.__v115ShowEliminatedWrapped) {
    window.__v115ShowEliminatedWrapped = true;
    window.showEliminated = function (payload = {}) {
      stopTickerV115(payload.username || tickerTargetV115);
      return oldShowEliminatedV115.apply(this, arguments);
    };
  }

  // Close/hide wheel should not leave ticker running.
  const oldHideWheelV115 = window.hideWheel || (typeof hideWheel === 'function' ? hideWheel : null);
  if (oldHideWheelV115 && !window.__v115HideWheelWrapped) {
    window.__v115HideWheelWrapped = true;
    window.hideWheel = function () {
      stopTickerV115('');
      return oldHideWheelV115.apply(this, arguments);
    };
  }

  window.__v115StartRollingNameTicker = startTickerV115;
  window.__v115StopRollingNameTicker = stopTickerV115;
})();



/* v116: HARD restore rolling names instead of @--- */
(function () {
  let tickerV116 = null;
  let hardGuardV116 = null;
  let namesV116 = [];
  let targetV116 = '';
  let activeV116 = false;
  let indexV116 = 0;

  function q(id) { return document.getElementById(id); }

  function cleanV116(v) {
    return String(v || '')
      .replace(/^@/, '')
      .replace(/[^\wа-яёА-ЯЁ.-]/g, '')
      .trim();
  }

  function uniqueV116(arr) {
    const seen = new Set();
    const out = [];
    for (const x of arr) {
      const n = cleanV116(x);
      if (!n) continue;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
    return out;
  }

  function extractNamesFromWheelV116() {
    return uniqueV116(
      Array.from(document.querySelectorAll('#rouletteWheel .wheel-name, .roulette-wheel .wheel-name, .wheel-name'))
        .map(el => el.textContent)
    );
  }

  function extractNamesFromParticipantsDomV116() {
    const root = q('participantsList');
    if (!root) return [];

    return uniqueV116(
      Array.from(root.querySelectorAll('[data-user], [data-username], [data-nick], .participant-row, .participant-item, li, div'))
        .map(el => el.dataset?.user || el.dataset?.username || el.dataset?.nick || el.textContent)
        .map(t => String(t || '').replace(/^\s*\d+\.\s*/, '').replace(/[×x]\s*$/i, '').split(/\s+/)[0])
    );
  }

  function getNamesV116(payload = {}) {
    return uniqueV116([
      ...(payload.names || []),
      ...(window.wheelState?.names || []),
      ...((typeof wheelState !== 'undefined' && wheelState.names) ? wheelState.names : []),
      ...(window.state?.participants || []),
      ...extractNamesFromWheelV116(),
      ...extractNamesFromParticipantsDomV116()
    ]).filter(n => n !== '---');
  }

  function getTargetV116(payload = {}) {
    return cleanV116(payload.winner || payload.eliminationTarget || payload.username || payload.target || window.__v114CurrentRollTarget || targetV116 || '');
  }

  function rollingElV116() {
    return q('rollingName') || document.querySelector('.rolling-name') || document.querySelector('[id*="rolling"][id*="Name"]');
  }

  function setRollingNameV116(name, force = false) {
    const el = rollingElV116();
    const n = cleanV116(name);

    if (!el || !n) return;

    const next = '@' + n;
    if (force || el.textContent !== next) {
      el.textContent = next;
      el.classList.remove('name-pop', 'name-pop-v116');
      void el.offsetWidth;
      el.classList.add('name-pop-v116');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
    }
  }

  function nextNameV116() {
    if (!namesV116.length) return '';
    const n = namesV116[indexV116 % namesV116.length];
    indexV116++;
    return n;
  }

  function stopTickerV116(finalName = '') {
    activeV116 = false;

    if (tickerV116) {
      clearInterval(tickerV116);
      tickerV116 = null;
    }

    if (hardGuardV116) {
      clearInterval(hardGuardV116);
      hardGuardV116 = null;
    }

    const final = cleanV116(finalName || targetV116);
    if (final) setRollingNameV116(final, true);
  }

  function startTickerV116(payload = {}) {
    const names = getNamesV116(payload);
    const target = getTargetV116(payload);

    if (!names.length) return;

    namesV116 = names;
    targetV116 = target;
    activeV116 = true;
    indexV116 = Math.floor(Math.random() * names.length);

    if (tickerV116) clearInterval(tickerV116);
    if (hardGuardV116) clearInterval(hardGuardV116);

    const durationMs = Math.max(700, Number(payload.durationMs || 4800));
    const start = performance.now();

    setRollingNameV116(nextNameV116(), true);

    tickerV116 = setInterval(() => {
      const elapsed = performance.now() - start;

      if (elapsed >= durationMs - 150) {
        stopTickerV116(targetV116 || namesV116[(indexV116 - 1 + namesV116.length) % namesV116.length]);
        return;
      }

      setRollingNameV116(nextNameV116(), true);
    }, 85);

    // Hard guard: old code often writes @---; this immediately replaces it.
    hardGuardV116 = setInterval(() => {
      if (!activeV116) return;

      const el = rollingElV116();
      const text = String(el?.textContent || '').trim();

      if (!el || text === '' || text === '@---' || text === '---' || text.includes('---')) {
        setRollingNameV116(nextNameV116(), true);
      }
    }, 35);
  }

  // Override old update function that writes @---.
  window.updateRollingNameFromWheel = function updateRollingNameFromWheelV116() {
    if (!activeV116) {
      const names = getNamesV116({});
      if (names.length) setRollingNameV116(names[0], false);
      return;
    }

    const el = rollingElV116();
    const text = String(el?.textContent || '').trim();

    if (!text || text === '@---' || text.includes('---')) {
      setRollingNameV116(nextNameV116(), true);
    }
  };

  // Wrap startRolling.
  const oldStartRollingV116 = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStartRollingV116 && !window.__v116StartRollingWrapped) {
    window.__v116StartRollingWrapped = true;
    window.startRolling = function (payload = {}) {
      const result = oldStartRollingV116.apply(this, arguments);
      startTickerV116(payload);
      setTimeout(() => startTickerV116(payload), 80);
      setTimeout(() => startTickerV116(payload), 220);
      return result;
    };
  }

  // Wrap showWheel too, because some builds call showWheel directly.
  const oldShowWheelV116 = window.showWheel || (typeof showWheel === 'function' ? showWheel : null);
  if (oldShowWheelV116 && !window.__v116ShowWheelWrapped) {
    window.__v116ShowWheelWrapped = true;
    window.showWheel = function (payload = {}) {
      const result = oldShowWheelV116.apply(this, arguments);
      startTickerV116(payload);
      setTimeout(() => startTickerV116(payload), 80);
      setTimeout(() => startTickerV116(payload), 220);
      return result;
    };
  }

  // Final lock on winner.
  const oldShowWinnerV116 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV116 && !window.__v116ShowWinnerWrapped) {
    window.__v116ShowWinnerWrapped = true;
    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const finalName = cleanV116(payload?.username || usernameOrPayload || targetV116 || window.__v114CurrentRollTarget || '');
      stopTickerV116(finalName);
      return oldShowWinnerV116.apply(this, arguments);
    };
  }

  const oldShowEliminatedV116 = window.showEliminated || (typeof showEliminated === 'function' ? showEliminated : null);
  if (oldShowEliminatedV116 && !window.__v116ShowEliminatedWrapped) {
    window.__v116ShowEliminatedWrapped = true;
    window.showEliminated = function (payload = {}) {
      stopTickerV116(payload.username || targetV116);
      return oldShowEliminatedV116.apply(this, arguments);
    };
  }

  // When user clicks roll buttons, pre-start ticker from current participants immediately.
  document.addEventListener('pointerdown', function (e) {
    const rollBtn =
      e.target.closest?.('#rollBtn') ||
      e.target.closest?.('#rouletteBtn') ||
      e.target.closest?.('[id*="roll" i]') ||
      e.target.closest?.('[id*="roulette" i]');

    if (!rollBtn) return;

    setTimeout(() => startTickerV116({
      names: getNamesV116({}),
      durationMs: Math.max(700, Number(localStorage.getItem('rostyasha_roll_duration') || 5) * 1000)
    }), 120);
  }, true);

  window.__v116StartRollingNames = startTickerV116;
  window.__v116StopRollingNames = stopTickerV116;
})();



/* v117: top rolling name matches the sector under the arrow */
(function () {
  let rafV117 = null;
  let activeV117 = false;
  let finalTargetV117 = '';
  let lastShownV117 = '';

  function q(id) { return document.getElementById(id); }

  function cleanV117(v) {
    return String(v || '')
      .replace(/^@/, '')
      .replace(/[^\wа-яёА-ЯЁ.-]/g, '')
      .trim();
  }

  function uniqueV117(arr) {
    const seen = new Set();
    const out = [];
    for (const raw of arr || []) {
      const n = cleanV117(raw);
      if (!n || n === '---') continue;
      const k = n.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
    return out;
  }

  function wheelElV117() {
    return q('rouletteWheel') || document.querySelector('.roulette-wheel') || document.querySelector('.wheel');
  }

  function rollingElV117() {
    return q('rollingName') || document.querySelector('.rolling-name') || document.querySelector('[id*="rolling"][id*="Name"]');
  }

  function namesFromWheelDomV117() {
    return uniqueV117(
      Array.from(document.querySelectorAll('#rouletteWheel .wheel-name, .roulette-wheel .wheel-name, .wheel-name'))
        .map(el => el.textContent)
    );
  }

  function namesFromStateV117(payload = {}) {
    return uniqueV117([
      ...(payload.names || []),
      ...((typeof wheelState !== 'undefined' && wheelState.names) ? wheelState.names : []),
      ...(window.wheelState?.names || []),
      ...namesFromWheelDomV117(),
      ...(window.state?.participants || [])
    ]);
  }

  function targetFromPayloadV117(payload = {}) {
    return cleanV117(payload.winner || payload.eliminationTarget || payload.username || payload.target || window.__v114CurrentRollTarget || finalTargetV117 || '');
  }

  function setRollingNameV117(name, force = false) {
    const el = rollingElV117();
    const n = cleanV117(name);
    if (!el || !n) return;

    const next = '@' + n;
    if (force || el.textContent !== next) {
      el.textContent = next;
      el.classList.remove('name-pop-v116', 'name-pop-v117', 'name-pop');
      void el.offsetWidth;
      el.classList.add('name-pop-v117');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      lastShownV117 = n;
    }
  }

  function getRotationDegV117() {
    try {
      if (typeof wheelState !== 'undefined' && Number.isFinite(Number(wheelState.rotation))) {
        return Number(wheelState.rotation);
      }
      if (window.wheelState && Number.isFinite(Number(window.wheelState.rotation))) {
        return Number(window.wheelState.rotation);
      }

      const wheel = wheelElV117();
      const tr = wheel ? getComputedStyle(wheel).transform : '';
      if (!tr || tr === 'none') return 0;

      const m = tr.match(/matrix\(([^)]+)\)/);
      if (m) {
        const [a, b] = m[1].split(',').map(Number);
        return Math.atan2(b, a) * 180 / Math.PI;
      }

      const m3 = tr.match(/matrix3d\(([^)]+)\)/);
      if (m3) {
        const nums = m3[1].split(',').map(Number);
        return Math.atan2(nums[1], nums[0]) * 180 / Math.PI;
      }
    } catch {}

    return 0;
  }

  function modV117(n, m) {
    return ((n % m) + m) % m;
  }

  /*
    Visual convention currently seen in the app:
    sector i is under top arrow when:
      index = floor(((rotation + step/2) mod 360) / step)
    This matches the current labels on the wheel rather than the server math.
  */
  function nameUnderArrowV117(names, rotationDeg) {
    if (!names.length) return '';

    const step = 360 / names.length;
    const a = modV117(rotationDeg + step / 2, 360);
    const idx = Math.floor(a / step) % names.length;

    return names[idx] || '';
  }

  function stopSyncV117(finalName = '') {
    activeV117 = false;

    if (rafV117) {
      cancelAnimationFrame(rafV117);
      rafV117 = null;
    }

    const target = cleanV117(finalName || finalTargetV117 || lastShownV117);
    if (target) setRollingNameV117(target, true);
  }

  function startSyncV117(payload = {}) {
    const names = namesFromStateV117(payload);
    if (!names.length) return;

    finalTargetV117 = targetFromPayloadV117(payload);
    activeV117 = true;

    if (rafV117) cancelAnimationFrame(rafV117);

    const startedAt = performance.now();
    const maxMs = Math.max(1000, Number(payload.durationMs || 6000) + 900);

    function frame() {
      if (!activeV117) return;

      const elapsed = performance.now() - startedAt;

      if (elapsed >= maxMs) {
        stopSyncV117(finalTargetV117 || lastShownV117);
        return;
      }

      const rot = getRotationDegV117();
      const current = nameUnderArrowV117(names, rot);

      if (current) setRollingNameV117(current, false);

      rafV117 = requestAnimationFrame(frame);
    }

    frame();
  }

  // Fully disable v116 random ticker if it exists.
  if (typeof window.__v116StopRollingNames === 'function') {
    try { window.__v116StopRollingNames(''); } catch {}
  }

  window.__v116StartRollingNames = function () {};
  window.__v116StopRollingNames = function () {};

  // Override updateRollingNameFromWheel: now it reads current wheel angle.
  window.updateRollingNameFromWheel = function updateRollingNameFromWheelV117(rotation) {
    const names = namesFromStateV117({});
    if (!names.length) return;

    const rot = Number.isFinite(Number(rotation)) ? Number(rotation) : getRotationDegV117();
    const current = nameUnderArrowV117(names, rot);
    if (current) setRollingNameV117(current, false);
  };

  const oldStartRollingV117 = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStartRollingV117 && !window.__v117StartRollingWrapped) {
    window.__v117StartRollingWrapped = true;
    window.startRolling = function (payload = {}) {
      const result = oldStartRollingV117.apply(this, arguments);

      // v116 may have started random ticker after oldStartRolling; kill it and start synced mode.
      setTimeout(() => {
        if (typeof window.__v116StopRollingNames === 'function') {
          try { window.__v116StopRollingNames(''); } catch {}
        }
        startSyncV117(payload);
      }, 20);

      return result;
    };
  }

  const oldShowWheelV117 = window.showWheel || (typeof showWheel === 'function' ? showWheel : null);
  if (oldShowWheelV117 && !window.__v117ShowWheelWrapped) {
    window.__v117ShowWheelWrapped = true;
    window.showWheel = function (payload = {}) {
      const result = oldShowWheelV117.apply(this, arguments);

      setTimeout(() => {
        if (typeof window.__v116StopRollingNames === 'function') {
          try { window.__v116StopRollingNames(''); } catch {}
        }
        startSyncV117(payload);
      }, 20);

      return result;
    };
  }

  const oldShowWinnerV117 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV117 && !window.__v117ShowWinnerWrapped) {
    window.__v117ShowWinnerWrapped = true;
    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const finalName = cleanV117(payload?.username || usernameOrPayload || finalTargetV117 || window.__v114CurrentRollTarget || '');
      stopSyncV117(finalName);
      return oldShowWinnerV117.apply(this, arguments);
    };
  }

  const oldShowEliminatedV117 = window.showEliminated || (typeof showEliminated === 'function' ? showEliminated : null);
  if (oldShowEliminatedV117 && !window.__v117ShowEliminatedWrapped) {
    window.__v117ShowEliminatedWrapped = true;
    window.showEliminated = function (payload = {}) {
      stopSyncV117(payload.username || finalTargetV117 || lastShownV117);
      return oldShowEliminatedV117.apply(this, arguments);
    };
  }

  window.__v117NameUnderArrow = nameUnderArrowV117;
  window.__v117StartWheelNameSync = startSyncV117;
  window.__v117StopWheelNameSync = stopSyncV117;
})();



/* v118: fix top name angle - read sector under arrow, not opposite */
(function () {
  let rafV118 = null;
  let activeV118 = false;
  let finalTargetV118 = '';
  let lastShownV118 = '';

  function q(id) { return document.getElementById(id); }

  function cleanV118(v) {
    return String(v || '')
      .replace(/^@/, '')
      .replace(/[^\wа-яёА-ЯЁ.-]/g, '')
      .trim();
  }

  function uniqueV118(arr) {
    const seen = new Set();
    const out = [];
    for (const raw of arr || []) {
      const n = cleanV118(raw);
      if (!n || n === '---') continue;
      const k = n.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
    return out;
  }

  function rollingElV118() {
    return q('rollingName') || document.querySelector('.rolling-name') || document.querySelector('[id*="rolling"][id*="Name"]');
  }

  function namesFromWheelDomV118() {
    return uniqueV118(
      Array.from(document.querySelectorAll('#rouletteWheel .wheel-name, .roulette-wheel .wheel-name, .wheel-name'))
        .map(el => el.textContent)
    );
  }

  function namesFromStateV118(payload = {}) {
    // HARD SYNC: use the exact ordered array that rendered the wheel sectors.
    // Mixing participants / DOM / payload arrays can change order and makes the
    // top label point at a different player than the sector under the arrow.
    const exact = (typeof wheelState !== 'undefined' && Array.isArray(wheelState.names) && wheelState.names.length)
      ? wheelState.names
      : (window.wheelState && Array.isArray(window.wheelState.names) && window.wheelState.names.length)
        ? window.wheelState.names
        : (Array.isArray(payload.names) && payload.names.length)
          ? payload.names
          : namesFromWheelDomV118();
    return exact.map(cleanV118).filter(Boolean);
  }

  function targetFromPayloadV118(payload = {}) {
    return cleanV118(payload.winner || payload.eliminationTarget || payload.username || payload.target || window.__v114CurrentRollTarget || finalTargetV118 || '');
  }

  function setRollingNameV118(name, force = false) {
    const el = rollingElV118();
    const n = cleanV118(name);
    if (!el || !n) return;

    const next = '@' + n;
    if (force || el.textContent !== next) {
      el.textContent = next;
      el.classList.remove('name-pop-v116', 'name-pop-v117', 'name-pop-v118', 'name-pop');
      void el.offsetWidth;
      el.classList.add('name-pop-v118');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      lastShownV118 = n;
    }
  }

  function getRotationDegV118() {
    try {
      if (typeof wheelState !== 'undefined' && Number.isFinite(Number(wheelState.rotation))) return Number(wheelState.rotation);
      if (window.wheelState && Number.isFinite(Number(window.wheelState.rotation))) return Number(window.wheelState.rotation);

      const wheel = q('rouletteWheel') || document.querySelector('.roulette-wheel') || document.querySelector('.wheel');
      const tr = wheel ? getComputedStyle(wheel).transform : '';
      if (!tr || tr === 'none') return 0;

      const m = tr.match(/matrix\(([^)]+)\)/);
      if (m) {
        const [a, b] = m[1].split(',').map(Number);
        return Math.atan2(b, a) * 180 / Math.PI;
      }

      const m3 = tr.match(/matrix3d\(([^)]+)\)/);
      if (m3) {
        const nums = m3[1].split(',').map(Number);
        return Math.atan2(nums[1], nums[0]) * 180 / Math.PI;
      }
    } catch {}

    return 0;
  }

  function modV118(n, m) {
    return ((n % m) + m) % m;
  }

  /*
    v510 HARD POINTER SYNC.
    CSS conic-gradient sector 0 starts at 12 o'clock and sectors advance clockwise.
    The arrow is fixed at 12 o'clock while the wheel rotates by rotationDeg.
    Therefore the source angle currently under the arrow is exactly -rotationDeg.
    No 180° offset, no timer/ticker guessing, no half-sector compensation.
  */
  function nameUnderArrowV118(names, rotationDeg) {
    if (!names.length) return '';

    const step = 360 / names.length;
    const sourceAngle = modV118(-Number(rotationDeg || 0), 360);
    const idx = Math.min(names.length - 1, Math.floor(sourceAngle / step));

    return names[idx] || '';
  }

  function stopSyncV118(finalName = '') {
    activeV118 = false;

    if (rafV118) {
      cancelAnimationFrame(rafV118);
      rafV118 = null;
    }

    const target = cleanV118(finalName || finalTargetV118 || lastShownV118);
    if (target) setRollingNameV118(target, true);
  }

  function startSyncV118(payload = {}) {
    const names = namesFromStateV118(payload);
    if (!names.length) return;

    finalTargetV118 = targetFromPayloadV118(payload);
    activeV118 = true;

    if (rafV118) cancelAnimationFrame(rafV118);

    const startedAt = performance.now();
    const maxMs = Math.max(1000, Number(payload.durationMs || 6000) + 900);

    function frame() {
      if (!activeV118) return;

      const elapsed = performance.now() - startedAt;

      if (elapsed >= maxMs) {
        stopSyncV118(finalTargetV118 || lastShownV118);
        return;
      }

      const rot = getRotationDegV118();
      const current = nameUnderArrowV118(names, rot);

      if (current) setRollingNameV118(current, false);

      rafV118 = requestAnimationFrame(frame);
    }

    frame();
  }

  // Disable older random/sync tickers that can overwrite top name.
  if (typeof window.__v116StopRollingNames === 'function') {
    try { window.__v116StopRollingNames(''); } catch {}
  }
  if (typeof window.__v117StopWheelNameSync === 'function') {
    try { window.__v117StopWheelNameSync(''); } catch {}
  }

  window.__v116StartRollingNames = function () {};
  window.__v116StopRollingNames = function () {};
  window.__v117StartWheelNameSync = function () {};
  window.__v117StopWheelNameSync = function () {};

  // Override update again with corrected 180° offset.
  window.updateRollingNameFromWheel = function updateRollingNameFromWheelV118(rotation) {
    const names = namesFromStateV118({});
    if (!names.length) return;

    const rot = Number.isFinite(Number(rotation)) ? Number(rotation) : getRotationDegV118();
    const current = nameUnderArrowV118(names, rot);
    if (current) setRollingNameV118(current, false);
  };

  const oldStartRollingV118 = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStartRollingV118 && !window.__v118StartRollingWrapped) {
    window.__v118StartRollingWrapped = true;
    window.startRolling = function (payload = {}) {
      const result = oldStartRollingV118.apply(this, arguments);

      setTimeout(() => {
        if (typeof window.__v116StopRollingNames === 'function') {
          try { window.__v116StopRollingNames(''); } catch {}
        }
        if (typeof window.__v117StopWheelNameSync === 'function') {
          try { window.__v117StopWheelNameSync(''); } catch {}
        }
        startSyncV118(payload);
      }, 35);

      return result;
    };
  }

  const oldShowWheelV118 = window.showWheel || (typeof showWheel === 'function' ? showWheel : null);
  if (oldShowWheelV118 && !window.__v118ShowWheelWrapped) {
    window.__v118ShowWheelWrapped = true;
    window.showWheel = function (payload = {}) {
      const result = oldShowWheelV118.apply(this, arguments);

      setTimeout(() => {
        if (typeof window.__v116StopRollingNames === 'function') {
          try { window.__v116StopRollingNames(''); } catch {}
        }
        if (typeof window.__v117StopWheelNameSync === 'function') {
          try { window.__v117StopWheelNameSync(''); } catch {}
        }
        startSyncV118(payload);
      }, 35);

      return result;
    };
  }

  const oldShowWinnerV118 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV118 && !window.__v118ShowWinnerWrapped) {
    window.__v118ShowWinnerWrapped = true;
    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const finalName = cleanV118(payload?.username || usernameOrPayload || finalTargetV118 || window.__v114CurrentRollTarget || '');
      stopSyncV118(finalName);
      return oldShowWinnerV118.apply(this, arguments);
    };
  }

  const oldShowEliminatedV118 = window.showEliminated || (typeof showEliminated === 'function' ? showEliminated : null);
  if (oldShowEliminatedV118 && !window.__v118ShowEliminatedWrapped) {
    window.__v118ShowEliminatedWrapped = true;
    window.showEliminated = function (payload = {}) {
      stopSyncV118(payload.username || finalTargetV118 || lastShownV118);
      return oldShowEliminatedV118.apply(this, arguments);
    };
  }

  window.__v118NameUnderArrow = nameUnderArrowV118;
  window.__v118StartWheelNameSync = startSyncV118;
  window.__v118StopWheelNameSync = stopSyncV118;
})();



/* v119: top name by REAL DOM position near arrow, no angle formulas */
(function () {
  let rafV119 = null;
  let activeV119 = false;
  let finalTargetV119 = '';
  let lastShownV119 = '';

  function q(id) { return document.getElementById(id); }

  function cleanV119(v) {
    return String(v || '')
      .replace(/^@/, '')
      .replace(/[^\wа-яёА-ЯЁ.-]/g, '')
      .trim();
  }

  function rollingElV119() {
    return q('rollingName') || document.querySelector('.rolling-name') || document.querySelector('[id*="rolling"][id*="Name"]');
  }

  function wheelElV119() {
    return q('rouletteWheel') || document.querySelector('.roulette-wheel') || document.querySelector('.wheel');
  }

  function pointerElV119() {
    return (
      q('wheelPointerV101') ||
      q('wheelPointerV100') ||
      q('wheelPointerV99') ||
      document.querySelector('.wheel-pointer-v101') ||
      document.querySelector('.wheel-pointer-v100') ||
      document.querySelector('.wheel-pointer-v99') ||
      document.querySelector('[id*="Pointer"]') ||
      document.querySelector('[class*="pointer" i]')
    );
  }

  function setRollingNameV119(name, force = false) {
    const el = rollingElV119();
    const n = cleanV119(name);
    if (!el || !n || n === '---') return;

    const next = '@' + n;
    if (force || el.textContent !== next) {
      el.textContent = next;
      el.classList.remove('name-pop-v116', 'name-pop-v117', 'name-pop-v118', 'name-pop-v119', 'name-pop');
      void el.offsetWidth;
      el.classList.add('name-pop-v119');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      lastShownV119 = n;
    }
  }

  function getPointerPointV119() {
    const pointer = pointerElV119();
    const wheel = wheelElV119();

    if (pointer) {
      const r = pointer.getBoundingClientRect();

      // Use the visual tip of the downward triangle: bottom center.
      return {
        x: r.left + r.width / 2,
        y: r.bottom - 2
      };
    }

    if (wheel) {
      const r = wheel.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + 2
      };
    }

    return null;
  }

  function visibleWheelNamesV119() {
    return Array.from(document.querySelectorAll('#rouletteWheel .wheel-name, .roulette-wheel .wheel-name, .wheel-name'))
      .map(el => {
        const n = cleanV119(el.textContent);
        if (!n || n === '---') return null;

        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return null;

        return {
          el,
          name: n,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          rect: r
        };
      })
      .filter(Boolean);
  }

  function nameClosestToPointerV119() {
    const p = getPointerPointV119();
    const items = visibleWheelNamesV119();
    const wheel = wheelElV119();

    if (!p || !items.length) return '';

    // First: prefer labels that are visually near the top half of the wheel.
    let wheelCenterY = null;
    if (wheel) {
      const wr = wheel.getBoundingClientRect();
      wheelCenterY = wr.top + wr.height / 2;
    }

    let best = null;
    let bestScore = Infinity;

    for (const item of items) {
      const dx = item.x - p.x;
      const dy = item.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Strongly prefer labels near pointer, but don't punish the label being slightly inside wheel.
      let score = dist;

      if (wheelCenterY !== null && item.y > wheelCenterY) {
        score += 260; // avoid selecting the opposite/bottom label
      }

      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    }

    return best?.name || '';
  }

  function stopSyncV119(finalName = '') {
    activeV119 = false;

    if (rafV119) {
      cancelAnimationFrame(rafV119);
      rafV119 = null;
    }

    const target = cleanV119(finalName || finalTargetV119 || lastShownV119);
    if (target) setRollingNameV119(target, true);
  }

  function startSyncV119(payload = {}) {
    finalTargetV119 = cleanV119(payload.winner || payload.eliminationTarget || payload.username || payload.target || window.__v114CurrentRollTarget || finalTargetV119 || '');
    activeV119 = true;

    if (rafV119) cancelAnimationFrame(rafV119);

    const startedAt = performance.now();
    const maxMs = Math.max(1000, Number(payload.durationMs || 6000) + 1200);

    let lastProbeAtV119 = 0;
    function frame(now = performance.now()) {
      if (!activeV119) return;

      const elapsed = now - startedAt;

      if (elapsed >= maxMs) {
        stopSyncV119(finalTargetV119 || lastShownV119);
        return;
      }

      // v482: wheel transform stays on every RAF, but costly getBoundingClientRect scans
      // are throttled so they no longer make the wheel visibly stutter.
      if (now - lastProbeAtV119 >= 72) {
        lastProbeAtV119 = now;
        const current = nameClosestToPointerV119();
        if (current) setRollingNameV119(current, false);
      }

      rafV119 = requestAnimationFrame(frame);
    }

    rafV119 = requestAnimationFrame(frame);
  }

  // Disable old ticker/sync systems so only real-position sync controls top name.
  for (const fn of [
    '__v116StopRollingNames',
    '__v117StopWheelNameSync',
    '__v118StopWheelNameSync'
  ]) {
    if (typeof window[fn] === 'function') {
      try { window[fn](''); } catch {}
    }
  }

  window.__v116StartRollingNames = function () {};
  window.__v116StopRollingNames = function () {};
  window.__v117StartWheelNameSync = function () {};
  window.__v117StopWheelNameSync = function () {};
  window.__v118StartWheelNameSync = function () {};
  window.__v118StopWheelNameSync = function () {};

  // updateRollingNameFromWheel now ignores math and reads real DOM.
  window.updateRollingNameFromWheel = function updateRollingNameFromWheelV119() {
    const current = nameClosestToPointerV119();
    if (current) setRollingNameV119(current, false);
  };

  const oldStartRollingV119 = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStartRollingV119 && !window.__v119StartRollingWrapped) {
    window.__v119StartRollingWrapped = true;
    window.startRolling = function (payload = {}) {
      const result = oldStartRollingV119.apply(this, arguments);

      setTimeout(() => {
        for (const fn of ['__v116StopRollingNames', '__v117StopWheelNameSync', '__v118StopWheelNameSync']) {
          if (typeof window[fn] === 'function') {
            try { window[fn](''); } catch {}
          }
        }
        startSyncV119(payload);
      }, 60);

      return result;
    };
  }

  const oldShowWheelV119 = window.showWheel || (typeof showWheel === 'function' ? showWheel : null);
  if (oldShowWheelV119 && !window.__v119ShowWheelWrapped) {
    window.__v119ShowWheelWrapped = true;
    window.showWheel = function (payload = {}) {
      const result = oldShowWheelV119.apply(this, arguments);

      setTimeout(() => {
        for (const fn of ['__v116StopRollingNames', '__v117StopWheelNameSync', '__v118StopWheelNameSync']) {
          if (typeof window[fn] === 'function') {
            try { window[fn](''); } catch {}
          }
        }
        startSyncV119(payload);
      }, 60);

      return result;
    };
  }

  const oldShowWinnerV119 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV119 && !window.__v119ShowWinnerWrapped) {
    window.__v119ShowWinnerWrapped = true;
    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const finalName = cleanV119(payload?.username || usernameOrPayload || finalTargetV119 || window.__v114CurrentRollTarget || '');
      stopSyncV119(finalName);
      return oldShowWinnerV119.apply(this, arguments);
    };
  }

  const oldShowEliminatedV119 = window.showEliminated || (typeof showEliminated === 'function' ? showEliminated : null);
  if (oldShowEliminatedV119 && !window.__v119ShowEliminatedWrapped) {
    window.__v119ShowEliminatedWrapped = true;
    window.showEliminated = function (payload = {}) {
      stopSyncV119(payload.username || finalTargetV119 || lastShownV119);
      return oldShowEliminatedV119.apply(this, arguments);
    };
  }

  window.__v119NameClosestToPointer = nameClosestToPointerV119;
  window.__v119StartRealPositionSync = startSyncV119;
  window.__v119StopRealPositionSync = stopSyncV119;
})();



/* v120: followage in winner block */
(function () {
  function q(id) { return document.getElementById(id); }

  function cleanV120(v) {
    return String(v || '').replace(/^@/, '').trim().toLowerCase();
  }

  function currentWinnerV120() {
    const fromState = window.state?.lastWinner?.username;
    if (fromState) return cleanV120(fromState);

    const text = q('winnerName')?.textContent || document.querySelector('.winner-name')?.textContent || '';
    return cleanV120(text);
  }

  function setFollowageV120(username, followText) {
    const u = cleanV120(username);
    const current = currentWinnerV120();

    if (u && current && u !== current) return;

    const value = followText || 'нет данных';

    const el = q('winnerFollowInfo');
    if (el) {
      // v518: followage is checked asynchronously; never repaint a real
      // answer with a visible loading label during overlapping requests.
      const checking = /проверяем|checking/i.test(value);
      if (checking) {
        if (!String(el.textContent || '').trim()) el.textContent = '—';
        return;
      }
      if (el.textContent !== value) el.textContent = value;
      el.classList.remove('followage-loading-v120');
      el.classList.toggle('followage-ok-v120', value !== 'нет данных');
    }
  }

  async function requestFollowageV120(username) {
    const u = cleanV120(username);
    if (!u) return;

    setFollowageV120(u, 'проверяем...');

    try {
      const res = await fetch(`/api/followage?user=${encodeURIComponent(u)}`, { cache: 'no-store' });
      const data = await res.json();

      if (data?.ok && data.followText) {
        setFollowageV120(u, data.followText);
      } else {
        setFollowageV120(u, 'нет данных');
      }
    } catch (e) {
      console.warn('[followage v120]', e);
      setFollowageV120(u, 'нет данных');
    }
  }

  const oldShowWinnerV120 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV120 && !window.__v120ShowWinnerWrapped) {
    window.__v120ShowWinnerWrapped = true;
    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const username = cleanV120(payload?.username || usernameOrPayload || '');

      const result = oldShowWinnerV120.apply(this, arguments);

      const existing = payload?.details?.followText || details?.followText || '';
      if (existing && existing !== 'нет данных') {
        setFollowageV120(username, existing);
      } else {
        requestFollowageV120(username);
      }

      return result;
    };
  }

  const oldRenderV120 = window.render || (typeof render === 'function' ? render : null);
  if (oldRenderV120 && !window.__v120RenderWrapped) {
    window.__v120RenderWrapped = true;
    window.render = function (next) {
      const result = oldRenderV120.apply(this, arguments);

      const last = next?.lastWinner || window.state?.lastWinner;
      if (last?.username && last?.details?.followText && last.details.followText !== 'нет данных') {
        setFollowageV120(last.username, last.details.followText);
      }

      return result;
    };
  }

  // WebSocket event from server when async followage comes back.
  const oldHandleNoticeV120 = window.handleNotice || null;

  window.__v120SetFollowage = setFollowageV120;
  window.__v120RequestFollowage = requestFollowageV120;

  // Extra listener by wrapping global WebSocket message dispatch is hard because old code owns ws.
  // So we poll state shortly after winner appears as a safe backup.
  let pollTimerV120 = null;
  function startFollowagePollV120(username) {
    if (pollTimerV120) clearInterval(pollTimerV120);

    const u = cleanV120(username);
    const started = Date.now();

    pollTimerV120 = setInterval(async () => {
      if (Date.now() - started > 12000) {
        clearInterval(pollTimerV120);
        pollTimerV120 = null;
        return;
      }

      try {
        const data = await fetch('/api/state', { cache: 'no-store' }).then(r => r.json());
        const last = data?.lastWinner;
        if (cleanV120(last?.username) === u && last?.details?.followText && last.details.followText !== 'нет данных') {
          setFollowageV120(u, last.details.followText);
          clearInterval(pollTimerV120);
          pollTimerV120 = null;
        }
      } catch {}
    }, 1500);
  }

  const oldShowWinnerForPollV120 = window.showWinner;
  if (oldShowWinnerForPollV120 && !window.__v120ShowWinnerPollWrapped) {
    window.__v120ShowWinnerPollWrapped = true;
    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const username = cleanV120(payload?.username || usernameOrPayload || '');

      const result = oldShowWinnerForPollV120.apply(this, arguments);
      if (username) startFollowagePollV120(username);

      return result;
    };
  }
})();



/* v121: frontend label for Twitch API followage */
(function () {
  const oldReq = window.__v120RequestFollowage;
  if (typeof oldReq === 'function' && !window.__v121FollowageFrontendWrapped) {
    window.__v121FollowageFrontendWrapped = true;

    window.__v120RequestFollowage = function (username) {
      const el = document.getElementById('winnerFollowInfo');
      if (el) {
        if (!el.textContent.trim()) el.textContent = '—';
        el.classList.add('followage-loading-v120');
      }
      return oldReq(username);
    };
  }
})();



/* v126: clean soft reroll guard, no duplicate buttons, no wheel hijack */
(function () {
  let rerollLockedV126 = false;
  let lastRerollAtV126 = 0;

  function q(id) { return document.getElementById(id); }

  function unlockSoonV126(ms = 9000) {
    setTimeout(() => {
      rerollLockedV126 = false;
      document.body.classList.remove('v126-reroll-locked');
    }, ms);
  }

  function isRerollButtonV126(target) {
    if (target?.closest?.('#winnerReasonBtnV487, #v487ReasonModal')) return null;
    const el = target?.closest?.(
      '#winnerRerollBtn, #winnerRerollFixedBtn, #winnerRerollProxyV81, #winnerRerollProxyV91, #winnerRerollProxyV92, .winner-reroll, [id*="Reroll"], [class*="reroll" i]'
    );

    if (!el) return null;

    // Do not treat left panel main roll buttons as winner reroll.
    const txt = String(el.textContent || '').trim().toLowerCase();
    if (!txt.includes('реролл') && !txt.includes('reroll')) return null;

    return el;
  }

  function removeBadButtonArtifactsV126() {
    // Remove only our broken v122-v125 duplicate artifacts if user ever mixes folders.
    document.querySelectorAll(
      '#winnerActionsBarV122, #winnerRerollBtnV122, #winnerCheckBtnV122, #winnerActionsBarV125, #winnerActionRerollV125, #winnerActionCheckV125, [data-v122-reroll], [data-v122-check]'
    ).forEach(el => {
      try { el.remove(); } catch {}
    });
  }

  function keepNativeButtonsV126() {
    removeBadButtonArtifactsV126();

    // Return original winner buttons to visible state only when winner chat is visible.
    const chat = q('winnerChatBox');
    if (!chat || chat.classList.contains('hidden')) return;

    const native = document.querySelectorAll(
      '#winnerRerollBtn, #winnerRerollFixedBtn, #winnerRerollProxyV81, #winnerRerollProxyV91, #winnerRerollProxyV92, .winner-reroll:not([data-v122-reroll]), #winnerCheckBtn, .winner-check:not([data-v122-check])'
    );

    native.forEach(el => {
      if (!el || /V122|V125/i.test(el.id || '')) return;
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('pointer-events', 'auto', 'important');
    });
  }

  // Soft guard: first click passes to existing/native handler. Only repeated clicks are blocked.
  document.addEventListener('pointerdown', function (e) {
    const btn = isRerollButtonV126(e.target);
    if (!btn) return;

    removeBadButtonArtifactsV126();

    const now = Date.now();

    if (rerollLockedV126 || now - lastRerollAtV126 < 900) {
      e.preventDefault();
      e.stopImmediatePropagation();

      if (typeof toast === 'function') toast('Реролл уже запущен');
      return;
    }

    rerollLockedV126 = true;
    lastRerollAtV126 = now;
    document.body.classList.add('v126-reroll-locked');

    // Let old/native reroll handler do the actual work.
    // Unlock after the expected wheel time, or sooner when winner appears.
    const durationSec = Math.max(1, Math.min(120, Number(
      localStorage.getItem('rostyasha_roll_duration') ||
      q('rollDurationInput')?.value ||
      6
    )));
    unlockSoonV126(durationSec * 1000 + 2500);
  }, true);

  const oldShowWinnerV126 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV126 && !window.__v126ShowWinnerWrapped) {
    window.__v126ShowWinnerWrapped = true;
    window.showWinner = function () {
      rerollLockedV126 = false;
      document.body.classList.remove('v126-reroll-locked');

      const result = oldShowWinnerV126.apply(this, arguments);

      setTimeout(keepNativeButtonsV126, 0);
      setTimeout(keepNativeButtonsV126, 250);
      setTimeout(keepNativeButtonsV126, 800);

      return result;
    };
  }

  const oldShowEliminatedV126 = window.showEliminated || (typeof showEliminated === 'function' ? showEliminated : null);
  if (oldShowEliminatedV126 && !window.__v126ShowEliminatedWrapped) {
    window.__v126ShowEliminatedWrapped = true;
    window.showEliminated = function () {
      rerollLockedV126 = false;
      document.body.classList.remove('v126-reroll-locked');
      return oldShowEliminatedV126.apply(this, arguments);
    };
  }

  // On close, reset lock and remove quote immediately.
  document.addEventListener('pointerdown', function (e) {
    const close =
      e.target.closest?.('#winnerCloseBtn') ||
      e.target.closest?.('.winner-close') ||
      e.target.closest?.('[id*="Close"]');

    if (!close) return;

    rerollLockedV126 = false;
    document.body.classList.remove('v126-reroll-locked');

    document.querySelectorAll(
      '#winnerFishQuoteV95, #winnerFishQuoteV96, #winnerFishQuoteV94, #winnerFishQuoteV87, .winner-fish-quote, [id*="FishQuote"]'
    ).forEach(el => {
      el.classList.add('hidden');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
    });
  }, true);

  // Check button: if native button exists but URL was broken, force correct followage link.
  document.addEventListener('pointerdown', function (e) {
    const btn = e.target.closest?.('#winnerCheckBtn, .winner-check, [id*="Check"], [class*="check" i]');
    if (!btn) return;

    const text = String(btn.textContent || '').toLowerCase();
    if (!text.includes('провер') && !text.includes('check')) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const winner = String(q('winnerName')?.textContent || window.state?.lastWinner?.username || '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase();

    const url = winner
      ? `https://followage.showmasterokda.com/?user=${encodeURIComponent(winner)}`
      : 'https://followage.showmasterokda.com/';

    window.open(url, '_blank', 'noopener,noreferrer');
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    removeBadButtonArtifactsV126();
    setTimeout(removeBadButtonArtifactsV126, 500);
  });

  // Very light cleanup, no 300ms flicker loop.
  setTimeout(removeBadButtonArtifactsV126, 1000);
  setTimeout(removeBadButtonArtifactsV126, 2500);

  window.__v126KeepNativeButtons = keepNativeButtonsV126;
  window.__v126RemoveBadButtonArtifacts = removeBadButtonArtifactsV126;
})();



/* v127: hard chat messages render fix */
(function () {
  let localChatV127 = [];
  let lastSignatureV127 = '';
  let lastRenderAtV127 = 0;
  let pollBusyV127 = false;

  function q(id) { return document.getElementById(id); }

  function escV127(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizeMsgV127(m) {
    if (!m) return null;

    const username = String(m.username || m.user || m.displayName || m.name || '').replace(/^@/, '').trim().toLowerCase();
    const text = String(m.text || m.message || m.msg || '').trim();
    const time = String(m.time || new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));

    if (!username && !text) return null;

    return { username, text, time };
  }

  function signatureV127(chat) {
    const last = chat[chat.length - 1];
    if (!last) return 'empty';
    return `${chat.length}|${last.time}|${last.username}|${last.text}`;
  }

  function renderChatV127(chatInput, force = false) {
    const chatList = q('chatList');
    if (!chatList) return;

    const normalized = (chatInput || []).map(normalizeMsgV127).filter(Boolean).slice(-180);
    const sig = signatureV127(normalized);

    if (!force && sig === lastSignatureV127 && Date.now() - lastRenderAtV127 < 250) return;

    localChatV127 = normalized;
    lastSignatureV127 = sig;
    lastRenderAtV127 = Date.now();

    chatList.innerHTML = normalized.length ? normalized.map(m => `
      <div class="chat-msg chat-msg-v127">
        <span class="time">[${escV127(m.time)}]</span>
        <b>${escV127(m.username)}:</b>
        <span>${escV127(m.text)}</span>
      </div>
    `).join('') : '<div class="chat-msg chat-msg-v127">Чат пока пустой</div>';

    chatList.scrollTop = chatList.scrollHeight;
  }

  function mergeChatV127(chat, forceFallbackRender = false) {
    const incoming = (chat || []).map(normalizeMsgV127).filter(Boolean).slice(-180);
    if (!incoming.length) return;

    // v486: the primary render already paints chat from every healthy WS state.
    // Keep this old layer as a fallback only, otherwise it rewrites the same DOM twice.
    if (window.__v486PrimaryChatRenderReady && !forceFallbackRender) {
      localChatV127 = incoming;
      lastSignatureV127 = signatureV127(incoming);
      return;
    }

    if (incoming.length >= localChatV127.length) {
      renderChatV127(incoming, true);
      return;
    }

    const seen = new Set(localChatV127.map(m => `${m.time}|${m.username}|${m.text}`));
    for (const m of incoming) {
      const key = `${m.time}|${m.username}|${m.text}`;
      if (!seen.has(key)) localChatV127.push(m);
    }

    localChatV127 = localChatV127.slice(-180);
    renderChatV127(localChatV127, true);
  }

  function handleWsMsgV127(msg) {
    if (!msg) return;

    if (msg.state?.chat) {
      mergeChatV127(msg.state.chat);
    }

    const payload = msg.payload || {};

    if (Array.isArray(payload.chat)) {
      mergeChatV127(payload.chat);
    }

    const single = normalizeMsgV127(payload.message || payload.chatMessage || payload);
    if (single && (msg.type === 'chat' || msg.type === 'message' || msg.type === 'chat_message' || payload.text || payload.message)) {
      mergeChatV127([...localChatV127, single]);
    }
  }

  // Wrap WebSocket constructor AFTER original monitor: listen to every WS message and force chat render.
  const NativeWSV127 = window.WebSocket;
  if (NativeWSV127 && !window.__v127WsWrapped) {
    window.__v127WsWrapped = true;

    window.WebSocket = function (...args) {
      const ws = new NativeWSV127(...args);

      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          handleWsMsgV127(msg);
        } catch {}
      });

      return ws;
    };

    window.WebSocket.prototype = NativeWSV127.prototype;
    try {
      Object.setPrototypeOf(window.WebSocket, NativeWSV127);
    } catch {}
  }

  const oldRenderV127 = window.render || (typeof render === 'function' ? render : null);
  if (oldRenderV127 && !window.__v127RenderWrapped) {
    window.__v127RenderWrapped = true;

    window.render = function (next) {
      const result = oldRenderV127.apply(this, arguments);

      if (next?.chat && !window.__v486PrimaryChatRenderReady) {
        // Fallback only. v486 primary render already preserves badges/colors and diffs the DOM.
        setTimeout(() => renderChatV127(next.chat, true), 0);
      }

      return result;
    };
  }

  async function pollChatV127() {
    // v486: do not hammer /api/chat while the authoritative WebSocket is healthy.
    if (window.ws && window.ws.readyState === WebSocket.OPEN) return;
    if (pollBusyV127) return;
    pollBusyV127 = true;

    try {
      const data = await fetch('/api/chat', { cache: 'no-store' }).then(r => r.json());
      if (data?.ok && Array.isArray(data.chat)) {
        mergeChatV127(data.chat, true);
      }
    } catch {
      // no spam
    } finally {
      pollBusyV127 = false;
    }
  }

  // Disconnected-only fallback. Healthy sessions use WS with zero duplicate chat repaints.
  korIdleIntervalV486(pollChatV127, 5000);

  document.addEventListener('DOMContentLoaded', () => {
    if (window.state?.chat) renderChatV127(window.state.chat, true);
    pollChatV127();
  });

  window.__v127RenderChat = renderChatV127;
  window.__v127PollChat = pollChatV127;
})();



/* v128: winner buttons persist after reroll, single source, no duplicate overlays */
(function () {
  let rebuildTimerV128 = null;
  let aliveTimerV128 = null;
  let rerollLockV128 = false;

  function q(id) { return document.getElementById(id); }

  function cleanV128(v) {
    return String(v || '').replace(/^@/, '').trim().toLowerCase();
  }

  function keyV128() {
    return new URLSearchParams(location.search).get('key') || localStorage.getItem('rostyasha_admin_key') || '12345';
  }

  function durationV128() {
    return Math.max(1, Math.min(120, Number(
      localStorage.getItem('rostyasha_roll_duration') ||
      q('rollDurationInput')?.value ||
      6
    )));
  }

  function modeV128() {
    return localStorage.getItem('rostyasha_roll_mode') || q('rouletteModeSelect')?.value || 'normal';
  }

  function winnerModeV128() {
    return window.__rostyashaRerollMode || localStorage.getItem('rostyasha_reroll_mode') || 'roulette';
  }

  function currentWinnerV128() {
    return cleanV128(q('winnerName')?.textContent || window.state?.lastWinner?.username || '');
  }

  function removeAllOldActionArtifactsV128() {
    // Remove only old action bars/buttons inside winner chat, except our v128 bar.
    const chat = q('winnerChatBox');
    if (!chat) return;

    chat.querySelectorAll(
      '#winnerActionsBarV122, #winnerActionsBarV125, #winnerRerollBtnV122, #winnerCheckBtnV122, #winnerActionRerollV125, #winnerActionCheckV125, [data-v122-reroll], [data-v122-check], #winnerRerollBtn, #winnerRerollFixedBtn, #winnerRerollProxyV81, #winnerRerollProxyV91, #winnerRerollProxyV92, #winnerCheckBtn, .winner-reroll, .winner-check'
    ).forEach(el => {
      if (el.closest?.('#winnerActionsBarV128')) return;
      try { el.remove(); } catch {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      }
    });

    // Also remove global broken artifacts if somehow outside chat.
    document.querySelectorAll(
      '#winnerActionsBarV122, #winnerActionsBarV125, #winnerRerollBtnV122, #winnerCheckBtnV122, #winnerActionRerollV125, #winnerActionCheckV125, [data-v122-reroll], [data-v122-check]'
    ).forEach(el => {
      try { el.remove(); } catch {}
    });
  }

  function buildButtonV128(id, text) {
    let btn = q(id);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = id;
      btn.type = 'button';
      btn.className = 'winner-btn-v128';
      btn.textContent = text;
    }
    return btn;
  }

  function ensureButtonsV128() {
    // v489: legacy v128 action-bar repair is permanently disabled.
    // It used to wake up every ~700 ms and fight the canonical v129/v487 bar,
    // which caused the two white REROLL/CHECK buttons to flash into view.
    return;
    const chat = q('winnerChatBox');
    if (!chat || chat.classList.contains('hidden')) {
      stopAliveV128();
      return;
    }

    removeAllOldActionArtifactsV128();

    let bar = q('winnerActionsBarV128');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'winnerActionsBarV128';
      bar.className = 'winner-actions-bar-v128';
    }

    const reroll = buildButtonV128('winnerBtnRerollV128', 'РЕРОЛЛ');
    const check = buildButtonV128('winnerBtnCheckV128', 'ПРОВЕРКА');

    if (!bar.contains(reroll)) bar.appendChild(reroll);
    if (!bar.contains(check)) bar.appendChild(check);

    if (!chat.contains(bar)) chat.prepend(bar);

    bar.style.setProperty('display', 'flex', 'important');
    bar.style.setProperty('visibility', 'visible', 'important');
    bar.style.setProperty('opacity', '1', 'important');
    bar.style.setProperty('pointer-events', 'auto', 'important');

    for (const btn of [reroll, check]) {
      btn.style.setProperty('display', 'inline-flex', 'important');
      btn.style.setProperty('visibility', 'visible', 'important');
      btn.style.setProperty('opacity', '1', 'important');
      btn.style.setProperty('pointer-events', 'auto', 'important');
      btn.disabled = false;
    }

    startAliveV128();
  }

  function startAliveV128() {
    if (aliveTimerV128) return;

    // Only while winner chat exists. This is not flicker-causing: it doesn't delete/recreate our buttons.
    aliveTimerV128 = setInterval(() => {
      const chat = q('winnerChatBox');
      if (!chat || chat.classList.contains('hidden')) {
        stopAliveV128();
        return;
      }

      const bar = q('winnerActionsBarV128');
      if (!bar || !q('winnerBtnRerollV128') || !q('winnerBtnCheckV128')) {
        ensureButtonsV128();
        return;
      }

      bar.style.setProperty('display', 'flex', 'important');
      bar.style.setProperty('visibility', 'visible', 'important');
      bar.style.setProperty('opacity', '1', 'important');
    }, 700);
  }

  function stopAliveV128() {
    if (aliveTimerV128) {
      clearInterval(aliveTimerV128);
      aliveTimerV128 = null;
    }
  }

  function scheduleEnsureV128() {
    clearTimeout(rebuildTimerV128);
    ensureButtonsV128();
    setTimeout(ensureButtonsV128, 150);
    setTimeout(ensureButtonsV128, 550);
    setTimeout(ensureButtonsV128, 1200);
    rebuildTimerV128 = setTimeout(ensureButtonsV128, 2200);
  }

  function hideWinnerUiForRerollV128() {
    q('winnerBox')?.classList.add('hidden');
    q('winnerChatBox')?.classList.add('hidden');

    document.querySelectorAll(
      '#winnerFishQuoteV95, #winnerFishQuoteV96, #winnerFishQuoteV94, #winnerFishQuoteV87, .winner-fish-quote, [id*="FishQuote"]'
    ).forEach(el => {
      el.classList.add('hidden');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
    });

    stopAliveV128();
  }

  async function cmdV128(type, params = {}) {
    const qs = new URLSearchParams({ key: keyV128() });
    Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));

    const res = await fetch(`/api/cmd/${encodeURIComponent(type)}?${qs.toString()}`, {
      method: 'GET',
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));

    if (data.state) {
      window.state = data.state;
      if (typeof render === 'function') render(data.state);
    }

    return data;
  }

  async function rerollV128() {
    if (rerollLockV128) {
      if (typeof toast === 'function') toast('Реролл уже запущен');
      return;
    }

    rerollLockV128 = true;

    const mode = winnerModeV128();
    const durationSec = durationV128();

    try {
      hideWinnerUiForRerollV128();

      if (mode === 'quick') {
        await cmdV128('quick_roll');
        setTimeout(() => {
          rerollLockV128 = false;
          scheduleEnsureV128();
        }, 800);
        return;
      }

      // roulette reroll
      const rollMode = modeV128();
      const durationMs = durationSec * 1000;

      const names = (window.state?.participants || []).slice();
      if (typeof showVisual === 'function') showVisual('rollingBox');
      if (typeof startRolling === 'function') {
        startRolling({
          mode: rollMode === 'elimination' ? 'elimination' : 'normal',
          names,
          durationMs
        });
      }

      await cmdV128('roll', { mode: rollMode, durationSec });

      setTimeout(() => {
        rerollLockV128 = false;
        scheduleEnsureV128();
      }, Math.max(1000, durationMs + 900));
    } catch (e) {
      console.warn('[v128 reroll]', e);
      rerollLockV128 = false;
      if (typeof toast === 'function') toast('Ошибка реролла');
      scheduleEnsureV128();
    }
  }

  function checkV128() {
    const winner = currentWinnerV128();
    const url = winner
      ? `https://followage.showmasterokda.com/?user=${encodeURIComponent(winner)}`
      : 'https://followage.showmasterokda.com/';
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  document.addEventListener('pointerdown', function (e) {
    const r = e.target.closest?.('#winnerBtnRerollV128');
    const c = e.target.closest?.('#winnerBtnCheckV128');

    if (!r && !c) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (r) rerollV128();
    if (c) checkV128();
  }, true);

  document.addEventListener('click', function (e) {
    const btn = e.target.closest?.('#winnerBtnRerollV128, #winnerBtnCheckV128');
    if (!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  // Block old hidden/removed reroll/check handlers if old nodes somehow appear.
  document.addEventListener('pointerdown', function (e) {
    const old = e.target.closest?.(
      '#winnerRerollBtn, #winnerRerollFixedBtn, #winnerRerollProxyV81, #winnerRerollProxyV91, #winnerRerollProxyV92, #winnerCheckBtn, .winner-reroll, .winner-check'
    );
    if (!old || old.closest?.('#winnerActionsBarV128')) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const txt = String(old.textContent || '').toLowerCase();
    if (txt.includes('реролл') || txt.includes('reroll')) rerollV128();
    else if (txt.includes('провер') || txt.includes('check')) checkV128();
  }, true);

  const oldShowWinnerV128 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV128 && !window.__v128ShowWinnerWrapped) {
    window.__v128ShowWinnerWrapped = true;
    window.showWinner = function () {
      rerollLockV128 = false;
      const result = oldShowWinnerV128.apply(this, arguments);
      scheduleEnsureV128();
      return result;
    };
  }

  document.addEventListener('pointerdown', function (e) {
    const close =
      e.target.closest?.('#winnerCloseBtn') ||
      e.target.closest?.('.winner-close') ||
      e.target.closest?.('[id*="Close"]');

    if (!close) return;

    stopAliveV128();
    rerollLockV128 = false;

    const bar = q('winnerActionsBarV128');
    if (bar) {
      bar.style.setProperty('display', 'none', 'important');
      bar.style.setProperty('visibility', 'hidden', 'important');
      bar.style.setProperty('opacity', '0', 'important');
      bar.style.setProperty('pointer-events', 'none', 'important');
    }
  }, true);

  // Override old exported helpers so they cannot resurrect broken buttons.
  window.__v122EnsureWinnerButtons = ensureButtonsV128;
  window.__v123RemoveDuplicateButtons = removeAllOldActionArtifactsV128;
  window.__v124StabilizeRealButtons = ensureButtonsV128;
  window.__v125EnsureWinnerBar = ensureButtonsV128;
  window.__v128EnsureButtons = ensureButtonsV128;
})();



/* v129: exactly two winner buttons + force wheel on roulette reroll */
(function () {
  let lockV129 = false;
  let wheelGuardV129 = null;

  function q(id) { return document.getElementById(id); }

  function adminKeyV129() {
    return new URLSearchParams(location.search).get('key') || localStorage.getItem('rostyasha_admin_key') || '12345';
  }

  function cleanV129(v) {
    return String(v || '').replace(/^@/, '').trim().toLowerCase();
  }

  function durationV129() {
    return Math.max(1, Math.min(120, Number(
      localStorage.getItem('rostyasha_roll_duration') ||
      q('rollDurationInput')?.value ||
      6
    )));
  }

  function rollModeV129() {
    return localStorage.getItem('rostyasha_roll_mode') || q('rouletteModeSelect')?.value || 'normal';
  }

  function winnerModeV129() {
    return window.__rostyashaRerollMode || localStorage.getItem('rostyasha_reroll_mode') || 'roulette';
  }

  function currentWinnerV129() {
    return cleanV129(q('winnerName')?.textContent || window.state?.lastWinner?.username || '');
  }

  async function cmdV129(type, params = {}) {
    const qs = new URLSearchParams({ key: adminKeyV129() });
    Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));

    const res = await fetch(`/api/cmd/${encodeURIComponent(type)}?${qs.toString()}`, {
      method: 'GET',
      cache: 'no-store'
    });

    const data = await res.json().catch(() => ({}));

    if (data.state) {
      window.state = data.state;
      if (typeof render === 'function') render(data.state);
    }

    return data;
  }

  function removeThirdButtonsV129() {
    const chat = q('winnerChatBox');
    if (!chat) return;

    chat.querySelectorAll('button, a, [role="button"], div').forEach(el => {
      if (!el) return;
      if (el.closest?.('#winnerActionsBarV129')) return;

      const txt = String(el.textContent || '').trim().toLowerCase();
      const idc = `${el.id || ''} ${el.className || ''}`.toLowerCase();

      const isWinnerAction =
        txt === 'реролл' ||
        txt === 'проверка' ||
        txt.includes('реролл') ||
        txt.includes('проверка') ||
        idc.includes('reroll') ||
        idc.includes('check') ||
        idc.includes('winneraction') ||
        idc.includes('winner-action') ||
        idc.includes('v122') ||
        idc.includes('v125') ||
        idc.includes('v128');

      if (isWinnerAction) {
        try { el.remove(); } catch {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('opacity', '0', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
        }
      }
    });

    document.querySelectorAll(
      '#winnerActionsBarV122, #winnerActionsBarV125, #winnerActionsBarV128, #winnerRerollBtnV122, #winnerCheckBtnV122, #winnerActionRerollV125, #winnerActionCheckV125, #winnerBtnRerollV128, #winnerBtnCheckV128, [data-v122-reroll], [data-v122-check]'
    ).forEach(el => {
      if (el.closest?.('#winnerActionsBarV129')) return;
      try { el.remove(); } catch {}
    });
  }

  function makeBtnV129(id, text) {
    let btn = q(id);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = id;
      btn.type = 'button';
      btn.className = 'winner-btn-v129';
      btn.textContent = text;
    }
    return btn;
  }

  function ensureTwoButtonsV129() {
    const chat = q('winnerChatBox');
    if (!chat || chat.classList.contains('hidden')) return;

    removeThirdButtonsV129();

    let bar = q('winnerActionsBarV129');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'winnerActionsBarV129';
      bar.className = 'winner-actions-bar-v129';
    }

    const reroll = makeBtnV129('winnerReasonBtnV487', 'РЕРОЛЛ');
    const check = makeBtnV129('winnerBtnCheckV129', 'ПРОВЕРКА');
    const save = makeBtnV129('winnerSaveBtn', 'СОХРАНИТЬ');
    const sites = makeBtnV129('winnerSitesBtn', 'САЙТЫ');
    save.classList.add('winner-save');
    sites.classList.add('winner-sites');

    bar.innerHTML = '';
    bar.appendChild(reroll);
    bar.appendChild(check);
    bar.appendChild(sites);
    bar.appendChild(save);

    if (!chat.contains(bar)) chat.prepend(bar);

    bar.style.setProperty('display', 'flex', 'important');
    bar.style.setProperty('visibility', 'visible', 'important');
    bar.style.setProperty('opacity', '1', 'important');
    bar.style.setProperty('pointer-events', 'auto', 'important');

    for (const btn of [reroll, check, save, sites]) {
      btn.style.setProperty('display', 'inline-flex', 'important');
      btn.style.setProperty('visibility', 'visible', 'important');
      btn.style.setProperty('opacity', '1', 'important');
      btn.style.setProperty('pointer-events', 'auto', 'important');
      btn.disabled = false;
    }
  }

  function hideWinnerUiV129() {
    q('winnerBox')?.classList.add('hidden');
    q('winnerChatBox')?.classList.add('hidden');

    document.querySelectorAll(
      '#winnerFishQuoteV95, #winnerFishQuoteV96, #winnerFishQuoteV94, #winnerFishQuoteV87, .winner-fish-quote, [id*="FishQuote"]'
    ).forEach(el => {
      el.classList.add('hidden');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
    });
  }

  function forceWheelV129() {
    const wrap =
      q('rouletteWheelWrap') ||
      document.querySelector('.roulette-wheel-wrap') ||
      document.querySelector('[id*="WheelWrap"]');

    const wheel =
      q('rouletteWheel') ||
      document.querySelector('.roulette-wheel') ||
      document.querySelector('.wheel') ||
      document.querySelector('[id*="rouletteWheel"]');

    if (typeof showVisual === 'function') {
      try { showVisual('rollingBox'); } catch {}
    }

    document.body.classList.add('v129-rerolling-wheel');

    if (wrap) {
      wrap.classList.remove('hidden');
      wrap.style.setProperty('display', 'block', 'important');
      wrap.style.setProperty('visibility', 'visible', 'important');
      wrap.style.setProperty('opacity', '1', 'important');
    }

    if (wheel) {
      wheel.classList.remove('hidden');
      wheel.style.setProperty('display', 'block', 'important');
      wheel.style.setProperty('visibility', 'visible', 'important');
      wheel.style.setProperty('opacity', '1', 'important');
    }
  }

  function startWheelGuardV129(ms) {
    if (wheelGuardV129) clearInterval(wheelGuardV129);

    const started = Date.now();
    const total = Math.max(1600, Number(ms || 6000) + 1600);

    forceWheelV129();

    wheelGuardV129 = setInterval(() => {
      // v517: completed reroll means winner UI is now the only active surface.
      if (q('winnerBox') && !q('winnerBox').classList.contains('hidden')) {
        stopWheelGuardV129();
        const wrap=q('rouletteWheelWrap');
        wrap?.classList.add('hidden');
        wrap?.style.removeProperty('display');
        return;
      }
      if (Date.now() - started > total) {
        clearInterval(wheelGuardV129);
        wheelGuardV129 = null;
        document.body.classList.remove('v129-rerolling-wheel');
        return;
      }
      forceWheelV129();
    }, 100);
  }

  function stopWheelGuardV129() {
    if (wheelGuardV129) {
      clearInterval(wheelGuardV129);
      wheelGuardV129 = null;
    }
    document.body.classList.remove('v129-rerolling-wheel');
  }

  async function rerollV129() {
    if (lockV129) {
      if (typeof toast === 'function') toast('Реролл уже запущен');
      return;
    }

    lockV129 = true;

    const mode = winnerModeV129();
    const dur = durationV129();
    const durMs = dur * 1000;

    try {
      hideWinnerUiV129();

      if (mode === 'quick') {
        await cmdV129('quick_roll');

        setTimeout(() => {
          lockV129 = false;
          ensureTwoButtonsV129();
        }, 800);
        return;
      }

      const rm = rollModeV129();
      const names = (window.state?.participants || []).slice();

      startWheelGuardV129(durMs);

      if (typeof startRolling === 'function') {
        try {
          startRolling({
            mode: rm === 'elimination' ? 'elimination' : 'normal',
            names,
            durationMs: durMs
          });
        } catch (e) {
          console.warn('[v129 startRolling]', e);
        }
      }

      await cmdV129('roll', { mode: rm, durationSec: dur });

      setTimeout(() => {
        lockV129 = false;
        stopWheelGuardV129();
        ensureTwoButtonsV129();
      }, Math.max(1200, durMs + 1200));
    } catch (e) {
      console.warn('[v129 reroll]', e);
      lockV129 = false;
      stopWheelGuardV129();
      ensureTwoButtonsV129();
      if (typeof toast === 'function') toast('Ошибка реролла');
    }
  }

  function checkV129() {
    const winner = currentWinnerV129();
    const url = winner
      ? `https://followage.showmasterokda.com/?user=${encodeURIComponent(winner)}`
      : 'https://followage.showmasterokda.com/';

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  document.addEventListener('pointerdown', function (e) {
    const reroll = e.target.closest?.('#winnerReasonBtnV487');
    const check = e.target.closest?.('#winnerBtnCheckV129');

    if (!reroll && !check) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (reroll) {
      if (typeof window.__v484RequestReroll === 'function') window.__v484RequestReroll(rerollV129);
      else rerollV129();
    }
    if (check) checkV129();
  }, true);

  document.addEventListener('click', function (e) {
    const btn = e.target.closest?.('#winnerReasonBtnV487, #winnerBtnCheckV129');
    if (!btn) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  const oldShowWinnerV129 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV129 && !window.__v129ShowWinnerWrapped) {
    window.__v129ShowWinnerWrapped = true;
    window.showWinner = function () {
      lockV129 = false;
      stopWheelGuardV129();

      const result = oldShowWinnerV129.apply(this, arguments);

      setTimeout(ensureTwoButtonsV129, 0);
      setTimeout(ensureTwoButtonsV129, 180);
      setTimeout(ensureTwoButtonsV129, 700);
      setTimeout(ensureTwoButtonsV129, 1400);

      return result;
    };
  }

  document.addEventListener('pointerdown', function (e) {
    const close =
      e.target.closest?.('#winnerCloseBtn') ||
      e.target.closest?.('.winner-close') ||
      e.target.closest?.('[id*="Close"]');

    if (!close) return;

    lockV129 = false;
    stopWheelGuardV129();

    const bar = q('winnerActionsBarV129');
    if (bar) {
      bar.style.setProperty('display', 'none', 'important');
      bar.style.setProperty('visibility', 'hidden', 'important');
      bar.style.setProperty('opacity', '0', 'important');
      bar.style.setProperty('pointer-events', 'none', 'important');
    }
  }, true);

  // Override older helpers to prevent old bars from coming back.
  window.__v122EnsureWinnerButtons = ensureTwoButtonsV129;
  window.__v123RemoveDuplicateButtons = removeThirdButtonsV129;
  window.__v124StabilizeRealButtons = ensureTwoButtonsV129;
  window.__v125EnsureWinnerBar = ensureTwoButtonsV129;
  window.__v128EnsureButtons = ensureTwoButtonsV129;
  window.__v129EnsureTwoButtons = ensureTwoButtonsV129;
})();



/* v130: remove old winner buttons before they can visually blink */
(function () {
  function q(id) { return document.getElementById(id); }

  function killOldButtonsV130(root = document) {
    const chat = q('winnerChatBox');
    if (!chat) return;

    chat.querySelectorAll('button, a[role="button"], [role="button"]').forEach(el => {
      if (el.id === 'winnerReasonBtnV487' || el.id === 'winnerBtnCheckV129' || el.id === 'winnerSaveBtn' || el.id === 'winnerSitesBtn') return;
      if (el.closest?.('#winnerActionsBarV129')) return;

      const txt = String(el.textContent || '').trim().toLowerCase();
      const idc = `${el.id || ''} ${el.className || ''}`.toLowerCase();

      const looksLikeOldAction =
        txt.includes('реролл') ||
        txt.includes('проверка') ||
        txt.includes('reroll') ||
        txt.includes('check') ||
        idc.includes('reroll') ||
        idc.includes('check') ||
        idc.includes('winner');

      if (looksLikeOldAction) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        try { el.remove(); } catch {}
      }
    });
  }

  const oldEnsureV130 = window.__v129EnsureTwoButtons;
  window.__v129EnsureTwoButtons = function () {
    killOldButtonsV130();
    if (typeof oldEnsureV130 === 'function') oldEnsureV130();
    killOldButtonsV130();
  };

  const observerV130 = new MutationObserver((mutations) => {
    let need = false;
    for (const m of mutations) {
      for (const n of m.addedNodes || []) {
        if (n.nodeType !== 1) continue;
        if (
          n.matches?.('button, a[role="button"], [role="button"]') ||
          n.querySelector?.('button, a[role="button"], [role="button"]')
        ) {
          need = true;
          break;
        }
      }
      if (need) break;
    }
    if (need) {
      killOldButtonsV130();
      requestAnimationFrame(killOldButtonsV130);
    }
  });

  if (document.body) {
    try { observerV130.observe(document.body, { childList: true, subtree: true }); } catch {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    killOldButtonsV130();
    try { observerV130.observe(document.body, { childList: true, subtree: true }); } catch {}
  });

  const oldShowWinnerV130 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV130 && !window.__v130ShowWinnerWrapped) {
    window.__v130ShowWinnerWrapped = true;
    window.showWinner = function () {
      killOldButtonsV130();
      const result = oldShowWinnerV130.apply(this, arguments);
      killOldButtonsV130();
      setTimeout(killOldButtonsV130, 0);
      setTimeout(killOldButtonsV130, 80);
      setTimeout(killOldButtonsV130, 250);
      return result;
    };
  }

  window.__v130KillOldButtons = killOldButtonsV130;
})();



/* v131: prevent winner buttons teleport/jump */
(function () {
  function q(id) { return document.getElementById(id); }

  function prepareButtonSlotV131() {
    const chat = q('winnerChatBox');
    if (!chat) return;

    chat.classList.add('winner-chat-v131-slot');

    let slot = q('winnerActionsSlotV131');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'winnerActionsSlotV131';
      slot.className = 'winner-actions-slot-v131';
    }

    let bar = q('winnerActionsBarV129');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'winnerActionsBarV129';
      bar.className = 'winner-actions-bar-v129';
    }

    let reroll = q('winnerReasonBtnV487');
    if (!reroll) {
      reroll = document.createElement('button');
      reroll.id = 'winnerReasonBtnV487';
      reroll.type = 'button';
      reroll.className = 'winner-btn-v129';
      reroll.textContent = 'РЕРОЛЛ';
    }

    let check = q('winnerBtnCheckV129');
    if (!check) {
      check = document.createElement('button');
      check.id = 'winnerBtnCheckV129';
      check.type = 'button';
      check.className = 'winner-btn-v129';
      check.textContent = 'ПРОВЕРКА';
    }

    let sites = q('winnerSitesBtn');
    if (!sites) {
      sites = document.createElement('button');
      sites.id = 'winnerSitesBtn';
      sites.type = 'button';
      sites.className = 'winner-btn-v129 winner-sites';
      sites.textContent = 'САЙТЫ';
    }

    if (!bar.contains(reroll)) bar.appendChild(reroll);
    if (!bar.contains(check)) bar.appendChild(check);
    if (!bar.contains(sites)) bar.appendChild(sites);
    if (!slot.contains(bar)) slot.appendChild(bar);

    // Insert slot once at the top. After this, do not prepend bar directly anymore.
    if (chat.firstElementChild !== slot) {
      chat.insertBefore(slot, chat.firstChild);
    }

    slot.style.setProperty('display', 'flex', 'important');
    slot.style.setProperty('visibility', 'visible', 'important');
    slot.style.setProperty('opacity', '1', 'important');

    bar.style.setProperty('display', 'flex', 'important');
    bar.style.setProperty('visibility', 'visible', 'important');
    bar.style.setProperty('opacity', '1', 'important');
    bar.style.setProperty('pointer-events', 'auto', 'important');
  }

  function stabilizeButtonsV131() {
    prepareButtonSlotV131();

    const bar = q('winnerActionsBarV129');
    const slot = q('winnerActionsSlotV131');
    const reroll = q('winnerReasonBtnV487');
    const check = q('winnerBtnCheckV129');
    const save = q('winnerSaveBtn');
    const sites = q('winnerSitesBtn');

    if (!bar || !slot) return;

    // No teleport: keep bar in the reserved slot, never absolute/prepend to other places.
    if (!slot.contains(bar)) slot.appendChild(bar);

    for (const btn of [reroll, check, save, sites]) {
      if (!btn) continue;
      btn.style.setProperty('display', 'inline-flex', 'important');
      btn.style.setProperty('visibility', 'visible', 'important');
      btn.style.setProperty('opacity', '1', 'important');
      btn.style.setProperty('pointer-events', 'auto', 'important');
      btn.disabled = false;
    }
  }

  const oldEnsureV131 = window.__v129EnsureTwoButtons;
  window.__v129EnsureTwoButtons = function () {
    prepareButtonSlotV131();
    if (typeof oldEnsureV131 === 'function') oldEnsureV131();
    // Old function may move bar; pull it back instantly before paint.
    stabilizeButtonsV131();
    requestAnimationFrame(stabilizeButtonsV131);
  };

  const oldKillV131 = window.__v130KillOldButtons;
  window.__v130KillOldButtons = function () {
    if (typeof oldKillV131 === 'function') oldKillV131();
    stabilizeButtonsV131();
  };

  const oldShowWinnerV131 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV131 && !window.__v131ShowWinnerWrapped) {
    window.__v131ShowWinnerWrapped = true;
    window.showWinner = function () {
      // Prepare while winner UI is still being built, so buttons already have final place.
      prepareButtonSlotV131();

      const result = oldShowWinnerV131.apply(this, arguments);

      stabilizeButtonsV131();
      requestAnimationFrame(stabilizeButtonsV131);
      setTimeout(stabilizeButtonsV131, 80);
      setTimeout(stabilizeButtonsV131, 220);

      return result;
    };
  }

  // If any old script moves the bar, move it back to the slot without visible jump.
  const obsV131 = new MutationObserver(() => {
    const chat = q('winnerChatBox');
    if (!chat || chat.classList.contains('hidden')) return;

    requestAnimationFrame(stabilizeButtonsV131);
  });

  document.addEventListener('DOMContentLoaded', () => {
    prepareButtonSlotV131();
    try { obsV131.observe(document.body, { childList: true, subtree: true }); } catch {}
  });

  if (document.body) {
    prepareButtonSlotV131();
    try { obsV131.observe(document.body, { childList: true, subtree: true }); } catch {}
  }

  window.__v131PrepareButtonSlot = prepareButtonSlotV131;
  window.__v131StabilizeButtons = stabilizeButtonsV131;
})();



/* v133: disable broken v132 preparation if mixed cache loads old code */
(function () {
  if (window.__v132PrepareAndRevealButtons) {
    window.__v132PrepareAndRevealButtons = function () {};
  }
  document.body?.classList.remove('v132-buttons-preparing');
  document.body?.classList.add('v132-buttons-ready');
})();



/* v134: make winner UI appear as one unit */
(function () {
  function q(id) { return document.getElementById(id); }

  const oldShowWinnerV134 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV134 && !window.__v134ShowWinnerWrapped) {
    window.__v134ShowWinnerWrapped = true;
    window.showWinner = function () {
      const result = oldShowWinnerV134.apply(this, arguments);

      // Remove broken v132 states and force buttons to be ready immediately.
      document.body.classList.remove('v132-buttons-preparing');
      document.body.classList.add('v132-buttons-ready');

      const stabilize = window.__v131StabilizeButtons || window.__v129EnsureTwoButtons;
      if (typeof stabilize === 'function') {
        try { stabilize(); } catch {}
      }

      // Restart smooth animation cleanly once, not in loops.
      for (const id of ['winnerBox', 'winnerChatBox']) {
        const el = q(id);
        if (!el || el.classList.contains('hidden')) continue;
        el.classList.remove('v134-appear');
        void el.offsetWidth;
        el.classList.add('v134-appear');
      }

      return result;
    };
  }
})();



/* v135: no button blink, smoother stable state */
(function () {
  function q(id) { return document.getElementById(id); }

  function killButtonMotionV135() {
    const ids = ['winnerActionsSlotV131', 'winnerActionsBarV129', 'winnerReasonBtnV487', 'winnerBtnCheckV129', 'winnerSaveBtn', 'winnerSitesBtn'];
    for (const id of ids) {
      const el = q(id);
      if (!el) continue;
      el.style.setProperty('animation', 'none', 'important');
      el.style.setProperty('transition', 'none', 'important');
      el.style.setProperty('filter', 'none', 'important');
      el.style.setProperty('opacity', '1', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('transform', 'none', 'important');
    }
  }

  function smoothWinnerV135() {
    document.body.classList.remove('v132-buttons-preparing');
    document.body.classList.add('v132-buttons-ready');

    const stabilize = window.__v131StabilizeButtons || window.__v129EnsureTwoButtons;
    if (typeof stabilize === 'function') {
      try { stabilize(); } catch {}
    }

    killButtonMotionV135();

    for (const id of ['winnerBox', 'winnerChatBox']) {
      const el = q(id);
      if (!el || el.classList.contains('hidden')) continue;

      el.classList.remove('v135-stable');
      // Restart only panel animation, not button animation.
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.removeProperty('animation');

      setTimeout(() => {
        el.classList.add('v135-stable');
      }, 650);
    }

    // Old scripts may touch buttons shortly after winner render. Force static, but only a few times.
    requestAnimationFrame(killButtonMotionV135);
    setTimeout(killButtonMotionV135, 40);
    setTimeout(killButtonMotionV135, 120);
    setTimeout(killButtonMotionV135, 260);
  }

  const oldShowWinnerV135 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV135 && !window.__v135ShowWinnerWrapped) {
    window.__v135ShowWinnerWrapped = true;
    window.showWinner = function () {
      const result = oldShowWinnerV135.apply(this, arguments);
      smoothWinnerV135();
      return result;
    };
  }

  const oldEnsureV135 = window.__v129EnsureTwoButtons;
  if (typeof oldEnsureV135 === 'function' && !window.__v135EnsureWrapped) {
    window.__v135EnsureWrapped = true;
    window.__v129EnsureTwoButtons = function () {
      const result = oldEnsureV135.apply(this, arguments);
      killButtonMotionV135();
      return result;
    };
  }

  window.__v135KillButtonMotion = killButtonMotionV135;
})();



/* v145: tag left control panel only, no modal positioning changes */
(function () {
  function tagLeftPanelV145() {
    const candidates = [
      document.querySelector('.sidebar'),
      document.querySelector('.left-panel'),
      document.querySelector('#leftPanel'),
      document.querySelector('aside:first-of-type'),
      document.querySelector('.app > aside:first-child'),
      document.querySelector('.app > div:first-child'),
      document.querySelector('main > div:first-child'),
      document.body?.firstElementChild
    ].filter(Boolean);

    for (const el of candidates) {
      const text = String(el.textContent || '').toLowerCase();
      if (
        text.includes('сброс участников') ||
        text.includes('быстрый ролл') ||
        text.includes('watchtime') ||
        text.includes('sms top') ||
        text.includes('только не')
      ) {
        el.classList.add('v145-left-carpet');
        return;
      }
    }
  }

  if (document.body) tagLeftPanelV145();
  document.addEventListener('DOMContentLoaded', tagLeftPanelV145);
  setTimeout(tagLeftPanelV145, 300);
})();



/* v150: tag ONLY left block and two right blocks for dark overlay */
(function () {
  function tagV150() {
    const all = Array.from(document.body.querySelectorAll('body *'));

    // Left block: the one with control buttons.
    for (const el of all) {
      const text = String(el.textContent || '').toLowerCase();
      const r = el.getBoundingClientRect();
      if (
        r.width > 90 &&
        r.height > 300 &&
        r.left < window.innerWidth * 0.18 &&
        (
          text.includes('сброс участников') ||
          text.includes('быстрый ролл') ||
          text.includes('watchtime top') ||
          text.includes('sms top') ||
          text.includes('старт / пауза')
        )
      ) {
        el.classList.add('v150-left-darken');
        break;
      }
    }

    // Right blocks: winners and blacklist blocks.
    for (const el of all) {
      const text = String(el.textContent || '').toLowerCase();
      const r = el.getBoundingClientRect();
      if (
        r.width > 120 &&
        r.height > 80 &&
        r.left > window.innerWidth * 0.72 &&
        (
          text.includes('последние выигравшие') ||
          text.includes('чёрный список') ||
          text.includes('черный список')
        )
      ) {
        el.classList.add('v150-right-darken');
      }
    }
  }

  if (document.body) tagV150();
  document.addEventListener('DOMContentLoaded', tagV150);
  setTimeout(tagV150, 300);
  setTimeout(tagV150, 1000);
})();



/* v151: honest watchtime wording */
(function () {
  function renameWatchtimeLabelsV151(root) {
    const nodes = Array.from((root || document).querySelectorAll('*'));
    for (const el of nodes) {
      if (!el || el.children.length) continue;
      const t = el.textContent || '';
      if (t.includes('Смотрит стрим уже')) el.textContent = t.replace('Смотрит стрим уже', 'Активность на стриме');
      if (t.includes('Время просмотра')) el.textContent = t.replace('Время просмотра', 'Активность на стриме');
      if (t.trim() === 'Watchtime') el.textContent = 'Активность';
    }
  }

  document.addEventListener('DOMContentLoaded', () => renameWatchtimeLabelsV151(document));
  korIdleIntervalV486(() => renameWatchtimeLabelsV151(document), 5000);
})();



/* v152: Top-3 active users widget + winner bonus badge */
(function () {
  const TOP_ACTIVE_API_V152 = '/api/top-active?limit=3';

  function formatTopNameV152(u) {
    return String(u?.username || u?.name || '—');
  }

  function formatMessagesV152(u) {
    const n = Number(u?.messages || 0);
    return `${n} смс`;
  }

  function findLeftPanelV152() {
    const candidates = [
      document.querySelector('.v150-left-darken'),
      document.querySelector('.v145-left-carpet'),
      document.querySelector('.sidebar'),
      document.querySelector('.left-panel'),
      document.querySelector('#leftPanel'),
      document.querySelector('.controls'),
      document.querySelector('.controls-panel'),
      document.querySelector('.admin-panel'),
      document.querySelector('aside:first-of-type'),
      document.querySelector('.app > aside:first-child'),
      document.querySelector('.app > div:first-child'),
      document.querySelector('main > div:first-child')
    ].filter(Boolean);

    for (const el of candidates) {
      const text = String(el.textContent || '').toLowerCase();
      const r = el.getBoundingClientRect();
      if (
        r.height > 250 &&
        (
          text.includes('сброс участников') ||
          text.includes('быстрый ролл') ||
          text.includes('watchtime') ||
          text.includes('активность') ||
          text.includes('sms top') ||
          text.includes('старт / пауза')
        )
      ) {
        return el;
      }
    }

    return candidates[0] || null;
  }

  function ensureTopActiveWidgetV152() {
    let box = document.getElementById('topActiveV152');
    if (box) return box;

    const left = findLeftPanelV152();
    if (!left) return null;

    box = document.createElement('div');
    box.id = 'topActiveV152';
    box.className = 'top-active-v152';
    box.innerHTML = `
      <div class="top-active-v152-title">ТОП-3 АКТИВНЫХ</div>
      <div class="top-active-v152-sub">Бонус при победе: <b>+$5 к депозиту</b></div>
      <div class="top-active-v152-list">
        <div class="top-active-v152-empty">Пока нет активности</div>
      </div>
    `;

    // Put it after timer/actions if possible, otherwise append.
    left.appendChild(box);
    return box;
  }

  function renderTopActiveV152(users) {
    const box = ensureTopActiveWidgetV152();
    if (!box) return;

    const list = box.querySelector('.top-active-v152-list');
    if (!list) return;

    const arr = Array.isArray(users) ? users.slice(0, 3) : [];
    if (!arr.length) {
      list.innerHTML = '<div class="top-active-v152-empty">Пока нет активности</div>';
      return;
    }

    list.innerHTML = arr.map((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      return `
        <div class="top-active-v152-row" data-user="${String(formatTopNameV152(u)).toLowerCase()}">
          <span class="top-active-v152-rank">${medal}</span>
          <span class="top-active-v152-name">${formatTopNameV152(u)}</span>
          <span class="top-active-v152-msgs">${formatMessagesV152(u)}</span>
        </div>
      `;
    }).join('');
  }

  async function fetchTopActiveV152() {
    try {
      const res = await fetch(TOP_ACTIVE_API_V152, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      renderTopActiveV152(data.users || []);
      window.__topActiveV152 = data.users || [];
    } catch (e) {}
  }

  function getWinnerNickFromDomV152() {
    const candidates = [
      document.querySelector('#winnerName'),
      document.querySelector('.winner-name'),
      document.querySelector('[data-winner-name]'),
      document.querySelector('#winnerBox .name'),
      document.querySelector('#winnerBox h1'),
      document.querySelector('#winnerBox h2'),
      document.querySelector('.winner-box h1'),
      document.querySelector('.winner-box h2')
    ].filter(Boolean);

    for (const el of candidates) {
      const t = String(el.textContent || '').trim();
      if (!t) continue;
      const clean = t
        .replace(/победитель/ig, '')
        .replace(/winner/ig, '')
        .replace(/[:!🔥🏆]/g, '')
        .trim();
      if (clean && clean.length <= 32) return clean.replace(/^@/, '');
    }

    return '';
  }

  function markWinnerTop3V152(winnerNick) {
    const nick = String(winnerNick || getWinnerNickFromDomV152() || '').replace(/^@/, '').trim().toLowerCase();
    if (!nick) return;

    const top = Array.isArray(window.__topActiveV152) ? window.__topActiveV152 : [];
    const hit = top.find((u) => String(u.username || u.name || '').toLowerCase() === nick);
    if (!hit) return;

    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    if (!winnerBox) return;

    let badge = document.getElementById('winnerTop3BadgeV152');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'winnerTop3BadgeV152';
      badge.className = 'winner-top3-badge-v152';
      const first = winnerBox.querySelector('.winner-actions, .winner-buttons, button') || null;
      if (first && first.parentElement === winnerBox) {
        winnerBox.insertBefore(badge, first);
      } else {
        winnerBox.appendChild(badge);
      }
    }

    badge.textContent = `🔥 ТОП-${hit.rank || 3} АКТИВНЫХ — +$5 к депозиту`;
    badge.style.display = '';
  }

  function clearWinnerTop3BadgeV152() {
    const badge = document.getElementById('winnerTop3BadgeV152');
    if (badge) {
      badge.style.display = 'none';
      badge.textContent = '';
    }
  }

  // Hook common websocket/event handlers without breaking old logic.
  const originalDispatchEventV152 = window.dispatchEvent;
  document.addEventListener('DOMContentLoaded', () => {
    if (window.__KOR_FINAL_TOP3_V168__) return;
    ensureTopActiveWidgetV152();
    fetchTopActiveV152();
    korIdleIntervalV486(fetchTopActiveV152, 5000);
  });

  // Patch WebSocket message listeners by listening to custom data if app broadcasts into window.
  window.addEventListener('message', (ev) => {
    const data = ev?.data || {};
    if (data.type === 'topActiveUpdate') {
      renderTopActiveV152(data.users || []);
      window.__topActiveV152 = data.users || [];
    }
    if (data.type === 'winner') {
      setTimeout(() => markWinnerTop3V152(data.username || data.name || data.winner?.username || data.winner?.name), 250);
    }
  });

  // Poll DOM after winner appears. Cheap and safe.
  let lastWinnerVisibleV152 = false;
  korIdleIntervalV486(() => {
    if (window.__KOR_FINAL_TOP3_V168__) return;
    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    const visible = !!winnerBox && getComputedStyle(winnerBox).display !== 'none' && !winnerBox.classList.contains('hidden') && winnerBox.offsetParent !== null;
    if (visible) markWinnerTop3V152();
    else if (lastWinnerVisibleV152) clearWinnerTop3BadgeV152();
    lastWinnerVisibleV152 = visible;
  }, 2500);

  // Expose for manual debugging.
  window.renderTopActiveV152 = renderTopActiveV152;
  window.markWinnerTop3V152 = markWinnerTop3V152;
})();



/* v153: move Top-3 widget inside left panel directly under color selector */
(function () {
  function closestUsefulBlockV153(el) {
    let cur = el;
    for (let i = 0; cur && i < 8; i++, cur = cur.parentElement) {
      const r = cur.getBoundingClientRect();
      if (r.width > 110 && r.width < 360 && r.height > 250 && r.left < window.innerWidth * 0.25) {
        return cur;
      }
    }
    return null;
  }

  function findColorRowV153() {
    const leftCandidates = [
      document.querySelector('.v150-left-darken'),
      document.querySelector('.v145-left-carpet'),
      document.querySelector('.sidebar'),
      document.querySelector('.left-panel'),
      document.querySelector('#leftPanel'),
      document.querySelector('.controls'),
      document.querySelector('.controls-panel'),
      document.querySelector('.admin-panel'),
      document.querySelector('aside:first-of-type'),
      document.querySelector('.app > aside:first-child'),
      document.querySelector('.app > div:first-child'),
      document.querySelector('main > div:first-child')
    ].filter(Boolean);

    const left = leftCandidates.find((el) => {
      const text = String(el.textContent || '').toLowerCase();
      const r = el.getBoundingClientRect();
      return r.left < window.innerWidth * 0.25 && r.height > 250 && (text.includes('цвет') || text.includes('винный'));
    }) || leftCandidates[0];

    if (!left) return { left: null, row: null };

    const selects = Array.from(left.querySelectorAll('select'));
    const colorSelect = selects.find((s) => {
      const text = String(s.closest('*')?.textContent || '').toLowerCase();
      return text.includes('цвет') || text.includes('винный') || text.includes('розовый');
    }) || selects[0];

    if (colorSelect) {
      let row = colorSelect.parentElement;
      for (let i = 0; row && i < 5; i++, row = row.parentElement) {
        const txt = String(row.textContent || '').toLowerCase();
        const r = row.getBoundingClientRect();
        if (
          txt.includes('цвет') &&
          r.height > 15 &&
          r.height < 110 &&
          r.width > 80 &&
          r.width <= left.getBoundingClientRect().width + 12
        ) {
          return { left, row };
        }
      }
      return { left, row: colorSelect.parentElement };
    }

    const all = Array.from(left.querySelectorAll('*'));
    const colorText = all.find((el) => {
      const txt = String(el.textContent || '').trim().toLowerCase();
      const r = el.getBoundingClientRect();
      return (txt === 'цвет' || txt.includes('цвет')) && r.height < 80;
    });

    return { left, row: colorText ? (colorText.parentElement || colorText) : null };
  }

  function moveTop3UnderColorV153() {
    const box = document.getElementById('topActiveV152');
    const found = findColorRowV153();
    const left = found.left;
    const row = found.row;

    if (!box || !left) return;

    box.classList.add('top-active-v153-inside-left');

    // Make sure old wrong placement outside left panel is fixed.
    if (box.parentElement !== left || (row && row.nextElementSibling !== box)) {
      if (row && row.parentElement === left) {
        left.insertBefore(box, row.nextSibling);
      } else if (row && row.parentElement && left.contains(row)) {
        row.parentElement.insertBefore(box, row.nextSibling);
      } else {
        left.insertBefore(box, left.children[1] || null);
      }
    }
  }

  function runV153() {
    moveTop3UnderColorV153();
    setTimeout(moveTop3UnderColorV153, 100);
    setTimeout(moveTop3UnderColorV153, 400);
    setTimeout(moveTop3UnderColorV153, 1200);
  }

  if (document.body) runV153();
  document.addEventListener('DOMContentLoaded', runV153);
  window.addEventListener('resize', () => setTimeout(moveTop3UnderColorV153, 100));
  korIdleIntervalV486(() => { if (!window.__KOR_FINAL_TOP3_V168__) moveTop3UnderColorV153(); }, 5000);
})();



/* v154: visible Top-3 competition + bonus criteria */
(function () {
  const V154_OPEN_AFTER_SEC = 3 * 60 * 60;
  const V154_MIN_MESSAGES = 360;
  const V154_MIN_ACTIVITY_SEC = 180 * 60;
  const V154_MIN_KD = 2.0;

  const STORAGE_KEY = 'rostyasha_v154_stream_elapsed_sec';
  const STORAGE_RUNNING_KEY = 'rostyasha_v154_stream_running';

  let v154Elapsed = Number(localStorage.getItem(STORAGE_KEY) || 0) || 0;
  let v154Running = localStorage.getItem(STORAGE_RUNNING_KEY) === '1';
  let v154LastTick = Date.now();

  function padV154(n) {
    return String(Math.max(0, Math.floor(n))).padStart(2, '0');
  }

  function fmtTimeV154(sec) {
    sec = Math.max(0, Math.floor(Number(sec || 0)));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${padV154(h)}:${padV154(m)}:${padV154(s)}`;
  }

  function currentStreamElapsedV154() {
    return Math.max(0, Math.floor(v154Elapsed));
  }

  function tickStreamTimerV154() {
    const now = Date.now();
    const delta = Math.max(0, Math.floor((now - v154LastTick) / 1000));
    v154LastTick = now;

    if (v154Running && delta > 0) {
      v154Elapsed += delta;
      localStorage.setItem(STORAGE_KEY, String(v154Elapsed));
    }
  }

  setInterval(tickStreamTimerV154, 1000);

  function hookTimerButtonV154() {
    const btn = document.getElementById('timerToggle');
    if (!btn || btn.__v154Hooked) return;
    btn.__v154Hooked = true;

    btn.addEventListener('click', () => {
      setTimeout(() => {
        try {
          // timerInterval exists in the original app.js scope.
          v154Running = !!timerInterval;
        } catch (e) {
          v154Running = !v154Running;
        }
        v154LastTick = Date.now();
        localStorage.setItem(STORAGE_RUNNING_KEY, v154Running ? '1' : '0');
      }, 80);
    });
  }

  function getStateV154() {
    return window.state || state || {};
  }

  function calcTopV154() {
    const st = getStateV154();
    const messages = st.messages || {};
    const watchtime = st.watchtime || {};

    return Object.entries(messages)
      .map(([username, count]) => {
        const u = String(username || '').replace(/^@/, '').trim().toLowerCase();
        const msg = Number(count || 0);
        const wt = Number(watchtime[u] || 0);
        const min = wt / 60;
        const kd = min > 0 ? msg / min : msg;
        return {
          username: u,
          messages: msg,
          watchSec: wt,
          watchMin: min,
          kd,
          kdText: kd.toFixed(2)
        };
      })
      .filter(u => u.username && u.messages > 0)
      .sort((a, b) => {
        if (b.messages !== a.messages) return b.messages - a.messages;
        if (b.watchSec !== a.watchSec) return b.watchSec - a.watchSec;
        return b.kd - a.kd;
      })
      .slice(0, 3)
      .map((u, i) => ({
        ...u,
        rank: i + 1,
        qualified: isQualifiedV154(u, i + 1)
      }));
  }

  function isBonusOpenV154() {
    return currentStreamElapsedV154() >= V154_OPEN_AFTER_SEC;
  }

  function isQualifiedV154(user, rank) {
    return (
      isBonusOpenV154() &&
      rank <= 3 &&
      Number(user.messages || 0) >= V154_MIN_MESSAGES &&
      Number(user.watchSec || 0) >= V154_MIN_ACTIVITY_SEC &&
      Number(user.kd || 0) >= V154_MIN_KD
    );
  }

  function ensureTopBoxV154() {
    let box = document.getElementById('topActiveV152');
    if (!box) return null;

    box.classList.add('top-active-v154');
    return box;
  }

  function renderTopV154() {
    tickStreamTimerV154();

    const box = ensureTopBoxV154();
    if (!box) return;

    const open = isBonusOpenV154();
    const remain = Math.max(0, V154_OPEN_AFTER_SEC - currentStreamElapsedV154());
    const top = calcTopV154();
    window.__topActiveV154 = top;

    box.innerHTML = `
      <div class="top-active-v154-title">ТОП-3 АКТИВНЫХ</div>
      <div class="top-active-v154-bonus">+$5 к депозиту при победе</div>
      <div class="top-active-v154-status ${open ? 'active' : 'locked'}">
        ${open ? 'БОНУС АКТИВЕН' : `Откроется через: ${fmtTimeV154(remain)}`}
      </div>
      <div class="top-active-v154-rules">КД 2.0 • 180 мин • 360 смс</div>
      <div class="top-active-v154-list">
        ${
          top.length
            ? top.map((u, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                const okClass = u.qualified ? 'qualified' : 'not-qualified';
                const minText = Math.floor(u.watchMin);
                return `
                  <div class="top-active-v154-row ${okClass}" data-user="${u.username}">
                    <div class="top-active-v154-main">
                      <span class="top-active-v154-medal">${medal}</span>
                      <span class="top-active-v154-name">${u.username}</span>
                    </div>
                    <div class="top-active-v154-stats">
                      <span>${u.messages} смс</span>
                      <span>${minText} мин</span>
                      <span>КД ${u.kdText}</span>
                    </div>
                  </div>
                `;
              }).join('')
            : `<div class="top-active-v154-empty">Пока нет активности</div>`
        }
      </div>
    `;
  }

  function getWinnerNickV154() {
    const candidates = [
      document.querySelector('#winnerName'),
      document.querySelector('.winner-name'),
      document.querySelector('[data-winner-name]'),
      document.querySelector('#winnerBox h1'),
      document.querySelector('#winnerBox h2'),
      document.querySelector('.winner-box h1'),
      document.querySelector('.winner-box h2')
    ].filter(Boolean);

    for (const el of candidates) {
      const t = String(el.textContent || '').trim();
      const clean = t
        .replace(/^@/, '')
        .replace(/победитель/ig, '')
        .replace(/winner/ig, '')
        .replace(/[:!🔥🏆]/g, '')
        .trim()
        .toLowerCase();

      if (clean && clean.length <= 32 && !/быстрый|фолловит|активность|сообщений|коэффициент|канал/.test(clean)) {
        return clean;
      }
    }

    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    const text = String(winnerBox?.textContent || '');
    const match = text.match(/@([a-zA-Z0-9_]{3,32})/);
    return match ? match[1].toLowerCase() : '';
  }

  function updateWinnerBonusBadgeV154() {
    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    if (!winnerBox) return;

    const visible = getComputedStyle(winnerBox).display !== 'none' && !winnerBox.classList.contains('hidden') && winnerBox.offsetParent !== null;
    let old152 = document.getElementById('winnerTop3BadgeV152');

    if (!visible) {
      if (old152) old152.style.display = 'none';
      return;
    }

    const nick = getWinnerNickV154();
    const top = Array.isArray(window.__topActiveV154) ? window.__topActiveV154 : calcTopV154();
    const hit = top.find(u => u.username === nick && u.qualified);

    if (!hit) {
      if (old152) old152.style.display = 'none';
      return;
    }

    if (!old152) {
      old152 = document.createElement('div');
      old152.id = 'winnerTop3BadgeV152';
      old152.className = 'winner-top3-badge-v152 winner-top3-badge-v154';
      winnerBox.appendChild(old152);
    }

    old152.classList.add('winner-top3-badge-v154');
    old152.textContent = `🔥 ТОП-${hit.rank} АКТИВНЫХ — +$5 к депозиту`;
    old152.style.display = '';
  }

  function bootV154Once() {
    hookTimerButtonV154();
    if (!window.__KOR_FINAL_TOP3_V168__) {
      renderTopV154();
      korIdleIntervalV486(updateWinnerBonusBadgeV154, 2000);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootV154Once, { once:true });
  else bootV154Once();

  window.__v154ResetStreamTimer = function () {
    v154Elapsed = 0;
    v154Running = false;
    v154LastTick = Date.now();
    localStorage.setItem(STORAGE_KEY, '0');
    localStorage.setItem(STORAGE_RUNNING_KEY, '0');
    renderTopV154();
  };
})();



/* v155: Twitch chatters watchtime status + wording */
(function () {
  async function fetchChattersWatchtimeStatusV155() {
    try {
      const res = await fetch('/api/chatters-watchtime-status', { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function ensureStatusV155() {
    const box = document.getElementById('topActiveV152');
    if (!box) return null;

    let status = document.getElementById('chattersStatusV155');
    if (!status) {
      status = document.createElement('div');
      status.id = 'chattersStatusV155';
      status.className = 'chatters-status-v155';
      box.appendChild(status);
    }
    return status;
  }

  async function updateStatusV155() {
    const status = ensureStatusV155();
    if (!status) return;

    const data = await fetchChattersWatchtimeStatusV155();
    if (!data) {
      status.textContent = 'Watchtime: Twitch chatters API — статус неизвестен';
      status.className = 'chatters-status-v155 warn';
      return;
    }

    if (data.ok) {
      status.textContent = `Watchtime: по Twitch-чату • сейчас в чате: ${data.counted}`;
      status.className = 'chatters-status-v155 ok';
    } else {
      status.textContent = `Watchtime API: ошибка токена/доступа`;
      status.className = 'chatters-status-v155 error';
    }
  }

  function renameRulesV155() {
    const box = document.getElementById('topActiveV152');
    if (!box) return;

    const all = Array.from(box.querySelectorAll('*'));
    for (const el of all) {
      if (!el.children.length && typeof el.textContent === 'string') {
        el.textContent = el.textContent
          .replace('КД 1.0', 'КД 2.0')
          .replace('КД 2.0+', 'КД 2.0+')
          .replace('Активность на стриме', 'Время в Twitch-чате');
      }
    }
  }

  function bootV155Once() {
    setTimeout(updateStatusV155, 1500);
    korIdleIntervalV486(updateStatusV155, 10000);
    korIdleIntervalV486(renameRulesV155, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootV155Once, { once:true });
  else bootV155Once();
})();



/* v158: filter service keys like __source / __lastSeen from all frontend rankings */
(function () {
  function isServiceNickV158(nick) {
    nick = String(nick || '').toLowerCase();
    return !nick || nick.includes('__source') || nick.includes('__lastseen') || nick.endsWith('_source') || nick.startsWith('__');
  }

  function cleanStateV158() {
    try {
      const st = window.state || (typeof state !== 'undefined' ? state : null);
      if (!st) return;

      for (const bucketName of ['watchtime', 'messages', 'participants']) {
        const bucket = st[bucketName];
        if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) continue;

        for (const key of Object.keys(bucket)) {
          if (isServiceNickV158(key)) delete bucket[key];
        }
      }
    } catch (e) {}
  }

  function cleanVisibleTextV158() {
    try {
      const badRows = Array.from(document.querySelectorAll('*')).filter((el) => {
        if (el.children.length > 0) return false;
        const t = String(el.textContent || '').toLowerCase();
        return t.includes('__source') || t.includes('__lastseen') || t.includes('nan мин');
      });

      for (const el of badRows) {
        const row = el.closest('li, .row, .top-active-v154-row, .top-active-v152-row, div');
        if (row && row !== document.body) row.remove();
      }
    } catch (e) {}
  }

  // Override browser alert for old Watchtime Top if it contains service keys.
  const oldAlertV158 = window.alert;
  if (!window.__v158AlertPatched) {
    window.__v158AlertPatched = true;
    window.alert = function (msg) {
      try {
        if (typeof msg === 'string' && (msg.includes('__source') || msg.includes('__lastSeen') || msg.includes('NaN мин'))) {
          const lines = msg.split('\n').filter((line) => {
            const l = line.toLowerCase();
            return !l.includes('__source') && !l.includes('__lastseen') && !l.includes('nan мин');
          });
          return oldAlertV158.call(window, lines.join('\n'));
        }
      } catch (e) {}
      return oldAlertV158.apply(window, arguments);
    };
  }

  cleanStateV158();
  function bootV158Once() {
    cleanStateV158();
    cleanVisibleTextV158();
    korIdleIntervalV486(cleanStateV158, 4000);
    korIdleIntervalV486(cleanVisibleTextV158, 6000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootV158Once, { once:true });
  else bootV158Once();

  // Ping server cleanup once.
  setTimeout(() => {
    fetch('/api/cleanup-watchtime-service-keys', { cache: 'no-store' }).catch(() => {});
  }, 2000);
})();



/* v159: Top-3 active timer + 2.0 KD criteria + static winner badge */
(function () {
  const OPEN_AFTER_SEC_V159 = 3 * 60 * 60;
  const MIN_MESSAGES_V159 = 360;
  const MIN_ACTIVITY_SEC_V159 = 180 * 60;
  const MIN_KD_V159 = 2.0;

  const TIMER_KEY_V159 = 'rostyasha_v154_stream_elapsed_sec';
  const RUNNING_KEY_V159 = 'rostyasha_v154_stream_running';

  let fallbackElapsedV159 = Number(localStorage.getItem(TIMER_KEY_V159) || 0) || 0;
  let lastTickV159 = Date.now();

  function padV159(n) {
    return String(Math.max(0, Math.floor(n))).padStart(2, '0');
  }

  function fmtTimeV159(sec) {
    sec = Math.max(0, Math.floor(Number(sec || 0)));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${padV159(h)}:${padV159(m)}:${padV159(s)}`;
  }

  function getMainTimerSecondsV159() {
    // Try to read the visible left timer first.
    const timerEl = document.getElementById('timer') || document.querySelector('.timer, .stream-timer, [data-timer]');
    const text = String(timerEl?.textContent || '').trim();
    const match = text.match(/(\d{1,2}):(\d{2}):(\d{2})/);
    if (match) {
      return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    }

    // Fallback to v154 localStorage timer.
    const running = localStorage.getItem(RUNNING_KEY_V159) === '1';
    const now = Date.now();
    if (running) {
      const delta = Math.max(0, Math.floor((now - lastTickV159) / 1000));
      if (delta > 0) {
        fallbackElapsedV159 += delta;
        localStorage.setItem(TIMER_KEY_V159, String(fallbackElapsedV159));
      }
    }
    lastTickV159 = now;

    return fallbackElapsedV159;
  }

  function getStateV159() {
    try {
      if (window.state) return window.state;
      if (typeof state !== 'undefined') return state;
    } catch (e) {}
    return {};
  }

  function getTopV159() {
    const st = getStateV159();
    const messages = st.messages || {};
    const watchtime = st.watchtime || {};
    const rows = [];

    for (const [rawNick, rawMessages] of Object.entries(messages)) {
      const nick = String(rawNick || '').replace(/^@/, '').trim().toLowerCase();
      if (!nick || nick.includes('__source') || nick.includes('__lastseen') || nick.startsWith('__')) continue;
      if (window.__v160IsExcludedUser && window.__v160IsExcludedUser(nick)) continue;

      const msg = Number(rawMessages || 0);
      const watchSec = Number(watchtime[nick] || 0);
      const watchMin = watchSec / 60;
      const kd = watchMin > 0 ? msg / watchMin : msg;

      if (msg <= 0) continue;

      rows.push({
        username: nick,
        messages: msg,
        watchSec,
        watchMin,
        kd,
        kdText: (Number.isFinite(kd) ? kd : 0).toFixed(2)
      });
    }

    return rows
      .sort((a, b) => {
        if (b.messages !== a.messages) return b.messages - a.messages;
        if (b.watchSec !== a.watchSec) return b.watchSec - a.watchSec;
        return b.kd - a.kd;
      })
      .slice(0, 3)
      .map((u, i) => ({
        ...u,
        rank: i + 1,
        qualified: isQualifiedV159(u)
      }));
  }

  function isBonusOpenV159() {
    return getMainTimerSecondsV159() >= OPEN_AFTER_SEC_V159;
  }

  function isQualifiedV159(user) {
    return (
      isBonusOpenV159() &&
      Number(user?.messages || 0) >= MIN_MESSAGES_V159 &&
      Number(user?.watchSec || 0) >= MIN_ACTIVITY_SEC_V159 &&
      Number(user?.kd || 0) >= MIN_KD_V159
    );
  }

  function ensureTopBoxV159() {
    const box = document.getElementById('topActiveV152');
    if (!box) return null;
    box.classList.add('top-active-v159', 'top-active-v154');
    return box;
  }

  function renderTopV159() {
    const box = ensureTopBoxV159();
    if (!box) return;

    const elapsed = getMainTimerSecondsV159();
    const remain = Math.max(0, OPEN_AFTER_SEC_V159 - elapsed);
    const open = elapsed >= OPEN_AFTER_SEC_V159;
    const top = getTopV159();
    window.__topActiveV159 = top;
    window.__topActiveV154 = top;

    box.innerHTML = `
      <div class="top-active-v154-title">ТОП-3 АКТИВНЫХ</div>
      <div class="top-active-v154-bonus">+$5 к депозиту при победе</div>
      <div class="top-active-v159-timer">
        <span>Таймер стрима:</span>
        <b>${fmtTimeV159(elapsed)}</b>
      </div>
      <div class="top-active-v154-status ${open ? 'active' : 'locked'}">
        ${open ? 'БОНУС АКТИВЕН' : `Откроется через: ${fmtTimeV159(remain)}`}
      </div>
      <div class="top-active-v154-rules">КД 2.0 • 180 мин • 360 смс</div>
      <div class="top-active-v154-list">
        ${
          top.length
            ? top.map((u, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                const okClass = u.qualified ? 'qualified' : 'not-qualified';
                const minText = Math.floor(u.watchMin);
                return `
                  <div class="top-active-v154-row ${okClass}" data-user="${u.username}">
                    <div class="top-active-v154-main">
                      <span class="top-active-v154-medal">${medal}</span>
                      <span class="top-active-v154-name">${u.username}</span>
                    </div>
                    <div class="top-active-v154-stats">
                      <span>${u.messages} смс</span>
                      <span>${minText} мин</span>
                      <span>КД ${u.kdText}</span>
                    </div>
                  </div>
                `;
              }).join('')
            : `<div class="top-active-v154-empty">Пока нет активности</div>`
        }
      </div>
    `;
  }

  function getWinnerNickV159() {
    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    if (!winnerBox) return '';

    const exact = [
      document.querySelector('#winnerName'),
      winnerBox.querySelector('.winner-name'),
      winnerBox.querySelector('[data-winner-name]'),
      winnerBox.querySelector('h1'),
      winnerBox.querySelector('h2')
    ].filter(Boolean);

    for (const el of exact) {
      const text = String(el.textContent || '').trim();
      const match = text.match(/@?([a-zA-Z0-9_]{3,32})/);
      if (match) {
        const nick = match[1].toLowerCase();
        if (!['winner', 'победитель', 'быстрый'].includes(nick)) return nick;
      }
    }

    const text = String(winnerBox.textContent || '');
    const match = text.match(/@([a-zA-Z0-9_]{3,32})/);
    return match ? match[1].toLowerCase() : '';
  }

  function updateWinnerBadgeV159() {
    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    if (!winnerBox) return;

    const visible =
      getComputedStyle(winnerBox).display !== 'none' &&
      !winnerBox.classList.contains('hidden') &&
      winnerBox.offsetParent !== null;

    if (!visible) return;

    const nick = getWinnerNickV159();
    if (!nick) return;

    const top = getTopV159();
    const hit = top.find((u) => u.username === nick && u.qualified);

    let badge = document.getElementById('winnerTop3BadgeV152');
    if (!hit) {
      // If user is not qualified, remove only old false/incorrect badges.
      if (badge) {
        badge.style.display = 'none';
        badge.textContent = '';
      }
      return;
    }

    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'winnerTop3BadgeV152';
      badge.className = 'winner-top3-badge-v152 winner-top3-badge-v154 winner-top3-badge-v159';
      const title = winnerBox.querySelector('h1, h2, .winner-title');
      if (title && title.parentElement === winnerBox) {
        winnerBox.insertBefore(badge, title);
      } else {
        winnerBox.prepend(badge);
      }
    }

    badge.classList.add('winner-top3-badge-v159');
    badge.textContent = `🔥 ТОП-${hit.rank} АКТИВНЫХ — +$5 к депозиту`;
    badge.style.display = 'block';
    badge.style.visibility = 'visible';
    badge.style.opacity = '1';
  }

  // Patch old functions by overpowering their effects with our render.
  function loopV159() {
    renderTopV159();
    updateWinnerBadgeV159();
  }

  function bootV159Once() {
    if (window.__KOR_FINAL_TOP3_V168__) return;
    korIdleIntervalV486(loopV159, 1500);
    setTimeout(loopV159, 150);
    setTimeout(loopV159, 1000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootV159Once, { once:true });
  else bootV159Once();

  window.__v159TopActiveRender = renderTopV159;
  window.__v159UpdateWinnerBadge = updateWinnerBadgeV159;
})();



/* v160: hide bots/broadcaster from UI rankings; broadcaster = 0 */
(function () {
  const EXCLUDED_USERS_V160 = new Map([
    ['rostyasha1', 'broadcaster'],
    ['rostyanych', 'bot'],
    ['nightbot', 'bot'],
    ['moobot', 'bot'],
    ['streamelements', 'bot'],
    ['jeebot', 'bot'],
    ['wizebot',
    'jeetbot', 'bot']
  ]);

  function normV160(n) {
    return String(n || '').replace(/^@/, '').trim().toLowerCase();
  }

  function isExcludedUserV160(n) {
    n = normV160(n);
    if (!n) return true;
    if (n.includes('__source') || n.includes('__lastseen') || n.startsWith('__')) return true;
    return EXCLUDED_USERS_V160.has(n);
  }

  function cleanupStateV160() {
    try {
      const st = window.state || (typeof state !== 'undefined' ? state : null);
      if (!st) return;

      for (const bucketName of ['watchtime', 'messages']) {
        const bucket = st[bucketName];
        if (!bucket || typeof bucket !== 'object') continue;

        for (const key of Object.keys(bucket)) {
          const base = normV160(key.replace(/__(source|lastSeen)$/i, ''));
          if (base === 'rostyasha1') {
            bucket[key] = 0;
          } else if (isExcludedUserV160(base) || isExcludedUserV160(key)) {
            delete bucket[key];
          }
        }
      }
    } catch (e) {}
  }

  function removeExcludedRowsV160() {
    try {
      const rows = document.querySelectorAll('.top-active-v154-row, .top-active-v152-row, [data-user], li, .row');
      for (const el of rows) {
        const dataUser = normV160(el.getAttribute('data-user'));
        const text = normV160(el.textContent);
        if (dataUser && isExcludedUserV160(dataUser)) {
          el.remove();
          continue;
        }
        for (const ex of EXCLUDED_USERS_V160.keys()) {
          if (text.includes(ex)) {
            el.remove();
            break;
          }
        }
      }
    } catch (e) {}
  }

  if (!window.__v160AlertPatched) {
    window.__v160AlertPatched = true;
    const oldAlert = window.alert;
    window.alert = function (msg) {
      try {
        if (typeof msg === 'string') {
          const lines = msg.split('\n').filter((line) => {
            const l = line.toLowerCase();
            if (l.includes('__source') || l.includes('__lastseen') || l.includes('nan мин')) return false;
            for (const ex of EXCLUDED_USERS_V160.keys()) {
              if (l.includes(ex)) return false;
            }
            return true;
          });
          return oldAlert.call(window, lines.join('\n'));
        }
      } catch (e) {}
      return oldAlert.apply(window, arguments);
    };
  }

  function loopV160() {
    cleanupStateV160();
    removeExcludedRowsV160();
  }

  function bootV160Once() {
    korIdleIntervalV486(loopV160, 2500);
    setTimeout(loopV160, 100);
    setTimeout(() => fetch('/api/cleanup-excluded-users', { cache: 'no-store' }).catch(() => {}), 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootV160Once, { once:true });
  else bootV160Once();

  window.__v160ExcludedUsers = Array.from(EXCLUDED_USERS_V160.entries()).map(([username, reason]) => ({ username, reason }));
  window.__v160IsExcludedUser = isExcludedUserV160;
  window.__v160Cleanup = loopV160;
})();



















/* v165: force simple countdown UI with START/STOP, static no flicker */
(function () {
  const OPEN_AFTER_SEC = 3 * 60 * 60;
  const DEFAULT_MIN_MESSAGES = 360;
  const DEFAULT_MIN_ACTIVITY_MIN = 180;
  const DEFAULT_MIN_KD = 2.0;

  const CRIT_KD_KEY = 'rostyasha_v169_min_kd';
  const CRIT_MIN_KEY = 'rostyasha_v169_min_minutes';
  const CRIT_SMS_KEY = 'rostyasha_v169_min_messages';

  function getCriteriaV169() {
    const kd = Number(localStorage.getItem(CRIT_KD_KEY));
    const minutes = Number(localStorage.getItem(CRIT_MIN_KEY));
    const messages = Number(localStorage.getItem(CRIT_SMS_KEY));

    return {
      kd: Number.isFinite(kd) && kd >= 0 ? kd : DEFAULT_MIN_KD,
      minutes: Number.isFinite(minutes) && minutes >= 0 ? minutes : DEFAULT_MIN_ACTIVITY_MIN,
      messages: Number.isFinite(messages) && messages >= 0 ? Math.floor(messages) : DEFAULT_MIN_MESSAGES
    };
  }

  function setCriteriaV169(part, value) {
    const n = Number(String(value || '').replace(',', '.').trim());
    if (!Number.isFinite(n) || n < 0) return false;

    if (part === 'kd') localStorage.setItem(CRIT_KD_KEY, String(n));
    if (part === 'minutes') localStorage.setItem(CRIT_MIN_KEY, String(Math.floor(n)));
    if (part === 'messages') localStorage.setItem(CRIT_SMS_KEY, String(Math.floor(n)));
    return true;
  }

  const REMAIN_KEY = 'rostyasha_v165_top3_remaining_sec';
  const RUNNING_KEY = 'rostyasha_v165_top3_running';

  const EXCLUDED = new Set([
    'rostyasha1',
    'rostyanych',
    'nightbot',
    'moobot',
    'streamelements',
    'jeebot',
    'jeetbot',
    'wizebot'
  ]);

  let remaining = Number(localStorage.getItem(REMAIN_KEY));
  if (!Number.isFinite(remaining) || remaining < 0) {
    const old164 = Number(localStorage.getItem('rostyasha_v164_top3_remaining_sec'));
    const old163 = Number(localStorage.getItem('rostyasha_v163_top3_remaining_sec'));
    if (Number.isFinite(old164) && old164 >= 0) remaining = old164;
    else if (Number.isFinite(old163) && old163 >= 0) remaining = old163;
    else remaining = OPEN_AFTER_SEC;
  }

  let running = localStorage.getItem(RUNNING_KEY) === '1';
  let lastTick = Date.now();
  let lastTopSignature = '';
  let intervalStarted = false;

  function norm(v) {
    return String(v || '').replace(/^@/, '').trim().toLowerCase();
  }

  function isExcluded(v) {
    const n = norm(v);
    return !n || EXCLUDED.has(n) || n.includes('__source') || n.includes('__lastseen') || n.startsWith('__');
  }

  function pad(n) {
    return String(Math.max(0, Math.floor(n))).padStart(2, '0');
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(Number(sec || 0)));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function parseTime(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;

    if (/^\d+$/.test(raw)) return Number(raw) * 60;

    const parts = raw.split(':').map(x => Number(x));
    if (parts.some(x => !Number.isFinite(x) || x < 0)) return null;

    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];

    return null;
  }

  function save() {
    remaining = Math.max(0, Math.floor(remaining));
    localStorage.setItem(REMAIN_KEY, String(remaining));
    localStorage.setItem(RUNNING_KEY, running ? '1' : '0');

    const elapsed = Math.max(0, OPEN_AFTER_SEC - remaining);
    localStorage.setItem('rostyasha_v164_top3_remaining_sec', String(remaining));
    localStorage.setItem('rostyasha_v164_top3_running', running ? '1' : '0');
    localStorage.setItem('rostyasha_v163_top3_remaining_sec', String(remaining));
    localStorage.setItem('rostyasha_v163_top3_running', running ? '1' : '0');
    localStorage.setItem('rostyasha_v162_top3_elapsed_sec', String(elapsed));
    localStorage.setItem('rostyasha_v162_top3_running', running ? '1' : '0');
    localStorage.setItem('rostyasha_v161_top3_elapsed_sec', String(elapsed));
    localStorage.setItem('rostyasha_v161_top3_running', running ? '1' : '0');
    localStorage.setItem('rostyasha_v154_stream_elapsed_sec', String(elapsed));
    localStorage.setItem('rostyasha_v154_stream_running', running ? '1' : '0');
  }

  function tick() {
    const now = Date.now();
    const delta = Math.max(0, Math.floor((now - lastTick) / 1000));
    lastTick = now;

    if (running && delta > 0 && remaining > 0) {
      remaining = Math.max(0, remaining - delta);
      if (remaining <= 0) {
        remaining = 0;
        running = false;
      }
      save();
    }
  }

  function isOpen() {
    return remaining <= 0;
  }

  function getState() {
    try {
      if (window.state) return window.state;
      if (typeof state !== 'undefined') return state;
    } catch (e) {}
    return {};
  }

  function cleanState() {
    try {
      const st = getState();
      for (const bucketName of ['watchtime', 'messages']) {
        const bucket = st[bucketName];
        if (!bucket || typeof bucket !== 'object') continue;

        for (const key of Object.keys(bucket)) {
          const base = norm(String(key).replace(/__(source|lastSeen)$/i, ''));
          if (base === 'rostyasha1') {
            bucket[key] = 0;
          } else if (isExcluded(base) || isExcluded(key)) {
            delete bucket[key];
          }
        }
      }
    } catch (e) {}
  }

  function qualified(user) {
    return (
      isOpen() &&
      Number(user?.messages || 0) >= MIN_MESSAGES &&
      Number(user?.watchSec || 0) >= MIN_ACTIVITY_SEC &&
      Number(user?.kd || 0) >= MIN_KD
    );
  }

  function getTop() {
    cleanState();

    const st = getState();
    const messages = st.messages || {};
    const watchtime = st.watchtime || {};
    const rows = [];

    for (const [rawNick, rawMessages] of Object.entries(messages)) {
      const nick = norm(rawNick);
      if (isExcluded(nick)) continue;

      const msg = Number(rawMessages || 0);
      const watchSec = Number(watchtime[nick] || 0);
      const watchMin = watchSec / 60;
      const kd = watchMin > 0 ? msg / watchMin : msg;

      if (msg <= 0) continue;

      rows.push({
        username: nick,
        messages: msg,
        watchSec,
        watchMin,
        kd,
        kdText: (Number.isFinite(kd) ? kd : 0).toFixed(2)
      });
    }

    return rows
      .sort((a, b) => {
        if (b.messages !== a.messages) return b.messages - a.messages;
        if (b.watchSec !== a.watchSec) return b.watchSec - a.watchSec;
        return b.kd - a.kd;
      })
      .slice(0, 3)
      .map((u, i) => ({ ...u, rank: i + 1, qualified: qualified(u) }));
  }

  function box() {
    return document.getElementById('topActiveV152');
  }

  function installBox(force = false) {
    const el = box();
    if (!el) return null;

    el.classList.add('top-active-v165');
    el.classList.remove('top-active-v164', 'top-active-v163', 'top-active-v162', 'top-active-v161');

    const wrongOldMode = String(el.textContent || '').includes('Таймер стрима') ||
      String(el.textContent || '').includes('СБРОС') ||
      String(el.textContent || '').includes('ТЕСТ ПЛАШКИ');

    if (!force && el.dataset.v165Mounted === '1' && !wrongOldMode) return el;

    el.dataset.v165Mounted = '1';
    el.innerHTML = `
      <div class="top-active-v165-title">ТОП-3 АКТИВНЫХ</div>
      <div class="top-active-v165-bonus">+$5 к депозиту при победе</div>

      <button type="button" class="top-active-v165-countdown locked" id="top3CountdownV165" title="Нажми, чтобы изменить время">
        <span class="top-active-v165-count-label">ОТКРОЕТСЯ ЧЕРЕЗ:</span>
        <span id="top3CountdownTimeV165">${fmt(remaining)}</span>
      </button>

      <div class="top-active-v165-controls">
        <button type="button" id="top3StartV165">СТАРТ</button>
        <button type="button" id="top3StopV165">СТОП</button>
      </div>

      <div class="top-active-v165-rules">КД 2.0 • 180 мин • 360 смс</div>

      <div class="top-active-v165-list" id="top3ListV165">
        <div class="top-active-v165-empty">Пока нет активности</div>
      </div>
    `;

    const countdown = document.getElementById('top3CountdownV165');
    const start = document.getElementById('top3StartV165');
    const stop = document.getElementById('top3StopV165');

    if (countdown) {
      countdown.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const value = prompt(
          'Через сколько открыть бонус ТОП-3?\nФормат: ЧЧ:ММ:СС или просто минуты.\nНапример: 00:01:00 или 1.',
          fmt(remaining)
        );

        if (value === null) return;

        const parsed = parseTime(value);
        if (parsed === null) {
          alert('Неверный формат. Пример: 00:01:00 или 1');
          return;
        }

        remaining = Math.max(0, parsed);
        running = false;
        lastTick = Date.now();
        save();
        updateTimer();
        updateList(true);
      };
    }

    if (start) {
      start.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (remaining <= 0) remaining = OPEN_AFTER_SEC;
        running = true;
        lastTick = Date.now();
        save();
        updateTimer();
      };
    }

    if (stop) {
      stop.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        tick();
        running = false;
        save();
        updateTimer();
      };
    }

    updateTimer();
    updateList(true);

    return el;
  }

  function updateCriteriaLabelsV169() {
    const c = getCriteriaV169();
    const kd = document.getElementById('top3CritKdV169');
    const min = document.getElementById('top3CritMinV169');
    const sms = document.getElementById('top3CritSmsV169');

    if (kd) kd.textContent = `КД ${Number(c.kd).toFixed(1)}`;
    if (min) min.textContent = `${Math.floor(c.minutes)} мин`;
    if (sms) sms.textContent = `${Math.floor(c.messages)} смс`;
  }

  function updateTimer() {
    const countdown = document.getElementById('top3CountdownV165');
    const time = document.getElementById('top3CountdownTimeV165');
    const label = document.querySelector('.top-active-v165-count-label');
    const start = document.getElementById('top3StartV165');

    if (countdown) {
      countdown.classList.toggle('active', isOpen());
      countdown.classList.toggle('locked', !isOpen());
    }

    if (isOpen()) {
      if (label) label.textContent = '';
      if (time) time.textContent = 'БОНУС АКТИВЕН';
    } else {
      if (label) label.textContent = 'ОТКРОЕТСЯ ЧЕРЕЗ:';
      if (time) time.textContent = fmt(remaining);
    }

    if (start) {
      start.textContent = running ? 'ИДЁТ' : 'СТАРТ';
      start.classList.toggle('running', running);
    }
  }

  function signature(top) {
    return JSON.stringify(top.map(u => ({
      username: u.username,
      messages: u.messages,
      watchSec: Math.floor(u.watchSec || 0),
      kd: u.kdText,
      q: u.qualified
    })));
  }

  function updateList(force = false) {
    const list = document.getElementById('top3ListV165');
    if (!list) return;

    const top = getTop();
    const sig = signature(top);

    window.__topActiveV165 = top;
    window.__topActiveV164 = top;
    window.__topActiveV163 = top;
    window.__topActiveV162 = top;
    window.__topActiveV161 = top;
    window.__topActiveV154 = top;

    if (!force && sig === lastTopSignature) return;
    lastTopSignature = sig;

    if (!top.length) {
      list.innerHTML = '<div class="top-active-v165-empty">Пока нет активности</div>';
      return;
    }

    list.innerHTML = top.map((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      const okClass = u.qualified ? 'qualified' : 'not-qualified';
      const minText = Math.floor(u.watchMin);
      return `
        <div class="top-active-v165-row ${okClass}" data-user="${u.username}">
          <div class="top-active-v165-main">
            <span class="top-active-v165-medal">${medal}</span>
            <span class="top-active-v165-name">${u.username}</span>
          </div>
          <div class="top-active-v165-stats">
            <span>${u.messages} смс</span>
            <span>${minText} мин</span>
            <span>КД ${u.kdText}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function getWinnerNick() {
    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    if (!winnerBox) return '';
    const text = String(winnerBox.textContent || '');
    const match = text.match(/@([a-zA-Z0-9_]{3,32})/);
    return match ? norm(match[1]) : '';
  }

  function updateWinnerBadge() {
    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    if (!winnerBox) return;

    const visible =
      getComputedStyle(winnerBox).display !== 'none' &&
      !winnerBox.classList.contains('hidden') &&
      winnerBox.offsetParent !== null;

    if (!visible) return;

    const nick = getWinnerNick();
    if (!nick || isExcluded(nick)) return;

    const top = getTop();
    const hit = top.find(u => u.username === nick && u.qualified);

    let badge = document.getElementById('winnerTop3BadgeV152');

    if (!hit) {
      if (badge) {
        badge.style.display = 'none';
        badge.textContent = '';
      }
      return;
    }

    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'winnerTop3BadgeV152';
      badge.className = 'winner-top3-badge-v152 winner-top3-badge-v165';
      winnerBox.prepend(badge);
    }

    badge.classList.add('winner-top3-badge-v165');
    badge.textContent = `🔥 ТОП-${hit.rank} АКТИВНЫХ — +$5 к депозиту`;
    badge.style.display = 'block';
    badge.style.visibility = 'visible';
    badge.style.opacity = '1';
  }

  function removeOldControls() {
    for (const sel of [
      '#top3ElapsedEditV162',
      '#top3RemainingEditV162',
      '#top3TimerToggleV162',
      '#top3TimerResetV162',
      '#top3StartV163',
      '#top3StopV163',
      '#top3CountdownEditV163',
      '#top3CountdownV164',
      '#top3StartV164',
      '#top3StopV164',
      '#top3BadgeTestV161',
      '.top-active-v161-test',
      '#top3BadgePreviewV161'
    ]) {
      for (const old of document.querySelectorAll(sel)) {
        old.remove();
      }
    }
  }

  function loop() {
    tick();
    installBox(false);
    updateTimer();
    updateList(false);
    updateWinnerBadge();
    removeOldControls();
  }

  function boot() {
    if (window.__KOR_FINAL_TOP3_V168__) return;
    installBox(true);
    updateTimer();
    updateList(true);

    if (!intervalStarted) {
      intervalStarted = true;
      setInterval(loop, 1000);
      setInterval(() => installBox(false), 1200);
    }
  }

  if (document.body) setTimeout(boot, 50);
  document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 50));

  window.__v165TopCountdownSet = function (seconds) {
    remaining = Math.max(0, Number(seconds || 0));
    running = false;
    lastTick = Date.now();
    save();
    installBox(true);
    updateTimer();
    updateList(true);
  };

  window.__v165TopCountdownStart = function () {
    if (remaining <= 0) remaining = OPEN_AFTER_SEC;
    running = true;
    lastTick = Date.now();
    save();
    updateTimer();
  };

  window.__v165TopCountdownStop = function () {
    tick();
    running = false;
    save();
    updateTimer();
  };

  window.__v165RenderTop = function () {
    installBox(true);
    updateTimer();
    updateList(true);
  };
})();



/* v167: SAFE restore TOP-3 block + no flicker + jeetbot excluded */
(function () {
  const OPEN_AFTER_SEC = 3 * 60 * 60;
  const DEFAULT_MIN_MESSAGES = 360;
  const DEFAULT_MIN_ACTIVITY_MIN = 180;
  const DEFAULT_MIN_KD = 2.0;

  const CRIT_KD_KEY = 'rostyasha_v169_min_kd';
  const CRIT_MIN_KEY = 'rostyasha_v169_min_minutes';
  const CRIT_SMS_KEY = 'rostyasha_v169_min_messages';

  function getCriteriaV169() {
    const kd = Number(localStorage.getItem(CRIT_KD_KEY));
    const minutes = Number(localStorage.getItem(CRIT_MIN_KEY));
    const messages = Number(localStorage.getItem(CRIT_SMS_KEY));

    return {
      kd: Number.isFinite(kd) && kd >= 0 ? kd : DEFAULT_MIN_KD,
      minutes: Number.isFinite(minutes) && minutes >= 0 ? minutes : DEFAULT_MIN_ACTIVITY_MIN,
      messages: Number.isFinite(messages) && messages >= 0 ? Math.floor(messages) : DEFAULT_MIN_MESSAGES
    };
  }

  function setCriteriaV169(part, value) {
    const n = Number(String(value || '').replace(',', '.').trim());
    if (!Number.isFinite(n) || n < 0) return false;

    if (part === 'kd') localStorage.setItem(CRIT_KD_KEY, String(n));
    if (part === 'minutes') localStorage.setItem(CRIT_MIN_KEY, String(Math.floor(n)));
    if (part === 'messages') localStorage.setItem(CRIT_SMS_KEY, String(Math.floor(n)));
    return true;
  }

  const REMAIN_KEY = 'rostyasha_v167_top3_remaining_sec';
  const RUNNING_KEY = 'rostyasha_v167_top3_running';

  const EXCLUDED = new Set([
    'rostyasha1',
    'rostyanych',
    'nightbot',
    'moobot',
    'streamelements',
    'jeebot',
    'jeetbot',
    'wizebot'
  ]);

  let remaining = Number(localStorage.getItem(REMAIN_KEY));
  if (!Number.isFinite(remaining) || remaining < 0) {
    const candidates = [
      'rostyasha_v165_top3_remaining_sec',
      'rostyasha_v164_top3_remaining_sec',
      'rostyasha_v163_top3_remaining_sec'
    ].map(k => Number(localStorage.getItem(k))).filter(v => Number.isFinite(v) && v >= 0);
    remaining = candidates.length ? candidates[0] : OPEN_AFTER_SEC;
  }

  let running = localStorage.getItem(RUNNING_KEY) === '1';
  let lastTick = Date.now();
  let lastTopSignature = '';
  let mounted = false;

  function norm(v) {
    return String(v || '').replace(/^@/, '').trim().toLowerCase();
  }

  function isExcluded(v) {
    const n = norm(v);
    return !n || EXCLUDED.has(n) || n.includes('__source') || n.includes('__lastseen') || n.startsWith('__');
  }

  function pad(n) {
    return String(Math.max(0, Math.floor(n))).padStart(2, '0');
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(Number(sec || 0)));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function parseTime(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;
    if (/^\d+$/.test(raw)) return Number(raw) * 60;

    const parts = raw.split(':').map(x => Number(x));
    if (parts.some(x => !Number.isFinite(x) || x < 0)) return null;

    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];

    return null;
  }

  function save() {
    remaining = Math.max(0, Math.floor(remaining));
    localStorage.setItem(REMAIN_KEY, String(remaining));
    localStorage.setItem(RUNNING_KEY, running ? '1' : '0');

    const elapsed = Math.max(0, OPEN_AFTER_SEC - remaining);
    for (const k of [
      'rostyasha_v165_top3_remaining_sec',
      'rostyasha_v164_top3_remaining_sec',
      'rostyasha_v163_top3_remaining_sec'
    ]) localStorage.setItem(k, String(remaining));

    for (const k of [
      'rostyasha_v165_top3_running',
      'rostyasha_v164_top3_running',
      'rostyasha_v163_top3_running',
      'rostyasha_v162_top3_running',
      'rostyasha_v161_top3_running',
      'rostyasha_v154_stream_running'
    ]) localStorage.setItem(k, running ? '1' : '0');

    for (const k of [
      'rostyasha_v162_top3_elapsed_sec',
      'rostyasha_v161_top3_elapsed_sec',
      'rostyasha_v154_stream_elapsed_sec'
    ]) localStorage.setItem(k, String(elapsed));
  }

  function tick() {
    const now = Date.now();
    const delta = Math.max(0, Math.floor((now - lastTick) / 1000));
    lastTick = now;

    if (running && delta > 0 && remaining > 0) {
      remaining = Math.max(0, remaining - delta);
      if (remaining <= 0) {
        remaining = 0;
        running = false;
      }
      save();
    }
  }

  function isOpen() {
    return remaining <= 0;
  }

  function getState() {
    try {
      if (window.state) return window.state;
      if (typeof state !== 'undefined') return state;
    } catch (e) {}
    return {};
  }

  function cleanState() {
    try {
      const st = getState();
      for (const bucketName of ['watchtime', 'messages']) {
        const bucket = st[bucketName];
        if (!bucket || typeof bucket !== 'object') continue;

        for (const key of Object.keys(bucket)) {
          const base = norm(String(key).replace(/__(source|lastSeen)$/i, ''));
          if (base === 'rostyasha1') {
            bucket[key] = 0;
          } else if (isExcluded(base) || isExcluded(key)) {
            delete bucket[key];
          }
        }
      }
    } catch (e) {}
  }

  function isQualified(user) {
    return (
      isOpen() &&
      Number(user?.messages || 0) >= MIN_MESSAGES &&
      Number(user?.watchSec || 0) >= MIN_ACTIVITY_SEC &&
      Number(user?.kd || 0) >= MIN_KD
    );
  }

  function getTop() {
    cleanState();

    const st = getState();
    const messages = st.messages || {};
    const watchtime = st.watchtime || {};
    const rows = [];

    for (const [rawNick, rawMessages] of Object.entries(messages)) {
      const nick = norm(rawNick);
      if (isExcluded(nick)) continue;

      const msg = Number(rawMessages || 0);
      const watchSec = Number(watchtime[nick] || 0);
      const watchMin = watchSec / 60;
      const kd = watchMin > 0 ? msg / watchMin : msg;

      if (msg <= 0) continue;

      rows.push({
        username: nick,
        messages: msg,
        watchSec,
        watchMin,
        kd,
        kdText: (Number.isFinite(kd) ? kd : 0).toFixed(2)
      });
    }

    return rows
      .sort((a, b) => {
        if (b.messages !== a.messages) return b.messages - a.messages;
        if (b.watchSec !== a.watchSec) return b.watchSec - a.watchSec;
        return b.kd - a.kd;
      })
      .slice(0, 3)
      .map((u, i) => ({ ...u, rank: i + 1, qualified: isQualified(u) }));
  }

  function findLeftPanel() {
    const candidates = [
      document.querySelector('.v150-left-darken'),
      document.querySelector('.v145-left-carpet'),
      document.querySelector('.sidebar'),
      document.querySelector('.left-panel'),
      document.querySelector('#leftPanel'),
      document.querySelector('.controls'),
      document.querySelector('.controls-panel'),
      document.querySelector('.admin-panel'),
      document.querySelector('aside:first-of-type'),
      document.querySelector('.app > aside:first-child'),
      document.querySelector('.app > div:first-child'),
      document.querySelector('main > div:first-child')
    ].filter(Boolean);

    return candidates.find(el => {
      const r = el.getBoundingClientRect();
      const t = String(el.textContent || '').toLowerCase();
      return r.left < window.innerWidth * 0.28 && r.height > 250 && (t.includes('цвет') || t.includes('винный') || t.includes('сброс участников'));
    }) || candidates[0] || null;
  }

  function findColorRow(left) {
    if (!left) return null;

    const select = left.querySelector('select');
    if (select) {
      let row = select.parentElement;
      for (let i = 0; row && i < 4; i++, row = row.parentElement) {
        const txt = String(row.textContent || '').toLowerCase();
        const r = row.getBoundingClientRect();
        if (txt.includes('цвет') && r.height < 110) return row;
      }
      return select.parentElement;
    }

    return null;
  }

  function ensureBox() {
    let box = document.getElementById('topActiveV152');

    if (!box) {
      const left = findLeftPanel();
      if (!left) return null;

      box = document.createElement('div');
      box.id = 'topActiveV152';
      box.className = 'top-active-v167';

      const colorRow = findColorRow(left);
      if (colorRow && colorRow.parentElement && left.contains(colorRow)) {
        colorRow.parentElement.insertBefore(box, colorRow.nextSibling);
      } else {
        left.insertBefore(box, left.children[1] || null);
      }
    }

    // If old scripts moved it out, bring it back.
    const left = findLeftPanel();
    if (left && !left.contains(box)) {
      const colorRow = findColorRow(left);
      if (colorRow && colorRow.parentElement && left.contains(colorRow)) {
        colorRow.parentElement.insertBefore(box, colorRow.nextSibling);
      } else {
        left.insertBefore(box, left.children[1] || null);
      }
    }

    box.classList.add('top-active-v167');
    box.classList.remove('top-active-v161', 'top-active-v162', 'top-active-v163', 'top-active-v164', 'top-active-v166');
    return box;
  }

  function mount(force = false) {
    const box = ensureBox();
    if (!box) return;

    // Only replace HTML if not mounted or if old content got injected.
    const text = String(box.textContent || '');
    const wrong = text.includes('Таймер стрима') || text.includes('СБРОС') || text.includes('ТЕСТ ПЛАШКИ') || !box.querySelector('#top3CountdownV167');

    if (!force && mounted && box.dataset.v167Mounted === '1' && !wrong) return;

    mounted = true;
    box.dataset.v167Mounted = '1';

    box.innerHTML = `
      <div class="top-active-v167-title">ТОП-3 АКТИВНЫХ</div>
      <div class="top-active-v167-bonus">+$5 к депозиту при победе</div>

      <button type="button" class="top-active-v167-countdown locked" id="top3CountdownV167" title="Нажми, чтобы изменить время">
        <span class="top-active-v167-count-label">ОТКРОЕТСЯ ЧЕРЕЗ:</span>
        <span id="top3CountdownTimeV167">${fmt(remaining)}</span>
      </button>

      <div class="top-active-v167-controls">
        <button type="button" id="top3StartV167">СТАРТ</button>
        <button type="button" id="top3StopV167">СТОП</button>
      </div>

      <div class="top-active-v167-rules">КД 2.0 • 180 мин • 360 смс</div>

      <div class="top-active-v167-list" id="top3ListV167">
        <div class="top-active-v167-empty">Пока нет активности</div>
      </div>
    `;

    const countdown = document.getElementById('top3CountdownV167');
    const start = document.getElementById('top3StartV167');
    const stop = document.getElementById('top3StopV167');

    if (countdown) {
      countdown.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const value = prompt(
          'Через сколько открыть бонус ТОП-3?\nФормат: ЧЧ:ММ:СС или просто минуты.\nНапример: 00:01:00 или 1.',
          fmt(remaining)
        );

        if (value === null) return;

        const parsed = parseTime(value);
        if (parsed === null) {
          alert('Неверный формат. Пример: 00:01:00 или 1');
          return;
        }

        remaining = Math.max(0, parsed);
        running = false;
        lastTick = Date.now();
        save();
        updateTimer();
        updateTop(true);
      };
    }

    if (start) {
      start.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (remaining <= 0) remaining = OPEN_AFTER_SEC;
        running = true;
        lastTick = Date.now();
        save();
        updateTimer();
      };
    }

    if (stop) {
      stop.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        tick();
        running = false;
        save();
        updateTimer();
      };
    }

    updateTimer();
    updateCriteriaLabelsV169();
    updateTop(true);
  }

  function updateCriteriaLabelsV169() {
    const c = getCriteriaV169();
    const kd = document.getElementById('top3CritKdV169');
    const min = document.getElementById('top3CritMinV169');
    const sms = document.getElementById('top3CritSmsV169');

    if (kd) kd.textContent = `КД ${Number(c.kd).toFixed(1)}`;
    if (min) min.textContent = `${Math.floor(c.minutes)} мин`;
    if (sms) sms.textContent = `${Math.floor(c.messages)} смс`;
  }

  function updateTimer() {
    const countdown = document.getElementById('top3CountdownV167');
    const time = document.getElementById('top3CountdownTimeV167');
    const label = document.querySelector('.top-active-v167-count-label');
    const start = document.getElementById('top3StartV167');

    if (countdown) {
      countdown.classList.toggle('active', isOpen());
      countdown.classList.toggle('locked', !isOpen());
    }

    if (isOpen()) {
      if (label) label.textContent = '';
      if (time) time.textContent = 'БОНУС АКТИВЕН';
    } else {
      if (label) label.textContent = 'ОТКРОЕТСЯ ЧЕРЕЗ:';
      if (time) time.textContent = fmt(remaining);
    }

    if (start) {
      start.textContent = running ? 'ИДЁТ' : 'СТАРТ';
      start.classList.toggle('running', running);
    }
  }

  function signature(top) {
    return JSON.stringify(top.map(u => ({
      n: u.username,
      m: u.messages,
      w: Math.floor(u.watchSec || 0),
      k: u.kdText,
      q: u.qualified
    })));
  }

  function updateTop(force = false) {
    const list = document.getElementById('top3ListV167');
    if (!list) return;

    const top = getTop();
    const sig = signature(top);

    window.__topActiveV167 = top;
    window.__topActiveV165 = top;
    window.__topActiveV164 = top;
    window.__topActiveV163 = top;
    window.__topActiveV162 = top;
    window.__topActiveV161 = top;
    window.__topActiveV154 = top;

    if (!force && sig === lastTopSignature) return;
    lastTopSignature = sig;

    if (!top.length) {
      list.innerHTML = '<div class="top-active-v167-empty">Пока нет активности</div>';
      return;
    }

    list.innerHTML = top.map((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      const okClass = u.qualified ? 'qualified' : 'not-qualified';
      const minText = Math.floor(u.watchMin);
      return `
        <div class="top-active-v167-row ${okClass}" data-user="${u.username}">
          <div class="top-active-v167-main">
            <span class="top-active-v167-medal">${medal}</span>
            <span class="top-active-v167-name">${u.username}</span>
          </div>
          <div class="top-active-v167-stats">
            <span>${u.messages} смс</span>
            <span>${minText} мин</span>
            <span>КД ${u.kdText}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function getWinnerNick() {
    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    if (!winnerBox) return '';

    const text = String(winnerBox.textContent || '');
    const match = text.match(/@([a-zA-Z0-9_]{3,32})/);
    return match ? norm(match[1]) : '';
  }

  function updateWinnerBadge() {
    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    if (!winnerBox) return;

    const visible =
      getComputedStyle(winnerBox).display !== 'none' &&
      !winnerBox.classList.contains('hidden') &&
      winnerBox.offsetParent !== null;

    if (!visible) return;

    const nick = getWinnerNick();
    if (!nick || isExcluded(nick)) return;

    const top = getTop();
    const hit = top.find(u => u.username === nick && u.qualified);

    let badge = document.getElementById('winnerTop3BadgeV167');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'winnerTop3BadgeV167';
      badge.className = 'winner-top3-badge-v167';
      winnerBox.prepend(badge);
    }

    // Old badge can be controlled by old scripts; remove it.
    const old = document.getElementById('winnerTop3BadgeV152');
    if (old && old !== badge) old.remove();

    if (!hit) {
      badge.style.display = 'none';
      badge.textContent = '';
      return;
    }

    badge.textContent = `🔥 ТОП-${hit.rank} АКТИВНЫХ — +$5 к депозиту`;
    badge.style.display = 'block';
    badge.style.visibility = 'visible';
    badge.style.opacity = '1';
  }

  function removeOldArtifacts() {
    const oldSelectors = [
      '#winnerTop3BadgeV152',
      '#top3ElapsedEditV162',
      '#top3RemainingEditV162',
      '#top3TimerToggleV162',
      '#top3TimerResetV162',
      '#top3StartV163',
      '#top3StopV163',
      '#top3CountdownEditV163',
      '#top3CountdownV164',
      '#top3StartV164',
      '#top3StopV164',
      '#top3StartV165',
      '#top3StopV165',
      '#top3CountdownV165',
      '#top3StartV166',
      '#top3StopV166',
      '#top3CountdownV166',
      '#top3BadgeTestV161',
      '.top-active-v161-test',
      '#top3BadgePreviewV161'
    ];

    for (const sel of oldSelectors) {
      for (const el of document.querySelectorAll(sel)) {
        el.remove();
      }
    }
  }

  // Patch alert output so bot names never show in Watchtime Top.
  if (!window.__v167AlertPatched) {
    window.__v167AlertPatched = true;
    const oldAlert = window.alert;
    window.alert = function (msg) {
      try {
        if (typeof msg === 'string') {
          const lines = msg.split('\n').filter((line) => {
            const l = line.toLowerCase();
            if (l.includes('__source') || l.includes('__lastseen') || l.includes('nan мин')) return false;
            for (const ex of EXCLUDED) {
              if (l.includes(ex)) return false;
            }
            return true;
          });
          return oldAlert.call(window, lines.join('\n'));
        }
      } catch (e) {}
      return oldAlert.apply(window, arguments);
    };
  }

  function loop() {
    tick();
    mount(false);
    updateTimer();
    updateCriteriaLabelsV169();
    updateTop(false);
    updateWinnerBadge();
    removeOldArtifacts();
  }

  function boot() {
    if (window.__KOR_FINAL_TOP3_V168__) return;
    mount(true);
    updateTimer();
    updateCriteriaLabelsV169();
    updateTop(true);
    removeOldArtifacts();

    if (!window.__v167Top3Interval) {
      window.__v167Top3Interval = setInterval(loop, 1000);
    }

    // Safety re-mount if an old script rewrites the block.
    if (!window.__v167Top3Guard) {
      window.__v167Top3Guard = setInterval(() => {
        const b = document.getElementById('topActiveV152');
        if (!b || !b.querySelector('#top3CountdownV167')) {
          mounted = false;
          mount(true);
        }
      }, 1500);
    }
  }

  if (document.body) setTimeout(boot, 100);
  document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 100));

  window.__v167TopCountdownSet = function (seconds) {
    remaining = Math.max(0, Number(seconds || 0));
    running = false;
    lastTick = Date.now();
    save();
    mount(true);
    updateTimer();
    updateCriteriaLabelsV169();
    updateTop(true);
  };

  window.__v167TopCountdownStart = function () {
    if (remaining <= 0) remaining = OPEN_AFTER_SEC;
    running = true;
    lastTick = Date.now();
    save();
    updateTimer();
  };

  window.__v167TopCountdownStop = function () {
    tick();
    running = false;
    save();
    updateTimer();
  };

  window.__v167RenderTop = function () {
    mounted = false;
    mount(true);
    updateTimer();
    updateCriteriaLabelsV169();
    updateTop(true);
  };
})();



/* v168: independent TOP-3 block. Old topActiveV152 is hidden to stop flicker. */
(function () {
  // v486: mark v168 as the only active TOP-3 renderer before older boot timers can start.
  window.__KOR_FINAL_TOP3_V168__ = true;
  const OPEN_AFTER_SEC = 3 * 60 * 60;
  const DEFAULT_MIN_MESSAGES = 360;
  const DEFAULT_MIN_ACTIVITY_MIN = 180;
  const DEFAULT_MIN_KD = 2.0;

  const CRIT_KD_KEY = 'rostyasha_v169_min_kd';
  const CRIT_MIN_KEY = 'rostyasha_v169_min_minutes';
  const CRIT_SMS_KEY = 'rostyasha_v169_min_messages';

  function getCriteriaV169() {
    const kd = Number(localStorage.getItem(CRIT_KD_KEY));
    const minutes = Number(localStorage.getItem(CRIT_MIN_KEY));
    const messages = Number(localStorage.getItem(CRIT_SMS_KEY));

    return {
      kd: Number.isFinite(kd) && kd >= 0 ? kd : DEFAULT_MIN_KD,
      minutes: Number.isFinite(minutes) && minutes >= 0 ? minutes : DEFAULT_MIN_ACTIVITY_MIN,
      messages: Number.isFinite(messages) && messages >= 0 ? Math.floor(messages) : DEFAULT_MIN_MESSAGES
    };
  }

  function setCriteriaV169(part, value) {
    const n = Number(String(value || '').replace(',', '.').trim());
    if (!Number.isFinite(n) || n < 0) return false;

    if (part === 'kd') localStorage.setItem(CRIT_KD_KEY, String(n));
    if (part === 'minutes') localStorage.setItem(CRIT_MIN_KEY, String(Math.floor(n)));
    if (part === 'messages') localStorage.setItem(CRIT_SMS_KEY, String(Math.floor(n)));
    return true;
  }

  const REMAIN_KEY = 'rostyasha_v168_top3_remaining_sec';
  const RUNNING_KEY = 'rostyasha_v168_top3_running';
  // v422: optional TOP-3 module. Default is ON so existing users keep current behavior.
  const ENABLED_KEY_V422 = 'korzhany_v422_top3_enabled';
  let enabledV422 = localStorage.getItem(ENABLED_KEY_V422) !== '0';

  const EXCLUDED = new Set([
    'rostyasha1',
    'rostyanych',
    'nightbot',
    'moobot',
    'streamelements',
    'jeebot',
    'jeetbot',
    'wizebot'
  ]);

  let remaining = Number(localStorage.getItem(REMAIN_KEY));
  if (!Number.isFinite(remaining) || remaining < 0) {
    const old = Number(localStorage.getItem('rostyasha_v167_top3_remaining_sec') || localStorage.getItem('rostyasha_v165_top3_remaining_sec') || 0);
    remaining = Number.isFinite(old) && old >= 0 ? old : OPEN_AFTER_SEC;
  }

  let running = localStorage.getItem(RUNNING_KEY) === '1';
  const WAS_RUNNING_KEY_V425 = 'korzhany_v425_top3_was_running';
  let lastTick = Date.now();
  let lastTopSignature = '';

  function forcePowerButtonVisualV426(power) {
    if (!power) return;
    const set = (name, value) => power.style.setProperty(name, value, 'important');
    set('position', 'absolute');
    set('z-index', '2147483000');
    set('top', '10px');
    set('right', '10px');
    set('left', 'auto');
    set('bottom', 'auto');
    set('display', 'grid');
    set('place-items', 'center');
    set('box-sizing', 'border-box');
    set('width', '24px');
    set('min-width', '24px');
    set('max-width', '24px');
    set('height', '24px');
    set('min-height', '24px');
    set('max-height', '24px');
    set('margin', '0');
    set('padding', '0');
    set('flex', '0 0 24px');
    set('border', enabledV422 ? '1px solid rgba(83,255,138,.76)' : '1px solid rgba(255,255,255,.20)');
    set('border-radius', '8px');
    set('background', enabledV422 ? 'rgba(13,73,34,.92)' : 'rgba(13,13,17,.84)');
    set('background-image', 'none');
    set('color', enabledV422 ? '#b8ffcb' : 'rgba(255,255,255,.52)');
    set('font', '800 15px/1 Arial,sans-serif');
    set('letter-spacing', '0');
    set('text-indent', '0');
    set('text-align', 'center');
    set('text-transform', 'none');
    set('white-space', 'nowrap');
    set('overflow', 'hidden');
    set('opacity', '1');
    set('transform', 'none');
    set('cursor', 'pointer');
    set('appearance', 'none');
    set('-webkit-appearance', 'none');
    set('box-shadow', enabledV422 ? '0 0 11px rgba(66,255,124,.42), inset 0 1px 0 rgba(225,255,234,.16)' : 'inset 0 1px 0 rgba(255,255,255,.06), 0 3px 10px rgba(0,0,0,.18)');
  }

  function applyEnabledStateV422() {
    const box = document.getElementById('topActiveV168');
    const power = document.getElementById('top3PowerV422');

    if (box) box.classList.toggle('top3-disabled-v422', !enabledV422);

    if (power) {
      power.classList.toggle('is-on', enabledV422);
      power.setAttribute('aria-pressed', enabledV422 ? 'true' : 'false');
      power.setAttribute('title', enabledV422 ? 'Выключить ТОП-3 активных' : 'Включить ТОП-3 активных');
      forcePowerButtonVisualV426(power);
    }

    for (const id of ['top3CountdownV168', 'top3StartV168', 'top3StopV168', 'top3CritKdV169', 'top3CritMinV169', 'top3CritSmsV169']) {
      const el = document.getElementById(id);
      if (el) el.disabled = !enabledV422;
    }
  }

  function setEnabledV422(next) {
    const nextEnabled = !!next;
    if (nextEnabled === enabledV422) {
      applyEnabledStateV422();
      return;
    }

    if (!nextEnabled) {
      tick();
      localStorage.setItem(WAS_RUNNING_KEY_V425, running ? '1' : '0');
      running = false;
    } else {
      running = localStorage.getItem(WAS_RUNNING_KEY_V425) === '1' && remaining > 0;
      lastTick = Date.now();
    }

    enabledV422 = nextEnabled;
    localStorage.setItem(ENABLED_KEY_V422, enabledV422 ? '1' : '0');
    save();

    if (!enabledV422) {
      const badge = document.getElementById('winnerTop3BadgeV168');
      if (badge) { badge.style.display = 'none'; badge.textContent = ''; }
      window.__topActiveV168 = [];
      window.__topActiveV167 = [];
      window.__topActiveV165 = [];
      window.__topActiveV154 = [];
    }

    applyEnabledStateV422();
    updateTimer();
    updateTop(true);
    updateWinnerBadge();
  }

  function norm(v) {
    return String(v || '').replace(/^@/, '').trim().toLowerCase();
  }

  function isExcluded(v) {
    const n = norm(v);
    return !n || EXCLUDED.has(n) || n.includes('__source') || n.includes('__lastseen') || n.startsWith('__');
  }

  function pad(n) {
    return String(Math.max(0, Math.floor(n))).padStart(2, '0');
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(Number(sec || 0)));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function parseTime(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;
    if (/^\d+$/.test(raw)) return Number(raw) * 60;

    const parts = raw.split(':').map(x => Number(x));
    if (parts.some(x => !Number.isFinite(x) || x < 0)) return null;

    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];

    return null;
  }

  function save() {
    remaining = Math.max(0, Math.floor(remaining));
    localStorage.setItem(REMAIN_KEY, String(remaining));
    localStorage.setItem(RUNNING_KEY, running ? '1' : '0');

    // Keep older timers synced just so they do not show different values if old hidden code runs.
    for (const k of ['rostyasha_v167_top3_remaining_sec','rostyasha_v165_top3_remaining_sec','rostyasha_v164_top3_remaining_sec','rostyasha_v163_top3_remaining_sec']) {
      localStorage.setItem(k, String(remaining));
    }
  }

  function tick() {
    const now = Date.now();
    const delta = Math.max(0, Math.floor((now - lastTick) / 1000));
    lastTick = now;

    if (enabledV422 && running && delta > 0 && remaining > 0) {
      remaining = Math.max(0, remaining - delta);
      if (remaining <= 0) {
        remaining = 0;
        running = false;
      }
      save();
    }
  }

  function isOpen() {
    return enabledV422 && remaining <= 0;
  }

  function getState() {
    try {
      if (window.state) return window.state;
      if (typeof state !== 'undefined') return state;
    } catch (e) {}
    return {};
  }

  function cleanState() {
    try {
      const st = getState();
      for (const bucketName of ['watchtime', 'messages']) {
        const bucket = st[bucketName];
        if (!bucket || typeof bucket !== 'object') continue;

        for (const key of Object.keys(bucket)) {
          const base = norm(String(key).replace(/__(source|lastSeen)$/i, ''));
          if (base === 'rostyasha1') {
            bucket[key] = 0;
          } else if (isExcluded(base) || isExcluded(key)) {
            delete bucket[key];
          }
        }
      }
    } catch (e) {}
  }

  function hasStrictCriteria(user) {
    const c = getCriteriaV169();
    return (
      Number(user?.messages || 0) >= c.messages &&
      Number(user?.watchSec || 0) >= c.minutes * 60 &&
      Number(user?.kd || 0) >= c.kd
    );
  }

  function getTop() {
    cleanState();

    const st = getState();
    const messages = st.messages || {};
    const watchtime = st.watchtime || {};
    const rows = [];

    for (const [rawNick, rawMessages] of Object.entries(messages)) {
      const nick = norm(rawNick);
      if (isExcluded(nick)) continue;

      const msg = Number(rawMessages || 0);
      const watchSec = Number(watchtime[nick] || 0);
      const watchMin = watchSec / 60;
      const kd = watchMin > 0 ? msg / watchMin : msg;

      if (msg <= 0) continue;

      rows.push({
        username: nick,
        messages: msg,
        watchSec,
        watchMin,
        kd,
        kdText: (Number.isFinite(kd) ? kd : 0).toFixed(2)
      });
    }

    return rows
      .sort((a, b) => {
        if (b.messages !== a.messages) return b.messages - a.messages;
        if (b.watchSec !== a.watchSec) return b.watchSec - a.watchSec;
        return b.kd - a.kd;
      })
      .slice(0, 3)
      .map((u, i) => ({
        ...u,
        rank: i + 1,
        strict: hasStrictCriteria(u),
        // v169: bonus requires ALL active criteria, not just TOP-3.
        bonusEligible: isOpen() && hasStrictCriteria(u)
      }));
  }

  function findLeftPanel() {
    const candidates = [
      document.querySelector('.v150-left-darken'),
      document.querySelector('.v145-left-carpet'),
      document.querySelector('.sidebar'),
      document.querySelector('.left-panel'),
      document.querySelector('#leftPanel'),
      document.querySelector('.controls'),
      document.querySelector('.controls-panel'),
      document.querySelector('.admin-panel'),
      document.querySelector('aside:first-of-type'),
      document.querySelector('.app > aside:first-child'),
      document.querySelector('.app > div:first-child'),
      document.querySelector('main > div:first-child')
    ].filter(Boolean);

    return candidates.find(el => {
      const r = el.getBoundingClientRect();
      const t = String(el.textContent || '').toLowerCase();
      return r.left < window.innerWidth * 0.30 && r.height > 250 && (t.includes('цвет') || t.includes('винный') || t.includes('сброс участников'));
    }) || candidates[0] || null;
  }

  function findColorRow(left) {
    if (!left) return null;

    const select = left.querySelector('select');
    if (select) {
      let row = select.parentElement;
      for (let i = 0; row && i < 4; i++, row = row.parentElement) {
        const txt = String(row.textContent || '').toLowerCase();
        const r = row.getBoundingClientRect();
        if (txt.includes('цвет') && r.height < 120) return row;
      }
      return select.parentElement;
    }

    return null;
  }

  function hideOldTopBlock() {
    const old = document.getElementById('topActiveV152');
    if (old) {
      old.setAttribute('data-v168-hidden-old', '1');
      old.style.display = 'none';
      old.style.visibility = 'hidden';
      old.style.opacity = '0';
      old.style.pointerEvents = 'none';
      old.style.height = '0';
      old.style.minHeight = '0';
      old.style.margin = '0';
      old.style.padding = '0';
      old.style.overflow = 'hidden';
    }
  }

  function ensureBox() {
    let box = document.getElementById('topActiveV168');
    if (box) return box;

    hideOldTopBlock();

    const left = findLeftPanel();
    if (!left) return null;

    box = document.createElement('div');
    box.id = 'topActiveV168';
    box.className = 'top-active-v168';

    const colorRow = findColorRow(left);
    if (colorRow && colorRow.parentElement && left.contains(colorRow)) {
      colorRow.parentElement.insertBefore(box, colorRow.nextSibling);
    } else {
      left.insertBefore(box, left.children[1] || null);
    }

    box.innerHTML = `
      <button type="button" id="top3PowerV422" class="top-active-power-v422" aria-label="Включить или выключить ТОП-3" title="${enabledV422 ? 'Выключить ТОП-3 активных' : 'Включить ТОП-3 активных'}" aria-pressed="${enabledV422 ? 'true' : 'false'}">⏻</button>
      <div class="top-active-v168-title">ТОП-3 АКТИВНЫХ</div>
      <div class="top-active-v168-bonus">+$5 к депозиту при победе</div>

      <button type="button" class="top-active-v168-countdown locked" id="top3CountdownV168" title="Нажми, чтобы изменить время">
        <span class="top-active-v168-count-label">ОТКРОЕТСЯ ЧЕРЕЗ:</span>
        <span id="top3CountdownTimeV168">${fmt(remaining)}</span>
      </button>

      <div class="top-active-v168-controls">
        <button type="button" id="top3StartV168">СТАРТ</button>
        <button type="button" id="top3StopV168">СТОП</button>
      </div>

      <div class="top-active-v168-rules top-active-v169-rules">
        <button type="button" id="top3CritKdV169" class="top-active-v169-crit" title="Изменить минимальный КД"></button>
        <span class="top-active-v169-dot">•</span>
        <button type="button" id="top3CritMinV169" class="top-active-v169-crit" title="Изменить минимальные минуты"></button>
        <span class="top-active-v169-dot">•</span>
        <button type="button" id="top3CritSmsV169" class="top-active-v169-crit" title="Изменить минимальные смс"></button>
      </div>

      <div class="top-active-v168-list" id="top3ListV168">
        <div class="top-active-v168-empty">Пока нет активности</div>
      </div>
    `;

    document.getElementById('top3PowerV422')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setEnabledV422(!enabledV422);
    });

    applyEnabledStateV422();

    document.getElementById('top3CountdownV168')?.addEventListener('click', () => {
      const value = prompt(
        'Через сколько открыть бонус ТОП-3?\nФормат: ЧЧ:ММ:СС или просто минуты.\nНапример: 00:01:00 или 1.',
        fmt(remaining)
      );

      if (value === null) return;

      const parsed = parseTime(value);
      if (parsed === null) {
        alert('Неверный формат. Пример: 00:01:00 или 1');
        return;
      }

      remaining = Math.max(0, parsed);
      running = false;
      lastTick = Date.now();
      save();
      updateTimer();
      updateTop(true);
    });

    document.getElementById('top3StartV168')?.addEventListener('click', () => {
      if (remaining <= 0) remaining = OPEN_AFTER_SEC;
      running = true;
      lastTick = Date.now();
      save();
      updateTimer();
    });

    document.getElementById('top3StopV168')?.addEventListener('click', () => {
      tick();
      running = false;
      save();
      updateTimer();
    });

    document.getElementById('top3CritKdV169')?.addEventListener('click', () => {
      const c = getCriteriaV169();
      const value = prompt('Минимальный КД для бонуса. Например: 2.0 или 3.0', String(c.kd));
      if (value === null) return;
      if (!setCriteriaV169('kd', value)) return alert('Неверное значение КД');
      updateCriteriaLabelsV169();
      updateTop(true);
      updateWinnerBadge();
    });

    document.getElementById('top3CritMinV169')?.addEventListener('click', () => {
      const c = getCriteriaV169();
      const value = prompt('Минимум минут для бонуса. Например: 180', String(c.minutes));
      if (value === null) return;
      if (!setCriteriaV169('minutes', value)) return alert('Неверное значение минут');
      updateCriteriaLabelsV169();
      updateTop(true);
      updateWinnerBadge();
    });

    document.getElementById('top3CritSmsV169')?.addEventListener('click', () => {
      const c = getCriteriaV169();
      const value = prompt('Минимум сообщений для бонуса. Например: 360', String(c.messages));
      if (value === null) return;
      if (!setCriteriaV169('messages', value)) return alert('Неверное значение смс');
      updateCriteriaLabelsV169();
      updateTop(true);
      updateWinnerBadge();
    });

    updateCriteriaLabelsV169();

    return box;
  }

  function updateCriteriaLabelsV169() {
    const c = getCriteriaV169();
    const kd = document.getElementById('top3CritKdV169');
    const min = document.getElementById('top3CritMinV169');
    const sms = document.getElementById('top3CritSmsV169');

    if (kd) kd.textContent = `КД ${Number(c.kd).toFixed(1)}`;
    if (min) min.textContent = `${Math.floor(c.minutes)} мин`;
    if (sms) sms.textContent = `${Math.floor(c.messages)} смс`;
  }

  function updateTimer() {
    const countdown = document.getElementById('top3CountdownV168');
    const time = document.getElementById('top3CountdownTimeV168');
    const label = document.querySelector('.top-active-v168-count-label');
    const start = document.getElementById('top3StartV168');

    if (countdown) {
      countdown.classList.toggle('active', isOpen());
      countdown.classList.toggle('locked', !isOpen());
    }

    if (isOpen()) {
      if (label) label.textContent = '';
      if (time) time.textContent = 'БОНУС АКТИВЕН';
    } else {
      if (label) label.textContent = 'ОТКРОЕТСЯ ЧЕРЕЗ:';
      if (time) time.textContent = fmt(remaining);
    }

    if (start) {
      start.textContent = running ? 'ИДЁТ' : 'СТАРТ';
      start.classList.toggle('running', running);
    }
  }

  function topSignature(top) {
    return JSON.stringify(top.map(u => ({
      n: u.username,
      m: u.messages,
      w: Math.floor(u.watchSec || 0),
      k: u.kdText,
      s: u.strict,
      e: u.bonusEligible
    })));
  }

  function updateTop(force = false) {
    const list = document.getElementById('top3ListV168');
    if (!list) return;

    if (!enabledV422) {
      window.__topActiveV168 = [];
      window.__topActiveV167 = [];
      window.__topActiveV165 = [];
      window.__topActiveV154 = [];
      if (force) list.innerHTML = '<div class="top-active-v168-empty">ТОП-3 выключен</div>';
      return;
    }

    const top = getTop();
    const sig = topSignature(top);

    window.__topActiveV168 = top;
    window.__topActiveV167 = top;
    window.__topActiveV165 = top;
    window.__topActiveV154 = top;

    if (!force && sig === lastTopSignature) return;
    lastTopSignature = sig;

    if (!top.length) {
      list.innerHTML = '<div class="top-active-v168-empty">Пока нет активности</div>';
      return;
    }

    list.innerHTML = top.map((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      const okClass = u.strict ? 'qualified' : 'not-qualified';
      const minText = Math.floor(u.watchMin);
      return `
        <div class="top-active-v168-row ${okClass}" data-user="${u.username}">
          <div class="top-active-v168-main">
            <span class="top-active-v168-medal">${medal}</span>
            <span class="top-active-v168-name">${u.username}</span>
          </div>
          <div class="top-active-v168-stats top-active-v171-stats">
            <span class="${u.messages >= getCriteriaV169().messages ? 'ok' : 'bad'}">${u.messages} смс</span>
            <span class="${u.watchSec >= getCriteriaV169().minutes * 60 ? 'ok' : 'bad'}">${minText} мин</span>
            <span class="${u.kd >= getCriteriaV169().kd ? 'ok' : 'bad'}">КД ${u.kdText}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function getWinnerNick() {
    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    if (!winnerBox) return '';

    const text = String(winnerBox.textContent || '');
    const match = text.match(/@([a-zA-Z0-9_]{3,32})/);
    return match ? norm(match[1]) : '';
  }

  function updateWinnerBadge() {
    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    if (!winnerBox) return;

    const visible =
      getComputedStyle(winnerBox).display !== 'none' &&
      !winnerBox.classList.contains('hidden') &&
      winnerBox.offsetParent !== null;

    if (!visible) return;

    const nick = getWinnerNick();
    if (!nick || isExcluded(nick)) return;

    const top = getTop();
    const hit = top.find(u => u.username === nick && u.bonusEligible);

    let badge = document.getElementById('winnerTop3BadgeV168');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'winnerTop3BadgeV168';
      badge.className = 'winner-top3-badge-v168';
      winnerBox.prepend(badge);
    }

    const oldBadges = [
      'winnerTop3BadgeV152',
      'winnerTop3BadgeV166',
      'winnerTop3BadgeV167'
    ];

    for (const id of oldBadges) {
      const old = document.getElementById(id);
      if (old && old !== badge) old.remove();
    }

    if (!hit) {
      badge.style.display = 'none';
      badge.textContent = '';
      return;
    }

    badge.textContent = `🔥 ТОП-${hit.rank} АКТИВНЫХ — +$5 к депозиту`;
    badge.style.display = 'block';
    badge.style.visibility = 'visible';
    badge.style.opacity = '1';
  }

  // Patch alert output so bot names never show in Watchtime Top.
  if (!window.__v168AlertPatched) {
    window.__v168AlertPatched = true;
    const oldAlert = window.alert;
    window.alert = function (msg) {
      try {
        if (typeof msg === 'string') {
          const lines = msg.split('\n').filter((line) => {
            const l = line.toLowerCase();
            if (l.includes('__source') || l.includes('__lastseen') || l.includes('nan мин')) return false;
            for (const ex of EXCLUDED) {
              if (l.includes(ex)) return false;
            }
            return true;
          });
          return oldAlert.call(window, lines.join('\n'));
        }
      } catch (e) {}
      return oldAlert.apply(window, arguments);
    };
  }

  function loop() {
    hideOldTopBlock();
    ensureBox();
    applyEnabledStateV422();
    tick();
    updateTimer();
    updateCriteriaLabelsV169();
    updateTop(false);
    updateWinnerBadge();
  }

  function boot() {
    hideOldTopBlock();
    ensureBox();
    updateTimer();
    updateCriteriaLabelsV169();
    updateTop(true);

    if (!window.__v168Top3Interval) {
      window.__v168Top3Interval = setInterval(loop, 1000);
    }

    // Re-hide old block in case old scripts try to re-show it.
    if (!window.__v168HideOldTopGuard) {
      window.__v168HideOldTopGuard = korIdleIntervalV486(hideOldTopBlock, 2200, { timeout: 700 });
    }
  }

  if (document.body) setTimeout(boot, 150);
  document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 150));

  window.__v168TopCountdownSet = function (seconds) {
    remaining = Math.max(0, Number(seconds || 0));
    running = false;
    lastTick = Date.now();
    save();
    updateTimer();
    updateCriteriaLabelsV169();
    updateTop(true);
  };

  window.__v168TopCountdownStart = function () {
    if (remaining <= 0) remaining = OPEN_AFTER_SEC;
    running = true;
    lastTick = Date.now();
    save();
    updateTimer();
  };

  window.__v168TopCountdownStop = function () {
    tick();
    running = false;
    save();
    updateTimer();
  };


  window.KorzhanyTop3V422 = {
    isEnabled: () => enabledV422,
    enable: () => setEnabledV422(true),
    disable: () => setEnabledV422(false),
    toggle: () => setEnabledV422(!enabledV422)
  };
})();



/* v169: final strict criteria helpers and winner layout guard */
(function () {
  // Prevent old top badges from reappearing above the new one.
  korIdleIntervalV486(() => {
    const oldIds = ['winnerTop3BadgeV152', 'winnerTop3BadgeV166', 'winnerTop3BadgeV167'];
    for (const id of oldIds) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }

    const badge = document.getElementById('winnerTop3BadgeV168');
    if (badge && badge.textContent.trim()) {
      badge.classList.add('winner-top3-badge-v169');
      badge.style.display = 'block';
      badge.style.visibility = 'visible';
      badge.style.opacity = '1';
    }
  }, 2500);
})();



/* v171: safe winner chat lower marker only */
(function () {
  function markWinnerChatV171() {
    const winnerBox = document.getElementById('winnerBox') || document.querySelector('.winner-box');
    if (!winnerBox) return;

    winnerBox.classList.add('winner-box-v171');

    const nodes = Array.from(winnerBox.querySelectorAll('div, section, article'));
    for (const node of nodes) {
      const text = String(node.textContent || '').toLowerCase();
      if (
        text.includes('чат победителя') ||
        text.includes('секундомер запущен') ||
        text.includes('ждём ответ победителя') ||
        text.includes('ждем ответ победителя')
      ) {
        node.classList.add('winner-chat-panel-v171');
      }

      if (text.includes('реролл') && text.includes('проверка')) {
        node.classList.add('winner-actions-v171');
      }
    }
  }

  if (document.body) setTimeout(markWinnerChatV171, 100);
  document.addEventListener('DOMContentLoaded', () => setTimeout(markWinnerChatV171, 100));
  korIdleIntervalV486(markWinnerChatV171, 2500);
})();



/* v209: safe TOP-3 criteria full labels */
(function () {
  function fixTop3LabelsV209() {
    const kd = document.getElementById('top3CritKdV169');
    const min = document.getElementById('top3CritMinV169');
    const sms = document.getElementById('top3CritSmsV169');

    if (kd) kd.classList.add('top3-crit-full-v209');
    if (min) min.classList.add('top3-crit-full-v209');
    if (sms) sms.classList.add('top3-crit-full-v209');

    const box = document.getElementById('topActiveV168');
    if (box) box.classList.add('top3-wide-safe-v209');

    const rules = document.querySelector('#topActiveV168 .top-active-v169-rules');
    if (rules) rules.classList.add('top3-rules-wide-v209');

    const stats = document.querySelectorAll('#topActiveV168 .top-active-v168-stats span, #topActiveV168 .top-active-v171-stats span');
    stats.forEach(el => el.classList.add('top3-user-stat-full-v209'));
  }

  if (document.body) {
    setTimeout(fixTop3LabelsV209, 50);
    setTimeout(fixTop3LabelsV209, 300);
    setTimeout(fixTop3LabelsV209, 1000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(fixTop3LabelsV209, 50);
    setTimeout(fixTop3LabelsV209, 300);
    setTimeout(fixTop3LabelsV209, 1000);
  });

  korIdleIntervalV486(fixTop3LabelsV209, 5000);

  window.__v209Top3SafeWidthFix = fixTop3LabelsV209;
})();



/* v213: styled modals for side buttons + clean top plus */
(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function ensureModal() {
    let root = $('v213ModalRoot');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'v213ModalRoot';
    root.className = 'v213-modal-root hidden';
    root.innerHTML = `
      <div class="v213-modal-backdrop"></div>
      <div class="v213-modal-card" role="dialog" aria-modal="true">
        <button class="v213-modal-close" type="button" aria-label="Закрыть">×</button>
        <div class="v213-modal-title"></div>
        <div class="v213-modal-body"></div>
        <input class="v213-modal-input hidden" />
        <div class="v213-modal-actions">
          <button class="v213-modal-btn v213-ok" type="button">ОК</button>
          <button class="v213-modal-btn v213-cancel hidden" type="button">ОТМЕНА</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    return root;
  }

  function closeModal(value) {
    const root = ensureModal();
    root.classList.add('hidden');
    const resolver = root.__resolver;
    root.__resolver = null;
    if (resolver) resolver(value);
  }

  function showModal({ title, body, mode = 'alert', value = '', placeholder = '' }) {
    const root = ensureModal();
    const titleEl = root.querySelector('.v213-modal-title');
    const bodyEl = root.querySelector('.v213-modal-body');
    const input = root.querySelector('.v213-modal-input');
    const ok = root.querySelector('.v213-ok');
    const cancel = root.querySelector('.v213-cancel');
    const close = root.querySelector('.v213-modal-close');

    titleEl.textContent = title || 'ROSTYASHA BOT';

    if (Array.isArray(body)) {
      bodyEl.innerHTML = body.map(line => `<div class="v213-modal-line">${escapeHtml(line)}</div>`).join('');
    } else {
      bodyEl.innerHTML = String(body || '')
        .split('\n')
        .map(line => `<div class="v213-modal-line">${escapeHtml(line)}</div>`)
        .join('');
    }

    input.classList.toggle('hidden', mode !== 'prompt');
    cancel.classList.toggle('hidden', mode === 'alert');

    input.value = value || '';
    input.placeholder = placeholder || '';

    ok.textContent = mode === 'confirm' ? 'ДА' : 'ОК';
    cancel.textContent = mode === 'confirm' ? 'НЕТ' : 'ОТМЕНА';

    root.classList.remove('hidden');

    return new Promise(resolve => {
      root.__resolver = resolve;

      ok.onclick = () => {
        if (mode === 'prompt') closeModal(input.value);
        else if (mode === 'confirm') closeModal(true);
        else closeModal(true);
      };

      cancel.onclick = () => {
        if (mode === 'confirm') closeModal(false);
        else closeModal(null);
      };

      close.onclick = () => {
        if (mode === 'confirm') closeModal(false);
        else closeModal(null);
      };

      root.querySelector('.v213-modal-backdrop').onclick = () => {
        if (mode === 'confirm') closeModal(false);
        else closeModal(null);
      };

      input.onkeydown = (e) => {
        if (e.key === 'Enter') ok.click();
        if (e.key === 'Escape') cancel.click();
      };

      if (mode === 'prompt') {
        setTimeout(() => {
          input.focus();
          input.select();
        }, 30);
      } else {
        setTimeout(() => ok.focus(), 30);
      }
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getState() {
    return window.state || state || {};
  }

  function sendCommand(type, payload) {
    if (typeof send === 'function') {
      send(type, payload);
      return;
    }

    // fallback for builds where send is not global
    const key = new URLSearchParams(location.search).get('key') || '';
    fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, type, payload })
    }).catch(() => {});
  }

  function formatTotalV514(sec) { const m=Math.floor(Math.max(0,Number(sec)||0)/60);const d=Math.floor(m/1440),h=Math.floor(m%1440/60),rest=m%60;return d?`${d} д ${h} ч`:h?`${h} ч ${rest} мин`:`${rest} мин`; }

  function formatWatchtimeTop() {
    const st = getState();
    return Object.entries(st.watchtime || {})
      .filter(([k]) => !k.endsWith('__lastSeen'))
      .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
      .slice(0, 15)
      .map(([u, sec], i) => `${i + 1}. ${u} — ${Math.floor(Number(sec || 0) / 60)} мин`);
  }

  function formatSmsTop() {
    const st = getState();
    return Object.entries(st.messages || {})
      .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
      .slice(0, 15)
      .map(([u, c], i) => `${i + 1}. ${u} — ${Number(c || 0)} смс`);
  }

  async function handleButton(id) {
    const st = getState();

    if (id === 'resetParticipantsBtn') {
      const ok = await showModal({
        title: 'СБРОС УЧАСТНИКОВ',
        body: 'Точно очистить список участников?',
        mode: 'confirm'
      });
      if (ok) sendCommand('reset_participants');
      return;
    }

    if (id === 'codeBtn') {
      const current = st.settings?.codeWord || '+';
      const value = await showModal({
        title: 'КОД УЧАСТИЯ',
        body: 'Введи новое кодовое слово:',
        mode: 'prompt',
        value: current,
        placeholder: '+'
      });
      if (value && String(value).trim()) {
        sendCommand('set_code', { code: String(value).trim() });
      }
      return;
    }

    if (id === 'watchtimeBtn') {
      const rows = formatWatchtimeTop();
      let lifetime = [];
      try { const r = await fetch('/api/v514/watchtime-all', { credentials:'same-origin', cache:'no-store' }); if(r.ok){const d=await r.json();lifetime=(d.rows||[]).map((x,i)=>`${i+1}. ${x.username} — ${formatTotalV514(x.seconds)}`);} } catch (_) {}
      await showModal({
        title: 'WATCHTIME ТОП',
        body: [...['ЗА СЕАНС'], ...(rows.length ? rows : ['Пока пусто']), '', 'ЗА ВСЁ ВРЕМЯ (с начала учёта)', ...(lifetime.length ? lifetime : ['Пока пусто'])],
        mode: 'alert'
      });
      return;
    }

    if (id === 'smsTopBtn') {
      const rows = formatSmsTop();
      await showModal({
        title: 'SMS ТОП',
        body: rows.length ? rows : ['SMS топ пустой'],
        mode: 'alert'
      });
      return;
    }

    if (id === 'searchBtn') {
      if (typeof window.__v484OpenPlayerSearch === 'function') {
        await window.__v484OpenPlayerSearch();
        return;
      }
      const value = await showModal({
        title: 'ПОИСК НИКА',
        body: 'Введи ник участника:',
        mode: 'prompt',
        value: '',
        placeholder: 'nickname'
      });
      if (!value) return;

      const user = String(value).trim().replace(/^@/, '').toLowerCase();
      if (!user) return;

      const sms = st.messages?.[user] || 0;
      const wt = Math.floor((st.watchtime?.[user] || 0) / 60);
      const participant = (st.participants || []).includes(user) ? 'да' : 'нет';
      const wins = (st.winners || []).filter(w => w.username === user).length;

      await showModal({
        title: 'ПРОВЕРКА НИКА',
        body: [
          `Ник: ${user}`,
          `В участниках: ${participant}`,
          `SMS: ${sms}`,
          `Watchtime: ${wt} мин`,
          `Побед: ${wins}`
        ],
        mode: 'alert'
      });
      return;
    }
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest && e.target.closest(
      '#resetParticipantsBtn, #codeBtn, #watchtimeBtn, #smsTopBtn, #searchBtn'
    );

    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    handleButton(btn.id);
  }, true);

  function cleanPlus() {
    const plus = $('codeBanner');
    if (plus) plus.classList.add('v213-code-plus-clean');
  }

  if (document.body) cleanPlus();
  document.addEventListener('DOMContentLoaded', cleanPlus);
  korIdleIntervalV486(cleanPlus, 5000);

  window.__v213StyledModal = showModal;
})();



/* v214: hard fix styled reset/code, editable timers, winner chat header layout */
(function () {
  const $ = id => document.getElementById(id);

  function modal() {
    return window.__v213StyledModal;
  }

  function showStyled(opts) {
    const m = modal();
    if (typeof m === 'function') return m(opts);

    // fallback only if modal failed for some reason
    if (opts.mode === 'confirm') return Promise.resolve(confirm(opts.body || opts.title || 'Подтвердить?'));
    if (opts.mode === 'prompt') return Promise.resolve(prompt(opts.body || opts.title || '', opts.value || ''));
    alert(Array.isArray(opts.body) ? opts.body.join('\n') : (opts.body || opts.title || ''));
    return Promise.resolve(true);
  }

  function safeSend(type, payload) {
    try {
      if (typeof send === 'function') {
        send(type, payload);
        return;
      }
    } catch (e) {}

    const key = new URLSearchParams(location.search).get('key') || '';
    fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, type, payload })
    }).catch(() => {});
  }

  function getAppState() {
    try {
      if (typeof state !== 'undefined') return state;
    } catch (e) {}
    return window.state || {};
  }

  function parseTimeV214(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    if (/^\d+$/.test(raw)) {
      return Math.max(0, Number(raw) * 60);
    }

    const parts = raw.split(':').map(v => v.trim());
    if (parts.length === 2 && parts.every(v => /^\d+$/.test(v))) {
      const m = Number(parts[0]);
      const s = Number(parts[1]);
      return Math.max(0, m * 60 + s);
    }

    if (parts.length === 3 && parts.every(v => /^\d+$/.test(v))) {
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      const s = Number(parts[2]);
      return Math.max(0, h * 3600 + m * 60 + s);
    }

    return null;
  }

  function fmtV214(sec) {
    sec = Math.max(0, Math.floor(Number(sec || 0)));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  function replaceButton(id, handler) {
    const old = $(id);
    if (!old || old.dataset.v214Bound === '1') return;

    const clone = old.cloneNode(true);
    clone.dataset.v214Bound = '1';
    old.replaceWith(clone);

    clone.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      await handler(clone, e);
    }, true);
  }

  function bindSideButtonsV214() {
    replaceButton('resetParticipantsBtn', async () => {
      const ok = await showStyled({
        title: 'СБРОС УЧАСТНИКОВ',
        body: 'Точно очистить список участников?',
        mode: 'confirm'
      });
      if (ok) safeSend('reset_participants');
    });

    replaceButton('codeBtn', async () => {
      const st = getAppState();
      const current = st.settings?.codeWord || $('codeBtnText')?.textContent || '+';
      const value = await showStyled({
        title: 'КОД УЧАСТИЯ',
        body: 'Введи новое кодовое слово:',
        mode: 'prompt',
        value: current,
        placeholder: '+'
      });
      if (value && String(value).trim()) safeSend('set_code', { code: String(value).trim() });
    });

    replaceButton('watchtimeBtn', async () => {
      const st = getAppState();
      const rows = Object.entries(st.watchtime || {})
        .filter(([k]) => !k.endsWith('__lastSeen'))
        .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
        .slice(0, 15)
        .map(([u, sec], i) => `${i + 1}. ${u} — ${Math.floor(Number(sec || 0) / 60)} мин`);

      let life = [];
      try { const r = await fetch('/api/v514/watchtime-all', { credentials:'same-origin', cache:'no-store' }); if(r.ok){ const d=await r.json(); life=(d.rows||[]).map((x,i)=>`${i+1}. ${x.username} — ${Math.floor(Number(x.seconds||0)/3600)} ч ${Math.floor(Number(x.seconds||0)%3600/60)} мин`); } } catch (_) {}
      await showStyled({
        title: 'WATCHTIME ТОП',
        body: ['ЗА СЕАНС', ...(rows.length ? rows : ['Пока пусто']), '', 'ЗА ВСЁ ВРЕМЯ (с начала учёта)', ...(life.length ? life : ['Пока пусто'])],
        mode: 'alert'
      });
    });

    replaceButton('smsTopBtn', async () => {
      const st = getAppState();
      const rows = Object.entries(st.messages || {})
        .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
        .slice(0, 15)
        .map(([u, c], i) => `${i + 1}. ${u} — ${Number(c || 0)} смс`);

      await showStyled({
        title: 'SMS ТОП',
        body: rows.length ? rows : ['SMS топ пустой'],
        mode: 'alert'
      });
    });

    replaceButton('searchBtn', async () => {
      if (typeof window.__v484OpenPlayerSearch === 'function') {
        await window.__v484OpenPlayerSearch();
        return;
      }
      const value = await showStyled({
        title: 'ПОИСК НИКА',
        body: 'Введи ник участника:',
        mode: 'prompt',
        value: '',
        placeholder: 'nickname'
      });
      if (!value) return;

      const st = getAppState();
      const user = String(value).trim().replace(/^@/, '').toLowerCase();
      if (!user) return;

      const sms = st.messages?.[user] || 0;
      const wt = Math.floor((st.watchtime?.[user] || 0) / 60);
      const participant = (st.participants || []).includes(user) ? 'да' : 'нет';
      const wins = (st.winners || []).filter(w => w.username === user).length;

      await showStyled({
        title: 'ПРОВЕРКА НИКА',
        body: [
          `Ник: ${user}`,
          `В участниках: ${participant}`,
          `SMS: ${sms}`,
          `Watchtime: ${wt} мин`,
          `Побед: ${wins}`
        ],
        mode: 'alert'
      });
    });
  }

  function bindMainTimerV214() {
    const timerEl = $('timer');
    if (!timerEl || timerEl.dataset.v214TimerBound === '1') return;

    timerEl.dataset.v214TimerBound = '1';
    timerEl.title = 'Нажми, чтобы изменить время';
    timerEl.classList.add('timer-editable-v214');

    timerEl.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      let current = timerEl.textContent?.trim() || '00:10:00';

      const value = await showStyled({
        title: 'ТАЙМЕР',
        body: 'Введи время. Формат: ЧЧ:ММ:СС или просто минуты.',
        mode: 'prompt',
        value: current,
        placeholder: '00:10:00'
      });

      if (value === null || value === undefined) return;

      const parsed = parseTimeV214(value);
      if (parsed === null) {
        await showStyled({
          title: 'ОШИБКА',
          body: 'Неверный формат. Пример: 00:10:00 или 10',
          mode: 'alert'
        });
        return;
      }

      try {
        timerSeconds = parsed;
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        if (typeof renderTimer === 'function') renderTimer();
        else timerEl.textContent = fmtV214(parsed);
      } catch (err) {
        timerEl.textContent = fmtV214(parsed);
      }
    }, true);
  }

  function bindTop3TimerV214() {
    // Dynamic buttons are recreated by old scripts, so use one capture listener.
    if (window.__v214Top3CaptureBound) return;
    window.__v214Top3CaptureBound = true;

    document.addEventListener('click', async (e) => {
      const target = e.target.closest?.('#top3CountdownV168, #top3CritKdV169, #top3CritMinV169, #top3CritSmsV169');
      if (!target) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (target.id === 'top3CountdownV168') {
        const timeEl = $('top3CountdownTimeV168');
        const current = timeEl?.textContent?.trim() || '00:01:00';
        const value = await showStyled({
          title: 'ТОП-3 ТАЙМЕР',
          body: 'Через сколько открыть бонус? Формат: ЧЧ:ММ:СС или просто минуты.',
          mode: 'prompt',
          value: current.includes('БОНУС') ? '00:01:00' : current,
          placeholder: '00:01:00'
        });

        if (value === null || value === undefined) return;
        const parsed = parseTimeV214(value);
        if (parsed === null) {
          await showStyled({ title: 'ОШИБКА', body: 'Неверный формат. Пример: 00:01:00 или 1', mode: 'alert' });
          return;
        }

        // Sync the known localStorage keys used by v168/v167/v165.
        [
          'rostyasha_v168_top3_remaining_sec',
          'rostyasha_v167_top3_remaining_sec',
          'rostyasha_v165_top3_remaining_sec',
          'rostyasha_v164_top3_remaining_sec',
          'rostyasha_v163_top3_remaining_sec'
        ].forEach(k => localStorage.setItem(k, String(parsed)));

        [
          'rostyasha_v168_top3_running',
          'rostyasha_v167_top3_running',
          'rostyasha_v165_top3_running',
          'rostyasha_v164_top3_running',
          'rostyasha_v163_top3_running'
        ].forEach(k => localStorage.setItem(k, '0'));

        if (timeEl) timeEl.textContent = fmtV214(parsed);
        window.location.reload();
        return;
      }

      const keyMap = {
        top3CritKdV169: ['kd', 'Минимальный КД для бонуса. Например: 2.0 или 3.0'],
        top3CritMinV169: ['minutes', 'Минимум минут для бонуса. Например: 180'],
        top3CritSmsV169: ['messages', 'Минимум сообщений для бонуса. Например: 360']
      };

      const [key, label] = keyMap[target.id] || [];
      if (!key) return;

      const current = String(target.textContent || '').replace(/[^\d.,]/g, '').replace(',', '.') || '0';
      const value = await showStyled({
        title: 'КРИТЕРИЙ ТОП-3',
        body: label,
        mode: 'prompt',
        value: current,
        placeholder: current
      });

      if (value === null || value === undefined) return;

      const num = Number(String(value).replace(',', '.'));
      if (!Number.isFinite(num) || num < 0) {
        await showStyled({ title: 'ОШИБКА', body: 'Введи нормальное число', mode: 'alert' });
        return;
      }

      // Store in all likely keys used by this branch.
      const objKeys = [
        'rostyasha_v169_top3_criteria',
        'rostyasha_v168_top3_criteria',
        'rostyasha_top3_criteria'
      ];

      objKeys.forEach(storageKey => {
        let obj = {};
        try { obj = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (err) {}
        obj[key] = num;
        localStorage.setItem(storageKey, JSON.stringify(obj));
      });

      const directKeys = {
        kd: ['rostyasha_v169_top3_min_kd', 'rostyasha_v168_top3_min_kd'],
        minutes: ['rostyasha_v169_top3_min_minutes', 'rostyasha_v168_top3_min_minutes'],
        messages: ['rostyasha_v169_top3_min_messages', 'rostyasha_v168_top3_min_messages']
      };

      (directKeys[key] || []).forEach(storageKey => localStorage.setItem(storageKey, String(num)));

      if (key === 'kd') target.textContent = `КД ${num.toFixed(1)}`;
      if (key === 'minutes') target.textContent = `${Math.floor(num)} мин`;
      if (key === 'messages') target.textContent = `${Math.floor(num)} смс`;

      window.location.reload();
    }, true);
  }

  function fixWinnerHeaderV214() {
    const nick = $('winnerChatNick');
    if (nick) nick.textContent = '';

    const chat = $('winnerChatBox');
    if (chat) chat.classList.add('winner-chat-v214-layout');

    const head = document.querySelector('#winnerChatBox .winner-chat-head');
    if (head) head.classList.add('winner-chat-head-v214');

    const title = document.querySelector('#winnerChatBox .winner-chat-title');
    if (title) title.classList.add('winner-chat-title-v214');

    const reroll = $('winnerRerollBtn');
    const check = $('winnerCheckBtn');

    if (reroll) reroll.classList.add('winner-header-btn-v214');
    if (check) check.classList.add('winner-header-btn-v214');
  }

  function bootV214() {
    bindSideButtonsV214();
    bindMainTimerV214();
    bindTop3TimerV214();
    fixWinnerHeaderV214();
  }

  if (document.body) {
    setTimeout(bootV214, 50);
    setTimeout(bootV214, 300);
    setTimeout(bootV214, 1000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(bootV214, 50);
    setTimeout(bootV214, 300);
    setTimeout(bootV214, 1000);
  });

  korIdleIntervalV486(() => {
    bindSideButtonsV214();
    bindMainTimerV214();
    fixWinnerHeaderV214();
  }, 3000);

  window.__v214Fixes = bootV214;
})();


/* v216: add logout button on secure online panel */
(function () {
  function addLogoutV216() {
    if (document.getElementById('logoutBtnV216')) return;
    const btn = document.createElement('a');
    btn.id = 'logoutBtnV216';
    btn.href = '/hub';
    btn.textContent = 'HUB';
    btn.setAttribute('aria-label', 'Вернуться в KORZHANY HUB');
    btn.className = 'logout-btn-v216';
    document.body.appendChild(btn);
  }
  if (document.body) addLogoutV216();
  document.addEventListener('DOMContentLoaded', addLogoutV216);
})();


/* v220: clear winners button in right winners block */
(function () {
  function q(id) { return document.getElementById(id); }

  function modalV220(opts) {
    if (typeof window.__v213StyledModal === 'function') return window.__v213StyledModal(opts);
    if (opts.mode === 'confirm') return Promise.resolve(confirm(opts.body || opts.title || 'Подтвердить?'));
    return Promise.resolve(true);
  }

  function ensureClearWinnersButtonV220() {
    const panel = q('winnersPanel');
    if (!panel || q('clearWinnersBottomV220')) return;

    const btn = document.createElement('button');
    btn.id = 'clearWinnersBottomV220';
    btn.type = 'button';
    btn.className = 'clear-winners-bottom-v220';
    btn.textContent = 'ОЧИСТИТЬ СПИСОК';

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const ok = await modalV220({
        title: 'ОЧИСТИТЬ СПИСОК',
        body: 'Точно очистить последние выигрыши?',
        mode: 'confirm'
      });

      if (!ok) return;
      if (typeof send === 'function') send('clear_winners');
    });

    panel.appendChild(btn);
  }

  if (document.body) ensureClearWinnersButtonV220();
  document.addEventListener('DOMContentLoaded', ensureClearWinnersButtonV220);
  korIdleIntervalV486(() => { if (!window.__v222EnsureSingleClearWinners) ensureClearWinnersButtonV220(); }, 6000);
})();


/* v221: hard clear winners button fix */
(function () {
  function q(id) { return document.getElementById(id); }

  function modalV221(opts) {
    if (typeof window.__v213StyledModal === 'function') return window.__v213StyledModal(opts);
    if (opts.mode === 'confirm') return Promise.resolve(confirm(opts.body || opts.title || 'Подтвердить?'));
    alert(opts.body || opts.title || '');
    return Promise.resolve(true);
  }

  async function clearWinnersV221() {
    const ok = await modalV221({
      title: 'ОЧИСТИТЬ СПИСОК',
      body: 'Точно очистить последние выигрыши?',
      mode: 'confirm'
    });

    if (!ok) return;

    // 1) Optimistic UI: clear immediately.
    try {
      if (window.state) {
        window.state.winners = [];
        window.state.lastWinner = null;
      }
    } catch (e) {}

    const list = q('winnersList');
    if (list) list.innerHTML = '<div class="winner-empty">Пока нет победителей</div>';

    // 2) WebSocket command for old server paths.
    try {
      if (typeof send === 'function') send('clear_winners_v221');
    } catch (e) {}

    // 3) Hard HTTP endpoint. This is the main fix.
    try {
      const res = await fetch('/api/clear-winners', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);

      const data = await res.json().catch(() => null);
      if (data && data.state) {
        try {
          window.state = data.state;
        } catch (e) {}
      }

      if (typeof render === 'function') {
        try { render(window.state); } catch (e) { try { render(); } catch (_) {} }
      }

      setTimeout(() => {
        const list2 = q('winnersList');
        if (list2 && !list2.textContent.trim()) {
          list2.innerHTML = '<div class="winner-empty">Пока нет победителей</div>';
        }
      }, 100);
    } catch (err) {
      await modalV221({
        title: 'ОШИБКА',
        body: 'Не получилось очистить список. Обнови страницу и попробуй ещё раз.',
        mode: 'alert'
      });
    }
  }

  function bindClearWinnersButtonV221() {
    const btn = q('clearWinnersBottomV220') || q('clearWinnersBottomV221');
    if (!btn || btn.dataset.v221Bound === '1') return;

    btn.id = 'clearWinnersBottomV221';
    btn.dataset.v221Bound = '1';
    btn.textContent = 'ОЧИСТИТЬ СПИСОК';

    const clone = btn.cloneNode(true);
    clone.dataset.v221Bound = '1';
    btn.replaceWith(clone);

    clone.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      clearWinnersV221();
    }, true);
  }

  function ensureButtonV221() {
    const panel = q('winnersPanel');
    if (!panel) return;

    let btn = q('clearWinnersBottomV221') || q('clearWinnersBottomV220');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'clearWinnersBottomV221';
      btn.type = 'button';
      btn.className = 'clear-winners-bottom-v220 clear-winners-bottom-v221';
      btn.textContent = 'ОЧИСТИТЬ СПИСОК';
      panel.appendChild(btn);
    }

    bindClearWinnersButtonV221();
  }

  if (document.body) ensureButtonV221();
  document.addEventListener('DOMContentLoaded', ensureButtonV221);
  korIdleIntervalV486(() => { if (!window.__v222EnsureSingleClearWinners) ensureButtonV221(); }, 6000);
})();


/* v222: prevent duplicated clear winners buttons */
(function () {
  function q(id) { return document.getElementById(id); }

  function modalV222(opts) {
    if (typeof window.__v213StyledModal === 'function') return window.__v213StyledModal(opts);
    if (opts.mode === 'confirm') return Promise.resolve(confirm(opts.body || opts.title || 'Подтвердить?'));
    alert(opts.body || opts.title || '');
    return Promise.resolve(true);
  }

  async function clearWinnersV222() {
    const ok = await modalV222({
      title: 'ОЧИСТИТЬ СПИСОК',
      body: 'Точно очистить последние выигрыши?',
      mode: 'confirm'
    });

    if (!ok) return;

    try {
      if (window.state) {
        window.state.winners = [];
        window.state.lastWinner = null;
      }
    } catch (e) {}

    const list = q('winnersList');
    if (list) list.innerHTML = '<div class="winner-empty">Пока нет победителей</div>';

    try {
      await fetch('/api/clear-winners', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    } catch (e) {
      try { if (typeof send === 'function') send('clear_winners_v221'); } catch (_) {}
    }

    try {
      if (typeof render === 'function') render(window.state);
    } catch (e) {}

    setTimeout(ensureSingleClearWinnersButtonV222, 80);
  }

  function ensureSingleClearWinnersButtonV222() {
    const panel = q('winnersPanel');
    if (!panel) return;

    const buttons = Array.from(document.querySelectorAll(
      '#clearWinnersBottomV220, #clearWinnersBottomV221, #clearWinnersBottomV222, .clear-winners-bottom-v220, .clear-winners-bottom-v221, .clear-winners-bottom-v222'
    ));

    let keeper = buttons.find(btn => panel.contains(btn)) || null;

    for (const btn of buttons) {
      if (btn !== keeper) btn.remove();
    }

    if (!keeper) {
      keeper = document.createElement('button');
      panel.appendChild(keeper);
    }

    keeper.id = 'clearWinnersBottomV222';
    keeper.type = 'button';
    keeper.className = 'clear-winners-bottom-v222';
    keeper.textContent = 'ОЧИСТИТЬ СПИСОК';

    if (keeper.dataset.v222Bound !== '1') {
      keeper.dataset.v222Bound = '1';
      keeper.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        clearWinnersV222();
      }, true);
    }

    // Always keep it as the final element in the winners panel.
    if (panel.lastElementChild !== keeper) {
      panel.appendChild(keeper);
    }
  }

  if (document.body) {
    setTimeout(ensureSingleClearWinnersButtonV222, 50);
    setTimeout(ensureSingleClearWinnersButtonV222, 400);
    setTimeout(ensureSingleClearWinnersButtonV222, 1200);
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(ensureSingleClearWinnersButtonV222, 50);
    setTimeout(ensureSingleClearWinnersButtonV222, 400);
    setTimeout(ensureSingleClearWinnersButtonV222, 1200);
  });

  // Mutation observer instead of creating new buttons every tick.
  setTimeout(() => {
    const panel = q('winnersPanel');
    if (!panel || window.__v222ClearWinnersObserver) return;

    window.__v222ClearWinnersObserver = new MutationObserver(() => {
      clearTimeout(window.__v222ClearWinnersTimer);
      window.__v222ClearWinnersTimer = setTimeout(ensureSingleClearWinnersButtonV222, 60);
    });

    window.__v222ClearWinnersObserver.observe(panel, { childList: true, subtree: false });
  }, 1000);

  // Low-frequency safety cleanup.
  korIdleIntervalV486(ensureSingleClearWinnersButtonV222, 5000);

  window.__v222EnsureSingleClearWinners = ensureSingleClearWinnersButtonV222;
})();


/* v223: followage diagnostics in winner block */
(function () {
  function q(id) { return document.getElementById(id); }

  function cleanV223(v) {
    return String(v || '').replace(/^@/, '').trim().toLowerCase();
  }

  function currentWinnerV223() {
    const fromState = window.state?.lastWinner?.username;
    if (fromState) return cleanV223(fromState);

    const text = q('winnerName')?.textContent || document.querySelector('.winner-name')?.textContent || '';
    return cleanV223(text);
  }

  function setFollowageV223(username, text, ok = false, hint = '') {
    const u = cleanV223(username);
    const cur = currentWinnerV223();
    if (u && cur && u !== cur) return;

    const el = q('winnerFollowInfo');
    if (!el) return;

    // v518: do not flash "checking Twitch" between real followage values.
    const checking = /проверяем|checking/i.test(String(text || ''));
    if (checking) {
      if (!String(el.textContent || '').trim()) el.textContent = '—';
      return;
    }
    const finalText = text || 'нет данных';
    if (el.textContent !== finalText) el.textContent = finalText;
    el.title = hint || '';
    el.classList.remove('followage-loading-v120');
    el.classList.toggle('followage-ok-v120', Boolean(ok));
    el.classList.toggle('followage-error-v223', !ok);
  }

  async function requestFollowageV223(username) {
    const u = cleanV223(username);
    if (!u) return;

    setFollowageV223(u, 'проверяем Twitch...', false);

    try {
      const res = await fetch(`/api/followage?user=${encodeURIComponent(u)}&debug=1`, { cache: 'no-store', credentials: 'same-origin' });
      const data = await res.json();

      const ok = data?.status === 'following' || data?.status === 'not_following';
      const txt = data?.followText || data?.reason || 'нет данных';
      const hint = [data?.reason, data?.hint].filter(Boolean).join(' | ');

      setFollowageV223(u, txt, data?.status === 'following', hint);

      if (data && window.console) {
        console.log('[followage v223]', data);
      }
    } catch (e) {
      console.warn('[followage v223]', e);
      setFollowageV223(u, 'ошибка запроса', false, String(e?.message || e || ''));
    }
  }

  const oldShowWinnerV223 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV223 && !window.__v223ShowWinnerWrapped) {
    window.__v223ShowWinnerWrapped = true;
    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const username = cleanV223(payload?.username || usernameOrPayload || '');

      const result = oldShowWinnerV223.apply(this, arguments);

      if (username) {
        setTimeout(() => requestFollowageV223(username), 350);
        setTimeout(() => requestFollowageV223(username), 2200);
      }

      return result;
    };
  }

  window.__v223RequestFollowage = requestFollowageV223;
})();




/* v288: one hard close for winner modal/chat after SAVE */
function v288CloseWinnerHard() {
  try { if (typeof window.__closeWinnerV62 === 'function') window.__closeWinnerV62(); } catch (_) {}
  try { document.getElementById('sitesModalV280')?.remove(); } catch (_) {}

  const ids = [
    'winnerBox','winnerChatBox','winnerModal','winnerOverlay','winnerPopup','winnerScreen',
    'winnerCard','winnerResult','rollingBox','rouletteWheelWrap'
  ];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.classList.add('hidden');
    el.classList.remove('show','active','is-open','open','visible','shown');
    el.setAttribute('aria-hidden','true');
    el.style.pointerEvents = 'none';
  }

  document.querySelectorAll('.winner-modal,.winner-overlay,.winner-popup,.winner-screen,.winner-window,.winner-card-modal').forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('show','active','is-open','open','visible','shown');
    el.setAttribute('aria-hidden','true');
    el.style.pointerEvents = 'none';
  });

  try {
    if (window.state) {
      window.state.pendingWinner = null;
      window.state.lastWinner = null;
      window.state.rolling = false;
    }
  } catch (_) {}

  try { if (typeof showVisual === 'function') showVisual('idleBox'); } catch (_) {}
  try {
    document.body.classList.remove('winner-active','winner-open','has-winner','show-winner','modal-open','winner-mode','v233-blur-active','v234-fullscreen-blur-active');
  } catch (_) {}
}
window.v288CloseWinnerHard = v288CloseWinnerHard;
/* v232: clean static save / close / blur handlers */
(function () {
  function q(id) { return document.getElementById(id); }

  function removeBlurV232() {
    document.body.classList.remove(
      'v226-wheel-blur','v226-winner-blur',
      'v227-wheel-blur','v227-winner-blur',
      'v228-blur-active','v229-blur-active','v230-blur-active','v231-blur-active','v232-blur-active'
    );

    document.querySelectorAll('.left-panel,.participants-panel,.chat-panel,.right-panel,.top-banner').forEach(el => {
      el.style.removeProperty('filter');
    });
  }

  function closeWinnerV232() {
    ['winnerBox','winnerChatBox','rollingBox','rouletteWheelWrap'].forEach(id => {
      const el = q(id);
      if (el) el.classList.add('hidden');
    });
    removeBlurV232();
  }

  async function saveWinnerV232() {
    try { if (typeof send === 'function') send('save_winner_v232'); } catch (e) {}

    try {
      const res = await fetch('/api/v232/save-winner', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store'
      });
      const data = await res.json().catch(() => null);
      if (data?.state) {
        data.state.pendingWinner = null;
        data.state.lastWinner = null;
        data.state.rolling = false;
        window.state = data.state;
        try { if (typeof render === 'function') render(data.state); } catch (e) {}
      }
    } catch (e) {}

    closeWinnerV232();
    v288CloseWinnerHard();
    setTimeout(v288CloseWinnerHard, 80);
    setTimeout(v288CloseWinnerHard, 250);
  }

  function bindV232() {
    const save = q('winnerSaveBtn');
    if (save && save.dataset.v232Bound !== '1') {
      save.dataset.v232Bound = '1';
      save.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        saveWinnerV232();
      }, true);
    }

    const close = q('winnerCloseBtn');
    if (close && close.dataset.v232Bound !== '1') {
      close.dataset.v232Bound = '1';
      close.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        try { if (typeof send === 'function') send('close_winner_v232'); } catch (_) {}
        fetch('/api/v232/close-winner', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store'
        }).catch(() => {});

        closeWinnerV232();
      }, true);
    }
  }

  const oldRender = window.render || (typeof render === 'function' ? render : null);
  if (oldRender && !window.__v232RenderWrapped) {
    window.__v232RenderWrapped = true;
    window.render = function () {
      const result = oldRender.apply(this, arguments);
      bindV232();
      return result;
    };
  }

  if (document.body) {
    bindV232();
    setTimeout(bindV232, 200);
    setTimeout(bindV232, 800);
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindV232();
    setTimeout(bindV232, 200);
    setTimeout(bindV232, 800);
  });

  window.__v232 = { saveWinner: saveWinnerV232, closeWinner: closeWinnerV232, removeBlur: removeBlurV232 };
})();


/* v233: real save/blur fix, no global cross, no chat rerender */
(function () {
  function q(id) { return document.getElementById(id); }

  let savingV233 = false;

  function removeBlurV233() {
    document.body.classList.remove(
      'v129-rerolling-wheel',
      'v226-wheel-blur','v226-winner-blur',
      'v227-wheel-blur','v227-winner-blur',
      'v228-blur-active','v229-blur-active',
      'v230-blur-active','v231-blur-active','v232-blur-active','v233-blur-active'
    );

    document.querySelectorAll('.left-panel,.participants-panel,.chat-panel,.right-panel,.top-banner').forEach(el => {
      el.style.removeProperty('filter');
    });
  }

  function hideWinnerOnlyV233() {
    try { if (typeof window.__v280CloseSites === 'function') window.__v280CloseSites(); } catch (e) {}
    const winnerBox = q('winnerBox');
    const winnerChat = q('winnerChatBox');

    if (winnerBox) winnerBox.classList.add('hidden');
    if (winnerChat) winnerChat.classList.add('hidden');

    // Do NOT hide the whole app and do NOT touch right-panel/left-panel.
    // Return center visual to idle if helper exists.
    try {
      if (typeof showVisual === 'function') showVisual('idleBox');
    } catch (e) {}

    removeBlurV233();
  }

  async function saveWinnerV233() {
    if (savingV233) return;
    savingV233 = true;

    const saveBtn = q('winnerSaveBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.classList.add('saving-v233');
      saveBtn.textContent = 'СОХРАНЕНО';
    }

    try {
      const res = await fetch('/api/v232/save-winner', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });

      const data = await res.json().catch(() => null);

      // First close modal visually, then update state. This prevents old render from opening roll screen.
      hideWinnerOnlyV233();

      if (data && data.state) {
        data.state.pendingWinner = null;
        data.state.lastWinner = null;
        data.state.rolling = false;
        window.state = data.state;
        try {
          if (typeof render === 'function') render(data.state);
        } catch (e) {}
        setTimeout(hideWinnerOnlyV233, 30);
        v288CloseWinnerHard();
        setTimeout(v288CloseWinnerHard, 80);
        setTimeout(v288CloseWinnerHard, 250);
        setTimeout(v288CloseWinnerHard, 700);
      }
    } catch (e) {
      hideWinnerOnlyV233();
      v288CloseWinnerHard();
    } finally {
      setTimeout(() => {
        savingV233 = false;
        const btn = q('winnerSaveBtn');
        if (btn) {
          btn.disabled = false;
          btn.classList.remove('saving-v233');
          btn.textContent = 'СОХРАНИТЬ';
        }
      }, 400);
    }
  }

  async function closeWinnerV233() {
    try {
      await fetch('/api/v232/close-winner', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });
    } catch (e) {}

    hideWinnerOnlyV233();
    setTimeout(hideWinnerOnlyV233, 30);
  }

  function isVisibleV233(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return !el.classList.contains('hidden') &&
      st.display !== 'none' &&
      st.visibility !== 'hidden' &&
      st.opacity !== '0' &&
      r.width > 20 &&
      r.height > 20;
  }

  function hasActiveModalV233() {
    return (
      isVisibleV233(q('winnerBox')) ||
      isVisibleV233(q('winnerChatBox')) ||
      isVisibleV233(q('rollingBox')) ||
      isVisibleV233(q('rouletteWheelWrap'))
    );
  }

  function applyBlurV233() {
    const active = hasActiveModalV233();
    document.body.classList.toggle('v233-blur-active', active);
    if (!active) removeBlurV233();
  }

  function bindV233() {
    const save = q('winnerSaveBtn');
    if (save && save.dataset.v233Bound !== '1') {
      save.dataset.v233Bound = '1';

      save.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        saveWinnerV233();
      }, true);

      save.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, true);
    }

    const close = q('winnerCloseBtn');
    if (close && close.dataset.v233Bound !== '1') {
      close.dataset.v233Bound = '1';

      close.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        closeWinnerV233();
      }, true);

      close.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, true);
    }
  }

  // Add blur when old rolling/winner functions are called, without touching chat render.
  const oldStartRolling = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (oldStartRolling && !window.__v233StartRollingWrapped) {
    window.__v233StartRollingWrapped = true;
    window.startRolling = function () {
      document.body.classList.add('v233-blur-active');
      return oldStartRolling.apply(this, arguments);
    };
  }

  const oldShowWinner = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinner && !window.__v233ShowWinnerWrapped) {
    window.__v233ShowWinnerWrapped = true;
    window.showWinner = function () {
      const result = oldShowWinner.apply(this, arguments);
      document.body.classList.add('v233-blur-active');
      setTimeout(bindV233, 20);
      setTimeout(applyBlurV233, 30);
      return result;
    };
  }

  const oldRender = window.render || (typeof render === 'function' ? render : null);
  if (oldRender && !window.__v233RenderWrapped) {
    window.__v233RenderWrapped = true;
    window.render = function () {
      const result = oldRender.apply(this, arguments);
      bindV233();
      setTimeout(applyBlurV233, 20);
      return result;
    };
  }

  if (document.body) {
    bindV233();
    setTimeout(bindV233, 200);
    setTimeout(applyBlurV233, 200);
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindV233();
    setTimeout(bindV233, 200);
    setTimeout(applyBlurV233, 200);
  });

  // Only controls binding + blur. No chat rerender, so no chat flicker.
  korIdleIntervalV486(() => {
    if (!window.__v482RenderWrapped) bindV233();
    applyBlurV233();
  }, 1800);

  window.__v233 = {
    saveWinner: saveWinnerV233,
    closeWinner: closeWinnerV233,
    removeBlur: removeBlurV233
  };
})();


/* v234: fullscreen blur layer fix */
(function () {
  function q(id) { return document.getElementById(id); }

  function isVisibleV234(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();

    return !el.classList.contains('hidden') &&
      st.display !== 'none' &&
      st.visibility !== 'hidden' &&
      st.opacity !== '0' &&
      r.width > 40 &&
      r.height > 40;
  }

  function hasWheelOrWinnerV234() {
    const directIds = [
      'rouletteWheelWrap',
      'rollingBox',
      'winnerBox',
      'winnerChatBox'
    ];

    if (directIds.some(id => isVisibleV234(q(id)))) return true;

    // fallback: если старая логика открыла колесо/ролл без правильного id
    const candidates = Array.from(document.querySelectorAll(
      '[id*="roulette" i], [class*="roulette" i], [id*="wheel" i], [class*="wheel" i], [id*="rolling" i], [class*="rolling" i], [id*="winner" i], [class*="winner" i]'
    ));

    return candidates.some(el => {
      if (!isVisibleV234(el)) return false;
      if (el.id === 'winnerSaveBtn') return false;
      if (el.id === 'logoutBtnV216') return false;

      const text = (el.innerText || '').toLowerCase();
      if (text.includes('последние выигравшие')) return false;
      if (text.includes('черный список')) return false;

      const r = el.getBoundingClientRect();
      return r.width > 180 && r.height > 120;
    });
  }

  function applyFullscreenBlurV234() {
    const active = hasWheelOrWinnerV234();
    document.body.classList.toggle('v234-fullscreen-blur-active', active);

    if (!active) {
      document.body.classList.remove(
        'v226-wheel-blur','v226-winner-blur',
        'v227-wheel-blur','v227-winner-blur',
        'v228-blur-active','v229-blur-active',
        'v230-blur-active','v231-blur-active',
        'v232-blur-active','v233-blur-active'
      );
    }
  }

  async function saveWinnerV234() {
    try { if (typeof send === 'function') send('save_winner_v232'); } catch (e) {}

    try {
      const res = await fetch('/api/v232/save-winner', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      });

      const data = await res.json().catch(() => null);

      ['winnerBox','winnerChatBox','rollingBox','rouletteWheelWrap'].forEach(id => {
        const el = q(id);
        if (el) el.classList.add('hidden');
      });

      document.body.classList.remove('v234-fullscreen-blur-active');

      if (data?.state) {
        data.state.pendingWinner = null;
        data.state.lastWinner = null;
        data.state.rolling = false;
        window.state = data.state;
        try { if (typeof render === 'function') render(data.state); } catch (e) {}
      }

      setTimeout(() => {
        ['winnerBox','winnerChatBox','rollingBox','rouletteWheelWrap'].forEach(id => {
          const el = q(id);
          if (el) el.classList.add('hidden');
        });
        document.body.classList.remove('v234-fullscreen-blur-active');
        v288CloseWinnerHard();
      }, 30);
      v288CloseWinnerHard();
      setTimeout(v288CloseWinnerHard, 100);
      setTimeout(v288CloseWinnerHard, 400);
    } catch (e) {
      ['winnerBox','winnerChatBox','rollingBox','rouletteWheelWrap'].forEach(id => {
        const el = q(id);
        if (el) el.classList.add('hidden');
      });
      document.body.classList.remove('v234-fullscreen-blur-active');
    }
  }

  function bindSaveV234() {
    const btn = q('winnerSaveBtn');
    if (!btn || btn.dataset.v234Bound === '1') return;

    btn.dataset.v234Bound = '1';

    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      saveWinnerV234();
    }, true);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);
  }

  const oldRender = window.render || (typeof render === 'function' ? render : null);
  if (oldRender && !window.__v234RenderWrapped) {
    window.__v234RenderWrapped = true;
    window.render = function () {
      const result = oldRender.apply(this, arguments);
      bindSaveV234();
      requestAnimationFrame(applyFullscreenBlurV234);
      return result;
    };
  }

  if (document.body) {
    bindSaveV234();
    applyFullscreenBlurV234();
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindSaveV234();
    applyFullscreenBlurV234();
  });

  // Только blur/save bind. Чат не трогаем вообще.
  korIdleIntervalV486(() => {
    if (!window.__v482RenderWrapped) bindSaveV234();
    applyFullscreenBlurV234();
  }, 1200);

  window.__v234 = {
    applyBlur: applyFullscreenBlurV234,
    saveWinner: saveWinnerV234
  };
})();




/* v280: rebuild SITES modal exactly under winner chat */
(function () {
  const sitesV280 = [
    ['SKINBRO', 'https://skinbro.ru/'],
    ['DINODROP', 'https://dinodrop.net/ru/bonuses'],
    ['JABKA', 'https://jabka.pro/'],
    ['MAGIC DROP', 'https://magic-drop.win']
  ];

  function q(id) {
    return document.getElementById(id);
  }

  function closeSitesV280() {
    q('sitesModalV280')?.remove();
    q('sitesModalV272')?.remove();
    q('sitesModalV273')?.remove();
    q('sitesModalV276')?.remove();
  }

  function rectOk(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  }

  function findWinnerChatV280() {
    // Сначала пробуем реальные/частые id/class.
    const direct = [
      q('winnerChatBox'),
      q('winnerChat'),
      q('winnerChatPanel'),
      document.querySelector('.winner-chat'),
      document.querySelector('.winner-chat-box'),
      document.querySelector('.winner-chat-panel')
    ].filter(Boolean);

    for (const el of direct) {
      if (rectOk(el)) {
        const r = el.getBoundingClientRect();
        if (r.width > 420 && r.height > 160) return el;
      }
    }

    // Потом ищем блок, где заголовок "ЧАТ ПОБЕДИТЕЛЯ".
    const nodes = Array.from(document.querySelectorAll('div, section, main, article'));
    const candidates = [];

    for (const el of nodes) {
      const text = (el.textContent || '').toLowerCase();
      if (!text.includes('чат победителя')) continue;
      if (!rectOk(el)) continue;

      const r = el.getBoundingClientRect();

      // Отсекаем слишком большие общие контейнеры и слишком маленькие строки.
      if (r.width < 420 || r.width > 820) continue;
      if (r.height < 180 || r.height > 520) continue;
      if (r.top < 250) continue;

      let score = 0;
      if (text.includes('сек')) score += 50;
      if (text.includes('стример')) score += 30;
      if (text.includes('ответ')) score += 30;
      score += 1000 - Math.abs(r.width - 580);
      score += 600 - Math.abs(r.height - 330);

      candidates.push({ el, r, score });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.el || null;
  }

  function openSitesV280() {
    closeSitesV280();

    const chat = findWinnerChatV280();
    const modal = document.createElement('div');
    modal.id = 'sitesModalV280';
    modal.className = 'sites-modal-v280';

    const card = document.createElement('div');
    card.className = 'sites-card-v280';

    const grid = document.createElement('div');
    grid.className = 'sites-grid-v280';

    for (const [name, url] of sitesV280) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sites-link-v280';
      btn.textContent = name;
      btn.addEventListener('pointerdown', function (event) {
        event.stopPropagation();
      });
      btn.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        window.open(url, '_blank', 'noopener,noreferrer');
        // The SITES strip is deliberately kept open until SITES is toggled or
        // the winner is closed; following a link must not close the strip.
      });
      grid.appendChild(btn);
    }

    card.appendChild(grid);
    modal.appendChild(card);
    document.body.appendChild(modal);

    positionSitesV280(chat, card);
  }

  function positionSitesV280(chat, card) {
    if (!card) return;

    let left;
    let top;
    let width;

    if (chat && rectOk(chat)) {
      const r = chat.getBoundingClientRect();

      // Вкладка отталкивается именно от окна чата:
      width = Math.max(520, Math.min(r.width, 760));
      left = r.left + (r.width - width) / 2;
      top = r.bottom + 14;

      // Если снизу мало места — ставим максимально низко, но не за экран.
      top = Math.min(top, window.innerHeight - 116);
    } else {
      // Только fallback, если чат не найден.
      width = 620;
      left = (window.innerWidth - width) / 2;
      top = Math.min(window.innerHeight - 116, window.innerHeight * 0.78);
    }

    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
    card.style.width = Math.round(width) + 'px';
  }

  function toggleSitesV280() {
    if (q('sitesModalV280') || q('sitesModalV272') || q('sitesModalV273') || q('sitesModalV276')) {
      closeSitesV280();
    } else {
      openSitesV280();
    }
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest?.('#winnerSitesBtn');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    toggleSitesV280();
  }, true);

  window.__v280OpenSites = openSitesV280;
  window.__v280CloseSites = closeSitesV280;
  window.__v280ToggleSites = toggleSitesV280;
})();


/* v281: SAVE keeps saving, then force closes winner exactly like X */
(function () {
  function q(id) { return document.getElementById(id); }

  function clickRealWinnerCloseIfExists() {
    const possible = [
      '#winnerCloseBtn',
      '#winnerClose',
      '#closeWinnerBtn',
      '#winnerModalClose',
      '#winnerPopupClose',
      '.winner-close',
      '.winner-close-btn',
      '.winner-modal-close',
      '.winner-popup-close'
    ];

    for (const sel of possible) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        try {
          btn.click();
          return true;
        } catch (_) {}
      }
    }

    // fallback: find visible X button inside winner window, not sites modal
    const buttons = Array.from(document.querySelectorAll('button, .btn, [role="button"]'));
    for (const btn of buttons) {
      const txt = (btn.textContent || '').trim();
      const insideSites = btn.closest('#sitesModalV280, #sitesModalV276, #sitesModalV272, #sitesModalV273');
      if (insideSites) continue;
      if (txt === '×' || txt === '✕' || txt === 'X') {
        const parentText = (btn.closest('div, section, main, article')?.textContent || '').toLowerCase();
        if (parentText.includes('победитель') || parentText.includes('быстрый победитель')) {
          try {
            btn.click();
            return true;
          } catch (_) {}
        }
      }
    }

    return false;
  }

  function hideWinnerContainers() {
    // Close sites too, if open.
    q('sitesModalV280')?.remove();
    q('sitesModalV276')?.remove();
    q('sitesModalV272')?.remove();
    q('sitesModalV273')?.remove();

    const selectors = [
      '#winnerModal',
      '#winnerOverlay',
      '#winnerPopup',
      '#winnerScreen',
      '#winnerCard',
      '#winnerBox',
      '#winnerResult',
      '#winnerChatBox',
      '.winner-modal',
      '.winner-overlay',
      '.winner-popup',
      '.winner-screen',
      '.winner-card-modal',
      '.winner-window'
    ];

    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const txt = (el.textContent || '').toLowerCase();
        const isWinner =
          sel.includes('winner') ||
          txt.includes('победитель') ||
          txt.includes('быстрый победитель') ||
          txt.includes('чат победителя') ||
          (txt.includes('реролл') && txt.includes('сохранить'));

        if (!isWinner) return;

        el.classList.add('hidden');
        el.classList.remove('show', 'active', 'is-open', 'open', 'visible', 'shown');
        el.setAttribute('aria-hidden', 'true');
        // v482: never poison the next winner with persistent inline display:none/opacity:0.
        el.style.removeProperty('display');
        el.style.removeProperty('pointer-events');
        el.style.removeProperty('opacity');
      });
    });

    // Remove body/modal states only; do not touch socket/chat connection.
    document.body.classList.remove(
      'winner-active',
      'winner-open',
      'has-winner',
      'show-winner',
      'modal-open',
      'winner-mode'
    );
  }

  function v281ForceCloseWinnerAfterSave() {
    // First do what the X does if that handler exists.
    clickRealWinnerCloseIfExists();

    // Then hard-hide remaining winner chat/modal shells.
    hideWinnerContainers();
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest?.('button, .btn, [role="button"], a');
    if (!btn) return;

    const txt = (btn.textContent || '').trim().toLowerCase();
    const id = (btn.id || '').toLowerCase();
    const cls = (btn.className || '').toString().toLowerCase();

    const isSave =
      id === 'winnersavebtn' ||
      id.includes('winnersave') ||
      cls.includes('winner-save') ||
      txt.includes('сохранить');

    if (!isSave) return;

    // Do NOT stop propagation: original save must run.
    // Close after save handler finishes.
    setTimeout(v281ForceCloseWinnerAfterSave, 120);
    setTimeout(v281ForceCloseWinnerAfterSave, 350);
    setTimeout(v281ForceCloseWinnerAfterSave, 850);
  }, false);

  window.v281ForceCloseWinnerAfterSave = v281ForceCloseWinnerAfterSave;
})();


/* v288SaveAlwaysCloseListenerFinal: close after every SAVE. Does not block original save. */
(function(){
  function isSave(target){
    const btn = target?.closest?.('#winnerSaveBtn,.winner-save,button,.btn,[role="button"],a');
    if (!btn) return false;
    const txt = (btn.textContent || '').trim().toLowerCase();
    const id = (btn.id || '').toLowerCase();
    const cls = (btn.className || '').toString().toLowerCase();
    return id === 'winnersavebtn' || cls.includes('winner-save') || txt.includes('сохранить') || txt.includes('сохранено');
  }
  function schedule(){
    setTimeout(v288CloseWinnerHard, 120);
    setTimeout(v288CloseWinnerHard, 320);
    setTimeout(v288CloseWinnerHard, 800);
    setTimeout(v288CloseWinnerHard, 1500);
  }
  document.addEventListener('pointerup', function(e){ if (isSave(e.target)) schedule(); }, false);
  document.addEventListener('click', function(e){ if (isSave(e.target)) schedule(); }, false);
})();


/* v289SaveUsesRealCloseButton: SAVE saves, then uses the same close action as X */
(function () {
  function byId(id) {
    return document.getElementById(id);
  }

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  }

  function v289FindRealWinnerCloseButton() {
    const selectors = [
      '#winnerCloseBtn',
      '#winnerClose',
      '#closeWinnerBtn',
      '#winnerModalClose',
      '#winnerPopupClose',
      '#winnerX',
      '.winner-close',
      '.winner-close-btn',
      '.winner-modal-close',
      '.winner-popup-close',
      '[data-action="close-winner"]',
      '[data-close="winner"]'
    ];

    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (isVisible(btn)) return btn;
    }

    // visible X inside the winner card/header, excluding SITES modal
    const buttons = Array.from(document.querySelectorAll('button, .btn, [role="button"]'));
    for (const btn of buttons) {
      if (!isVisible(btn)) continue;
      if (btn.closest('#sitesModalV280, #sitesModalV276, #sitesModalV272, #sitesModalV273')) continue;

      const txt = (btn.textContent || '').trim();
      if (txt !== '×' && txt !== '✕' && txt.toLowerCase() !== 'x') continue;

      let node = btn.parentElement;
      for (let i = 0; i < 8 && node; i += 1) {
        const t = (node.textContent || '').toLowerCase();
        if (t.includes('победитель') || t.includes('быстрый победитель') || t.includes('@')) {
          return btn;
        }
        node = node.parentElement;
      }
    }

    return null;
  }

  function v289CallKnownCloseFunctions() {
    const names = [
      'closeWinnerV62',
      'closeWinnerV232',
      'hideWinnerOnlyV233',
      '__closeWinnerV62',
      'v282CloseAllWinner',
      'v281ForceCloseWinnerAfterSave'
    ];

    for (const name of names) {
      try {
        const fn = window[name];
        if (typeof fn === 'function') fn();
      } catch (_) {}
    }
  }

  function v289RemoveOnlyWinnerBlurResidue() {
    try {
      // Known blur helpers if they exist.
      const helperNames = [
        'removeBlurV232',
        'removeBlurV233',
        'removeBlur',
        'hideBlur'
      ];
      for (const name of helperNames) {
        try {
          if (typeof window[name] === 'function') window[name]();
        } catch (_) {}
      }

      // Remove overlay elements left by winner flow only.
      [
        'v263GlobalBlurLayer',
        'v264BlurLayer',
        'v265BlurLayer',
        'v267RightBlurA',
        'v267RightBlurB',
        'sitesBackdropV273'
      ].forEach((id) => byId(id)?.remove());

      document.body.classList.remove(
        'v263-blur-active',
        'v264-blur-on',
        'v266-right-blocks-blur-active',
        'v267-right-blur-active',
        'winner-active',
        'winner-open',
        'has-winner',
        'show-winner',
        'modal-open',
        'winner-mode'
      );
    } catch (_) {}
  }

  function v289CloseLikeRealX() {
    // 1) First route: exactly what the real X does.
    const x = v289FindRealWinnerCloseButton();
    if (x) {
      try {
        x.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
        x.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
        x.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        x.click();
      } catch (_) {
        try { x.click(); } catch (__) {}
      }
    }

    // 2) Second route: known close functions, same logic as X versions.
    v289CallKnownCloseFunctions();

    // 3) Only cleanup residue after real close.
    v289RemoveOnlyWinnerBlurResidue();

    // 4) Make active winner impossible to rerender.
    try {
      if (window.state) {
        window.state.pendingWinner = null;
        window.state.lastWinner = null;
        window.state.rolling = false;
      }
    } catch (_) {}
  }

  function isSaveButtonV289(target) {
    const btn = target?.closest?.('#winnerSaveBtn, .winner-save, button, .btn, [role="button"], a');
    if (!btn) return false;
    const txt = (btn.textContent || '').trim().toLowerCase();
    const id = (btn.id || '').toLowerCase();
    const cls = (btn.className || '').toString().toLowerCase();
    return id === 'winnersavebtn' || cls.includes('winner-save') || txt.includes('сохранить');
  }

  function scheduleCloseLikeXV289() {
    // Do not block the original SAVE. Run after save/render finishes.
    setTimeout(v289CloseLikeRealX, 120);
    setTimeout(v289CloseLikeRealX, 350);
    setTimeout(v289CloseLikeRealX, 800);
  }

  document.addEventListener('click', function (e) {
    if (!isSaveButtonV289(e.target)) return;
    scheduleCloseLikeXV289();
  }, false);

  document.addEventListener('pointerup', function (e) {
    if (!isSaveButtonV289(e.target)) return;
    scheduleCloseLikeXV289();
  }, false);

  window.v289CloseLikeRealX = v289CloseLikeRealX;
})();


/* v294ParticipantsFontHelper: mark participants block for bigger chat-like font */
(function () {
  function v294ParticipantsFontHelper() {
    const nodes = Array.from(document.querySelectorAll('div, section, article'));
    for (const el of nodes) {
      const t = (el.textContent || '').toLowerCase();
      if (!t.includes('список участников')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 300 || r.height < 160) continue;
      el.classList.add('participants-panel');
      el.querySelectorAll('ol, ul, .list, [class*="participant"]').forEach(x => {
        x.classList.add('participants-list');
      });
      break;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', v294ParticipantsFontHelper);
  else v294ParticipantsFontHelper();

  document.addEventListener('korzhany:product-layout', v294ParticipantsFontHelper);
  setTimeout(v294ParticipantsFontHelper, 900);
})();


/* v428: Boost Bot winner response timer settings + reliable stop-on-chat */
(function () {
  const q = id => document.getElementById(id);
  let draftEnabled = true;

  function panelKeyV428() {
    try { return new URLSearchParams(location.search).get('key') || localStorage.getItem('rostyasha_admin_key') || '12345'; }
    catch { return '12345'; }
  }

  async function setSettingV428(name, value) {
    const qs = new URLSearchParams({ key: panelKeyV428(), name, value: String(value) });
    const res = await fetch(`/api/cmd/set_setting?${qs.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    if (data.state && typeof window.render === 'function') window.render(data.state);
    if (!data.ok) throw new Error(data.reason || 'save_failed');
    return data;
  }

  function currentV428() {
    const st = (window.state && window.state.settings) || {};
    const enabled = st.winnerResponseTimerEnabled !== false && st.winnerResponseTimerEnabled !== 'false' && st.winnerResponseTimerEnabled !== 0 && st.winnerResponseTimerEnabled !== '0';
    const sec = Math.max(5, Math.min(300, Math.floor(Number(st.winnerResponseTimerSec || 20))));
    return { enabled, sec };
  }

  function paintV428(fromState = false) {
    const modal = q('boostSettingsModalV428');
    const toggle = q('winnerTimerEnabledV428');
    const input = q('winnerTimerSecV428');
    if (!toggle || !input) return;
    const cur = currentV428();
    const hidden = !modal || modal.classList.contains('hidden');
    if (fromState && hidden) {
      draftEnabled = cur.enabled;
      input.value = String(cur.sec);
    }
    if (!toggle.classList.contains('v514-switch')) toggle.textContent = draftEnabled ? 'ВКЛ' : 'ВЫКЛ';
    toggle.setAttribute('aria-pressed', draftEnabled ? 'true' : 'false');
    toggle.setAttribute('aria-checked', draftEnabled ? 'true' : 'false');
    toggle.classList.toggle('is-on-v428', draftEnabled);
    input.disabled = !draftEnabled;
    input.closest('.boost-settings-time-v428')?.classList.toggle('is-disabled-v428', !draftEnabled);
  }

  function openV428() {
    const cur = currentV428();
    draftEnabled = cur.enabled;
    const input = q('winnerTimerSecV428');
    if (input) input.value = String(cur.sec);
    paintV428(false);
    const modal = q('boostSettingsModalV428');
    if (modal) {
      modal.classList.remove('is-closing-v486','hidden');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeV428() {
    const modal = q('boostSettingsModalV428');
    if (!modal || modal.classList.contains('hidden') || modal.classList.contains('is-closing-v486')) return;
    modal.classList.add('is-closing-v486');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('is-closing-v486'); }, 135);
  }

  async function saveV428() {
    const btn = q('boostSettingsSaveV428');
    const input = q('winnerTimerSecV428');
    const sec = Math.max(5, Math.min(300, Math.floor(Number(input?.value || 20))));
    if (input) input.value = String(sec);
    if (btn) { btn.disabled = true; btn.textContent = 'СОХРАНЯЮ...'; }
    try {
      await setSettingV428('winnerResponseTimerEnabled', draftEnabled);
      await setSettingV428('winnerResponseTimerSec', sec);
      try {
        localStorage.setItem('korzhany_winner_timer_enabled', draftEnabled ? 'true' : 'false');
        localStorage.setItem('korzhany_winner_timer_sec', String(sec));
      } catch (_) {}
      if (typeof window.toast === 'function') window.toast('Настройки таймера сохранены');
      closeV428();
    } catch (e) {
      console.error('[v428 timer settings]', e);
      if (typeof window.toast === 'function') window.toast('Не удалось сохранить таймер');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'СОХРАНИТЬ'; }
    }
  }

  function bindV428() {
    q('boostSettingsBtnV428')?.addEventListener('click', openV428);
    q('boostSettingsCloseV428')?.addEventListener('click', closeV428);
    q('boostSettingsSaveV428')?.addEventListener('click', saveV428);
    q('winnerTimerEnabledV428')?.addEventListener('click', () => { draftEnabled = !draftEnabled; paintV428(false); });
    q('boostSettingsModalV428')?.addEventListener('click', e => { if (e.target === q('boostSettingsModalV428')) closeV428(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeV428(); });
    document.querySelectorAll('[data-winner-timer-preset]').forEach(btn => btn.addEventListener('click', () => {
      const input = q('winnerTimerSecV428');
      if (input && !input.disabled) input.value = String(btn.dataset.winnerTimerPreset || '15');
    }));
    paintV428(true);
  }

  const oldRenderV428 = window.render;
  if (typeof oldRenderV428 === 'function') {
    window.render = function(next) {
      const out = oldRenderV428(next);
      paintV428(false);
      return out;
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindV428);
  else bindV428();
})();


/* v482: streamer-session hard fixes — winner shell, payout history, panel scroll, chat zoom */
(function () {
  const q = id => document.getElementById(id);
  const clean = v => String(v || '').replace(/^@/, '').trim().toLowerCase();
  let winnersViewV482 = localStorage.getItem('korzhany_v482_winners_view') === 'payouts' ? 'payouts' : 'recent';
  let flippingV482 = false;
  let savingV482 = false;
  let winnersSignatureV486 = '';

  function moneyV482(value) {
    const n = Math.max(0, Math.round(Number(value || 0)));
    return `${new Intl.NumberFormat('ru-RU').format(n)} ₽`;
  }

  function currentWinnerV482() {
    return clean(window.state?.lastWinner?.username || window.state?.pendingWinner || q('winnerName')?.textContent || '');
  }

  /* v483: bounded winner repair.
     v482 used a MutationObserver that fought legacy winner-close handlers over the same
     class/style attributes. When a winner was present this could create an endless
     mutation -> repair -> mutation loop and lock the whole panel/main thread. */
  let winnerRepairSeqV483 = 0;

  function sanitizeWinnerShellV482() {
    if (!winnerIsActiveV482()) return;
    for (const id of ['winnerBox', 'winnerChatBox']) {
      const el = q(id);
      if (!el) continue;
      if (el.style.display) el.style.removeProperty('display');
      if (el.style.visibility) el.style.removeProperty('visibility');
      if (el.style.opacity) el.style.removeProperty('opacity');
      if (el.style.pointerEvents) el.style.removeProperty('pointer-events');
    }
    const name = q('winnerName');
    if (name) {
      const nextName = clean(name.textContent || window.state?.pendingWinner || window.state?.lastWinner?.username || '');
      if (nextName && name.textContent !== nextName) name.textContent = nextName;
    }
  }

  function winnerIsActiveV482() {
    if (window.state?.rolling) return false;
    // pendingWinner is authoritative. lastWinner alone may remain in a stale/disconnected snapshot.
    if (window.state?.pendingWinner) return true;
    const box = q('winnerBox');
    const chat = q('winnerChatBox');
    const uiAlreadyOpen = Boolean(box && !box.classList.contains('hidden')) || Boolean(chat && !chat.classList.contains('hidden'));
    return Boolean(window.state?.lastWinner?.username && uiAlreadyOpen);
  }

  function hardEnsureWinnerV482() {
    if (!winnerIsActiveV482()) return;
    if (Date.now() < Number(window.__v482WinnerClosingUntil || 0)) return;
    sanitizeWinnerShellV482();
    const box = q('winnerBox');
    const chat = q('winnerChatBox');
    if (box?.classList.contains('hidden')) box.classList.remove('hidden');
    if (chat?.classList.contains('hidden')) chat.classList.remove('hidden');
    const center = document.querySelector('.center-visual');
    if (center) {
      if (!center.classList.contains('roulette-active')) center.classList.add('roulette-active');
      if (!center.classList.contains('winner-mode')) center.classList.add('winner-mode');
    }
  }

  function scheduleWinnerRepairV483() {
    const seq = ++winnerRepairSeqV483;
    // Legacy layers can hide winnerBox immediately and one old path did it around 7s.
    // Repair only at a few bounded checkpoints — never observe/poll DOM attributes.
    [0, 90, 320, 950, 7100, 7600].forEach(delay => {
      setTimeout(() => {
        if (seq !== winnerRepairSeqV483) return;
        hardEnsureWinnerV482();
      }, delay);
    });
  }

  function installWinnerGuardV482() {
    // Intentionally no MutationObserver in v483. Kept as a no-op for compatibility.
    window.__v482WinnerGuardInstalled = true;
  }

  function closeSitesV482() {
    try { window.__v280CloseSites?.(); } catch (_) {}
    ['sitesModalV280','sitesModalV276','sitesModalV273','sitesModalV272'].forEach(id => q(id)?.remove());
  }

  function closeWinnerClientV482() {
    window.__v482WinnerClosingUntil = Date.now() + 5000;
    winnerRepairSeqV483 += 1;
    closeSitesV482();
    try { window.__closeWinnerV62?.(); } catch (_) {}
    ['winnerBox','winnerChatBox','rollingBox','rouletteWheelWrap'].forEach(id => q(id)?.classList.add('hidden'));
    document.body.classList.remove('v233-blur-active','v234-fullscreen-blur-active','winner-active','winner-open','has-winner','show-winner','modal-open','winner-mode');
  }

  function ensureWinnersSwitchV482() {
    const panel = q('winnersPanel');
    if (!panel) return;
    let sw = q('winnersSwitchV482');
    if (!sw) {
      sw = document.createElement('div');
      sw.id = 'winnersSwitchV482';
      sw.className = 'winners-switch-v482';
      sw.innerHTML = '<button type="button" data-v482-view="recent">ПОСЛЕДНИЕ</button><button type="button" data-v482-view="payouts">ТОП ПО ВЫВОДАМ</button>';
      const title = panel.querySelector('.right-title');
      if (title) title.insertAdjacentElement('afterend', sw);
      else panel.prepend(sw);
      sw.addEventListener('click', e => {
        const btn = e.target.closest('[data-v482-view]');
        if (!btn || flippingV482 || btn.dataset.v482View === winnersViewV482) return;
        flippingV482 = true;
        panel.classList.add('v482-flip-out');
        setTimeout(() => {
          winnersViewV482 = btn.dataset.v482View === 'payouts' ? 'payouts' : 'recent';
          localStorage.setItem('korzhany_v482_winners_view', winnersViewV482);
          renderWinnersV482();
          panel.classList.remove('v482-flip-out');
          panel.classList.add('v482-flip-in');
          setTimeout(() => { panel.classList.remove('v482-flip-in'); flippingV482 = false; }, 220);
        }, 180);
      });
    }
    sw.querySelectorAll('[data-v482-view]').forEach(btn => btn.classList.toggle('active', btn.dataset.v482View === winnersViewV482));
  }

  function renderWinnersV482() {
    ensureWinnersSwitchV482();
    const panel = q('winnersPanel');
    const list = q('winnersList');
    const title = panel?.querySelector('.right-title');
    if (!list || !title) return;
    const winners = Array.isArray(window.state?.winners) ? window.state.winners : [];
    const nextSig = winnersViewV482 + '|' + winners.slice(0, 40).map(w => `${clean(w?.username)}:${Math.max(0, Number(w?.withdrawalRub || 0) || 0)}`).join('\u001f');
    const buttons = q('winnersSwitchV482')?.querySelectorAll('[data-v482-view]');
    buttons?.forEach(btn => btn.classList.toggle('active', btn.dataset.v482View === winnersViewV482));
    if (nextSig === winnersSignatureV486) return;
    winnersSignatureV486 = nextSig;

    if (winnersViewV482 === 'payouts') {
      if (title.innerHTML !== 'ТОП ПО<br>ВЫВОДАМ') title.innerHTML = 'ТОП ПО<br>ВЫВОДАМ';
      const totals = new Map();
      winners.forEach((w, idx) => {
        const username = clean(w.username);
        if (!username) return;
        const cur = totals.get(username) || { username, withdrawalRub: 0, firstIndex: idx };
        cur.withdrawalRub += Math.max(0, Number(w.withdrawalRub || 0) || 0);
        cur.firstIndex = Math.min(cur.firstIndex, idx);
        totals.set(username, cur);
      });
      const ranked = Array.from(totals.values()).sort((a,b) => (b.withdrawalRub - a.withdrawalRub) || (a.firstIndex - b.firstIndex)).slice(0, 10);
      list.innerHTML = ranked.length ? ranked.map((w,i) => `<div class="winner-row winner-row-v482 payout-row-v482"><span>${i+1}. ${esc(w.username)}</span><b>${esc(moneyV482(w.withdrawalRub))}</b></div>`).join('') : '<div class="winner-row winner-row-v482"><span>Пока нет победителей</span></div>';
    } else {
      if (title.innerHTML !== 'ПОСЛЕДНИЕ<br>ВЫИГРАВШИЕ') title.innerHTML = 'ПОСЛЕДНИЕ<br>ВЫИГРАВШИЕ';
      list.innerHTML = winners.length ? winners.slice(0,10).map((w,i) => `<div class="winner-row winner-row-v482"><span>${i+1}. ${esc(clean(w.username))}</span></div>`).join('') : '<div class="winner-row winner-row-v482"><span>Пока нет победителей</span></div>';
    }
  }

  function payoutModalV482() {
    q('winnerPayoutModalV482')?.remove();
    const username = currentWinnerV482();
    const modal = document.createElement('div');
    modal.id = 'winnerPayoutModalV482';
    modal.className = 'winner-payout-modal-v482';
    modal.innerHTML = `
      <div class="winner-payout-card-v482" role="dialog" aria-modal="true">
        <button type="button" class="winner-payout-close-v482" aria-label="Закрыть">×</button>
        <div class="winner-payout-kicker-v482">СОХРАНЕНИЕ ПОБЕДИТЕЛЯ</div>
        <div class="winner-payout-nick-v482">${esc(username)}</div>
        <div class="winner-payout-title-v482">СУММА ВЫВОДА</div>
        <label class="winner-payout-input-v482"><input inputmode="decimal" autocomplete="off" value="0"><span>₽</span></label>
        <div class="winner-payout-hint-v482">Можно оставить 0, если вывода не было.</div>
        <button type="button" class="winner-payout-save-v482">СОХРАНИТЬ</button>
      </div>`;
    document.body.appendChild(modal);
    const input = modal.querySelector('input');
    setTimeout(() => { input?.focus(); input?.select(); }, 30);

    const close = () => { if (!modal.isConnected || modal.classList.contains('is-closing-v486')) return; modal.classList.add('is-closing-v486'); setTimeout(() => modal.remove(), 135); };
    modal.querySelector('.winner-payout-close-v482')?.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') modal.querySelector('.winner-payout-save-v482')?.click(); });
    modal.querySelector('.winner-payout-save-v482')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (savingV482) return;
      savingV482 = true;
      const raw = String(input?.value || '0').replace(/\s+/g,'').replace(',','.').replace(/[^\d.]/g,'');
      const amount = Math.max(0, Math.round(Number(raw || 0)));
      const btn = modal.querySelector('.winner-payout-save-v482');
      if (btn) { btn.disabled = true; btn.textContent = 'СОХРАНЯЮ...'; }
      try {
        const res = await fetch('/api/v232/save-winner', {
          method: 'POST', credentials: 'same-origin', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ withdrawalRub: amount })
        });
        const data = await res.json();
        if (!data?.ok) throw new Error(data?.reason || 'save_failed');
        if (data.state) {
          window.state = data.state;
          if (typeof window.render === 'function') window.render(data.state);
        }
        close();
        closeWinnerClientV482();
        renderWinnersV482();
        if (typeof window.toast === 'function') window.toast(`Сохранено · вывод ${moneyV482(amount)}`);
      } catch (err) {
        console.error('[v482 payout save]', err);
        if (typeof window.toast === 'function') window.toast('Не удалось сохранить победителя');
        if (btn) { btn.disabled = false; btn.textContent = 'СОХРАНИТЬ'; }
      } finally {
        savingV482 = false;
      }
    });
  }

  function replaceSaveButtonV482() {
    const old = q('winnerSaveBtn');
    if (!old || old.dataset.v482Bound === '1') return;
    const btn = old.cloneNode(true);
    btn.dataset.v482Bound = '1';
    btn.dataset.v232Bound = '1';
    btn.dataset.v233Bound = '1';
    btn.dataset.v234Bound = '1';
    btn.disabled = false;
    btn.textContent = 'СОХРАНИТЬ';
    old.replaceWith(btn);
    const swallow = e => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if ((e.type === 'pointerdown' || e.type === 'click') && !q('winnerPayoutModalV482')) payoutModalV482();
    };
    btn.addEventListener('pointerdown', swallow, true);
    btn.addEventListener('pointerup', e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }, true);
    btn.addEventListener('click', swallow, true);
  }

  function bindCloseV482() {
    const close = q('winnerCloseBtn');
    if (!close || close.dataset.v482SitesBound === '1') return;
    close.dataset.v482SitesBound = '1';
    // Document capture runs before legacy target handlers and guarantees the sites tray is gone too.
    document.addEventListener('pointerdown', e => {
      if (!e.target.closest?.('#winnerCloseBtn')) return;
      window.__v482WinnerClosingUntil = Date.now() + 5000;
      winnerRepairSeqV483 += 1;
      closeSitesV482();
    }, true);
  }

  function initChatZoomV482() {
    const panel = q('chatPanel');
    const list = q('chatList');
    if (!panel || !list || panel.dataset.v482ZoomBound === '1') return;
    panel.dataset.v482ZoomBound = '1';
    let scale = Math.max(.7, Math.min(1.8, Number(localStorage.getItem('korzhany_v482_chat_zoom') || 1)));
    const apply = () => {
      list.style.setProperty('--v482-chat-zoom', String(scale));
      list.style.zoom = String(scale);
      panel.dataset.chatZoom = `${Math.round(scale * 100)}%`;
    };
    apply();
    panel.addEventListener('wheel', e => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
      scale = Math.max(.7, Math.min(1.8, +(scale + (e.deltaY < 0 ? .1 : -.1)).toFixed(2)));
      localStorage.setItem('korzhany_v482_chat_zoom', String(scale));
      apply();
    }, { passive: false });
  }

  window.__v484OpenPayout = payoutModalV482;
  window.__v484RenderWinners = renderWinnersV482;

  function bootV482() {
    replaceSaveButtonV482();
    bindCloseV482();
    installWinnerGuardV482();
    initChatZoomV482();
    ensureWinnersSwitchV482();
    renderWinnersV482();
    if (winnerIsActiveV482()) scheduleWinnerRepairV483();
  }

  const oldShowWinnerV482 = window.showWinner;
  if (typeof oldShowWinnerV482 === 'function' && !window.__v482ShowWinnerWrapped) {
    window.__v482ShowWinnerWrapped = true;
    window.showWinner = function () {
      window.__v482WinnerClosingUntil = 0;
      const out = oldShowWinnerV482.apply(this, arguments);
      scheduleWinnerRepairV483();
      return out;
    };
  }

  const oldRenderV482 = window.render;
  if (typeof oldRenderV482 === 'function' && !window.__v482RenderWrapped) {
    window.__v482RenderWrapped = true;
    window.render = function () {
      const out = oldRenderV482.apply(this, arguments);
      replaceSaveButtonV482();
      renderWinnersV482();
      if (winnerIsActiveV482()) hardEnsureWinnerV482();
      return out;
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootV482);
  else bootV482();
  setTimeout(bootV482, 150);
  setTimeout(bootV482, 700);
})();


/* v484: stream-tested polish — persistent player history, reroll reasons, save hard-bind. */
(function(){
  const q = id => document.getElementById(id);
  const esc484 = s => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const clean484 = s => String(s || '').trim().replace(/^@/,'').toLowerCase();
  let rerollModalBusyV484 = false;

  function closeModal484(root){ if(!root || !root.isConnected || root.classList.contains('is-closing-v486')) return; root.classList.add('is-closing-v486'); setTimeout(()=>root.remove(),135); }

  function modalShell484(id, inner, extra=''){
    q(id)?.remove();
    const root=document.createElement('div');
    root.id=id;
    root.className=`v484-modal-root ${extra}`.trim();
    root.innerHTML=`<div class="v484-modal-backdrop"></div><div class="v484-modal-card" role="dialog" aria-modal="true">${inner}</div>`;
    document.body.appendChild(root);
    root.querySelector('.v484-modal-backdrop')?.addEventListener('click',()=>closeModal484(root));
    root.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal484(root)});
    return root;
  }

  async function fetchPlayer484(user, refresh=false){
    const qs=new URLSearchParams({user:clean484(user)}); if(refresh)qs.set('refresh','1');
    const res=await fetch(`/api/v484/player?${qs}`,{credentials:'same-origin',cache:'no-store'});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data?.ok)throw new Error(data?.reason||`HTTP ${res.status}`);
    return data;
  }

  function statusText484(row){
    if(row.status==='saved')return row.withdrawalRub>0?`Сохранён · вывод ${Number(row.withdrawalRub).toLocaleString('ru-RU')} ₽`:'Сохранён · вывод 0 ₽';
    if(row.status==='rerolled')return `Реролл${row.rerollReason?` · ${row.rerollReason}`:''}`;
    return 'Выпал';
  }

  function openHistory484(data){
    const h=Array.isArray(data?.persistent?.history)?data.persistent.history:[];
    const rows=h.length?h.map(row=>{
      const isR=row.type==='reroll';
      const title=isR?`РЕРОЛЛ · ${esc484(row.reason||'Без причины')}`:`ВЫПАДЕНИЕ · ${esc484(statusText484(row))}`;
      return `<div class="v484-history-row ${isR?'is-reroll':'is-appearance'}"><div><b>${title}</b><span>${esc484(row.dateText||new Date(row.at).toLocaleString('ru-RU'))}</span></div></div>`;
    }).join(''):'<div class="v484-history-empty">История пока пустая</div>';
    const root=modalShell484('v484HistoryModal',`
      <button class="v484-x" type="button">×</button>
      <div class="v484-kicker">ИСТОРИЯ ИГРОКА</div>
      <div class="v484-title">${esc484(data.user)}</div>
      <div class="v484-history-list">${rows}</div>
      <button class="v484-main-btn v484-close-history" type="button">ЗАКРЫТЬ</button>`,'v484-history-modal');
    root.querySelector('.v484-x')?.addEventListener('click',()=>closeModal484(root));
    root.querySelector('.v484-close-history')?.addEventListener('click',()=>closeModal484(root));
  }

  function formatLifetimeV514(seconds) {
    const min = Math.floor(Math.max(0, Number(seconds) || 0) / 60);
    const days = Math.floor(min / 1440), hours = Math.floor((min % 1440) / 60), mins = min % 60;
    if (days) return `${days} д ${hours} ч ${mins} мин`;
    if (hours) return `${hours} ч ${mins} мин`;
    return `${mins} мин`;
  }

  function openPlayerCard484(data){
    const p=data.persistent||{}, s=data.session||{}, f=p.follow||{};
    const follow=f.followText||'нет данных';
    const root=modalShell484('v484PlayerCard',`
      <button class="v484-x" type="button">×</button>
      <div class="v484-kicker">ПРОВЕРКА НИКА</div>
      <div class="v484-title">${esc484(data.user)}</div>
      <div class="v484-player-stats">
        <div><span>В участниках</span><b>${s.participant?'да':'нет'}</b></div>
        <div><span>SMS за сеанс</span><b>${Number(s.sms||0)}</b></div>
        <div><span>Watchtime за сеанс</span><b>${Number(s.watchMin||0)} мин</b></div>
        <div><span>Watchtime за всё время <small class="v514-since">(с начала учёта)</small></span><b>${formatLifetimeV514(p.watchtimeTotalSec)}</b></div>
        <div><span>Фолловит Twitch</span><b>${esc484(follow)}</b></div>
        <div><span>Сообщений за 30 дней</span><b>${Number(p.messages30d||0)}</b></div>
        <div><span>Выпадений всего</span><b>${Number(p.appearances||0)}</b></div>
        <div><span>Рероллов</span><b>${Number(p.rerolls||0)}</b></div>
        <div><span>Выведено всего</span><b>${Number(p.totalPayoutRub||0).toLocaleString('ru-RU')} ₽</b></div>
      </div>
      <div class="v484-actions"><button class="v484-secondary-btn v484-history-btn" type="button">ИСТОРИЯ</button><button class="v484-main-btn v484-card-ok" type="button">ОК</button></div>`,'v484-player-modal');
    root.querySelector('.v484-x')?.addEventListener('click',()=>closeModal484(root));
    root.querySelector('.v484-card-ok')?.addEventListener('click',()=>closeModal484(root));
    root.querySelector('.v484-history-btn')?.addEventListener('click',()=>{
      // v489: one overlay at a time, so HISTORY stays exactly centered.
      root.remove();
      openHistory484(data);
    });
  }

  async function openPlayerSearch484(){
    const root=modalShell484('v484PlayerSearch',`
      <button class="v484-x" type="button">×</button>
      <div class="v484-kicker">ПОИСК НИКА</div>
      <div class="v484-title">ПРОВЕРКА ИГРОКА</div>
      <div class="v484-sub">Ник можно вводить с @ или без.</div>
      <input class="v484-search-input" autocomplete="off" placeholder="nickname" />
      <div class="v484-search-status"></div>
      <div class="v484-actions"><button class="v484-secondary-btn v484-search-cancel" type="button">ОТМЕНА</button><button class="v484-main-btn v484-search-go" type="button">НАЙТИ</button></div>`,'v484-search-modal');
    const input=root.querySelector('.v484-search-input'), status=root.querySelector('.v484-search-status'), go=root.querySelector('.v484-search-go');
    const close=()=>closeModal484(root);
    root.querySelector('.v484-x')?.addEventListener('click',close);
    root.querySelector('.v484-search-cancel')?.addEventListener('click',close);
    async function run(){
      const user=clean484(input?.value); if(!user){status.textContent='Введи ник';return;}
      go.disabled=true; status.textContent='Проверяю Twitch и историю…';
      try{ const data=await fetchPlayer484(user); close(); openPlayerCard484(data); }
      catch(err){ status.textContent='Не удалось получить данные'; console.warn('[v484 player]',err); go.disabled=false; }
    }
    go?.addEventListener('click',run);
    input?.addEventListener('keydown',e=>{if(e.key==='Enter')run()});
    setTimeout(()=>input?.focus(),30);
  }
  window.__v484OpenPlayerSearch=openPlayerSearch484;

  function rerollReasonModal484(){
    // v517: previous SITES surface must not cover the reason dialog.
    window.__v280CloseSites?.();
    return new Promise(resolve=>{
      const root=modalShell484('v487ReasonModal',`
        <button class="v484-x" type="button">×</button>
        <div class="v484-kicker">РЕРОЛЛ ПОБЕДИТЕЛЯ</div>
        <div class="v484-title">ВЫБЕРИ ПРИЧИНУ</div>
        <div class="v484-reasons">
          <button type="button" data-reason="Не успел ответить">НЕ УСПЕЛ ОТВЕТИТЬ</button>
          <button type="button" data-reason="Не выполнил условия">НЕ ВЫПОЛНИЛ УСЛОВИЯ</button>
          <button type="button" data-reason="Твинк аккаунт">ТВИНК АККАУНТ</button>
          <button type="button" data-reason="Без причины">БЕЗ ПРИЧИНЫ</button>
        </div>`,'v484-reason-modal v487-reason-modal');
      let done=false; const finish=v=>{if(done)return;done=true;closeModal484(root);resolve(v)};
      root.querySelector('.v484-x')?.addEventListener('click',()=>finish(null));
      root.querySelector('.v484-modal-backdrop')?.addEventListener('click',()=>finish(null));
      root.querySelectorAll('[data-reason]').forEach(btn=>btn.addEventListener('click',()=>finish(btn.dataset.reason||'Без причины')));
    });
  }

  window.__v489OpenRerollReason = rerollReasonModal484;

  window.__v484RequestReroll=async function(runReroll){
    if(rerollModalBusyV484)return;
    rerollModalBusyV484=true;
    try{
      const reason=await rerollReasonModal484();
      if(!reason)return;
      const res=await fetch('/api/v484/reroll-reason',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data?.ok){ if(typeof window.toast==='function')window.toast('Не удалось сохранить причину реролла'); return; }
      if(typeof runReroll==='function')await runReroll();
    }catch(err){console.warn('[v484 reroll reason]',err);if(typeof window.toast==='function')window.toast('Ошибка реролла');}
    finally{rerollModalBusyV484=false;}
  };

  // HARD bind CODE at document capture level too. Never allow the legacy browser prompt to win.
  let codeModalBusyV484=false;
  async function openCodeModal484(){
    if(codeModalBusyV484)return;
    codeModalBusyV484=true;
    try{
      const current=String(window.state?.settings?.codeWord||q('codeBtnText')?.textContent||'+').trim()||'+';
      let value=null;
      if(typeof window.__v213StyledModal==='function'){
        value=await window.__v213StyledModal({title:'КОД УЧАСТИЯ',body:'Введи новое кодовое слово:',mode:'prompt',value:current,placeholder:'+'});
      }else{
        value=await new Promise(resolve=>{
          const root=modalShell484('v484CodeModal',`
            <button class="v484-x" type="button">×</button>
            <div class="v484-kicker">КОД УЧАСТИЯ</div>
            <div class="v484-title">НОВОЕ КОДОВОЕ СЛОВО</div>
            <input class="v484-search-input v484-code-input" autocomplete="off" value="${esc484(current)}" placeholder="+" />
            <div class="v484-actions"><button class="v484-secondary-btn v484-code-cancel" type="button">ОТМЕНА</button><button class="v484-main-btn v484-code-save" type="button">СОХРАНИТЬ</button></div>`,'v484-code-modal');
          const input=root.querySelector('.v484-code-input');
          let done=false;
          const finish=v=>{if(done)return;done=true;closeModal484(root);resolve(v)};
          root.querySelector('.v484-x')?.addEventListener('click',()=>finish(null));
          root.querySelector('.v484-code-cancel')?.addEventListener('click',()=>finish(null));
          root.querySelector('.v484-code-save')?.addEventListener('click',()=>finish(String(input?.value||'').trim()));
          input?.addEventListener('keydown',e=>{if(e.key==='Enter')finish(String(input.value||'').trim());if(e.key==='Escape')finish(null)});
          setTimeout(()=>{input?.focus();input?.select()},30);
        });
      }
      value=String(value??'').trim();
      if(value&&typeof send==='function')send('set_code',{code:value});
    }catch(err){console.warn('[v484 code modal]',err);}
    finally{codeModalBusyV484=false;}
  }
  window.__v484OpenCodeModal=openCodeModal484;

  // HARD bind SAVE at document capture level. Dynamic legacy buttons can no longer bypass the payout dialog.
  let savePointerStampV484=0;
  document.addEventListener('pointerdown',e=>{
    const btn=e.target.closest?.('#winnerSaveBtn,.winner-save');
    if(!btn)return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    savePointerStampV484=Date.now();
    if(!q('winnerPayoutModalV482')&&typeof window.__v484OpenPayout==='function')window.__v484OpenPayout();
  },true);
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#winnerSaveBtn,.winner-save');
    if(!btn)return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if(Date.now()-savePointerStampV484>500&&!q('winnerPayoutModalV482')&&typeof window.__v484OpenPayout==='function')window.__v484OpenPayout();
  },true);

  // Keep payout top authoritative if very old visual guards try to repaint the list.
  const list=q('winnersList');
  if(list&&!list.dataset.v484Observed){
    list.dataset.v484Observed='1';
    let scheduled=false;
    new MutationObserver(()=>{
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(()=>{
        scheduled=false;
        const payoutActive=localStorage.getItem('korzhany_v482_winners_view')==='payouts';
        if(payoutActive&&!list.querySelector('.payout-row-v482 > b')&&typeof window.__v484RenderWinners==='function')window.__v484RenderWinners();
      });
    }).observe(list,{childList:true});
  }
})();


/* ==========================================================================
   v489 — centered large dialogs + truly silent QUICK reroll
   ========================================================================== */
(function () {
  const q = id => document.getElementById(id);
  const clean = v => String(v || '').replace(/^@/, '').trim().toLowerCase();
  let busy = false;
  let lastAppliedEventId = '';
  let lastAppliedEventAt = 0;

  function killLegacyWinnerButtonsV489() {
    const keep = new Set(['winnerReasonBtnV487','winnerBtnCheckV129','winnerSitesBtn','winnerSaveBtn']);
    const selectors = [
      '#winnerActionsBarV122','#winnerActionsBarV125','#winnerActionsBarV128',
      '#winnerActionsBarV91','#winnerActionsBarV92','#winnerActionsBarV93','#winnerActionsBarV94','#winnerActionsBarV95','#winnerActionsBarV96',
      '#winnerRerollBtn','#winnerRerollFixedBtn','#winnerRerollProxyV81','#winnerRerollProxyV91','#winnerRerollProxyV92',
      '#winnerRerollBtnV122','#winnerActionRerollV125','#winnerBtnRerollV128',
      '#winnerCheckBtn','#winnerCheckBtnV122','#winnerActionCheckV125','#winnerBtnCheckV128',
      '[data-v122-reroll]','[data-v122-check]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(el => {
      if (keep.has(el.id)) return;
      if (el.closest?.('#winnerActionsBarV129')) return;
      try { el.remove(); } catch {
        el.style.setProperty('display','none','important');
        el.style.setProperty('visibility','hidden','important');
        el.style.setProperty('opacity','0','important');
      }
    });
  }

  function applyWinnerV489(record, nextState) {
    if (!record || !record.username) return;
    const eventId = String(record.playerEventId || record.winnerEventId || record.eventId || `${record.username}|${record.date || ''}|${record.mode || ''}`);
    const nowV509 = Date.now();
    // v509: suppress only the near-simultaneous HTTP + WebSocket copy of the SAME event.
    // Reusing an id later must still create a fresh winner/timer session.
    const duplicate = Boolean(eventId && eventId === lastAppliedEventId && nowV509 - lastAppliedEventAt < 1200);

    // v492: update state only. A quick reroll must not call the global render(), because
    // that tears down/rebuilds winner surfaces and is the source of the flash/teleport.
    if (nextState) {
      state = nextState;
      window.state = state;
    }
    if (duplicate) {
      try { window.__v484RenderWinners?.(); } catch {}
      return;
    }
    if (eventId) { lastAppliedEventId = eventId; lastAppliedEventAt = nowV509; }

    const username = clean(record.username);
    const details = record.details || {};
    const name = q('winnerName');
    if (name) {
      name.classList.remove('winner-pop');
      if (name.textContent !== username) name.textContent = username;
    }

    const label = q('winnerBox')?.querySelector('.winner-label');
    if (label) label.textContent = record.mode === 'quick' ? 'БЫСТРЫЙ ПОБЕДИТЕЛЬ' : (record.mode === 'elimination' ? 'ПОСЛЕДНИЙ ОСТАВШИЙСЯ' : 'ПОБЕДИТЕЛЬ');

    q('winnerDetails')?.classList.remove('hidden');
    if (q('winnerFollowInfo')) q('winnerFollowInfo').textContent = details.followText || 'нет данных';
    if (q('winnerWatchInfo')) {
      const ms = Number(details.watchMs || 0);
      const totalSec = Math.max(0, Math.floor(ms / 1000));
      q('winnerWatchInfo').textContent = `${Math.floor(totalSec / 60)} мин ${totalSec % 60} сек`;
    }
    if (q('winnerMsgInfo')) q('winnerMsgInfo').textContent = String(details.messages ?? 0);
    if (q('winnerKdInfo')) {
      q('winnerKdInfo').textContent = details.kdText || '—';
      q('winnerKdInfo').classList.toggle('kd-ok', Boolean(details.kdOk));
      q('winnerKdInfo').classList.toggle('kd-bad', !details.kdOk);
    }

    // v517: in-place reroll MUST clear the preceding wheel/rolling view.
    // A legacy wheel guard used to force display:block every 100ms, creating
    // wheel-over-winner glitches. The guard now stops when winner becomes visible.
    for (const id of ['rouletteWheelWrap','rollingBox','eliminatedBox']) {
      const node=q(id);
      if (!node) continue;
      node.classList.add('hidden');
      node.classList.remove('rolling-spin','winner-spin');
      for(const prop of ['display','visibility','opacity','pointer-events']) node.style.removeProperty(prop);
    }
    document.body.classList.remove('v129-rerolling-wheel');
    // Keep both windows mounted. Only text/chat target changes.
    q('winnerBox')?.classList.remove('hidden');
    q('winnerChatBox')?.classList.remove('hidden');
    document.querySelector('.center-visual')?.classList.add('winner-mode','roulette-active');

    if (!duplicate && typeof window.__v489StartWinnerChat === 'function') {
      window.__v489StartWinnerChat(username);
    } else if (typeof window.__v62RenderWinnerChat === 'function') {
      window.__v62RenderWinnerChat(true);
    }

    // Keep the canonical action bar mounted. Rebuilding it with innerHTML on every
    // reroll caused the white-button blink, so only stabilize it when it already exists.
    killLegacyWinnerButtonsV489();
    const canonicalReady = ['winnerReasonBtnV487','winnerBtnCheckV129','winnerSitesBtn','winnerSaveBtn']
      .every(id => q(id));
    if (canonicalReady && typeof window.__v131StabilizeButtons === 'function') {
      window.__v131StabilizeButtons();
    } else {
      window.__v129EnsureTwoButtons?.();
    }
    killLegacyWinnerButtonsV489();
    try { window.__v484RenderWinners?.(); } catch {}
  }

  window.__v489ApplyWinner = applyWinnerV489;
  window.__v489KillLegacyWinnerButtons = killLegacyWinnerButtonsV489;

  async function postReasonOnly(reason) {
    const res = await fetch('/api/v484/reroll-reason', {
      method:'POST', credentials:'same-origin', cache:'no-store',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({reason})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) throw new Error(data?.reason || 'reroll_reason_failed');
    return data;
  }

  async function silentQuickRerollV489(reason) {
    document.body.classList.add('v489-silent-reroll');
    try {
      const res = await fetch('/api/v489/reroll-in-place', {
        method:'POST', credentials:'same-origin', cache:'no-store',
        headers:{'Content-Type':'application/json'}, body:JSON.stringify({reason})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || !data?.winner) throw new Error(data?.reason || 'reroll_failed');
      // v509: route through the public wrapped applier so the authoritative response
      // session/timer controller always runs (the direct lexical call bypassed v507).
      (window.__v489ApplyWinner || applyWinnerV489)(data.winner, data.state || null);
    } finally {
      document.body.classList.remove('v489-silent-reroll');
    }
  }

  // Canonical v129 REROLL calls this function dynamically. QUICK mode never enters
  // the old hide/show/wheel chain anymore; roulette mode keeps its wheel behavior.
  window.__v484RequestReroll = async function (runLegacyReroll) {
    if (busy) return;
    busy = true;
    try {
      const reason = typeof window.__v489OpenRerollReason === 'function'
        ? await window.__v489OpenRerollReason()
        : null;
      if (!reason) return;

      const mode = String(window.state?.lastWinner?.mode || window.__rostyashaRerollMode || localStorage.getItem('rostyasha_reroll_mode') || '').toLowerCase();
      const isQuick = mode === 'quick' || String(q('winnerBox')?.querySelector('.winner-label')?.textContent || '').toLowerCase().includes('быстрый');

      if (isQuick) {
        await silentQuickRerollV489(reason);
      } else {
        await postReasonOnly(reason);
        if (typeof runLegacyReroll === 'function') await runLegacyReroll();
      }
    } catch (e) {
      console.warn('[v489 reroll]', e);
      if (typeof window.toast === 'function') window.toast('Ошибка реролла');
    } finally {
      busy = false;
      killLegacyWinnerButtonsV489();
    }
  };

  document.addEventListener('DOMContentLoaded', killLegacyWinnerButtonsV489, { once:true });
  window.addEventListener('pageshow', killLegacyWinnerButtonsV489, { once:true });
})();

/* v494: Quick Roll legacy-artifact cleanup. Visual hiding is handled in CSS
   before paint; this only removes dead nodes after old wrapped handlers create
   them, without observing/rebuilding the live winner UI. */
(function () {
  const LEGACY = [
    '#winnerActionsV78','#winnerActionsV79','#winnerActionsV80','#winnerActionsV81',
    '#winnerActionsV91','#winnerActionsV92','#winnerActionsV93','#winnerActionsV94','#winnerActionsV95','#winnerActionsV96',
    '#winnerActionsBarV122','#winnerActionsBarV125','#winnerActionsBarV128',
    '#winnerRerollProxyV81','#winnerRerollProxyV91','#winnerRerollProxyV92',
    '#winnerRerollBtnV122','#winnerCheckBtnV122','#winnerActionRerollV125','#winnerActionCheckV125',
    '#winnerBtnRerollV128','#winnerBtnCheckV128'
  ].join(',');

  function purgeLegacyV494() {
    document.querySelectorAll(LEGACY).forEach(el => {
      if (el.closest?.('#winnerActionsBarV129')) return;
      try { el.remove(); } catch (_) {
        el.style.setProperty('display','none','important');
      }
    });
  }

  const oldShowWinnerV494 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (oldShowWinnerV494 && !window.__v494ShowWinnerWrapped) {
    window.__v494ShowWinnerWrapped = true;
    window.showWinner = function () {
      purgeLegacyV494();
      const result = oldShowWinnerV494.apply(this, arguments);
      purgeLegacyV494();
      try { window.__v131PrepareButtonSlot?.(); } catch (_) {}
      try { window.__v131StabilizeButtons?.(); } catch (_) {}
      setTimeout(purgeLegacyV494, 0);
      setTimeout(purgeLegacyV494, 140);
      setTimeout(purgeLegacyV494, 320);
      return result;
    };
  }

  document.addEventListener('pointerdown', e => {
    if (!e.target.closest?.('#quickRollBtn')) return;
    purgeLegacyV494();
  }, true);

  document.addEventListener('DOMContentLoaded', purgeLegacyV494, { once: true });
  window.__v494PurgeLegacyWinnerActions = purgeLegacyV494;
})();


/* V495_ROULETTE_POINTER_NICK_SYNC: top nickname follows the actual wheel sector under the pointer. */
/* V496_INPUT_LATENCY_SMOOTH_HARD_FIX: UI speed layer lives in performance.css/runtime; gameplay logic unchanged. */


/* ==========================================================================
   v507 — AUTHORITATIVE WINNER RESPONSE SESSION
   Hard fix for stale/expired winner timer state across roulette, QUICK roll and
   in-place rerolls. Every genuinely new winner gets a fresh response session.
   ========================================================================== */
(function () {
  const q = id => document.getElementById(id);
  const clean507 = v => String(v || '').replace(/^@/, '').trim().toLowerCase();
  let lastResetKey = '';
  let lastResetAt = 0;

  function configuredLimitV507() {
    const st = (window.state && window.state.settings) || {};
    let raw = null;
    let enabled = null;
    try {
      raw = localStorage.getItem('korzhany_winner_timer_sec');
      enabled = localStorage.getItem('korzhany_winner_timer_enabled');
    } catch (_) {}
    if (raw == null) raw = st.winnerResponseTimerSec;
    if (enabled == null) enabled = st.winnerResponseTimerEnabled;
    const sec = Math.max(5, Math.min(300, Math.floor(Number(raw || 15))));
    const isEnabled = enabled !== false && enabled !== 'false' && enabled !== 0 && enabled !== '0';
    return { sec, enabled: isEnabled };
  }

  function paintFreshWaitingV507(username) {
    const chat = q('winnerChatBox');
    if (chat) {
      chat.classList.remove('hidden', 'v482-answered');
      chat.classList.add('v482-waiting', 'v507-response-waiting');
    }
    const nick = q('winnerChatNick');
    if (nick && username) nick.textContent = username;

    const { sec, enabled } = configuredLimitV507();
    const sw = q('winnerReplyStopwatch');
    if (sw) {
      sw.classList.remove('timer-ok', 'timer-bad');
      sw.classList.toggle('timer-disabled-v428', !enabled);
      sw.textContent = enabled ? `${sec} сек` : '∞';
      sw.title = enabled ? `Осталось ${sec} из ${sec} сек` : 'Таймер ответа отключён';
    }
    const status = q('winnerReplyStatus');
    if (status) {
      status.classList.remove('status-ok', 'status-bad');
      status.textContent = enabled
        ? `Ждём ответ победителя — осталось ${sec} сек`
        : 'Таймер ответа отключён. Ждём сообщение победителя в чат...';
    }
  }

  function resetWinnerResponseV507(username, eventKey = '') {
    const u = clean507(username);
    if (!u) return;
    const now = Date.now();
    const key = String(eventKey || u);
    // HTTP + WebSocket can describe the same winner almost simultaneously.
    // Do not extend the response window because of that duplicate transport event.
    if (key === lastResetKey && now - lastResetAt < 1200) return;
    lastResetKey = key;
    lastResetAt = now;

    paintFreshWaitingV507(u);
    if (typeof window.__v489StartWinnerChat === 'function') {
      window.__v489StartWinnerChat(u);
      // Old layers may leave stale classes for one synchronous turn; normalize them.
      paintFreshWaitingV507(u);
    }
  }

  window.__v507ResetWinnerResponse = resetWinnerResponseV507;

  // Final wrapper: runs after every historical showWinner wrapper, so roulette and
  // QUICK roll both receive a clean timer session even if an older layer reused UI.
  const previousShowWinnerV507 = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (previousShowWinnerV507 && !window.__v507ShowWinnerWrapped) {
    window.__v507ShowWinnerWrapped = true;
    window.showWinner = function (usernameOrPayload, mode = '', details = null) {
      const payload = typeof usernameOrPayload === 'object' && usernameOrPayload ? usernameOrPayload : null;
      const username = clean507(payload?.username || usernameOrPayload || '');
      const eventKey = payload?.playerEventId || payload?.winnerEventId || payload?.eventId || `${username}|${payload?.date || ''}|${payload?.mode || mode || ''}`;
      const out = previousShowWinnerV507.apply(this, arguments);
      resetWinnerResponseV507(username, eventKey);
      return out;
    };
  }

  // QUICK in-place reroll does not pass through showWinner. Wrap its final applier too.
  const previousApplyWinnerV507 = window.__v489ApplyWinner;
  if (typeof previousApplyWinnerV507 === 'function' && !window.__v507ApplyWinnerWrapped) {
    window.__v507ApplyWinnerWrapped = true;
    window.__v489ApplyWinner = function (record, nextState) {
      const out = previousApplyWinnerV507.apply(this, arguments);
      const username = clean507(record?.username || '');
      const eventKey = record?.playerEventId || record?.winnerEventId || record?.eventId || `${username}|${record?.date || ''}|${record?.mode || ''}`;
      resetWinnerResponseV507(username, eventKey);
      return out;
    };
  }
})();

/* v510: exact roulette pointer -> sector -> top-name synchronization */
window.__KORZH_ROULETTE_POINTER_SYNC_VERSION = 'v510';

/* v511: SINGLE-SOURCE roulette pointer -> sector -> rolling nickname sync.
   The only truth for the top nickname is the sector physically under the fixed 12 o'clock pointer.
   Sector order is captured from the same payload/state used to render the wheel.
   No DOM-nearest-label guessing, no timer ticker, no +180 offset. */
(function () {
  let rafV511 = 0;
  let activeV511 = false;
  let namesV511 = [];
  let finalNameV511 = '';
  let lastIdxV511 = -1;

  const q = (id) => document.getElementById(id);
  const clean = (v) => String(v || '').replace(/^@/, '').trim();
  const normKey = (v) => clean(v).toLowerCase();

  function orderedNames(payload = {}) {
    let src = [];
    if (Array.isArray(payload.names) && payload.names.length) src = payload.names;
    else if (Array.isArray(window.state?.participants) && window.state.participants.length) src = window.state.participants;
    else if (typeof wheelState !== 'undefined' && Array.isArray(wheelState.names) && wheelState.names.length) src = wheelState.names;
    else if (Array.isArray(window.wheelState?.names) && window.wheelState.names.length) src = window.wheelState.names;

    return src.map(clean).filter(Boolean);
  }

  function wheelEl() {
    return q('rouletteWheel') || document.querySelector('.roulette-wheel') || document.querySelector('.wheel');
  }

  function rollingEl() {
    return q('rollingName') || document.querySelector('.rolling-name') || document.querySelector('[id*="rolling"][id*="Name"]');
  }

  function rotationDeg() {
    const wheel = wheelEl();
    if (!wheel) return 0;

    const inline = String(wheel.style.transform || '');
    const r = inline.match(/rotate\(\s*(-?[\d.]+)deg\s*\)/i);
    if (r) return Number(r[1]) || 0;

    const tr = getComputedStyle(wheel).transform;
    if (!tr || tr === 'none') return 0;
    const m = tr.match(/matrix\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(',').map(Number);
      return Math.atan2(p[1], p[0]) * 180 / Math.PI;
    }
    const m3 = tr.match(/matrix3d\(([^)]+)\)/);
    if (m3) {
      const p = m3[1].split(',').map(Number);
      return Math.atan2(p[1], p[0]) * 180 / Math.PI;
    }
    return 0;
  }

  function indexUnderPointer(rot, count) {
    if (!count) return -1;
    const step = 360 / count;
    const sourceAngle = ((-Number(rot || 0) % 360) + 360) % 360;
    return Math.min(count - 1, Math.floor(sourceAngle / step));
  }

  function paintIndex(idx, force = false) {
    if (idx < 0 || idx >= namesV511.length) return;
    if (!force && idx === lastIdxV511) return;
    const el = rollingEl();
    if (!el) return;
    lastIdxV511 = idx;
    const name = namesV511[idx];
    const next = '@' + name;
    if (el.textContent !== next) el.textContent = next;
  }

  function stopLegacySync() {
    const stops = [
      '__v116StopRollingNames',
      '__v117StopWheelNameSync',
      '__v118StopWheelNameSync',
      '__v119StopRealPositionSync'
    ];
    for (const fn of stops) {
      if (typeof window[fn] === 'function') {
        try { window[fn](''); } catch (_) {}
      }
    }
  }

  function stop(finalName = '') {
    activeV511 = false;
    if (rafV511) cancelAnimationFrame(rafV511);
    rafV511 = 0;

    const target = clean(finalName || finalNameV511);
    if (target) {
      const idx = namesV511.findIndex(n => normKey(n) === normKey(target));
      if (idx >= 0) paintIndex(idx, true);
      else {
        const el = rollingEl();
        if (el) el.textContent = '@' + target;
      }
    }
  }

  function start(payload = {}) {
    const names = orderedNames(payload);
    if (!names.length) return;

    stopLegacySync();
    if (rafV511) cancelAnimationFrame(rafV511);

    namesV511 = names;
    finalNameV511 = clean(payload.winner || payload.eliminationTarget || payload.username || payload.target || '');
    lastIdxV511 = -1;
    activeV511 = true;

    const born = performance.now();
    const maxMs = Math.max(2500, Number(payload.durationMs || 5000) + 1800);

    function frame(now) {
      if (!activeV511) return;
      const idx = indexUnderPointer(rotationDeg(), namesV511.length);
      paintIndex(idx);

      if (now - born > maxMs) {
        stop(finalNameV511);
        return;
      }
      rafV511 = requestAnimationFrame(frame);
    }
    rafV511 = requestAnimationFrame(frame);
  }

  // Neutralise exported legacy starters so nothing else may start a competing nickname controller.
  window.__v116StartRollingNames = function () {};
  window.__v117StartWheelNameSync = function () {};
  window.__v118StartWheelNameSync = function () {};
  window.__v119StartRealPositionSync = function () {};

  const prevStart = window.startRolling || (typeof startRolling === 'function' ? startRolling : null);
  if (typeof prevStart === 'function' && !window.__v511StartWrapped) {
    window.__v511StartWrapped = true;
    window.startRolling = function (payload = {}) {
      stopLegacySync();
      const out = prevStart.apply(this, arguments);
      // Start after the old stack has created/rendered the actual wheel.
      requestAnimationFrame(() => start(payload));
      return out;
    };
  }

  const prevShowWheel = window.showWheel || (typeof showWheel === 'function' ? showWheel : null);
  if (typeof prevShowWheel === 'function' && !window.__v511ShowWheelWrapped) {
    window.__v511ShowWheelWrapped = true;
    window.showWheel = function (payload = {}) {
      stopLegacySync();
      const out = prevShowWheel.apply(this, arguments);
      requestAnimationFrame(() => start(payload));
      return out;
    };
  }

  const prevWinner = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (typeof prevWinner === 'function' && !window.__v511WinnerWrapped) {
    window.__v511WinnerWrapped = true;
    window.showWinner = function (usernameOrPayload) {
      const payload = (usernameOrPayload && typeof usernameOrPayload === 'object') ? usernameOrPayload : null;
      const name = clean(payload?.username || usernameOrPayload || finalNameV511);
      stop(name);
      return prevWinner.apply(this, arguments);
    };
  }

  window.__v511IndexUnderPointer = indexUnderPointer;
  window.__v511StartPointerSync = start;
  window.__v511StopPointerSync = stop;
  window.__KORZH_ROULETTE_POINTER_SYNC_VERSION = 'v511';
})();


/* ============================================================================
 * v513 — SINGLE-OWNER WINNER RESPONSE STOPWATCH (0 -> configured limit)
 * A new winner starts an independent monotonic session. Only chat messages
 * received AFTER that session begins and BEFORE its deadline qualify.
 * No red timeout, automatic reroll or visual reset when the limit is reached.
 * Legacy v62 owns message history, but never owns stopwatch state.
 * ============================================================================ */
(function () {
  'use strict';
  const el = id => document.getElementById(id);
  const nick = value => String(value || '').trim().replace(/^@/, '').toLowerCase();
  let session = null;
  let ticker = 0;
  let lastStartKey = '';
  let lastStartTime = 0;
  let sessionSerial = 0;
  // Compatibility: legacy v62 checks this flag to disable its old countdown.
  window.__v512TimerInstalled = true;
  window.__v513StopwatchInstalled = true;

  function getSettings() {
    const st = window.state?.settings || {};
    let savedSec = null, savedEnabled = null;
    try {
      savedSec = localStorage.getItem('korzhany_winner_timer_sec');
      savedEnabled = localStorage.getItem('korzhany_winner_timer_enabled');
    } catch (_) {}
    // Mirror the settings UI (v428): saved preference first, server fallback.
    const rawSec = savedSec ?? st.winnerResponseTimerSec ?? 15;
    const parsed = Number(rawSec);
    const seconds = Number.isFinite(parsed) ? Math.max(5, Math.min(300, Math.floor(parsed))) : 15;
    const enabledValue = savedEnabled ?? st.winnerResponseTimerEnabled ?? true;
    const enabled = ![false, 0, '0', 'false'].includes(enabledValue);
    return {seconds, enabled};
  }

  function fingerprint(m) {
    return `${Number(m?.ts || m?.timestamp || 0)}|${nick(m?.username)}|${String(m?.text || '')}`;
  }
  function liveRows(user) {
    const rows = Array.isArray(window.state?.chat) ? window.state.chat : [];
    return rows.filter(m => nick(m?.username) === user);
  }
  function tally(rows) {
    const seen = new Map();
    for (const m of rows) {
      const key = fingerprint(m);
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    return seen;
  }
  function cleanup() {
    if (ticker) clearInterval(ticker);
    ticker = 0;
  }
  function stop() {
    cleanup();
    session = null;
  }

  function paint() {
    const s = session;
    if (!s) return;
    const box = el('winnerChatBox');
    if (!box) return;
    const elapsedMs = Math.max(0, performance.now() - s.startPerf);
    const limitMs = s.seconds * 1000;

    // Only genuinely new Twitch messages count as replies. A pre-win message
    // in five-minute history NEVER counts, even if its text is identical.
    // Server chat timestamps are wall-clock milliseconds (server.js:addChat).
    if (!s.answered) {
      const seen = new Map();
      for (const m of liveRows(s.user)) {
        const key = fingerprint(m);
        const count = (seen.get(key) || 0) + 1;
        seen.set(key, count);
        if (count <= (s.baseline.get(key) || 0)) continue;
        const rawTs = Number(m?.ts || m?.timestamp || 0);
        // Prefer server message arrival time to render time. Reject stale rows;
        // use paint time only for rows lacking a usable timestamp.
        const validTs = Number.isFinite(rawTs) && rawTs >= 1e12;
        const responseMs = validTs ? rawTs - s.startedWall : elapsedMs;
        if (responseMs < 0) continue;
        if (s.enabled && responseMs > limitMs) continue;
        s.answered = true;
        s.answeredMs = Math.max(0, responseMs);
        break;
      }
    }

    // v518: stopwatch never freezes at the deadline. Only a timely answer
    // freezes it, so the streamer always sees the elapsed seconds. A late
    // reply cannot retroactively trigger green success.
    const spentMs = s.answered ? s.answeredMs : elapsedMs;
    const shownSeconds = Math.max(0, Math.floor(spentMs / 1000));
    const success = Boolean(s.answered);
    const expired = Boolean(s.enabled && !success && elapsedMs >= limitMs);
    const waiting = !success && !expired;
    s.finished = false; // Historical v513 flag is no longer a timeout stop.

    box.classList.toggle('v482-waiting', waiting);
    box.classList.toggle('v507-response-waiting', waiting);
    box.classList.toggle('v482-answered', success);
    box.classList.toggle('v509-timeout', expired);
    box.classList.toggle('v518-timeout-live', expired);
    box.classList.toggle('v518-answered-live', success);
    box.dataset.responseSessionV512 = String(s.id);
    box.dataset.responseSessionV513 = String(s.id);

    const clock = el('winnerReplyStopwatch');
    if (clock) {
      clock.textContent = `${shownSeconds} сек`;
      clock.title = success ? `Ответ получен за ${shownSeconds} сек`
        : expired ? `Лимит ${s.seconds} сек истёк; прошло ${shownSeconds} сек`
        : s.enabled ? `Секундомер: ${shownSeconds} из ${s.seconds} сек`
        : `Секундомер: ${shownSeconds} сек (без ограничения)`;
      clock.classList.toggle('timer-ok', success);
      clock.classList.toggle('timer-bad', expired);
      clock.classList.toggle('timer-disabled-v428', !s.enabled);
    }
    const status = el('winnerReplyStatus');
    if (status) {
      status.textContent = success ? `Победитель ответил вовремя — ${shownSeconds} сек`
        : expired ? `Лимит ${s.seconds} сек истёк — ответа нет (${shownSeconds} сек)`
        : 'Ожидаем сообщение победителя в чат';
      status.classList.toggle('status-ok', success);
      status.classList.toggle('status-bad', expired);
    }
    if (success) cleanup();
  }

  function begin(user, eventId = '') {
    const cleanUser = nick(user);
    if (!cleanUser) return;
    const now = Date.now();
    const key = `${eventId || ''}|${cleanUser}`;
    // Ignore only the HTTP + WebSocket duplicate of the same event.
    if (key === lastStartKey && now - lastStartTime < 1200) return;
    lastStartKey = key;
    lastStartTime = now;
    cleanup();
    const cfg = getSettings();
    session = {
      id: ++sessionSerial,
      user: cleanUser,
      startedWall: now,
      startPerf: performance.now(),
      seconds: cfg.seconds,
      enabled: cfg.enabled,
      baseline: tally(liveRows(cleanUser)),
      answered: false,
      answeredMs: 0,
      finished: false
    };
    el('winnerChatBox')?.classList.remove('hidden');
    paint();
    ticker = setInterval(paint, 125);
  }

  // Cover wheel winners and Quick Roll while preserving their visual mechanics.
  const previousWinner = window.showWinner || (typeof showWinner === 'function' ? showWinner : null);
  if (typeof previousWinner === 'function') {
    window.showWinner = function (arg, mode = '') {
      const record = arg && typeof arg === 'object' ? arg : null;
      const user = nick(record?.username || arg || '');
      const eventId = String(record?.playerEventId || record?.winnerEventId || record?.eventId || record?.date || `${user}:${mode}`);
      const result = previousWinner.apply(this, arguments);
      // v517: terminal winner event always wins over transient wheel state;
      // remove inline !important display from old wheel guards as well.
      for (const id of ['rouletteWheelWrap','rollingBox','eliminatedBox']) {
        const layer=document.getElementById(id);
        if(!layer)continue;
        layer.classList.add('hidden');
        layer.classList.remove('rolling-spin','winner-spin');
        for(const prop of ['display','opacity','visibility'])layer.style.removeProperty(prop);
      }
      begin(user, eventId);
      return result;
    };
  }
  // In-place Quick Reroll bypasses showWinner; it needs the SAME stopwatch.
  const previousApply = window.__v489ApplyWinner;
  if (typeof previousApply === 'function') {
    window.__v489ApplyWinner = function (record) {
      const result = previousApply.apply(this, arguments);
      if (record?.username) {
        const user = nick(record.username);
        const eventId = String(record.playerEventId || record.winnerEventId || record.eventId || record.date || `${user}:quick`);
        begin(user, eventId);
      }
      return result;
    };
  }
  const previousRolling = window.startRolling;
  if (typeof previousRolling === 'function') {
    window.startRolling = function () { stop(); return previousRolling.apply(this, arguments); };
  }
  document.addEventListener('click', e => {
    if (e.target?.closest?.('#winnerCloseBtn, #winnerSaveBtn')) stop();
  }, true);

  // Existing chat state arrives via window.render and the normal WS flow.
  const previousRender = window.render;
  if (typeof previousRender === 'function') {
    window.render = function () {
      const result = previousRender.apply(this, arguments);
      if (session) paint();
      return result;
    };
  }
  window.__v513WinnerResponseDebug = () => session ? {
    user: session.user, configuredSeconds: session.seconds,
    elapsedSeconds: Math.floor((performance.now() - session.startPerf) / 1000),
    shownSeconds: sShown(session), answered: session.answered,
    finished: session.finished, sessionId: session.id
  } : null;
  function sShown(s) {
    const t = s.answered ? s.answeredMs : Math.max(0, performance.now() - s.startPerf);
    return Math.floor(t / 1000);
  }
})();
