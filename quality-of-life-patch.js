const QOL_S=window.__catlakSupabase,QOL_APP=document.querySelector('#app');
if(!QOL_S||!QOL_APP)throw new Error('Çatlak Çağı yaşam kalitesi katmanı başlatılamadı.');
const qolTxt=e=>String(e?.textContent||'').trim();
const qolEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qolGM=()=>qolTxt(QOL_APP.querySelector('.role'))==='GM';
const qolTab=()=>QOL_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const qolSheet=()=>!qolGM()&&qolTab()==='sheet';
const qolBattle=()=>!qolGM()&&(window.__catlakBattleRoomOpen===true||QOL_APP.querySelector('.nav [data-ccr-battle]')?.classList.contains('on')||QOL_APP.querySelector('main')?.dataset.ccrBattle==='1');
const qolToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(qolToast.t);qolToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
const qolN=x=>Math.max(1,Math.min(50,parseInt(x,10)||1));
let qolTimer=null,qolRollTimer=null,qolRestBusy=false,qolBatchBusy=false,qolCreatureBusy=false,qolClearRollBusy=false,qolWeaponSig='',qolCreatureOpen=false,qolCreatureCache=[];

if(!document.querySelector('#qol-style')){
  const s=document.createElement('style');s.id='qol-style';s.textContent=`
  .ps-player-sheet .qol-rest{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}.ps-player-sheet .qol-rest button{padding:7px 10px;min-height:34px;font-weight:850}.ps-player-sheet .qol-rest span{font-size:.72rem;color:var(--muted)}
  .cex-template .qol-count{display:inline-flex;align-items:center;gap:5px;margin:0;font-size:.68rem;color:var(--muted)}.cex-template .qol-count input{width:64px;min-width:64px;min-height:32px;padding:5px 7px;text-align:center}.cex-template .actions:has(.qol-count){display:flex;align-items:end;gap:6px;flex-wrap:wrap}
  #app main:has(.gmt-tabs [data-gmt-sub="combat"].on) [data-cex-gm-panel]>:not(.cex-sub){display:none!important}
  #app main:has(.gmt-tabs [data-gmt-sub="combat"].on) [data-cex-gm-panel]>.cex-sub{margin-top:0!important;padding-top:0!important;border-top:0!important}
  .qol-creature-page{display:flex;flex-direction:column;gap:12px;max-width:1540px;margin:0 auto}.qol-creature-form{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:9px;align-items:end}.qol-creature-form .wide{grid-column:span 2}.qol-creature-form textarea{min-height:68px}.qol-creature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.qol-creature-card{border:1px solid var(--line);border-radius:13px;padding:12px;background:#0a1622}.qol-creature-card h3{margin:4px 0 7px}.qol-creature-tags{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}.qol-creature-tag{font-size:.74rem;border:1px solid var(--line);border-radius:999px;padding:3px 7px}.qol-creature-actions{display:flex;align-items:end;gap:6px;flex-wrap:wrap;margin-top:9px}.qol-creature-actions label{font-size:.68rem;color:var(--muted)}.qol-creature-actions input{width:64px;min-width:64px;min-height:32px;padding:5px 7px;text-align:center}
  #app [data-fup-creatures].on{border-color:var(--gold)!important;color:var(--gold)!important;background:#18170f!important}
  @media(min-width:1100px){#app main.brc-compact-battle.bra-action-layout.qol-compact .ccr-battle-grid>div:first-child{grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:8px!important}#app main.qol-compact [data-br3-turn]{grid-column:1/5!important;min-height:78px!important}#app main.qol-compact .brc-quick-card{grid-column:5/13!important}#app main.qol-compact .brc-creatures-card{grid-column:1/4!important}#app main.qol-compact .brc-weapons-card{grid-column:4/8!important}#app main.qol-compact .brc-abilities-card{grid-column:8/13!important}#app main.qol-compact .brc-order-card{grid-column:1/-1!important}#app main.qol-compact .brc-creatures-card,#app main.qol-compact .brc-weapons-card,#app main.qol-compact .brc-abilities-card,#app main.qol-compact .brc-order-card{padding:8px!important}#app main.qol-compact .br3-card{padding:7px!important}#app main.qol-compact .br3-card h3{font-size:.84rem!important}#app main.qol-compact .br3-card button,#app main.qol-compact .br3-card select{min-height:31px!important;padding:5px 7px!important}}
  @media(min-width:1280px){#app main.brc-compact-battle.bra-action-layout.qol-compact .ccr-battle-grid{grid-template-columns:minmax(0,1.62fr) minmax(280px,.38fr)!important;gap:8px!important}#app main.brc-compact-battle.bra-action-layout.qol-compact .ccr-battle-grid>aside{display:flex!important;flex-direction:column!important;gap:8px!important;position:sticky!important;top:8px!important;max-height:calc(100vh - 16px)!important;overflow:auto!important;padding:0 3px 0 0!important}#app main.qol-compact .ccr-battle-grid>aside>section.card{margin:0!important;padding:8px!important}#app main.qol-compact [data-br3-log] .br3-log{max-height:180px!important}#app main.qol-compact .ccr-mini-rolls{max-height:160px!important}}
  @media(max-width:800px){.qol-creature-form{grid-template-columns:1fr 1fr}.qol-creature-form .wide{grid-column:1/-1}}
  @media(max-width:700px){.ps-player-sheet .qol-rest{align-items:stretch}.ps-player-sheet .qol-rest button{width:100%}.qol-creature-form{grid-template-columns:1fr}.qol-creature-form .wide{grid-column:1}}
  `;document.head.appendChild(s)
}

function qolCharId(st){return st?.querySelector('section.hero [data-a="hp"][data-id]')?.dataset.id||''}
function qolRestUI(){
  if(!qolSheet())return;
  QOL_APP.querySelectorAll('main .cc-character-stack').forEach(st=>{
    const id=qolCharId(st),lead=st.querySelector('section.hero>:first-child');if(!id||!lead)return;
    let b=st.querySelector('[data-qol-rest]');
    if(!b){b=document.createElement('div');b.className='qol-rest';b.dataset.qolRest='1';lead.appendChild(b)}
    const sig=String(id),next=`<button type="button" data-qol-long-rest="${qolEsc(id)}">☾ Uzun Dinlenme</button><span>HP • KP • büyü / yetenek / özel güç kullanımları yenilenir.</span>`;
    if(b.dataset.qolRestSig!==sig){b.innerHTML=next;b.dataset.qolRestSig=sig}
  })
}
function qolPatchHp(id,d){const hp=QOL_APP.querySelector(`section.hero [data-a="hp"][data-id="${CSS.escape(String(id))}"]`),v=hp?.closest('.vital')||hp,b=v?.querySelector?.('b,strong');if(b&&d?.hp_current!=null&&d?.hp_max!=null)b.textContent=`${Number(d.hp_current)}/${Number(d.hp_max)}`}
async function qolLongRest(id){
  if(qolRestBusy)return;
  if(!confirm('Uzun dinlenme yapılsın mı? HP, KP ve sınırlı büyü/yetenek/özel güç kullanımları tamamen yenilenecek.'))return;
  qolRestBusy=true;window.__catlakStabilityFreeze?.(850,'long-rest');
  const b=QOL_APP.querySelector(`[data-qol-long-rest="${CSS.escape(String(id))}"]`);if(b)b.disabled=true;
  try{
    const r=await QOL_S.rpc('catlak_player_long_rest',{p_character_id:id});if(r.error)throw r.error;const d=r.data||{};qolPatchHp(id,d);
    if(QOL_APP.querySelector(`[data-ps-kp],section.vampire`)){const kp=await QOL_S.rpc('catlak_update_vampire_kp',{p_character_id:id,p_delta:999});if(kp.error)console.warn('QOL_KP_REFILL',kp.error)}
    await window.__catlakPlayerSheetEquipmentAbilitiesTest?.paint?.(true);
    qolToast(`Uzun dinlenme tamamlandı • HP ${Number(d.hp_current||0)}/${Number(d.hp_max||0)} • ${Number(d.refilled_abilities||0)} yetenek yenilendi.`)
  }finally{qolRestBusy=false;if(b?.isConnected)b.disabled=false;qolSoon(20)}
}

function qolEnsureCreatureButton(){
  if(!qolGM())return;
  const bar=QOL_APP.querySelector('[data-gm2-centerbar]');if(!bar)return;
  let b=bar.querySelector('[data-gm2-route="creatures"]')||bar.querySelector('[data-fup-creatures]');
  if(b){
    b.dataset.fupCreatures='1';
    b.classList.toggle('on',qolCreatureOpen||window.__catlakGmCenterSelectedRoute==='creatures');
    return;
  }
  const manage=bar.querySelector('[data-gm2-route="characters"]');
  b=document.createElement('button');b.type='button';b.dataset.fupCreatures='1';b.textContent='Yaratık Kütüphanesi';
  b.classList.toggle('on',qolCreatureOpen);
  manage?bar.insertBefore(b,manage):bar.appendChild(b)
}
function qolHideLegacyLibrary(){
  if(!qolGM())return;
  QOL_APP.querySelectorAll('[data-gnc-clear-battle-log]').forEach(x=>x.remove());
  const p=QOL_APP.querySelector('main [data-cex-gm-panel]');if(!p)return;
  const sub=p.querySelector(':scope > .cex-sub');
  [...p.children].forEach(x=>{if(x!==sub)x.style.display='none'});
  if(sub){sub.style.marginTop='0';sub.style.paddingTop='0';sub.style.borderTop='0'}
}
async function qolCreatureData(){
  const [tr,sr]=await Promise.all([
    QOL_S.from('catlak_creature_templates').select('*').order('name',{ascending:true}),
    QOL_S.from('catlak_combat_state').select('active').eq('id',1).maybeSingle()
  ]);
  if(tr.error)throw tr.error;if(sr.error)throw sr.error;
  return{templates:tr.data||[],active:!!sr.data?.active}
}
function qolCreatureCard(t,active){
  return `<article class="qol-creature-card"><div class="eyebrow">${qolEsc(t.creature_type||'YARATIK')}</div><h3>${qolEsc(t.name)}</h3><div class="qol-creature-tags"><span class="qol-creature-tag">HP ${Number(t.hp||0)}</span><span class="qol-creature-tag">AC ${Number(t.ac||0)}</span>${t.attack_name?`<span class="qol-creature-tag">${qolEsc(t.attack_name)}</span>`:''}${t.damage_formula?`<span class="qol-creature-tag">${qolEsc(t.damage_formula)}</span>`:''}</div>${t.public_note?`<div class="mini muted">${qolEsc(t.public_note)}</div>`:''}<div class="qol-creature-actions"><label>Adet <input type="number" min="1" max="50" step="1" value="1" data-qol-creature-count></label><button type="button" class="primary" data-qol-library-add="${qolEsc(t.id)}" ${active?'':'disabled'}>Savaşa Ekle</button><button type="button" data-qol-library-edit="${qolEsc(t.id)}">Düzenle</button><button type="button" class="danger" data-qol-library-delete="${qolEsc(t.id)}">Sil</button></div></article>`
}
function qolCreaturePage(d){
  return `<div class="qol-creature-page" data-qol-creature-page><section class="card"><div class="eyebrow">GM MERKEZİ • YARATIK KÜTÜPHANESİ</div><h1>Yaratık Kütüphanesi</h1><p class="muted">Yaratıkları burada kaydet, düzenle ve aktif savaşa istediğin adet kadar ekle. ${d.active?'Savaş aktif.':'Savaşa eklemek için önce Canlı Oyun / Savaş & Durumlar bölümünden savaşı başlat.'}</p></section><section class="card"><div class="eyebrow">YARATIK ŞABLONU</div><h2>Kaydet / Güncelle</h2><div class="qol-creature-form"><label>Ad<input id="qol-creature-name" placeholder="Örn. Goblin"></label><label>Tür<input id="qol-creature-type" placeholder="Örn. Goblinoid"></label><label>HP<input id="qol-creature-hp" type="number" min="1" value="10"></label><label>AC<input id="qol-creature-ac" type="number" min="0" value="10"></label><label>Saldırı adı<input id="qol-creature-attack-name" placeholder="Örn. Kısa Kılıç"></label><label>Saldırı<input id="qol-creature-attack" placeholder="Örn. 1d20+4"></label><label>Hasar<input id="qol-creature-damage" placeholder="Örn. 1d6+2"></label><label class="wide">Oyuncuya görünen not<textarea id="qol-creature-note"></textarea></label><button type="button" class="primary" data-qol-library-save>Şablonu Kaydet</button></div></section><section class="card"><div class="section-title"><div><div class="eyebrow">KAYITLI YARATIKLAR</div><h2>${d.templates.length} Şablon</h2></div></div>${d.templates.length?`<div class="qol-creature-grid">${d.templates.map(t=>qolCreatureCard(t,d.active)).join('')}</div>`:'<div class="muted">Henüz kayıtlı yaratık yok.</div>'}</section></div>`
}
async function qolRenderCreatureLibrary(force=false){
  if(!qolCreatureOpen||!qolGM()||qolCreatureBusy)return;
  const main=QOL_APP.querySelector('main');if(!main)return;
  if(!force&&main.querySelector('[data-qol-creature-page]')){qolEnsureCreatureButton();return}
  qolCreatureBusy=true;
  try{
    const d=await qolCreatureData();if(!qolCreatureOpen||!qolGM())return;qolCreatureCache=d.templates;
    const holder=document.createElement('div');holder.innerHTML=qolCreaturePage(d);
    main.replaceChildren(holder.firstElementChild);main.dataset.qolCreatureLibrary='1';main.classList.remove('gcv3-compact-gm-combat');
    qolEnsureCreatureButton()
  }catch(e){qolToast('Yaratık Kütüphanesi açılamadı: '+(e?.message||String(e)))}finally{qolCreatureBusy=false}
}
function qolOpenCreatureLibrary(){
  if(!qolGM())return;
  qolCreatureOpen=true;window.__catlakCreatureLibraryOpen=true;window.__catlakGmHubOwnsMain=true;
  qolEnsureCreatureButton();qolRenderCreatureLibrary(true)
}
function qolCloseCreatureLibrary(){
  if(!qolCreatureOpen)return;
  qolCreatureOpen=false;window.__catlakCreatureLibraryOpen=false;window.__catlakGmHubOwnsMain=false;
  const m=QOL_APP.querySelector('main');if(m)delete m.dataset.qolCreatureLibrary;
  qolEnsureCreatureButton()
}
function qolCreatureArgs(){
  return{
    p_name:QOL_APP.querySelector('#qol-creature-name')?.value.trim()||'',
    p_creature_type:QOL_APP.querySelector('#qol-creature-type')?.value.trim()||'',
    p_hp:Math.max(1,Number(QOL_APP.querySelector('#qol-creature-hp')?.value)||10),
    p_ac:Math.max(0,Number(QOL_APP.querySelector('#qol-creature-ac')?.value)||10),
    p_attack_name:QOL_APP.querySelector('#qol-creature-attack-name')?.value.trim()||'',
    p_attack_formula:QOL_APP.querySelector('#qol-creature-attack')?.value.trim()||'',
    p_damage_formula:QOL_APP.querySelector('#qol-creature-damage')?.value.trim()||'',
    p_note:QOL_APP.querySelector('#qol-creature-note')?.value.trim()||''
  }
}
async function qolSaveCreature(){
  if(qolCreatureBusy)return;const a=qolCreatureArgs();if(!a.p_name)throw new Error('Yaratık adı gerekli.');
  qolCreatureBusy=true;try{const r=await QOL_S.rpc('catlak_gm_save_creature_template',a);if(r.error)throw r.error;qolToast(a.p_name+' kaydedildi.')}finally{qolCreatureBusy=false}
  await qolRenderCreatureLibrary(true)
}
async function qolDeleteCreature(id){
  if(!confirm('Bu yaratık şablonu silinsin mi?'))return;
  const r=await QOL_S.rpc('catlak_gm_delete_creature_template',{p_template_id:id});if(r.error)throw r.error;qolToast('Yaratık şablonu silindi.');await qolRenderCreatureLibrary(true)
}
function qolEditCreature(id){
  const t=qolCreatureCache.find(x=>String(x.id)===String(id));if(!t)return;
  const set=(q,v)=>{const e=QOL_APP.querySelector(q);if(e)e.value=v??''};
  set('#qol-creature-name',t.name);set('#qol-creature-type',t.creature_type);set('#qol-creature-hp',t.hp);set('#qol-creature-ac',t.ac);set('#qol-creature-attack-name',t.attack_name);set('#qol-creature-attack',t.attack_formula);set('#qol-creature-damage',t.damage_formula);set('#qol-creature-note',t.public_note);
  QOL_APP.querySelector('#qol-creature-name')?.focus()
}

function qolLibrary(){
  if(!qolGM()||qolCreatureOpen)return;
  QOL_APP.querySelectorAll('main [data-cex-template-add]').forEach(btn=>{
    const c=btn.closest('.cex-template'),a=btn.closest('.actions');if(!c||!a)return;
    if(!c.querySelector('[data-qol-creature-count]')){const l=document.createElement('label');l.className='qol-count';l.innerHTML='Adet <input type="number" min="1" max="50" step="1" value="1" data-qol-creature-count>';a.insertBefore(l,btn)}
    btn.textContent='Savaşa Ekle';btn.title='Adet kadar yaratığı tek işlemde savaşa ekler.'
  })
}
async function qolBatch(btn){
  if(qolBatchBusy)return;qolBatchBusy=true;
  const id=btn.dataset.cexTemplateAdd||btn.dataset.qolLibraryAdd,input=btn.closest('.cex-template,.qol-creature-card')?.querySelector('[data-qol-creature-count]'),count=qolN(input?.value);
  if(input)input.value=String(count);btn.disabled=true;
  try{
    const r=await QOL_S.rpc('catlak_gm_combat_add_template_batch',{p_template_id:id,p_count:count});if(r.error)throw r.error;
    qolToast(`${Number(r.data?.count||count)} yaratık savaşa eklendi.`);
    if(qolCreatureOpen)await qolRenderCreatureLibrary(true)
  }finally{qolBatchBusy=false;if(btn.isConnected)btn.disabled=false;setTimeout(qolLibrary,140)}
}

function qolSlots(){
  if(!qolSheet())return;
  QOL_APP.querySelectorAll('[data-ws-slot-board]').forEach(x=>x.remove());
  const ids=[...QOL_APP.querySelectorAll('main .iw-player-item[data-pla-inv-row]')].map(x=>x.dataset.plaInvRow).filter(Boolean).sort().join('|');
  if(ids!==qolWeaponSig){qolWeaponSig=ids;setTimeout(()=>window.__catlakWeaponSlotTest?.paint?.(true),0)}
}
function qolCompact(){const m=QOL_APP.querySelector('main');if(!m)return;m.classList.toggle('qol-compact',qolBattle()&&m.classList.contains('brc-compact-battle')&&m.classList.contains('bra-action-layout'))}

function qolGuardEmptyTargets(){
  if(!qolBattle())return;
  QOL_APP.querySelectorAll('select[data-br3-ability-target]').forEach(sel=>{
    const has=[...sel.options].some(o=>String(o.value||'').trim());
    if(!has){sel.disabled=true;sel.title='Uygun hedef yok';if(sel.options[0])sel.options[0].textContent='Uygun hedef yok'}
    else if(sel.title==='Uygun hedef yok'){sel.disabled=false;sel.removeAttribute('title')}
  })
}
function qolClearVisibleRolls(){
  QOL_APP.querySelectorAll('[data-roll-id],[data-cc-roll-id],.cc-simple-roll,.cc-roll-line').forEach(x=>x.remove());
  QOL_APP.querySelectorAll('.ps-roll-card').forEach(card=>{
    card.querySelectorAll('.rolls,.empty,[data-qol-roll-empty]').forEach(x=>x.remove());delete card.dataset.plaRollSig;
    const e=document.createElement('div');e.dataset.qolRollEmpty='1';e.className='empty';e.textContent='Henüz zar yok.';card.appendChild(e)
  })
}
async function qolSyncRollsAfterDelete(){
  if(qolSheet()&&typeof window.__catlakPlayerLiveTest?.refresh==='function'){await window.__catlakPlayerLiveTest.refresh(true);return}
  const r=await QOL_S.from('catlak_rolls').select('id',{count:'exact',head:true});if(r.error)return;
  if(Number(r.count||0)===0)qolClearVisibleRolls()
}
async function qolClearAllRolls(btn){
  if(qolClearRollBusy||!qolGM())return;
  if(!confirm('Tüm zar geçmişi silinsin mi? Oyuncu Kağıdı, Canlı Oyun, GM özel zarları ve olay zarları dahil bütün zar kayıtları temizlenecek.'))return;
  qolClearRollBusy=true;if(btn)btn.disabled=true;
  try{
    const r=await QOL_S.rpc('catlak_clear_roll_log');if(r.error)throw r.error;
    qolClearVisibleRolls();qolToast(`${Number(r.data)||0} zar kaydı her yerden silindi.`)
  }catch(e){qolToast('Toplu zar silinemedi: '+(e?.message||String(e)))}finally{qolClearRollBusy=false;if(btn?.isConnected)btn.disabled=false}
}

function qolMaintain(){
  if(qolGM()){
    qolEnsureCreatureButton();qolHideLegacyLibrary();
    if(qolCreatureOpen){const m=QOL_APP.querySelector('main');if(!m?.querySelector('[data-qol-creature-page]'))qolRenderCreatureLibrary(true)}
    else qolLibrary()
  }else if(qolSheet()){qolRestUI();qolSlots()}
  qolGuardEmptyTargets();qolCompact()
}
function qolSoon(ms=35){clearTimeout(qolTimer);qolTimer=setTimeout(qolMaintain,ms)}

window.addEventListener('pointerdown',e=>{
  const sel=e.target.closest?.('select[data-br3-ability-target]');
  if(sel&&![...sel.options].some(o=>String(o.value||'').trim())){e.preventDefault();e.stopImmediatePropagation();qolToast('Uygun hedef yok.');return}
},true);

window.addEventListener('click',e=>{
  const creatureBtn=e.target.closest?.('[data-fup-creatures]');
  if(creatureBtn&&qolGM()){e.preventDefault();e.stopImmediatePropagation();qolOpenCreatureLibrary();return}
  if(qolCreatureOpen&&e.target.closest?.('[data-gm2-route],.nav button,[data-gmt-sub]'))qolCloseCreatureLibrary();

  const clearAll=e.target.closest?.('[data-cc-clear-all-rolls]');
  if(clearAll&&qolGM()){e.preventDefault();e.stopImmediatePropagation();qolClearAllRolls(clearAll);return}

  const r=e.target.closest?.('[data-qol-long-rest]');
  if(r&&qolSheet()){e.preventDefault();e.stopImmediatePropagation();qolLongRest(r.dataset.qolLongRest).catch(x=>qolToast('Uzun dinlenme yapılamadı: '+(x?.message||String(x))));return}

  const libAdd=e.target.closest?.('[data-qol-library-add]');
  if(libAdd&&qolGM()){e.preventDefault();e.stopImmediatePropagation();qolBatch(libAdd).catch(x=>qolToast('Yaratıklar eklenemedi: '+(x?.message||String(x))));return}
  const libSave=e.target.closest?.('[data-qol-library-save]');
  if(libSave&&qolGM()){e.preventDefault();e.stopImmediatePropagation();qolSaveCreature().catch(x=>qolToast('Yaratık kaydedilemedi: '+(x?.message||String(x))));return}
  const libEdit=e.target.closest?.('[data-qol-library-edit]');
  if(libEdit&&qolGM()){e.preventDefault();e.stopImmediatePropagation();qolEditCreature(libEdit.dataset.qolLibraryEdit);return}
  const libDelete=e.target.closest?.('[data-qol-library-delete]');
  if(libDelete&&qolGM()){e.preventDefault();e.stopImmediatePropagation();qolDeleteCreature(libDelete.dataset.qolLibraryDelete).catch(x=>qolToast('Yaratık silinemedi: '+(x?.message||String(x))));return}

  const b=e.target.closest?.('[data-cex-template-add]');
  if(b&&qolGM()){e.preventDefault();e.stopImmediatePropagation();qolBatch(b).catch(x=>qolToast('Yaratıklar eklenemedi: '+(x?.message||String(x))))}
},true);

document.addEventListener('change',e=>{
  if(e.target.matches?.('[data-qol-creature-count]')){e.target.value=String(qolN(e.target.value));return}
  if(e.target.matches?.('select[data-br3-ability-target]')&&!String(e.target.value||'').trim()){e.preventDefault();e.stopImmediatePropagation();qolToast('Uygun hedef yok.')}
},true);

new MutationObserver(()=>qolSoon(45)).observe(QOL_APP,{childList:true,subtree:true});
window.addEventListener('resize',()=>qolSoon(25));
QOL_S.channel('qol-roll-cleanup').on('postgres_changes',{event:'DELETE',schema:'public',table:'catlak_rolls'},()=>{
  clearTimeout(qolRollTimer);qolRollTimer=setTimeout(()=>qolSyncRollsAfterDelete().catch(()=>{}),80)
}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_creature_templates'},()=>{if(qolCreatureOpen)qolRenderCreatureLibrary(true)}).subscribe();
setInterval(qolMaintain,1600);setTimeout(qolMaintain,180);
window.__catlakQualityOfLifeTest={maintain:qolMaintain,longRest:qolLongRest,batch:qolBatch,slots:qolSlots,compact:qolCompact,openCreatureLibrary:qolOpenCreatureLibrary,closeCreatureLibrary:qolCloseCreatureLibrary,clearAllRolls:qolClearAllRolls,guardEmptyTargets:qolGuardEmptyTargets};
