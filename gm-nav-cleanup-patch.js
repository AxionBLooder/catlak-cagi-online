const GNC_APP=document.querySelector('#app');
const GNC_S=window.__catlakSupabase||null;
if(!GNC_APP)throw new Error('GM navigasyon temizliği başlatılamadı.');

const gncTxt=e=>String(e?.textContent||'').trim();
const gncIsGM=()=>gncTxt(GNC_APP.querySelector('.role'))==='GM';
const gncSheet=()=>!gncIsGM()&&GNC_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab==='sheet';
const gncToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(gncToast.t);gncToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let gncQueued=false,gncLogClearBusy=false;

if(!document.querySelector('#gnc-player-rest-style')){
  const s=document.createElement('style');s.id='gnc-player-rest-style';s.textContent=`
  #app *{text-shadow:none!important}
  #app .card,#app section.hero,#app .stat,#app button,#app [class*="card"],#app [class*="panel"],#app .gmt-slot,#app .er-sub,#app .er-event,#app .er-result,#app .iw-player-item,#app .ccr-weapon,#app .ccr-order-row{box-shadow:none!important;filter:none!important}

  #app main.ps-player-sheet .ps-sheet-grid{gap:12px!important}
  #app main.ps-player-sheet .ps-main-column,#app main.ps-player-sheet .ps-side-column{gap:10px!important}
  #app main.ps-player-sheet section.hero{padding:13px!important;gap:10px!important;border-radius:13px!important;box-shadow:none!important}
  #app main.ps-player-sheet section.hero h1{font-size:clamp(1.35rem,2.1vw,1.9rem)!important;line-height:1.08!important;margin:.03em 0 .12em!important}
  #app main.ps-player-sheet section.hero>div:first-child>p{font-size:.82rem!important;line-height:1.3!important;margin:.12rem 0!important}
  #app main.ps-player-sheet section.hero .vitals{min-width:215px!important;gap:6px!important}
  #app main.ps-player-sheet section.hero .vital{padding:7px 8px!important;border-radius:10px!important;min-width:0!important}
  #app main.ps-player-sheet section.hero .vital span{font-size:.58rem!important;letter-spacing:.1em!important}
  #app main.ps-player-sheet section.hero .vital b{font-size:1.15rem!important}
  #app main.ps-player-sheet .qol-rest{display:flex!important;align-items:center!important;gap:6px!important;flex-wrap:wrap!important;margin-top:7px!important}
  #app main.ps-player-sheet .qol-rest button{min-height:34px!important;padding:7px 10px!important;border-color:#866b39!important;background:#17140d!important;color:#f4d584!important;font-size:.82rem!important;font-weight:900!important;box-shadow:none!important}
  #app main.ps-player-sheet .qol-rest span{font-size:.69rem!important;line-height:1.28!important;color:var(--muted)!important}
  #app main.ps-player-sheet .ps-stat-card{padding:12px!important}
  #app main.ps-player-sheet .ps-stat-card .section-title{margin-bottom:7px!important}
  #app main.ps-player-sheet .stats{gap:6px!important}
  #app main.ps-player-sheet .stat{min-height:86px!important;padding:9px!important;border-radius:11px!important;box-shadow:none!important}
  #app main.ps-player-sheet .stat:hover{box-shadow:none!important}
  #app main.ps-player-sheet .stat strong{font-size:1.45rem!important}
  #app main.ps-player-sheet .ps-side-column>.card{padding:11px!important}
  #app main.ps-player-sheet .ps-side-column .ps-combat-card{order:-50!important;padding:11px!important;border-radius:12px!important;box-shadow:none!important}
  #app main.ps-player-sheet .ps-combat-card .ps-combat-row{gap:8px!important;align-items:center!important}
  #app main.ps-player-sheet .ps-combat-card h2{font-size:.98rem!important;margin:.12rem 0!important}
  #app main.ps-player-sheet .ps-combat-card .ps-turn-self,#app main.ps-player-sheet .ps-combat-card .ps-turn-other{font-size:.82rem!important;line-height:1.25!important}
  #app main.ps-player-sheet .ps-combat-card button{min-height:35px!important;padding:7px 10px!important;font-size:.8rem!important;white-space:nowrap!important;box-shadow:none!important}
  #app main.ps-player-sheet [data-gmt-player-panel],#app main.ps-player-sheet .cc-player-gm-note,#app main.ps-player-sheet .ps-roll-card{padding:11px!important}

  #app main.brc-compact-battle.bra-action-layout.qol-compact [data-br3-turn]{min-height:72px!important;padding:12px 14px!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact [data-br3-turn] h2{font-size:1.08rem!important;line-height:1.15!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact [data-br3-turn] .mini{font-size:.78rem!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact .brc-creatures-card,
  #app main.brc-compact-battle.bra-action-layout.qol-compact .brc-weapons-card,
  #app main.brc-compact-battle.bra-action-layout.qol-compact .brc-abilities-card,
  #app main.brc-compact-battle.bra-action-layout.qol-compact .brc-order-card{padding:14px!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact .br3-card,
  #app main.brc-compact-battle.bra-action-layout.qol-compact .ccr-weapon{padding:12px!important;border-radius:13px!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact .br3-card h3,
  #app main.brc-compact-battle.bra-action-layout.qol-compact .ccr-weapon h3{font-size:1rem!important;line-height:1.25!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact .br3-pill{font-size:.78rem!important;padding:4px 8px!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact .br3-note{font-size:.84rem!important;line-height:1.4!important;display:block!important;-webkit-line-clamp:unset!important;overflow:visible!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact .br3-target-line{font-size:.86rem!important;line-height:1.35!important;padding:8px 10px!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact .br3-card button,
  #app main.brc-compact-battle.bra-action-layout.qol-compact .br3-card select,
  #app main.brc-compact-battle.bra-action-layout.qol-compact .ccr-weapon button{min-height:42px!important;font-size:.9rem!important;padding:8px 11px!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact .ccr-order-row{padding:8px 9px!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact .ccr-order-row .mini{font-size:.72rem!important;line-height:1.3!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact [data-br3-log]{padding:14px!important;min-height:220px!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact .br3-log{max-height:300px!important}
  #app main.brc-compact-battle.bra-action-layout.qol-compact .br3-log-row .mini{font-size:.86rem!important;line-height:1.42!important}

  #app [data-gnc-clear-battle-log]{margin-left:6px!important;min-height:34px!important;padding:7px 10px!important;font-size:.78rem!important;box-shadow:none!important}
  #app .er-head{flex-wrap:wrap!important}

  @media(min-width:760px){
    #app main.brc-compact-battle.bra-action-layout.qol-compact .ccr-battle-grid>div:first-child{display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;align-items:start!important}
    #app main.brc-compact-battle.bra-action-layout.qol-compact .ccr-battle-grid>div:first-child>[data-br3-turn]{grid-column:1/5!important;grid-row:1!important}
    #app main.brc-compact-battle.bra-action-layout.qol-compact .ccr-battle-grid>div:first-child>.brc-order-card{grid-column:5/13!important;grid-row:1!important}
  }
  @media(max-width:1050px){#app main.ps-player-sheet section.hero .vitals{min-width:0!important}}
  @media(max-width:700px){
    #app main.ps-player-sheet section.hero{padding:11px!important}
    #app main.ps-player-sheet .qol-rest{align-items:stretch!important}
    #app main.ps-player-sheet .qol-rest button,#app main.ps-player-sheet .qol-rest span{width:100%!important}
    #app main.ps-player-sheet .ps-combat-card .ps-combat-row{align-items:stretch!important;flex-direction:column!important}
    #app main.ps-player-sheet .ps-combat-card button{width:100%!important}
  }
  `;document.head.appendChild(s)
}

function gncEnsureRest(){
  if(!gncSheet())return;
  GNC_APP.querySelectorAll('main .cc-character-stack').forEach(st=>{
    const hero=st.querySelector('section.hero'),hp=hero?.querySelector('[data-a="hp"][data-id]'),lead=hero?.querySelector(':scope > div:first-child');
    if(!hero||!hp||!lead)return;
    let box=st.querySelector('[data-qol-rest]');
    if(!box){box=document.createElement('div');box.className='qol-rest';box.dataset.qolRest='1';lead.appendChild(box)}
    else if(box.parentElement!==lead)lead.appendChild(box);
    const note=box.querySelector('span');
    if(note)note.textContent='HP • KP • büyü / yetenek / özel güç kullanımları yenilenir.';
  })
}

function gncAlignBattleTop(){
  if(gncIsGM()||window.__catlakBattleRoomOpen!==true)return;
  const main=GNC_APP.querySelector('main.brc-compact-battle'),left=main?.querySelector('.ccr-battle-grid>div:first-child');
  if(!left)return;
  const turn=left.querySelector(':scope > [data-br3-turn]');
  const order=left.querySelector(':scope > .brc-order-card')||left.querySelector(':scope > section.card .ccr-order')?.closest('section.card');
  if(!turn||!order)return;
  order.classList.add('brc-order-card');
  if(turn.nextElementSibling!==order)turn.insertAdjacentElement('afterend',order);
}

function gncEnsureRollLogClear(){
  if(!gncIsGM()||GNC_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab!=='rolls')return;
  const playerClear=GNC_APP.querySelector('main [data-er-clear="player"]');
  if(!playerClear||GNC_APP.querySelector('[data-gnc-clear-battle-log]'))return;
  const b=document.createElement('button');
  b.type='button';b.className='danger small';b.dataset.gncClearBattleLog='1';b.textContent='🧹 Canlı Akışı Sil';
  playerClear.insertAdjacentElement('afterend',b);
}

async function gncClearBattleLog(btn){
  if(gncLogClearBusy||!GNC_S||!gncIsGM())return;
  if(!confirm('Savaş günlüğündeki Canlı Akış tamamen silinsin mi?'))return;
  gncLogClearBusy=true;btn.disabled=true;
  try{
    const r=await GNC_S.rpc('catlak_gm_clear_battle_log');
    if(r.error)throw r.error;
    gncToast(`Canlı Akış temizlendi${r.data!=null?' • '+r.data+' kayıt':''}.`);
  }catch(e){gncToast('Canlı Akış temizlenemedi: '+(e?.message||String(e)))}
  finally{gncLogClearBusy=false;if(btn.isConnected)btn.disabled=false}
}

async function gncRefillKpAfterRest(btn,id){
  if(!GNC_S||!btn?.isConnected)return;
  await new Promise(r=>setTimeout(r,0));
  if(!btn.disabled)return;
  for(let i=0;i<30&&btn.isConnected&&btn.disabled;i++)await new Promise(r=>setTimeout(r,80));
  if(!btn.isConnected||btn.disabled)return;
  const snap=await GNC_S.rpc('catlak_player_combat_snapshot');
  if(snap.error||snap.data?.in_combat)return;
  const stack=btn.closest('.cc-character-stack');
  if(!stack?.querySelector('[data-ps-kp],section.vampire'))return;
  const kp=await GNC_S.rpc('catlak_update_vampire_kp',{p_character_id:id,p_delta:999});
  if(kp.error)return;
  setTimeout(gncEnsureRest,60);
}

function gncClean(){
  gncQueued=false;
  if(gncIsGM()){
    GNC_APP.querySelectorAll('.nav [data-ccr-hub]').forEach(x=>x.remove());
    gncEnsureRollLogClear();
  }else{
    gncEnsureRest();gncAlignBattleTop();
  }
}
function gncSchedule(){if(gncQueued)return;gncQueued=true;requestAnimationFrame(gncClean)}
window.addEventListener('click',e=>{
  const c=e.target.closest?.('[data-gnc-clear-battle-log]');
  if(c){e.preventDefault();e.stopImmediatePropagation();gncClearBattleLog(c);return}
  const b=e.target.closest?.('[data-qol-long-rest]');
  if(b&&gncSheet())gncRefillKpAfterRest(b,b.dataset.qolLongRest).catch(()=>{})
},true);

let gncStatsOpening=false;
function gncOpenStatsWorkshop(){
  if(!gncIsGM()||gncStatsOpening)return false;
  const nav=GNC_APP.querySelector('.nav'),stat=nav?.querySelector('[data-cc-stats-tab]'),render=window.__catlakRenderCompactStats;
  if(!stat||typeof render!=='function')return false;
  gncStatsOpening=true;
  window.__catlakGmHubOwnsMain=false;
  window.__catlakCreatureLibraryOpen=false;
  window.__catlakGmToolsOpen=false;
  const main=GNC_APP.querySelector('main');
  if(main){delete main.dataset.sspStableView;delete main.dataset.gmtTools;delete main.dataset.qolCreatureLibrary}
  nav.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));
  stat.classList.add('on');
  window.__catlakRouteGeneration=(window.__catlakRouteGeneration||0)+1;
  window.__catlakRouteLoading?.('Stat Atölyesi');
  requestAnimationFrame(()=>Promise.resolve(render(true)).catch(e=>gncToast('Stat Atölyesi açılamadı: '+(e?.message||String(e)))).finally(()=>{gncStatsOpening=false}));
  return true;
}
window.addEventListener('click',e=>{
  const b=e.target.closest?.('#app [data-gm2-route="stats"]');
  if(!b||!gncIsGM())return;
  e.preventDefault();e.stopImmediatePropagation();
  if(gncOpenStatsWorkshop())return;
  let tries=0;
  const retry=()=>{if(gncOpenStatsWorkshop())return;if(++tries<20)setTimeout(retry,25);else gncToast('Stat Atölyesi yükleyicisi hazır değil.')};
  setTimeout(retry,0);
},true);

new MutationObserver(gncSchedule).observe(GNC_APP,{childList:true,subtree:true});
setInterval(gncClean,1200);
setTimeout(gncClean,80);
window.__catlakGmNavCleanupTest={clean:gncClean,ensureRest:gncEnsureRest,alignBattleTop:gncAlignBattleTop,ensureRollLogClear:gncEnsureRollLogClear,openStatsWorkshop:gncOpenStatsWorkshop};