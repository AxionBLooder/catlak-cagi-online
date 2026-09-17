(function(){
'use strict';
if(window.__catlakGmLiveCompactV6)return;
window.__catlakGmLiveCompactV6=true;
['glc-style-v2','glc-style-v3','glc-style-v4','glc-style-v5'].forEach(id=>document.getElementById(id)?.remove());
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
  const label=String(b.textContent||'').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr-TR');
  if(label==='parti odası'&&b!==party)b.remove();
  if(label==='yönetim odası'&&b!==management)b.remove();
 });
 if(gm&&party&&gm.nextElementSibling!==party)gm.after(party);
 if(party&&management&&party.nextElementSibling!==management)party.after(management);
 else if(gm&&!party&&management&&gm.nextElementSibling!==management)gm.after(management);
 const native=nav.querySelector('[data-tab="characters"]');
 if(native){native.hidden=true;native.style.display='none';native.setAttribute('aria-hidden','true');native.setAttribute('tabindex','-1')}
}

function decorateLive(){
 const main=APP.querySelector('main[data-cc-simple-live="1"]');if(!main)return;
 const wrap=main.querySelector('.cc-live-two');if(!wrap)return;
 [...wrap.children].forEach((card,i)=>{
  if(!card.classList?.contains('card'))return;
  const text=String(card.textContent||'').toLocaleUpperCase('tr-TR');
  let kind='other';
  if(card.querySelector('.cc-simple-player')||/CANLI KARAKTER|OYUNCULAR/.test(text))kind='players';
  else if(card.querySelector('.cc-simple-roll')||/ATILAN ZAR|ZAR AKIŞI|SON ZAR/.test(text))kind='rolls';
  card.dataset.glcKind=kind;
  card.style.order=kind==='players'?'10':kind==='rolls'?'20':String(30+i);
 });
}

const st=document.createElement('style');st.id='glc-style-v6';st.textContent=`
#app.gmc-gm .nav [data-gmc-open]{order:10!important}
#app.gmc-gm .nav [data-prh-manager]{order:20!important}
#app.gmc-gm .nav [data-cc-management-room]{order:30!important}
#app.gmc-gm .nav [data-tab="gm"]{order:40!important}
#app.gmc-gm .nav [data-cc-map-tab]{order:50!important}
#app.gmc-gm .nav [data-cc-world-tab]{order:60!important}
#app.gmc-gm .nav [data-tab="rolls"]{order:70!important}
#app.gmc-gm .nav [data-tab="characters"]{display:none!important;order:900!important}
#app.gmc-gm [data-gmc-route="characters"],#app.gmc-gm [data-gm2-route="characters"]{display:none!important}

html body #app.gmc-gm main[data-cc-simple-live="1"]{max-width:940px!important;margin:0 auto!important;padding:14px 16px 30px!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-live-two{display:flex!important;flex-direction:column!important;gap:12px!important;max-width:760px!important;margin:8px auto 14px!important;align-items:stretch!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-live-two>.card{width:100%!important;height:auto!important;overflow:auto!important;margin:0!important;padding:12px 14px!important;border-radius:12px!important;border:1px solid #1d2d39!important;background:#060c12!important;background-image:none!important;box-shadow:0 10px 28px #0005!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-live-two>.card[data-glc-kind="players"]{max-height:280px!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-live-two>.card[data-glc-kind="rolls"]{max-height:340px!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-live-two .section-title{margin-bottom:8px!important;gap:8px!important;align-items:center!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-live-two h2{font-size:1rem!important;margin:0!important;color:#e7eef5!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-live-two .eyebrow{font-size:.62rem!important;letter-spacing:.11em!important;color:#7894a8!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-simple-player{padding:8px 9px!important;margin:0 0 6px!important;border:1px solid #182833!important;border-radius:9px!important;background:#09121a!important;line-height:1.15!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-simple-player:last-child{margin-bottom:0!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-simple-player b{font-size:.78rem!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-simple-player small{font-size:.64rem!important;color:#769082!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-simple-roll{display:grid!important;grid-template-columns:38px minmax(0,1fr) 46px!important;gap:8px!important;align-items:center!important;padding:7px 8px!important;min-height:34px!important;margin:0 0 5px!important;border:1px solid #172630!important;border-radius:9px!important;background:#09121a!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-simple-roll:last-child{margin-bottom:0!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-simple-total{font-size:.86rem!important;line-height:1!important;color:#d7b978!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-simple-roll b{font-size:.76rem!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-simple-roll span{font-size:.66rem!important;color:#74899b!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-simple-roll small{display:none!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-simple-roll button{min-height:24px!important;padding:4px 6px!important;font-size:.6rem!important;background:#191014!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-clear-rolls{padding:5px 8px!important;font-size:.62rem!important;min-height:26px!important;background:#1b1014!important;border-color:#492630!important}

html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-board{max-width:760px!important;margin:0 auto!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-columns{display:flex!important;flex-direction:column!important;gap:12px!important;align-items:stretch!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-col,html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-conditions{width:100%!important;max-height:none!important;overflow:visible!important;margin:0!important;padding:12px 14px!important;border-radius:12px!important;border:1px solid #1d2d39!important;background:#060c12!important;background-image:none!important;box-shadow:0 10px 28px #0005!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-toolbar{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-toolbar .wide{grid-column:1/-1!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-toolbar input,html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-toolbar select,html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-toolbar textarea{background:#070d13!important;border-color:#1a2935!important;padding:7px 8px!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-combatant{padding:8px!important;margin-top:6px!important;border-radius:9px!important;background:#09121a!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-actions{gap:5px!important;margin-top:6px!important}
html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-actions button,html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-toolbar button{padding:5px 7px!important;font-size:.66rem!important;min-height:28px!important}
@media(max-width:700px){html body #app.gmc-gm main[data-cc-simple-live="1"]{padding:8px!important}html body #app.gmc-gm main[data-cc-simple-live="1"] .cc-live-two,html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-board{max-width:none!important}html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-toolbar{grid-template-columns:1fr!important}html body #app.gmc-gm main[data-cc-simple-live="1"] .lcc-toolbar .wide{grid-column:auto!important}}
`;
document.head.appendChild(st);
cleanNav();decorateLive();
let q=false;function maintain(){q=false;cleanNav();decorateLive()}function schedule(){if(q)return;q=true;requestAnimationFrame(maintain)}
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
setTimeout(schedule,0);setTimeout(schedule,400);setTimeout(schedule,1200);
window.__catlakGmLiveCompact={maintain:schedule};
})();