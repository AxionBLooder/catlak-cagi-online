(function(){
'use strict';
if(window.__catlakDdbFlowCoreV3)return;
window.__catlakDdbFlowCoreV3=true;
window.__catlakDdbFlowCoreV2=true;
window.__catlakDdbFlowCoreV1=true;
const APP=document.getElementById('app');
if(!APP)return;
const HTML=document.documentElement;
const txt=e=>String(e?.textContent||'').trim();
const role=()=>txt(APP.querySelector('.role'));
const isGM=()=>role()==='GM';
const isPlayer=()=>!!role()&&!isGM();
let scheduled=false,forcing=false;

if(!document.getElementById('ddb-flow-core-style')){
 const s=document.createElement('style');s.id='ddb-flow-core-style';s.textContent=`
 html.ddb-player #app .nav{display:none!important}
 html.ddb-player #app [data-tab="builder"],html.ddb-player #app [data-tab="rules"],html.ddb-player #app [data-tab="account"],html.ddb-player #app [data-ccr-battle],html.ddb-player #app [data-prh-party],html.ddb-player #app [data-pm3-open]{display:none!important}
 html.ddb-player #app main{margin-top:14px!important}
 html.ddb-invite-auth #app .auth .tabs{display:none!important}
 html.ddb-invite-auth #app .auth [data-a="amode"][data-v="signup"],html.ddb-invite-auth #app .auth label:has(#aname){display:none!important}
 .ddb-auth-note{margin:14px 0;padding:12px 13px;border:1px solid #3c5a70;border-radius:10px;background:#0b1d2b;color:#cfe9f8;font-size:.88rem;line-height:1.5}
 .ddb-gm-pill{display:inline-flex;align-items:center;gap:6px;margin-left:8px;padding:4px 8px;border:1px solid #5c6b78;border-radius:999px;color:#cbd4db;font-size:.66rem;letter-spacing:.08em}
 `;document.head.appendChild(s)
}
function clearCloaks(){HTML.classList.remove('cc-route-cloak')}
function showMain(){const m=APP.querySelector('main');if(!isPlayer()||!m||m.classList.contains('auth'))return;const visible=m.style.getPropertyValue('visibility')==='visible'&&m.style.getPropertyPriority('visibility')==='important';if(!visible)m.style.setProperty('visibility','visible','important')}
function forcePlayerSheet(){if(!isPlayer()||forcing)return;const b=APP.querySelector('.nav [data-tab="sheet"]');if(!b)return;const on=APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';if(on==='sheet')return;forcing=true;try{b.click()}finally{setTimeout(()=>forcing=false,80)}}
function inviteOnlyAuth(){
 const auth=APP.querySelector('main.auth');if(!auth){HTML.classList.remove('ddb-invite-auth');return}
 HTML.classList.add('ddb-invite-auth');const signup=auth.querySelector('[data-a="amode"][data-v="signup"]'),login=auth.querySelector('[data-a="amode"][data-v="login"]');if(signup?.classList.contains('on'))login?.click();
 const h1=auth.querySelector('h1');if(h1&&h1.textContent!=='Çatlak Çağı')h1.textContent='Çatlak Çağı';
 const p=auth.querySelector('h1 + p, .card > p.muted');const msg='Karakterleri GM oluşturur. Oyuncular kendilerine gönderilen karakter davet bağlantısını açarak doğrudan kendi karakter kağıdına girer.';if(p&&p.textContent!==msg)p.textContent=msg;
 const form=auth.querySelector('.form');if(form&&!auth.querySelector('.ddb-auth-note')){const n=document.createElement('div');n.className='ddb-auth-note';n.innerHTML='<b>Oyuncu musun?</b><br>Hesap açmana gerek yok. GM’nin sana gönderdiği karakter davet linkini açman yeterli.';form.insertAdjacentElement('beforebegin',n)}
 const submit=auth.querySelector('[data-a="auth"]');if(submit&&submit.textContent!=='GM Olarak Giriş Yap')submit.textContent='GM Olarak Giriş Yap'
}
function gmShell(){
 if(!isGM())return;const brand=APP.querySelector('.top .brand b');if(brand&&!brand.querySelector('.ddb-gm-pill')){const p=document.createElement('span');p.className='ddb-gm-pill';p.textContent='GM YÖNETİMİ';brand.appendChild(p)}
 const map={gm:'Kampanya',characters:'Karakterler',races:'Oyun İçeriği',items:'Eşyalar',rolls:'Oyun Günlüğü',rules:'Kurallar',account:'Hesap'};APP.querySelectorAll('.nav [data-tab]').forEach(b=>{const k=b.dataset.tab;if(map[k]&&b.textContent!==map[k])b.textContent=map[k]});APP.querySelectorAll('[data-a="guestinvite"]').forEach(b=>{if(b.style.display!=='none')b.style.display='none'})
}
function playerShell(){
 if(!isPlayer()){HTML.classList.remove('ddb-player');return}HTML.classList.add('ddb-player');clearCloaks();forcePlayerSheet();showMain();APP.querySelectorAll('[data-tab="builder"],[data-a="create"],[data-a="guestinvite"]').forEach(x=>{if(x.style.display!=='none')x.style.display='none'});
 const main=APP.querySelector('main');if(main&&!main.classList.contains('auth')){showMain();const empty=[...main.querySelectorAll('.empty,.card.empty')].find(x=>/Henüz karakterin yok|Karakter Oluştur/i.test(txt(x)));if(empty&&!empty.dataset.ddbInviteEmpty){empty.dataset.ddbInviteEmpty='1';empty.innerHTML='<div class="eyebrow">KARAKTER DAVETİ GEREKLİ</div><h2>Henüz sana atanmış bir karakter yok</h2><p>Karakteri GM oluşturur. Sana gönderilen karakter davet bağlantısını açtığında kağıdın otomatik olarak burada görünür.</p>'}}
}
function apply(){scheduled=false;clearCloaks();inviteOnlyAuth();gmShell();playerShell();showMain()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply)}
window.addEventListener('pointerdown',()=>{clearCloaks();showMain()},true);
window.addEventListener('click',e=>{clearCloaks();showMain();if(isPlayer()&&e.target?.closest?.('[data-tab="builder"],[data-tab="rules"],[data-tab="account"],[data-ccr-battle],[data-prh-party],[data-pm3-open],[data-a="create"]')){e.preventDefault();e.stopImmediatePropagation();forcePlayerSheet()}if(e.target?.closest?.('[data-a="amode"][data-v="signup"]')){e.preventDefault();e.stopImmediatePropagation()}setTimeout(schedule,0)},true);
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
new MutationObserver(()=>{clearCloaks();showMain()}).observe(HTML,{attributes:true,attributeFilter:['class']});
setTimeout(schedule,0);setTimeout(schedule,150);setTimeout(schedule,500);
window.__catlakDdbFlowCore={apply,forcePlayerSheet,clearCloaks,showMain};
})();