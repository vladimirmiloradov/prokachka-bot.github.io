/* Wokomilka giveaways: uses the live, server-supplied participant snapshot. */
(function(){
window.wokoPool=function(){const s=window.state||{};let p=Array.isArray(s.participants)?s.participants:[];if(s.settings?.onlyNeverWon){const won=new Set((s.winners||[]).map(w=>String(w.username||'').toLowerCase()));p=p.filter(n=>!won.has(String(n).toLowerCase()));}return [...new Set(p.map(String).filter(Boolean))];};
window.wokoDisplayWinner=function(name){
  // Local-only draw. Never pretend to persist server winner history.
  const box=document.getElementById('wokoLocalResult');
  if(box){box.textContent='🏆 '+name+' — локальный результат (не сохранён на сервере)';box.hidden=false;}
  if(typeof window.toast==='function')window.toast('Победитель: '+name+' (локально)');
};
window.wokoCloseLotto=function(){stopLottoAnim();document.getElementById('lottoModal').classList.remove('open');};
window.wokoTwo=function(){const p=wokoPool();if(p.length<2){alert('Нужно минимум 2 участника');return;}const a=p.splice(Math.floor(Math.random()*p.length),1)[0],b=p[Math.floor(Math.random()*p.length)];document.getElementById('wokoLocalResult').textContent='🏆 '+a+' и '+b+' — локальный результат (не сохранён на сервере)';document.getElementById('wokoLocalResult').hidden=false;};
const toggle=document.getElementById('wokoGiveawayToggle'),menu=document.getElementById('wokoGiveawayMenu');
toggle?.addEventListener('click',()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden));});
document.getElementById('wokoNewBtn')?.addEventListener('click',openNewRoulette);
document.getElementById('wokoLottoBtn')?.addEventListener('click',openLotto);
document.getElementById('wokoTwoBtn')?.addEventListener('click',wokoTwo);
document.querySelectorAll('.woko-modal').forEach(el=>el.addEventListener('click',e=>{if(e.target===el){if(el.id==='lottoModal')wokoCloseLotto();else closeNewRoulette();}}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.getElementById('newRouletteModal').classList.contains('open'))closeNewRoulette();if(document.getElementById('lottoModal').classList.contains('open'))wokoCloseLotto();}});
var newRoulettePool=[];
var newRouletteOrder=[];
var newRouletteSpinning=false;
var newRouletteWinner=null;
var newRouletteSpinToken=0;
var NR_CELL_W=110,NR_GAP=10,NR_WIN=5*110+4*10;
function openNewRoulette(){
  var pool=wokoPool();
  if(!pool.length){alert('Нет участников!');return;}
  newRoulettePool=pool;
  var n=pool.length,repeats=22,wrap=document.getElementById('new-roulette-strip');
  newRouletteWinner=null;newRouletteOrder=[];
  for(var r=0;r<repeats;r++)for(var i=0;i<n;i++)newRouletteOrder.push(pool[i]);
  wrap.innerHTML=newRouletteOrder.map(function(nm){return'<div class="nr-cell">'+esc(nm)+'</div>';}).join('');
  document.getElementById('new-roulette-pool-count').innerText='Участников: '+n;
  document.getElementById('new-roulette-result').innerText='---';
  document.getElementById('new-roulette-confirm-btn').style.display='none';
  document.getElementById('newRouletteModal').classList.add('open');
}
function closeNewRoulette(){newRouletteSpinToken++;newRouletteSpinning=false;document.getElementById('newRouletteModal').classList.remove('open');}
function adjustNewDur(d){var i=document.getElementById('new-dur-input');i.value=Math.max(1,Math.min(60,(parseInt(i.value)||5)+d));}
function setNewDur(v){document.getElementById('new-dur-input').value=Math.max(1,Math.min(60,v));}
function spinNewRoulette(){
  if(newRouletteSpinning||!newRoulettePool.length){if(!newRoulettePool.length)alert('Нет участников!');return;}
  var wrap=document.getElementById('new-roulette-strip');
  var n=newRoulettePool.length;
  var winner=newRoulettePool[Math.floor(Math.random()*n)];
  newRouletteWinner=winner;
  var baseIdx=newRoulettePool.indexOf(winner);
  var copy=2+Math.floor(Math.random()*4),L=copy*n+baseIdx;
  var step=NR_CELL_W+NR_GAP,center=NR_WIN/2;
  var Xstart=center-L*step-NR_CELL_W/2-((22-copy)*n*step);
  var Xfinal=center-L*step-NR_CELL_W/2;
  var durSec=parseInt(document.getElementById('new-dur-input').value)||5;
  var duration=Math.max(1000,durSec*1000);
  newRouletteSpinning=true;
  var token=++newRouletteSpinToken;
  var winEl=document.getElementById('new-roulette-window');
  var confirmBtn=document.getElementById('new-roulette-confirm-btn');
  confirmBtn.style.display='none';
  if(winEl)winEl.style.opacity='0';
  var startTime=performance.now();
  wrap.querySelectorAll('.nr-cell').forEach(function(c){c.classList.remove('is-winner');});
  wrap.style.transform='translateX('+Xstart+'px)';
  document.getElementById('new-roulette-result').innerText='🎰 КРУТИМ...';
  var lastTick=-1;
  requestAnimationFrame(function(){if(winEl)winEl.style.opacity='1';});
  function frame(now){
    if(token!==newRouletteSpinToken||!newRouletteSpinning||!document.getElementById('newRouletteModal').classList.contains('open'))return;
    var p=Math.min((now-startTime)/duration,1);
    var X=Xstart+(Xfinal-Xstart)*(1-Math.pow(1-p,4));
    wrap.style.transform='translateX('+X+'px)';
    var crossed=Math.floor((X-Xstart)/step);
    if(crossed!==lastTick){lastTick=crossed;void 0;}
    if(p<1){requestAnimationFrame(frame);}
    else{
      newRouletteSpinning=false;
      wrap.style.transform='translateX('+Xfinal+'px)';
      var cells=wrap.querySelectorAll('.nr-cell');
      if(cells[L])cells[L].classList.add('is-winner');
      document.getElementById('new-roulette-result').innerText='🏆 Победитель: '+winner;
      confirmBtn.style.display='block';
    }
  }
  requestAnimationFrame(frame);
}
function confirmNewRoulette(){
  if(!newRouletteWinner)return;
  closeNewRoulette();
  wokoDisplayWinner(newRouletteWinner);
}
var LOTTO_COLORS=['#a855f7','#7e22ce','#9333ea','#6d28d9','#8b5cf6','#c084fc','#5b21b6','#4c1d95'];
var lottoPool=[],lottoBalls=[],lottoAnimId=null,lottoMode='idle',lottoModeStart=0,lottoWinnerIdx=null,lottoDurSec=5;
function adjustLottoDur(d){setLottoDur(lottoDurSec+d);}
function setLottoDur(v){lottoDurSec=Math.max(1,Math.min(20,parseInt(v,10)||5));var i=document.getElementById('lotto-dur-input');if(i)i.value=lottoDurSec;}
function shadeColor(hex,pc){var n=parseInt(hex.slice(1),16),a=Math.round(2.55*pc);return'rgb('+Math.min(255,Math.max(0,(n>>16)+a))+','+Math.min(255,Math.max(0,((n>>8)&255)+a))+','+Math.min(255,Math.max(0,(n&255)+a))+')';}
function openLotto(){
  
  var pool=wokoPool();
  if(!pool.length){alert('Список участников пуст!');return;}
  lottoPool=pool;
  var html='';
  for(var i=0;i<pool.length;i++)html+='<div class="lotto-nick-row" id="lotto-nick-'+i+'"><span class="lotto-nick-name">'+esc(pool[i])+'</span><span class="lotto-ball-num" style="--bc:'+LOTTO_COLORS[i%LOTTO_COLORS.length]+'">'+(i+1)+'</span></div>';
  document.getElementById('lotto-nick-list').innerHTML=html;
  document.getElementById('lotto-result').textContent='---';
  document.getElementById('lotto-spin-btn').disabled=false;
  document.getElementById('lotto-confirm-btn').style.display='none';
  document.getElementById('lottoModal').classList.add('open');
  lottoWinnerIdx=null;initLottoBalls();lottoMode='idle';startLottoLoop();
}
function initLottoBalls(){
  var cvs=document.getElementById('lotto-canvas'),ctx=cvs.getContext('2d');
  var dpr=Math.min(window.devicePixelRatio||1,2);
  cvs.width=380*dpr;cvs.height=380*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  var radius=Math.max(12,Math.min(20,300/Math.sqrt(lottoPool.length+1)));
  lottoBalls=[];
  for(var i=0;i<lottoPool.length;i++){var ang=Math.random()*Math.PI*2,r=Math.random()*110;lottoBalls.push({num:i+1,color:LOTTO_COLORS[i%LOTTO_COLORS.length],radius:radius,x:190+Math.cos(ang)*r,y:190+Math.sin(ang)*r,vx:(Math.random()*2-1)*2.5,vy:(Math.random()*2-1)*2.5});}
}
function startLottoSpin(){
  if(!lottoPool.length||lottoMode==='spin'||lottoMode==='settle'||lottoMode==='eject')return;
  initLottoBalls();
  lottoWinnerIdx=Math.floor(Math.random()*lottoBalls.length);
  lottoMode='spin';lottoModeStart=performance.now();
  document.getElementById('lotto-spin-btn').disabled=true;
  document.getElementById('lotto-confirm-btn').style.display='none';
  document.getElementById('lotto-result').textContent='КРУТИМ...';
  var rows=document.querySelectorAll('.lotto-nick-row');
  for(var i=0;i<rows.length;i++)rows[i].classList.remove('lotto-win-row');
  startLottoLoop();
}
function startLottoLoop(){
  if(lottoAnimId)cancelAnimationFrame(lottoAnimId);
  var cvs=document.getElementById('lotto-canvas');
  if(!cvs)return;
  var ctx=cvs.getContext('2d');
  var size=380,cx=size/2,cy=size/2-20,drumR=152;
  function loop(now){
    var k,elapsed;
    if(lottoMode==='spin'){
      elapsed=(now-lottoModeStart)/1000;
      var power=Math.sin(Math.PI*Math.min(elapsed/lottoDurSec,1))*2.2,t=elapsed*1.4;
      for(k=0;k<lottoBalls.length;k++){
        var b=lottoBalls[k],ang=Math.atan2(b.y-cy,b.x-cx);
        var swirl=power*.55*(.65+.35*Math.sin(t+b.num*1.7));
        b.vx+=-Math.sin(ang)*swirl;b.vy+=Math.cos(ang)*swirl;
        var pulse=power*.4*Math.sin(t*1.9+b.num*2.3);
        b.vx+=((b.x-cx)/200)*pulse;b.vy+=((b.y-cy)/200)*pulse;
        b.vx+=(Math.random()*2-1)*power*.12;b.vy+=(Math.random()*2-1)*power*.12;
      }
      if(elapsed>=lottoDurSec){lottoMode='settle';lottoModeStart=now;}
    }else if(lottoMode==='settle'){
      elapsed=(now-lottoModeStart)/1000;
      var wb=lottoBalls[lottoWinnerIdx],hatchY=wb?cy+drumR-wb.radius-8:cy+drumR;
      for(k=0;k<lottoBalls.length;k++){
        var b2=lottoBalls[k];
        if(k===lottoWinnerIdx){b2.x+=(cx-b2.x)*.08;b2.y+=(hatchY-b2.y)*.08;}
        else{b2.vx*=.9;b2.vy*=.9;}
      }
      if(elapsed>1){lottoMode='eject';lottoModeStart=now;var w0=lottoBalls[lottoWinnerIdx];if(w0){w0.vx=0;w0.vy=.5;}document.getElementById('lotto-result').textContent='ВЫПАДАЕТ ШАР...';}
    }else if(lottoMode==='eject'){
      var w2=lottoBalls[lottoWinnerIdx];
      if(w2){w2.vy=Math.min(w2.vy+.28,9);w2.x+=(cx-w2.x)*.05;}
      for(k=0;k<lottoBalls.length;k++){var b3=lottoBalls[k];if(k!==lottoWinnerIdx){b3.vy+=.05;b3.vx*=.99;}}
      if(w2){var trayY=size-w2.radius-14;if(w2.y>=trayY){w2.y=trayY;w2.vy=0;w2.vx=0;lottoMode='done';showLottoWinner();}}
    }else{
      for(k=0;k<lottoBalls.length;k++){
        var b4=lottoBalls[k];
        if(lottoMode==='done'&&k===lottoWinnerIdx)continue;
        b4.vy+=.05;b4.vx+=(Math.random()*2-1)*.08;b4.vy+=(Math.random()*2-1)*.08;
        if(Math.abs(b4.vx)<.6)b4.vx+=(Math.random()<.5?-.5:.5);
      }
    }
    for(k=0;k<lottoBalls.length;k++){
      var b5=lottoBalls[k];
      if((lottoMode==='eject'||lottoMode==='done')&&k===lottoWinnerIdx){b5.x+=b5.vx;b5.y+=b5.vy;continue;}
      if(lottoMode==='settle'&&k===lottoWinnerIdx)continue;
      b5.x+=b5.vx;b5.y+=b5.vy;
      var dx=b5.x-cx,dy=b5.y-cy,dist=Math.sqrt(dx*dx+dy*dy),maxD=drumR-b5.radius;
      if(dist>maxD){var nx=dx/dist,ny=dy/dist;b5.x=cx+nx*maxD;b5.y=cy+ny*maxD;var dot=b5.vx*nx+b5.vy*ny;b5.vx-=2*dot*nx;b5.vy-=2*dot*ny;b5.vx*=.88;b5.vy*=.88;}
    }
    drawLottoFrame(ctx,size,cx,cy,drumR,now);
    lottoAnimId=requestAnimationFrame(loop);
  }
  lottoAnimId=requestAnimationFrame(loop);
}
function drawLottoBall(ctx,b,isWinner,now){
  if(isWinner){
    var gp=.5+.5*Math.sin((now||performance.now())/200);
    ctx.beginPath();ctx.arc(b.x,b.y,b.radius+8+gp*6,0,Math.PI*2);
    ctx.fillStyle='rgba(168,85,247,'+(.25+gp*.3)+')';ctx.fill();
  }
  ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);ctx.fillStyle=b.color;ctx.fill();
  ctx.beginPath();ctx.arc(b.x,b.y,b.radius*.55,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.92)';ctx.fill();
  ctx.fillStyle='#111';ctx.font='900 '+Math.round(b.radius*.72)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(String(b.num),b.x,b.y+1);
}
function drawLottoFrame(ctx,size,cx,cy,drumR,now){
  ctx.clearRect(0,0,size,size);
  var ejecting=lottoMode==='eject'||lottoMode==='done',i;
  ctx.save();
  ctx.beginPath();ctx.arc(cx,cy,drumR-1.5,0,Math.PI*2);ctx.clip();
  ctx.beginPath();ctx.arc(cx,cy,drumR,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.03)';ctx.fill();
  for(i=0;i<lottoBalls.length;i++){if(ejecting&&i===lottoWinnerIdx)continue;drawLottoBall(ctx,lottoBalls[i],false);}
  ctx.restore();
  ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.15)';
  ctx.beginPath();ctx.arc(cx,cy,drumR,0,Math.PI*2);ctx.stroke();
  if(ejecting){var w=lottoBalls[lottoWinnerIdx];if(w)drawLottoBall(ctx,w,true,now);}
}
function showLottoWinner(){
  var w=lottoBalls[lottoWinnerIdx];
  if(!w)return;
  document.getElementById('lotto-result').textContent='🏆 '+lottoPool[lottoWinnerIdx];
  var row=document.getElementById('lotto-nick-'+lottoWinnerIdx);
  if(row){row.classList.add('lotto-win-row');row.scrollIntoView({behavior:'smooth',block:'nearest'});}
  document.getElementById('lotto-spin-btn').disabled=false;
  document.getElementById('lotto-confirm-btn').style.display='block';
}
function confirmLotto(){
  if(lottoWinnerIdx===null)return;
  var name=lottoPool[lottoWinnerIdx];
  if(!name)return;
  stopLottoAnim();
  wokoCloseLotto();
  wokoDisplayWinner(name);
}
function stopLottoAnim(){if(lottoAnimId){cancelAnimationFrame(lottoAnimId);lottoAnimId=null;}lottoMode='idle';}

Object.assign(window,{openNewRoulette,closeNewRoulette,adjustNewDur,setNewDur,spinNewRoulette,confirmNewRoulette,adjustLottoDur,setLottoDur,startLottoSpin,confirmLotto});
})();


// Standard canvas roulette adapted from milkanew: local-only, server snapshot for candidates.
(function(){
 const $w=id=>document.getElementById(id), modal=$w('wokoWheelModal'), canvas=$w('wokoWheelCanvas');
 if(!modal||!canvas)return;
 const ctx=canvas.getContext('2d');
 const colors=['#a855f7','#7e22ce','#9333ea','#6d28d9','#8b5cf6','#c084fc','#5b21b6','#4c1d95','#d946ef','#6366f1'];
 let pool=[],angle=0,mode='elimination',spinning=false,token=0,winner=null,timeout=null;
 const norm=n=>(n%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
 function under(a){if(!pool.length)return '—';return pool[Math.floor(norm(-Math.PI/2-a)/(Math.PI*2/pool.length))%pool.length];}
 function draw(a){
  angle=a;ctx.clearRect(0,0,500,500);
  const n=pool.length;if(!n){$w('wokoWheelNick').textContent='—';return;}
  const slice=Math.PI*2/n,cx=250,cy=250,r=233;
  pool.forEach((name,i)=>{
   ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a+i*slice,a+(i+1)*slice);ctx.closePath();ctx.fillStyle=colors[i%colors.length];ctx.fill();ctx.strokeStyle='rgba(255,255,255,.2)';ctx.stroke();
   ctx.save();ctx.translate(cx,cy);ctx.rotate(a+(i+.5)*slice);
   let size=n<=5?18:n<=10?14:n<=20?11:9;let txt=String(name),max=slice*135*.85;
   while(size>7){ctx.font='bold '+size+'px Arial';if(ctx.measureText(txt).width<=max)break;size--;}
   ctx.font='bold '+size+'px Arial';while(txt.length>2&&ctx.measureText(txt).width>max)txt=txt.slice(0,-2)+'…';
   ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.shadowColor='#000';ctx.shadowBlur=5;ctx.fillText(txt,120,0);ctx.restore();
  });
  ctx.beginPath();ctx.arc(cx,cy,12,0,Math.PI*2);ctx.fillStyle='#f5eaff';ctx.fill();
  $w('wokoWheelNick').textContent=under(a);
 }
 function count(){ $w('wokoWheelCount').textContent='Участников в колесе: '+pool.length; }
 function open(){pool=wokoPool();if(!pool.length){alert('Нет участников!');return;}clearTimeout(timeout);token++;spinning=false;winner=null;angle=0;modal.classList.add('open');$w('wokoWheelResult').textContent='Готово к запуску';$w('wokoWheelSpin').disabled=false;$w('wokoWheelConfirm').hidden=true;count();draw(0);}
 function close(){token++;spinning=false;clearTimeout(timeout);modal.classList.remove('open');}
 function setMode(m){if(spinning)return;mode=m;$w('wokoWheelElim').classList.toggle('active',m==='elimination');$w('wokoWheelNormal').classList.toggle('active',m==='normal');}
 function duration(){const e=$w('wokoWheelDuration');const v=Math.max(1,Math.min(30,parseInt(e.value,10)||5));e.value=v;return v;}
 function spin(){
  if(spinning||!pool.length)return;
  spinning=true;winner=null;$w('wokoWheelConfirm').hidden=true;$w('wokoWheelSpin').disabled=true;
  const local=++token,n=pool.length,idx=Math.floor(Math.random()*n),slice=Math.PI*2/n;
  const chosen=pool[idx],start=angle,turns=6+Math.floor(Math.random()*4);
  // Keep final sector center exactly under the top pointer.
  const targetBase=-Math.PI/2-(idx+.5)*slice;
  const travel=norm(start-targetBase)+turns*Math.PI*2;
  const end=start-travel,dur=duration()*1000,t0=performance.now();
  $w('wokoWheelResult').textContent='🎡 КРУТИМ...';
  function frame(now){if(local!==token||!modal.classList.contains('open'))return;
   const p=Math.min(1,(now-t0)/dur),ease=1-Math.pow(1-p,4);
   draw(start+(end-start)*ease);
   if(p<1){requestAnimationFrame(frame);return;}
   draw(end);spinning=false;$w('wokoWheelSpin').disabled=false;
   if(mode==='normal'){winner=chosen;$w('wokoWheelResult').textContent='🏆 Победитель: '+chosen;$w('wokoWheelConfirm').hidden=false;}
   else{pool.splice(idx,1);count();$w('wokoWheelResult').textContent='❌ Выбыл: '+chosen;
    if(pool.length===1){winner=pool[0];$w('wokoWheelResult').textContent='🏆 Последний оставшийся: '+winner;$w('wokoWheelConfirm').hidden=false;draw(-Math.PI/2-Math.PI);}
    else if(pool.length===0){$w('wokoWheelResult').textContent='Участники закончились';}
    else {draw(0);if($w('wokoWheelAuto').checked)timeout=setTimeout(()=>{if(local===token)spin();},950);}
   }
  }
  requestAnimationFrame(frame);
 }
 $w('wokoStandardBtn')?.addEventListener('click',open);
 $w('wokoWheelClose').addEventListener('click',close);
 modal.addEventListener('click',e=>{if(e.target===modal)close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close();});
 $w('wokoWheelNormal').addEventListener('click',()=>setMode('normal'));
 $w('wokoWheelElim').addEventListener('click',()=>setMode('elimination'));
 $w('wokoWheelMinus').addEventListener('click',()=>{$w('wokoWheelDuration').value=duration()-1;duration();});
 $w('wokoWheelPlus').addEventListener('click',()=>{$w('wokoWheelDuration').value=duration()+1;duration();});
 modal.querySelectorAll('[data-ww-duration]').forEach(b=>b.addEventListener('click',()=>{$w('wokoWheelDuration').value=b.dataset.wwDuration;}));
 $w('wokoWheelSpin').addEventListener('click',spin);
 $w('wokoWheelConfirm').addEventListener('click',()=>{if(!winner)return;const name=winner;close();wokoDisplayWinner(name);});
})();
