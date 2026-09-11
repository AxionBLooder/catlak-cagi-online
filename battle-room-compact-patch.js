const BRC_APP=document.querySelector('#app');
if(!BRC_APP)throw new Error('Kompakt Savaş Odası başlatılamadı.');

const brcTxt=e=>String(e?.textContent||'').trim();
const brcIsPlayer=()=>{const r=brcTxt(BRC_APP.querySelector('.role'));return !!r&&r!=='GM'};
let brcTimer=null,brcApplying=false;

if(!document.querySelector('#brc-style')){
  const s=document.createElement('style');s.id='brc-style';s.textContent=`
  main.brc-compact-battle{max-width:1780px!important;padding:8px 10px 14px!important}
  main.brc-compact-battle .ccr-battle-grid{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;align-items:start!important}
  main.brc-compact-battle .ccr-battle-grid>div:first-child{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:9px!important;align-items:start!important}
  main.brc-compact-battle .ccr-battle-grid>div:first-child>section.card{margin:0!important;min-width:0!important}
  main.brc-compact-battle [data-br3-turn]{grid-column:1/3!important;padding:9px 11px!important;min-height:0!important;margin:0!important}
  main.brc-compact-battle [data-br3-turn] h2{font-size:1rem!important;margin:.05rem 0!important}
  main.brc-compact-battle [data-br3-turn] .mini{font-size:.69rem!important}
  main.brc-compact-battle [data-br3-turn] button{min-width:124px!important;padding:7px 10px!important;min-height:34px!important}
  main.brc-compact-battle .brc-quick-card{grid-column:3/4!important;padding:8px 9px!important}
  main.brc-compact-battle .brc-quick-card>.eyebrow{margin-bottom:4px!important}
  main.brc-compact-battle .brc-quick-card>.actions{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:5px!important;margin:0!important}
  main.brc-compact-battle .brc-quick-card>.actions button{padding:6px 4px!important;min-height:32px!important;font-size:.72rem!important}
  main.brc-compact-battle .brc-creatures-card{grid-column:1/2!important;padding:9px!important}
  main.brc-compact-battle .brc-weapons-card{grid-column:2/3!important;padding:9px!important}
  main.brc-compact-battle .brc-abilities-card{grid-column:3/4!important;padding:9px!important}
  main.brc-compact-battle .brc-order-card{grid-column:1/-1!important;padding:9px!important}
  main.brc-compact-battle .brc-creatures-card>p.muted,main.brc-compact-battle .brc-abilities-card>p.muted{display:none!important}
  main.brc-compact-battle .brc-creatures-card>h2,main.brc-compact-battle .brc-abilities-card>h2,main.brc-compact-battle .brc-weapons-card h2,main.brc-compact-battle .brc-order-card h2{font-size:.96rem!important;margin:.05rem 0 .38rem!important}
  main.brc-compact-battle .br3-grid{display:flex!important;overflow-x:auto!important;gap:6px!important;padding-bottom:3px!important;scrollbar-width:thin!important;overscroll-behavior-x:contain!important}
  main.brc-compact-battle .br3-card{flex:0 0 182px!important;padding:7px!important;border-radius:10px!important;min-height:0!important}
  main.brc-compact-battle .br3-ability{flex-basis:205px!important}
  main.brc-compact-battle .br3-card h3{font-size:.86rem!important;margin:1px 0 3px!important}
  main.brc-compact-battle .br3-pills{gap:3px!important;margin:3px 0!important}
  main.brc-compact-battle .br3-pill{font-size:.61rem!important;padding:2px 5px!important}
  main.brc-compact-battle .br3-note{font-size:.68rem!important;line-height:1.22!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  main.brc-compact-battle .br3-card .actions{margin-top:5px!important}
  main.brc-compact-battle .br3-card button,main.brc-compact-battle .br3-card select{min-height:31px!important;padding:5px 7px!important;font-size:.74rem!important}
  main.brc-compact-battle .br3-card label{font-size:.66rem!important;margin-top:4px!important}
  main.brc-compact-battle .ccr-weapons{display:flex!important;overflow-x:auto!important;gap:6px!important;padding-bottom:3px!important;scrollbar-width:thin!important;overscroll-behavior-x:contain!important}
  main.brc-compact-battle .ccr-weapon{flex:0 0 196px!important;padding:7px!important;border-radius:10px!important}
  main.brc-compact-battle .ccr-weapon h3{font-size:.86rem!important;margin:1px 0!important}
  main.brc-compact-battle .ccr-weapon .mini{font-size:.65rem!important}
  main.brc-compact-battle .br3-target-line{padding:4px 6px!important;margin:4px 0!important;font-size:.68rem!important}
  main.brc-compact-battle .ccr-order{display:flex!important;overflow-x:auto!important;gap:6px!important;padding-bottom:3px!important;scrollbar-width:thin!important;overscroll-behavior-x:contain!important}
  main.brc-compact-battle .ccr-order-row{flex:0 0 170px!important;grid-template-columns:34px minmax(0,1fr) auto!important;padding:5px 7px!important;border-radius:9px!important;gap:5px!important}
  main.brc-compact-battle .ccr-init{font-size:.94rem!important}
  main.brc-compact-battle .ccr-order-row .mini{font-size:.62rem!important}
  main.brc-compact-battle .ccr-battle-grid>aside{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important;position:static!important;max-height:none!important;overflow:visible!important;padding:0!important}
  main.brc-compact-battle .ccr-battle-grid>aside>section.card{margin:0!important;padding:9px!important;min-width:0!important}
  main.brc-compact-battle [data-br3-log] h2{font-size:.96rem!important;margin:.05rem 0 .35rem!important}
  main.brc-compact-battle .br3-log{max-height:150px!important;overflow:auto!important;gap:2px!important;padding-right:2px!important;scrollbar-width:thin}
  main.brc-compact-battle .br3-log-row{grid-template-columns:40px minmax(0,1fr)!important;padding:3px 0!important;gap:5px!important}
  main.brc-compact-battle .br3-log-row time{font-size:.61rem!important}
  main.brc-compact-battle .br3-log-row .mini{font-size:.65rem!important;line-height:1.2!important}
  main.brc-compact-battle .ccr-mini-rolls{max-height:150px!important;overflow:auto!important;gap:4px!important;scrollbar-width:thin}
  main.brc-compact-battle .ccr-mini-roll{grid-template-columns:31px minmax(0,1fr)!important;padding:5px!important;gap:6px!important}
  main.brc-compact-battle .ccr-mini-roll .die{width:31px!important;height:31px!important;font-size:.75rem!important}
  @media(max-width:1180px){
    main.brc-compact-battle .ccr-battle-grid>div:first-child{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    main.brc-compact-battle [data-br3-turn]{grid-column:1/2!important}
    main.brc-compact-battle .brc-quick-card{grid-column:2/3!important}
    main.brc-compact-battle .brc-creatures-card{grid-column:1/2!important}
    main.brc-compact-battle .brc-weapons-card{grid-column:2/3!important}
    main.brc-compact-battle .brc-abilities-card{grid-column:1/-1!important}
  }
  @media(max-width:760px){
    main.brc-compact-battle{padding:7px!important}
    main.brc-compact-battle .ccr-battle-grid>div:first-child{grid-template-columns:1fr!important;gap:7px!important}
    main.brc-compact-battle [data-br3-turn],main.brc-compact-battle .brc-quick-card,main.brc-compact-battle .brc-creatures-card,main.brc-compact-battle .brc-weapons-card,main.brc-compact-battle .brc-abilities-card,main.brc-compact-battle .brc-order-card{grid-column:1/-1!important}
    main.brc-compact-battle .brc-quick-card>.actions{display:flex!important;overflow-x:auto!important;gap:5px!important;padding-bottom:2px!important;scrollbar-width:thin}
    main.brc-compact-battle .brc-quick-card>.actions button{flex:0 0 72px!important}
    main.brc-compact-battle [data-br3-turn]{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important}
    main.brc-compact-battle [data-br3-turn] button{width:auto!important;min-width:112px!important}
    main.brc-compact-battle .ccr-battle-grid>aside{grid-template-columns:1fr!important;gap:7px!important}
    main.brc-compact-battle .br3-log,main.brc-compact-battle .ccr-mini-rolls{max-height:135px!important}
  }
  `;document.head.appendChild(s)
}

function brcSectionByEyebrow(root,label){return [...root.querySelectorAll(':scope > section.card')].find(s=>brcTxt(s.querySelector('.eyebrow'))===label)||null}
function brcArrange(){
  if(brcApplying)return;brcApplying=true;
  try{
    const main=BRC_APP.querySelector('main');
    if(!main)return;
    if(!brcIsPlayer()||window.__catlakBattleRoomOpen!==true){main.classList.remove('brc-compact-battle');return}
    const grid=main.querySelector('.ccr-battle-grid'),left=grid?.firstElementChild;if(!grid||!left)return;
    main.classList.add('brc-compact-battle');
    const turn=left.querySelector(':scope > [data-br3-turn]');
    const creatures=left.querySelector(':scope > [data-br3-creatures]');
    const abilities=left.querySelector(':scope > [data-br3-abilities]');
    const order=left.querySelector('.ccr-order')?.closest('section.card')||null;
    const weapons=brcSectionByEyebrow(left,'TAKILI SİLAHLAR');
    const quick=brcSectionByEyebrow(left,'HIZLI D20');
    [quick,creatures,weapons,abilities,order].forEach(x=>x?.classList.remove('brc-quick-card','brc-creatures-card','brc-weapons-card','brc-abilities-card','brc-order-card'));
    quick?.classList.add('brc-quick-card');creatures?.classList.add('brc-creatures-card');weapons?.classList.add('brc-weapons-card');abilities?.classList.add('brc-abilities-card');order?.classList.add('brc-order-card');
    const wanted=[turn,quick,creatures,weapons,abilities,order].filter(Boolean);let anchor=left.firstElementChild;
    for(const el of wanted){if(el===anchor){anchor=anchor?.nextElementSibling;continue}left.insertBefore(el,anchor)}
  }finally{brcApplying=false}
}
function brcSoon(ms=40){clearTimeout(brcTimer);brcTimer=setTimeout(brcArrange,ms)}
new MutationObserver(()=>brcSoon(50)).observe(BRC_APP,{childList:true,subtree:true});
window.addEventListener('resize',()=>brcSoon(30));
setInterval(()=>{if(window.__catlakBattleRoomOpen===true)brcSoon(0)},1800);
setTimeout(()=>brcSoon(0),220);
window.__catlakBattleCompactTest={arrange:brcArrange};
