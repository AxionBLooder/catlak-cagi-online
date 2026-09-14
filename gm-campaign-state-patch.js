const GCS_APP=document.querySelector('#app');
if(!GCS_APP)throw new Error('Çatlak Çağı kampanya durum odaları başlatılamadı.');

const GCS_REP_KEY='catlak_cagi_faction_rep_v1';
const GCS_WORLD_KEY='catlak_cagi_world_state_v1';
const GCS_SEAL_KEY='ccgm_players';
const GCS_PLACEHOLDER_ROUTE='campaign';
const GCS_ROUTES=[['reputation','İtibar Odası'],['seals','Mühür Odası']];
const GCS_REPS=[
  ['altin','Altın Düzen','Düzen / kontrol'],
  ['meclis','İki Dünya Meclisi','Diplomasi / birlik'],
  ['yanki','Yankı Muhafızları','Araştırma / koruma'],
  ['avci','Çatlak Avcıları','Av / hayatta kalma'],
  ['koro','Sessiz Koro','Ortak bilinç'],
  ['yarik','Yarık Çocukları','Yeni yaşam / Çatlak']
];
const GCS_WORLD=[
  ['gerilim','Ooo–Krosmoz Gerilimi','Siyasi ve toplumsal tansiyon'],
  ['catlak','Çatlak İstikrarsızlığı','Geçit ve anomali yoğunluğu'],
  ['guven','Halk Güveni','Oyunculara ve kurumlara güven'],
  ['arabosluk','Araboşluk Hareketliliği','Harita ve mekân kayması']
];
const GCS_SEALS=[['siper','Siper'],['nefes','Nefes'],['goz','Göz'],['gecit','Geçit'],['esik','Eşik']];
let gcsActive='';
let gcsQueued=false;
let gcsDeltaLockUntil=0;
let gcsSealActionLockUntil=0;
let gcsSealActionKey='';
let gcsSealEditingId='';

const gcsTxt=e=>String(e?.textContent||'').trim();
const gcsIsGM=()=>gcsTxt(GCS_APP.querySelector('.role'))==='GM';
const gcsEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gcsToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(gcsToast.t);gcsToast.t=setTimeout(()=>t.classList.add('hidden'),3200)};
function gcsLoad(key,fallback){try{const raw=localStorage.getItem(key);return raw==null?fallback:JSON.parse(raw)}catch{return fallback}}
function gcsSave(key,value){localStorage.setItem(key,JSON.stringify(value))}
function gcsId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function gcsClamp(v){return Math.max(-2,Math.min(2,Number(v)||0))}
function gcsClampSeal(v){return Math.max(0,Math.min(3,Number(v)||0))}

if(!document.querySelector('#gcs-style')){
  const s=document.createElement('style');s.id='gcs-style';s.textContent=`
  #app .gm2-centerbar [data-gcs-route].on{border-color:var(--gold)!important;color:var(--gold)!important;background:#18170f!important}
  .gcs-shell{display:flex;flex-direction:column;gap:14px;max-width:1540px;margin:0 auto}.gcs-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:14px;align-items:start}.gcs-stack{display:flex;flex-direction:column;gap:10px}
  .gcs-card{border:1px solid var(--line);border-radius:14px;background:#0a1622;padding:12px}.gcs-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.gcs-head h3{margin:2px 0 3px}.gcs-mini{font-size:.78rem;color:var(--muted)}
  .gcs-meter{position:relative;height:7px;border-radius:999px;background:#121d27;border:1px solid #30404f;margin-top:10px;overflow:visible}.gcs-meter:before{content:'';position:absolute;left:50%;top:-3px;bottom:-3px;width:1px;background:#596673}.gcs-marker{position:absolute;top:50%;width:13px;height:13px;border-radius:50%;transform:translate(-50%,-50%);background:var(--gold);box-shadow:0 0 0 3px #17150f}
  .gcs-controls{display:flex;align-items:center;gap:6px;flex:0 0 auto}.gcs-controls button{width:32px;height:32px;padding:0;pointer-events:auto!important;touch-action:manipulation}.gcs-score{min-width:32px;text-align:center;font-size:1rem;font-weight:900;color:#e6d4a7}
  .gcs-legend{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:8px}.gcs-level{border:1px solid var(--line);border-radius:11px;background:#08131e;padding:9px}.gcs-level b{color:var(--gold);display:block;margin-bottom:3px}
  .gcs-toolbar{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}.gcs-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:13px}.gcs-table{width:100%;border-collapse:collapse;min-width:980px;background:#07131e}.gcs-table th,.gcs-table td{padding:9px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}.gcs-table th{font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:#d2b86f;background:#0b1722;position:sticky;top:0}.gcs-table select,.gcs-table input{min-width:72px;width:100%}.gcs-table td.gcs-ready{background:#26351d}.gcs-table tr[data-gcs-editing="1"]{background:#0d1c29}.gcs-seal-value{display:inline-flex;min-width:30px;min-height:30px;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:8px;font-weight:900}.gcs-note-view{display:block;max-width:280px;white-space:normal;overflow-wrap:anywhere}.gcs-row-actions{display:flex;gap:6px;align-items:center;white-space:nowrap}.gcs-row-actions button{pointer-events:auto!important;touch-action:manipulation}.gcs-edit-name{min-width:150px!important}.gcs-add{display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:8px;align-items:end}.gcs-empty{padding:28px;text-align:center;color:var(--muted)}
  @media(max-width:900px){.gcs-grid{grid-template-columns:1fr}.gcs-legend{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:620px){.gcs-add{grid-template-columns:1fr}.gcs-legend{grid-template-columns:1fr}.gcs-head{flex-direction:column}.gcs-controls{width:100%;justify-content:flex-end}}
  `;document.head.appendChild(s)
}

function gcsMeterRow(key,name,desc,value,kind){
  const v=gcsClamp(value),left=((v+2)/4)*100;
  return `<article class="gcs-card" data-gcs-meter="${kind}:${key}"><div class="gcs-head"><div><h3>${gcsEsc(name)}</h3><div class="gcs-mini">${gcsEsc(desc)}</div></div><div class="gcs-controls"><button type="button" data-gcs-delta="-1" data-gcs-kind="${kind}" data-gcs-key="${key}" aria-label="${gcsEsc(name)} azalt">−</button><span class="gcs-score">${v>0?'+'+v:v}</span><button type="button" data-gcs-delta="1" data-gcs-kind="${kind}" data-gcs-key="${key}" aria-label="${gcsEsc(name)} artır">+</button></div></div><div class="gcs-meter"><i class="gcs-marker" style="left:${left}%"></i></div></article>`
}
function gcsRepPage(){
  const rep=gcsLoad(GCS_REP_KEY,{}),world=gcsLoad(GCS_WORLD_KEY,{});
  GCS_REPS.forEach(([k])=>{if(typeof rep[k]!=='number')rep[k]=0});
  GCS_WORLD.forEach(([k])=>{if(typeof world[k]!=='number')world[k]=0});
  gcsSave(GCS_REP_KEY,rep);gcsSave(GCS_WORLD_KEY,world);
  return `<div class="gcs-shell" data-gcs-page="reputation"><section class="card"><div class="eyebrow">GM • KAMPANYA DURUMU</div><h1>İtibar Odası</h1><p class="muted">Fraksiyon itibarlarını ve dünya durumunu tek ekrandan takip et. Değerler otomatik kaydolur.</p></section><div class="gcs-grid"><section class="card"><div class="gcs-toolbar"><div><div class="eyebrow">FRAKSİYONLAR</div><h2>İtibar Seviyesi</h2></div><button type="button" data-gcs-reset="rep">İtibarları Sıfırla</button></div><div class="gcs-stack">${GCS_REPS.map(([k,n,d])=>gcsMeterRow(k,n,d,rep[k],'rep')).join('')}</div></section><section class="card"><div class="gcs-toolbar"><div><div class="eyebrow">DÜNYA DURUMU</div><h2>Kampanya Göstergeleri</h2></div><button type="button" data-gcs-reset="world">Dünya Durumunu Sıfırla</button></div><div class="gcs-stack">${GCS_WORLD.map(([k,n,d])=>gcsMeterRow(k,n,d,world[k],'world')).join('')}</div></section></div><section class="card"><div class="eyebrow">İTİBAR SEVİYELERİ</div><div class="gcs-legend"><div class="gcs-level"><b>−2 • Düşman</b><span class="gcs-mini">Takip, sabotaj ve hizmet engeli.</span></div><div class="gcs-level"><b>−1 • Güvensiz</b><span class="gcs-mini">Bilgi sınırlı, şartlar ağır.</span></div><div class="gcs-level"><b>0 • Nötr</b><span class="gcs-mini">Standart ilişki ve karşılık gerekir.</span></div><div class="gcs-level"><b>+1 • Müttefik</b><span class="gcs-mini">Bilgi, geçiş ve küçük kaynak desteği.</span></div><div class="gcs-level"><b>+2 • İç Çevre</b><span class="gcs-mini">Özel sırlar ve üst düzey destek.</span></div></div></section></div>`
}

function gcsPlayers(){const rows=gcsLoad(GCS_SEAL_KEY,[]);return Array.isArray(rows)?rows:[]}
function gcsScoreOptions(v){return [0,1,2,3].map(n=>`<option value="${n}" ${Number(v)===n?'selected':''}>${n}</option>`).join('')}
function gcsSealRow(p,editing=false){
  const id=gcsEsc(p.id),name=gcsEsc(p.name||''),note=gcsEsc(p.note||'');
  const nameCell=editing?`<input class="gcs-edit-name" data-gcs-edit-name data-gcs-player-id="${id}" value="${name}" aria-label="Karakter adı">`:`<strong>${name}</strong>`;
  const sealCells=GCS_SEALS.map(([k])=>{const v=gcsClampSeal(p[k]);return editing?`<td class="${v===3?'gcs-ready':''}"><select data-gcs-edit-seal="${k}" data-gcs-player-id="${id}" aria-label="${k} mühür puanı">${gcsScoreOptions(v)}</select></td>`:`<td class="${v===3?'gcs-ready':''}"><span class="gcs-seal-value">${v}</span></td>`}).join('');
  const noteCell=editing?`<input data-gcs-edit-note data-gcs-player-id="${id}" value="${note}" placeholder="Son seçim / bedel" aria-label="Son not">`:`<span class="gcs-note-view ${note?'':'muted'}">${note||'—'}</span>`;
  const actions=editing?`<div class="gcs-row-actions"><button type="button" class="primary small" data-gcs-save-player="${id}">Kaydet</button><button type="button" class="small" data-gcs-cancel-player="${id}">İptal</button></div>`:`<div class="gcs-row-actions"><button type="button" class="small" data-gcs-edit-player="${id}">Düzenle</button><button type="button" class="danger small" data-gcs-delete-player="${id}">Sil</button></div>`;
  return `<tr data-gcs-player="${id}" ${editing?'data-gcs-editing="1"':''}><td>${nameCell}</td>${sealCells}<td>${noteCell}</td><td>${actions}</td></tr>`;
}
function gcsSealRowsHtml(players){return players.length?players.map(p=>gcsSealRow(p,String(p.id)===String(gcsSealEditingId))).join(''):`<tr><td colspan="8"><div class="gcs-empty">Henüz karakter eklenmedi.</div></td></tr>`}
function gcsSealPage(){
  const players=gcsPlayers();gcsSealEditingId='';
  return `<div class="gcs-shell" data-gcs-page="seals"><section class="card"><div class="eyebrow">GİZLİ GM TAKİBİ</div><h1>Mühür Odası</h1><p class="muted">Mühür Adaylık Takibi • 0 = veri yok, 1 = ilk güçlü işaret, 2 = ilke tekrarlandı, 3 = tekrar + bedel + dönüşüm tamamlandı; sınamaya hazır.</p></section><section class="card"><div class="gcs-add"><label>Oyuncu / karakter adı<input id="gcs-seal-name" placeholder="Örn. Lorian"></label><button type="button" class="primary" data-gcs-add-player>Karakter Ekle</button></div></section><section class="card"><div class="gcs-toolbar"><div><div class="eyebrow">ADAYLIK TABLOSU</div><h2><span data-gcs-player-count>${players.length}</span> Karakter</h2></div></div><div class="gcs-table-wrap"><table class="gcs-table"><thead><tr><th>Karakter</th>${GCS_SEALS.map(([,n])=>`<th>${n}</th>`).join('')}<th>Son Not</th><th>İşlem</th></tr></thead><tbody data-gcs-seal-body>${gcsSealRowsHtml(players)}</tbody></table></div></section></div>`
}
function gcsRenderSealRows(editId=gcsSealEditingId,focus=false){
  const body=GCS_APP.querySelector('[data-gcs-page="seals"] [data-gcs-seal-body]');if(!body)return false;
  const wrap=body.closest('.gcs-table-wrap'),top=wrap?.scrollTop||0,left=wrap?.scrollLeft||0;
  gcsSealEditingId=editId?String(editId):'';
  const players=gcsPlayers();body.innerHTML=gcsSealRowsHtml(players);
  const count=GCS_APP.querySelector('[data-gcs-page="seals"] [data-gcs-player-count]');if(count&&count.firstChild)count.firstChild.nodeValue=String(players.length);else if(count)count.textContent=String(players.length);
  if(wrap){wrap.scrollTop=top;wrap.scrollLeft=left}
  if(focus&&gcsSealEditingId){const input=body.querySelector(`[data-gcs-player="${CSS.escape(gcsSealEditingId)}"] [data-gcs-edit-name]`);try{input?.focus({preventScroll:true});input?.select()}catch{input?.focus()}}
  return true;
}
function gcsAddPlayer(){
  const input=GCS_APP.querySelector('#gcs-seal-name'),name=String(input?.value||'').trim();if(!name){gcsToast('Karakter adı gerekli.');return}
  const rows=gcsPlayers(),player={id:gcsId(),name,siper:0,nefes:0,goz:0,gecit:0,esik:0,note:''};rows.push(player);gcsSave(GCS_SEAL_KEY,rows);
  if(input)input.value='';gcsRenderSealRows('',false);try{input?.focus({preventScroll:true})}catch{input?.focus()}
}
function gcsEditPlayer(id){if(!gcsPlayers().some(x=>String(x.id)===String(id)))return;gcsRenderSealRows(String(id),true)}
function gcsSavePlayer(id){
  const row=GCS_APP.querySelector(`[data-gcs-page="seals"] [data-gcs-player="${CSS.escape(String(id))}"]`);if(!row)return;
  const name=String(row.querySelector('[data-gcs-edit-name]')?.value||'').trim();if(!name){gcsToast('Karakter adı boş bırakılamaz.');return}
  const rows=gcsPlayers(),p=rows.find(x=>String(x.id)===String(id));if(!p)return;
  p.name=name;for(const[k]of GCS_SEALS)p[k]=gcsClampSeal(row.querySelector(`[data-gcs-edit-seal="${k}"]`)?.value);p.note=String(row.querySelector('[data-gcs-edit-note]')?.value||'');
  gcsSave(GCS_SEAL_KEY,rows);gcsRenderSealRows('',false);gcsToast('Mühür kaydı güncellendi.');
}
function gcsCancelPlayer(){gcsRenderSealRows('',false)}
function gcsDeletePlayer(id){
  const p=gcsPlayers().find(x=>String(x.id)===String(id));if(!p)return;
  if(!confirm(`${p.name||'Bu karakter'} mühür takibinden silinsin mi?`))return;
  gcsSave(GCS_SEAL_KEY,gcsPlayers().filter(x=>String(x.id)!==String(id)));if(String(gcsSealEditingId)===String(id))gcsSealEditingId='';gcsRenderSealRows('',false)
}

function gcsSetBarState(){
  const bar=GCS_APP.querySelector('[data-gm2-centerbar]');if(!bar)return;
  bar.querySelectorAll('[data-gm2-route],[data-gcs-route]').forEach(b=>b.classList.toggle('on',b.dataset.gcsRoute===gcsActive));
}
function gcsEnsureButtons(){
  if(!gcsIsGM())return;
  const bar=GCS_APP.querySelector('[data-gm2-centerbar]');if(!bar)return;
  const before=bar.querySelector('[data-gm2-route="characters"]');
  for(const[route,label]of GCS_ROUTES){let b=bar.querySelector(`[data-gcs-route="${route}"]`);if(!b){b=document.createElement('button');b.type='button';b.dataset.gcsRoute=route;b.textContent=label;if(before)bar.insertBefore(b,before);else bar.appendChild(b)}}
  gcsSetBarState();
}
function gcsReleaseOtherRooms(){window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.();window.__catlakGmTools?.close?.();window.__catlakGmHubV2Test?.release?.()}
function gcsOpen(route){
  if(!gcsIsGM()||!GCS_ROUTES.some(([k])=>k===route))return false;
  gcsActive=route;window.__catlakCampaignStateRoom=route;gcsReleaseOtherRooms();window.__catlakGmCenterSelectedRoute=GCS_PLACEHOLDER_ROUTE;
  const main=GCS_APP.querySelector('main');if(!main)return false;delete main.dataset.gmtTools;delete main.dataset.gmtSub;main.dataset.gcsRoute=route;
  main.innerHTML=route==='reputation'?gcsRepPage():gcsSealPage();window.__catlakGmHubV2Test?.chrome?.();gcsEnsureButtons();gcsSetBarState();
  requestAnimationFrame(()=>requestAnimationFrame(gcsSetBarState));setTimeout(gcsSetBarState,80);window.scrollTo({top:0,left:0,behavior:'auto'});return true
}
function gcsClose(){gcsActive='';gcsSealEditingId='';window.__catlakCampaignStateRoom='';if(String(window.__catlakGmCenterSelectedRoute||'')===GCS_PLACEHOLDER_ROUTE)window.__catlakGmCenterSelectedRoute='';const m=GCS_APP.querySelector('main');if(m)delete m.dataset.gcsRoute;gcsEnsureButtons()}

function gcsMeterElement(kind,key,source){return source?.closest?.('[data-gcs-meter]')||GCS_APP.querySelector(`[data-gcs-meter="${kind}:${key}"]`)}
function gcsPaintMeter(kind,key,value,source){const next=gcsClamp(value),meter=gcsMeterElement(kind,key,source),score=meter?.querySelector('.gcs-score'),marker=meter?.querySelector('.gcs-marker');if(score){const label=next>0?'+'+next:String(next);if(score.childNodes.length===1&&score.firstChild?.nodeType===3)score.firstChild.nodeValue=label;else score.textContent=label}if(marker)marker.style.left=((next+2)/4*100)+'%'}
function gcsUpdateMeter(kind,key,delta,source){if(kind!=='rep'&&kind!=='world')return null;const storage=kind==='world'?GCS_WORLD_KEY:GCS_REP_KEY,state=gcsLoad(storage,{}),next=gcsClamp((Number(state[key])||0)+(Number(delta)||0));state[key]=next;gcsSave(storage,state);gcsPaintMeter(kind,key,next,source);return next}
function gcsReset(kind){const world=kind==='world',label=world?'dünya durumu göstergelerini':'fraksiyon itibarlarını';if(!confirm(`Tüm ${label} 0 yapılsın mı?`))return;const rows=world?GCS_WORLD:GCS_REPS,state={};rows.forEach(([k])=>state[k]=0);gcsSave(world?GCS_WORLD_KEY:GCS_REP_KEY,state);rows.forEach(([k])=>gcsPaintMeter(world?'world':'rep',k,0))}

function gcsMaintain(){if(!gcsIsGM()){gcsClose();return}if(gcsActive){const root=GCS_APP.querySelector(`[data-gcs-page="${gcsActive}"]`),selected=String(window.__catlakGmCenterSelectedRoute||'');if(!root||selected!==GCS_PLACEHOLDER_ROUTE){gcsActive='';gcsSealEditingId='';window.__catlakCampaignStateRoom=''}}gcsEnsureButtons()}
function gcsQueue(){if(gcsQueued)return;gcsQueued=true;requestAnimationFrame(()=>{gcsQueued=false;gcsMaintain()})}
function gcsConsume(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}
function gcsDeltaButton(target){return target?.closest?.('[data-gcs-page="reputation"] [data-gcs-delta]')||null}
function gcsApplyDelta(button){return gcsUpdateMeter(button.dataset.gcsKind,button.dataset.gcsKey,button.dataset.gcsDelta,button)}
function gcsSealActionButton(target){return target?.closest?.('[data-gcs-page="seals"] button[data-gcs-add-player],[data-gcs-page="seals"] button[data-gcs-edit-player],[data-gcs-page="seals"] button[data-gcs-save-player],[data-gcs-page="seals"] button[data-gcs-cancel-player],[data-gcs-page="seals"] button[data-gcs-delete-player]')||null}
function gcsSealActionKeyOf(button){if(button.hasAttribute('data-gcs-add-player'))return'add';for(const k of['edit','save','cancel','delete']){const v=button.getAttribute(`data-gcs-${k}-player`);if(v!=null)return`${k}:${v}`}return''}
function gcsRunSealAction(button){if(button.hasAttribute('data-gcs-add-player'))return gcsAddPlayer();const edit=button.getAttribute('data-gcs-edit-player');if(edit!=null)return gcsEditPlayer(edit);const save=button.getAttribute('data-gcs-save-player');if(save!=null)return gcsSavePlayer(save);const cancel=button.getAttribute('data-gcs-cancel-player');if(cancel!=null)return gcsCancelPlayer(cancel);const del=button.getAttribute('data-gcs-delete-player');if(del!=null)return gcsDeletePlayer(del)}

window.addEventListener('pointerdown',e=>{
  if(e.button!=null&&e.button!==0)return;
  const delta=gcsDeltaButton(e.target);if(delta){gcsConsume(e);gcsDeltaLockUntil=performance.now()+1000;gcsApplyDelta(delta);return}
  const action=gcsSealActionButton(e.target);if(action){gcsConsume(e);gcsSealActionKey=gcsSealActionKeyOf(action);gcsSealActionLockUntil=performance.now()+1000;gcsRunSealAction(action)}
},true);
window.addEventListener('pointerup',e=>{if(gcsDeltaButton(e.target)||gcsSealActionButton(e.target))gcsConsume(e)},true);
window.addEventListener('click',e=>{
  const delta=gcsDeltaButton(e.target);if(delta){gcsConsume(e);if(performance.now()>gcsDeltaLockUntil)gcsApplyDelta(delta);return}
  const action=gcsSealActionButton(e.target);if(action){gcsConsume(e);const key=gcsSealActionKeyOf(action);if(!(key===gcsSealActionKey&&performance.now()<gcsSealActionLockUntil))gcsRunSealAction(action);return}
  const route=e.target.closest?.('[data-gcs-route]');if(route){gcsConsume(e);gcsOpen(String(route.dataset.gcsRoute||''));return}
},true);

document.addEventListener('click',e=>{if(!e.target.closest?.('[data-gcs-page]'))return;const reset=e.target.closest?.('[data-gcs-reset]');if(reset){gcsConsume(e);gcsReset(reset.dataset.gcsReset)}},true);
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target?.id==='gcs-seal-name'){e.preventDefault();gcsAddPlayer();return}
  if(e.key==='Escape'&&e.target?.closest?.('[data-gcs-page="seals"] [data-gcs-editing="1"]')){e.preventDefault();gcsCancelPlayer()}
},true);
new MutationObserver(gcsQueue).observe(GCS_APP,{childList:true,subtree:true});
setTimeout(gcsMaintain,250);setTimeout(gcsMaintain,900);
window.__catlakGcsDeltaPointerV2=true;
window.__catlakCampaignRoomStableV3=true;
window.__catlakSealEditorStableV1=true;
window.__catlakCampaignStateTest={open:gcsOpen,close:gcsClose,active:()=>gcsActive,maintain:gcsMaintain,delta:gcsUpdateMeter,renderSeals:gcsRenderSealRows,editSeal:gcsEditPlayer,saveSeal:gcsSavePlayer};