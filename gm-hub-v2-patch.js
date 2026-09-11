const GM2_S=window.__catlakSupabase;
const GM2_APP=document.querySelector('#app');
if(!GM2_S||!GM2_APP)throw new Error('Çatlak Çağı GM Merkezi v2 başlatılamadı.');
window.__catlakUnifiedGmHub=true;
window.__catlakGmHubOwnsMain=false;

const gm2Txt=e=>String(e?.textContent||'').trim();
const gm2Esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gm2Num=x=>Number(x||0);
const gm2IsGM=()=>gm2Txt(GM2_APP.querySelector('.role'))==='GM';
const gm2Toast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(gm2Toast.t);gm2Toast.t=setTimeout(()=>t.classList.add('hidden'),4400)};
const GM2_ROUTES=[['ability','Yetenek'],['items','Eşya'],['stats','Stat'],['races','Irk'],['builder','Karakter Oluşturucu'],['characters','Yönetim Odası']];
let gm2AbilityOpen=false,gm2RenderBusy=false,gm2RenderQueued=false,gm2ActionBusy=false,gm2ChromeQueued=false,gm2Gen=0,gm2Sig='',gm2Cache={abilities:[],chars:[],assignments:[]};
const gm2State={editId:'',name:'',type:'spell',effect:'damage',target:'enemy',formula:'',attackBonus:'0',requiresAttack:'0',description:'',char:'',ability:'',uses:'0'};

if(!document.querySelector('#gm2-style')){
  const s=document.createElement('style');s.id='gm2-style';s.textContent=`
  #app.gm2-gm .nav [data-tab="items"],#app.gm2-gm .nav [data-tab="races"],#app.gm2-gm .nav [data-tab="builder"],#app.gm2-gm .nav [data-tab="characters"],#app.gm2-gm .nav [data-cc-stats-tab]{display:none!important}
  #app.gm2-gm .nav [data-gmt-open].gm2-center-active{border-color:var(--gold)!important;color:var(--gold)!important;box-shadow:inset 0 0 0 1px #d6ad5b33}
  .gm2-centerbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 auto 14px;max-width:1540px;padding:10px 14px;border:1px solid var(--line);border-radius:14px;background:#08121dcc;position:relative;z-index:3}
  .gm2-centerbar .gm2-label{font-size:.7rem;letter-spacing:.12em;font-weight:900;color:var(--gold);margin-right:4px}.gm2-centerbar button.on{border-color:var(--gold);color:var(--gold);background:#18170f}
  .gm2-ability-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:14px;align-items:start}.gm2-stack{display:flex;flex-direction:column;gap:12px}
  .gm2-form{display:grid;grid-template-columns:repeat(3,minmax(130px,1fr));gap:9px;align-items:end}.gm2-form .wide{grid-column:span 2}.gm2-form textarea{min-height:76px}.gm2-form-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .gm2-catalog{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px}.gm2-card{border:1px solid var(--line);border-radius:13px;padding:12px;background:#0a1622}.gm2-card h3{margin:4px 0 7px}.gm2-card.editing{border-color:var(--gold);box-shadow:inset 0 0 0 1px #d6ad5b33}
  .gm2-pills{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}.gm2-pill{font-size:.74rem;border:1px solid var(--line);border-radius:999px;padding:3px 7px}.gm2-assignment{display:flex;justify-content:space-between;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid var(--line)}.gm2-assignment:last-child{border-bottom:0}
  .gm2-type-spell{color:#bba7ff}.gm2-type-skill{color:#8fd4ff}.gm2-type-special{color:#f1c36f}.gm2-loading{padding:24px;text-align:center;color:var(--muted)}
  @media(max-width:900px){.gm2-ability-grid{grid-template-columns:1fr}.gm2-form{grid-template-columns:1fr 1fr}.gm2-form .wide{grid-column:span 2}}
  @media(max-width:620px){.gm2-centerbar{margin:0 8px 10px;padding:9px}.gm2-centerbar .gm2-label{width:100%}.gm2-form{grid-template-columns:1fr}.gm2-form .wide{grid-column:span 1}.gm2-centerbar button{flex:1 1 calc(50% - 6px)}}
  `;document.head.appendChild(s)
}

function gm2PatchLegacyRender(){
  if(window.__catlakGmHubLegacyRenderPatched||typeof window.gmtRender!=='function')return;
  const original=window.gmtRender;
  window.__catlakGmHubOriginalRender=original;
  window.gmtRender=async function(...args){if(window.__catlakGmHubOwnsMain===true)return;return original.apply(this,args)};
  window.__catlakGmHubLegacyRenderPatched=true;
}
function gm2NativeRoute(){
  const stat=GM2_APP.querySelector('.nav [data-cc-stats-tab].on');if(stat)return'stats';
  return GM2_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
}
function gm2ActiveRoute(){return gm2AbilityOpen&&window.__catlakGmHubOwnsMain===true?'ability':gm2NativeRoute()}
function gm2Target(route){const nav=GM2_APP.querySelector('.nav');if(!nav)return null;return route==='stats'?nav.querySelector('[data-cc-stats-tab]'):nav.querySelector(`[data-tab="${route}"]`)}
function gm2HubContext(){const r=gm2ActiveRoute();return gm2AbilityOpen||window.__catlakGmToolsOpen===true||GM2_ROUTES.some(([k])=>k===r)}
function gm2EnsureChrome(){
  if(!gm2IsGM()){GM2_APP.classList.remove('gm2-gm');GM2_APP.querySelector('[data-gm2-centerbar]')?.remove();return}
  GM2_APP.classList.add('gm2-gm');gm2PatchLegacyRender();
  const nav=GM2_APP.querySelector('.nav');if(!nav)return;
  const center=nav.querySelector('[data-gmt-open]');if(center){if(gm2Txt(center)!=='GM Merkezi')center.textContent='GM Merkezi';center.classList.toggle('gm2-center-active',gm2HubContext())}
  GM2_APP.querySelectorAll('.gmt-tabs [data-abs-gm-open]').forEach(x=>x.remove());
  let bar=GM2_APP.querySelector('[data-gm2-centerbar]');
  if(!bar){bar=document.createElement('div');bar.className='gm2-centerbar';bar.dataset.gm2Centerbar='1';nav.insertAdjacentElement('afterend',bar)}
  const active=gm2ActiveRoute();
  const html=`<span class="gm2-label">GM MERKEZİ</span>${GM2_ROUTES.map(([k,n])=>`<button type="button" class="${active===k?'on':''}" data-gm2-route="${k}">${n}</button>`).join('')}`;
  if(bar.innerHTML!==html)bar.innerHTML=html;
}
function gm2QueueChrome(){if(gm2ChromeQueued)return;gm2ChromeQueued=true;requestAnimationFrame(()=>{gm2ChromeQueued=false;gm2EnsureChrome();if(gm2AbilityOpen&&window.__catlakGmToolsOpen===true&&!GM2_APP.querySelector('[data-gm2-ability-page]'))gm2RenderAbility(false)})}
function gm2ReleaseAbility(){gm2AbilityOpen=false;window.__catlakGmHubOwnsMain=false;gm2Gen++;gm2Sig='';gm2QueueChrome()}
function gm2OpenAbility(){
  if(!gm2IsGM())return;gm2AbilityOpen=true;gm2Gen++;
  const shell=GM2_APP.querySelector('main .gmt-shell');
  if(shell&&window.__catlakGmToolsOpen===true){window.__catlakGmHubOwnsMain=true;gm2RenderAbility(true);gm2QueueChrome();return}
  window.__catlakGmHubOwnsMain=false;
  const open=GM2_APP.querySelector('.nav [data-gmt-open]');if(!open){gm2Toast('GM Merkezi düğmesi bulunamadı.');return}
  open.click();
  const token=gm2Gen;let tries=0;
  const wait=()=>{if(token!==gm2Gen||!gm2AbilityOpen)return;const sh=GM2_APP.querySelector('main .gmt-shell');if(sh&&window.__catlakGmToolsOpen===true){window.__catlakGmHubOwnsMain=true;gm2RenderAbility(true);gm2QueueChrome();return}if(++tries<30)setTimeout(wait,50);else gm2Toast('GM Merkezi açılırken beklenmeyen bir gecikme oluştu.')};
  setTimeout(wait,20)
}
function gm2Go(route){
  if(!gm2IsGM())return;if(route==='ability'){gm2OpenAbility();return}
  gm2ReleaseAbility();const t=gm2Target(route);if(!t){gm2Toast('Bu GM bölümü bulunamadı.');return}t.click();setTimeout(gm2QueueChrome,40)
}

const gm2Type=x=>x==='spell'?'BÜYÜ':x==='special'?'ÖZEL':'YETENEK';
const gm2Effect=x=>x==='heal'?'İYİLEŞTİRME':x==='utility'?'DESTEK':'HASAR';
const gm2TargetLabel=x=>x==='self'?'KENDİ':x==='ally'?'MÜTTEFİK':'DÜŞMAN';
function gm2Remember(){const map={name:'#gm2-name',type:'#gm2-type',effect:'#gm2-effect',target:'#gm2-target',formula:'#gm2-formula',attackBonus:'#gm2-attack-bonus',requiresAttack:'#gm2-requires',description:'#gm2-description',char:'#gm2-char',ability:'#gm2-ability',uses:'#gm2-uses'};for(const[k,q]of Object.entries(map)){const e=GM2_APP.querySelector(q);if(e)gm2State[k]=e.value}}
function gm2Normalize(d){if(!d.chars.some(x=>String(x.id)===String(gm2State.char)))gm2State.char=d.chars[0]?.id||'';if(!d.abilities.some(x=>String(x.id)===String(gm2State.ability)))gm2State.ability=d.abilities[0]?.id||'';if(gm2State.editId&&!d.abilities.some(x=>String(x.id)===String(gm2State.editId)))gm2State.editId=''}
async function gm2Load(){const[ar,cr,xr]=await Promise.all([GM2_S.from('catlak_abilities').select('*').order('name',{ascending:true}),GM2_S.from('catlak_characters').select('id,name,play_status,created_at').in('play_status',['prepared','active']).order('created_at',{ascending:true}),GM2_S.from('catlak_character_abilities').select('id,character_id,ability_id,uses_per_combat,uses_remaining,created_at').order('created_at',{ascending:true})]);for(const r of[ar,cr,xr])if(r.error)throw r.error;return{abilities:ar.data||[],chars:cr.data||[],assignments:xr.data||[]}}
function gm2Options(rows,value,label){return rows.map(x=>`<option value="${gm2Esc(x.id)}" ${String(x.id)===String(value)?'selected':''}>${gm2Esc(label(x))}</option>`).join('')}
function gm2Card(a){const pills=[gm2Effect(a.effect_type),'Hedef: '+gm2TargetLabel(a.target_type)];if(a.formula)pills.push(a.formula);if(a.requires_attack)pills.push('Saldırı '+(a.attack_bonus>=0?'+':'')+gm2Num(a.attack_bonus));return `<article class="gm2-card ${String(a.id)===String(gm2State.editId)?'editing':''}"><div class="eyebrow gm2-type-${gm2Esc(a.ability_type)}">${gm2Type(a.ability_type)}</div><h3>${gm2Esc(a.name)}</h3><div class="gm2-pills">${pills.map(x=>`<span class="gm2-pill">${gm2Esc(x)}</span>`).join('')}</div>${a.description?`<div class="mini muted">${gm2Esc(a.description)}</div>`:''}<div class="actions" style="margin-top:9px"><button type="button" data-gm2-edit="${a.id}">Düzenle</button><button type="button" class="danger" data-gm2-delete="${a.id}">Sil</button></div></article>`}
function gm2Assignments(d){const rows=d.assignments.map(x=>{const c=d.chars.find(y=>y.id===x.character_id),a=d.abilities.find(y=>y.id===x.ability_id);if(!c||!a)return'';return `<div class="gm2-assignment"><div><b>${gm2Esc(c.name)} • ${gm2Esc(a.name)}</b><div class="mini muted">${x.uses_per_combat==null?'Sınırsız kullanım':x.uses_per_combat+' / savaş'}</div></div><button type="button" class="danger small" data-gm2-unassign="${x.id}">Kaldır</button></div>`}).filter(Boolean).join('');return rows||'<div class="muted">Henüz oyuncuya atanmış yetenek yok.</div>'}
function gm2Page(d){
  const editing=!!gm2State.editId,canAssign=!!gm2State.char&&!!gm2State.ability;
  return `<div class="gm2-ability-grid" data-gm2-ability-page><div class="gm2-stack"><section class="card"><div class="eyebrow">GM • YETENEK ATÖLYESİ</div><h1>Yetenekler & Büyüler</h1><p class="muted">Bu ekran artık GM Merkezi tarafından tek başına yönetilir; arka planda eski atölye yeniden çizilmez.</p></section><section class="card"><div class="eyebrow">${editing?'DÜZENLENİYOR':'YENİ YETENEK'}</div><h2>${editing?'Yeteneği Düzenle':'Yetenek Oluştur'}</h2><div class="gm2-form"><label>Ad<input id="gm2-name" value="${gm2Esc(gm2State.name)}" placeholder="Örn. Ateş Topu"></label><label>Tür<select id="gm2-type"><option value="spell" ${gm2State.type==='spell'?'selected':''}>Büyü</option><option value="skill" ${gm2State.type==='skill'?'selected':''}>Yetenek</option><option value="special" ${gm2State.type==='special'?'selected':''}>Özel Yetenek</option></select></label><label>Etki<select id="gm2-effect"><option value="damage" ${gm2State.effect==='damage'?'selected':''}>Hasar</option><option value="heal" ${gm2State.effect==='heal'?'selected':''}>İyileştirme</option><option value="utility" ${gm2State.effect==='utility'?'selected':''}>Destek / Diğer</option></select></label><label>Hedef<select id="gm2-target"><option value="enemy" ${gm2State.target==='enemy'?'selected':''}>Düşman</option><option value="ally" ${gm2State.target==='ally'?'selected':''}>Müttefik</option><option value="self" ${gm2State.target==='self'?'selected':''}>Kendi</option></select></label><label>Zar / Formül<input id="gm2-formula" value="${gm2Esc(gm2State.formula)}" placeholder="Örn. 2d6"></label><label>Saldırı Bonusu<input id="gm2-attack-bonus" type="number" value="${gm2Esc(gm2State.attackBonus)}"></label><label>Saldırı zarı gerekir<select id="gm2-requires"><option value="0" ${gm2State.requiresAttack==='0'?'selected':''}>Hayır</option><option value="1" ${gm2State.requiresAttack==='1'?'selected':''}>Evet</option></select></label><label class="wide">Açıklama<textarea id="gm2-description">${gm2Esc(gm2State.description)}</textarea></label><div class="gm2-form-actions"><button type="button" class="primary" data-gm2-save>${editing?'Değişiklikleri Kaydet':'Kaydet'}</button>${editing?'<button type="button" data-gm2-cancel>Düzenlemeyi İptal Et</button>':''}</div></div></section><section class="card"><div class="eyebrow">KATALOG</div><h2>${d.abilities.length} Yetenek</h2><div class="gm2-catalog">${d.abilities.length?d.abilities.map(gm2Card).join(''):'<div class="muted">Henüz yetenek yok.</div>'}</div></section></div><aside class="gm2-stack"><section class="card"><div class="eyebrow">OYUNCUYA VER</div><h2>Karaktere Yetenek Ata</h2><div class="form"><label>Karakter<select id="gm2-char">${gm2Options(d.chars,gm2State.char,c=>c.name+(c.play_status==='prepared'?' • HAZIR':' • CANLI'))}</select></label><label>Yetenek<select id="gm2-ability">${gm2Options(d.abilities,gm2State.ability,a=>a.name+' • '+gm2Type(a.ability_type))}</select></label><label>Savaş başına kullanım<input id="gm2-uses" type="number" min="0" value="${gm2Esc(gm2State.uses)}"></label></div><button type="button" class="primary widebtn" data-gm2-assign ${canAssign?'':'disabled'}>Oyuncuya Ver</button><p class="mini muted">0 = sınırsız. Karakter ve yetenek seçimi sen değiştirene kadar sabit kalır.</p></section><section class="card"><div class="eyebrow">ATANAN YETENEKLER</div><h2>Oyuncu Yetenekleri</h2>${gm2Assignments(d)}</section></aside></div>`
}
async function gm2RenderAbility(force=false){
  if(!gm2AbilityOpen||!gm2IsGM()||window.__catlakGmToolsOpen!==true)return;if(gm2RenderBusy){gm2RenderQueued=true;return}
  const shell=GM2_APP.querySelector('main .gmt-shell');if(!shell)return;const token=gm2Gen;gm2RenderBusy=true;
  try{gm2Remember();const d=await gm2Load();if(token!==gm2Gen||!gm2AbilityOpen||!window.__catlakGmHubOwnsMain||GM2_APP.querySelector('main .gmt-shell')!==shell)return;gm2Normalize(d);gm2Cache=d;const sig=JSON.stringify([d.abilities.map(a=>[a.id,a.name,a.ability_type,a.effect_type,a.target_type,a.formula,a.requires_attack,a.attack_bonus,a.description,a.updated_at]),d.chars.map(c=>[c.id,c.name,c.play_status]),d.assignments.map(x=>[x.id,x.character_id,x.ability_id,x.uses_per_combat,x.uses_remaining]),gm2State.editId]);if(!force&&sig===gm2Sig&&shell.querySelector('[data-gm2-ability-page]'))return;gm2Sig=sig;const header=shell.firstElementChild;const h=header?.querySelector('h1');if(h)h.textContent='GM Merkezi';const eb=header?.querySelector('.eyebrow');if(eb)eb.textContent='GM • MERKEZ';[...shell.children].slice(1).forEach(x=>x.remove());const holder=document.createElement('div');holder.innerHTML=gm2Page(d);while(holder.firstChild)shell.appendChild(holder.firstChild);gm2QueueChrome()}catch(e){gm2Toast('Yetenek Atölyesi yüklenemedi: '+(e?.message||String(e)))}finally{gm2RenderBusy=false;if(gm2RenderQueued){gm2RenderQueued=false;setTimeout(()=>gm2RenderAbility(true),0)}}
}
function gm2Validate(){gm2Remember();if(!gm2State.name.trim())throw new Error('Yetenek adı gerekli.');if(gm2State.effect==='damage'&&gm2State.target!=='enemy')throw new Error('Hasar yeteneği düşman hedeflemeli.');if(gm2State.effect==='heal'&&gm2State.target==='enemy')throw new Error('İyileştirme düşman hedefleyemez.')}
function gm2ClearEditor(){gm2State.editId='';gm2State.name='';gm2State.type='spell';gm2State.effect='damage';gm2State.target='enemy';gm2State.formula='';gm2State.attackBonus='0';gm2State.requiresAttack='0';gm2State.description=''}
async function gm2Save(){gm2Validate();const args={p_name:gm2State.name.trim(),p_ability_type:gm2State.type,p_effect_type:gm2State.effect,p_target_type:gm2State.target,p_formula:gm2State.formula.trim(),p_requires_attack:gm2State.requiresAttack==='1',p_attack_bonus:gm2Num(gm2State.attackBonus),p_description:gm2State.description.trim()};const editing=gm2State.editId;const r=editing?await GM2_S.rpc('catlak_gm_update_ability',{p_ability_id:editing,...args}):await GM2_S.rpc('catlak_gm_save_ability',args);if(r.error)throw r.error;const label=gm2State.name;gm2ClearEditor();gm2Sig='';gm2Toast(label+(editing?' güncellendi.':' kaydedildi.'));await gm2RenderAbility(true)}
async function gm2Edit(id){const a=gm2Cache.abilities.find(x=>String(x.id)===String(id));if(!a)throw new Error('Yetenek bulunamadı.');gm2State.editId=a.id;gm2State.name=a.name||'';gm2State.type=a.ability_type||'skill';gm2State.effect=a.effect_type||'damage';gm2State.target=a.target_type||'enemy';gm2State.formula=a.formula||'';gm2State.attackBonus=String(a.attack_bonus??0);gm2State.requiresAttack=a.requires_attack?'1':'0';gm2State.description=a.description||'';gm2Sig='';await gm2RenderAbility(true);GM2_APP.querySelector('#gm2-name')?.focus({preventScroll:true})}
async function gm2Delete(id){const r=await GM2_S.rpc('catlak_gm_delete_ability',{p_ability_id:id});if(r.error)throw r.error;if(String(gm2State.editId)===String(id))gm2ClearEditor();if(String(gm2State.ability)===String(id))gm2State.ability='';gm2Sig='';gm2Toast('Yetenek silindi.');await gm2RenderAbility(true)}
async function gm2Assign(){gm2Remember();if(!gm2State.char||!gm2State.ability)throw new Error('Karakter ve yetenek seç.');const n=gm2Num(gm2State.uses),r=await GM2_S.rpc('catlak_gm_assign_ability',{p_character_id:gm2State.char,p_ability_id:gm2State.ability,p_uses_per_combat:n>0?n:null});if(r.error)throw r.error;gm2Sig='';gm2Toast('Yetenek seçili karaktere verildi.');await gm2RenderAbility(true)}
async function gm2Unassign(id){const r=await GM2_S.rpc('catlak_gm_unassign_ability',{p_assignment_id:id});if(r.error)throw r.error;gm2Sig='';gm2Toast('Yetenek karakterden kaldırıldı.');await gm2RenderAbility(true)}
async function gm2Do(fn){if(gm2ActionBusy)return;gm2ActionBusy=true;GM2_APP.querySelectorAll('[data-gm2-save],[data-gm2-assign],[data-gm2-edit],[data-gm2-delete],[data-gm2-unassign],[data-gm2-cancel]').forEach(x=>x.disabled=true);try{await fn()}catch(e){gm2Toast(e?.message||String(e))}finally{gm2ActionBusy=false;GM2_APP.querySelectorAll('[data-gm2-save],[data-gm2-assign],[data-gm2-edit],[data-gm2-delete],[data-gm2-unassign],[data-gm2-cancel]').forEach(x=>x.disabled=false)}}

document.addEventListener('input',e=>{if(e.target.closest?.('[data-gm2-ability-page]'))gm2Remember()},true);
document.addEventListener('change',e=>{if(e.target.closest?.('[data-gm2-ability-page]'))gm2Remember()},true);
document.addEventListener('pointerdown',e=>{if(e.target.closest?.('[data-gmt-sub],.nav [data-gmt-open],.nav button[data-tab],.nav [data-cc-stats-tab]')){if(!e.target.closest?.('[data-gm2-route]'))gm2ReleaseAbility()}},true);
document.addEventListener('click',e=>{
  const route=e.target.closest?.('[data-gm2-route]');if(route){e.preventDefault();e.stopImmediatePropagation();gm2Go(route.dataset.gm2Route);return}
  if(e.target.closest?.('[data-gm2-save]')){e.preventDefault();e.stopImmediatePropagation();gm2Do(gm2Save);return}
  const edit=e.target.closest?.('[data-gm2-edit]');if(edit){e.preventDefault();e.stopImmediatePropagation();gm2Do(()=>gm2Edit(edit.dataset.gm2Edit));return}
  const del=e.target.closest?.('[data-gm2-delete]');if(del){e.preventDefault();e.stopImmediatePropagation();if(confirm('Bu yetenek silinsin mi? Oyunculardan da kaldırılır.'))gm2Do(()=>gm2Delete(del.dataset.gm2Delete));return}
  if(e.target.closest?.('[data-gm2-cancel]')){e.preventDefault();e.stopImmediatePropagation();gm2ClearEditor();gm2Sig='';gm2RenderAbility(true);return}
  if(e.target.closest?.('[data-gm2-assign]')){e.preventDefault();e.stopImmediatePropagation();gm2Do(gm2Assign);return}
  const un=e.target.closest?.('[data-gm2-unassign]');if(un){e.preventDefault();e.stopImmediatePropagation();gm2Do(()=>gm2Unassign(un.dataset.gm2Unassign));return}
},true);

new MutationObserver(gm2QueueChrome).observe(GM2_APP,{childList:true,subtree:true});
GM2_S.channel('cc-gm-hub-v2-live')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_abilities'},()=>{gm2Sig='';if(gm2AbilityOpen)gm2RenderAbility(true)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},()=>{gm2Sig='';if(gm2AbilityOpen)gm2RenderAbility(true)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{gm2Sig='';if(gm2AbilityOpen)gm2RenderAbility(true);gm2QueueChrome()})
 .subscribe();
setTimeout(()=>{gm2PatchLegacyRender();gm2EnsureChrome()},220);
window.__catlakGmHubV2Test={chrome:gm2EnsureChrome,openAbility:gm2OpenAbility,renderAbility:gm2RenderAbility,route:gm2Go,release:gm2ReleaseAbility};
