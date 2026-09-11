const FUP_APP=document.querySelector('#app');
if(!FUP_APP)throw new Error('Son arayüz düzeni başlatılamadı.');

const fupTxt=e=>String(e?.textContent||'').trim();
const fupIsGM=()=>fupTxt(FUP_APP.querySelector('.role'))==='GM';
const fupSheet=()=>!fupIsGM()&&FUP_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab==='sheet';
const fupBattle=()=>!fupIsGM()&&(window.__catlakBattleRoomOpen===true||FUP_APP.querySelector('.nav [data-ccr-battle]')?.classList.contains('on')||FUP_APP.querySelector('main')?.dataset.ccrBattle==='1'||!!FUP_APP.querySelector('main .ccr-battle-grid'));
let fupQueued=false,fupBattlePrepTimer=null,fupLibraryOpen=false;

if(!document.querySelector('#fup-style')){
  const s=document.createElement('style');s.id='fup-style';s.textContent=`
  html.fup-battle-prep #app main .ccr-battle-grid{visibility:hidden!important}
  html.fup-battle-prep #app main.fup-battle-ready .ccr-battle-grid{visibility:visible!important}
  #app main.brc-compact-battle.qol-compact .brc-weapons-card .ccr-weapons{grid-template-columns:1fr!important;gap:7px!important}
  #app main.brc-compact-battle.qol-compact .brc-weapons-card{grid-column:4/9!important}
  #app main.brc-compact-battle.qol-compact .brc-abilities-card{grid-column:9/13!important}
  #app main.brc-compact-battle.qol-compact .ccr-weapon [data-bcs-classic-rolls]{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;width:100%!important}
  #app main.brc-compact-battle.qol-compact .ccr-weapon [data-bcs-classic-rolls] button{width:100%!important;min-width:0!important;min-height:36px!important;padding:7px 8px!important;white-space:normal!important;line-height:1.15!important}
  #app main.brc-compact-battle.qol-compact .ccr-weapon [data-br3-weapon-actions],
  #app main.brc-compact-battle.qol-compact .ccr-weapon [data-br3-weapon-actions] .actions,
  #app main.brc-compact-battle.qol-compact .ccr-weapon [data-br3-strike]{width:100%!important}
  #app .ps-player-sheet section.hero .qol-rest{display:flex!important;align-items:center!important;gap:7px!important;margin-top:9px!important;flex-wrap:wrap!important}
  #app .ps-player-sheet section.hero .qol-rest button{min-height:34px!important;padding:7px 11px!important;border-color:#7b6235!important;background:#17150f!important;color:#f2d284!important;font-weight:900!important}
  #app .ps-player-sheet section.hero .qol-rest span{font-size:.7rem!important;color:var(--muted)!important}
  #app .ps-player-sheet [data-gmt-player-panel] .gmt-player-two>div:nth-child(2){display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important;align-items:start!important}
  #app .ps-player-sheet [data-gmt-player-panel] .gmt-player-two>div:nth-child(2)>.eyebrow,
  #app .ps-player-sheet [data-gmt-player-panel] .gmt-player-two>div:nth-child(2)>h2,
  #app .ps-player-sheet [data-gmt-player-panel] .gmt-player-two>div:nth-child(2)>p,
  #app .ps-player-sheet [data-gmt-player-panel] .gmt-player-two>div:nth-child(2)>[data-psea-equipment-grid],
  #app .ps-player-sheet [data-gmt-player-panel] .gmt-player-two>div:nth-child(2)>[data-psea-abilities]{grid-column:1/-1!important}
  #app .ps-player-sheet [data-gmt-player-panel] .gmt-player-two>div:nth-child(2)>.gmt-slot{margin:0!important;border:1px solid #304354!important;border-radius:11px!important;padding:9px!important;background:#07131e!important;display:block!important;min-width:0!important}
  #app .ps-player-sheet [data-gmt-player-panel] .gmt-player-two>div:nth-child(2)>.gmt-slot:last-of-type{grid-column:1/-1!important}
  #app .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important}
  #app .gm2-centerbar [data-fup-creatures]{border-color:#49657a!important}
  #app .gm2-centerbar [data-fup-creatures].on{border-color:var(--gold)!important;color:var(--gold)!important;background:#18170f!important}
  @media(max-width:700px){
    #app main.brc-compact-battle.qol-compact .brc-weapons-card,#app main.brc-compact-battle.qol-compact .brc-abilities-card{grid-column:1/-1!important}
    #app .ps-player-sheet [data-gmt-player-panel] .gmt-player-two>div:nth-child(2){grid-template-columns:repeat(2,minmax(0,1fr))!important}
  }
  `;document.head.appendChild(s)
}

function fupEnsureLongRest(){
  if(!fupSheet())return;
  FUP_APP.querySelectorAll('main .cc-character-stack').forEach(st=>{
    if(st.querySelector('[data-qol-rest]'))return;
    const id=st.querySelector('section.hero [data-a="hp"][data-id]')?.dataset.id||'';
    const lead=st.querySelector('section.hero>:first-child');if(!id||!lead)return;
    const b=document.createElement('div');b.className='qol-rest';b.dataset.qolRest='1';
    b.innerHTML=`<button type="button" data-qol-long-rest="${String(id).replace(/"/g,'&quot;')}">☾ Uzun Dinlenme</button><span>HP + sınırlı yetenek kullanımları dolar.</span>`;
    lead.appendChild(b)
  })
}

function fupEnsureEquipment(){
  if(!fupSheet())return;
  FUP_APP.querySelectorAll('main [data-gmt-player-panel]').forEach(panel=>{
    const two=panel.querySelector('.gmt-player-two');if(!two)return;
    const equip=two.children?.[1];if(!equip)return;
    equip.dataset.fupEquipment='1';
    if(!equip.querySelector('[data-psea-equipment-grid]')){
      const slots=[...equip.querySelectorAll(':scope > .gmt-slot')];
      if(slots.length){
        const grid=document.createElement('div');grid.className='psea-equipment-grid';grid.dataset.pseaEquipmentGrid='1';
        equip.insertBefore(grid,slots[0]);slots.forEach(x=>grid.appendChild(x));
      }
    }
  })
}

function fupMarkBattleReady(){
  const main=FUP_APP.querySelector('main');if(!main?.querySelector('.ccr-battle-grid'))return false;
  window.__catlakBattleCompactTest?.arrange?.();
  window.__catlakBattleActionsLayoutTest?.apply?.();
  window.__catlakQualityOfLifeTest?.compact?.();
  requestAnimationFrame(()=>{
    const m=FUP_APP.querySelector('main');if(!m?.querySelector('.ccr-battle-grid'))return;
    m.classList.add('fup-battle-ready');
    document.documentElement.classList.remove('fup-battle-prep')
  });
  return true
}
function fupPrepareBattle(){
  document.documentElement.classList.add('fup-battle-prep');
  FUP_APP.querySelector('main')?.classList.remove('fup-battle-ready');
  clearTimeout(fupBattlePrepTimer);
  let tries=0;
  const tick=()=>{
    if(fupMarkBattleReady())return;
    if(++tries<28){fupBattlePrepTimer=setTimeout(tick,25);return}
    document.documentElement.classList.remove('fup-battle-prep')
  };
  fupBattlePrepTimer=setTimeout(tick,0)
}
function fupMaintainBattle(){
  if(!fupBattle()){document.documentElement.classList.remove('fup-battle-prep');FUP_APP.querySelector('main')?.classList.remove('fup-battle-ready');return}
  const main=FUP_APP.querySelector('main');
  if(main?.querySelector('.ccr-battle-grid')){
    window.__catlakBattleCompactTest?.arrange?.();window.__catlakBattleActionsLayoutTest?.apply?.();window.__catlakQualityOfLifeTest?.compact?.();main.classList.add('fup-battle-ready');document.documentElement.classList.remove('fup-battle-prep')
  }
}

function fupEnsureCreatureRoute(){
  if(!fupIsGM())return;
  const bar=FUP_APP.querySelector('[data-gm2-centerbar]');if(!bar)return;
  const manage=bar.querySelector('[data-gm2-route="characters"]');if(!manage)return;
  let btn=bar.querySelector('[data-fup-creatures]');
  if(!btn){btn=document.createElement('button');btn.type='button';btn.dataset.fupCreatures='1';btn.textContent='Yaratık Kütüphanesi'}
  btn.classList.toggle('on',fupLibraryOpen);
  if(btn.nextElementSibling!==manage)bar.insertBefore(btn,manage);
  if(manage!==bar.lastElementChild)bar.appendChild(manage)
}
function fupOpenCreatureLibrary(){
  if(!fupIsGM())return;fupLibraryOpen=true;fupEnsureCreatureRoute();
  const open=FUP_APP.querySelector('.nav [data-gmt-open]');open?.click();
  let tries=0;
  const wait=()=>{
    if(!fupLibraryOpen)return;
    const combat=FUP_APP.querySelector('.gmt-tabs [data-gmt-sub="combat"]');if(combat&&!combat.classList.contains('on'))combat.click();
    const panel=FUP_APP.querySelector('[data-cex-gm-panel]');
    if(panel){fupEnsureCreatureRoute();requestAnimationFrame(()=>panel.scrollIntoView({block:'start',behavior:'auto'}));return}
    if(++tries<50)setTimeout(wait,55)
  };setTimeout(wait,35)
}
function fupCloseLibraryIntent(target){
  if(!fupLibraryOpen)return;
  if(target?.closest?.('[data-fup-creatures]'))return;
  if(target?.closest?.('[data-gm2-route],[data-gmt-sub],.nav button')){fupLibraryOpen=false;fupEnsureCreatureRoute()}
}

function fupMaintain(){fupEnsureLongRest();fupEnsureEquipment();fupEnsureCreatureRoute();fupMaintainBattle()}
function fupQueue(){if(fupQueued)return;fupQueued=true;requestAnimationFrame(()=>{fupQueued=false;fupMaintain()})}

window.addEventListener('pointerdown',e=>{
  if(e.target.closest?.('[data-ccr-battle]')){fupPrepareBattle();return}
  if(e.target.closest?.('.nav button:not([data-ccr-battle])'))document.documentElement.classList.remove('fup-battle-prep');
},true);
window.addEventListener('click',e=>{
  const c=e.target.closest?.('[data-fup-creatures]');
  if(c){e.preventDefault();e.stopImmediatePropagation();fupOpenCreatureLibrary();return}
  fupCloseLibraryIntent(e.target)
},true);
new MutationObserver(fupQueue).observe(FUP_APP,{childList:true,subtree:true});
window.addEventListener('resize',fupQueue);
setInterval(fupMaintain,1600);setTimeout(fupMaintain,120);
window.__catlakFinalUiPolishTest={maintain:fupMaintain,prepareBattle:fupPrepareBattle,longRest:fupEnsureLongRest,equipment:fupEnsureEquipment,creatures:fupEnsureCreatureRoute};
