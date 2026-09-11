const CEX_S=window.__catlakSupabase;
const CEX_APP=document.querySelector('#app');
if(!CEX_S||!CEX_APP)throw new Error('Çatlak Çağı savaş iyileştirmeleri başlatılamadı.');

const cexText=e=>String(e?.textContent||'').trim();
const cexEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cexNum=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;
const cexIsGM=()=>cexText(CEX_APP.querySelector('.role'))==='GM';
const cexToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(cexToast.t);cexToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
const cexTime=x=>{try{return new Date(x).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}catch{return''}};
let cexBusy=false,cexTimer=null,cexGmSig='',cexPlayerSig='';

if(!document.querySelector('#cex-style')){
  const s=document.createElement('style');s.id='cex-style';s.textContent=`
  .cex-panel{margin-top:12px}.cex-library-form{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:9px;align-items:end}.cex-library-form .wide{grid-column:span 2}.cex-library-form textarea{min-height:66px}
  .cex-template-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px;margin-top:10px}.cex-template{border:1px solid var(--line);border-radius:12px;padding:11px;background:#0a1622}.cex-template h3{margin:3px 0 7px}.cex-tags{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}.cex-tag{font-size:.75rem;border:1px solid var(--line);border-radius:999px;padding:3px 7px}.cex-sub{margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
  .cex-gm-attack{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,.7fr) auto;gap:8px;align-items:end}.cex-current-enemy{padding:9px 10px;border:1px solid #4a3e27;border-radius:10px;background:#17150f}.cex-result{margin-top:9px;border:1px solid var(--line);border-radius:10px;padding:9px 10px;background:#09131e}.cex-result.hit{border-color:#4f7b4e}.cex-result.miss{border-color:#784c4c}
  .cex-turn-box{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px;border:1px solid var(--line);border-radius:14px;background:#0a1622;margin:10px 0}.cex-turn-box.active{border-color:var(--gold);box-shadow:inset 0 0 0 1px #d6ad5b44}.cex-turn-box .primary{min-width:150px}
  .cex-log{display:flex;flex-direction:column;gap:7px}.cex-log-row{display:grid;grid-template-columns:52px minmax(0,1fr);gap:8px;padding:8px 0;border-bottom:1px solid var(--line)}.cex-log-row:last-child{border-bottom:0}.cex-log-row time{font-size:.72rem;color:var(--muted)}.cex-log-row.combat b{color:#f1c36f}.cex-log-row.turn b{color:#8fd4ff}
  @media(max-width:900px){.cex-library-form{grid-template-columns:1fr 1fr}.cex-library-form .wide{grid-column:span 2}.cex-gm-attack{grid-template-columns:1fr}}
  @media(max-width:560px){.cex-library-form{grid-template-columns:1fr}.cex-library-form .wide{grid-column:span 1}}
  `;document.head.appendChild(s);
}

function cexGmCombatOpen(){
  if(!cexIsGM()||window.__catlakGmToolsOpen!==true)return false;
  const on=CEX_APP.querySelector('.gmt-tabs button.on');
  return cexText(on)==='Savaş & Durumlar';
}

async function cexLoadGmData(){
  const [tr,sr,br]=await Promise.all([
    CEX_S.from('catlak_creature_templates').select('*').order('name',{ascending:true}),
    CEX_S.from('catlak_combat_state').select('*').eq('id',1).maybeSingle(),
    CEX_S.from('catlak_combatants').select('id,character_id,name,kind,initiative,hp_current,hp_max,ac,attack_name,attack_formula,damage_formula,creature_type').order('initiative',{ascending:false}).order('created_at',{ascending:true})
  ]);
  for(const r of [tr,sr,br])if(r.error)throw r.error;
  return{templates:tr.data||[],state:sr.data||{},combatants:br.data||[]};
}

function cexTemplateHtml(t,active){
  return `<article class="cex-template"><div class="eyebrow">${cexEsc(t.creature_type||'YARATIK')}</div><h3>${cexEsc(t.name)}</h3><div class="cex-tags"><span class="cex-tag">HP ${cexNum(t.hp)}</span><span class="cex-tag">AC ${cexNum(t.ac)}</span>${t.attack_name?`<span class="cex-tag">${cexEsc(t.attack_name)}</span>`:''}${t.damage_formula?`<span class="cex-tag">${cexEsc(t.damage_formula)}</span>`:''}</div>${t.public_note?`<div class="mini muted">${cexEsc(t.public_note)}</div>`:''}<div class="actions" style="margin-top:9px"><button type="button" class="primary" data-cex-template-add="${cexEsc(t.id)}" ${active?'':'disabled'}>Savaşa Ekle</button><button type="button" data-cex-template-edit="${cexEsc(t.id)}">Düzenle</button><button type="button" class="danger" data-cex-template-del="${cexEsc(t.id)}">Sil</button></div></article>`;
}

function cexGmPanelHtml(d){
  const active=!!d.state?.active;
  const current=d.combatants.find(x=>String(x.id)===String(d.state?.current_combatant_id));
  const players=d.combatants.filter(x=>x.kind==='player'&&cexNum(x.hp_current)>0);
  const currentEnemy=current?.kind==='enemy'?current:null;
  const playerOpts=players.map(x=>`<option value="${cexEsc(x.id)}">${cexEsc(x.name)} • HP ${cexNum(x.hp_current)}/${cexNum(x.hp_max)} • AC ${cexNum(x.ac)}</option>`).join('');
  return `<section class="card cex-panel" data-cex-gm-panel>
    <div class="eyebrow">YARATIK KÜTÜPHANESİ</div><h2>Kaydet • Tek Tıkla Savaşa Ekle</h2><p class="muted">Sık kullandığın yaratıkları bir kez kaydet. Aynı isimle tekrar kaydedersen şablon güncellenir.</p>
    <div class="cex-library-form">
      <label>Ad<input id="cex-name" placeholder="Örn. Goblin"></label>
      <label>Tür<input id="cex-type" placeholder="Örn. Goblinoid"></label>
      <label>HP<input id="cex-hp" type="number" min="1" value="10"></label>
      <label>AC<input id="cex-ac" type="number" min="0" value="10"></label>
      <label>Saldırı adı<input id="cex-attack-name" placeholder="Örn. Kısa Kılıç"></label>
      <label>Saldırı<input id="cex-attack" placeholder="Örn. 1d20+4"></label>
      <label>Hasar<input id="cex-damage" placeholder="Örn. 1d6+2"></label>
      <label class="wide">Oyuncuya görünen not<textarea id="cex-note" placeholder="Örn. Çevik, korkak ve sürü halinde tehlikeli."></textarea></label>
      <button type="button" class="primary" data-cex-template-save>Şablonu Kaydet</button>
    </div>
    <div class="cex-template-grid">${d.templates.length?d.templates.map(t=>cexTemplateHtml(t,active)).join(''):'<div class="muted">Henüz kayıtlı yaratık yok.</div>'}</div>
    <div class="cex-sub"><div class="eyebrow">YARATIK SALDIRISI</div><h2>GM → Oyuncu</h2>
      ${!active?'<div class="muted">Savaş başladığında yaratık saldırı paneli açılır.</div>':!currentEnemy?`<div class="muted">Şu an sıra <b>${cexEsc(current?.name||'—')}</b>. Yaratık sırası geldiğinde saldırı açılır.</div>`:!players.length?'<div class="muted">Savaşta hedeflenebilir oyuncu yok.</div>':`<div class="cex-gm-attack"><div class="cex-current-enemy"><b>${cexEsc(currentEnemy.name)}</b><div class="mini muted">${cexEsc(currentEnemy.attack_name||'Saldırı')} • ${cexEsc(currentEnemy.attack_formula||'1d20')} • Hasar ${cexEsc(currentEnemy.damage_formula||'—')}</div></div><label>Hedef<select id="cex-gm-target">${playerOpts}</select></label><button type="button" class="primary" data-cex-gm-attack="${cexEsc(currentEnemy.id)}">⚔ Oyuncuya Saldır</button></div>`}
      <div data-cex-gm-result></div>
    </div>
  </section>`;
}

async function cexRenderGM(force=false){
  if(!cexGmCombatOpen())return;
  const main=CEX_APP.querySelector('main'),left=main?.querySelector('.gmt-grid > .gmt-stack');if(!main||!left)return;
  try{
    const d=await cexLoadGmData();
    if(!cexGmCombatOpen()||CEX_APP.querySelector('main')!==main)return;
    const sig=JSON.stringify([d.state?.active,d.state?.current_combatant_id,d.templates.map(t=>[t.id,t.name,t.updated_at]),d.combatants.map(x=>[x.id,x.hp_current,x.hp_max,x.ac,x.kind,x.name,x.attack_formula,x.damage_formula])]);
    if(!force&&sig===cexGmSig&&main.querySelector('[data-cex-gm-panel]'))return;cexGmSig=sig;
    main.querySelector('[data-cex-gm-panel]')?.remove();
    const holder=document.createElement('div');holder.innerHTML=cexGmPanelHtml(d);const sec=holder.firstElementChild;
    const order=[...left.querySelectorAll('section.card')].find(s=>cexText(s.querySelector('.eyebrow'))==='TUR SIRASI');
    order?left.insertBefore(sec,order):left.appendChild(sec);
  }catch(e){if(force)cexToast('Savaş iyileştirmeleri yüklenemedi: '+(e?.message||String(e)))}
}

function cexTemplateArgs(){
  return{
    p_name:CEX_APP.querySelector('#cex-name')?.value.trim()||'',
    p_creature_type:CEX_APP.querySelector('#cex-type')?.value.trim()||'',
    p_hp:Math.max(1,cexNum(CEX_APP.querySelector('#cex-hp')?.value,10)),
    p_ac:Math.max(0,cexNum(CEX_APP.querySelector('#cex-ac')?.value,10)),
    p_attack_name:CEX_APP.querySelector('#cex-attack-name')?.value.trim()||'',
    p_attack_formula:CEX_APP.querySelector('#cex-attack')?.value.trim()||'',
    p_damage_formula:CEX_APP.querySelector('#cex-damage')?.value.trim()||'',
    p_note:CEX_APP.querySelector('#cex-note')?.value.trim()||''
  };
}
async function cexSaveTemplate(){
  const a=cexTemplateArgs();if(!a.p_name)throw new Error('Şablon adı gerekli.');
  const r=await CEX_S.rpc('catlak_gm_save_creature_template',a);if(r.error)throw r.error;
  cexToast(`${a.p_name} yaratık kütüphanesine kaydedildi.`);cexGmSig='';await cexRenderGM(true);
}
async function cexAddTemplate(id){
  const r=await CEX_S.rpc('catlak_gm_combat_add_template',{p_template_id:id,p_initiative:null});if(r.error)throw r.error;
  cexToast('Yaratık savaşa eklendi.');cexGmSig='';const m=CEX_APP.querySelector('main');if(m)m.dataset.gmtTools='';
}
async function cexDeleteTemplate(id){
  const r=await CEX_S.rpc('catlak_gm_delete_creature_template',{p_template_id:id});if(r.error)throw r.error;
  cexToast('Yaratık şablonu silindi.');cexGmSig='';await cexRenderGM(true);
}
async function cexEditTemplate(id){
  const r=await CEX_S.from('catlak_creature_templates').select('*').eq('id',id).maybeSingle();if(r.error)throw r.error;const t=r.data;if(!t)return;
  const set=(q,v)=>{const e=CEX_APP.querySelector(q);if(e)e.value=v??''};
  set('#cex-name',t.name);set('#cex-type',t.creature_type);set('#cex-hp',t.hp);set('#cex-ac',t.ac);set('#cex-attack-name',t.attack_name);set('#cex-attack',t.attack_formula);set('#cex-damage',t.damage_formula);set('#cex-note',t.public_note);
  CEX_APP.querySelector('#cex-name')?.focus();
}
async function cexGmAttack(creatureId){
  const target=CEX_APP.querySelector('#cex-gm-target')?.value;if(!target)throw new Error('Hedef oyuncu seç.');
  const r=await CEX_S.rpc('catlak_gm_creature_attack',{p_creature_id:creatureId,p_target_combatant_id:target});if(r.error)throw r.error;
  const d=r.data||{},box=CEX_APP.querySelector('[data-cex-gm-result]');if(box)box.innerHTML=`<div class="cex-result ${d.hit?'hit':'miss'}"><b>${cexEsc(d.creature_name)} → ${cexEsc(d.target_name)}</b><div>${d.attack_total} saldırı • ${d.hit?(d.critical?'KRİTİK İSABET':'İSABET'):'ISKA'}${d.hit?` • ${d.damage_total} hasar • HP ${d.target_hp}/${d.target_hp_max}`:''}</div></div>`;
  cexToast(d.hit?`${d.creature_name}: ${d.damage_total} hasar`:`${d.creature_name}: ISKA`);cexGmSig='';const m=CEX_APP.querySelector('main');if(m)m.dataset.gmtTools='';
}

async function cexPlayerData(){
  const [sr,lr]=await Promise.all([CEX_S.rpc('catlak_player_combat_snapshot'),CEX_S.rpc('catlak_player_battle_log',{p_limit:18})]);
  if(sr.error)throw sr.error;if(lr.error)throw lr.error;return{snap:sr.data||{},logs:lr.data||[]};
}
function cexLogHtml(rows){
  if(!rows.length)return'<div class="muted">Henüz savaş kaydı yok.</div>';
  return `<div class="cex-log">${rows.map(x=>`<div class="cex-log-row ${cexEsc(x.kind)}"><time>${cexTime(x.created_at)}</time><div><b>${x.kind==='turn'?'TUR':'SAVAŞ'}</b><div>${cexEsc(x.message)}</div></div></div>`).join('')}</div>`;
}
function cexEnsurePlayerUi(d){
  if(cexIsGM()||window.__catlakBattleRoomOpen!==true)return;
  const main=CEX_APP.querySelector('main');if(!main)return;
  const s=d.snap||{};
  let turn=main.querySelector('[data-cex-turn]');
  if(!turn){turn=document.createElement('section');turn.className='card';turn.dataset.cexTurn='1';const hero=main.querySelector('section.card.hero');hero?hero.insertAdjacentElement('afterend',turn):main.prepend(turn)}
  turn.innerHTML=`<div class="cex-turn-box ${s.is_my_turn?'active':''}"><div><div class="eyebrow">TUR KONTROLÜ</div><h2>${s.is_my_turn?'Sıra Sende':'Sıra: '+cexEsc(s.current_name||'—')}</h2><div class="muted">${s.is_my_turn?'Saldırını veya aksiyonunu yaptıktan sonra turunu bitir.':'Sıra sana geldiğinde buton otomatik açılır.'}</div></div><button type="button" class="primary" data-cex-end-turn ${s.is_my_turn?'':'disabled'}>Turumu Bitir ▶</button></div>`;

  let log=main.querySelector('[data-cex-log]');
  if(!log){log=document.createElement('section');log.className='card';log.dataset.cexLog='1';const aside=main.querySelector('.ccr-battle-grid aside');aside?aside.appendChild(log):main.appendChild(log)}
  log.innerHTML=`<div class="eyebrow">SAVAŞ GÜNLÜĞÜ</div><h2>Canlı Akış</h2>${cexLogHtml(d.logs)}`;
}
async function cexRenderPlayer(force=false){
  if(cexIsGM()||window.__catlakBattleRoomOpen!==true)return;
  try{
    const d=await cexPlayerData();
    const sig=JSON.stringify([d.snap?.round,d.snap?.current_combatant_id,d.snap?.is_my_turn,d.snap?.current_name,d.logs.map(x=>[x.id,x.message,x.created_at])]);
    if(!force&&sig===cexPlayerSig&&CEX_APP.querySelector('[data-cex-turn]'))return;cexPlayerSig=sig;cexEnsurePlayerUi(d);
  }catch(e){if(force)cexToast('Savaş akışı yüklenemedi: '+(e?.message||String(e)))}
}
async function cexEndTurn(){
  const r=await CEX_S.rpc('catlak_player_end_turn');if(r.error)throw r.error;
  cexToast(`Tur bitti${r.data?.name?' • Sıra: '+r.data.name:''}`);cexPlayerSig='';
  if(window.__catlakRoomSystemTest?.renderBattle)await window.__catlakRoomSystemTest.renderBattle(true);
  await cexRenderPlayer(true);
}

async function cexDo(fn){if(cexBusy)return;cexBusy=true;try{await fn()}catch(e){cexToast(e?.message||String(e))}finally{cexBusy=false}}
document.addEventListener('click',e=>{
  const save=e.target.closest?.('[data-cex-template-save]');if(save){e.preventDefault();e.stopImmediatePropagation();cexDo(cexSaveTemplate);return}
  const add=e.target.closest?.('[data-cex-template-add]');if(add){e.preventDefault();e.stopImmediatePropagation();cexDo(()=>cexAddTemplate(add.dataset.cexTemplateAdd));return}
  const edit=e.target.closest?.('[data-cex-template-edit]');if(edit){e.preventDefault();e.stopImmediatePropagation();cexDo(()=>cexEditTemplate(edit.dataset.cexTemplateEdit));return}
  const del=e.target.closest?.('[data-cex-template-del]');if(del){e.preventDefault();e.stopImmediatePropagation();if(confirm('Bu yaratık şablonu silinsin mi?'))cexDo(()=>cexDeleteTemplate(del.dataset.cexTemplateDel));return}
  const atk=e.target.closest?.('[data-cex-gm-attack]');if(atk){e.preventDefault();e.stopImmediatePropagation();cexDo(()=>cexGmAttack(atk.dataset.cexGmAttack));return}
  const end=e.target.closest?.('[data-cex-end-turn]');if(end){e.preventDefault();e.stopImmediatePropagation();cexDo(cexEndTurn);return}
},true);

function cexInstall(){if(cexIsGM())cexRenderGM();else cexRenderPlayer()}
function cexSoon(ms=80){clearTimeout(cexTimer);cexTimer=setTimeout(cexInstall,ms)}
new MutationObserver(()=>cexSoon()).observe(CEX_APP,{childList:true,subtree:true});
CEX_S.channel('cc-combat-enhancements-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{cexGmSig='';cexPlayerSig='';cexSoon(60)}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{cexGmSig='';cexPlayerSig='';cexSoon(60)}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_creature_templates'},()=>{cexGmSig='';cexSoon(60)}).subscribe();
setInterval(()=>cexInstall(),1400);
setTimeout(()=>cexInstall(),260);
window.__catlakCombatEnhancementsTest={renderGM:cexRenderGM,renderPlayer:cexRenderPlayer};
