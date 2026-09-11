const BCS_S=window.__catlakSupabase;
const BCS_APP=document.querySelector('#app');
if(!BCS_S||!BCS_APP)throw new Error('Çatlak Çağı klasik Savaş Odası stabilitesi başlatılamadı.');

const bcsTxt=e=>String(e?.textContent||'').trim();
const bcsEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bcsNum=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;
const bcsSigned=x=>bcsNum(x)>=0?'+'+bcsNum(x):String(bcsNum(x));
const bcsIsGM=()=>bcsTxt(BCS_APP.querySelector('.role'))==='GM';
const bcsIsPlayer=()=>!!bcsTxt(BCS_APP.querySelector('.role'))&&!bcsIsGM();
const bcsBattleView=()=>{
  const main=BCS_APP.querySelector('main');
  const btn=BCS_APP.querySelector('.nav [data-ccr-battle]');
  return bcsIsPlayer()&&(window.__catlakBattleRoomOpen===true||btn?.classList.contains('on')||main?.dataset.ccrBattle==='1');
};
const bcsToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(bcsToast.t);bcsToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let bcsRecoverBusy=false,bcsActionBusy=false,bcsTimer=null,bcsOrderSig='',bcsLastPointer=null;

if(!document.querySelector('#bcs-style')){
  const s=document.createElement('style');s.id='bcs-style';s.textContent=`
    #app main [data-bcs-legacy-hidden]{display:none!important}
    #app main [data-bcs-classic-rolls]{display:flex!important;gap:6px!important;flex-wrap:wrap!important;margin-top:7px!important}
    #app main [data-bcs-classic-rolls] button{flex:1 1 92px!important;min-width:0!important}
    #app main .ccr-weapon [data-br3-weapon-actions] .actions{margin-top:6px!important}
    #app main .ccr-weapon [data-br3-strike]{width:100%!important}
  `;document.head.appendChild(s)
}

function bcsBaseReady(main){
  if(!main)return false;
  if(main.querySelector('.ccr-battle-grid'))return true;
  return [...main.querySelectorAll('.eyebrow')].some(e=>/SAVAŞ ODASI/i.test(bcsTxt(e)));
}
function bcsFreeze(ms=700,reason='battle-stable-local'){
  const y=window.scrollY;
  window.__catlakStabilityFreeze?.(ms,reason);
  const restore=()=>{if(Math.abs(window.scrollY-y)>2)window.scrollTo({top:y,left:0,behavior:'auto'})};
  requestAnimationFrame(restore);setTimeout(restore,45);setTimeout(restore,160);setTimeout(restore,420);
}
function bcsCleanStrayV3(main){
  main?.querySelectorAll('[data-br3-creatures],[data-br3-abilities],[data-br3-turn],[data-br3-log]').forEach(x=>x.remove());
}
async function bcsRecoverBase(){
  if(bcsRecoverBusy||!bcsBattleView())return;
  const main=BCS_APP.querySelector('main');if(!main||bcsBaseReady(main))return;
  const room=window.__catlakRoomSystemTest?.renderBattle;if(typeof room!=='function')return;
  bcsRecoverBusy=true;
  const btn=BCS_APP.querySelector('.nav [data-ccr-battle]');
  const oldOpen=window.__catlakBattleRoomOpen;
  try{
    bcsCleanStrayV3(main);
    delete main.dataset.ccrBattle;
    window.__catlakBattleRoomOpen=false;
    bcsFreeze(900,'battle-base-recover');
    await room(true);
  }catch(e){bcsToast('Savaş Odası onarılamadı: '+(e?.message||String(e)))}finally{
    window.__catlakBattleRoomOpen=oldOpen||true;
    btn?.classList.add('on');
    bcsRecoverBusy=false;
  }
  const fresh=BCS_APP.querySelector('main');
  if(bcsBaseReady(fresh)){
    await window.__catlakBattleRoomV3Test?.render?.(true);
    window.__catlakBattleCompactTest?.arrange?.();
    window.__catlakBattleActionsLayoutTest?.apply?.();
    bcsEnsureClassicRolls();
  }
}
function bcsScheduleRecover(ms=30){clearTimeout(bcsTimer);bcsTimer=setTimeout(()=>bcsRecoverBase(),ms)}

function bcsEnsureClassicRolls(){
  if(!bcsBattleView())return;
  const main=BCS_APP.querySelector('main');if(!main?.querySelector('.ccr-battle-grid'))return;
  main.querySelectorAll('.ccr-weapon').forEach(card=>{
    const legacy=card.querySelector('[data-ccr-weapon]');
    const inv=card.dataset.br3Inv||legacy?.dataset.ccrWeapon||'';
    if(legacy){
      card.dataset.br3Inv=inv;
      const legacyBox=legacy.closest('.actions');if(legacyBox)legacyBox.dataset.bcsLegacyHidden='1';
    }
    if(!inv)return;
    let box=card.querySelector('[data-bcs-classic-rolls]');
    if(!box){
      box=document.createElement('div');box.className='actions';box.dataset.bcsClassicRolls='1';
      const targetBox=card.querySelector('[data-br3-weapon-actions]');
      targetBox?targetBox.before(box):card.appendChild(box);
    }
    box.innerHTML=`<button type="button" class="primary" data-bcs-roll-weapon="${bcsEsc(inv)}" data-bcs-kind="attack">Saldırı At</button><button type="button" data-bcs-roll-weapon="${bcsEsc(inv)}" data-bcs-kind="damage">Hasar At</button>`;
  });
}
function bcsRecentSection(){
  const main=BCS_APP.querySelector('main');if(!main)return null;
  return [...main.querySelectorAll('section.card')].find(s=>bcsTxt(s.querySelector('.eyebrow'))==='SON ZARLARIN')||null;
}
function bcsRecentHtml(rows){
  if(!rows.length)return'<div class="muted">Henüz savaş zarı yok.</div>';
  return `<div class="ccr-mini-rolls">${rows.map(r=>`<div class="ccr-mini-roll"><div class="die">${r.total==null?'?':bcsEsc(r.total)}</div><div><b>${bcsEsc(r.label||r.roll_kind||'Zar')}</b><div class="mini muted">${bcsEsc(r.formula||'')} ${r.modifier?bcsSigned(r.modifier):''}</div></div></div>`).join('')}</div>`;
}
async function bcsRefreshRecent(){
  if(!bcsBattleView())return;
  const snap=await BCS_S.rpc('catlak_player_combat_snapshot');if(snap.error)throw snap.error;
  const id=snap.data?.character_id;if(!id)return;
  const rr=await BCS_S.from('catlak_rolls').select('id,label,roll_kind,formula,modifier,total,created_at').eq('character_id',id).order('created_at',{ascending:false}).limit(12);if(rr.error)throw rr.error;
  const section=bcsRecentSection();if(!section)return;
  const y=window.scrollY;
  section.innerHTML=`<div class="eyebrow">SON ZARLARIN</div>${bcsRecentHtml(rr.data||[])}`;
  requestAnimationFrame(()=>window.scrollTo({top:y,left:0,behavior:'auto'}));
}
async function bcsRollWeapon(inv,kind){
  if(bcsActionBusy)return;bcsActionBusy=true;bcsFreeze(800,'stable-weapon-roll');
  try{
    const r=await BCS_S.rpc('catlak_roll_weapon',{p_inventory_id:inv,p_action:kind});if(r.error)throw r.error;
    const d=r.data||{};bcsToast(d.total==null?`${d.label||'Zar'}: GM Kararı`:`${d.label||'Zar'}: ${d.total}`);
    await bcsRefreshRecent();
  }finally{bcsActionBusy=false}
}
async function bcsRollStat(stat){
  if(bcsActionBusy)return;bcsActionBusy=true;bcsFreeze(800,'stable-stat-roll');
  try{
    const s=await BCS_S.rpc('catlak_player_combat_snapshot');if(s.error)throw s.error;const id=s.data?.character_id;if(!id)throw new Error('Aktif karakter bulunamadı.');
    const r=await BCS_S.rpc('catlak_roll_stat',{p_character_id:id,p_stat:stat});if(r.error)throw r.error;
    bcsToast(`${r.data?.label||stat}: ${r.data?.total}`);await bcsRefreshRecent();
  }finally{bcsActionBusy=false}
}
function bcsOrderHtml(s){
  return (s?.order||[]).map(x=>`<div class="ccr-order-row ${x.is_current?'current':''} ${x.is_self?'self':''}"><div class="ccr-init">${bcsNum(x.initiative)}</div><div><b>${bcsEsc(x.name)}</b><div class="muted mini">${x.kind==='enemy'?'DÜŞMAN':'OYUNCU'}${x.is_self?' • SEN':''}</div></div>${x.is_current?'<span class="ccr-pill ccr-turn">SIRA</span>':''}</div>`).join('');
}
async function bcsSyncOrder(){
  if(!bcsBattleView())return;
  const order=BCS_APP.querySelector('main .ccr-order');if(!order)return;
  const r=await BCS_S.rpc('catlak_player_combat_snapshot');if(r.error)return;const s=r.data||{};
  const sig=JSON.stringify([(s.order||[]).map(x=>[x.id,x.name,x.kind,x.initiative,x.is_current,x.is_self]),s.round,s.current_combatant_id]);
  if(sig===bcsOrderSig)return;bcsOrderSig=sig;
  const y=window.scrollY;order.innerHTML=bcsOrderHtml(s)||'<div class="muted">Katılımcı yok.</div>';requestAnimationFrame(()=>window.scrollTo({top:y,left:0,behavior:'auto'}));
}
function bcsMaintain(){
  if(!bcsBattleView())return;
  const main=BCS_APP.querySelector('main');if(!main)return;
  if(!bcsBaseReady(main)){bcsScheduleRecover(20);return}
  if(!main.querySelector('.ccr-battle-grid'))return;
  bcsEnsureClassicRolls();
  window.__catlakBattleCompactTest?.arrange?.();window.__catlakBattleActionsLayoutTest?.apply?.();
}
function bcsHandleAction(el){
  const roll=el.closest?.('[data-bcs-roll-weapon],[data-ccr-weapon]');
  if(roll){const inv=roll.dataset.bcsRollWeapon||roll.dataset.ccrWeapon||'',kind=roll.dataset.bcsKind||roll.dataset.kind||'attack';bcsRollWeapon(inv,kind).catch(e=>bcsToast('Zar atılamadı: '+(e?.message||String(e))));return true}
  const stat=el.closest?.('[data-ccr-stat]');
  if(stat){bcsRollStat(stat.dataset.ccrStat).catch(e=>bcsToast('Zar atılamadı: '+(e?.message||String(e))));return true}
  return false;
}
window.addEventListener('pointerdown',e=>{
  if(!bcsBattleView()||bcsIsGM()||(e.button!=null&&e.button!==0))return;
  const el=e.target;if(!bcsHandleAction(el))return;
  bcsLastPointer={el:el.closest?.('[data-bcs-roll-weapon],[data-ccr-weapon],[data-ccr-stat]'),at:Date.now()};
  e.preventDefault();e.stopImmediatePropagation();
},true);
window.addEventListener('click',e=>{
  if(!bcsBattleView()||bcsIsGM())return;
  const el=e.target.closest?.('[data-bcs-roll-weapon],[data-ccr-weapon],[data-ccr-stat]');if(!el)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(e.detail===0&&(!bcsLastPointer||Date.now()-bcsLastPointer.at>450))bcsHandleAction(el);
},true);
window.addEventListener('pointerup',e=>{if(e.target?.closest?.('[data-ccr-battle]'))setTimeout(()=>{bcsMaintain();bcsScheduleRecover(0)},45)},true);
new MutationObserver(()=>{clearTimeout(bcsMaintain.t);bcsMaintain.t=setTimeout(bcsMaintain,35)}).observe(BCS_APP,{childList:true,subtree:true});
BCS_S.channel('cc-battle-classic-stable')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{bcsOrderSig='';setTimeout(()=>{bcsMaintain();bcsSyncOrder()},30)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{bcsOrderSig='';setTimeout(()=>{bcsMaintain();bcsSyncOrder()},30)})
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'catlak_rolls'},()=>setTimeout(()=>bcsRefreshRecent().catch(()=>{}),40))
 .subscribe();
setInterval(()=>{if(bcsBattleView()){bcsMaintain();bcsSyncOrder()}},1800);
setTimeout(()=>{bcsMaintain();bcsScheduleRecover(0)},260);
window.__catlakBattleClassicStableTest={maintain:bcsMaintain,recover:bcsRecoverBase,rolls:bcsRefreshRecent,order:bcsSyncOrder};
