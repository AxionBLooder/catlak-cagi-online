const BRA_APP=document.querySelector('#app');
if(!BRA_APP)throw new Error('Savaş aksiyon yerleşimi başlatılamadı.');
const BRA_S=window.__catlakSupabase||null;

const braTxt=e=>String(e?.textContent||'').trim();
const braEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const braIsPlayer=()=>{const r=braTxt(BRA_APP.querySelector('.role'));return !!r&&r!=='GM'};
const braTime=x=>{try{return new Date(x).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}catch{return''}};
let braQueued=false,braLogBusy=false,braPrepTimer=null;

if(!document.querySelector('#bra-layout-style')){
  const s=document.createElement('style');
  s.id='bra-layout-style';
  s.textContent=`
  html.bra-battle-prep #app main{min-height:360px!important;position:relative!important}
  html.bra-battle-prep #app main>*{visibility:hidden!important;pointer-events:none!important}
  html.bra-battle-prep #app main:before{content:'⚔  Savaş Odası hazırlanıyor…';visibility:visible!important;position:absolute;inset:28px 18px auto;min-height:180px;display:grid;place-items:center;border:1px solid var(--line);border-radius:18px;background:linear-gradient(135deg,#0c1b29,#09131e);color:var(--gold);font-weight:900;font-size:1.05rem;letter-spacing:.02em}
  #app main.bra-action-layout .brc-quick-card{display:none!important}

  #app main.bra-action-layout [data-br3-turn]{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:12px!important;padding:12px 14px!important;min-height:72px!important}
  #app main.bra-action-layout [data-br3-turn] h2{font-size:1.08rem!important;line-height:1.15!important;margin:2px 0!important}
  #app main.bra-action-layout [data-br3-turn] .eyebrow{font-size:.72rem!important;letter-spacing:.12em!important}
  #app main.bra-action-layout [data-br3-turn] .mini{font-size:.78rem!important}
  #app main.bra-action-layout [data-br3-turn] button{min-width:132px!important;min-height:40px!important;padding:8px 12px!important;font-weight:900!important}

  #app main.bra-action-layout .brc-creatures-card,
  #app main.bra-action-layout .brc-weapons-card,
  #app main.bra-action-layout .brc-abilities-card,
  #app main.bra-action-layout .brc-order-card{align-self:start!important;padding:14px!important;border-radius:16px!important}
  #app main.bra-action-layout .brc-creatures-card>h2,
  #app main.bra-action-layout .brc-weapons-card>h2,
  #app main.bra-action-layout .brc-abilities-card>h2,
  #app main.bra-action-layout .brc-order-card h2{font-size:1.15rem!important;line-height:1.2!important;margin:.18rem 0 .48rem!important}
  #app main.bra-action-layout .brc-creatures-card>.eyebrow,
  #app main.bra-action-layout .brc-weapons-card>.eyebrow,
  #app main.bra-action-layout .brc-abilities-card>.eyebrow,
  #app main.bra-action-layout .brc-order-card>.eyebrow{font-size:.74rem!important;letter-spacing:.1em!important}
  #app main.bra-action-layout [data-bra-help]{font-size:.84rem!important;line-height:1.35!important;margin-bottom:8px!important}
  #app main.bra-action-layout .br3-grid{gap:9px!important}
  #app main.bra-action-layout .br3-card,
  #app main.bra-action-layout .ccr-weapon{padding:12px!important;border-radius:13px!important;min-width:0!important}
  #app main.bra-action-layout .br3-card h3,
  #app main.bra-action-layout .ccr-weapon h3{font-size:1rem!important;line-height:1.25!important;margin:4px 0 7px!important}
  #app main.bra-action-layout .br3-card .eyebrow,
  #app main.bra-action-layout .ccr-weapon .eyebrow{font-size:.72rem!important;line-height:1.3!important}
  #app main.bra-action-layout .br3-pills{gap:5px!important;margin:6px 0!important}
  #app main.bra-action-layout .br3-pill{font-size:.78rem!important;padding:4px 8px!important;line-height:1.2!important}
  #app main.bra-action-layout .br3-note{font-size:.84rem!important;line-height:1.4!important;display:block!important;-webkit-line-clamp:unset!important;overflow:visible!important}
  #app main.bra-action-layout .br3-target-line{font-size:.86rem!important;line-height:1.35!important;padding:8px 10px!important;margin:8px 0!important}
  #app main.bra-action-layout .brc-abilities-card label{font-size:.84rem!important;font-weight:800!important}
  #app main.bra-action-layout .brc-abilities-card select{min-height:39px!important;font-size:.88rem!important;padding:7px 9px!important;margin-top:5px!important}
  #app main.bra-action-layout .brc-creatures-card [data-br3-target],
  #app main.bra-action-layout .brc-weapons-card [data-bcs-classic-rolls] button,
  #app main.bra-action-layout .brc-weapons-card [data-br3-strike],
  #app main.bra-action-layout .brc-abilities-card [data-br3-use]{min-height:42px!important;font-size:.9rem!important;font-weight:900!important;padding:8px 11px!important;line-height:1.2!important}
  #app main.bra-action-layout .brc-creatures-card [data-br3-target],
  #app main.bra-action-layout .brc-weapons-card [data-br3-strike],
  #app main.bra-action-layout .brc-abilities-card [data-br3-use]{width:100%!important}
  #app main.bra-action-layout .brc-weapons-card [data-bcs-classic-rolls]{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important;width:100%!important}
  #app main.bra-action-layout .brc-weapons-card [data-bcs-classic-rolls] button{width:100%!important;min-width:0!important;white-space:normal!important}
  #app main.bra-action-layout .brc-abilities-card [data-br3-use]{margin-top:8px!important}

  #app main.bra-action-layout .ccr-order{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(175px,1fr))!important;gap:7px!important}
  #app main.bra-action-layout .ccr-order-row{padding:8px 9px!important;gap:7px!important;border-radius:11px!important}
  #app main.bra-action-layout .ccr-init{font-size:1.05rem!important}
  #app main.bra-action-layout .ccr-order-row .mini{font-size:.72rem!important;line-height:1.3!important}

  #app main.bra-action-layout [data-br3-log]{padding:14px!important;min-height:220px!important}
  #app main.bra-action-layout [data-br3-log]>.eyebrow{font-size:.76rem!important;letter-spacing:.1em!important}
  #app main.bra-action-layout [data-br3-log]>h2{font-size:1.18rem!important;margin:.18rem 0 .55rem!important}
  #app main.bra-action-layout .br3-log{max-height:300px!important;overflow:auto!important;gap:6px!important;padding-right:4px!important}
  #app main.bra-action-layout .br3-log-row{grid-template-columns:56px minmax(0,1fr)!important;padding:8px 0!important;gap:9px!important}
  #app main.bra-action-layout .br3-log-row time{font-size:.74rem!important;line-height:1.35!important}
  #app main.bra-action-layout .br3-log-row b{font-size:.82rem!important}
  #app main.bra-action-layout .br3-log-row .mini{font-size:.86rem!important;line-height:1.42!important}
  #app main.bra-action-layout [data-bra-log-empty]{font-size:.88rem!important;line-height:1.4!important;padding:9px 0!important}

  @media(min-width:1100px){
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid{grid-template-columns:minmax(0,1fr) minmax(300px,.34fr)!important;gap:11px!important;align-items:start!important}
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid>div:first-child{display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:10px!important;align-items:start!important}
    #app main.brc-compact-battle.bra-action-layout [data-br3-turn]{grid-column:1/5!important}
    #app main.brc-compact-battle.bra-action-layout .brc-order-card{grid-column:5/13!important}
    #app main.brc-compact-battle.bra-action-layout .brc-creatures-card{grid-column:1/4!important}
    #app main.brc-compact-battle.bra-action-layout .brc-weapons-card{grid-column:4/8!important}
    #app main.brc-compact-battle.bra-action-layout .brc-abilities-card{grid-column:8/13!important}
    #app main.brc-compact-battle.bra-action-layout .brc-creatures-card .br3-grid,
    #app main.brc-compact-battle.bra-action-layout .brc-abilities-card .br3-grid{grid-template-columns:1fr!important}
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid>aside{display:flex!important;flex-direction:column!important;gap:10px!important;position:sticky!important;top:8px!important;max-height:calc(100vh - 16px)!important;overflow:auto!important;padding:0 3px 0 0!important}
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid>aside>section.card{margin:0!important;min-width:0!important}
  }
  @media(min-width:760px) and (max-width:1099px){
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid{grid-template-columns:1fr!important}
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid>div:first-child{display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:9px!important;align-items:start!important}
    #app main.brc-compact-battle.bra-action-layout [data-br3-turn]{grid-column:1/5!important}
    #app main.brc-compact-battle.bra-action-layout .brc-order-card{grid-column:5/13!important}
    #app main.brc-compact-battle.bra-action-layout .brc-creatures-card{grid-column:1/7!important}
    #app main.brc-compact-battle.bra-action-layout .brc-weapons-card{grid-column:7/13!important}
    #app main.brc-compact-battle.bra-action-layout .brc-abilities-card{grid-column:1/-1!important}
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid>aside{position:static!important;max-height:none!important;overflow:visible!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}
  }
  @media(max-width:759px){
    #app main.bra-action-layout [data-br3-turn]{grid-template-columns:1fr!important}
    #app main.bra-action-layout [data-br3-turn] button{width:100%!important}
    #app main.brc-compact-battle.bra-action-layout .ccr-battle-grid>div:first-child{grid-template-columns:1fr!important}
    #app main.bra-action-layout .brc-creatures-card,
    #app main.bra-action-layout .brc-weapons-card,
    #app main.bra-action-layout .brc-abilities-card,
    #app main.bra-action-layout .brc-order-card{grid-column:1/-1!important;padding:12px!important}
    #app main.bra-action-layout .br3-card button,
    #app main.bra-action-layout .br3-card select{font-size:.92rem!important}
    #app main.bra-action-layout [data-br3-log]{min-height:190px!important;padding:12px!important}
    #app main.bra-action-layout .br3-log{max-height:260px!important}
  }
  `;
  document.head.appendChild(s);
}

function braPlaceCreatureLibrary(){
  const bar=BRA_APP.querySelector('[data-gm2-centerbar]');
  if(!bar)return;
  const builder=bar.querySelector('[data-gm2-route="builder"]');
  const manage=bar.querySelector('[data-gm2-route="characters"]');
  let lib=bar.querySelector('[data-fup-creatures]');
  if(!lib){lib=document.createElement('button');lib.type='button';lib.dataset.fupCreatures='1';lib.textContent='Yaratık Kütüphanesi'}
  if(builder&&builder.nextElementSibling!==lib)builder.insertAdjacentElement('afterend',lib);
  if(manage&&manage!==bar.lastElementChild)bar.appendChild(manage);
}

async function braRefreshLiveLog(){
  if(!BRA_S||braLogBusy||!braIsPlayer())return;
  const sec=BRA_APP.querySelector('main [data-br3-log]');
  if(!sec)return;
  braLogBusy=true;
  try{
    const r=await BRA_S.rpc('catlak_player_battle_log',{p_limit:24});
    if(r.error)throw r.error;
    const rows=r.data||[];
    sec.querySelector('.br3-log')?.remove();sec.querySelector('[data-bra-log-empty]')?.remove();
    if(rows.length){const box=document.createElement('div');box.className='br3-log';box.innerHTML=rows.map(x=>`<div class="br3-log-row"><time>${braTime(x.created_at)}</time><div><b>${x.kind==='turn'?'TUR':'SAVAŞ'}</b><div class="mini">${braEsc(x.message)}</div></div></div>`).join('');sec.appendChild(box)}
    else{const empty=document.createElement('div');empty.className='muted';empty.dataset.braLogEmpty='1';empty.textContent='Canlı akış temiz veya henüz savaş kaydı yok.';sec.appendChild(empty)}
  }catch(e){console.warn('CATLAK_BATTLE_LOG_SYNC',e)}finally{braLogBusy=false}
}

function braBattleReady(main){
  if(!main?.querySelector('.ccr-battle-grid'))return false;
  const turn=main.querySelector('[data-br3-turn]');
  const creatures=main.querySelector('[data-br3-creatures]');
  const abilities=main.querySelector('[data-br3-abilities]');
  const weapons=[...main.querySelectorAll('section.card')].find(x=>braTxt(x.querySelector('.eyebrow'))==='TAKILI SİLAHLAR');
  const order=main.querySelector('.ccr-order')?.closest('section.card');
  return !!(turn&&creatures&&abilities&&weapons&&order);
}
function braStartPrep(){
  if(!braIsPlayer())return;
  document.documentElement.classList.add('bra-battle-prep');
  clearTimeout(braPrepTimer);
  braPrepTimer=setTimeout(()=>document.documentElement.classList.remove('bra-battle-prep'),6500);
}
function braFinishPrep(){clearTimeout(braPrepTimer);document.documentElement.classList.remove('bra-battle-prep')}

function braApply(){
  braQueued=false;braPlaceCreatureLibrary();
  const main=BRA_APP.querySelector('main');if(!main)return;
  const on=braIsPlayer()&&window.__catlakBattleRoomOpen===true&&!!main.querySelector('.ccr-battle-grid');
  main.classList.toggle('bra-action-layout',on);
  if(!on)return;
  window.__catlakBattleCompactTest?.arrange?.();
  main.classList.add('bra-action-layout');
  main.querySelector('.brc-quick-card')?.remove();
  const creatures=main.querySelector('[data-br3-creatures]');
  const h=creatures?.querySelector('h2');
  if(h&&!h.dataset.braLabel){h.dataset.braLabel='1';h.insertAdjacentHTML('afterend','<div class="mini muted" data-bra-help>Hedef seç → silahla vur veya büyü/yetenek kullan.</div>')}
  if(document.documentElement.classList.contains('bra-battle-prep')&&braBattleReady(main))requestAnimationFrame(braFinishPrep);
}
function braQueue(){if(braQueued)return;braQueued=true;requestAnimationFrame(braApply)}

BRA_APP.addEventListener('pointerdown',e=>{if(e.target.closest?.('[data-ccr-battle]'))braStartPrep();else if(e.target.closest?.('.nav button:not([data-ccr-battle])'))braFinishPrep()},true);
BRA_APP.addEventListener('click',e=>{if(e.target.closest?.('[data-ccr-battle]'))braStartPrep()},true);
new MutationObserver(braQueue).observe(BRA_APP,{childList:true,subtree:true});
window.addEventListener('resize',braQueue);
if(BRA_S){BRA_S.channel('cc-battle-log-ui-sync').on('postgres_changes',{event:'*',schema:'public',table:'catlak_session_log'},()=>setTimeout(braRefreshLiveLog,20)).subscribe()}
setInterval(()=>{braPlaceCreatureLibrary();if(braIsPlayer()&&window.__catlakBattleRoomOpen===true){braApply();braRefreshLiveLog()}},2200);
setTimeout(()=>{braQueue();braPlaceCreatureLibrary();braRefreshLiveLog()},180);
window.__catlakBattleActionsLayoutTest={apply:braApply,refreshLog:braRefreshLiveLog,placeCreatureLibrary:braPlaceCreatureLibrary,startPrep:braStartPrep};