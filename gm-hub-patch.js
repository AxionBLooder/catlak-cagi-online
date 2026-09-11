const GMH_S=window.__catlakSupabase;
const GMH_APP=document.querySelector('#app');
if(!GMH_S||!GMH_APP)throw new Error('Çatlak Çağı GM Merkezi başlatılamadı.');

const gmhTxt=e=>String(e?.textContent||'').trim();
const gmhEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gmhNum=x=>Number(x||0);
const gmhIsGM=()=>gmhTxt(GMH_APP.querySelector('.role'))==='GM';
const gmhToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(gmhToast.t);gmhToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let gmhAbilityOpen=false,gmhBusy=false,gmhTimer=null,gmhDataSig='';
const gmhState={name:'',type:'spell',effect:'damage',target:'enemy',formula:'',attackBonus:'0',requiresAttack:'0',description:'',char:'',ability:'',uses:'0'};

if(!document.querySelector('#gmh-style')){
  const s=document.createElement('style');s.id='gmh-style';s.textContent=`
  body:has(.role) #app .nav [data-tab="items"],body:has(.role) #app .nav [data-tab="races"],body:has(.role) #app .nav [data-tab="builder"],body:has(.role) #app .nav [data-tab="characters"],body:has(.role) #app .nav [data-cc-stats-tab]{display:none}
  #app .gmt-tabs [data-abs-gm-open]{display:none!important}
  .gmh-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}
  .gmh-tabs button.on{border-color:var(--gold);color:var(--gold);box-shadow:inset 0 0 0 1px #d6ad5b33}
  .gmh-routebar{margin-bottom:14px!important;padding:12px!important}.gmh-routebar .gmh-tabs{margin:0;padding:0;border:0}
  .gmh-ability-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:14px;align-items:start}.gmh-stack{display:flex;flex-direction:column;gap:12px}
  .gmh-form{display:grid;grid-template-columns:repeat(3,minmax(130px,1fr));gap:9px;align-items:end}.gmh-form .wide{grid-column:span 2}.gmh-form textarea{min-height:72px}
  .gmh-catalog{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px}.gmh-ability-card{border:1px solid var(--line);border-radius:13px;padding:12px;background:#0a1622}.gmh-ability-card h3{margin:4px 0 7px}.gmh-pills{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}.gmh-pill{font-size:.74rem;border:1px solid var(--line);border-radius:999px;padding:3px 7px}.gmh-assignment{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid var(--line)}.gmh-assignment:last-child{border-bottom:0}
  .gmh-type-spell{color:#bba7ff}.gmh-type-skill{color:#8fd4ff}.gmh-type-special{color:#f1c36f}
  @media(max-width:900px){.gmh-ability-grid{grid-template-columns:1fr}.gmh-form{grid-template-columns:1fr 1fr}.gmh-form .wide{grid-column:span 2}}
  @media(max-width:560px){.gmh-form{grid-template-columns:1fr}.gmh-form .wide{grid-column:span 1}}
  `;document.head.appendChild(s)
}

const GMH_ROUTES=[
  ['ability','Yetenek'],['items','Eşya'],['stats','Stat'],['races','Irk'],['builder','Karakter Oluşturucu'],['characters','Yönetim Odası']
];
function gmhActiveRoute(){
  if(gmhAbilityOpen&&window.__catlakGmToolsOpen===true)return'ability';
  const stat=GMH_APP.querySelector('.nav [data-cc-stats-tab].on');if(stat)return'stats';
  return GMH_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
}
function gmhTabsHtml(active=gmhActiveRoute()){return GMH_ROUTES.map(([k,n])=>`<button type="button" class="${active===k?'on':''}" data-gmh-route="${k}">${n}</button>`).join('')}
function gmhEnsureTopNav(){
  if(!gmhIsGM())return;
  const b=GMH_APP.querySelector('.nav [data-gmt-open]');if(b&&gmhTxt(b)!=='GM Merkezi')b.textContent='GM Merkezi';
}
function gmhEnsureToolsTabs(){
  if(!gmhIsGM()||window.__catlakGmToolsOpen!==true)return;
  const shell=GMH_APP.querySelector('main .gmt-shell'),header=shell?.firstElementChild;if(!header)return;
  const h=header.querySelector('h1');if(h&&h.textContent!=='GM Merkezi')h.textContent='GM Merkezi';
  let bar=header.querySelector('[data-gmh-tabs]');if(!bar){bar=document.createElement('div');bar.className='gmh-tabs';bar.dataset.gmhTabs='1';const old=header.querySelector('.gmt-tabs');old?header.insertBefore(bar,old):header.appendChild(bar)}
  const html=gmhTabsHtml();if(bar.innerHTML!==html)bar.innerHTML=html;
}
function gmhEnsureRouteBar(){
  if(!gmhIsGM()||window.__catlakGmToolsOpen===true)return;
  const route=gmhActiveRoute();if(!['items','stats','races','builder','characters'].includes(route))return;
  const main=GMH_APP.querySelector('main');if(!main)return;
  let bar=main.querySelector(':scope > [data-gmh-routebar]');
  if(!bar){bar=document.createElement('section');bar.className='card gmh-routebar';bar.dataset.gmhRoutebar='1';main.insertBefore(bar,main.firstChild)}
  const html=`<div class="eyebrow">GM MERKEZİ</div><div class="gmh-tabs">${gmhTabsHtml(route)}</div>`;if(bar.innerHTML!==html)bar.innerHTML=html;
}
function gmhTarget(route){
  const nav=GMH_APP.querySelector('.nav');if(!nav)return null;
  if(route==='stats')return nav.querySelector('[data-cc-stats-tab]');
  return nav.querySelector(`[data-tab="${route}"]`);
}
function gmhGo(route){
  if(!gmhIsGM())return;
  if(route==='ability'){gmhOpenAbility();return}
  gmhAbilityOpen=false;gmhDataSig='';
  const t=gmhTarget(route);if(t){t.click();setTimeout(gmhEnsureRouteBar,120)}else gmhToast('Bu GM bölümü henüz hazır değil.');
}

const gmhType=x=>x==='spell'?'BÜYÜ':x==='special'?'ÖZEL':'YETENEK';
const gmhEffect=x=>x==='heal'?'İYİLEŞTİRME':x==='utility'?'DESTEK':'HASAR';
const gmhTargetLabel=x=>x==='self'?'KENDİ':x==='ally'?'MÜTTEFİK':'DÜŞMAN';
async function gmhLoadAbilities(){
  const [ar,cr,xr]=await Promise.all([
    GMH_S.from('catlak_abilities').select('*').order('name',{ascending:true}),
    GMH_S.from('catlak_characters').select('id,name,play_status,created_at').in('play_status',['prepared','active']).order('created_at',{ascending:true}),
    GMH_S.from('catlak_character_abilities').select('id,character_id,ability_id,uses_per_combat,uses_remaining,created_at').order('created_at',{ascending:true})
  ]);for(const r of [ar,cr,xr])if(r.error)throw r.error;return{abilities:ar.data||[],chars:cr.data||[],assignments:xr.data||[]}
}
function gmhOpt(rows,value,label){return rows.map(x=>`<option value="${gmhEsc(x.id)}" ${String(x.id)===String(value)?'selected':''}>${gmhEsc(label(x))}</option>`).join('')}
function gmhCard(a){
  const pills=[gmhEffect(a.effect_type),'Hedef: '+gmhTargetLabel(a.target_type)];if(a.formula)pills.push(a.formula);if(a.requires_attack)pills.push('Saldırı '+(a.attack_bonus>=0?'+':'')+gmhNum(a.attack_bonus));
  return `<article class="gmh-ability-card"><div class="eyebrow gmh-type-${gmhEsc(a.ability_type)}">${gmhType(a.ability_type)}</div><h3>${gmhEsc(a.name)}</h3><div class="gmh-pills">${pills.map(x=>`<span class="gmh-pill">${gmhEsc(x)}</span>`).join('')}</div>${a.description?`<div class="mini muted">${gmhEsc(a.description)}</div>`:''}<div class="actions" style="margin-top:9px"><button type="button" data-gmh-edit="${a.id}">Düzenle</button><button type="button" class="danger" data-gmh-delete="${a.id}">Sil</button></div></article>`
}
function gmhAssignments(d){
  if(!d.assignments.length)return'<div class="muted">Henüz oyuncuya atanmış yetenek yok.</div>';
  return d.assignments.map(x=>{const c=d.chars.find(y=>y.id===x.character_id),a=d.abilities.find(y=>y.id===x.ability_id);if(!c||!a)return'';return `<div class="gmh-assignment"><div><b>${gmhEsc(c.name)} • ${gmhEsc(a.name)}</b><div class="mini muted">${x.uses_per_combat==null?'Sınırsız kullanım':x.uses_per_combat+' / savaş'}</div></div><button type="button" class="danger small" data-gmh-unassign="${x.id}">Kaldır</button></div>`}).join('')
}
function gmhAbilityHtml(d){
  if(!gmhState.char&&d.chars[0])gmhState.char=d.chars[0].id;if(!gmhState.ability&&d.abilities[0])gmhState.ability=d.abilities[0].id;
  return `<div class="gmh-ability-grid" data-gmh-ability-page><div class="gmh-stack"><section class="card"><div class="eyebrow">GM • YETENEK ATÖLYESİ</div><h1>Yetenekler & Büyüler</h1><p class="muted">Büyü, sınıf yeteneği ve özel aksiyonları oluştur; sonra karaktere ata. Bu ekran seçimlerini kendi içinde korur.</p></section><section class="card"><div class="eyebrow">YENİ / DÜZENLE</div><h2>Yetenek Oluştur</h2><div class="gmh-form"><label>Ad<input id="gmh-name" value="${gmhEsc(gmhState.name)}" placeholder="Örn. Ateş Topu"></label><label>Tür<select id="gmh-type"><option value="spell" ${gmhState.type==='spell'?'selected':''}>Büyü</option><option value="skill" ${gmhState.type==='skill'?'selected':''}>Yetenek</option><option value="special" ${gmhState.type==='special'?'selected':''}>Özel Yetenek</option></select></label><label>Etki<select id="gmh-effect"><option value="damage" ${gmhState.effect==='damage'?'selected':''}>Hasar</option><option value="heal" ${gmhState.effect==='heal'?'selected':''}>İyileştirme</option><option value="utility" ${gmhState.effect==='utility'?'selected':''}>Destek / Diğer</option></select></label><label>Hedef<select id="gmh-target"><option value="enemy" ${gmhState.target==='enemy'?'selected':''}>Düşman</option><option value="ally" ${gmhState.target==='ally'?'selected':''}>Müttefik</option><option value="self" ${gmhState.target==='self'?'selected':''}>Kendi</option></select></label><label>Zar / Formül<input id="gmh-formula" value="${gmhEsc(gmhState.formula)}" placeholder="Örn. 2d6"></label><label>Saldırı Bonusu<input id="gmh-attack-bonus" type="number" value="${gmhEsc(gmhState.attackBonus)}"></label><label>Saldırı zarı gerekir<select id="gmh-requires"><option value="0" ${gmhState.requiresAttack==='0'?'selected':''}>Hayır</option><option value="1" ${gmhState.requiresAttack==='1'?'selected':''}>Evet</option></select></label><label class="wide">Açıklama<textarea id="gmh-description">${gmhEsc(gmhState.description)}</textarea></label><button type="button" class="primary" data-gmh-save>Kaydet</button></div></section><section class="card"><div class="eyebrow">KATALOG</div><h2>${d.abilities.length} Yetenek</h2><div class="gmh-catalog">${d.abilities.length?d.abilities.map(gmhCard).join(''):'<div class="muted">Henüz yetenek yok.</div>'}</div></section></div><aside class="gmh-stack"><section class="card"><div class="eyebrow">OYUNCUYA VER</div><h2>Karaktere Yetenek Ata</h2><div class="form"><label>Karakter<select id="gmh-char">${gmhOpt(d.chars,gmhState.char,c=>c.name+(c.play_status==='prepared'?' • HAZIR':' • CANLI'))}</select></label><label>Yetenek<select id="gmh-ability">${gmhOpt(d.abilities,gmhState.ability,a=>a.name+' • '+gmhType(a.ability_type))}</select></label><label>Savaş başına kullanım<input id="gmh-uses" type="number" min="0" value="${gmhEsc(gmhState.uses)}"></label></div><button type="button" class="primary widebtn" data-gmh-assign>Oyuncuya Ver</button><p class="mini muted">0 = sınırsız. Seçtiğin karakter, sen değiştirene kadar sabit kalır.</p></section><section class="card"><div class="eyebrow">ATANAN YETENEKLER</div><h2>Oyuncu Yetenekleri</h2>${gmhAssignments(d)}</section></aside></div>`
}
function gmhRemember(){
  const map={name:'#gmh-name',type:'#gmh-type',effect:'#gmh-effect',target:'#gmh-target',formula:'#gmh-formula',attackBonus:'#gmh-attack-bonus',requiresAttack:'#gmh-requires',description:'#gmh-description',char:'#gmh-char',ability:'#gmh-ability',uses:'#gmh-uses'};
  for(const [k,q] of Object.entries(map)){const e=GMH_APP.querySelector(q);if(e)gmhState[k]=e.value}
}
async function gmhRenderAbility(force=false){
  if(!gmhAbilityOpen||!gmhIsGM()||window.__catlakGmToolsOpen!==true||gmhBusy)return;
  const shell=GMH_APP.querySelector('main .gmt-shell');if(!shell)return;gmhBusy=true;
  try{gmhRemember();const d=await gmhLoadAbilities();const sig=JSON.stringify([d.abilities.map(a=>[a.id,a.name,a.updated_at]),d.chars.map(c=>[c.id,c.name,c.play_status]),d.assignments.map(x=>[x.id,x.character_id,x.ability_id,x.uses_per_combat,x.uses_remaining])]);if(!force&&sig===gmhDataSig&&shell.querySelector('[data-gmh-ability-page]'))return;gmhDataSig=sig;const header=shell.firstElementChild;[...shell.children].slice(1).forEach(x=>x.remove());const holder=document.createElement('div');holder.innerHTML=gmhAbilityHtml(d);while(holder.firstChild)shell.appendChild(holder.firstChild);gmhEnsureToolsTabs()}catch(e){gmhToast('Yetenek Atölyesi yüklenemedi: '+(e?.message||String(e)))}finally{gmhBusy=false}
}
function gmhOpenAbility(){
  if(!gmhIsGM())return;gmhAbilityOpen=true;const shell=GMH_APP.querySelector('main .gmt-shell');
  if(!shell||window.__catlakGmToolsOpen!==true){GMH_APP.querySelector('.nav [data-gmt-open]')?.click();setTimeout(()=>gmhRenderAbility(true),180);return}
  gmhRenderAbility(true)
}
async function gmhSave(){gmhRemember();if(!gmhState.name.trim())throw new Error('Yetenek adı gerekli.');const r=await GMH_S.rpc('catlak_gm_save_ability',{p_name:gmhState.name.trim(),p_ability_type:gmhState.type,p_effect_type:gmhState.effect,p_target_type:gmhState.target,p_formula:gmhState.formula.trim(),p_requires_attack:gmhState.requiresAttack==='1',p_attack_bonus:gmhNum(gmhState.attackBonus),p_description:gmhState.description.trim()});if(r.error)throw r.error;gmhDataSig='';gmhToast(gmhState.name+' kaydedildi.');await gmhRenderAbility(true)}
async function gmhEdit(id){const r=await GMH_S.from('catlak_abilities').select('*').eq('id',id).maybeSingle();if(r.error)throw r.error;const a=r.data;if(!a)return;Object.assign(gmhState,{name:a.name||'',type:a.ability_type||'skill',effect:a.effect_type||'damage',target:a.target_type||'enemy',formula:a.formula||'',attackBonus:String(a.attack_bonus??0),requiresAttack:a.requires_attack?'1':'0',description:a.description||''});gmhDataSig='';await gmhRenderAbility(true);GMH_APP.querySelector('#gmh-name')?.focus()}
async function gmhDelete(id){const r=await GMH_S.rpc('catlak_gm_delete_ability',{p_ability_id:id});if(r.error)throw r.error;gmhDataSig='';gmhToast('Yetenek silindi.');await gmhRenderAbility(true)}
async function gmhAssign(){gmhRemember();if(!gmhState.char||!gmhState.ability)throw new Error('Karakter ve yetenek seç.');const n=gmhNum(gmhState.uses),r=await GMH_S.rpc('catlak_gm_assign_ability',{p_character_id:gmhState.char,p_ability_id:gmhState.ability,p_uses_per_combat:n>0?n:null});if(r.error)throw r.error;gmhDataSig='';gmhToast('Yetenek seçili karaktere verildi.');await gmhRenderAbility(true)}
async function gmhUnassign(id){const r=await GMH_S.rpc('catlak_gm_unassign_ability',{p_assignment_id:id});if(r.error)throw r.error;gmhDataSig='';gmhToast('Yetenek karakterden kaldırıldı.');await gmhRenderAbility(true)}
async function gmhDo(fn){if(gmhBusy)return;try{await fn()}catch(e){gmhToast(e?.message||String(e))}}

document.addEventListener('input',e=>{if(e.target.closest?.('[data-gmh-ability-page]'))gmhRemember()},true);
document.addEventListener('change',e=>{if(e.target.closest?.('[data-gmh-ability-page]'))gmhRemember()},true);
document.addEventListener('click',e=>{
  const route=e.target.closest?.('[data-gmh-route]');if(route){e.preventDefault();e.stopImmediatePropagation();gmhGo(route.dataset.gmhRoute);return}
  if(e.target.closest?.('[data-gmh-save]')){e.preventDefault();e.stopImmediatePropagation();gmhDo(gmhSave);return}
  const ed=e.target.closest?.('[data-gmh-edit]');if(ed){e.preventDefault();e.stopImmediatePropagation();gmhDo(()=>gmhEdit(ed.dataset.gmhEdit));return}
  const del=e.target.closest?.('[data-gmh-delete]');if(del){e.preventDefault();e.stopImmediatePropagation();if(confirm('Bu yetenek silinsin mi? Oyunculardan da kaldırılır.'))gmhDo(()=>gmhDelete(del.dataset.gmhDelete));return}
  if(e.target.closest?.('[data-gmh-assign]')){e.preventDefault();e.stopImmediatePropagation();gmhDo(gmhAssign);return}
  const un=e.target.closest?.('[data-gmh-unassign]');if(un){e.preventDefault();e.stopImmediatePropagation();gmhDo(()=>gmhUnassign(un.dataset.gmhUnassign));return}
  const gm=e.target.closest?.('.nav [data-gmt-open]');if(gm){gmhAbilityOpen=false;setTimeout(()=>{gmhEnsureToolsTabs()},160);return}
  const nav=e.target.closest?.('.nav button');if(nav&&!nav.matches('[data-gmt-open]'))gmhAbilityOpen=false;
},true);

function gmhInstall(){gmhEnsureTopNav();gmhEnsureToolsTabs();gmhEnsureRouteBar();if(gmhAbilityOpen)gmhRenderAbility(false)}
function gmhSoon(){clearTimeout(gmhTimer);gmhTimer=setTimeout(gmhInstall,80)}
new MutationObserver(gmhSoon).observe(GMH_APP,{childList:true,subtree:true});
GMH_S.channel('cc-gm-hub-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_abilities'},()=>{gmhDataSig='';if(gmhAbilityOpen)gmhRenderAbility(true)}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},()=>{gmhDataSig='';if(gmhAbilityOpen)gmhRenderAbility(true)}).subscribe();
setInterval(gmhInstall,1600);setTimeout(gmhInstall,260);
window.__catlakGmHubTest={install:gmhInstall,ability:gmhOpenAbility,renderAbility:gmhRenderAbility};
