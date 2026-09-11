const SR_S=window.__catlakSupabase;
const SR_APP=document.querySelector('#app');
if(!SR_S||!SR_APP)throw new Error('Çatlak Çağı stat zar katmanı başlatılamadı.');

const SR_STATS=new Set(['STR','DEX','CON','INT','WIS','CHA']);
const srTxt=e=>String(e?.textContent||'').trim();
const srEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const srIsGM=()=>srTxt(SR_APP.querySelector('.role'))==='GM';
const srTab=()=>SR_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const srIsSheet=()=>!srIsGM()&&srTab()==='sheet';
const srToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(srToast.t);srToast.t=setTimeout(()=>t.classList.add('hidden'),3600)};
const srBusy=new Set();

if(!document.querySelector('#sr-stat-roll-style')){
  const s=document.createElement('style');
  s.id='sr-stat-roll-style';
  s.textContent=`
    .ps-player-sheet .pla-static-stats .stat[data-sr-stat],
    .ps-player-sheet .stat[data-sr-stat]{cursor:pointer!important;pointer-events:auto!important}
    .ps-player-sheet .pla-static-stats .stat[data-sr-stat]:hover,
    .ps-player-sheet .stat[data-sr-stat]:hover{transform:translateY(-1px)!important;border-color:#4c6c88!important;background:#102033!important}
    .ps-player-sheet .ps-stat-card{display:none!important}
    .ps-player-sheet [data-sr-quick-rolls]{grid-column:1/-1;margin-top:2px;padding-top:11px;border-top:1px solid #314556}
    .ps-player-sheet .sr-quick-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}
    .ps-player-sheet .sr-quick-head .eyebrow{margin:0}
    .ps-player-sheet .sr-quick-hint{font-size:.7rem;color:var(--muted);white-space:nowrap}
    .ps-player-sheet .sr-quick-grid{display:grid;grid-template-columns:repeat(6,minmax(76px,1fr));gap:7px}
    .ps-player-sheet .sr-quick-stat{min-width:0!important;min-height:66px!important;height:auto!important;padding:7px 8px!important;border:1px solid #31495e!important;border-radius:11px!important;background:#07131f!important;text-align:center!important;box-shadow:none!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:1px!important}
    .ps-player-sheet .sr-quick-stat b{font-size:.68rem!important;letter-spacing:.1em!important;color:#9fb5c7!important}
    .ps-player-sheet .sr-quick-stat strong{font-size:1.35rem!important;line-height:1.05!important}
    .ps-player-sheet .sr-quick-stat small{font-size:.67rem!important;line-height:1.1!important;color:var(--muted)!important}
    @media(max-width:760px){
      .ps-player-sheet .sr-quick-grid{display:flex;overflow-x:auto;gap:6px;padding-bottom:4px;scrollbar-width:thin;overscroll-behavior-x:contain}
      .ps-player-sheet .sr-quick-stat{flex:0 0 84px!important;min-height:62px!important}
      .ps-player-sheet .sr-quick-hint{display:none}
    }
  `;
  document.head.appendChild(s);
}

function srCharId(stack){
  return stack?.querySelector('section.hero [data-a="hp"][data-id]')?.dataset.id||'';
}
function srQuickRolls(stack,cid){
  const hero=stack?.querySelector('section.hero');
  const statCard=stack?.querySelector('.ps-stat-card');
  if(!hero||!statCard||!cid)return;
  const src=[...statCard.querySelectorAll('.stat')].filter(x=>SR_STATS.has(srTxt(x.querySelector('b')).toUpperCase()));
  if(!src.length)return;
  const ordered=[...SR_STATS].map(k=>src.find(x=>srTxt(x.querySelector('b')).toUpperCase()===k)).filter(Boolean);
  const sig=ordered.map(x=>srTxt(x)).join('|');
  let box=hero.querySelector('[data-sr-quick-rolls]');
  if(!box){box=document.createElement('div');box.dataset.srQuickRolls='1';hero.appendChild(box)}
  if(box.dataset.srQuickSig===sig)return;
  box.dataset.srQuickSig=sig;
  box.innerHTML=`<div class="sr-quick-head"><div class="eyebrow">⚄ HIZLI ZARLAR</div><div class="sr-quick-hint">Tek tıkla d20 at</div></div><div class="sr-quick-grid">${ordered.map(x=>{const stat=srTxt(x.querySelector('b')).toUpperCase();return `<button type="button" class="stat sr-quick-stat" data-sr-stat="${srEsc(stat)}" data-sr-character="${srEsc(cid)}">${x.innerHTML}</button>`}).join('')}</div>`;
}
function srEnsure(){
  if(!srIsSheet())return;
  SR_APP.querySelectorAll('main .cc-character-stack').forEach(stack=>{
    const cid=srCharId(stack);if(!cid)return;
    stack.querySelectorAll('.stat').forEach(b=>{
      const stat=srTxt(b.querySelector('b')).toUpperCase();if(!SR_STATS.has(stat))return;
      b.dataset.srStat=stat;b.dataset.srCharacter=cid;
      b.removeAttribute('aria-disabled');b.tabIndex=0;
      const sm=b.querySelector('small');
      if(sm){const clean=srTxt(sm).replace(/\s*•\s*d20(?:\s*at)?\s*$/i,'').trim();if(sm.textContent!==clean)sm.textContent=clean}
    });
    srQuickRolls(stack,cid);
  });
}
async function srRoll(b){
  const stat=String(b.dataset.srStat||srTxt(b.querySelector('b'))).toUpperCase();
  const cid=b.dataset.srCharacter||srCharId(b.closest('.cc-character-stack'));
  if(!SR_STATS.has(stat)||!cid)return;
  const key=`${cid}:${stat}`;if(srBusy.has(key))return;srBusy.add(key);b.disabled=true;
  try{
    const r=await SR_S.rpc('catlak_roll_stat',{p_character_id:cid,p_stat:stat});
    if(r.error)throw r.error;
    const d=r.data||{};srToast(`${d.label||stat}: ${d.total??'?'}`);
    if(window.__catlakPlayerLiveTest?.refresh)setTimeout(()=>window.__catlakPlayerLiveTest.refresh(true),20);
  }catch(e){srToast(e?.message||String(e))}
  finally{srBusy.delete(key);if(b.isConnected)b.disabled=false;srEnsure()}
}
function srCapture(e){
  const b=e.target?.closest?.('.stat');
  if(!b||!srIsSheet()||!b.closest('main'))return;
  const stat=String(b.dataset.srStat||srTxt(b.querySelector('b'))).toUpperCase();if(!SR_STATS.has(stat))return;
  e.preventDefault();e.stopImmediatePropagation();srRoll(b);
}
document.addEventListener('click',srCapture,true);
const srObserver=new MutationObserver(()=>srEnsure());
srObserver.observe(SR_APP,{childList:true,subtree:true});
setInterval(srEnsure,1200);
setTimeout(srEnsure,80);
window.__catlakStatRollTest={ensure:srEnsure,stats:SR_STATS,quickRolls:srQuickRolls};
