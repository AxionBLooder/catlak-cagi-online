const BRA_APP=document.querySelector('#app');
if(!BRA_APP)throw new Error('Savaş aksiyon yerleşimi başlatılamadı.');

const braTxt=e=>String(e?.textContent||'').trim();
const braIsPlayer=()=>{const r=braTxt(BRA_APP.querySelector('.role'));return !!r&&r!=='GM'};
let braQueued=false;

if(!document.querySelector('#bra-layout-style')){
  const s=document.createElement('style');
  s.id='bra-layout-style';
  s.textContent=`
  @media(min-width:1100px){
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid{grid-template-columns:1fr!important;gap:9px!important}
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid>div:first-child{grid-template-columns:minmax(220px,.85fr) minmax(250px,.95fr) minmax(280px,1.2fr)!important;gap:9px!important}
    #app main.brc-compact-battle.bra-action-layout [data-br3-turn],
    #app main.brc-compact-battle.bra-action-layout .brc-quick-card{grid-column:1/-1!important}
    #app main.brc-compact-battle.bra-action-layout .brc-creatures-card{grid-column:1/2!important}
    #app main.brc-compact-battle.bra-action-layout .brc-weapons-card{grid-column:2/3!important}
    #app main.brc-compact-battle.bra-action-layout .brc-abilities-card{grid-column:3/4!important}
    #app main.brc-compact-battle.bra-action-layout .brc-order-card{grid-column:1/-1!important}
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid>aside{position:static!important;max-height:none!important;overflow:visible!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important;padding:0!important}
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid>aside>section.card{margin:0!important;min-width:0!important}
    #app main.brc-compact-battle.bra-action-layout .brc-creatures-card .br3-grid,
    #app main.brc-compact-battle.bra-action-layout .brc-abilities-card .br3-grid{grid-template-columns:1fr!important}
  }
  #app main.bra-action-layout .brc-creatures-card [data-br3-target]{width:100%!important}
  #app main.bra-action-layout .brc-abilities-card [data-br3-use]{margin-top:7px!important}
  #app main.bra-action-layout .brc-creatures-card,
  #app main.bra-action-layout .brc-weapons-card,
  #app main.bra-action-layout .brc-abilities-card{align-self:start!important}
  `;
  document.head.appendChild(s);
}

function braApply(){
  braQueued=false;
  const main=BRA_APP.querySelector('main');
  if(!main)return;
  const on=braIsPlayer()&&window.__catlakBattleRoomOpen===true&&main.classList.contains('brc-compact-battle');
  main.classList.toggle('bra-action-layout',on);
  if(!on)return;
  const creatures=main.querySelector('[data-br3-creatures]');
  const abilities=main.querySelector('[data-br3-abilities]');
  if(creatures){
    const h=creatures.querySelector('h2');
    if(h&&!h.dataset.braLabel){h.dataset.braLabel='1';h.insertAdjacentHTML('afterend','<div class="mini muted" data-bra-help>Hedefini seç → silah veya büyü/yetenek kullan.</div>')}
  }
  if(abilities){
    const h=abilities.querySelector('h2');
    if(h&&!h.dataset.braLabel){h.dataset.braLabel='1'}
  }
}
function braQueue(){if(braQueued)return;braQueued=true;requestAnimationFrame(braApply)}
new MutationObserver(braQueue).observe(BRA_APP,{childList:true,subtree:true});
window.addEventListener('resize',braQueue);
setTimeout(braQueue,180);
window.__catlakBattleActionsLayoutTest={apply:braApply};
