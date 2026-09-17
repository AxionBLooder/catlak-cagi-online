(function(){
'use strict';
if(window.__catlakGmCenterPartyIntegrationV2)return;
window.__catlakGmCenterPartyIntegrationV2=true;
const APP=document.querySelector('#app');if(!APP)return;
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
let queued=false;

if(!document.querySelector('#gmpi-style')){
 const st=document.createElement('style');st.id='gmpi-style';st.textContent=`
 #app.gmpi-gm .nav [data-gmr-open],
 #app.gmpi-gm .nav [data-tab="characters"]{display:none!important}
 #app.gmpi-gm .nav [data-prh-manager]{display:inline-flex!important}
 `;document.head.appendChild(st)
}

function ensureTopParty(){
 if(!isGM())return;
 const nav=APP.querySelector('.nav');if(!nav)return;
 let b=nav.querySelector('[data-prh-manager]');
 if(!b){
   b=document.createElement('button');b.type='button';b.dataset.prhManager='1';
 }
 b.textContent='Parti Odası';
 b.title='Parti Odasını aç';
 b.style.removeProperty('display');
 const gm=nav.querySelector('[data-gmt-open]');
 if(gm){if(gm.nextElementSibling!==b)gm.insertAdjacentElement('afterend',b)}
 else if(b.parentElement!==nav)nav.appendChild(b);
}
function keepManagementInsideCenter(){
 if(!isGM()){APP.classList.remove('gmpi-gm');return}
 APP.classList.add('gmpi-gm');
 const nav=APP.querySelector('.nav');if(!nav)return;
 nav.querySelectorAll('button').forEach(b=>{
   const t=txt(b);
   if(t==='Yönetim Odası'&&!b.closest('[data-gm2-centerbar]'))b.style.display='none';
 });
}
function removePartyFromCenter(){APP.querySelectorAll('[data-gm2-centerbar] [data-gm2-route="party"]').forEach(x=>x.remove())}
function ensure(){queued=false;keepManagementInsideCenter();removePartyFromCenter();ensureTopParty()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(ensure)}
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
setTimeout(ensure,0);setTimeout(ensure,250);setTimeout(ensure,1000);
window.__catlakGmCenterPartyIntegration={ensure,ensureTopParty,removePartyFromCenter};
})();