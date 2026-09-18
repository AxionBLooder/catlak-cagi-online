(function(){
'use strict';
if(window.__catlakPlayerSheetBindFixV4)return;
window.__catlakPlayerSheetBindFixV4=true;
const APP=document.getElementById('app');if(!APP)return;
let busy=false,queued=false,lastKick=0,realtimeStarted=false;
const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const mod=x=>Math.floor((num(x)-10)/2);
const fmt=x=>x>=0?'+'+x:String(x);
const isPlayer=()=>{const r=txt(APP.querySelector('.role'));return !!r&&r!=='GM'};
const sheetButton=()=>APP.querySelector('.nav [data-tab="sheet"]');
const sheetActive=()=>isPlayer()&&!!sheetButton()?.classList.contains('on');
const sheetReady=()=>!!APP.querySelector('main .cc-character-stack > section.hero');
const oldPreserve=window.__catlakShouldPreserveCurrentView;
window.__catlakShouldPreserveCurrentView=function(){
 if(sheetActive())return false;
 try{return typeof oldPreserve==='function'?!!oldPreserve():false}catch(_){return false}
};
function clearStaleDesk(){
 const main=APP.querySelector('main');if(!main||!sheetActive())return;
 if(!main.querySelector(':scope > .cc-character-stack section.hero'))delete main.dataset.ccDesk;
 delete main.dataset.ccPage;
 main.querySelectorAll(':scope > .cc-desk-intro').forEach(x=>{if(!main.querySelector(':scope > section.hero,:scope > .cc-character-stack section.hero'))x.remove()});
}
function bindRawHeroes(){
 if(!sheetActive())return false;
 const main=APP.querySelector('main');if(!main)return false;
 if(sheetReady())return true;
 const children=[...main.children];
 const heroIndexes=children.map((n,i)=>n.matches?.('section.hero')?i:-1).filter(i=>i>=0);
 if(!heroIndexes.length)return false;
 const intro=children.find(n=>n.classList?.contains('cc-desk-intro'))||null;
 const groups=[];
 for(let h=0;h<heroIndexes.length;h++){
  const start=heroIndexes[h],end=h+1<heroIndexes.length?heroIndexes[h+1]:children.length;
  groups.push(children.slice(start,end).filter(n=>n!==intro&&!n.classList?.contains('cc-desk-intro')));
 }
 groups.forEach((nodes,idx)=>{
  if(!nodes.length)return;
  const stack=document.createElement('div');stack.className='cc-character-stack';
  const label=document.createElement('div');label.className='cc-character-label';label.innerHTML=`<span>CANLI KARAKTER ${idx+1}</span><span>KARAKTER + ZAR + ENVANTER</span>`;stack.appendChild(label);
  nodes[0].before(stack);nodes.forEach(n=>stack.appendChild(n));
 });
 main.dataset.ccDesk='1';
 return sheetReady();
}
function refreshLayers(){
 bindRawHeroes();
 try{window.__catlakPlayerSheetTest?.apply?.()}catch(_){}
 try{window.__catlakPlayerSheetSupport?.refresh?.(true)}catch(_){}
 try{window.__catlakPlayerLiveTest?.refresh?.(true)}catch(_){}
 try{window.__catlakPlayerSheetEquipmentAbilitiesTest?.paint?.(true)}catch(_){}
}
async function ownedCharacters(full=false){
 const S=window.__catlakSupabase;if(!S)return[];
 const ses=(await S.auth.getSession()).data.session,user=ses?.user?.id;if(!user)return[];
 const fields=full?'*':'id,name,owner_id,play_status,created_at';
 const r=await S.from('catlak_characters').select(fields).eq('owner_id',user).order('created_at',{ascending:true});
 if(r.error)throw r.error;return r.data||[];
}
function kickNative(){
 const b=sheetButton();if(!b)return false;
 clearStaleDesk();
 const now=Date.now();if(now-lastKick<240)return false;
 lastKick=now;b.classList.add('on');b.click();return true;
}
function fallbackCard(c){
 const stats=c.base_stats||{},hpMax=num(c.hp_max),hpCur=num(c.hp_current),ac=num(c.base_ac),speed=num(c.base_speed),lv=Math.max(1,num(c.level)||1);
 return `<section class="card hero" data-cc-bind-fallback-hero="${esc(c.id)}"><div><div class="eyebrow">CANLI KARAKTER KAĞIDI</div><h1>${esc(c.name||'Karakter')}</h1><p>${esc(c.species_name||'-')} • ${esc(c.class_name||'-')} ${lv} • ${esc(c.background_name||'-')}</p></div><div class="vitals"><div class="vital"><span>HP</span><b>${hpCur}/${hpMax}</b><div class="row center"><button class="small" data-a="hp" data-id="${esc(c.id)}" data-d="-1">−</button><button class="small" data-a="hp" data-id="${esc(c.id)}" data-d="1">+</button></div></div><div class="vital"><span>AC</span><b>${ac}</b></div><div class="vital"><span>HIZ</span><b>${speed}</b></div><div class="vital"><span>SEVİYE</span><b>${lv}</b></div></div></section><section class="card"><div class="section-title"><div><div class="eyebrow">D20 TESTLERİ</div><h2>Statlar</h2></div></div><div class="stats">${['STR','DEX','CON','INT','WIS','CHA'].map(k=>`<button class="stat static" type="button" aria-disabled="true"><b>${k}</b><strong>${num(stats[k])}</strong><small>${fmt(mod(stats[k]))}</small></button>`).join('')}</div></section><section class="card"><div class="eyebrow">CANLI ENVANTER</div><div class="empty">Envanter yükleniyor…</div></section><section class="card"><div class="eyebrow">SON ZARLAR</div><div class="empty">Zarlar yükleniyor…</div></section>`;
}
async function renderFallback(){
 if(!sheetActive()||sheetReady())return false;
 const rows=await ownedCharacters(true);if(!rows.length||!sheetActive()||sheetReady())return false;
 const main=APP.querySelector('main');if(!main)return false;
 main.innerHTML=rows.map(fallbackCard).join('');
 delete main.dataset.ccDesk;delete main.dataset.ccPage;main.dataset.ccBindFallback='1';
 bindRawHeroes();refreshLayers();return sheetReady();
}
async function repair(force=false){
 queued=false;if(!sheetActive())return false;
 if(APP.querySelector('main[data-cc-hard-sheet="1"]')&&sheetReady())return true;
 if(bindRawHeroes()){refreshLayers();return true}
 if(busy)return false;busy=true;
 try{
  const rows=await ownedCharacters(false);if(!sheetActive())return false;
  if(!rows.length){clearStaleDesk();return false}
  clearStaleDesk();if(force||!APP.querySelector('main section.hero'))kickNative();
  const waits=[90,220,420,760,1200,1800];let prev=0;
  for(const ms of waits){await new Promise(r=>setTimeout(r,ms-prev));prev=ms;if(!sheetActive())return false;if(bindRawHeroes()){refreshLayers();return true}if(ms===420||ms===1200)kickNative()}
  return await renderFallback();
 }catch(e){console.warn('CATLAK_PLAYER_SHEET_BIND_V3',e);return false}finally{busy=false}
}
function schedule(force=false,delay=0){if(queued&&!force)return;queued=true;setTimeout(()=>repair(force),Math.max(0,delay))}
window.addEventListener('click',e=>{const b=e.target?.closest?.('#app .nav [data-tab="sheet"]');if(b&&isPlayer()){clearStaleDesk();schedule(true,35);setTimeout(()=>schedule(true,300),300);setTimeout(()=>schedule(true,1000),1000)}},true);
window.addEventListener('catlak:data-refreshed',()=>{if(!sheetActive())return;if(APP.querySelector('main[data-cc-hard-sheet="1"]')&&sheetReady())return;schedule(true,20)});
new MutationObserver(()=>{if(!sheetActive())return;if(APP.querySelector('main[data-cc-hard-sheet="1"]')&&sheetReady())return;if(bindRawHeroes())refreshLayers();else schedule(false,60)}).observe(APP,{childList:true,subtree:true});
async function startRealtime(){if(realtimeStarted)return;for(let i=0;i<120&&!window.__catlakSupabase;i++)await new Promise(r=>setTimeout(r,50));const S=window.__catlakSupabase;if(!S||realtimeStarted)return;realtimeStarted=true;S.channel('cc-player-sheet-bind-fix-v4').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{if(!sheetActive())return;if(APP.querySelector('main[data-cc-hard-sheet="1"]')&&sheetReady())return;schedule(true,30)}).subscribe()}
setTimeout(()=>schedule(true,100),100);setTimeout(()=>schedule(true,650),650);setTimeout(()=>schedule(true,1600),1600);setTimeout(()=>schedule(true,3000),3000);startRealtime();
window.__catlakPlayerSheetBindFix={repair:()=>repair(true),ready:sheetReady,bind:bindRawHeroes,fallback:renderFallback};
})();