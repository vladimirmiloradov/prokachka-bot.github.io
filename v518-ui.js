/* v518: code-word save, stable Twitch followage, HUB tag and one-shot answer pulse.
   The authoritative winner stopwatch runs ONLY in app.js v513; no duplicate timers. */
(() => {
  'use strict';
  const q = id => document.getElementById(id);

  function adminKey() {
    try {
      return new URLSearchParams(location.search).get('key') || localStorage.getItem('rostyasha_admin_key') || '12345';
    } catch (_) { return '12345'; }
  }

  async function setCode(code) {
    const query = new URLSearchParams({key:adminKey(),code});
    const res = await fetch(`/api/cmd/set_code?${query.toString()}`, {credentials:'same-origin',cache:'no-store'});
    const data = await res.json();
    if (!res.ok || !data?.ok) throw new Error(data?.reason || `HTTP ${res.status}`);
    // The API returns persisted server state; it is authoritative.
    if (data.state && typeof window.render === 'function') window.render(data.state);
    ['codeBtnText','codeBanner','codeCenter'].forEach(id => {if(q(id)) q(id).textContent=code;});
  }

  async function askNewCode(current) {
    if (typeof window.__v213StyledModal === 'function') {
      return window.__v213StyledModal({title:'КОД УЧАСТИЯ',body:'Введи новое кодовое слово:',mode:'prompt',value:current,placeholder:current});
    }
    return window.prompt('Новое кодовое слово:', current);
  }

  // Window capture is earlier than the many legacy DOCUMENT capture listeners.
  // A single save request prevents an old WS handler from restoring "+" afterward.
  window.addEventListener('click', async e => {
    if (!e.target.closest?.('#codeBtn')) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const current=window.state?.settings?.codeWord || q('codeBtnText')?.textContent?.trim() || '+';
    const value=await askNewCode(current);
    if (value===null || value===undefined) return;
    const next=String(value).trim();
    if (!next) return;
    try {
      await setCode(next);
      if (typeof window.toast === 'function') window.toast('Код обновлён');
    } catch (err) {
      console.warn('[v518 set_code]',err);
      if (typeof window.toast === 'function') window.toast('Не удалось сохранить код');
    }
  }, true);

  function ensureHubTag(){
    let hub=q('logoutBtnV216');
    if(!hub){
      hub=document.createElement('a');
      hub.id='logoutBtnV216';hub.href='/hub';hub.textContent='HUB';hub.className='logout-btn-v216';
      hub.setAttribute('aria-label','Вернуться в KORZHANY HUB');
    }
    const top=q('topActiveV168') || document.querySelector('.top-active-v168');
    if(document.documentElement.classList.contains('product-layout-modern') && top){
      if(hub.parentNode!==top)top.appendChild(hub);
      hub.classList.add('top3-hub-tag-v412');
    }else{
      if(hub.parentNode!==document.body)document.body.appendChild(hub);
      hub.classList.remove('top3-hub-tag-v412');
    }
  }

  function cleanFollowText(){
    const el=q('winnerFollowInfo'); if(!el)return;
    const text=String(el.textContent || '').trim();
    if(/проверяем|checking/i.test(text)) el.textContent='—';
    if(el.classList.contains('followage-loading-v120'))el.classList.remove('followage-loading-v120');
  }

  let lastWinnerSession='', successEmitted=false;
  function observeWinnerSuccess(){
    const box=q('winnerChatBox');if(!box)return;
    const sessionId=box.dataset.responseSessionV513 || box.dataset.responseSessionV512 || '';
    if(sessionId!==lastWinnerSession){lastWinnerSession=sessionId;successEmitted=false;
      box.classList.remove('v518-answer-flash');q('winnerBox')?.classList.remove('v518-answer-flash');}
    const onTime=box.classList.contains('v482-answered') || box.classList.contains('v518-answered-live');
    if(!onTime || successEmitted || box.classList.contains('hidden'))return;
    successEmitted=true;
    const top=q('winnerBox');
    box.classList.add('v518-answer-flash');top?.classList.add('v518-answer-flash');
    window.setTimeout(()=>{box.classList.remove('v518-answer-flash');top?.classList.remove('v518-answer-flash');},1350);
  }

  function boot(){
    ensureHubTag();cleanFollowText();observeWinnerSuccess();
    // Theme scripts may reparent/hide the HUB tab during a palette swap.
    window.setInterval(ensureHubTag,850);
    // No visible delay when a palette script changes theme/layout classes.
    const themeObserver = new MutationObserver(ensureHubTag);
    themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class','data-theme','data-palette']});
    themeObserver.observe(document.body,{attributes:true,attributeFilter:['class','data-theme','data-palette']});
    window.setInterval(cleanFollowText,280);
    const box=q('winnerChatBox');
    if(box){
      new MutationObserver(observeWinnerSuccess).observe(box,{attributes:true,attributeFilter:['class','data-response-session-v513','data-response-session-v512']});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
