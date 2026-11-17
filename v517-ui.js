/* v517: small, non-invasive view fixes. Core winner/roulette/role state lives in app.js. */
(() => {
 'use strict';
 const q = id => document.getElementById(id);
 function boot(){
   // Disable legacy in-flight fish objects from any prior runtime modules.
   document.querySelectorAll('[id^="winnerFishQuote"]').forEach(el=>el.remove());
   // Give single-player roulette a clean visual without touching sector mapping.
   const wheel=q('rouletteWheel');
   if(wheel){
     const sync=()=>{
       const labels=wheel.querySelectorAll('.wheel-name');
       wheel.classList.toggle('v517-single-sector',labels.length===1);
     };
     sync();
     new MutationObserver(sync).observe(wheel,{childList:true});
   }
   // Twitch followage request still happens; only the unstable "checking..."
   // wording is suppressed in the visible metric, so the card doesn't resize.
   const follow=q('winnerFollowInfo');
   if(follow){
     const stable=()=>{
       if(/проверяем|checking/i.test(follow.textContent||'')) follow.textContent='—';
     };
     stable();
     new MutationObserver(stable).observe(follow,{childList:true,characterData:true,subtree:true});
   }
   // Do not hard-code a streamer name; the existing live connectionText receives
   // the actual channel from Twitch. We adjust typography only through CSS.
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
