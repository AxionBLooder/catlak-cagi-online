(function(){
'use strict';
if(window.__catlakGmLiveCompactV11)return;
window.__catlakGmLiveCompactV11=true;
['glc-style-v2','glc-style-v3','glc-style-v4','glc-style-v5','glc-style-v6','glc-style-v7'].forEach(id=>document.getElementById(id)?.remove());
const APP=document.getElementById('app');if(!APP)return;

function cleanNav(){
 const nav=APP.querySelector('.nav');
 APP.querySelectorAll('[data-gmc-centerbar] [data-gmc-route="characters"],[data-gm2-centerbar] [data-gm2-route="characters"]').forEach(x=>x.remove());
 if(!nav)return;
 const gm=nav.querySelector('[data-gmc-open]');
 let party=nav.querySelector('[data-prh-manager]');
 let management=nav.querySelector('[data-cc-management-room]');
 nav.querySelectorAll('[data-prh-manager]').forEach(x=>{if(x!==party)x.remove()});
 nav.querySelectorAll('[data-cc-management-room]').forEach(x=>{if(x!==management)x.remove()});
 [...nav.querySelectorAll('button')].forEach(b=>{
  const label=String(b.textContent||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr-TR').replace(/^[^a-z0-9çğıöşü]+/i,'');
  if(label.includes('parti odası')&&b!==party)b.remove();
  if(label.includes('yönetim odası')&&b!==management)b.remove();
 });
 if(gm&&party&&gm.nextElementSibling!==party)gm.after(party);
 if(party&&management&&party.nextElementSibling!==management)party.after(management);
 else if(gm&&!party&&management&&gm.nextElementSibling!==management)gm.after(management);
 nav.querySelectorAll('[data-tab="characters"]').forEach(native=>native.remove())
}

function decorateLive(){
 const main=APP.querySelector('main[data-cc-simple-live="1"]');if(!main)return;
 [...main.children].forEach(el=>{
  if(!(el instanceof HTMLElement)||!el.matches('.card')||el.classList.contains('cc-party-show'))return;
  const tx=String(el.textContent||'').replace(/\s+/g,' ').trim();
  if(/CANLI OYUN MASASI/i.test(tx)&&/Oyuncular\s*&\s*Zarlar/i.test(tx))el.remove();
 });
 const wrap=main.querySelector('.cc-live-two');
 if(wrap)wrap.remove();
 main.querySelectorAll('[data-glc-kind="players"],[data-glc-kind="rolls"]').forEach(x=>x.remove());
 if(APP.querySelector('.nav [data-tab="gm"].on')&&!main.querySelector('[data-lcc-board]')){
   try{if(window.__catlakLiveCombatCenter?.restore?.())return}catch(_){}
   setTimeout(()=>{try{window.__catlakLiveCombatCenter?.render?.()}catch(_){}},0);
 }
}

const st=document.createElement('style');st.id='glc-style-v10';st.textContent=`
#app.gmc-gm .nav [data-gmc-open]{order:10!important}
#app.gmc-gm .nav [data-prh-manager]{order:20!important}
#app.gmc-gm .nav [data-cc-management-room]{order:30!important}
#app.gmc-gm .nav [data-tab="gm"]{order:40!important}
#app.gmc-gm .nav [data-cc-map-tab]{order:50!important}
#app.gmc-gm .nav [data-cc-world-tab]{order:60!important}
#app.gmc-gm .nav [data-tab="rolls"]{order:70!important}
#app.gmc-gm .nav [data-tab="characters"]{display:none!important;order:900!important}
#app.gmc-gm [data-gmc-route="characters"],#app.gmc-gm [data-gm2-route="characters"]{display:none!important}

html body #app main[data-cc-simple-live="1"]{max-width:1500px!important;margin:0 auto!important;padding:8px 16px 30px!important}
html body #app.gmc-gm:has(.nav [data-tab="gm"].on) main:has(.cc-live-two)>.card:not(.cc-party-show){display:none!important}
html body #app.gmc-gm:has(.nav [data-tab="gm"].on) main .cc-live-two{display:none!important}
html body #app main[data-cc-simple-live="1"] .cc-live-two{display:none!important}
html body #app main[data-cc-simple-live="1"] .cc-live-two>.card{width:100%!important;height:auto!important;overflow:auto!important;margin:0!important;padding:12px 14px!important;border-radius:12px!important;border:1px solid #1d2d39!important;background:#060c12!important;background-image:none!important;box-shadow:0 10px 28px #0005!important}
html body #app main[data-cc-simple-live="1"] .cc-live-two>.card[data-glc-kind="players"]{max-height:520px!important}
html body #app main[data-cc-simple-live="1"] .cc-live-two>.card[data-glc-kind="rolls"]{max-height:520px!important}
html body #app main[data-cc-simple-live="1"] .cc-live-two .section-title{margin-bottom:8px!important;gap:8px!important;align-items:center!important}
html body #app main[data-cc-simple-live="1"] .cc-live-two h2{font-size:1rem!important;margin:0!important;color:#e7eef5!important}
html body #app main[data-cc-simple-live="1"] .cc-live-two .eyebrow{font-size:.62rem!important;letter-spacing:.11em!important;color:#7894a8!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-player{padding:8px 9px!important;margin:0 0 6px!important;border:1px solid #182833!important;border-radius:9px!important;background:#09121a!important;line-height:1.15!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-player:last-child{margin-bottom:0!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-player b{font-size:.78rem!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-player small{font-size:.64rem!important;color:#769082!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-roll{display:grid!important;grid-template-columns:38px minmax(0,1fr) 46px!important;gap:8px!important;align-items:center!important;padding:7px 8px!important;min-height:34px!important;margin:0 0 5px!important;border:1px solid #172630!important;border-radius:9px!important;background:#09121a!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-roll:last-child{margin-bottom:0!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-total{font-size:.86rem!important;line-height:1!important;color:#d7b978!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-roll b{font-size:.76rem!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-roll span{font-size:.66rem!important;color:#74899b!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-roll small{display:none!important}
html body #app main[data-cc-simple-live="1"] .cc-simple-roll button{min-height:24px!important;padding:4px 6px!important;font-size:.6rem!important;background:#191014!important}
html body #app main[data-cc-simple-live="1"] .cc-clear-rolls{padding:5px 8px!important;font-size:.62rem!important;min-height:26px!important;background:#1b1014!important;border-color:#492630!important}

html body #app main[data-cc-simple-live="1"] .lcc-board{max-width:none!important;margin:0 auto!important;padding-top:0!important}
html body #app main[data-cc-simple-live="1"] .lcc-columns{display:grid!important;grid-template-columns:repeat(3,minmax(280px,1fr))!important;gap:14px!important;align-items:start!important}
html body #app main[data-cc-simple-live="1"] .lcc-col,html body #app main[data-cc-simple-live="1"] .lcc-conditions{width:100%!important;max-height:none!important;overflow:visible!important;margin:0!important;padding:12px 14px!important;border-radius:12px!important;border:1px solid #1d2d39!important;background:#060c12!important;background-image:none!important;box-shadow:0 10px 28px #0005!important}
html body #app main[data-cc-simple-live="1"] .lcc-toolbar{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
html body #app main[data-cc-simple-live="1"] .lcc-toolbar .wide{grid-column:1/-1!important}
html body #app main[data-cc-simple-live="1"] .lcc-toolbar input,html body #app main[data-cc-simple-live="1"] .lcc-toolbar select,html body #app main[data-cc-simple-live="1"] .lcc-toolbar textarea{background:#070d13!important;border-color:#1a2935!important;padding:7px 8px!important}
html body #app main[data-cc-simple-live="1"] .lcc-combatant{padding:8px!important;margin-top:6px!important;border-radius:9px!important;background:#09121a!important}
html body #app main[data-cc-simple-live="1"] .lcc-actions{gap:5px!important;margin-top:6px!important}
html body #app main[data-cc-simple-live="1"] .lcc-actions button,html body #app main[data-cc-simple-live="1"] .lcc-toolbar button{padding:5px 7px!important;font-size:.66rem!important;min-height:28px!important}
@media(max-width:1100px){html body #app main[data-cc-simple-live="1"] .lcc-columns{grid-template-columns:1fr 1fr!important}html body #app main[data-cc-simple-live="1"] .lcc-conditions{grid-column:1/-1!important}}
@media(max-width:760px){html body #app main[data-cc-simple-live="1"]{padding:8px!important}html body #app main[data-cc-simple-live="1"] .cc-live-two{grid-template-columns:1fr!important}html body #app main[data-cc-simple-live="1"] .lcc-columns{grid-template-columns:1fr!important}html body #app main[data-cc-simple-live="1"] .lcc-conditions{grid-column:auto!important}html body #app main[data-cc-simple-live="1"] .lcc-toolbar{grid-template-columns:1fr!important}html body #app main[data-cc-simple-live="1"] .lcc-toolbar .wide{grid-column:auto!important}}
`;
document.head.appendChild(st);
cleanNav();decorateLive();
let q=false;function maintain(){q=false;cleanNav();decorateLive()}function schedule(){if(q)return;q=true;requestAnimationFrame(maintain)}
new MutationObserver(rs=>{
 const nav=APP.querySelector('.nav'),main=APP.querySelector('main');
 const relevant=rs.some(r=>{
  if(r.target===APP||r.target===main)return true;
  if(nav&&(r.target===nav||nav.contains(r.target)))return true;
  return [...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('main,.nav,.role,.cc-live-two,[data-lcc-board]')||n.querySelector?.('main,.nav,.role,.cc-live-two,[data-lcc-board]')));
 });
 if(relevant)schedule();
}).observe(APP,{childList:true,subtree:true});
setTimeout(schedule,0);setTimeout(schedule,500);
window.__catlakGmLiveCompact={maintain:schedule};
})();