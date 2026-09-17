(function(){
'use strict';
if(window.__catlakPlayerSheetBindFixV1)return;
window.__catlakPlayerSheetBindFixV1=true;
const APP=document.getElementById('app');if(!APP)return;
let busy=false,queued=false,lastKick=0,realtimeStarted=false;
const txt=e=>String(e?.textContent||'').trim();
const isPlayer=()=>{const r=txt(APP.querySelector('.role'));return !!r&&r!=='GM'};
const sheetButton=()=>APP.querySelector('.nav [data-tab="sheet"]');
const sheetActive=()=>isPlayer()&&!!sheetButton()?.classList.contains('on');
const sheetReady=()=>!!APP.querySelector('main .cc-character-stack section.hero,main section.hero [data-a="hp"][data-id]');
const oldPreserve=window.__catlakShouldPreserveCurrentView;
window.__catlakShouldPreserveCurrentView=function(){
 if(sheetActive())return false;
 try{return typeof oldPreserve==='function'?!!oldPreserve():false}catch(_){return false}
};
function refreshLayers(){
 try{window.__catlakPlayerSheetSupport?.refresh?.(true)}catch(_){}
 try{window.__catlakPlayerLiveTest?.refresh?.(true)}catch(_){}
 try{window.__catlakPlayerSheetEquipmentAbilitiesTest?.paint?.(true)}catch(_){}
 try{window.__catlakPlayerSheetTest?.apply?.()}catch(_){}
}
async function ownedCharacters(){
 const S=window.__catlakSupabase;if(!S)return[];
 const ses=(await S.auth.getSession()).data.session,user=ses?.user?.id;if(!user)return[];
 const r=await S.from('catlak_characters').select('id,name,owner_id,play_status,created_at').eq('owner_id',user).order('created_at',{ascending:true});
 if(r.error)throw r.error;return r.data||[];
}
async function repair(force=false){
 queued=false;if(!sheetActive())return false;
 if(sheetReady()){refreshLayers();return true}
 if(busy)return false;busy=true;
 try{
  const rows=await ownedCharacters();
  if(!sheetActive())return false;
  if(!rows.length)return false;
  const now=Date.now();
  if(force||now-lastKick>420){
   lastKick=now;
   const b=sheetButton();
   if(b){
    b.classList.add('on');
    b.click();
   }
  }
  [80,220,520,1000,1800].forEach(ms=>setTimeout(()=>{
   if(!sheetActive())return;
   if(sheetReady()){refreshLayers();return}
   if(ms===520||ms===1800){const b=sheetButton();if(b&&Date.now()-lastKick>380){lastKick=Date.now();b.click()}}
  },ms));
  return sheetReady();
 }catch(e){console.warn('CATLAK_PLAYER_SHEET_BIND',e);return false}finally{busy=false}
}
function schedule(force=false,delay=0){
 if(queued&&!force)return;queued=true;setTimeout(()=>repair(force),Math.max(0,delay));
}
window.addEventListener('click',e=>{const b=e.target?.closest?.('#app .nav [data-tab="sheet"]');if(b&&isPlayer()){schedule(true,40);setTimeout(()=>schedule(true,260),260)}},true);
window.addEventListener('catlak:data-refreshed',()=>{if(sheetActive())schedule(true,20)});
new MutationObserver(()=>{if(sheetActive()&&!sheetReady())schedule(false,60);else if(sheetActive())refreshLayers()}).observe(APP,{childList:true,subtree:true});
async function startRealtime(){
 if(realtimeStarted)return;
 for(let i=0;i<120&&!window.__catlakSupabase;i++)await new Promise(r=>setTimeout(r,50));
 const S=window.__catlakSupabase;if(!S||realtimeStarted)return;realtimeStarted=true;
 S.channel('cc-player-sheet-bind-fix').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{if(sheetActive())schedule(true,40)}).subscribe();
}
setTimeout(()=>schedule(true,120),120);setTimeout(()=>schedule(true,700),700);setTimeout(()=>schedule(true,1800),1800);startRealtime();
window.__catlakPlayerSheetBindFix={repair:()=>repair(true),ready:sheetReady};
})();