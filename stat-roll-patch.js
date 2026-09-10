const SR_S=window.__catlakSupabase;
const SR_APP=document.querySelector('#app');
if(!SR_S||!SR_APP)throw new Error('Çatlak Çağı stat zar katmanı başlatılamadı.');

const SR_STATS=new Set(['STR','DEX','CON','INT','WIS','CHA']);
const srTxt=e=>String(e?.textContent||'').trim();
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
  `;
  document.head.appendChild(s);
}

function srCharId(stack){
  return stack?.querySelector('section.hero [data-a="hp"][data-id]')?.dataset.id||'';
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
window.__catlakStatRollTest={ensure:srEnsure,stats:SR_STATS};
