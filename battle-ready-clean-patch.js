const BRCLEAN_APP=document.querySelector('#app');
if(!BRCLEAN_APP)throw new Error('Savaş hazır görünümü başlatılamadı.');

if(!document.querySelector('#brclean-style')){
  const s=document.createElement('style');
  s.id='brclean-style';
  s.textContent=`
    #app main.brclean-ready-only [data-br3-turn],
    #app main.brclean-ready-only [data-br3-creatures],
    #app main.brclean-ready-only [data-br3-abilities],
    #app main.brclean-ready-only [data-br3-log],
    #app main.brclean-ready-only section.hero .vitals{display:none!important}
  `;
  document.head.appendChild(s);
}

const brcleanTxt=e=>String(e?.textContent||'').trim();
const brcleanIsGM=()=>brcleanTxt(BRCLEAN_APP.querySelector('.role'))==='GM';
const brcleanBattleView=()=>{
  if(brcleanIsGM())return false;
  const main=BRCLEAN_APP.querySelector('main');
  const btn=BRCLEAN_APP.querySelector('.nav [data-ccr-battle]');
  return window.__catlakBattleRoomOpen===true||btn?.classList.contains('on')||main?.dataset.ccrBattle==='1';
};

let brcleanQueued=false;
function brcleanApply(){
  brcleanQueued=false;
  const main=BRCLEAN_APP.querySelector('main');
  if(!main)return;
  if(!brcleanBattleView()){
    main.classList.remove('brclean-ready-only');
    return;
  }
  const ready=[...main.querySelectorAll('h1,h2')].some(x=>brcleanTxt(x)==='Savaş Hazır');
  main.classList.toggle('brclean-ready-only',ready);
}
function brcleanQueue(){
  if(brcleanQueued)return;
  brcleanQueued=true;
  requestAnimationFrame(brcleanApply);
}

new MutationObserver(brcleanQueue).observe(BRCLEAN_APP,{childList:true,subtree:true,characterData:true});
window.addEventListener('pointerup',e=>{if(e.target?.closest?.('[data-ccr-battle]'))brcleanQueue()},true);
setTimeout(brcleanApply,0);
setInterval(brcleanApply,1500);

if(!document.querySelector('script[data-slot-sync-hotfix]')){
  const h=document.createElement('script');
  h.dataset.slotSyncHotfix='1';
  h.src='./slot-sync-hotfix.js?v=slotfix-v2';
  h.async=false;
  document.body.appendChild(h);
}

window.__catlakBattleReadyCleanTest={apply:brcleanApply};
