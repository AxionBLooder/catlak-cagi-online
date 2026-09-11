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
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid{grid-template-columns:1fr!important;gap:11px!important}
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid>div:first-child{grid-template-columns:minmax(245px,.9fr) minmax(300px,1.05fr) minmax(320px,1.2fr)!important;gap:11px!important}
    #app main.brc-compact-battle.bra-action-layout [data-br3-turn],
    #app main.brc-compact-battle.bra-action-layout .brc-quick-card{grid-column:1/-1!important}
    #app main.brc-compact-battle.bra-action-layout .brc-creatures-card{grid-column:1/2!important}
    #app main.brc-compact-battle.bra-action-layout .brc-weapons-card{grid-column:2/3!important}
    #app main.brc-compact-battle.bra-action-layout .brc-abilities-card{grid-column:3/4!important}
    #app main.brc-compact-battle.bra-action-layout .brc-order-card{grid-column:1/-1!important}
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid>aside{position:static!important;max-height:none!important;overflow:visible!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:11px!important;padding:0!important}
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid>aside>section.card{margin:0!important;min-width:0!important}
    #app main.brc-compact-battle.bra-action-layout .brc-creatures-card .br3-grid,
    #app main.brc-compact-battle.bra-action-layout .brc-abilities-card .br3-grid{grid-template-columns:1fr!important}
  }
  #app main.bra-action-layout .brc-creatures-card,
  #app main.bra-action-layout .brc-weapons-card,
  #app main.bra-action-layout .brc-abilities-card{align-self:start!important;padding:16px!important}
  #app main.bra-action-layout .brc-creatures-card>h2,
  #app main.bra-action-layout .brc-weapons-card>h2,
  #app main.bra-action-layout .brc-abilities-card>h2{font-size:1.25rem!important;line-height:1.2!important;margin:.24rem 0 .5rem!important}
  #app main.bra-action-layout .brc-creatures-card>.eyebrow,
  #app main.bra-action-layout .brc-weapons-card>.eyebrow,
  #app main.bra-action-layout .brc-abilities-card>.eyebrow{font-size:.78rem!important;letter-spacing:.1em!important}
  #app main.bra-action-layout .brc-creatures-card>p,
  #app main.bra-action-layout .brc-weapons-card>p,
  #app main.bra-action-layout .brc-abilities-card>p,
  #app main.bra-action-layout [data-bra-help]{font-size:.9rem!important;line-height:1.45!important}
  #app main.bra-action-layout .br3-grid{gap:11px!important}
  #app main.bra-action-layout .br3-card,
  #app main.bra-action-layout .ccr-weapon{padding:14px!important;border-radius:14px!important}
  #app main.bra-action-layout .br3-card h3,
  #app main.bra-action-layout .ccr-weapon h3{font-size:1.08rem!important;line-height:1.25!important;margin:5px 0 8px!important}
  #app main.bra-action-layout .br3-card .eyebrow,
  #app main.bra-action-layout .ccr-weapon .eyebrow{font-size:.76rem!important}
  #app main.bra-action-layout .br3-pill{font-size:.84rem!important;padding:5px 9px!important;line-height:1.2!important}
  #app main.bra-action-layout .br3-note,
  #app main.bra-action-layout .br3-target-line{font-size:.92rem!important;line-height:1.45!important}
  #app main.bra-action-layout .br3-target-line{padding:10px 11px!important;margin:9px 0!important}
  #app main.bra-action-layout .brc-abilities-card label{font-size:.92rem!important;font-weight:800!important}
  #app main.bra-action-layout .brc-abilities-card select{min-height:40px!important;font-size:.94rem!important;padding:8px 10px!important;margin-top:5px!important}
  #app main.bra-action-layout .brc-creatures-card [data-br3-target],
  #app main.bra-action-layout .brc-weapons-card [data-bcs-classic-rolls] button,
  #app main.bra-action-layout .brc-weapons-card [data-br3-strike],
  #app main.bra-action-layout .brc-abilities-card [data-br3-use]{min-height:44px!important;font-size:.96rem!important;font-weight:900!important;padding:9px 12px!important;line-height:1.2!important}
  #app main.bra-action-layout .brc-creatures-card [data-br3-target]{width:100%!important}
  #app main.bra-action-layout .brc-weapons-card [data-bcs-classic-rolls]{gap:8px!important}
  #app main.bra-action-layout .brc-weapons-card [data-br3-strike]{width:100%!important}
  #app main.bra-action-layout .brc-abilities-card [data-br3-use]{margin-top:9px!important;width:100%!important}
  @media(max-width:700px){
    #app main.bra-action-layout .brc-creatures-card,
    #app main.bra-action-layout .brc-weapons-card,
    #app main.bra-action-layout .brc-abilities-card{padding:14px!important}
    #app main.bra-action-layout .brc-creatures-card [data-br3-target],
    #app main.bra-action-layout .brc-weapons-card [data-bcs-classic-rolls] button,
    #app main.bra-action-layout .brc-weapons-card [data-br3-strike],
    #app main.bra-action-layout .brc-abilities-card [data-br3-use]{min-height:46px!important;font-size:1rem!important}
  }
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
