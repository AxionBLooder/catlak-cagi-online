const GFS_S=window.__catlakSupabase;
const GFS_APP=document.querySelector('#app');
if(!GFS_S||!GFS_APP)throw new Error('Çatlak Çağı oyun akışı stabilite katmanı başlatılamadı.');

const gfsTxt=e=>String(e?.textContent||'').trim();
const gfsEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gfsNum=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;
const gfsIsGM=()=>gfsTxt(GFS_APP.querySelector('.role'))==='GM';
const gfsTab=()=>GFS_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const gfsToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(gfsToast.t);gfsToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let gfsBusy=false,gfsTurnBusy=false,gfsTurnTimer=null,gfsTurnSig='';

if(!document.querySelector('#gfs-style')){
  const s=document.createElement('style');s.id='gfs-style';s.textContent=`
  #app [data-gfs-live-turn]{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px!important;margin-bottom:14px!important;border-color:#35546b!important;background:linear-gradient(135deg,#0a1b29,#0c1723 62%,#181725)!important}
  #app [data-gfs-live-turn].enemy-turn{border-color:#85643f!important;box-shadow:inset 0 0 0 1px #c08b4630,var(--shadow)}
  #app [data-gfs-live-turn] h2{font-size:1.12rem!important;margin:.12rem 0 .25rem!important}
  #app [data-gfs-live-turn] p{margin:0!important}
  #app [data-gfs-live-turn] .gfs-turn-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  #app [data-gfs-skip-creature]{min-width:190px}
  @media(max-width:680px){#app [data-gfs-live-turn]{align-items:stretch;flex-direction:column}#app [data-gfs-skip-creature]{width:100%}}
  `;document.head.appendChild(s)
}

function gfsFreeze(ms=1200,reason='flow'){
  if(typeof window.__catlakStabilityFreeze==='function')return window.__catlakStabilityFreeze(ms,reason);
  const until=Date.now()+Math.max(200,Number(ms)||1200);
  window.__catlakUiFreezeUntil=Math.max(Number(window.__catlakUiFreezeUntil)||0,until);
  window.__catlakUiFreezeReason=reason;
  window.__catlakUiFreezeScrollY=window.scrollY;
}
function gfsPrimeDiceFreeze(e){
  const t=e.target?.closest?.('#app button[data-a="stat"],#app button[data-a="weapon"],#app [data-sr-stat],#app [data-dx-gm-roll-kind],#app [data-er-private],#app [data-er-event]');
  if(t)gfsFreeze(1500,'dice');
}
window.addEventListener('pointerdown',gfsPrimeDiceFreeze,true);
window.addEventListener('click',gfsPrimeDiceFreeze,true);

function gfsLiveTableOpen(){
  return gfsIsGM()&&gfsTab()==='gm'&&window.__catlakGmToolsOpen!==true&&window.__catlakGmHubOwnsMain!==true;
}
async function gfsLoadTurn(){
  const sr=await GFS_S.from('catlak_combat_state').select('active,name,round,current_combatant_id,updated_at').eq('id',1).maybeSingle();
  if(sr.error)throw sr.error;const state=sr.data||{};
  if(!state.active||!state.current_combatant_id)return{state,current:null};
  const cr=await GFS_S.from('catlak_combatants').select('id,name,kind,initiative,hp_current,hp_max').eq('id',state.current_combatant_id).maybeSingle();
  if(cr.error)throw cr.error;return{state,current:cr.data||null};
}
function gfsTurnMarkup(d){
  const s=d.state||{},c=d.current;if(!s.active)return'';
  if(!c)return'<div><div class="eyebrow">SAVAŞ SIRASI</div><h2>Tur bekleniyor</h2><p class="muted">Savaş aktif; sıradaki katılımcı belirleniyor.</p></div>';
  const enemy=c.kind==='enemy';
  return `<div><div class="eyebrow">SAVAŞ SIRASI • ROUND ${gfsNum(s.round,1)}</div><h2>Sıra: ${gfsEsc(c.name||'—')}</h2><p class="muted">${enemy?'Bu yaratık saldırmadan da turunu bitirebilirsin.':'Oyuncu turu aktif. Oyuncu Savaş Odası’ndan turunu bitirdiğinde sıra otomatik ilerler.'}</p></div><div class="gfs-turn-actions">${enemy?'<button type="button" class="primary" data-gfs-skip-creature>Yaratık Turunu Geç ▶</button>':'<span class="tag">OYUNCU TURU</span>'}</div>`;
}
async function gfsRenderTurn(force=false){
  if(gfsTurnBusy)return;
  const main=GFS_APP.querySelector('main');
  if(!gfsLiveTableOpen()||!main){main?.querySelector('[data-gfs-live-turn]')?.remove();gfsTurnSig='';return}
  gfsTurnBusy=true;
  try{
    const d=await gfsLoadTurn();if(!gfsLiveTableOpen()||GFS_APP.querySelector('main')!==main)return;
    const sig=JSON.stringify([d.state?.active,d.state?.round,d.state?.current_combatant_id,d.state?.updated_at,d.current?.id,d.current?.name,d.current?.kind,d.current?.hp_current]);
    if(!force&&sig===gfsTurnSig&&main.querySelector('[data-gfs-live-turn]'))return;gfsTurnSig=sig;
    let box=main.querySelector('[data-gfs-live-turn]');
    if(!d.state?.active){box?.remove();return}
    if(!box){box=document.createElement('section');box.className='card';box.dataset.gfsLiveTurn='1';const hero=main.querySelector('section.card.hero');hero?.after(box);if(!box.isConnected)main.prepend(box)}
    box.classList.toggle('enemy-turn',d.current?.kind==='enemy');
    const html=gfsTurnMarkup(d);if(box.innerHTML!==html)box.innerHTML=html;
  }catch(e){if(force)gfsToast('Savaş sırası yüklenemedi: '+(e?.message||String(e)))}finally{gfsTurnBusy=false}
}
function gfsScheduleTurn(force=false,delay=70){clearTimeout(gfsTurnTimer);gfsTurnTimer=setTimeout(()=>gfsRenderTurn(force),delay)}

async function gfsStableGmRefresh(){
  if(!gfsIsGM())return;
  const main=GFS_APP.querySelector('main');
  if(window.__catlakGmToolsOpen===true&&main){
    main.dataset.gmtTools='';
    if(typeof window.gmtRender==='function')await window.gmtRender(true);
    await new Promise(r=>setTimeout(r,0));
    if(typeof window.__catlakCombatEnhancementsTest?.renderGM==='function')await window.__catlakCombatEnhancementsTest.renderGM(true);
    window.__catlakGmCombatV3Test?.normalizeCustomForm?.();
    window.__catlakGmCombatV3Test?.compact?.();
  }
  gfsScheduleTurn(true,40);
}
async function gfsRun(fn){
  if(gfsBusy)return;gfsBusy=true;gfsFreeze(900,'combat-action');
  try{await fn()}catch(e){gfsToast(e?.message||String(e))}finally{gfsBusy=false}
}
async function gfsAddTemplate(id){
  if(!id)throw new Error('Yaratık şablonu bulunamadı.');
  const sr=await GFS_S.from('catlak_combat_state').select('active').eq('id',1).maybeSingle();if(sr.error)throw sr.error;if(!sr.data?.active)throw new Error('Önce savaşı başlat.');
  const r=await GFS_S.rpc('catlak_gm_combat_add_template',{p_template_id:id,p_initiative:null});if(r.error)throw r.error;
  gfsToast('Yaratık savaşa eklendi.');await gfsStableGmRefresh();
}
async function gfsAddLegacyEnemy(){
  const name=GFS_APP.querySelector('#gmt-enemy-name')?.value.trim()||'';if(!name)throw new Error('Düşman adı gerekli.');
  const raw=GFS_APP.querySelector('#gmt-enemy-init')?.value??'';
  const r=await GFS_S.rpc('catlak_gm_combat_add_enemy',{p_name:name,p_hp:Math.max(1,gfsNum(GFS_APP.querySelector('#gmt-enemy-hp')?.value,10)),p_ac:gfsNum(GFS_APP.querySelector('#gmt-enemy-ac')?.value,10),p_initiative:raw===''?null:gfsNum(raw)});if(r.error)throw r.error;
  gfsToast('Düşman savaşa eklendi.');await gfsStableGmRefresh();
}
async function gfsAddCharacter(){
  const cid=GFS_APP.querySelector('#gmt-add-char')?.value||'';if(!cid)throw new Error('Eklenecek oyuncu yok.');
  const raw=GFS_APP.querySelector('#gmt-char-init')?.value??'';
  const r=await GFS_S.rpc('catlak_gm_combat_add_character',{p_character_id:cid,p_initiative:raw===''?null:gfsNum(raw)});if(r.error)throw r.error;
  gfsToast('Oyuncu savaşa eklendi.');await gfsStableGmRefresh();
}
async function gfsEndCombat(){
  const r=await GFS_S.rpc('catlak_gm_combat_end');if(r.error)throw r.error;
  gfsToast('Savaş sona erdi. Savaş alanı temizlendi.');gfsTurnSig='';await gfsStableGmRefresh();
}
async function gfsSkipCreature(){
  const r=await GFS_S.rpc('catlak_gm_skip_creature_turn');if(r.error)throw r.error;
  gfsToast(`${r.data?.skipped_name||'Yaratık'} turu geçildi${r.data?.current_name?' • Sıra: '+r.data.current_name:''}`);gfsTurnSig='';await gfsStableGmRefresh();gfsScheduleTurn(true,20);
}

window.addEventListener('click',e=>{
  if(!gfsIsGM())return;
  const add=e.target?.closest?.('[data-cex-template-add]');
  if(add){e.preventDefault();e.stopImmediatePropagation();gfsRun(()=>gfsAddTemplate(add.dataset.cexTemplateAdd));return}
  const legacy=e.target?.closest?.('[data-gmt-add-enemy]');
  if(legacy){e.preventDefault();e.stopImmediatePropagation();gfsRun(gfsAddLegacyEnemy);return}
  const char=e.target?.closest?.('[data-gmt-add-char]');
  if(char){e.preventDefault();e.stopImmediatePropagation();gfsRun(gfsAddCharacter);return}
  const end=e.target?.closest?.('[data-gmt-combat-end]');
  if(end){e.preventDefault();e.stopImmediatePropagation();if(confirm('Savaş sona erdirilsin mi?'))gfsRun(gfsEndCombat);return}
  const skip=e.target?.closest?.('[data-gfs-skip-creature]');
  if(skip){e.preventDefault();e.stopImmediatePropagation();gfsRun(gfsSkipCreature);return}
},true);

new MutationObserver(()=>{if(gfsLiveTableOpen())gfsScheduleTurn(false,120);else{GFS_APP.querySelector('[data-gfs-live-turn]')?.remove();gfsTurnSig=''}}).observe(GFS_APP,{childList:true,subtree:true});
GFS_S.channel('cc-game-flow-stability')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>gfsScheduleTurn(true,50))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>gfsScheduleTurn(true,70))
 .subscribe();
setInterval(()=>{if(gfsLiveTableOpen())gfsScheduleTurn(false,0)},3000);
setTimeout(()=>gfsScheduleTurn(true,0),160);
window.__catlakGameFlowStabilityTest={renderTurn:gfsRenderTurn,skipCreature:gfsSkipCreature,stableGmRefresh:gfsStableGmRefresh,freeze:gfsFreeze};
