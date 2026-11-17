/* KORZHANY v515 — visual controls. Keep existing WS/roulette/winner code untouched. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const TOP_VISIBLE_KEY = 'korzhany_v515_top3_visible';
 const TIMER_KEY = 'korzhany_v515_stream_timer';
 const pad = x => String(Math.max(0,x)).padStart(2,'0');
 const format = n => { n = Math.max(0,Math.floor(Number(n)||0));return `${pad(Math.floor(n/3600))}:${pad(Math.floor(n%3600/60))}:${pad(n%60)}`; };
 const limitSeconds = s => {
   const v = String(s||'').trim();
   if (/^\d+:\d{1,2}(:\d{1,2})?$/.test(v)) {
     const t=v.split(':').map(Number);
     return t.length===3 ? t[0]*3600+t[1]*60+t[2] : t[0]*60+t[1];
   }
   if (/^\d+$/.test(v)) return Number(v)*60; // bare integer = minutes
   return NaN;
 };
 function safeState(){try{return typeof state!=='undefined' ? state : null;}catch{return null;}}
 function say(msg){ try{if(typeof toast === 'function') return toast(msg);}catch{} console.info('[HUB]',msg); }
 function sendSafe(type,payload){try{if(typeof send==='function') return send(type,payload);}catch(e){console.warn('[v515] send failed',e);}}
 function persist(key,obj){ try{localStorage.setItem(key,JSON.stringify(obj));}catch{} }
 function read(key,defaultValue){try{return JSON.parse(localStorage.getItem(key) || 'null') ?? defaultValue;}catch{return defaultValue;}}
 function setIntake(open){ sendSafe('set_setting',{name:'joinWindowOpenV515',value:!!open}); }

 function boot(){
   // Title + row position are controlled by a single nonintrusive responsive style.
   // Search icon is authored explicitly to avoid multiple competing pseudo icons.
   // TOP-3 main switch remains the existing server-independent v422 power control.
   function updateTopVisibility(){
      const visible = localStorage.getItem(TOP_VISIBLE_KEY)!=='0';
      document.body.classList.toggle('v515-hide-top3',!visible);
      const btn=$('top3VisibleToggleV515');
      if(btn){btn.textContent=visible?'ВКЛ':'ВЫКЛ';btn.setAttribute('aria-pressed',String(visible));}
   }
   updateTopVisibility();
   $('top3VisibleToggleV515')?.addEventListener('click',()=>{
     const next=localStorage.getItem(TOP_VISIBLE_KEY)==='0';
     localStorage.setItem(TOP_VISIBLE_KEY,next?'1':'0');
     updateTopVisibility();
   });

   // Participant zoom independent of Twitch chat zoom and page zoom.
   const panel=$('participantsPanel'), list=$('participantsList');
   if(panel&&list){
     let zoom=Math.min(1.8,Math.max(.75,Number(localStorage.getItem('korzhany_v515_participant_zoom')||1)));
     const setZoom=()=>{list.style.zoom=String(zoom);panel.dataset.participantZoom=Math.round(zoom*100)+'%';};
     setZoom();
     panel.addEventListener('wheel', e=>{
       if(!e.ctrlKey) return;
       e.preventDefault(); e.stopPropagation();
       zoom=Math.min(1.8,Math.max(.75,Math.round((zoom+(e.deltaY<0?.1:-.1))*100)/100));
       localStorage.setItem('korzhany_v515_participant_zoom',String(zoom));
       setZoom();
     },{passive:false});
   }
   const ambient=$('participantsAmbientCountV515');
   const syncCount=()=>{if(ambient){const n=Number($('participantsCount')?.textContent||0);ambient.querySelector('strong').textContent=String(n);ambient.classList.toggle('has-members',n>0);}};
   syncCount();
   if($('participantsCount')) new MutationObserver(syncCount).observe($('participantsCount'),{childList:true,characterData:true,subtree:true});

   // Watchtime starts with v514. Show only measured data; never fabricate earlier hours.
   const lifetimeValue=$('winnerLifetimeV515');
   if(lifetimeValue&&$('winnerName')){
     let requested='', lastRequest=0, seq=0;
     const refreshLifetime=async()=>{
       const nick=String($('winnerName')?.textContent||'').replace(/^@/,'').trim().toLowerCase();
       if(!nick||nick==='---')return;
       if(nick===requested && Date.now()-lastRequest<30000)return;
       requested=nick;lastRequest=Date.now();const token=++seq;
       lifetimeValue.textContent='…';
       try{
         const res=await fetch('/api/v514/watchtime-all',{credentials:'same-origin',cache:'no-store'});
         if(!res.ok)throw new Error('watchtime unavailable');
         const data=await res.json();
         if(token!==seq)return;
         const match=(data.rows||[]).find(x=>String(x.username||'').toLowerCase()===nick);
         if(!match){lifetimeValue.textContent='0 мин';return;}
         const t=Math.max(0,Number(match.seconds)||0);
         lifetimeValue.textContent=t>=3600 ? `${Math.floor(t/3600)} ч ${Math.floor(t%3600/60)} м` : `${Math.floor(t/60)} мин`;
       }catch{if(token===seq)lifetimeValue.textContent='—';}
     };
     new MutationObserver(refreshLifetime).observe($('winnerName'),{subtree:true,childList:true,characterData:true});
     refreshLifetime();
   }

   // v517: stop retired stream timer without leaving admissions locked when a
   // previously scheduled 'open registration' action was mid-countdown.
   const oldTimer=read(TIMER_KEY,null);
   if(oldTimer?.running && oldTimer.action==='open') setIntake(true);
   try{localStorage.removeItem(TIMER_KEY);}catch{}
   // Winner response stopwatch and TOP-3 controls remain enabled.

 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
