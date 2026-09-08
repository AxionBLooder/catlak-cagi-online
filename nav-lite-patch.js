const CNL_APP=document.querySelector('#app');
if(!CNL_APP)throw new Error('Çatlak Çağı navigasyon katmanı başlatılamadı.');

const cnlTxt=e=>String(e?.textContent||'').trim();
const cnlIsGM=()=>cnlTxt(CNL_APP.querySelector('.role'))==='GM';
let cnlScheduled=false;

function cnlSelect(btn){
  const nav=CNL_APP.querySelector('.nav');
  if(!nav)return;
  nav.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===btn));
}

function cnlEnsureNav(){
  const nav=CNL_APP.querySelector('.nav');
  if(!nav)return;

  let world=nav.querySelector('[data-cc-world-tab]');
  if(!world){
    world=document.createElement('button');
    world.type='button';
    world.dataset.ccWorldTab='1';
    const rules=nav.querySelector('[data-tab="rules"]');
    rules?rules.before(world):nav.appendChild(world);
  }
  if(world.hasAttribute('data-tab'))world.removeAttribute('data-tab');
  if(cnlTxt(world)!=='Görsel Arşivi')world.textContent='Görsel Arşivi';
  if(world.getAttribute('aria-label')!=='Görsel Arşivi')world.setAttribute('aria-label','Görsel Arşivi');

  let stats=nav.querySelector('[data-cc-stats-tab]');
  if(cnlIsGM()){
    if(!stats){
      stats=document.createElement('button');
      stats.type='button';
      stats.dataset.ccStatsTab='1';
      const chars=nav.querySelector('[data-tab="characters"]');
      const races=nav.querySelector('[data-tab="races"]');
      chars?chars.after(stats):races?races.before(stats):nav.appendChild(stats);
    }
    if(stats.hasAttribute('data-tab'))stats.removeAttribute('data-tab');
    if(cnlTxt(stats)!=='Stat Atölyesi')stats.textContent='Stat Atölyesi';
    if(stats.getAttribute('aria-label')!=='Stat Atölyesi')stats.setAttribute('aria-label','Stat Atölyesi');
  }else if(stats){
    stats.remove();
  }
}

function cnlSchedule(){
  if(cnlScheduled)return;
  cnlScheduled=true;
  requestAnimationFrame(()=>{cnlScheduled=false;cnlEnsureNav()});
}

document.addEventListener('click',e=>{
  const stats=e.target.closest?.('#app [data-cc-stats-tab]');
  if(stats){
    e.preventDefault();
    e.stopImmediatePropagation();
    window.__catlakRouteGeneration=(window.__catlakRouteGeneration||0)+1;
    cnlSelect(stats);
    window.__catlakRouteLoading?.('Stat Atölyesi');
    requestAnimationFrame(()=>window.__catlakRenderCompactStats?.(true));
    return;
  }

  const normal=e.target.closest?.('#app .nav button');
  if(normal&&!normal.matches('[data-cc-world-tab],[data-cc-map-tab],[data-cc-stats-tab]')){
    window.__catlakRouteGeneration=(window.__catlakRouteGeneration||0)+1;
  }
},true);

new MutationObserver(cnlSchedule).observe(CNL_APP,{childList:true,subtree:true});
cnlEnsureNav();
