const BRC_APP=document.querySelector('#app');
if(!BRC_APP)throw new Error('Kompakt Savaş Odası başlatılamadı.');

const brcTxt=e=>String(e?.textContent||'').trim();
const brcIsPlayer=()=>{const r=brcTxt(BRC_APP.querySelector('.role'));return !!r&&r!=='GM'};
let brcTimer=null,brcApplying=false;

if(!document.querySelector('#brc-style')){
  const s=document.createElement('style');s.id='brc-style';s.textContent=`
  main.brc-compact-battle{max-width:1680px!important;padding-top:10px!important}
  main.brc-compact-battle .ccr-battle-grid{grid-template-columns:minmax(0,1.42fr) minmax(260px,.58fr)!important;gap:10px!important;align-items:start!important}
  main.brc-compact-battle .ccr-battle-grid>div:first-child{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;align-items:start!important}
  main.brc-compact-battle .ccr-battle-grid>div:first-child>section.card{margin:0!important;min-width:0}
  main.brc-compact-battle [data-br3-turn]{grid-column:1/-1!important;padding:10px 12px!important;min-height:0!important}
  main.brc-compact-battle [data-br3-turn] h2{font-size:1.05rem!important;margin:.08rem 0!important}
  main.brc-compact-battle [data-br3-turn] .mini{font-size:.72rem!important}
  main.brc-compact-battle [data-br3-turn] button{min-width:132px!important;padding:8px 11px!important}
  main.brc-compact-battle .brc-creatures-card{grid-column:1/2!important;padding:10px!important}
  main.brc-compact-battle .brc-weapons-card{grid-column:2/3!important;padding:10px!important}
  main.brc-compact-battle .brc-abilities-card{grid-column:1/-1!important;padding:10px!important}
  main.brc-compact-battle .brc-order-card{grid-column:1/-1!important;padding:10px!important}
  main.brc-compact-battle .brc-creatures-card>p.muted,main.brc-compact-battle .brc-abilities-card>p.muted{display:none!important}
  main.brc-compact-battle .brc-creatures-card>h2,main.brc-compact-battle .brc-abilities-card>h2,main.brc-compact-battle .brc-weapons-card h2,main.brc-compact-battle .brc-order-card h2{font-size:1rem!important;margin:.1rem 0 .45rem!important}
  main.brc-compact-battle .br3-grid{grid-template-columns:repeat(auto-fit,minmax(165px,1fr))!important;gap:7px!important}
  main.brc-compact-battle .br3-card{padding:8px!important;border-radius:11px!important;min-height:0!important}
  main.brc-compact-battle .br3-card h3{font-size:.9rem!important;margin:2px 0 4px!important}
  main.brc-compact-battle .br3-pills{gap:4px!important;margin:4px 0!important}
  main.brc-compact-battle .br3-pill{font-size:.65rem!important;padding:2px 6px!important}
  main.brc-compact-battle .br3-note{font-size:.72rem!important;line-height:1.28!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  main.brc-compact-battle .br3-card .actions{margin-top:6px!important}
  main.brc-compact-battle .br3-card button,main.brc-compact-battle .br3-card select{min-height:34px!important;padding:6px 8px!important;font-size:.78rem!important}
  main.brc-compact-battle .br3-card label{font-size:.7rem!important;margin-top:5px!important}
  main.brc-compact-battle .ccr-weapons{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
  main.brc-compact-battle .ccr-weapon{padding:8px!important;border-radius:11px!important}
  main.brc-compact-battle .ccr-weapon h3{font-size:.9rem!important;margin:2px 0!important}
  main.brc-compact-battle .ccr-weapon .mini{font-size:.68rem!important}
  main.brc-compact-battle .br3-target-line{padding:5px 7px!important;margin:5px 0!important;font-size:.72rem!important}
  main.brc-compact-battle .ccr-order{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(175px,1fr))!important;gap:6px!important}
  main.brc-compact-battle .ccr-order-row{grid-template-columns:38px minmax(0,1fr) auto!important;padding:6px 8px!important;border-radius:10px!important;gap:6px!important}
  main.brc-compact-battle .ccr-init{font-size:1rem!important}
  main.brc-compact-battle .ccr-order-row .mini{font-size:.65rem!important}
  main.brc-compact-battle .ccr-battle-grid>aside{position:sticky!important;top:8px!important;max-height:calc(100vh - 16px)!important;overflow:auto!important;padding-right:3px!important;scrollbar-width:thin}
  main.brc-compact-battle .ccr-battle-grid>aside>section.card{margin:0 0 8px!important;padding:10px!important}
  main.brc-compact-battle [data-br3-log] h2{font-size:1rem!important;margin:.1rem 0 .4rem!important}
  main.brc-compact-battle .br3-log{max-height:210px!important;overflow:auto!important;gap:3px!important;padding-right:2px!important;scrollbar-width:thin}
  main.brc-compact-battle .br3-log-row{grid-template-columns:42px minmax(0,1fr)!important;padding:4px 0!important;gap:6px!important}
  main.brc-compact-battle .br3-log-row time{font-size:.64rem!important}
  main.brc-compact-battle .br3-log-row .mini{font-size:.68rem!important;line-height:1.25!important}
  main.brc-compact-battle .ccr-mini-rolls{max-height:190px!important;overflow:auto!important;gap:5px!important;scrollbar-width:thin}
  main.brc-compact-battle .ccr-mini-roll{grid-template-columns:34px minmax(0,1fr)!important;padding:6px!important;gap:7px!important}
  main.brc-compact-battle .ccr-mini-roll .die{width:34px!important;height:34px!important;font-size:.8rem!important}
  @media(max-width:980px){
    main.brc-compact-battle .ccr-battle-grid{grid-template-columns:1fr!important}
    main.brc-compact-battle .ccr-battle-grid>aside{position:static!important;max-height:none!important;overflow:visible!important}
  }
  @media(max-width:700px){
    main.brc-compact-battle{padding:8px!important}
    main.brc-compact-battle .ccr-battle-grid>div:first-child{grid-template-columns:1fr!important;gap:7px!important}
    main.brc-compact-battle .brc-creatures-card,main.brc-compact-battle .brc-weapons-card,main.brc-compact-battle .brc-abilities-card,main.brc-compact-battle .brc-order-card{grid-column:1/-1!important}
    main.brc-compact-battle .br3-grid{display:flex!important;overflow-x:auto!important;gap:6px!important;padding-bottom:4px!important;scrollbar-width:thin;overscroll-behavior-x:contain}
    main.brc-compact-battle .br3-card{flex:0 0 190px!important}
    main.brc-compact-battle .br3-ability{flex-basis:220px!important}
    main.brc-compact-battle .ccr-weapons{display:flex!important;overflow-x:auto!important;gap:6px!important;padding-bottom:4px!important;scrollbar-width:thin}
    main.brc-compact-battle .ccr-weapon{flex:0 0 210px!important}
    main.brc-compact-battle .ccr-order{display:flex!important;overflow-x:auto!important;gap:6px!important;padding-bottom:4px!important;scrollbar-width:thin}
    main.brc-compact-battle .ccr-order-row{flex:0 0 180px!important}
    main.brc-compact-battle [data-br3-turn]{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important}
    main.brc-compact-battle [data-br3-turn] button{width:auto!important;min-width:118px!important}
    main.brc-compact-battle .br3-log{max-height:160px!important}
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
    [creatures,weapons,abilities,order].forEach(x=>x?.classList.remove('brc-creatures-card','brc-weapons-card','brc-abilities-card','brc-order-card'));
    creatures?.classList.add('brc-creatures-card');weapons?.classList.add('brc-weapons-card');abilities?.classList.add('brc-abilities-card');order?.classList.add('brc-order-card');
    const wanted=[turn,creatures,weapons,abilities,order].filter(Boolean);let anchor=left.firstElementChild;
    for(const el of wanted){if(el===anchor){anchor=anchor?.nextElementSibling;continue}left.insertBefore(el,anchor)}
  }finally{brcApplying=false}
}
function brcSoon(ms=40){clearTimeout(brcTimer);brcTimer=setTimeout(brcArrange,ms)}
new MutationObserver(()=>brcSoon(50)).observe(BRC_APP,{childList:true,subtree:true});
window.addEventListener('resize',()=>brcSoon(30));
setInterval(()=>{if(window.__catlakBattleRoomOpen===true)brcSoon(0)},1800);
setTimeout(()=>brcSoon(0),220);
window.__catlakBattleCompactTest={arrange:brcArrange};
