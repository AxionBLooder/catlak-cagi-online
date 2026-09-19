(function(){
'use strict';
if(window.__catlakGmCleanRouterV7)return;
window.__catlakGmCleanRouterV7=true;
window.__catlakGmCleanRouterV1=true;
const APP=document.querySelector('#app'),S=window.__catlakSupabase;
if(!APP||!S)return;
if(window.__catlakRuntimeOwnership&&!window.__catlakRuntimeOwnership.claim('gm-center','gm-clean-router'))return;
const ROUTES=[['ability','Yetenek'],['items','Eşya'],['stats','Stat'],['races','Irk'],['builder','Karakter Oluşturucu'],['events','Olay Atölyesi'],['creatures','Yaratık Kütüphanesi'],['reputation','İtibar Odası'],['seals','Mühür Odası'],['rules','Kaynaklar'],['account','Hesap'] ];
const PAGES_BASE='https://axionblooder.github.io/catlak-cagi-online/';
const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let open=false,route='',busy=false,renderToken=0,maintainQueued=false;
let ability={editId:'',cache:{abilities:[],chars:[],assignments:[]},cacheAt:0,loading:null};
let characterCache=[],characterCacheAt=0,characterLoading=null,characterLocalUntil=0;
const GMC_CACHE_MS=15000;
const inviteLinks=new Map();
const GMC_SEAL_KEY='ccgm_players';
const GMC_SEALS=[['siper','Siper'],['nefes','Nefes'],['goz','Göz'],['gecit','Geçit'],['esik','Eşik']];
let sealEditId='';


if(!document.querySelector('#gmc-style')){const s=document.createElement('style');s.id='gmc-style';s.textContent=`
#app.gmc-gm .nav [data-tab="items"],#app.gmc-gm .nav [data-tab="races"],#app.gmc-gm .nav [data-tab="builder"],#app.gmc-gm .nav [data-tab="characters"],#app.gmc-gm .nav [data-tab="rules"],#app.gmc-gm .nav [data-tab="account"],#app.gmc-gm .nav [data-cc-stats-tab],#app.gmc-gm .nav [data-gmt-open]{display:none!important}
#app.gmc-gm .nav [data-gmc-open].on{border-color:var(--gold)!important;color:var(--gold)!important;background:#101e33!important}
.gmc-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 auto 14px;max-width:1540px;padding:10px 14px;border:1px solid var(--line);border-radius:14px;background:#08121dcc;position:relative;z-index:4}.gmc-label{font-size:.7rem;letter-spacing:.12em;font-weight:900;color:var(--gold);margin-right:4px}.gmc-bar button.on{border-color:var(--gold);color:var(--gold);background:#18170f}
.gmc-page{max-width:1540px;margin:0 auto}.gmc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}.gmc-two{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);gap:14px;align-items:start}.gmc-stack{display:flex;flex-direction:column;gap:12px}.gmc-card{border:1px solid var(--line);border-radius:14px;padding:14px;background:#081522}.gmc-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.gmc-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.gmc-meta{font-size:.82rem;color:var(--muted);line-height:1.45}.gmc-form{display:grid;grid-template-columns:repeat(3,minmax(130px,1fr));gap:9px;align-items:end}.gmc-form .wide{grid-column:span 2}.gmc-form textarea{min-height:76px}.gmc-catalog{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:9px}.gmc-pill{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:3px 7px;font-size:.72rem;margin:3px 4px 3px 0}.gmc-assignment{display:flex;justify-content:space-between;gap:9px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}.gmc-invite{margin-top:10px;padding:9px;border:1px solid #496781;border-radius:10px;background:#091827}.gmc-invite input{width:100%;margin-top:6px}.gmc-note textarea{min-height:70px}.gmc-statuses{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.gmc-linked{color:#91d7ff!important;border-color:#367aa0!important;background:#0b2232!important}.gmc-online{color:#a7f3c8!important;border-color:#357a58!important;background:#0c2b20!important}.gmc-offline{color:#aeb8c5!important;border-color:#485563!important;background:#141a22!important}
.gmc-seal-page{max-width:1540px;margin:0 auto}.gmc-seal-add{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:8px;align-items:end}.gmc-seal-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:13px}.gmc-seal-table{width:100%;border-collapse:collapse;min-width:980px;background:#07131e}.gmc-seal-table th,.gmc-seal-table td{padding:9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}.gmc-seal-table th{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:#d2b86f;background:#0b1722;position:sticky;top:0}.gmc-seal-table select,.gmc-seal-table input{min-width:72px;width:100%}.gmc-seal-table td.ready{background:#26351d}.gmc-seal-actions{display:flex;gap:6px;align-items:center;white-space:nowrap}.gmc-seal-value{display:inline-flex;min-width:30px;min-height:30px;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;font-weight:900}.gmc-seal-empty{padding:28px;text-align:center;color:var(--muted)}
@media(max-width:900px){.gmc-two{grid-template-columns:1fr}.gmc-form{grid-template-columns:1fr 1fr}.gmc-form .wide{grid-column:span 2}}@media(max-width:620px){.gmc-form{grid-template-columns:1fr}.gmc-form .wide{grid-column:auto}.gmc-bar .gmc-label{width:100%}.gmc-bar button{flex:1 1 calc(50% - 6px)}}
`;document.head.appendChild(s)}

function closeForeign(){try{window.__catlakPartyEeliotHotfix?.close?.()}catch(_){}try{window.__catlakCampaignStateTest?.close?.()}catch(_){}try{window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.()}catch(_){}try{window.__catlakGmTools?.close?.()}catch(_){}window.__catlakPartyRoomOwnsMain=false}
function ensureNav(){if(!isGM()){APP.classList.remove('gmc-gm');APP.querySelector('[data-gmc-centerbar]')?.remove();return null}APP.classList.add('gmc-gm');const nav=APP.querySelector('.nav');if(!nav)return null;nav.querySelectorAll('[data-gmc-open]').forEach((x,i)=>{if(i)x.remove()});let b=nav.querySelector('[data-gmc-open]');if(!b){b=document.createElement('button');b.type='button';b.dataset.gmcOpen='1';b.textContent='GM Merkezi';const live=nav.querySelector('[data-tab="gm"]');live?live.after(b):nav.prepend(b)}b.classList.toggle('on',open);nav.querySelectorAll('[data-gmt-open]').forEach(x=>x.style.display='none');return b}
function ensureBar(){const nav=APP.querySelector('.nav');if(!nav)return null;let bar=APP.querySelector('[data-gmc-centerbar]');if(!open){bar?.remove();return null}if(!bar){bar=document.createElement('div');bar.className='gmc-bar';bar.dataset.gmcCenterbar='1';const label=document.createElement('span');label.className='gmc-label';label.textContent='GM MERKEZİ';bar.appendChild(label);for(const[k,n]of ROUTES){const b=document.createElement('button');b.type='button';b.dataset.gmcRoute=k;b.textContent=n;bar.appendChild(b)}nav.insertAdjacentElement('afterend',bar)}bar.querySelectorAll('[data-gmc-route]').forEach(b=>b.classList.toggle('on',b.dataset.gmcRoute===route));return bar}
function maintain(){maintainQueued=false;ensureNav();ensureBar();if(open)markTop()}
function queueMaintain(){if(maintainQueued)return;maintainQueued=true;requestAnimationFrame(maintain)}
function gmViewBegin(){try{window.__catlakViewRuntime?.begin?.('gm-center')}catch(_){}}
function gmViewReady(){try{window.__catlakViewRuntime?.ready?.('gm-center')}catch(_){}}
function markTop(){const nav=APP.querySelector('.nav');nav?.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));nav?.querySelector('[data-gmc-open]')?.classList.add('on')}
function setRoute(r){open=true;route=r;window.__catlakGmCleanRoute=r;markTop();ensureNav();ensureBar()}
function close(){open=false;route='';renderToken++;window.__catlakGmCleanRoute='';APP.querySelector('[data-gmc-centerbar]')?.remove();APP.querySelector('.nav [data-gmc-open]')?.classList.remove('on')}
function nativeTarget(r){const nav=APP.querySelector('.nav');if(!nav)return null;if(r==='stats')return nav.querySelector('[data-cc-stats-tab]');return nav.querySelector(`[data-tab="${r}"]`)}
function ensureNativeTarget(r){
 const nav=APP.querySelector('.nav');if(!nav||r==='stats')return nativeTarget(r);
 let t=nativeTarget(r);if(t)return t;
 t=document.createElement('button');t.type='button';t.dataset.tab=r;t.dataset.gmcNativeBridge='1';t.textContent=r==='builder'?'Karakter Oluşturucu':r==='items'?'Eşya Atölyesi':r==='races'?'Irk Atölyesi':r;
 t.style.display='none';nav.appendChild(t);return t;
}
function reassertCenter(r,token){
  if(token!==renderToken||route!==r)return;
  setRoute(r);ensureBar();markTop();
}
function openNative(r){
  const t=ensureNativeTarget(r);if(!t){toast('Bu bölüm açılamadı.');return false}
  const token=++renderToken;
  t.dataset.gmcNativeBridge='1';
  window.__catlakGmCenterBridge=true;
  try{t.click()}finally{queueMicrotask(()=>{window.__catlakGmCenterBridge=false})}
  reassertCenter(r,token);
  requestAnimationFrame(()=>{reassertCenter(r,token);requestAnimationFrame(()=>gmViewReady())});
  setTimeout(()=>reassertCenter(r,token),60);
  setTimeout(()=>{reassertCenter(r,token);gmViewReady()},180);
  return true
}
function openStatsDirect(){const t=nativeTarget('stats'),render=window.__catlakRenderCompactStats;if(!t||typeof render!=='function'){toast('Stat Atölyesi hazır değil.');gmViewReady();return false}const main=APP.querySelector('main');if(main){delete main.dataset.gmtTools;delete main.dataset.gmtSub;delete main.dataset.qolCreatureLibrary;delete main.dataset.cuxPage}t.classList.add('on');Promise.resolve(render(true)).then(()=>{if(route!=='stats')return;t.classList.add('on');ensureBar();gmViewReady()}).catch(e=>{gmViewReady();toast('Stat Atölyesi açılamadı: '+(e?.message||String(e)))});return true}

const abilityType=x=>x==='spell'?'BÜYÜ':x==='special'?'ÖZEL':'YETENEK';
async function loadAbility(force=false){if(!force&&ability.cacheAt&&Date.now()-ability.cacheAt<GMC_CACHE_MS)return ability.cache;if(ability.loading)return ability.loading;ability.loading=(async()=>{const[a,c,x]=await Promise.all([S.from('catlak_abilities').select('*').order('name',{ascending:true}),S.from('catlak_characters').select('id,name,play_status,created_at').in('play_status',['prepared','active']).order('created_at',{ascending:true}),S.from('catlak_character_abilities').select('id,character_id,ability_id,uses_per_combat,uses_remaining,created_at').order('created_at',{ascending:true})]);for(const r of[a,c,x])if(r.error)throw r.error;ability.cache={abilities:a.data||[],chars:c.data||[],assignments:x.data||[]};ability.cacheAt=Date.now();return ability.cache})();try{return await ability.loading}finally{ability.loading=null}}
function abilityRule(a){const raw=String(a?.description||''),m=raw.match(/\[\[CC_FIXED_AC:(\d+)\]\]/i);return{mode:m?'fixed':a?.requires_attack?'target':'direct',fixed:m?Math.max(1,num(m[1])):0,description:raw.replace(/\s*\[\[CC_FIXED_AC:\d+\]\]\s*/ig,' ').trim()}}
function abilityStoreDescription(desc,mode,fixed){const clean=String(desc||'').replace(/\s*\[\[CC_FIXED_AC:\d+\]\]\s*/ig,' ').trim();return mode==='fixed'?((clean?clean+' ':'')+'[[CC_FIXED_AC:'+Math.max(1,num(fixed)||1)+']]'):clean}
function abilityCard(a){const rule=abilityRule(a),pills=[a.effect_type||'damage','Hedef: '+(a.target_type||'enemy')];if(a.formula)pills.push(a.formula);pills.push(rule.mode==='fixed'?'Sabit AC: d20'+(num(a.attack_bonus)>=0?'+':'')+num(a.attack_bonus)+' > '+rule.fixed:(a.requires_attack?'Hedef AC: d20'+(num(a.attack_bonus)>=0?'+':'')+num(a.attack_bonus)+' ≥ hedef AC':'AC Kuralı: Kapalı • Direkt'));return `<article class="gmc-card ${String(a.id)===String(ability.editId)?'editing':''}"><div class="eyebrow">${abilityType(a.ability_type)}</div><h3>${esc(a.name)}</h3>${pills.map(x=>`<span class="gmc-pill">${esc(x)}</span>`).join('')}${rule.description?`<div class="gmc-meta">${esc(rule.description)}</div>`:''}<div class="gmc-actions"><button type="button" data-gmc-action="ability-edit" data-id="${esc(a.id)}">Düzenle</button><button type="button" class="danger" data-gmc-action="ability-delete" data-id="${esc(a.id)}">Sil</button></div></article>`}
function abilityAssignments(d){const rows=d.assignments.map(x=>{const c=d.chars.find(y=>String(y.id)===String(x.character_id)),a=d.abilities.find(y=>String(y.id)===String(x.ability_id));if(!c||!a)return'';return `<div class="gmc-assignment"><div><b>${esc(c.name)} • ${esc(a.name)}</b><div class="gmc-meta">${x.uses_per_combat==null?'Sınırsız kullanım':x.uses_per_combat+' / savaş'}</div></div><button type="button" class="danger small" data-gmc-action="ability-unassign" data-id="${esc(x.id)}">Kaldır</button></div>`}).filter(Boolean).join('');return rows||'<div class="muted">Henüz oyuncuya atanmış yetenek yok.</div>'}
function abilityPage(d){const e=d.abilities.find(x=>String(x.id)===String(ability.editId))||{},rule=abilityRule(e);const opts=(rows,label)=>rows.map(x=>`<option value="${esc(x.id)}">${esc(label(x))}</option>`).join('');return `<div class="gmc-page" data-gmc-owned="ability"><div class="gmc-two"><div class="gmc-stack"><section class="card"><div class="eyebrow">GM • YETENEK ATÖLYESİ</div><h1>Yetenekler & Büyüler</h1><p class="muted">Bu ekran tek GM runtime tarafından yönetilir.</p></section><section class="card"><div class="eyebrow">${ability.editId?'DÜZENLENİYOR':'YENİ YETENEK'}</div><h2>${ability.editId?'Yeteneği Düzenle':'Yetenek Oluştur'}</h2><div class="gmc-form"><label>Ad<input id="gmc-ab-name" value="${esc(e.name||'')}"></label><label>Tür<select id="gmc-ab-type"><option value="spell" ${e.ability_type==='spell'?'selected':''}>Büyü</option><option value="skill" ${!e.ability_type||e.ability_type==='skill'?'selected':''}>Yetenek</option><option value="special" ${e.ability_type==='special'?'selected':''}>Özel</option></select></label><label>Etki<select id="gmc-ab-effect"><option value="damage" ${!e.effect_type||e.effect_type==='damage'?'selected':''}>Hasar</option><option value="heal" ${e.effect_type==='heal'?'selected':''}>İyileştirme</option><option value="utility" ${e.effect_type==='utility'?'selected':''}>Destek</option></select></label><label>Hedef<select id="gmc-ab-target"><option value="enemy" ${!e.target_type||e.target_type==='enemy'?'selected':''}>Düşman</option><option value="ally" ${e.target_type==='ally'?'selected':''}>Müttefik</option><option value="self" ${e.target_type==='self'?'selected':''}>Kendi</option></select></label><label>Zar / Formül<input id="gmc-ab-formula" value="${esc(e.formula||'')}"></label><label>AC Zar Bonusu<input id="gmc-ab-bonus" type="number" value="${num(e.attack_bonus)}" title="AC kontrolünde d20 üzerine eklenir"></label><label>AC Kuralı<select id="gmc-ab-attack"><option value="0" ${rule.mode==='direct'?'selected':''}>Kapalı • Direkt etki</option><option value="1" ${rule.mode==='target'?'selected':''}>Hedef AC • d20 + bonus ≥ hedefin gerçek AC'si</option><option value="2" ${rule.mode==='fixed'?'selected':''}>Sabit AC • Ben bir eşik belirleyeceğim</option></select></label><label>Sabit AC Eşiği<input id="gmc-ab-fixed-ac" type="number" min="1" value="${rule.fixed||10}" title="Sabit AC modunda d20 + bonus bu değeri AŞARSA hasar uygulanır"></label><div class="gmc-meta wide"><b>Üç mod:</b> Kapalı = direkt etki. Hedef AC = mevcut sistem. Sabit AC = senin yazdığın eşik; d20 + bonus eşikten büyükse hasar, eşit veya düşükse hasar yok.</div><label class="wide">Açıklama<textarea id="gmc-ab-desc">${esc(rule.description||'')}</textarea></label><div class="gmc-actions"><button type="button" class="primary" data-gmc-action="ability-save">${ability.editId?'Değişiklikleri Kaydet':'Kaydet'}</button>${ability.editId?'<button type="button" data-gmc-action="ability-cancel">İptal</button>':''}</div></div></section><section class="card"><div class="eyebrow">KATALOG</div><h2>${d.abilities.length} Yetenek</h2><div class="gmc-catalog">${d.abilities.length?d.abilities.map(abilityCard).join(''):'<div class="muted">Henüz yetenek yok.</div>'}</div></section></div><aside class="gmc-stack"><section class="card"><div class="eyebrow">OYUNCUYA VER</div><h2>Karaktere Yetenek Ata</h2><label>Karakter<select id="gmc-ab-char">${opts(d.chars,c=>c.name+(c.play_status==='prepared'?' • HAZIR':' • CANLI'))}</select></label><label>Yetenek<select id="gmc-ab-ability">${opts(d.abilities,a=>a.name+' • '+abilityType(a.ability_type))}</select></label><label>Savaş başına kullanım<input id="gmc-ab-uses" type="number" min="0" value="0"></label><button type="button" class="primary widebtn" data-gmc-action="ability-assign" ${d.chars.length&&d.abilities.length?'':'disabled'}>Oyuncuya Ver</button></section><section class="card"><div class="eyebrow">ATANAN YETENEKLER</div><h2>Oyuncu Yetenekleri</h2>${abilityAssignments(d)}</section></aside></div></div>`}
async function renderAbility(force=false){const token=++renderToken,set=APP.querySelector('main');if(!set)return;const cached=!force&&ability.cacheAt&&Date.now()-ability.cacheAt<GMC_CACHE_MS;if(cached){set.innerHTML=abilityPage(ability.cache);gmViewReady();setTimeout(async()=>{try{const d=await loadAbility(true);if(token!==renderToken||route!=='ability')return;set.innerHTML=abilityPage(d)}catch(e){window.__catlakReportError?.('gm-ability-revalidate',e)}},0);return}try{const d=await loadAbility(force);if(token!==renderToken||route!=='ability')return;set.innerHTML=abilityPage(d);gmViewReady()}catch(e){if(token===renderToken)set.innerHTML=`<section class="card"><h2>Yetenek Atölyesi açılamadı</h2><p class="muted">${esc(e?.message||String(e))}</p></section>`;gmViewReady()}}
function readAbility(){const rawMode=val('#gmc-ab-attack','0'),ac_mode=rawMode==='2'?'fixed':rawMode==='1'?'target':'direct';return{name:txtVal('#gmc-ab-name'),ability_type:val('#gmc-ab-type','skill'),effect_type:val('#gmc-ab-effect','damage'),target_type:val('#gmc-ab-target','enemy'),formula:txtVal('#gmc-ab-formula'),ac_mode,fixed_ac:Math.max(1,num(val('#gmc-ab-fixed-ac','10'))||10),requires_attack:ac_mode==='target',attack_bonus:num(val('#gmc-ab-bonus','0')),description:txtVal('#gmc-ab-desc')}}
const el=q=>APP.querySelector(q),val=(q,d='')=>el(q)?.value??d,txtVal=q=>String(val(q,'')).trim();
async function abilityAction(type,id){if(busy)return;busy=true;try{if(type==='ability-edit'){ability.editId=id;await renderAbility();return}if(type==='ability-cancel'){ability.editId='';await renderAbility();return}if(type==='ability-delete'){if(!confirm('Bu yetenek silinsin mi?'))return;const r=await S.rpc('catlak_gm_delete_ability',{p_ability_id:id});if(r.error)throw r.error;window.__catlakRealtimeSync?.emit?.('ability',{action:'delete'});if(String(ability.editId)===String(id))ability.editId='';toast('Yetenek silindi.');ability.cacheAt=0;await renderAbility(true);return}if(type==='ability-save'){const a=readAbility();if(!a.name)throw new Error('Yetenek adı gerekli.');const args={p_name:a.name,p_ability_type:a.ability_type,p_effect_type:a.effect_type,p_target_type:a.target_type,p_formula:a.formula,p_requires_attack:a.requires_attack,p_attack_bonus:a.attack_bonus,p_description:abilityStoreDescription(a.description,a.ac_mode,a.fixed_ac)};const r=ability.editId?await S.rpc('catlak_gm_update_ability',{p_ability_id:ability.editId,...args}):await S.rpc('catlak_gm_save_ability',args);if(r.error)throw r.error;window.__catlakRealtimeSync?.emit?.('ability',{action:'save'});toast(a.name+(ability.editId?' güncellendi.':' kaydedildi.'));ability.editId='';ability.cacheAt=0;await renderAbility(true);return}if(type==='ability-assign'){const cid=val('#gmc-ab-char'),aid=val('#gmc-ab-ability'),uses=num(val('#gmc-ab-uses'));if(!cid||!aid)throw new Error('Karakter ve yetenek seç.');const r=await S.rpc('catlak_gm_assign_ability',{p_character_id:cid,p_ability_id:aid,p_uses_per_combat:uses>0?uses:null});if(r.error)throw r.error;window.__catlakRealtimeSync?.emit?.('ability',{action:'assign'});toast('Yetenek karaktere verildi.');ability.cacheAt=0;await renderAbility(true);return}if(type==='ability-unassign'){const r=await S.rpc('catlak_gm_unassign_ability',{p_assignment_id:id});if(r.error)throw r.error;window.__catlakRealtimeSync?.emit?.('ability',{action:'unassign'});toast('Yetenek karakterden kaldırıldı.');ability.cacheAt=0;await renderAbility(true);return}}catch(e){toast(e?.message||String(e))}finally{busy=false}}

function presenceOnline(id){try{return !!window.__catlakPresence?.isOnline?.(id)}catch(_){return false}}
function updateManagementPresence(){
  APP.querySelectorAll('[data-gmc-presence]').forEach(el=>{
    const on=presenceOnline(el.dataset.gmcPresence);
    el.classList.toggle('gmc-online',on);el.classList.toggle('gmc-offline',!on);
    el.textContent=on?'● ÇEVRİMİÇİ':'○ ÇEVRİMDIŞI';
  });
}
function classBonus(c){const b=c?.data?.class_bonus_v1;if(!b?.applied)return'';const bits=Object.entries(b.stats||{}).filter(([,v])=>num(v)).map(([k,v])=>`${k} ${num(v)>0?'+':''}${num(v)}`);if(num(b.hp))bits.push(`HP +${num(b.hp)}`);if(num(b.ac))bits.push(`AC +${num(b.ac)}`);return bits.join(' • ')}
function managementCard(c){const active=String(c.play_status||'')==='active',bonus=classBonus(c),link=inviteLinks.get(String(c.id))||'',online=c.owner_id&&presenceOnline(c.id);return `<article class="gmc-card" data-gmc-char="${esc(c.id)}"><div class="gmc-head"><div><div class="eyebrow">${active?'CANLI KARAKTER':'HAZIR KARAKTER'}</div><h3>${esc(c.name||'Adsız')}</h3><div class="gmc-meta">${esc(c.species_name||'-')} • ${esc(c.class_name||'-')} • Seviye <span data-gmc-level-readout="${esc(c.id)}">${num(c.level)||1}</span><br>${esc(c.background_name||'-')} • <span data-gmc-hp-readout="${esc(c.id)}">HP ${num(c.hp_current)}/${num(c.hp_max)}</span> • AC ${num(c.base_ac)}</div></div><div class="gmc-statuses">${c.owner_id?`<span class="gmc-pill gmc-linked">✓ OYUNCUYA BAĞLI</span><span class="gmc-pill ${online?'gmc-online':'gmc-offline'}" data-gmc-presence="${esc(c.id)}">${online?'● ÇEVRİMİÇİ':'○ ÇEVRİMDIŞI'}</span>`:`<span class="gmc-pill">${active?'CANLI':'HAZIR'}</span>`}</div></div>${bonus?`<div class="notice"><b>SINIF BONUSU</b><div>${esc(bonus)}</div></div>`:''}<div class="gmc-actions"><button type="button" data-gmc-action="char-level" data-id="${esc(c.id)}" data-d="-1">Lv −</button><button type="button" data-gmc-action="char-level" data-id="${esc(c.id)}" data-d="1">Lv +</button><button type="button" data-gmc-action="char-hp" data-id="${esc(c.id)}" data-d="-1">HP −</button><button type="button" data-gmc-action="char-hp" data-id="${esc(c.id)}" data-d="1">HP +</button><button type="button" class="primary" data-gmc-action="char-invite" data-id="${esc(c.id)}" data-name="${esc(c.name||'Karakter')}" data-owned="${c.owner_id?'1':'0'}">${c.owner_id?'Yeniden Bağlama Linki':'Oyuncu Daveti'}</button><button type="button" class="danger" data-gmc-action="char-delete" data-id="${esc(c.id)}" data-name="${esc(c.name||'Karakter')}">Sil</button></div>${link?`<div class="gmc-invite"><b>Bu karakterin bağlantısı</b><input readonly value="${esc(link)}"><div class="gmc-actions"><button type="button" data-gmc-action="copy-link" data-id="${esc(c.id)}">Linki Kopyala</button></div></div>`:''}<label class="gmc-note">Oyuncuya Özel Durum / GM Notu<textarea data-gmc-note="${esc(c.id)}">${esc(c?.data?.gm_note||'')}</textarea></label><button type="button" data-gmc-action="char-note" data-id="${esc(c.id)}">Notu Kaydet</button></article>`}
async function loadCharacters(force=false){if(!force&&characterCacheAt&&Date.now()-characterCacheAt<GMC_CACHE_MS)return characterCache;if(characterLoading)return characterLoading;characterLoading=(async()=>{const r=await S.from('catlak_characters').select('*').order('created_at',{ascending:true});if(r.error)throw r.error;characterCache=r.data||[];characterCacheAt=Date.now();return characterCache})();try{return await characterLoading}finally{characterLoading=null}}
async function renderManagement(force=false){const token=++renderToken,main=APP.querySelector('main');if(!main)return;const cached=!force&&characterCacheAt&&Date.now()-characterCacheAt<GMC_CACHE_MS;if(cached&&characterCache){const rows=characterCache,active=rows.filter(x=>x.play_status==='active'),prepared=rows.filter(x=>x.play_status==='prepared'),ordered=[...active,...prepared,...rows.filter(x=>!['active','prepared'].includes(String(x.play_status||'')))];main.innerHTML=`<div class="gmc-page" data-gmc-owned="characters"><section class="card"><div class="eyebrow">GM • YÖNETİM ODASI</div><h1>Karakter Yönetimi</h1><p class="muted">Oluşturduğun bütün karakterler burada görünür. Hazır karaktere Oyuncu Daveti, bağlı karaktere Yeniden Bağlama Linki üret.</p><div class="actions"><button type="button" class="primary" data-gmc-action="open-builder">+ Yeni Karakter</button></div></section><section class="card"><div class="section-title"><div><div class="eyebrow">KARAKTERLER</div><h2>${rows.length} Karakter</h2></div></div>${ordered.length?`<div class="gmc-grid">${ordered.map(managementCard).join('')}</div>`:'<div class="empty">Henüz karakter yok.</div>'}</section></div>`;gmViewReady();setTimeout(()=>renderManagement(true),0);return}try{const rows=await loadCharacters(force);if(token!==renderToken||route!=='characters')return;const active=rows.filter(x=>x.play_status==='active'),prepared=rows.filter(x=>x.play_status==='prepared'),ordered=[...active,...prepared,...rows.filter(x=>!['active','prepared'].includes(String(x.play_status||'')))];main.innerHTML=`<div class="gmc-page" data-gmc-owned="characters"><section class="card"><div class="eyebrow">GM • YÖNETİM ODASI</div><h1>Karakter Yönetimi</h1><p class="muted">Oluşturduğun bütün karakterler burada görünür. Hazır karaktere Oyuncu Daveti, bağlı karaktere Yeniden Bağlama Linki üret.</p><div class="actions"><button type="button" class="primary" data-gmc-action="open-builder">+ Yeni Karakter</button></div></section><section class="card"><div class="section-title"><div><div class="eyebrow">KARAKTERLER</div><h2>${rows.length} Karakter</h2></div></div>${ordered.length?`<div class="gmc-grid">${ordered.map(managementCard).join('')}</div>`:'<div class="empty">Henüz karakter yok.</div>'}</section></div>`;gmViewReady()}catch(e){if(token===renderToken)main.innerHTML=`<section class="card"><h2>Karakter Yönetimi açılamadı</h2><p class="muted">${esc(e?.message||String(e))}</p></section>`;gmViewReady()}}
async function characterAction(type,b){if(busy)return;busy=true;try{const id=b.dataset.id;if(type==='open-builder'){routeTo('builder');return}if(type==='char-level'){const q=await S.from('catlak_characters').select('id,level').eq('id',id).maybeSingle();if(q.error)throw q.error;const level=Math.max(1,Math.min(20,num(q.data?.level)+num(b.dataset.d)));characterLocalUntil=Date.now()+900;const r=await S.rpc('catlak_set_character_level',{p_character_id:id,p_level:level});if(r.error)throw r.error;const row=characterCache.find(x=>String(x.id)===String(id));if(row)row.level=level;characterCacheAt=Date.now();const readout=APP.querySelector(`[data-gmc-level-readout="${CSS.escape(String(id))}"]`);if(readout)readout.textContent=String(level);toast(`Seviye ${level} oldu.`);return}if(type==='char-hp'){const q=await S.from('catlak_characters').select('id,hp_current,hp_max').eq('id',id).maybeSingle();if(q.error)throw q.error;const hp=Math.max(0,Math.min(num(q.data?.hp_max),num(q.data?.hp_current)+num(b.dataset.d)));characterLocalUntil=Date.now()+900;const r=await S.from('catlak_characters').update({hp_current:hp}).eq('id',id);if(r.error)throw r.error;const row=characterCache.find(x=>String(x.id)===String(id));if(row)row.hp_current=hp;characterCacheAt=Date.now();const readout=APP.querySelector(`[data-gmc-hp-readout="${CSS.escape(String(id))}"]`);if(readout)readout.textContent=`HP ${hp}/${num(q.data?.hp_max)}`;toast(`HP ${hp}/${num(q.data?.hp_max)}`);return}if(type==='char-note'){const q=await S.from('catlak_characters').select('id,data').eq('id',id).maybeSingle();if(q.error)throw q.error;const note=APP.querySelector(`[data-gmc-note="${CSS.escape(String(id))}"]`)?.value||'',data={...(q.data?.data||{}),gm_note:note};const r=await S.from('catlak_characters').update({data}).eq('id',id);if(r.error)throw r.error;toast('Karakter notu kaydedildi.');return}if(type==='char-delete'){if(!confirm(`${b.dataset.name||'Karakter'} kalıcı olarak silinsin mi?`))return;const r=await S.from('catlak_characters').delete().eq('id',id);if(r.error)throw r.error;inviteLinks.delete(String(id));toast('Karakter silindi.');characterCacheAt=0;await renderManagement(true);return}if(type==='char-invite'){const owned=b.dataset.owned==='1',fn=owned?'catlak_generate_character_reconnect':'catlak_generate_character_claim';let r=await S.rpc(fn,{p_character_id:id});if(r.error)throw r.error;const raw=r.data?.token??r.data?.code??r.data?.invite??r.data;if(raw==null||String(raw).trim()==='')throw new Error('Davet anahtarı üretilemedi.');const link=PAGES_BASE+'?join='+encodeURIComponent(String(raw));inviteLinks.set(String(id),link);try{await navigator.clipboard.writeText(link)}catch(_){}toast((owned?'Yeniden bağlama':'Karakter davet')+' linki oluşturuldu.');characterCacheAt=0;await renderManagement(true);return}if(type==='copy-link'){const link=inviteLinks.get(String(id));if(!link)throw new Error('Önce bağlantı oluştur.');try{await navigator.clipboard.writeText(link);toast('Link kopyalandı.')}catch(_){prompt('Bağlantı:',link)}return}}catch(e){toast(e?.message||String(e))}finally{busy=false}}

function sealLoad(){
  try{const raw=localStorage.getItem(GMC_SEAL_KEY),v=raw?JSON.parse(raw):[];return Array.isArray(v)?v:[]}catch(_){return[]}
}
function sealSave(rows){
  try{localStorage.setItem(GMC_SEAL_KEY,JSON.stringify(rows));return true}
  catch(e){console.error('CATLAK_GMC_SEAL_SAVE',e);toast('Mühür kaydı tarayıcıya yazılamadı.');return false}
}
function sealId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function sealClamp(v){return Math.max(0,Math.min(3,num(v)))}
function sealOptions(v){return [0,1,2,3].map(n=>`<option value="${n}" ${num(v)===n?'selected':''}>${n}</option>`).join('')}
function sealRow(p){
  const id=esc(p.id),editing=String(p.id)===String(sealEditId);
  const name=editing?`<input data-gmc-seal-name="${id}" value="${esc(p.name||'')}" aria-label="Karakter adı">`:`<strong>${esc(p.name||'')}</strong>`;
  const scores=GMC_SEALS.map(([k])=>{const v=sealClamp(p[k]);return editing?`<td class="${v===3?'ready':''}"><select data-gmc-seal-score="${k}" data-id="${id}">${sealOptions(v)}</select></td>`:`<td class="${v===3?'ready':''}"><span class="gmc-seal-value">${v}</span></td>`}).join('');
  const note=editing?`<input data-gmc-seal-note="${id}" value="${esc(p.note||'')}" placeholder="Son seçim / bedel">`:`<span class="${p.note?'':'muted'}">${esc(p.note||'—')}</span>`;
  const actions=editing?`<div class="gmc-seal-actions"><button type="button" class="primary small" data-gmc-action="seal-save" data-id="${id}">Kaydet</button><button type="button" class="small" data-gmc-action="seal-cancel" data-id="${id}">İptal</button></div>`:`<div class="gmc-seal-actions"><button type="button" class="small" data-gmc-action="seal-edit" data-id="${id}">Düzenle</button><button type="button" class="danger small" data-gmc-action="seal-delete" data-id="${id}" data-name="${esc(p.name||'Karakter')}">Sil</button></div>`;
  return `<tr data-gmc-seal-row="${id}"><td>${name}</td>${scores}<td>${note}</td><td>${actions}</td></tr>`;
}
function sealRowsHtml(rows){return rows.length?rows.map(sealRow).join(''):'<tr><td colspan="8"><div class="gmc-seal-empty">Henüz karakter eklenmedi.</div></td></tr>'}
function sealPage(){
  const rows=sealLoad();sealEditId='';
  return `<div class="gmc-seal-page" data-gmc-seal-page="1"><section class="card"><div class="eyebrow">GİZLİ GM TAKİBİ</div><h1>Mühür Odası</h1><p class="muted">Mühür Adaylık Takibi • 0 = veri yok, 1 = ilk güçlü işaret, 2 = ilke tekrarlandı, 3 = tekrar + bedel + dönüşüm tamamlandı; sınamaya hazır.</p></section><section class="card"><div class="gmc-seal-add"><label>Oyuncu / karakter adı<input id="gmc-seal-add-name" placeholder="Örn. Lorian"></label><button type="button" class="primary" data-gmc-action="seal-add">Karakter Ekle</button></div></section><section class="card"><div class="section-title"><div><div class="eyebrow">ADAYLIK TABLOSU</div><h2><span data-gmc-seal-count>${rows.length}</span> Karakter</h2></div></div><div class="gmc-seal-table-wrap"><table class="gmc-seal-table"><thead><tr><th>Karakter</th>${GMC_SEALS.map(([,n])=>`<th>${n}</th>`).join('')}<th>Son Not</th><th>İşlem</th></tr></thead><tbody data-gmc-seal-body>${sealRowsHtml(rows)}</tbody></table></div></section></div>`
}
function paintSealRows(focus=false){
  if(!open||route!=='seals')return false;
  const main=APP.querySelector('main'),page=main?.querySelector('[data-gmc-seal-page="1"]'),body=page?.querySelector('[data-gmc-seal-body]');if(!page||!body)return false;
  const wrap=body.closest('.gmc-seal-table-wrap'),top=wrap?.scrollTop||0,left=wrap?.scrollLeft||0,rows=sealLoad();
  body.innerHTML=sealRowsHtml(rows);
  const count=page.querySelector('[data-gmc-seal-count]');if(count)count.textContent=String(rows.length);
  if(wrap){wrap.scrollTop=top;wrap.scrollLeft=left}
  if(focus&&sealEditId){const input=body.querySelector(`[data-gmc-seal-row="${CSS.escape(String(sealEditId))}"] [data-gmc-seal-name]`);try{input?.focus({preventScroll:true});input?.select()}catch(_){input?.focus()}}
  ensureBar();markTop();return true
}
function renderSealRoom(){
  if(!open||route!=='seals')return false;
  const main=APP.querySelector('main');if(!main)return false;
  if(main.querySelector('[data-gmc-seal-page="1"]')){ensureBar();markTop();gmViewReady();return true}
  sealEditId='';main.dataset.gmcSealRoom='1';main.innerHTML=sealPage();ensureBar();markTop();gmViewReady();return true
}
function sealAction(type,b){
  if(!open||route!=='seals')return false;
  const page=APP.querySelector('main [data-gmc-seal-page="1"]');if(!page)return false;
  if(type==='seal-add'){
    const input=page.querySelector('#gmc-seal-add-name'),name=String(input?.value||'').trim();if(!name){toast('Karakter adı gerekli.');return false}
    const rows=sealLoad();rows.push({id:sealId(),name,siper:0,nefes:0,goz:0,gecit:0,esik:0,note:''});if(!sealSave(rows))return false;
    sealEditId='';if(input)input.value='';paintSealRows(false);try{input?.focus({preventScroll:true})}catch(_){input?.focus()}toast(name+' Mühür Odası’na eklendi.');return true
  }
  const id=String(b?.dataset?.id||'');if(!id)return false;
  if(type==='seal-edit'){if(!sealLoad().some(x=>String(x.id)===id))return false;sealEditId=id;paintSealRows(true);return true}
  if(type==='seal-cancel'){sealEditId='';paintSealRows(false);return true}
  if(type==='seal-delete'){const rows=sealLoad(),p=rows.find(x=>String(x.id)===id);if(!p)return false;if(!confirm(`${p.name||'Bu karakter'} mühür takibinden silinsin mi?`))return false;if(!sealSave(rows.filter(x=>String(x.id)!==id)))return false;if(sealEditId===id)sealEditId='';paintSealRows(false);toast('Mühür kaydı silindi.');return true}
  if(type==='seal-save'){
    const row=page.querySelector(`[data-gmc-seal-row="${CSS.escape(id)}"]`);if(!row)return false;
    const name=String(row.querySelector('[data-gmc-seal-name]')?.value||'').trim();if(!name){toast('Karakter adı boş bırakılamaz.');return false}
    const rows=sealLoad(),p=rows.find(x=>String(x.id)===id);if(!p)return false;
    p.name=name;for(const[k]of GMC_SEALS)p[k]=sealClamp(row.querySelector(`[data-gmc-seal-score="${k}"]`)?.value);p.note=String(row.querySelector('[data-gmc-seal-note]')?.value||'');
    if(!sealSave(rows))return false;sealEditId='';paintSealRows(false);toast('Mühür kaydı güncellendi.');return true
  }
  return false
}

function openCampaignRoom(r,attempt=0){
  if(!open||route!==r)return false;
  const fn=window.__catlakCampaignStateTest?.open;
  if(typeof fn==='function'){
    const ok=fn(r)!==false;
    setRoute(r);ensureBar();markTop();
    requestAnimationFrame(()=>{if(open&&route===r){setRoute(r);gmViewReady()}});
    return ok
  }
  if(attempt===0){
    const main=APP.querySelector('main');
    if(main)main.innerHTML=`<section class="card"><div class="eyebrow">GM • KAMPANYA</div><h2>${r==='seals'?'Mühür Odası':'İtibar Odası'} hazırlanıyor…</h2><p class="muted">Oda bileşeni bağlanıyor.</p></section>`;
  }
  if(attempt<18){
    setTimeout(()=>{if(open&&route===r)openCampaignRoom(r,attempt+1)},50);
    return true
  }
  toast('Kampanya odası yüklenemedi.');gmViewReady();return false
}
function routeTo(r){
  if(!isGM()||!ROUTES.some(([k])=>k===r))return false;
  gmViewBegin();renderToken++;closeForeign();setRoute(r);
  if(r==='ability'){renderAbility(false);return true}
  if(r==='stats')return openStatsDirect();
  if(['items','races','builder','rules','account'].includes(r))return openNative(r);
  if(r==='events'){
    const api=window.__catlakGmTools;if(typeof api?.open!=='function'){toast('Oyun araçları hazır değil.');gmViewReady();return false}
    window.__catlakGmCenterBridge=true;
    try{api.open(r)}finally{queueMicrotask(()=>{window.__catlakGmCenterBridge=false})}
    setRoute(r);requestAnimationFrame(()=>{setRoute(r);requestAnimationFrame(()=>gmViewReady())});setTimeout(()=>{setRoute(r);gmViewReady()},80);return true
  }
  if(r==='creatures'){const fn=window.__catlakQualityOfLifeTest?.openCreatureLibrary;if(typeof fn!=='function'){toast('Yaratık Kütüphanesi hazır değil.');gmViewReady();return false}fn();setRoute(r);requestAnimationFrame(()=>gmViewReady());return true}
  if(r==='seals')return renderSealRoom()
  if(r==='reputation')return openCampaignRoom(r,0)
  return false
}
function openCenter(){if(!isGM())return false;return routeTo(route||'ability')}
async function action(b){const type=b?.dataset?.gmcAction||'';if(type.startsWith('seal-'))return sealAction(type,b);if(type.startsWith('ability-'))return abilityAction(type,b.dataset.id);if(type.startsWith('char-')||type==='copy-link'||type==='open-builder')return characterAction(type,b)}
function handle(kind,b){if(kind==='open')return openCenter();if(kind==='route')return routeTo(b.dataset.gmcRoute);if(kind==='action')return action(b)}

document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target?.id==='gmc-seal-add-name'&&open&&route==='seals'){e.preventDefault();action({dataset:{gmcAction:'seal-add'}})}},true);
new MutationObserver(rs=>{if(rs.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.nav,.role')||n.querySelector?.('.nav,.role')))))queueMaintain()}).observe(APP,{childList:true,subtree:true});
window.addEventListener('catlak:presence-changed',()=>{if(open&&route==='characters')updateManagementPresence()});
window.addEventListener('catlak:realtime-sync',e=>{const k=String(e.detail?.kind||'');if(k==='ability'){ability.cacheAt=0;if(open&&route==='ability')renderAbility(true)}else if(k==='character'||k==='party'){characterCacheAt=0;ability.cacheAt=0;if(open&&route==='characters')renderManagement(true)}});
window.addEventListener('catlak:data-refreshed',()=>{
  if(!open)return;
  const r=route;
  if(['items','races','builder','rules','account'].includes(r))setTimeout(()=>{if(open&&route===r)openNative(r)},0);
  else requestAnimationFrame(()=>{if(open){ensureBar();markTop()}});
});
let gmcLiveTimer=0,gmcLiveChars=false,gmcLiveAbilities=false;
function queueGmcLive(kind){
  if(kind==='characters'){characterCacheAt=0;ability.cacheAt=0;gmcLiveChars=true}else{ability.cacheAt=0;gmcLiveAbilities=true}
  clearTimeout(gmcLiveTimer);gmcLiveTimer=setTimeout(()=>{
    gmcLiveTimer=0;
    const chars=gmcLiveChars,abs=gmcLiveAbilities;gmcLiveChars=false;gmcLiveAbilities=false;
    if(chars&&Date.now()>=characterLocalUntil&&open&&route==='characters')renderManagement(true);
    else if(abs&&open&&route==='ability')renderAbility(true);
  },85);
}
S.channel('gmc-clean-live-v2').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>queueGmcLive('characters')).on('postgres_changes',{event:'*',schema:'public',table:'catlak_abilities'},()=>queueGmcLive('abilities')).on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},()=>queueGmcLive('abilities')).subscribe();
setTimeout(()=>{maintain();if(isGM()){loadAbility(false).catch(()=>{});loadCharacters(false).catch(()=>{})}},0);setTimeout(maintain,500);
window.__catlakGmCleanRouter={open:openCenter,close,route:routeTo,action,handle,current:()=>route,isOpen:()=>open,ensure:maintain,renderManagement,renderAbility};
})();