(function(){
'use strict';
if(window.__catlakPlayerPortalV3)return;
window.__catlakPlayerPortalV3=true;
const APP=document.querySelector('#app');
const S=window.__catlakSupabase;
if(!APP||!S)return;
const HTML=document.documentElement;
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const hasRole=()=>!!APP.querySelector('.role');
const isPlayer=()=>hasRole()&&!isGM();
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3200)};
let scheduled=false,forcing=false,lastSheetClick=0;

if(!document.querySelector('#cc-player-portal-v3-style')){
  const st=document.createElement('style');st.id='cc-player-portal-v3-style';st.textContent=`
html.cc-player-portal #app .nav{display:none!important}
html.cc-player-portal #app .top{position:sticky!important;top:0!important;z-index:40!important;border-bottom:1px solid #3a4550!important;background:#111820f2!important}
html.cc-player-portal #app .top .role{display:none!important}
html.cc-player-portal #app .top .brand .mini{display:none!important}
html.cc-player-portal #app .top .brand b:after{content:' · Karakter Kağıdı';font-weight:500;color:#9ca8b2}
html.cc-player-portal #app .top [data-a="logout"]{display:none!important}
.ccp-exit{border:1px solid #59646e!important;background:#1a222a!important;color:#f2f4f5!important;border-radius:7px!important;padding:7px 12px!important;font-weight:800!important}
html.cc-player-portal #app main{margin-top:14px!important}
html.cc-player-portal #app main:not(.ccbv-ready):not(.auth):not([data-cc-refresh-error]):not([data-cc-auth-loading]){visibility:hidden!important}
html.cc-player-portal #app [data-tab="builder"],html.cc-player-portal #app [data-a="create"]{display:none!important}
html.cc-invite-only [data-a="guestinvite"]{display:none!important}

#app main.ps-player-sheet.ccbv-sheet{width:min(1540px,calc(100% - 22px))!important;max-width:1540px!important;margin:16px auto 70px!important;padding:0!important;--ccb-paper:#f4f0e8;--ccb-paper2:#ebe5da;--ccb-ink:#202327;--ccb-muted:#6d747a;--ccb-line:#b74a4a;--ccb-dark:#222b31;--ccb-accent:#a82f35;--ccb-soft:#d8cec0}
#app main.ps-player-sheet.ccbv-sheet>.cc-desk-intro{display:none!important}
#app main.ps-player-sheet.ccbv-sheet .cc-character-stack{padding:0!important;margin:0 0 18px!important;border:0!important;background:transparent!important;box-shadow:none!important}
#app main.ps-player-sheet.ccbv-sheet .ps-sheet-grid{display:grid!important;grid-template-columns:minmax(230px,.72fr) minmax(270px,.86fr) minmax(430px,1.55fr)!important;gap:11px!important;align-items:start!important}
#app main.ps-player-sheet.ccbv-sheet .ps-main-column,#app main.ps-player-sheet.ccbv-sheet .ps-side-column,#app main.ps-player-sheet.ccbv-sheet .ps-detail-column{display:contents!important}
#app main.ps-player-sheet.ccbv-sheet .card{margin:0!important;border:1px solid #b55b5b!important;border-radius:8px!important;background:linear-gradient(180deg,var(--ccb-paper),var(--ccb-paper2))!important;color:var(--ccb-ink)!important;box-shadow:0 7px 24px #0003!important;padding:13px!important;min-width:0!important}
#app main.ps-player-sheet.ccbv-sheet .card h1,#app main.ps-player-sheet.ccbv-sheet .card h2,#app main.ps-player-sheet.ccbv-sheet .card h3,#app main.ps-player-sheet.ccbv-sheet .card h4{color:var(--ccb-ink)!important}
#app main.ps-player-sheet.ccbv-sheet .card p,#app main.ps-player-sheet.ccbv-sheet .card li,#app main.ps-player-sheet.ccbv-sheet .card span:not(.tag):not(.live){color:var(--ccb-ink)}
#app main.ps-player-sheet.ccbv-sheet .muted,#app main.ps-player-sheet.ccbv-sheet small{color:var(--ccb-muted)!important}
#app main.ps-player-sheet.ccbv-sheet .eyebrow,#app main.ps-player-sheet.ccbv-sheet .section-title .eyebrow{color:var(--ccb-accent)!important;font-weight:950!important;letter-spacing:.11em!important}
#app main.ps-player-sheet.ccbv-sheet section.hero{grid-column:1/-1!important;display:grid!important;grid-template-columns:minmax(220px,1fr) minmax(520px,1.65fr)!important;gap:14px!important;align-items:center!important;padding:13px 16px!important;background:linear-gradient(100deg,#20282e,#131a1f)!important;border-color:#8e2c31!important;color:#f5f3ee!important;border-radius:8px!important}
#app main.ps-player-sheet.ccbv-sheet section.hero h1{font-size:clamp(1.65rem,3vw,2.55rem)!important;color:#fff!important;margin:.08em 0 .1em!important}
#app main.ps-player-sheet.ccbv-sheet section.hero p,#app main.ps-player-sheet.ccbv-sheet section.hero .eyebrow{color:#d8dde0!important}
#app main.ps-player-sheet.ccbv-sheet section.hero .vitals{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(82px,1fr))!important;gap:7px!important;width:100%!important;min-width:0!important}
#app main.ps-player-sheet.ccbv-sheet section.hero .vital{min-width:0!important;background:#f8f6f1!important;border:2px solid #ae3b42!important;border-radius:8px!important;color:#1d2023!important;padding:8px 6px!important;box-shadow:none!important}
#app main.ps-player-sheet.ccbv-sheet section.hero .vital span{font-size:.57rem!important;letter-spacing:.08em!important;color:#6c7074!important;font-weight:900!important}
#app main.ps-player-sheet.ccbv-sheet section.hero .vital b{font-size:1.28rem!important;color:#202326!important}
#app main.ps-player-sheet.ccbv-sheet section.hero .vital .row{justify-content:center!important;gap:4px!important;margin-top:4px!important}
#app main.ps-player-sheet.ccbv-sheet section.hero .vital button{padding:3px 7px!important;min-height:0!important;border-radius:5px!important}

#app main.ps-player-sheet.ccbv-sheet .ps-stat-card{grid-column:1!important;grid-row:auto!important;padding:11px!important}
#app main.ps-player-sheet.ccbv-sheet .ps-stat-card .section-title{display:block!important;margin-bottom:8px!important}
#app main.ps-player-sheet.ccbv-sheet .ps-stat-card .section-title .live{float:right!important}
#app main.ps-player-sheet.ccbv-sheet .stats{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
#app main.ps-player-sheet.ccbv-sheet .stat{min-height:82px!important;padding:8px 6px!important;background:#faf8f3!important;border:1px solid #9a9a96!important;border-radius:7px!important;color:#1e2225!important;box-shadow:none!important}
#app main.ps-player-sheet.ccbv-sheet .stat b{color:#6f2529!important;font-size:.64rem!important}
#app main.ps-player-sheet.ccbv-sheet .stat strong{font-size:1.45rem!important;color:#222!important}
#app main.ps-player-sheet.ccbv-sheet .stat small{font-size:.66rem!important;color:#62676b!important}

#app main.ps-player-sheet.ccbv-sheet [data-gmt-player-panel]{grid-column:2!important;background:linear-gradient(180deg,#f0ebe1,#e5ded2)!important}
#app main.ps-player-sheet.ccbv-sheet [data-gmt-player-panel] .gmt-player-two{display:flex!important;flex-direction:column!important;gap:8px!important}
#app main.ps-player-sheet.ccbv-sheet [data-gmt-player-panel] .gmt-player-two>div{border:1px solid #aaa49b!important;border-radius:7px!important;background:#faf7f0!important;padding:10px!important}
#app main.ps-player-sheet.ccbv-sheet [data-gmt-player-panel] .gmt-slot{border:1px solid #a59f96!important;background:#f7f3ec!important;color:#23272a!important;border-radius:6px!important}
#app main.ps-player-sheet.ccbv-sheet [data-gmt-player-panel] .gmt-slot b{color:#762c30!important}
#app main.ps-player-sheet.ccbv-sheet .psea-ability{background:#f8f4ed!important;border-color:#aaa49b!important;color:#24272a!important}
#app main.ps-player-sheet.ccbv-sheet .psea-ability-type{color:#7b3035!important}

#app main.ps-player-sheet.ccbv-sheet .ps-kp-vital{background:#f8f2f1!important;border-color:#8d2530!important}
#app main.ps-player-sheet.ccbv-sheet section.vampire.ps-lore-card{grid-column:2!important;background:linear-gradient(180deg,#efe2e3,#e4d6d7)!important;border-color:#8e343b!important}
#app main.ps-player-sheet.ccbv-sheet section.vampire.ps-lore-card .three{grid-template-columns:1fr!important;gap:7px!important}
#app main.ps-player-sheet.ccbv-sheet section.vampire.ps-lore-card details{background:#f7eeee!important;border-color:#a66a6e!important;color:#242426!important}

.ccbv-tabs{grid-column:3!important;display:flex!important;gap:5px!important;align-items:center!important;overflow:auto!important;padding:7px!important;border:1px solid #a54045!important;border-radius:8px!important;background:#20282e!important;box-shadow:0 7px 24px #0003!important}
.ccbv-tabs button{flex:0 0 auto!important;background:transparent!important;color:#dfe3e5!important;border:1px solid transparent!important;border-radius:5px!important;padding:7px 10px!important;font-size:.75rem!important;font-weight:900!important}
.ccbv-tabs button.on{background:#f4f0e8!important;color:#74292e!important;border-color:#b14b51!important}
#app main.ps-player-sheet.ccbv-sheet [data-ccbv-panel]{grid-column:3!important}
#app main.ps-player-sheet.ccbv-sheet [data-ccbv-panel]:not([data-ccbv-visible="1"]){display:none!important}
#app main.ps-player-sheet.ccbv-sheet .ps-inventory-card .iw-player-grid,#app main.ps-player-sheet.ccbv-sheet .ps-race-powers-card>.grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
#app main.ps-player-sheet.ccbv-sheet .iw-player-item,#app main.ps-player-sheet.ccbv-sheet .power,#app main.ps-player-sheet.ccbv-sheet .roll{background:#fbf8f2!important;border-color:#aaa49b!important;color:#202326!important;border-radius:7px!important;box-shadow:none!important}
#app main.ps-player-sheet.ccbv-sheet .iw-player-item.on{border-color:#6d7f63!important;background:#f1f5ed!important}
#app main.ps-player-sheet.ccbv-sheet .tag{background:#e7dfd2!important;color:#6f272c!important;border-color:#b69787!important}
#app main.ps-player-sheet.ccbv-sheet .actions button,#app main.ps-player-sheet.ccbv-sheet .ws-slot-controls button{background:#2b3339!important;color:#f7f7f4!important;border:1px solid #596269!important;border-radius:6px!important;min-height:34px!important}
#app main.ps-player-sheet.ccbv-sheet .actions button.primary{background:#8f3036!important;border-color:#a93f46!important}
#app main.ps-player-sheet.ccbv-sheet .actions button:hover,#app main.ps-player-sheet.ccbv-sheet .ws-slot-controls button:hover{background:#414b52!important;border-color:#747e85!important}
#app main.ps-player-sheet.ccbv-sheet .roll .die{background:#303940!important;color:#fff!important;border-color:#8e343b!important;border-radius:6px!important}
#app main.ps-player-sheet.ccbv-sheet .note{background:#efe4d1!important;border-color:#b49c70!important;color:#292722!important}
#app main.ps-player-sheet.ccbv-sheet .cc-player-gm-note{background:#efe8dc!important;border-color:#a5957d!important}
#app main.ps-player-sheet.ccbv-sheet [data-cc-party-visual-card] img{max-height:320px!important;min-height:0!important;object-fit:contain!important;background:#201f1d!important}
#app main.ps-player-sheet.ccbv-sheet .ps-detail-column>.ps-lore-card:not(.vampire){grid-column:3!important}
#app main.ps-player-sheet.ccbv-sheet .ccbv-no-character{grid-column:1/-1!important;padding:34px!important;text-align:center!important}

@media(max-width:1120px){#app main.ps-player-sheet.ccbv-sheet .ps-sheet-grid{grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr)!important}.ccbv-tabs,#app main.ps-player-sheet.ccbv-sheet [data-ccbv-panel]{grid-column:2!important}#app main.ps-player-sheet.ccbv-sheet [data-gmt-player-panel],#app main.ps-player-sheet.ccbv-sheet section.vampire.ps-lore-card{grid-column:1!important}#app main.ps-player-sheet.ccbv-sheet section.hero{grid-column:1/-1!important;grid-template-columns:1fr!important}}
@media(max-width:760px){#app main.ps-player-sheet.ccbv-sheet{width:calc(100% - 10px)!important;margin-top:8px!important}#app main.ps-player-sheet.ccbv-sheet .ps-sheet-grid{grid-template-columns:1fr!important}.ccbv-tabs,#app main.ps-player-sheet.ccbv-sheet [data-ccbv-panel],#app main.ps-player-sheet.ccbv-sheet [data-gmt-player-panel],#app main.ps-player-sheet.ccbv-sheet section.vampire.ps-lore-card,#app main.ps-player-sheet.ccbv-sheet .ps-stat-card{grid-column:1!important}#app main.ps-player-sheet.ccbv-sheet section.hero{grid-column:1!important}#app main.ps-player-sheet.ccbv-sheet .stats{grid-template-columns:repeat(3,minmax(0,1fr))!important}#app main.ps-player-sheet.ccbv-sheet .ps-inventory-card .iw-player-grid,#app main.ps-player-sheet.ccbv-sheet .ps-race-powers-card>.grid{grid-template-columns:1fr!important}}
@media(max-width:480px){#app main.ps-player-sheet.ccbv-sheet .stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}#app main.ps-player-sheet.ccbv-sheet section.hero .vitals{grid-template-columns:repeat(2,minmax(0,1fr))!important}.ccbv-tabs{padding:5px!important}}
  `;document.head.appendChild(st)
}

function stop(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}
function ensureExit(){
  if(!isPlayer())return;
  const top=APP.querySelector('.top');if(!top||top.querySelector('[data-ccp-exit]'))return;
  const row=top.querySelector(':scope > .row')||top;
  const b=document.createElement('button');b.type='button';b.className='ccp-exit';b.dataset.ccpExit='1';b.textContent='Çıkış';row.appendChild(b)
}
function forceSheet(){
  if(!isPlayer()||forcing)return;
  const btn=APP.querySelector('.nav [data-tab="sheet"]');if(!btn)return;
  const on=APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
  if(on==='sheet')return;
  const now=Date.now();if(now-lastSheetClick<450)return;
  forcing=true;lastSheetClick=now;try{btn.click()}finally{setTimeout(()=>{forcing=false},80)}
}
function fixNoCharacter(){
  if(!isPlayer())return;
  const main=APP.querySelector('main');if(!main||main.classList.contains('auth'))return;
  const builderButtons=[...main.querySelectorAll('[data-tab="builder"],[data-a="create"]')];
  const empty=[...main.querySelectorAll('.card.empty,.empty')].find(x=>/Henüz karakterin yok|Karakter Oluştur/i.test(txt(x)));
  builderButtons.forEach(x=>x.remove());
  if(empty&&!empty.dataset.ccpNoCharacter){empty.dataset.ccpNoCharacter='1';empty.classList.add('ccbv-no-character');empty.innerHTML='<div class="eyebrow">DAVET BEKLENİYOR</div><h2>Bu hesaba bağlı karakter yok</h2><p>Karakteri GM oluşturur. Sana gönderilen karakter davet bağlantısını açtığında kağıdın burada otomatik görünür.</p>'}
}
function eye(sec){return txt(sec?.querySelector(':scope > .eyebrow,:scope > .section-title .eyebrow'))}
function markPanels(stack){
  if(!stack)return;
  const cards=[...stack.querySelectorAll('section.card')];
  for(const sec of cards){
    delete sec.dataset.ccbvPanel;delete sec.dataset.ccbvVisible;
    if(sec.matches('section.hero')||sec.classList.contains('ps-stat-card')||sec.hasAttribute('data-gmt-player-panel')||sec.matches('section.vampire.ps-lore-card'))continue;
    if(sec.hasAttribute('data-ps-combat-card'))sec.dataset.ccbvPanel='actions';
    else if(sec.classList.contains('ps-roll-card')||eye(sec)==='SON ZARLAR')sec.dataset.ccbvPanel='actions';
    else if(sec.classList.contains('ps-inventory-card')||eye(sec)==='CANLI ENVANTER')sec.dataset.ccbvPanel='inventory';
    else if(sec.classList.contains('ps-race-powers-card')||eye(sec)==='IRK GÜÇLERİ'||eye(sec)==='ÖZEL YOL')sec.dataset.ccbvPanel='features';
    else if(sec.hasAttribute('data-cc-player-note-for')||sec.hasAttribute('data-cc-party-visual-card'))sec.dataset.ccbvPanel='notes';
    else if(sec.classList.contains('ps-lore-card'))sec.dataset.ccbvPanel='features';
    else sec.dataset.ccbvPanel='notes'
  }
}
function ensureTabs(stack){
  const grid=stack?.querySelector(':scope > .ps-sheet-grid');if(!grid)return null;
  let tabs=grid.querySelector(':scope > [data-ccbv-tabs]');
  if(!tabs){tabs=document.createElement('div');tabs.className='ccbv-tabs';tabs.dataset.ccbvTabs='1';tabs.innerHTML='<button type="button" data-ccbv-tab="actions">Aksiyonlar</button><button type="button" data-ccbv-tab="inventory">Envanter</button><button type="button" data-ccbv-tab="features">Özellikler</button><button type="button" data-ccbv-tab="notes">Notlar</button>';grid.insertBefore(tabs,grid.firstChild)}
  return tabs
}
function paintTab(stack){
  const tab=stack.dataset.ccbvTab||'actions';
  const tabs=ensureTabs(stack);if(!tabs)return;
  tabs.querySelectorAll('[data-ccbv-tab]').forEach(b=>b.classList.toggle('on',b.dataset.ccbvTab===tab));
  stack.querySelectorAll('[data-ccbv-panel]').forEach(sec=>sec.dataset.ccbvVisible=sec.dataset.ccbvPanel===tab?'1':'0')
}
function applyBeyond(){
  if(!isPlayer())return;
  const main=APP.querySelector('main');if(!main||main.classList.contains('auth')||main.hasAttribute('data-cc-auth-loading')||main.hasAttribute('data-cc-refresh-error'))return;
  if(!main.classList.contains('ps-player-sheet')){fixNoCharacter();main.classList.add('ccbv-ready');return}
  main.classList.add('ccbv-sheet');
  const stacks=[...main.querySelectorAll('.cc-character-stack')];
  if(!stacks.length){fixNoCharacter();main.classList.add('ccbv-ready');return}
  for(const st of stacks){markPanels(st);ensureTabs(st);paintTab(st);st.dataset.ccbvReady='1'}
  main.classList.add('ccbv-ready')
}
function gmInviteOnly(){
  if(!hasRole())return;
  if(isGM()){HTML.classList.add('cc-invite-only');APP.querySelectorAll('[data-a="guestinvite"]').forEach(b=>{b.hidden=true;b.setAttribute('aria-hidden','true')})}
  else HTML.classList.remove('cc-invite-only')
}
function apply(){
  scheduled=false;
  if(!hasRole())return;
  gmInviteOnly();
  if(isGM()){HTML.classList.remove('cc-player-portal');return}
  HTML.classList.add('cc-player-portal');
  ensureExit();forceSheet();fixNoCharacter();applyBeyond()
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply)}

window.addEventListener('pointerdown',e=>{
  if(isPlayer()){
    const blocked=e.target?.closest?.('#app [data-tab="builder"],#app [data-tab="rules"],#app [data-tab="account"],#app [data-ccr-battle],#app [data-prh-party],#app [data-a="create"]');
    if(blocked){stop(e);forceSheet();toast('Oyuncu görünümü yalnız karakter kağıdına açıktır.');return}
  }
  if(isGM()&&e.target?.closest?.('#app [data-a="guestinvite"]')){stop(e);toast('Önce karakteri oluştur; ardından o karakterin Oyuncu Davet Linkini kullan.')}
},true);
window.addEventListener('click',e=>{
  const exit=e.target?.closest?.('[data-ccp-exit]');if(exit&&isPlayer()){stop(e);S.auth.signOut();return}
  const tab=e.target?.closest?.('[data-ccbv-tab]');if(tab&&isPlayer()){
    stop(e);const stack=tab.closest('.cc-character-stack');if(!stack)return;stack.dataset.ccbvTab=tab.dataset.ccbvTab||'actions';paintTab(stack);return
  }
  if(isPlayer()){
    const blocked=e.target?.closest?.('#app [data-tab="builder"],#app [data-tab="rules"],#app [data-tab="account"],#app [data-ccr-battle],#app [data-prh-party],#app [data-a="create"]');
    if(blocked){stop(e);forceSheet();return}
  }
  if(isGM()&&e.target?.closest?.('#app [data-a="guestinvite"]')){stop(e);toast('Oyuncu daveti artık karakter üzerinden oluşturulur.')}
},true);
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
S.auth.onAuthStateChange(()=>setTimeout(schedule,0));
setTimeout(schedule,0);setTimeout(schedule,180);setTimeout(schedule,700);
window.__catlakPlayerPortal={apply,forceSheet,paintTab};
})();