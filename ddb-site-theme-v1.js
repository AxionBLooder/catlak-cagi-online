(function(){
'use strict';
if(window.__catlakDdbSiteThemeV2)return;
window.__catlakDdbSiteThemeV2=true;
window.__catlakDdbSiteThemeV1=true;
const APP=document.getElementById('app');
if(!APP)return;
const HTML=document.documentElement;
const txt=e=>String(e?.textContent||'').trim();
const role=()=>txt(APP.querySelector('.role'));
const isGM=()=>role()==='GM';
let scheduled=false;

if(!document.getElementById('ddb-site-theme-style')){
 const s=document.createElement('style');s.id='ddb-site-theme-style';s.textContent=`
/* Tüm eski geçiş gizleme/perde katmanlarını etkisizleştir. */
html.cc-route-cloak #app main,html.pptf-player-prep #app main,html.pptf-live-prep #app main{visibility:visible!important}
html.cc-route-cloak body::before{content:none!important;display:none!important}
html.fup-battle-prep #app main .ccr-battle-grid,html.bra-battle-prep #app main .ccr-battle-grid{visibility:visible!important}
html.ddb-site body{background:#111417!important}
html.ddb-site #app>.top{background:#1d2226!important;border-bottom:1px solid #3a4045!important;box-shadow:0 2px 12px #0005!important;backdrop-filter:none!important}
html.ddb-site #app>.top .mark{border-radius:6px!important;border-color:#9f3438!important;color:#d55358!important;background:#131719!important}
html.ddb-site #app>.top .brand b{font-weight:900!important;letter-spacing:.02em!important}
html.ddb-site #app>.nav{top:61px!important;background:#292e32!important;border-bottom:1px solid #4a5055!important;padding-top:0!important;padding-bottom:0!important;gap:0!important;box-shadow:0 2px 8px #0004!important}
html.ddb-site #app>.nav button{border:0!important;border-radius:0!important;padding:13px 14px!important;color:#d0d4d6!important;font-size:.78rem!important;font-weight:800!important;background:transparent!important;border-bottom:3px solid transparent!important}
html.ddb-site #app>.nav button:hover{background:#343a3f!important;color:white!important}
html.ddb-site #app>.nav button.on{background:#1e2327!important;color:#fff!important;border-bottom-color:#c63f44!important}
html.ddb-site #app main{width:min(1480px,calc(100% - 24px))!important;margin-top:18px!important}
html.ddb-site #app .card{border-radius:8px!important;box-shadow:0 4px 15px #0004!important}
html.ddb-site #app button{border-radius:6px!important}
html.ddb-site #app button.primary{background:linear-gradient(#b8393e,#92292e)!important;border-color:#d2565b!important;color:#fff!important}
html.ddb-site #app button.primary:hover{background:linear-gradient(#c3464b,#a83237)!important}
html.ddb-site #app input,html.ddb-site #app select,html.ddb-site #app textarea{border-radius:6px!important}
html.ddb-site #app .tag{border-radius:5px!important}
.ddb-workspace{width:min(1480px,calc(100% - 24px));margin:18px auto 0;display:flex;justify-content:space-between;gap:14px;align-items:center;padding:14px 16px;border:1px solid #434b51;border-radius:8px;background:linear-gradient(180deg,#252b30,#1c2125);box-shadow:0 6px 22px #0004}
.ddb-workspace h1{font-size:1.45rem;margin:0;color:#fff}.ddb-workspace p{margin:4px 0 0;color:#aeb7bd;font-size:.82rem;line-height:1.45}.ddb-workspace .eyebrow{color:#d65358!important;margin:0 0 2px!important}.ddb-workspace-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.ddb-workspace-actions button{white-space:nowrap}
html.ddb-gm main>.card>.section-title,html.ddb-gm main>.card>.section-heading{padding-bottom:10px;border-bottom:1px solid #33404a;margin-bottom:12px}
html.ddb-gm main .grid,html.ddb-gm main .list{gap:10px!important}
html.ddb-gm main .char,html.ddb-gm main .item,html.ddb-gm main .power{border-radius:7px!important}
html.ddb-gm main form,.ddb-builder-panel{max-width:1180px;margin-left:auto;margin-right:auto}
html.ddb-gm main.ddb-builder-view>.card:first-child{border-top:3px solid #b43b40!important}
html.ddb-gm main.ddb-character-view .civ-panel{border-top:3px solid #b43b40!important}
html.ddb-player #app>.top{position:sticky!important;top:0!important}
html.ddb-player #app>.top .brand b{font-size:1rem!important}
html.ddb-player #app main.ps-player-sheet{margin-top:14px!important}
@media(max-width:760px){.ddb-workspace{width:calc(100% - 12px);margin-top:8px;align-items:flex-start;flex-direction:column}.ddb-workspace-actions{width:100%;justify-content:flex-start}html.ddb-site #app>.nav button{padding:11px 10px!important}html.ddb-site #app main{width:calc(100% - 10px)!important}}
 `;document.head.appendChild(s)
}

const meta={
 gm:['KAMPANYA','Kampanya Merkezi','Canlı oyun, parti, harita ve GM yönetimini tek merkezden kontrol et.'],
 characters:['KARAKTERLER','Karakterler','Karakterleri GM hazırlar, düzenler ve oyunculara karaktere özel davet bağlantısıyla gönderir.'],
 builder:['KARAKTER OLUŞTURUCU','Yeni Karakter','Irk, sınıf, statlar, yetenekler ve ekipmanı adım adım kur.'],
 races:['OYUN İÇERİĞİ','Oyun İçeriği','Irklar, sınıflar, yetenekler ve dünya kurallarını yönet.'],
 items:['EŞYALAR','Eşya Kütüphanesi','Silah, zırh ve diğer eşyaları tek kütüphaneden yönet.'],
 rolls:['OYUN GÜNLÜĞÜ','Oyun Günlüğü','Oturum hareketleri ve zar sonuçlarını incele.'],
 rules:['KURALLAR','Kurallar','Masa kuralları ve oyun sistemini düzenle.'],
 account:['HESAP','Hesap','GM hesabı ve oturum işlemleri.']
};
function activeTab(){return APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||''}
function ensureWorkspace(){
 if(!isGM()){APP.querySelector('[data-ddb-workspace]')?.remove();return}
 const nav=APP.querySelector('.nav'),main=APP.querySelector('main');if(!nav||!main||main.classList.contains('auth'))return;
 const tab=activeTab(),m=meta[tab]||['GM','GM Yönetimi','Çatlak Çağı yönetim araçları.'];
 let bar=APP.querySelector('[data-ddb-workspace]');
 if(!bar){bar=document.createElement('section');bar.className='ddb-workspace';bar.dataset.ddbWorkspace='1';nav.insertAdjacentElement('afterend',bar)}
 const action=tab==='characters'?'<button type="button" class="primary" data-ddb-open-builder>+ Yeni Karakter</button>':tab==='builder'?'<button type="button" data-ddb-open-characters>← Karakterlere Dön</button>':'';
 const sig=[tab,m[0],m[1],action].join('|');if(bar.dataset.sig===sig)return;bar.dataset.sig=sig;
 bar.innerHTML=`<div><div class="eyebrow">${m[0]}</div><h1>${m[1]}</h1><p>${m[2]}</p></div><div class="ddb-workspace-actions">${action}</div>`
}
function markView(){
 const main=APP.querySelector('main');if(!main)return;main.classList.remove('ddb-builder-view','ddb-character-view');
 const tab=activeTab();if(tab==='builder')main.classList.add('ddb-builder-view');if(tab==='characters')main.classList.add('ddb-character-view')
}
function renameNav(){
 if(!isGM())return;const map={gm:'Kampanya',characters:'Karakterler',builder:'Karakter Oluştur',races:'Oyun İçeriği',items:'Eşyalar',rolls:'Oyun Günlüğü',rules:'Kurallar',account:'Hesap'};
 APP.querySelectorAll('.nav button[data-tab]').forEach(b=>{const n=map[b.dataset.tab];if(n&&txt(b)!==n)b.textContent=n})
}
function clearLegacyPrep(){HTML.classList.remove('cc-route-cloak','pptf-player-prep','pptf-live-prep','fup-battle-prep','bra-battle-prep')}
function apply(){scheduled=false;clearLegacyPrep();HTML.classList.add('ddb-site');HTML.classList.toggle('ddb-gm',isGM());renameNav();ensureWorkspace();markView()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply)}
APP.addEventListener('click',e=>{
 clearLegacyPrep();
 const b=e.target.closest('[data-ddb-open-builder]');if(b){e.preventDefault();APP.querySelector('.nav [data-tab="builder"]')?.click();return}
 const c=e.target.closest('[data-ddb-open-characters]');if(c){e.preventDefault();APP.querySelector('.nav [data-tab="characters"]')?.click()}
},true);
window.addEventListener('pointerdown',clearLegacyPrep,true);
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
new MutationObserver(clearLegacyPrep).observe(HTML,{attributes:true,attributeFilter:['class']});
setTimeout(schedule,0);setTimeout(schedule,200);setTimeout(schedule,700);
window.__catlakDdbSiteTheme={apply,clearLegacyPrep};
})();