(function(){
'use strict';
if(window.__catlakGmNavCanonicalV2)return;
window.__catlakGmNavCanonicalV2=true;
const APP=document.getElementById('app');if(!APP)return;
let queued=false;
const norm=x=>String(x?.textContent||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr-TR').replace(/^[^a-z0-9çğıöşü]+/i,'');
const isGM=()=>String(APP.querySelector('.role')?.textContent||'').trim()==='GM';
function clean(){
 queued=false;
 if(!isGM())return;
 const nav=APP.querySelector('.nav');if(!nav)return;
 let gm=nav.querySelector('[data-gmc-open]');
 let party=nav.querySelector('[data-prh-manager]');
 let management=[...nav.querySelectorAll('[data-cc-management-room]')].find(x=>x.previousElementSibling?.matches?.('[data-prh-manager]'))||nav.querySelector('[data-cc-management-room]');
 const managementLike=[...nav.querySelectorAll('button')].filter(b=>norm(b).includes('yönetim odası'));
 if(!management){
   management=managementLike.find(b=>b.matches('[data-cc-management-room]'))||null;
 }
 managementLike.forEach(b=>{if(b!==management)b.remove()});
 nav.querySelectorAll('[data-tab="characters"],[data-gmc-route="characters"],[data-gm2-route="characters"]').forEach(x=>x.remove());
 if(management){
   management.dataset.ccManagementRoom='1';
   management.textContent='Yönetim Odası';
 }
 if(gm&&nav.firstElementChild!==gm)nav.prepend(gm);
 if(gm&&party&&gm.nextElementSibling!==party)gm.after(party);
 if(party&&management&&party.nextElementSibling!==management)party.after(management);
 else if(gm&&!party&&management&&gm.nextElementSibling!==management)gm.after(management);
 const live=nav.querySelector('[data-tab="gm"]'),rolls=nav.querySelector('[data-tab="rolls"]');
 if(live&&rolls&&live.nextElementSibling!==rolls)live.after(rolls);
 if(rolls)rolls.textContent='Zar Akışı';
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(clean)}
new MutationObserver(rs=>{
 const nav=APP.querySelector('.nav');
 if(rs.some(r=>{
   if(r.type!=='childList')return false;
   if(nav&&(r.target===nav||nav.contains(r.target)))return true;
   return [...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.nav,.role')||n.querySelector?.('.nav,.role')));
 }))schedule();
}).observe(APP,{childList:true,subtree:true});
setTimeout(schedule,0);setTimeout(schedule,250);setTimeout(schedule,800);setTimeout(schedule,1800);
window.__catlakGmNavCanonical={maintain:schedule};
})();