(function(){
'use strict';
if(window.__catlakLiveGameEntryGuardV13)return;
window.__catlakLiveGameEntryGuardV13=true;
const APP=document.getElementById('app'),ROOT=document.documentElement;
if(!APP)return;
let liveFallback=0,liveRaf=0,initiativeBusy=false,playerFailsafe=0,queued=false,combatKick=0,liveStartedAt=0;
const oldStyle=document.getElementById('cc-live-entry-guard-style');if(oldStyle)oldStyle.remove();
const style=document.createElement('style');style.id='cc-live-entry-guard-style';style.textContent=`
html.cc-live-entry-pending #app main{visibility:hidden!important}
html body #app:has(.nav [data-tab="gm"].on) main:has(.cc-live-two)>.card:not(.cc-party-show){display:none!important}
html body #app:has(.nav [data-tab="gm"].on) main .cc-live-two{display:none!important}
html body #app main[data-cc-simple-live="1"]{max-width:1500px!important;margin:0 auto!important;padding:8px 16px 30px!important}
html body #app main[data-cc-simple-live="1"] .cc-live-two{display:none!important}
html body #app main[data-cc-simple-live="1"] .cc-live-two>.card{box-sizing:border-box!important;width:100%!important;margin:0!important;padding:12px 14px!important;height:auto!important;max-height:340px!important;overflow:auto!important;border-radius:12px!important;border:1px solid #1d2d39!important;background:#060c12!important;background-image:none!important;box-shadow:0 10px 28px #0005!important}
html body #app main[data-cc-simple-live="1"] .cc-live-two .section-title{margin-bottom:6px!important;gap:6px!important}
html body #app main[data-cc-simple-live="1"] .cc-live-two h2{font-size:.94rem!important;margin:.05em 0 .2em!important}
html body #app main[data-cc-simple-live="1"] .cc-live-two .eyebrow{font-size:.61rem!important}
html body #app main[data-cc-simple-live="1"] .cc-clear-rolls{padding:4px 7px!important;font-size:.6rem!important;min-height:24px!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-roll{display:grid!important;grid-template-columns:30px minmax(0,1fr) 40px!important;gap:5px!important;align-items:center!important;padding:4px 0!important;min-height:28px!important;border-bottom:1px solid var(--line)!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-total{font-size:.78rem!important;line-height:1!important;min-width:24px!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-roll b{font-size:.72rem!important;line-height:1.08!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-roll span{font-size:.64rem!important;line-height:1.08!important;color:var(--muted)!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-roll small{display:none!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-roll button{min-height:21px!important;padding:3px 5px!important;font-size:.58rem!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-player{padding:5px 0!important;line-height:1.1!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-player b{font-size:.72rem!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-player small{font-size:.59rem!important}
html body #app main[data-cc-simple-live="1"] label:has(#lcc-char-init){display:none!important}
html body #app main[data-cc-simple-live="1"] [data-cc-dex-init-note]{grid-column:1/-1;font-size:.66rem;color:var(--muted);padding:2px 0}
html body #app main[data-cc-simple-live="1"] .lcc-board{max-width:none!important;margin:0 auto!important}
html body #app main[data-cc-simple-live="1"] .lcc-columns{display:grid!important;grid-template-columns:repeat(3,minmax(280px,1fr))!important;gap:14px!important;align-items:start!important}
html body #app main[data-cc-simple-live="1"] .lcc-col,html body #app main[data-cc-simple-live="1"] .lcc-conditions{width:100%!important;padding:12px 14px!important;margin:0!important;max-height:none!important;overflow:visible!important;border-radius:12px!important;border:1px solid #1d2d39!important;background:#060c12!important;background-image:none!important;box-shadow:0 10px 28px #0005!important}
html body #app main[data-cc-simple-live="1"] .lcc-combatant{padding:6px!important;margin-top:5px!important}
html body #app main[data-cc-simple-live="1"] .lcc-actions{gap:4px!important;margin-top:5px!important}
html body #app main[data-cc-simple-live="1"] .lcc-actions button,#app main[data-cc-simple-live="1"] .lcc-toolbar button{padding:5px 7px!important;font-size:.68rem!important}
@media(max-width:1100px){html body #app main[data-cc-simple-live="1"] .lcc-columns{grid-template-columns:1fr 1fr!important}html body #app main[data-cc-simple-live="1"] .lcc-conditions{grid-column:1/-1!important}}
@media(max-width:760px){html body #app main[data-cc-simple-live="1"]{padding:8px!important}html body #app main[data-cc-simple-live="1"] .cc-live-two{grid-template-columns:1fr!important}html body #app main[data-cc-simple-live="1"] .lcc-columns{grid-template-columns:1fr!important}html body #app main[data-cc-simple-live="1"] .lcc-conditions{grid-column:auto!important}html body #app main[data-cc-simple-live="1"] .cc-live-two>.card{max-height:320px!important}}
`;
document.head.appendChild(style);
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const role=()=>String(APP.querySelector('.role')?.textContent||'').trim();
const isGM=()=>role()==='GM';
const isPlayer=()=>{const r=role();return !!r&&r!=='GM'};
const gmActive=()=>!!APP.querySelector('.nav [data-tab="gm"].on');
function toast(m){const t=document.getElementById('toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3600)}
function removeLiveHeading(){const main=APP.querySelector('main[data-cc-simple-live="1"]');if(!main)return;[...main.children].forEach(el=>{if(!(el instanceof HTMLElement)||!el.matches('.card'))return;const text=String(el.textContent||'').replace(/\s+/g,' ').trim();if(/CANLI OYUN MASASI/i.test(text)&&/Oyuncular\s*&\s*Zarlar/i.test(text))el.remove()})}
function combatExpected(){return !!window.__catlakLiveCombatCenter||!!document.querySelector('script[data-live-combat-center-runtime]')}
function decorateLive(){const main=APP.querySelector('main');if(!isGM()||!gmActive()||!main||main.dataset.ccSimpleLive!=='1')return false;removeLiveHeading();main.querySelector('.cc-live-two')?.remove();const input=main.querySelector('#lcc-char-init');if(input){const label=input.closest('label');if(label)label.style.display='none';const toolbar=input.closest('.lcc-toolbar');if(toolbar&&!toolbar.querySelector('[data-cc-dex-init-note]')){const n=document.createElement('div');n.dataset.ccDexInitNote='1';n.textContent='Oyuncu inisiyatifi otomatik: d20 + DEX bonusu';toolbar.appendChild(n)}}if(combatExpected()&&!main.querySelector('[data-lcc-board]')){clearTimeout(combatKick);combatKick=setTimeout(()=>{try{window.__catlakLiveCombatCenter?.render?.()}catch(_){}},35);return false}main.dataset.ccLiveV7Ready='1';return true}
function clearLivePending(){clearTimeout(liveFallback);liveFallback=0;if(liveRaf){cancelAnimationFrame(liveRaf);liveRaf=0}ROOT.classList.remove('cc-live-entry-pending')}
function watchLive(){
 if(!ROOT.classList.contains('cc-live-entry-pending'))return;
 if(!isGM()){clearLivePending();return}
 if(!gmActive()){
   if(Date.now()-liveStartedAt<900){liveRaf=requestAnimationFrame(watchLive);return}
   clearLivePending();return
 }
 if(decorateLive()){
   requestAnimationFrame(()=>requestAnimationFrame(()=>{if(decorateLive())clearLivePending()}));return
 }
 liveRaf=requestAnimationFrame(watchLive)
}
function beginLive(){
 if(!isGM())return;
 liveStartedAt=Date.now();
 clearTimeout(liveFallback);if(liveRaf)cancelAnimationFrame(liveRaf);
 APP.querySelector('main')?.removeAttribute('data-cc-live-v7-ready');
 ROOT.classList.add('cc-live-entry-pending');
 liveFallback=setTimeout(()=>{decorateLive();clearLivePending()},5000);
 liveRaf=requestAnimationFrame(watchLive)
}
async function getDex(characterId){const S=window.__catlakSupabase;if(!S)throw new Error('Veri bağlantısı hazır değil.');const r=await S.from('catlak_characters').select('id,name,base_stats').eq('id',characterId).maybeSingle();if(r.error)throw r.error;if(!r.data)throw new Error('Karakter bulunamadı.');const dex=num(r.data.base_stats?.DEX);return{name:r.data.name||'Karakter',dex,mod:Math.floor((dex-10)/2)}}
function rollDex(d){const die=1+Math.floor(Math.random()*20);return{die,total:die+d.mod}}
async function addCharacterWithDex(){if(initiativeBusy)return;initiativeBusy=true;try{const S=window.__catlakSupabase,cid=APP.querySelector('#lcc-add-char')?.value;if(!S||!cid)throw new Error('Eklenecek oyuncu yok.');const d=await getDex(cid),r=rollDex(d),q=await S.rpc('catlak_gm_combat_add_character',{p_character_id:cid,p_initiative:r.total});if(q.error)throw q.error;toast(`${d.name} • İnisiyatif ${r.total} (d20 ${r.die} ${d.mod>=0?'+':'−'} ${Math.abs(d.mod)} DEX)`);setTimeout(()=>window.__catlakLiveCombatCenter?.render?.(),20)}catch(e){toast('İnisiyatif hesaplanamadı: '+(e?.message||String(e)))}finally{initiativeBusy=false}}
async function rerollPlayerDex(id){if(initiativeBusy)return true;initiativeBusy=true;try{const S=window.__catlakSupabase;if(!S)throw new Error('Veri bağlantısı hazır değil.');const c=await S.from('catlak_combatants').select('id,kind,character_id').eq('id',id).maybeSingle();if(c.error)throw c.error;if(!c.data||c.data.kind!=='player'||!c.data.character_id)return false;const d=await getDex(c.data.character_id),r=rollDex(d),u=await S.from('catlak_combatants').update({initiative:r.total}).eq('id',id);if(u.error)throw u.error;toast(`${d.name} • İnisiyatif ${r.total} (d20 ${r.die} ${d.mod>=0?'+':'−'} ${Math.abs(d.mod)} DEX)`);setTimeout(()=>window.__catlakLiveCombatCenter?.render?.(),20);return true}catch(e){toast('İnisiyatif yenilenemedi: '+(e?.message||String(e)));return true}finally{initiativeBusy=false}}
function hardSheetOwned(){return APP.querySelector('main')?.dataset.ccHardSheet==='1'}
function refreshPlayerLayers(){if(hardSheetOwned())return;try{window.__catlakPlayerSheetSupport?.refresh?.(true)}catch(_){}try{window.__catlakPlayerLiveTest?.refresh?.(true)}catch(_){}try{window.__catlakPlayerSheetEquipmentAbilitiesTest?.paint?.(true)}catch(_){}try{window.__catlakPlayerSheetTest?.apply?.()}catch(_){}}
function playerSheetRepair(){if(!isPlayer()||hardSheetOwned())return;clearTimeout(playerFailsafe);const sheet=APP.querySelector('.nav [data-tab="sheet"]');if(!sheet)return;[90,320,850,1500].forEach(ms=>setTimeout(()=>{if(isPlayer()&&sheet.classList.contains('on')&&!hardSheetOwned())refreshPlayerLayers()},ms));playerFailsafe=setTimeout(()=>{ROOT.classList.remove('cc-player-critical-pending','pptf-player-prep');if(!hardSheetOwned())refreshPlayerLayers()},3000)}
function maintain(){queued=false;if(isGM()&&gmActive())decorateLive();if(isPlayer()&&APP.querySelector('.nav [data-tab="sheet"].on')&&!hardSheetOwned())refreshPlayerLayers()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(maintain)}
window.addEventListener('pointerdown',e=>{if(e.button!=null&&e.button!==0)return;const gm=e.target?.closest?.('#app .nav [data-tab="gm"]');if(gm&&isGM())beginLive()},true);
window.addEventListener('click',e=>{const gm=e.target?.closest?.('#app .nav [data-tab="gm"]');if(gm&&isGM()){beginLive();return}const add=e.target?.closest?.('[data-lcc-add-char]');if(add&&isGM()){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();addCharacterWithDex();return}const ini=e.target?.closest?.('[data-lcc-init]');if(ini&&isGM()){const S=window.__catlakSupabase,id=ini.dataset.lccInit;if(S&&id){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();(async()=>{const c=await S.from('catlak_combatants').select('id,kind').eq('id',id).maybeSingle();if(c.error){toast(c.error.message);return}if(c.data?.kind==='player')await rerollPlayerDex(id);else{const r=await S.rpc('catlak_gm_combat_roll_initiative',{p_combatant_id:id});if(r.error)toast(r.error.message);else{toast('İnisiyatif: '+r.data);setTimeout(()=>window.__catlakLiveCombatCenter?.render?.(),20)}}})();return}}const sheet=e.target?.closest?.('#app .nav [data-tab="sheet"]');if(sheet&&isPlayer()){playerSheetRepair();return}const nav=e.target?.closest?.('#app .nav button');if(nav&&isGM()&&!nav.matches('[data-tab="gm"]'))clearLivePending()},true);
new MutationObserver(()=>{schedule();if(ROOT.classList.contains('cc-live-entry-pending')){if(!isGM()||!gmActive())clearLivePending();else decorateLive()}}).observe(APP,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-cc-simple-live']});
setTimeout(()=>{if(isGM()&&gmActive())beginLive();schedule()},0);setTimeout(schedule,400);setTimeout(schedule,1200);
window.__catlakLiveGameEntryGuard={begin:beginLive,clear:clearLivePending,ready:decorateLive,repairPlayerSheet:playerSheetRepair,maintain:schedule};
})();