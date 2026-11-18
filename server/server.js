'use strict';
/**
 * Бэкенд для panel.html (панель розыгрышей).
 *  - отдаёт саму панель и её статические файлы;
 *  - держит WebSocket с панелью (состояние + события рулетки);
 *  - читает чат Twitch, добавляет в розыгрыш тех, кто написал кодовое слово;
 *  - считает сообщения и время в чате, хранит победителей;
 *  - отвечает на HTTP-команды и /api/* которые вызывает панель.
 *
 * Настройки — через переменные окружения (см. server/README.md).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocket, WebSocketServer } = require('ws');

// ───────────────────────── настройки ─────────────────────────
const PORT = Number(process.env.PORT || 3000);
const CHANNEL = String(process.env.TWITCH_CHANNEL || 'wokomilka').replace(/^#/, '').trim().toLowerCase();
const BOT_NICK = String(process.env.TWITCH_BOT_NICK || '').trim().toLowerCase();
const BOT_OAUTH = String(process.env.TWITCH_BOT_OAUTH || '').trim(); // oauth:xxxx — нужен только чтобы писать в чат
const IRC_URL = process.env.TWITCH_WS_URL || 'wss://irc-ws.chat.twitch.tv:443';
const TZ = process.env.TZ_NAME || 'Europe/Moscow';
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || path.join(__dirname, '..'));
const DATA_FILE = path.resolve(process.env.DATA_FILE || path.join(__dirname, 'data', 'data.json'));
const IGNORED = new Set(
  String(process.env.IGNORED_USERS || 'nightbot,streamelements,moobot,streamlabs,wizebot,fossabot')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
);
const CHAT_LIMIT = 180;
const ACTIVE_WINDOW_MS = 15 * 60 * 1000;
const WATCHTIME_TICK_MS = 30 * 1000;
const COOKIE_NAME = 'panel_session';

// ───────────────────────── утилиты ─────────────────────────
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const norm = u => String(u || '').replace(/^@/, '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
const nowTime = () => new Date().toLocaleTimeString('ru-RU', { hour12: false, timeZone: TZ });
const dateText = ts => new Date(ts).toLocaleString('ru-RU', { timeZone: TZ });
const pick = arr => arr[crypto.randomInt(arr.length)];
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const toBool = v => v === true || v === 'true' || v === '1' || v === 1 || v === 'on';

// ───────────────────────── хранилище ─────────────────────────
const DEFAULT_SETTINGS = {
  title: '',
  codeWord: '+',
  onlyNeverWon: false,
  joinWindowOpenV515: true,
  winnerResponseTimerEnabled: true,
  winnerResponseTimerSec: 15,
  showWinners: true
};
const newDb = () => ({
  adminKey: '',
  settings: { ...DEFAULT_SETTINGS },
  participants: [],
  messages: {},
  watchtime: {},
  winners: [],
  blacklist: [],
  history: {},
  logs: []
});

function loadDb() {
  const db = newDb();
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    for (const k of Object.keys(db)) {
      if (raw[k] === undefined) continue;
      db[k] = k === 'settings' ? { ...DEFAULT_SETTINGS, ...raw.settings } : raw[k];
    }
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('[db] не удалось прочитать данные, начинаю с нуля:', e.message);
  }
  return db;
}

const db = loadDb();
let saveTimer = null;
function saveNow() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.error('[db] ошибка сохранения:', e.message);
  }
}
function saveSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; saveNow(); }, 1000);
}

// ключ админа: из окружения, иначе из файла данных, иначе генерируем
let ADMIN_KEY = String(process.env.ADMIN_KEY || '').trim() || db.adminKey;
let keyWasGenerated = false;
if (!ADMIN_KEY) {
  ADMIN_KEY = crypto.randomBytes(18).toString('base64url');
  db.adminKey = ADMIN_KEY;
  keyWasGenerated = true;
  saveNow();
}
const keyOk = k => k != null && crypto.timingSafeEqual(sha(k), sha(ADMIN_KEY));
const SESSION_TOKEN = crypto.createHmac('sha256', ADMIN_KEY).update('panel-session-v1').digest('hex');
const sessionOk = t => t != null && crypto.timingSafeEqual(sha(t), sha(SESSION_TOKEN));

// ───────────────────────── состояние в памяти ─────────────────────────
const runtime = {
  chat: [],
  rolling: false,
  rollId: 0,
  pendingWinner: null,       // выпал, но ещё не сохранён/закрыт
  pendingAppearance: null,   // запись в истории игрока для pendingWinner
  lastWinner: null,
  lastSaved: null,
  rerolled: new Set(),       // кого ререльнули в этом розыгрыше — обратно не пускаем
  twitchConnected: false,
  active: new Map()          // ник -> время последнего сообщения
};

function log(text) {
  db.logs.unshift({ time: nowTime(), text });
  if (db.logs.length > 200) db.logs.length = 200;
  saveSoon();
}

function publicState() {
  const s = db.settings;
  const pw = runtime.pendingWinner;
  return {
    settings: s,
    winnerResponseTimerEnabled: s.winnerResponseTimerEnabled,
    winnerResponseTimerSec: s.winnerResponseTimerSec,
    participants: db.participants,
    messages: db.messages,
    watchtime: db.watchtime,
    chat: runtime.chat,
    winners: db.winners,
    blacklist: db.blacklist,
    logs: db.logs.slice(0, 10),
    rolling: runtime.rolling,
    pendingWinner: pw ? { username: pw.username, mode: pw.mode, at: pw.at, eventId: pw.eventId } : null,
    lastWinner: runtime.lastWinner,
    twitch: { connected: runtime.twitchConnected, channel: CHANNEL }
  };
}

// ───────────────────────── WebSocket-рассылка ─────────────────────────
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
let broadcastTimer = null;

function sendTo(ws, type, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  const msg = { type };
  if (payload !== undefined) msg.payload = payload;
  msg.state = publicState();
  ws.send(JSON.stringify(msg));
}
function broadcast(type, payload) {
  if (broadcastTimer) { clearTimeout(broadcastTimer); broadcastTimer = null; }
  const msg = { type };
  if (payload !== undefined) msg.payload = payload;
  msg.state = publicState();
  const data = JSON.stringify(msg);
  for (const ws of wss.clients) {
    if (ws.authed && ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}
function scheduleBroadcast() {
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => { broadcastTimer = null; broadcast('state'); }, 250);
}

// ───────────────────────── розыгрыш ─────────────────────────
const fail = reason => ({ ok: false, reason });

function eligible() {
  const won = db.settings.onlyNeverWon ? new Set(db.winners.map(w => w.username)) : null;
  return db.participants.filter(u => !db.blacklist.includes(u) && !(won && won.has(u)));
}

function addHistory(user, item) {
  const h = (db.history[user] = db.history[user] || []);
  h.push(item);
  if (h.length > 50) h.splice(0, h.length - 50);
}

function tryJoin(user, text, flags) {
  if (flags.isBot || IGNORED.has(user)) return;
  if (!db.settings.joinWindowOpenV515) return;
  if (text.trim().toLowerCase() !== String(db.settings.codeWord).trim().toLowerCase()) return;
  if (runtime.rolling) return;
  if (db.blacklist.includes(user) || runtime.rerolled.has(user)) return;
  if (db.participants.includes(user)) return;
  db.participants.push(user);
  saveSoon();
}

function finishWinner(username, mode, event) {
  db.participants = db.participants.filter(u => u !== username);
  runtime.rolling = false;
  const at = Date.now();
  const eventId = `${username}|${at}|${mode}`;
  const appearance = { type: 'appearance', status: 'appeared', withdrawalRub: 0, at, dateText: dateText(at), mode };
  addHistory(username, appearance);
  runtime.pendingWinner = { username, mode, at, eventId };
  runtime.pendingAppearance = appearance;
  runtime.lastWinner = { username, winner: username, mode, at, date: new Date(at).toISOString(), eventId, details: {} };
  log(`Победитель: ${username} (${mode})`);
  saveSoon();
  const record = { username, mode, playerEventId: eventId, eventId, date: runtime.lastWinner.date, details: {} };
  if (event === 'replaced') broadcast('winner_replaced_v489', { winner: record });
  else broadcast('winner', { username, mode });
  return record;
}

function startRoll(mode, durationSec) {
  if (runtime.rolling) return fail('already_rolling');
  if (!db.participants.length) return fail('no_participants');
  const pool = eligible();
  if (!pool.length) return fail('no_candidates');

  runtime.rolling = true;
  runtime.pendingWinner = null;
  runtime.lastWinner = null;
  const id = ++runtime.rollId;
  const active = () => runtime.rolling && runtime.rollId === id; // closeWinner отменяет идущий розыгрыш
  const durationMs = clamp(Number(durationSec) || 5, 1, 120) * 1000;

  if (mode === 'elimination' && pool.length > 1) {
    const stepMs = clamp(Math.round(durationMs / (pool.length - 1)), 1200, 5000);
    const left = pool.slice();
    broadcast('rolling_start', { mode: 'elimination', names: left.slice(), durationMs: stepMs });
    const step = () => {
      if (!active()) return;
      const out = left.splice(crypto.randomInt(left.length), 1)[0];
      broadcast('elimination_out', { username: out, remaining: left.length, names: left.slice(), durationMs: stepMs });
      if (left.length > 1) setTimeout(step, stepMs);
      else setTimeout(() => active() && finishWinner(left[0], 'elimination'), stepMs);
    };
    setTimeout(step, stepMs);
  } else if (mode === 'elimination') {
    broadcast('rolling_start', { mode: 'elimination', names: pool.slice(), durationMs: 1000 });
    setTimeout(() => active() && finishWinner(pool[0], 'elimination'), 1000);
  } else {
    broadcast('rolling_start', { mode: 'normal', names: pool.slice(0, 48), durationMs });
    setTimeout(() => active() && finishWinner(pick(pool), 'normal'), durationMs);
  }
  return { ok: true };
}

function quickRoll() {
  if (runtime.rolling) return fail('already_rolling');
  if (!db.participants.length) return fail('no_participants');
  const pool = eligible();
  if (!pool.length) return fail('no_candidates');
  finishWinner(pick(pool), 'quick');
  return { ok: true };
}

function recordReroll(user, reason) {
  const at = Date.now();
  if (runtime.pendingAppearance && runtime.pendingWinner && runtime.pendingWinner.username === user) {
    runtime.pendingAppearance.status = 'rerolled';
    runtime.pendingAppearance.rerollReason = reason;
  }
  addHistory(user, { type: 'reroll', reason: reason || '', at, dateText: dateText(at) });
  runtime.rerolled.add(user);
  db.participants = db.participants.filter(u => u !== user);
  log(`Реролл ${user}${reason ? ': ' + reason : ''}`);
  saveSoon();
}

function currentWinnerName() {
  return (runtime.pendingWinner && runtime.pendingWinner.username)
    || (runtime.lastWinner && runtime.lastWinner.username) || '';
}

function rerollReasonOnly(reason) {
  const user = currentWinnerName();
  if (!user) return fail('no_winner');
  recordReroll(user, reason);
  scheduleBroadcast();
  return { ok: true };
}

function rerollInPlace(reason) {
  const old = currentWinnerName();
  if (!old) return fail('no_winner');
  recordReroll(old, reason);
  const pool = eligible();
  if (!pool.length) { scheduleBroadcast(); return fail('no_candidates'); }
  const winner = finishWinner(pick(pool), 'quick', 'replaced');
  return { ok: true, winner };
}

function saveWinner(amountRaw) {
  const amount = Math.max(0, Math.round(Number(amountRaw) || 0));
  const pw = runtime.pendingWinner;
  if (!pw) {
    // старые обработчики панели шлют «сохранить» дважды (WS без суммы и HTTP с суммой)
    const ls = runtime.lastSaved;
    if (ls && Date.now() - ls.at < 15000 && amount > 0 && ls.entry.withdrawalRub === 0) {
      ls.entry.withdrawalRub = amount;
      ls.appearance.withdrawalRub = amount;
      saveSoon();
      scheduleBroadcast();
    }
    return { ok: true };
  }
  const entry = { username: pw.username, mode: pw.mode, at: pw.at, date: new Date(pw.at).toISOString(), withdrawalRub: amount, status: 'saved' };
  db.winners.unshift(entry);
  if (db.winners.length > 500) db.winners.length = 500;
  const appearance = runtime.pendingAppearance;
  if (appearance) { appearance.status = 'saved'; appearance.withdrawalRub = amount; }
  runtime.lastSaved = { entry, appearance: appearance || {}, at: Date.now() };
  runtime.pendingWinner = null;
  runtime.pendingAppearance = null;
  runtime.lastWinner = null;
  log(`Сохранён победитель ${entry.username}, вывод ${amount} ₽`);
  saveSoon();
  scheduleBroadcast();
  return { ok: true };
}

function closeWinner() {
  runtime.pendingWinner = null;
  runtime.pendingAppearance = null;
  runtime.lastWinner = null;
  runtime.rolling = false;
  scheduleBroadcast();
  return { ok: true };
}

// ───────────────────────── команды панели ─────────────────────────
function setSetting(name, value) {
  const s = db.settings;
  switch (name) {
    case 'onlyNeverWon':
    case 'joinWindowOpenV515':
    case 'winnerResponseTimerEnabled':
    case 'showWinners':
      s[name] = toBool(value);
      return { ok: true };
    case 'winnerResponseTimerSec':
      s[name] = clamp(Math.floor(Number(value) || 15), 5, 300);
      return { ok: true };
    case 'title':
      s.title = String(value ?? '').slice(0, 60);
      return { ok: true };
    default:
      return fail('unknown_setting');
  }
}

function runCommand(type, p = {}) {
  let result = { ok: true };
  switch (type) {
    case 'set_code': {
      const code = String(p.code ?? '').trim();
      if (!code || code.length > 30) return fail('bad_code');
      db.settings.codeWord = code;
      log(`Код участия: ${code}`);
      break;
    }
    case 'set_setting':
      result = setSetting(String(p.name || ''), p.value);
      break;
    case 'reset_participants':
      db.participants = [];
      runtime.rerolled.clear();
      log('Участники сброшены');
      break;
    case 'remove_participant': {
      const u = norm(p.username);
      db.participants = db.participants.filter(x => x !== u);
      break;
    }
    case 'blacklist_add': {
      const u = norm(p.username);
      if (!u) return fail('bad_username');
      if (!db.blacklist.includes(u)) db.blacklist.push(u);
      db.participants = db.participants.filter(x => x !== u);
      log(`В чёрный список: ${u}`);
      break;
    }
    case 'blacklist_remove': {
      const u = norm(p.username);
      db.blacklist = db.blacklist.filter(x => x !== u);
      break;
    }
    case 'clear_winners':
    case 'clear_winners_v221':
      db.winners = [];
      runtime.lastSaved = null;
      log('Список победителей очищен');
      break;
    case 'reset_stats':
      db.messages = {};
      db.watchtime = {};
      runtime.chat = [];
      log('Статистика сброшена');
      break;
    case 'reset_session_stats':
      // Панель шлёт её сама при открытии новой вкладки. Ничего не стираем, чтобы открытие
      // панели не обнуляло счётчики посреди стрима; сброс — только явной командой reset_stats.
      return { ok: true };
    case 'send_chat':
      result = sendChat(p.text);
      break;
    case 'roll':
      result = startRoll(String(p.mode || 'normal'), p.durationSec);
      break;
    case 'quick_roll':
      result = quickRoll();
      break;
    case 'save_winner_v232':
      result = saveWinner(p.withdrawalRub);
      break;
    case 'close_winner_v232':
      result = closeWinner();
      break;
    default:
      return fail('unknown_command');
  }
  saveSoon();
  scheduleBroadcast();
  return result;
}

// ───────────────────────── чат Twitch (IRC поверх WebSocket) ─────────────────────────
let ircWs = null;
let ircBackoff = 1000;
let lastChatSentAt = 0;
const botAuthed = Boolean(BOT_NICK && BOT_OAUTH);

function unescapeTag(v) {
  return String(v).replace(/\\(.)/g, (_, c) => (c === 's' ? ' ' : c === ':' ? ';' : c === 'r' ? '\r' : c === 'n' ? '\n' : c));
}
function parseIrc(line) {
  let rest = line;
  const tags = {};
  if (rest[0] === '@') {
    const i = rest.indexOf(' ');
    for (const kv of rest.slice(1, i).split(';')) {
      const e = kv.indexOf('=');
      if (e > 0) tags[kv.slice(0, e)] = unescapeTag(kv.slice(e + 1));
    }
    rest = rest.slice(i + 1);
  }
  let prefix = '';
  if (rest[0] === ':') {
    const i = rest.indexOf(' ');
    prefix = rest.slice(1, i);
    rest = rest.slice(i + 1);
  }
  let trailing = null;
  const ti = rest.indexOf(' :');
  if (ti !== -1) { trailing = rest.slice(ti + 2); rest = rest.slice(0, ti); }
  const parts = rest.split(' ').filter(Boolean);
  return { tags, prefix, command: parts[0], params: parts.slice(1), trailing };
}

function onChatMessage(m) {
  const username = norm(m.prefix.split('!')[0]);
  if (!username) return;
  let text = m.trailing || '';
  const action = text.match(/^\u0001ACTION (.*)\u0001$/);
  if (action) text = action[1];
  const badges = String(m.tags.badges || '').split(',').map(b => b.split('/')[0]);
  const flags = {
    isBroadcaster: badges.includes('broadcaster'),
    isMod: m.tags.mod === '1' || badges.includes('moderator'),
    isVip: badges.includes('vip'),
    isBot: IGNORED.has(username)
  };
  const ts = Date.now();
  runtime.chat.push({
    time: nowTime(),
    ts,
    username,
    displayName: m.tags['display-name'] || username,
    text,
    color: m.tags.color || '',
    roles: [],
    ...flags
  });
  if (runtime.chat.length > CHAT_LIMIT) runtime.chat.splice(0, runtime.chat.length - CHAT_LIMIT);
  if (!flags.isBot) {
    db.messages[username] = (db.messages[username] || 0) + 1;
    runtime.active.set(username, ts);
    tryJoin(username, text, flags);
  }
  saveSoon();
  scheduleBroadcast();
}

function setTwitchConnected(v) {
  if (runtime.twitchConnected === v) return;
  runtime.twitchConnected = v;
  scheduleBroadcast();
}

function connectTwitch() {
  const ws = new WebSocket(IRC_URL);
  ircWs = ws;
  ws.on('open', () => {
    ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
    ws.send(`PASS ${botAuthed ? (BOT_OAUTH.startsWith('oauth:') ? BOT_OAUTH : 'oauth:' + BOT_OAUTH) : 'SCHMOOPIIE'}`);
    ws.send(`NICK ${botAuthed ? BOT_NICK : 'justinfan' + (10000 + crypto.randomInt(80000))}`);
  });
  ws.on('message', data => {
    for (const line of String(data).split('\r\n')) {
      if (!line) continue;
      const m = parseIrc(line);
      switch (m.command) {
        case 'PING': ws.send('PONG :' + (m.trailing || 'tmi.twitch.tv')); break;
        case '001': ircBackoff = 1000; ws.send(`JOIN #${CHANNEL}`); break;
        case '366': setTwitchConnected(true); console.log(`[twitch] подключён к #${CHANNEL}`); break;
        case 'PRIVMSG': setTwitchConnected(true); onChatMessage(m); break;
        case 'RECONNECT': ws.close(); break;
        case 'NOTICE':
          if (/authentication failed|improperly formatted auth/i.test(m.trailing || '')) {
            console.error('[twitch] ошибка входа бота:', m.trailing, '— проверь TWITCH_BOT_NICK / TWITCH_BOT_OAUTH');
          }
          break;
        default: break;
      }
    }
  });
  ws.on('error', e => console.error('[twitch] ошибка соединения:', e.message));
  ws.on('close', () => {
    setTwitchConnected(false);
    const wait = ircBackoff;
    ircBackoff = Math.min(ircBackoff * 2, 30000);
    console.log(`[twitch] отключён, повтор через ${Math.round(wait / 1000)} с`);
    setTimeout(connectTwitch, wait);
  });
}

function sendChat(textRaw) {
  const text = String(textRaw ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 450);
  if (!text) return fail('empty_text');
  if (!botAuthed) return fail('bot_not_configured');
  if (!ircWs || ircWs.readyState !== WebSocket.OPEN || !runtime.twitchConnected) return fail('twitch_offline');
  if (Date.now() - lastChatSentAt < 1500) return fail('too_fast');
  lastChatSentAt = Date.now();
  ircWs.send(`PRIVMSG #${CHANNEL} :${text}`);
  return { ok: true };
}

// время в чате: раз в 30 секунд начисляем тем, кто писал за последние 15 минут
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [u, ts] of runtime.active) {
    if (now - ts > ACTIVE_WINDOW_MS) { runtime.active.delete(u); continue; }
    db.watchtime[u] = (db.watchtime[u] || 0) + WATCHTIME_TICK_MS / 1000;
    changed = true;
  }
  if (changed) { saveSoon(); scheduleBroadcast(); }
}, WATCHTIME_TICK_MS).unref();

// ───────────────────────── HTTP ─────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webm': 'video/webm', '.mp4': 'video/mp4',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg'
};
const BLOCKED_TOP = new Set(['server', 'node_modules', '.git', '.github']);

const fails = new Map();
setInterval(() => { const n = Date.now(); for (const [k, v] of fails) if (v.until < n) fails.delete(k); }, 60000).unref();
function clientIp(req) {
  if (process.env.TRUST_PROXY === '1') {
    const x = req.headers['x-forwarded-for'];
    if (x) return String(x).split(',')[0].trim();
  }
  return req.socket.remoteAddress || '';
}
const isLimited = ip => { const f = fails.get(ip); return Boolean(f && f.until > Date.now() && f.count >= 20); };
function noteFail(ip) {
  const now = Date.now();
  let f = fails.get(ip);
  if (!f || f.until < now) f = { count: 0, until: now + 10 * 60 * 1000 };
  f.count++;
  fails.set(ip, f);
}

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
function sessionCookie(req) {
  const secure = req.socket.encrypted || String(req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https';
  return `${COOKIE_NAME}=${SESSION_TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${secure ? '; Secure' : ''}`;
}

/** true — авторизован; false — нет; ключ проверяется по ?key=, заголовку или cookie */
function checkAuth(req, url, ip) {
  const provided = url.searchParams.get('key') ?? req.headers['x-admin-key'];
  if (provided != null && provided !== '') {
    if (keyOk(provided)) return true;
    noteFail(ip);
    return false;
  }
  return sessionOk(parseCookies(req)[COOKIE_NAME]);
}

function sendJson(res, status, obj, extraHeaders) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(extraHeaders || {})
  });
  res.end(body);
}

function readBody(req, limit = 100 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const text = await readBody(req);
  if (!text.trim()) return {};
  try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}

const withState = r => ({ ...r, state: publicState() });

/** panel.html в репозитории содержит заглушку ключа — подставляем настоящий только авторизованному */
function servePanelHtml(req, res, abs, authed) {
  fs.readFile(abs, 'utf8', (err, html) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
    const keyJs = authed ? JSON.stringify(ADMIN_KEY).replace(/</g, '\\u003c') : '""';
    html = html
      .replace(/window\.__SERVER_AUTH_OK__\s*=\s*true;/, `window.__SERVER_AUTH_OK__ = ${authed ? 'true' : 'false'};`)
      .replace(/window\.__ADMIN_KEY_FROM_SERVER__\s*=\s*"[^"]*";/, `window.__ADMIN_KEY_FROM_SERVER__ = ${keyJs};`);
    // скрипт в странице пишет ключ в localStorage — для неавторизованного он не должен затирать сохранённый
    if (!authed) html = html.replace(/localStorage\.setItem\('(rostyasha_admin_key|adminKey|ADMIN_KEY)',\s*window\.__ADMIN_KEY_FROM_SERVER__\);/g, '');
    const body = Buffer.from(html, 'utf8');
    res.writeHead(200, {
      'Content-Type': MIME['.html'],
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  });
}

function serveStatic(req, res, url, authed) {
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
  if (rel === '/' || rel === '') rel = '/panel.html';
  const abs = path.resolve(STATIC_DIR, '.' + rel);
  const inside = path.relative(STATIC_DIR, abs);
  const top = inside.split(path.sep)[0];
  const ext = path.extname(abs).toLowerCase();
  if (inside.startsWith('..') || path.isAbsolute(inside) || BLOCKED_TOP.has(top) || top.startsWith('.') || !MIME[ext]) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }
  if (inside === 'panel.html') return servePanelHtml(req, res, abs, authed);
  fs.stat(abs, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    const headers = {
      'Content-Type': MIME[ext],
      'Cache-Control': 'no-cache',
      'Last-Modified': st.mtime.toUTCString(),
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes'
    };
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
    if (range && (range[1] || range[2])) {
      let start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]));
      let end = range[1] && range[2] ? Number(range[2]) : st.size - 1;
      end = Math.min(end, st.size - 1);
      if (start > end || start >= st.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
        return res.end();
      }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
      return req.method === 'HEAD' ? res.end() : fs.createReadStream(abs, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, 'Content-Length': st.size });
    return req.method === 'HEAD' ? res.end() : fs.createReadStream(abs).pipe(res);
  });
}

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const ip = clientIp(req);

  if (p === '/health') return sendJson(res, 200, { ok: true });

  if (!p.startsWith('/api/')) {
    // открыли панель по ссылке с ?key=... — запоминаем сессию, чтобы работали запросы без ключа
    let authed = sessionOk(parseCookies(req)[COOKIE_NAME]);
    if (url.searchParams.has('key') && !isLimited(ip)) {
      const k = url.searchParams.get('key');
      if (keyOk(k)) { authed = true; res.setHeader('Set-Cookie', sessionCookie(req)); }
      else noteFail(ip);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, url, authed);
  }

  if (isLimited(ip)) return sendJson(res, 429, { ok: false, reason: 'too_many_attempts' });

  if (p === '/api/login' && req.method === 'POST') {
    const body = await readJson(req);
    if (!keyOk(body.key)) { noteFail(ip); return sendJson(res, 401, { ok: false, reason: 'bad_key' }); }
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req) });
  }

  if (!checkAuth(req, url, ip)) return sendJson(res, 401, { ok: false, reason: 'bad_key' });

  const q = Object.fromEntries([...url.searchParams].filter(([k]) => k !== 'key'));
  const extra = {};
  if (url.searchParams.get('key') != null) extra['Set-Cookie'] = sessionCookie(req);
  const reply = (obj, status = 200) => sendJson(res, status, obj, extra);

  // команды панели
  if (p.startsWith('/api/cmd/')) {
    const type = decodeURIComponent(p.slice('/api/cmd/'.length));
    return reply(withState(runCommand(type, q)));
  }
  if (p === '/api/command' && req.method === 'POST') {
    const body = await readJson(req);
    return reply(withState(runCommand(String(body.type || ''), body.payload && typeof body.payload === 'object' ? body.payload : {})));
  }

  switch (p) {
    case '/api/access/me': return reply({ ok: true, authed: true, role: 'admin' });
    case '/api/state': return reply(publicState());
    case '/api/chat': return reply({ ok: true, chat: runtime.chat });

    case '/api/clear-winners':
      return reply(withState(runCommand('clear_winners')));
    case '/api/v232/save-winner': {
      const body = req.method === 'POST' ? await readJson(req) : {};
      const r = saveWinner(body.withdrawalRub);
      scheduleBroadcast();
      return reply(withState(r));
    }
    case '/api/v232/close-winner':
      return reply(withState(closeWinner()));
    case '/api/v484/reroll-reason': {
      const body = await readJson(req);
      return reply(withState(rerollReasonOnly(String(body.reason || '').slice(0, 200))));
    }
    case '/api/v489/reroll-in-place': {
      const body = await readJson(req);
      return reply(withState(rerollInPlace(String(body.reason || '').slice(0, 200))));
    }

    case '/api/followage':
      // Нужен токен Twitch API со scope moderator:read:followers — пока не подключён
      return reply({ ok: true, followText: 'нет данных' });

    case '/api/top-active': {
      const limit = clamp(Number(q.limit) || 3, 1, 20);
      const users = Object.entries(db.messages)
        .filter(([u, n]) => n > 0 && !IGNORED.has(u) && u !== CHANNEL && !db.blacklist.includes(u))
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([username, messages]) => ({ username, messages }));
      return reply({ ok: true, users });
    }
    case '/api/v514/watchtime-all': {
      const rows = Object.entries(db.watchtime)
        .filter(([u]) => !u.startsWith('__') && !IGNORED.has(u))
        .sort((a, b) => b[1] - a[1])
        .map(([username, seconds]) => ({ username, seconds }));
      return reply({ ok: true, rows });
    }
    case '/api/chatters-watchtime-status': {
      const now = Date.now();
      let counted = 0;
      for (const ts of runtime.active.values()) if (now - ts <= ACTIVE_WINDOW_MS) counted++;
      return reply({ ok: runtime.twitchConnected, counted });
    }
    case '/api/cleanup-watchtime-service-keys':
    case '/api/cleanup-excluded-users': {
      for (const bag of [db.watchtime, db.messages]) {
        for (const k of Object.keys(bag)) if (k.startsWith('__') || IGNORED.has(k)) delete bag[k];
      }
      saveSoon();
      return reply({ ok: true });
    }

    case '/api/v484/player': {
      const user = norm(q.user);
      if (!user) return reply({ ok: false, reason: 'bad_user' }, 400);
      const history = (db.history[user] || []).slice().sort((a, b) => b.at - a.at);
      return reply({
        ok: true,
        user,
        session: {
          participant: db.participants.includes(user),
          messages: db.messages[user] || 0
        },
        persistent: {
          history,
          appearances: history.filter(h => h.type === 'appearance').length,
          rerolls: history.filter(h => h.type === 'reroll').length,
          messages: db.messages[user] || 0,
          watchtimeTotalSec: Math.round(db.watchtime[user] || 0),
          totalPayoutRub: db.winners.filter(w => w.username === user).reduce((s, w) => s + (w.withdrawalRub || 0), 0),
          follow: 'нет данных'
        }
      });
    }
    case '/api/v482/winner-chat': {
      const user = norm(q.user);
      const minutes = clamp(Number(q.minutes) || 5, 1, 60);
      const cutoff = Date.now() - minutes * 60 * 1000;
      return reply({ ok: true, messages: runtime.chat.filter(m => m.username === user && m.ts >= cutoff) });
    }
    default:
      return reply({ ok: false, reason: 'not_found' }, 404);
  }
}

const server = http.createServer((req, res) => {
  route(req, res).catch(e => {
    console.error('[http]', e);
    if (!res.headersSent) sendJson(res, e.message === 'too_large' ? 413 : 500, { ok: false, reason: 'server_error' });
    else res.end();
  });
});

// ───────────────────────── WebSocket панели ─────────────────────────
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/') { socket.destroy(); return; }
  const ip = clientIp(req);
  if (isLimited(ip)) { socket.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => {
    ws.ip = ip;
    wss.emit('connection', ws, req, url);
  });
});

wss.on('connection', (ws, req, url) => {
  ws.isAlive = true;
  ws.authed = false;
  ws.on('pong', () => { ws.isAlive = true; });

  const grant = () => {
    ws.authed = true;
    clearTimeout(ws.authTimer);
    sendTo(ws, 'auth_ok');
  };
  const key = url.searchParams.get('key');
  if (key && keyOk(key)) grant();
  else {
    if (key) noteFail(ws.ip);
    // без авторизации состояние не отдаём — только просьбу ввести ключ
    ws.send(JSON.stringify({ type: 'state', payload: { needsKey: true } }));
    ws.authTimer = setTimeout(() => { if (!ws.authed) ws.close(); }, 60000);
  }

  ws.on('message', data => {
    let msg;
    try { msg = JSON.parse(String(data)); } catch { return; }
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'auth') {
      if (isLimited(ws.ip)) return ws.close();
      if (keyOk(msg.key)) grant();
      else { noteFail(ws.ip); ws.send(JSON.stringify({ type: 'auth_fail' })); }
      return;
    }
    if (!ws.authed) return;

    const { type, ...params } = msg;
    const r = runCommand(type, params);
    if (!r.ok) ws.send(JSON.stringify({ type: 'notice', payload: { reason: r.reason }, state: publicState() }));
  });
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000).unref();

// ───────────────────────── запуск ─────────────────────────
function shutdown() {
  console.log('Останавливаюсь, сохраняю данные...');
  saveNow();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', e => console.error('[unhandledRejection]', e));

server.listen(PORT, () => {
  console.log(`Сервер панели: http://localhost:${PORT}/panel.html`);
  console.log(`Канал Twitch: #${CHANNEL} (${botAuthed ? 'бот ' + BOT_NICK + ' — может писать в чат' : 'только чтение чата'})`);
  if (keyWasGenerated) {
    console.log('────────────────────────────────────────────────────');
    console.log('Ключ админа создан и сохранён в файле данных:');
    console.log('  ' + ADMIN_KEY);
    console.log(`Открой панель один раз так: http://localhost:${PORT}/panel.html?key=${ADMIN_KEY}`);
    console.log('Лучше задай свой ключ через переменную окружения ADMIN_KEY.');
    console.log('────────────────────────────────────────────────────');
  }
  connectTwitch();
});
