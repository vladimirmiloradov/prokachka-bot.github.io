/* KORZHANY v516: read-only streamer chat metrics. Main UI timer/winner/roulette
   event handlers remain owned by v515-ui.js and app.js. */
(() => {
  'use strict';
  const ready=()=>{
    const root=document.getElementById('v516HourLeader');
    const username=document.getElementById('v516HourLeaderName');
    const count=document.getElementById('v516HourLeaderCount');
    if(!root||!username||!count)return;
    let last='';
    const update=()=>{
      const info=window.state?.topChatterHourV516;
      const key=String(info?.username||'')+'|'+String(info?.messages||0);
      if(key===last)return;
      last=key;
      username.textContent=info?.username||'';
      root.classList.toggle('v517-empty', !info?.username);
      count.textContent=Number(info?.messages)>0?`· ${Math.floor(info.messages)} смс`:'';
    };
    update();
    setInterval(update,900);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true}); else ready();
})();
