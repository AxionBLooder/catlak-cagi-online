const ABS_S=window.__catlakSupabase;
const ABS_APP=document.querySelector('#app');
if(!ABS_S||!ABS_APP)throw new Error('Çatlak Çağı yetenek sistemi başlatılamadı.');

const absText=e=>String(e?.textContent||'').trim();
const absEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const absNum=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;
const absIsGM=()=>absText(ABS_APP.querySelector('.role'))==='GM';
const absToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(absToast.t);absToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let absBusy=false,absTimer=null,absGmOpen=false,absPlayerSig='',absLastResult=null;

if(!document.querySelector('#abs-style')){
  const s=document.createElement('style');s.id='abs-style';s.textContent=`
  .abs-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(310px,.9fr);gap:14px;align-items:start}.abs-stack{display:flex;flex-direction:column;gap:12px}.abs-form{display:grid;grid-template-columns:repeat(3,minmax(130px,1fr));gap:9px;align-items:end}.abs-form .wide{grid-column:span 2}.abs-form textarea{min-height:74px}.abs-catalog{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px}.abs-card{border:1px solid var(--line);border-radius:13px;padding:12px;background:#0a1622}.abs-card h3{margin:4px 0 7px}.abs-pills{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}.abs-pill{font-size:.74rem;border:1px solid var(--line);border-radius:999px;padding:3px 7px}.abs-assignment{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid var(--line)}.abs-assignment:last-child{border-bottom:0}.abs-player-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.abs-player-card{border:1px solid var(--line);border-radius:14px;padding:12px;background:#0a1622}.abs-player-card.ready{border-color:#5c7f98}.abs-player-card h3{margin:3px 0 8px}.abs-target{margin:9px 0}.abs-result{margin-top:10px;border:1px solid var(--line);border-radius:12px;padding:10px;background:#09131e}.abs-result.good{border-color:#4f7b4e}.abs-result.bad{border-color:#784c4c}.abs-type-spell{color:#bba7ff}.abs-type-skill{color:#8fd4ff}.abs-type-special{color:#f1c36f}
  @media(max-width:900px){.abs-grid{grid-template-columns:1fr}.abs-form{grid-template-columns:1fr 1fr}.abs-form .wide{grid-column:span 2}}
  @media(max-width:560px){.abs-form{grid-template-columns:1fr}.abs-form .wide{grid-column:span 1}}
  `;document.head.appendChild(s);
}

const absTypeLabel=x=>x==='spell'?'BÜYÜ':x==='special'?'ÖZEL':'YETENEK';
const absEffectLabel=x=>x==='heal'?'İYİLEŞTİRME':x==='utility'?'DESTEK':'HASAR';
const absTargetLabel=x=>x==='self'?'KENDİ':x==='ally'?'MÜTTEFİK':'DÜŞMAN';

function absInjectGmTab(){
  if(!absIsGM()||window.__catlakGmToolsOpen!==true)return;
  const tabs=ABS_APP.querySelector('.gmt-tabs');if(!tabs||tabs.querySelector('[data-abs-gm-open]'))return;
  const b=document.createElement('button');b.type='button';b.dataset.absGmOpen='1';b.textContent='Yetenek Atölyesi';tabs.appendChild(b);
  if(absGmOpen){tabs.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));b.classList.add('on')}
}

async function absLoadGM(){
  const [ar,cr,xr]=await Promise.all([
    ABS_S.from('catlak_abilities').select('*').order('name',{ascending:true}),
    ABS_S.from('catlak_characters').select('id,name,play_status').eq('play_status','active').order('created_at',{ascending:true}),
    ABS_S.from('catlak_character_abilities').select('id,character_id,ability_id,uses_per_combat,uses_remaining').order('created_at',{ascending:true})
  ]);
  for(const r of [ar,cr,xr])if(r.error)throw r.error;
  return{abilities:ar.data||[],chars:cr.data||[],assignments:xr.data||[]};
}

function absAbilityCard(a){
  return `<article class="abs-card"><div class="eyebrow abs-type-${absEsc(a.ability_type)}">${absTypeLabel(a.ability_type)}</div><h3>${absEsc(a.name)}</h3><div class="abs-pills"><span class="abs-pill">${absEffectLabel(a.effect_type)}</span><span class="abs-pill">Hedef: ${absTargetLabel(a.target_type)}</span>${a.formula?`<span class="abs-pill">${absEsc(a.formula)}</span>`:''}${a.requires_attack?`<span class="abs-pill">Saldırı +${absNum(a.attack_bonus)}</span>`:''}</div>${a.description?`<div class="mini muted">${absEsc(a.description)}</div>`:''}<div class="actions" style="margin-top:9px"><button type="button" data-abs-edit="${absEsc(a.id)}">Düzenle</button><button type="button" class="danger" data-abs-delete="${absEsc(a.id)}">Sil</button></div></article>`;
}

function absAssignmentsHtml(d){
  if(!d.assignments.length)return'<div class="muted">Henüz oyuncuya atanmış yetenek yok.</div>';
  return d.assignments.map(x=>{const c=d.chars.find(y=>y.id===x.character_id),a=d.abilities.find(y=>y.id===x.ability_id);return `<div class="abs-assignment"><div><b>${absEsc(c?.name||'Karakter')} • ${absEsc(a?.name||'Yetenek')}</b><div class="mini muted">${x.uses_per_combat==null?'Sınırsız kullanım':x.uses_per_combat+' / savaş'}</div></div><button type="button" class="danger small" data-abs-unassign="${absEsc(x.id)}">Kaldır</button></div>`}).join('');
}

function absWorkshopHtml(d){
  const abilityOpts=d.abilities.map(a=>`<option value="${absEsc(a.id)}">${absEsc(a.name)} • ${absTypeLabel(a.ability_type)}</option>`).join('');
  const charOpts=d.chars.map(c=>`<option value="${absEsc(c.id)}">${absEsc(c.name)}</option>`).join('');
  return `<div class="abs-grid" data-abs-workshop><div class="abs-stack"><section class="card"><div class="eyebrow">GM • YETENEK ATÖLYESİ</div><h1>Yetenekler & Büyüler</h1><p class="muted">Büyü, sınıf yeteneği ve özel aksiyonları burada oluştur. Eşya Atölyesi'nden tamamen bağımsızdır.</p></section><section class="card"><div class="eyebrow">YENİ / DÜZENLE</div><h2>Yetenek Oluştur</h2><div class="abs-form"><label>Ad<input id="abs-name" placeholder="Örn. Ateş Topu"></label><label>Tür<select id="abs-type"><option value="spell">Büyü</option><option value="skill">Yetenek</option><option value="special">Özel Yetenek</option></select></label><label>Etki<select id="abs-effect"><option value="damage">Hasar</option><option value="heal">İyileştirme</option><option value="utility">Destek / Diğer</option></select></label><label>Hedef<select id="abs-target"><option value="enemy">Düşman</option><option value="ally">Müttefik</option><option value="self">Kendi</option></select></label><label>Zar / Formül<input id="abs-formula" placeholder="Örn. 2d6 veya 1d8+2"></label><label>Saldırı Bonusu<input id="abs-attack-bonus" type="number" value="0"></label><label><span>Saldırı zarı gerekir</span><select id="abs-requires-attack"><option value="0">Hayır</option><option value="1">Evet</option></select></label><label class="wide">Açıklama<textarea id="abs-description" placeholder="Oyuncunun göreceği açıklama"></textarea></label><button type="button" class="primary" data-abs-save>Kaydet</button></div></section><section class="card"><div class="eyebrow">KATALOG</div><h2>${d.abilities.length} Yetenek</h2><div class="abs-catalog">${d.abilities.map(absAbilityCard).join('')||'<div class="muted">Henüz yetenek yok.</div>'}</div></section></div><aside class="abs-stack"><section class="card"><div class="eyebrow">OYUNCUYA VER</div><h2>Karaktere Yetenek Ata</h2><div class="form"><label>Karakter<select id="abs-give-char">${charOpts}</select></label><label>Yetenek<select id="abs-give-ability">${abilityOpts}</select></label><label>Savaş başına kullanım<input id="abs-give-uses" type="number" min="0" value="0" title="0 = sınırsız"></label></div><button type="button" class="primary widebtn" data-abs-assign>Oyuncuya Ver</button><p class="mini muted">0 kullanım = sınırsız. Sayı girersen her yeni savaşta haklar otomatik yenilenir.</p></section><section class="card"><div class="eyebrow">ATANAN YETENEKLER</div><h2>Oyuncu Yetenekleri</h2>${absAssignmentsHtml(d)}</section></aside></div>`;
}

async function absRenderGM(){
  if(!absGmOpen||!absIsGM()||window.__catlakGmToolsOpen!==true)return;
  const main=ABS_APP.querySelector('main'),shell=main?.querySelector('.gmt-shell');if(!main||!shell)return;
  try{
    const d=await absLoadGM();if(!absGmOpen||ABS_APP.querySelector('main')!==main)return;
    const header=shell.firstElementChild;shell.querySelectorAll(':scope > *').forEach((x,i)=>{if(i>0)x.remove()});
    header?.querySelectorAll('.gmt-tabs button.on').forEach(x=>x.classList.remove('on'));header?.querySelector('[data-abs-gm-open]')?.classList.add('on');
    const holder=document.createElement('div');holder.innerHTML=absWorkshopHtml(d);while(holder.firstChild)shell.appendChild(holder.firstChild);
    main.dataset.gmtTools='1';
  }catch(e){absToast('Yetenek Atölyesi yüklenemedi: '+(e?.message||String(e)))}
}

function absFormArgs(){return{
  p_name:ABS_APP.querySelector('#abs-name')?.value.trim()||'',p_ability_type:ABS_APP.querySelector('#abs-type')?.value||'skill',p_effect_type:ABS_APP.querySelector('#abs-effect')?.value||'damage',p_target_type:ABS_APP.querySelector('#abs-target')?.value||'enemy',p_formula:ABS_APP.querySelector('#abs-formula')?.value.trim()||'',p_requires_attack:ABS_APP.querySelector('#abs-requires-attack')?.value==='1',p_attack_bonus:absNum(ABS_APP.querySelector('#abs-attack-bonus')?.value),p_description:ABS_APP.querySelector('#abs-description')?.value.trim()||''};}
async function absSave(){const a=absFormArgs();if(!a.p_name)throw new Error('Yetenek adı gerekli.');const r=await ABS_S.rpc('catlak_gm_save_ability',a);if(r.error)throw r.error;absToast(`${a.p_name} kaydedildi.`);await absRenderGM()}
async function absEdit(id){const r=await ABS_S.from('catlak_abilities').select('*').eq('id',id).maybeSingle();if(r.error)throw r.error;const a=r.data;if(!a)return;const set=(q,v)=>{const e=ABS_APP.querySelector(q);if(e)e.value=v??''};set('#abs-name',a.name);set('#abs-type',a.ability_type);set('#abs-effect',a.effect_type);set('#abs-target',a.target_type);set('#abs-formula',a.formula);set('#abs-requires-attack',a.requires_attack?'1':'0');set('#abs-attack-bonus',a.attack_bonus);set('#abs-description',a.description);ABS_APP.querySelector('#abs-name')?.focus()}
async function absDelete(id){const r=await ABS_S.rpc('catlak_gm_delete_ability',{p_ability_id:id});if(r.error)throw r.error;absToast('Yetenek silindi.');await absRenderGM()}
async function absAssign(){const cid=ABS_APP.querySelector('#abs-give-char')?.value,aid=ABS_APP.querySelector('#abs-give-ability')?.value,raw=absNum(ABS_APP.querySelector('#abs-give-uses')?.value);if(!cid||!aid)throw new Error('Karakter ve yetenek seç.');const r=await ABS_S.rpc('catlak_gm_assign_ability',{p_character_id:cid,p_ability_id:aid,p_uses_per_combat:raw>0?raw:null});if(r.error)throw r.error;absToast('Yetenek oyuncuya verildi.');await absRenderGM()}
async function absUnassign(id){const r=await ABS_S.rpc('catlak_gm_unassign_ability',{p_assignment_id:id});if(r.error)throw r.error;absToast('Yetenek oyuncudan kaldırıldı.');await absRenderGM()}

async function absPlayerData(){const [ar,sr]=await Promise.all([ABS_S.rpc('catlak_player_abilities'),ABS_S.rpc('catlak_player_combat_snapshot')]);if(ar.error)throw ar.error;if(sr.error)throw sr.error;return{abilities:ar.data||[],snap:sr.data||{}}}
function absTargetsFor(a,s){const rows=s.order||[];if(a.target_type==='enemy')return rows.filter(x=>x.kind==='enemy'&&absNum(x.hp_current)>0);if(a.target_type==='ally')return rows.filter(x=>x.kind==='player'&&absNum(x.hp_current)>0);return[]}
function absPlayerCard(a,s){
  const targets=absTargetsFor(a,s),uses=a.uses_per_combat==null?'∞':`${absNum(a.uses_remaining)}/${absNum(a.uses_per_combat)}`,out=a.uses_remaining!=null&&absNum(a.uses_remaining)<=0,canTurn=!!s.is_my_turn,needsTarget=a.target_type!=='self',canUse=canTurn&&!out&&(!needsTarget||targets.length>0);
  return `<article class="abs-player-card ${canUse?'ready':''}"><div class="eyebrow abs-type-${absEsc(a.ability_type)}">${absTypeLabel(a.ability_type)} • ${absEffectLabel(a.effect_type)}</div><h3>${absEsc(a.name)}</h3><div class="abs-pills"><span class="abs-pill">Hedef: ${absTargetLabel(a.target_type)}</span>${a.formula?`<span class="abs-pill">${absEsc(a.formula)}</span>`:''}<span class="abs-pill">Kullanım: ${uses}</span>${a.requires_attack?`<span class="abs-pill">Saldırı +${absNum(a.attack_bonus)}</span>`:''}</div>${a.description?`<div class="mini muted">${absEsc(a.description)}</div>`:''}${needsTarget?`<label class="abs-target">Hedef<select data-abs-target-select="${absEsc(a.assignment_id)}">${targets.map(x=>`<option value="${absEsc(x.id)}">${absEsc(x.name)} • HP ${absNum(x.hp_current)}/${absNum(x.hp_max)}</option>`).join('')||'<option value="">Uygun hedef yok</option>'}</select></label>`:''}<button type="button" class="primary widebtn" data-abs-use="${absEsc(a.assignment_id)}" ${canUse?'':'disabled'}>${out?'Kullanım Hakkı Bitti':canTurn?'Kullan':'Sıra Sende Değil'}</button></article>`;
}
function absResultHtml(r){if(!r)return'';const good=r.hit!==false;return `<div class="abs-result ${good?'good':'bad'}" data-abs-result><div class="eyebrow">SON YETENEK</div><b>${absEsc(r.ability||'Yetenek')} → ${absEsc(r.target_name||'')}</b><div>${r.hit===false?'ISKA':r.effect_type==='damage'?`${absNum(r.amount)} hasar`:r.effect_type==='heal'?`${absNum(r.amount)} iyileştirme`:'Kullanıldı'}${r.target_hp_max!=null?` • HP ${absNum(r.target_hp)}/${absNum(r.target_hp_max)}`:''}</div></div>`}
async function absRenderPlayer(force=false){
  if(absIsGM()||window.__catlakBattleRoomOpen!==true)return;const main=ABS_APP.querySelector('main');if(!main)return;
  try{const d=await absPlayerData();if(ABS_APP.querySelector('main')!==main||window.__catlakBattleRoomOpen!==true)return;const sig=JSON.stringify([d.snap?.is_my_turn,d.snap?.current_combatant_id,(d.snap?.order||[]).map(x=>[x.id,x.hp_current,x.hp_max,x.kind]),d.abilities.map(a=>[a.assignment_id,a.uses_remaining,a.name])]);if(!force&&sig===absPlayerSig&&main.querySelector('[data-abs-player]'))return;absPlayerSig=sig;main.querySelector('[data-abs-player]')?.remove();const sec=document.createElement('section');sec.className='card';sec.dataset.absPlayer='1';sec.innerHTML=`<div class="eyebrow">YETENEKLER & BÜYÜLER</div><h2>${d.abilities.length?`${d.abilities.length} Aksiyon`:'Henüz Yetenek Yok'}</h2><p class="muted">GM tarafından verilen büyü ve özel yetenekler burada kullanılır.</p>${d.abilities.length?`<div class="abs-player-grid">${d.abilities.map(a=>absPlayerCard(a,d.snap)).join('')}</div>`:'<div class="muted">GM, Yetenek Atölyesi'nden karakterine yetenek verebilir.</div>'}${absResultHtml(absLastResult)}`;const weapon=[...main.querySelectorAll('section.card')].find(s=>absText(s.querySelector('.eyebrow'))==='TAKILI SİLAHLAR');weapon?weapon.insertAdjacentElement('afterend',sec):main.appendChild(sec)}catch(e){if(force)absToast('Yetenekler yüklenemedi: '+(e?.message||String(e)))}
}
async function absUse(btn){const id=btn.dataset.absUse,sel=ABS_APP.querySelector(`[data-abs-target-select="${CSS.escape(id)}"]`),target=sel?.value||null;const r=await ABS_S.rpc('catlak_player_use_ability',{p_assignment_id:id,p_target_id:target});if(r.error)throw r.error;absLastResult=r.data||null;absPlayerSig='';const d=r.data||{};absToast(d.hit===false?`${d.ability}: ISKA`:d.effect_type==='damage'?`${d.ability}: ${d.amount} hasar`:d.effect_type==='heal'?`${d.ability}: ${d.amount} iyileştirme`:`${d.ability} kullanıldı`);if(window.__catlakRoomSystemTest?.renderBattle)await window.__catlakRoomSystemTest.renderBattle(true);await absRenderPlayer(true)}
async function absDo(fn){if(absBusy)return;absBusy=true;try{await fn()}catch(e){absToast(e?.message||String(e))}finally{absBusy=false}}

document.addEventListener('click',e=>{
  const gm=e.target.closest?.('[data-abs-gm-open]');if(gm){e.preventDefault();e.stopImmediatePropagation();absGmOpen=true;gm.closest('.gmt-tabs')?.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));gm.classList.add('on');absRenderGM();return}
  if(absGmOpen&&e.target.closest?.('[data-gmt-sub]')){absGmOpen=false;return}
  const save=e.target.closest?.('[data-abs-save]');if(save){e.preventDefault();e.stopImmediatePropagation();absDo(absSave);return}
  const edit=e.target.closest?.('[data-abs-edit]');if(edit){e.preventDefault();e.stopImmediatePropagation();absDo(()=>absEdit(edit.dataset.absEdit));return}
  const del=e.target.closest?.('[data-abs-delete]');if(del){e.preventDefault();e.stopImmediatePropagation();if(confirm('Bu yetenek silinsin mi? Oyunculardan da kaldırılır.'))absDo(()=>absDelete(del.dataset.absDelete));return}
  const assign=e.target.closest?.('[data-abs-assign]');if(assign){e.preventDefault();e.stopImmediatePropagation();absDo(absAssign);return}
  const un=e.target.closest?.('[data-abs-unassign]');if(un){e.preventDefault();e.stopImmediatePropagation();absDo(()=>absUnassign(un.dataset.absUnassign));return}
  const use=e.target.closest?.('[data-abs-use]');if(use){e.preventDefault();e.stopImmediatePropagation();absDo(()=>absUse(use));return}
},true);

function absInstall(){if(absIsGM()){absInjectGmTab();if(absGmOpen)absRenderGM()}else absRenderPlayer()}
function absSoon(ms=80){clearTimeout(absTimer);absTimer=setTimeout(absInstall,ms)}
new MutationObserver(()=>absSoon()).observe(ABS_APP,{childList:true,subtree:true});
ABS_S.channel('cc-abilities-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_abilities'},()=>{absPlayerSig='';absSoon(60)}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},()=>{absPlayerSig='';absSoon(60)}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{absPlayerSig='';absSoon(60)}).subscribe();
setInterval(absInstall,1500);setTimeout(absInstall,300);
window.__catlakAbilitySystemTest={renderGM:absRenderGM,renderPlayer:absRenderPlayer};
