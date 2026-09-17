(function(){
'use strict';
if(window.__catlakGmCenterPartyIntegrationV1)return;
window.__catlakGmCenterPartyIntegrationV1=true;
const APP=document.querySelector('#app');if(!APP)return;
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
let queued=false;

if(!document.querySelector('#gmpi-style')){
 const st=document.createElement('style');st.id='gmpi-style';st.textContent=`
 #app.gmpi-gm .nav [data-prh-manager],
 #app.gmpi-gm .nav [data-prh-party],
 #app.gmpi-gm .nav [data-gmr-open],
 #app.gmpi-gm .nav [data-tab="characters"]{display:none!important}
 `;document.head.appendChild(st)
}

function ensurePartyButton(){
 if(!isGM())return;
 const bar=APP.querySelector('[data-gm2-centerbar]');if(!bar)return;
 let b=bar.querySelector('[data-gm2-route="party"]');
 if(!b){
   b=document.createElement('button');b.type='button';b.dataset.gm2Route='party';b.textContent='Parti Odası';
   const chars=bar.querySelector('[data-gm2-route="characters"]');chars?chars.insertAdjacentElement('afterend',b):bar.appendChild(b);
 }
 const active=String(window.__catlakGmCenterSelectedRoute||'');
 bar.querySelectorAll('[data-gm2-route]').forEach(x=>{const on=String(x.dataset.gm2Route||'')===active;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false')});
}
function hideSeparateEntries(){
 if(!isGM()){APP.classList.remove('gmpi-gm');return}
 APP.classList.add('gmpi-gm');
 const nav=APP.querySelector('.nav');if(!nav)return;
 nav.querySelectorAll('button').forEach(b=>{
   const t=txt(b);
   if((t==='Yönetim Odası'||t==='Parti Yönetimi'||t==='Parti Odası')&&!b.closest('[data-gm2-centerbar]'))b.style.display='none';
 });
}
function ensure(){queued=false;hideSeparateEntries();ensurePartyButton()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(ensure)}
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
setTimeout(ensure,0);setTimeout(ensure,250);setTimeout(ensure,1000);
window.__catlakGmCenterPartyIntegration={ensure};
})();