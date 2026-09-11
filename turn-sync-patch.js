const CTS_S=window.__catlakSupabase;
const CTS_APP=document.querySelector('#app');
if(!CTS_S||!CTS_APP)throw new Error('Çatlak Çağı tur senkronizasyonu başlatılamadı.');

const ctsTxt=e=>String(e?.textContent||'').trim();
const ctsEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ctsIsGM=()=>ctsTxt(CTS_APP.querySelector('.role'))==='GM';
const ctsBattleView=()=>window.__catlakBattleRoomV3Test?.isBattleView?.()===true||window.__catlakBattleRoomOpen===true||CTS_APP.querySelector('.nav [data-ccr-battle]')?.classList.contains('on');
const ctsToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(ctsToast.t);ctsToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let ctsGmBusy=false,ctsPlayerBusy=false,ctsGmSig='',ctsPlayerSig='',ctsGmTimer=null,ctsPlayerTimer=null;

if(!document.querySelector('#cts-style')){
  const s=document.createElement('style');s.id='cts-style';s.textContent=`
  #app [data-gfs-live-turn]{display:none!important}
  #app [data-cts-turn-card]{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px!important;margin:0 0 10px!important;border-color:#35546b!important;background:#0a1723!important}
  #app [data-cts-turn-card].enemy{border-color:#8b673d!important;box-shadow:inset 0 0 0 1px #c08b4630}
  #app [data-cts-turn-card] h2{margin:.1rem 0 .2rem!important;font-size:1.08rem!important}
  #app [data-cts-turn-card] .cts-name{color:var(--gold)}
  #app [data-cts-skip]{min-width:185px}
  @media(max-width:680px){#app [data-cts-turn-card]{align-items:stretch;flex-direction:column}#app [data-cts-skip]{width:100%}}
  `;document.head.appendChild(s)
}

function ctsGmSurface(){
  if(!ctsIsGM())return false;
  const main=CTS_APP.querySelector('main');if(!main)return false;
  if(window.__catlakGmToolsOpen===true&&main.querySelector('.gmt-tabs [data-gmt-sub="combat"].on'))return true;
  const tab=CTS_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
  return tab==='gm'&&window.__catlakGmHubOwnsMain!==true;
}
async function ctsLoadTurn(){
  const sr=await CTS_S.from('catlak_combat_state').select('active,name,round,current_combatant_id,updated_at').eq('id',1).maybeSingle();
  if(sr.error)throw sr.error;let state=sr.data||{};
  if(state.active&&!state.current_combatant_id){
    const cr=await CTS_S.from('catlak_combatants').select('id',{count:'exact',head:true});if(cr.error)throw cr.error;
    if((cr.count||0)>0){const nr=await CTS_S.rpc('catlak_gm_combat_next_turn');if(nr.error)throw nr.error;const rr=await CTS_S.from('catlak_combat_state').select('active,name,round,current_combatant_id,updated_at').eq('id',1).maybeSingle();if(rr.error)throw rr.error;state=rr.data||state}
  }
  if(!state.active||!state.current_combatant_id)return{state,current:null};
  const cr=await CTS_S.from('catlak_combatants').select('id,name,kind,initiative,hp_current,hp_max').eq('id',state.current_combatant_id).maybeSingle();
  if(cr.error)throw cr.error;return{state,current:cr.data||null};
}
function ctsPlaceGmCard(main,box){
  if(window.__catlakGmToolsOpen===true){const shell=main.querySelector('.gmt-shell');const head=shell?.querySelector(':scope > section.card:first-child');if(head){head.insertAdjacentElement('afterend',box);return}}
  const hero=main.querySelector('section.card.hero');if(hero){hero.after(box);return}
  main.prepend(box);
}
function ctsTurnHtml(d){
  const s=d.state||{},c=d.current;if(!s.active)return'';
  if(!c)return'<div><div class="eyebrow">SAVAŞ SIRASI</div><h2>Sıra hazırlanıyor…</h2><div class="mini muted">Aktif katılımcı belirleniyor.</div></div>';
  const enemy=c.kind==='enemy';
  return `<div><div class="eyebrow">SAVAŞ SIRASI • ROUND ${Number(s.round)||1}</div><h2>Sıra: <span class="cts-name">${ctsEsc(c.name||'—')}</span></h2><div class="mini muted">${enemy?'Yaratığın saldırmasını istemiyorsan turunu doğrudan geçebilirsin.':'Oyuncu turu aktif; Savaş Odası aksiyonları artık bu turu kullanır.'}</div></div><div>${enemy?'<button type="button" class="primary" data-cts-skip>Yaratık Turunu Geç ▶</button>':'<span class="tag">OYUNCU TURU</span>'}</div>`;
}
async function ctsRenderGm(force=false){
  if(ctsGmBusy)return;const main=CTS_APP.querySelector('main');if(!ctsGmSurface()||!main){main?.querySelector('[data-cts-turn-card]')?.remove();ctsGmSig='';return}
  ctsGmBusy=true;
  try{const d=await ctsLoadTurn();if(!ctsGmSurface()||CTS_APP.querySelector('main')!==main)return;const sig=JSON.stringify([d.state?.active,d.state?.round,d.state?.current_combatant_id,d.state?.updated_at,d.current?.id,d.current?.name,d.current?.kind,d.current?.hp_current]);if(!force&&sig===ctsGmSig&&main.querySelector('[data-cts-turn-card]'))return;ctsGmSig=sig;let box=main.querySelector('[data-cts-turn-card]');if(!d.state?.active){box?.remove();return}if(!box){box=document.createElement('section');box.className='card';box.dataset.ctsTurnCard='1'}ctsPlaceGmCard(main,box);box.classList.toggle('enemy',d.current?.kind==='enemy');const html=ctsTurnHtml(d);if(box.innerHTML!==html)box.innerHTML=html}catch(e){if(force)ctsToast('Savaş sırası alınamadı: '+(e?.message||String(e)))}finally{ctsGmBusy=false}
}
function ctsScheduleGm(force=false,ms=50){clearTimeout(ctsGmTimer);ctsGmTimer=setTimeout(()=>ctsRenderGm(force),ms)}
async function ctsSkip(){if(ctsGmBusy)return;ctsGmBusy=true;try{const r=await CTS_S.rpc('catlak_gm_skip_creature_turn');if(r.error)throw r.error;ctsToast(`${r.data?.skipped_name||'Yaratık'} turu geçildi${r.data?.current_name?' • Sıra: '+r.data.current_name:''}`);ctsGmSig=''}finally{ctsGmBusy=false;ctsScheduleGm(true,0);setTimeout(()=>window.__catlakBattleRoomV3Test?.render?.(true),20)}}

async function ctsSyncPlayer(force=false){
  if(ctsIsGM()||!ctsBattleView()||ctsPlayerBusy)return;ctsPlayerBusy=true;
  try{const r=await CTS_S.rpc('catlak_player_combat_snapshot');if(r.error)throw r.error;const s=r.data||{};const sig=JSON.stringify([s.active,s.round,s.current_combatant_id,s.combatant_id,s.in_combat,s.is_my_turn,s.updated_at]);if(force||sig!==ctsPlayerSig){ctsPlayerSig=sig;window.__catlakBattleRoomV3Test?.render?.(true)}}catch(e){if(force)ctsToast('Oyuncu turu senkronize edilemedi: '+(e?.message||String(e)))}finally{ctsPlayerBusy=false}
}
function ctsSchedulePlayer(force=false,ms=30){clearTimeout(ctsPlayerTimer);ctsPlayerTimer=setTimeout(()=>ctsSyncPlayer(force),ms)}

document.addEventListener('click',e=>{const skip=e.target.closest?.('[data-cts-skip]');if(skip){e.preventDefault();e.stopImmediatePropagation();ctsSkip().catch(x=>ctsToast(x?.message||String(x)));return}if(!ctsIsGM()&&e.target.closest?.('[data-ccr-battle]'))ctsSchedulePlayer(true,80)},true);
new MutationObserver(()=>{if(ctsIsGM())ctsScheduleGm(false,100);else if(ctsBattleView())ctsSchedulePlayer(false,100)}).observe(CTS_APP,{childList:true,subtree:true});
CTS_S.channel('cc-turn-sync')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{if(ctsIsGM())ctsScheduleGm(true,10);else ctsSchedulePlayer(true,10)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{if(ctsIsGM())ctsScheduleGm(true,20);else ctsSchedulePlayer(true,20)})
 .subscribe();
setInterval(()=>{if(ctsIsGM()){if(ctsGmSurface())ctsScheduleGm(false,0)}else if(ctsBattleView())ctsSchedulePlayer(false,0)},900);
setTimeout(()=>{ctsScheduleGm(true,0);ctsSchedulePlayer(true,0)},180);
window.__catlakTurnSyncTest={renderGm:ctsRenderGm,syncPlayer:ctsSyncPlayer,skip:ctsSkip};