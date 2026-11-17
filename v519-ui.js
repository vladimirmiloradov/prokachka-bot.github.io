/* v519 + v520: minimal, idempotent view adjustments without document-wide mutation feedback loops.
   Game, websocket, and winner-session logic remain in the existing modules. */
(() => {
  'use strict';
  const q = id => document.getElementById(id);
  const replaceOnlyWhenDifferent = (el, expected) => {
    if (el && el.textContent !== expected) el.textContent = expected;
  };
  const frame = { pending:false };
  function cleanup() {
    document.querySelectorAll('[id^="winnerFishQuote"],.winner-fish-quote').forEach(el => el.remove());
    const leader = q('v516HourLeader');
    const name = q('v516HourLeaderName');
    const count = q('v516HourLeaderCount');
    if (leader && name && count) {
      const hasName = Boolean(name.textContent.trim() && name.textContent.trim() !== '—');
      leader.classList.toggle('v517-empty', !hasName);
      if (!hasName) { replaceOnlyWhenDifferent(name, ''); replaceOnlyWhenDifferent(count, ''); }
    }
    const connection = q('connectionText');
    if (connection) {
      const raw = connection.textContent || '';
      const normalized = raw.replace(/^\s*Twitch\s+подключ[её]н\s*:/i,'Twitch подключён:').trim();
      if (raw !== normalized) replaceOnlyWhenDifferent(connection, normalized);
    }
    const box=q('winnerChatBox'); const timer=q('winnerReplyStopwatch');
    if (box && timer && timer.parentNode !== box) box.appendChild(timer);
    // No strobing in winner metrics or chat: the app can still set semantic success classes.
    q('winnerBox')?.classList.remove('v518-answer-flash');
    box?.classList.remove('v518-answer-flash');
  }
  function scheduleCleanup() {
    if (frame.pending) return;
    frame.pending = true;
    requestAnimationFrame(() => { frame.pending = false; cleanup(); });
  }
  function boot() {
    cleanup();
    // Watch for DOM changes only when something actually changed. No unconditional text rewrites.
    const watcher = new MutationObserver(scheduleCleanup);
    watcher.observe(document.body, {childList:true,subtree:true});
    // Fallback for live status metrics updated with nodeValue rather than textContent replacement.
    ['connectionText','v516HourLeaderName'].forEach(id => {
      const el=q(id);if (el) watcher.observe(el,{characterData:true,subtree:true});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
