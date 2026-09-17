(function(){
'use strict';
if(window.__catlakPlayerSheetBindFixV2)return;
window.__catlakPlayerSheetBindFixV2=true;
const APP=document.getElementById('app');if(!APP)return;
let busy=false,queued=false,lastKick=0,realtimeStarted=false,repairGen=0;
const txt=e=>String(e?.textContent||'').trim();
const isPlayer=()=>{const r=txt(APP.querySelector('.role'));return !!r&&r!=='GM'};
const sheetButton=()=>APP.querySelector('.nav [data-tab="sheet"]');
const sheetActive=()=>isPlayer()&&!!sheetButton()?.classList.contains('on');
const rawHeroes=()=>[...APP.querySelectorAll('main > section.hero,main > .cc-character-stack > section.hero')];
const boundHeroes=()=>[...APP.querySelectorAll('main .cc-character-stack > section.hero')];
const sheetReady=()=>boundHeroes().length>0;
const oldPreserve=window.__catlakShouldPreserveCurrentView;
window.__catlakShouldPreserveCurrentView=function(){
 if(sheetActive())return false;
 try{return typeof oldPreserve==='function'?!!oldPreserve():false}catch(_){return false}
};
function clearStaleDesk(){
 const main=APP.querySelector('main');if(!main)return;
 if(sheetActive()){
  delete main.dataset.ccDesk;
  delete main.dataset.ccPage;
  main.querySelectorAll(':scope > .cc-desk-intro').forEach(x=>{if(!main.querySelector(':scope > section.hero,:scope > .cc-character-stack section.hero'))x.remove()});
 }
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
 for(const nodes of groups){
  if(!nodes.length)continue;
  const stack=document.createElement('div');stack.className='cc-character-stack';
  const label=document.createElement('div');label.className='cc-character-label';label.innerHTML='<span>CANLI KARAKTER</span><span>KARAKTER + ZAR + ENVANTER</span>';stack.appendChild(label);
  nodes[0].before(stack);nodes.forEach(n=>stack.appendChild(n));
 }
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
async function ownedCharacters(){
 const S=window.__catlakSupabase;if(!S)return[];
 const ses=(await S.auth.getSession()).data.session,user=ses?.user?.id;if(!user)return[];
 const r=await S.from('catlak_characters').select('id,name,owner_id,play_status,created_at').eq('owner_id',user).order('created_at',{ascending:true});
 if(r.error)throw r.error;return r.data||[];
}
function kickNative(){
 const b=sheetButton();if(!b)return false;
 clearStaleDesk();
 const now=Date.now();if(now-lastKick<220)return false;
 lastKick=now;
 b.classList.add('on');
 b.click();
 return true;
}
async function repair(force=false){
 queued=false;if(!sheetActive())return false;
 const gen=++repairGen;
 if(bindRawHeroes()){refreshLayers();return true}
 if(busy)return false;busy=true;
 try{
  const rows=await ownedCharacters();
  if(gen!==repairGen||!sheetActive())return false;
  if(!rows.length){clearStaleDesk();return false}
  clearStaleDesk();
  if(force||!rawHeroes().length)kickNative();
  const waits=[70,180,360,650,1000,1500,2300];
  for(const ms of waits){
   await new Promise(r=>setTimeout(r,ms===70?70:Math.max(40,ms-(waits[waits.indexOf(ms)-1]||0))));
   if(gen!==repairGen||!sheetActive())return false;
   if(bindRawHeroes()){refreshLayers();return true}
   if(ms===360||ms===1000||ms===2300)kickNative();
  }
  return false;
 }catch(e){console.warn('CATLAK_PLAYER_SHEET_BIND_V2',e);return false}finally{busy=false}
}
function schedule(force=false,delay=0){
 if(queued&&!force)return;queued=true;setTimeout(()=>repair(force),Math.max(0,delay));
}
window.addEventListener('click',e=>{
 const b=e.target?.closest?.('#app .nav [data-tab="sheet"]');
 if(b&&isPlayer()){
  clearStaleDesk();
  schedule(true,35);setTimeout(()=>schedule(true,260),260);setTimeout(()=>schedule(true,900),900);
 }
},true);
window.addEventListener('catlak:data-refreshed',()=>{if(sheetActive())schedule(true,15)});
new MutationObserver(()=>{
 if(!sheetActive())return;
 if(bindRawHeroes())refreshLayers();else schedule(false,45);
}).observe(APP,{childList:true,subtree:true});
async function startRealtime(){
 if(realtimeStarted)return;
 for(let i=0;i<120&&!window.__catlakSupabase;i++)await new Promise(r=>setTimeout(r,50));
 const S=window.__catlakSupabase;if(!S||realtimeStarted)return;realtimeStarted=true;
 S.channel('cc-player-sheet-bind-fix-v2').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{if(sheetActive())schedule(true,25)}).subscribe();
}
setTimeout(()=>schedule(true,100),100);setTimeout(()=>schedule(true,550),550);setTimeout(()=>schedule(true,1400),1400);setTimeout(()=>schedule(true,2800),2800);startRealtime();
window.__catlakPlayerSheetBindFix={repair:()=>repair(true),ready:sheetReady,bind:bindRawHeroes};
})();