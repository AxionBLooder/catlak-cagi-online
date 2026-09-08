const CCX_S=window.__catlakSupabase;
const CCX_APP=document.querySelector('#app');
if(!CCX_S||!CCX_APP)throw new Error('Çatlak Çağı birleşik Evren/Stat katmanı başlatılamadı.');

const ccxH=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ccxTxt=e=>String(e?.textContent||'').trim();
const ccxIsGM=()=>ccxTxt(CCX_APP.querySelector('.role'))==='GM';
const CCX_STATS=['STR','DEX','CON','INT','WIS','CHA'];
let ccxMode='',ccxBusy=false,ccxNavScheduled=false;
const ccxToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(ccxToast.t);ccxToast.t=setTimeout(()=>t.classList.add('hidden'),4300)};

const ccxCss=`
.ccx-world-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px}.ccx-media{overflow:hidden;padding:14px}.ccx-media-frame{width:100%;aspect-ratio:16/10;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:16px;border:1px solid var(--line);background:radial-gradient(circle at center,#17243a 0,#080d17 70%);cursor:zoom-in}.ccx-media-frame img{width:100%;height:100%;object-fit:contain;display:block;padding:6px}.ccx-media-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:10px}.ccx-media h3{margin:.25rem 0}.ccx-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ccx-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ccx-form-grid .wide{grid-column:1/-1}.ccx-world-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.ccx-empty{padding:24px;border:1px dashed var(--line);border-radius:14px;color:var(--muted);text-align:center}.ccx-danger{border-color:#713b49!important;color:#ffb7c2!important}.ccx-modal{position:fixed;inset:0;z-index:99999;background:#02050bea;display:flex;align-items:center;justify-content:center;padding:28px}.ccx-modal img{max-width:96vw;max-height:90vh;object-fit:contain;border-radius:16px;box-shadow:0 25px 100px #000}.ccx-modal button{position:fixed;right:22px;top:20px;z-index:2}.ccx-stat-list{display:grid;gap:16px}.ccx-stat-card{border-color:#344d69!important}.ccx-stat-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.ccx-stat-badge{border:1px solid var(--line);border-radius:999px;padding:5px 9px;font-size:.72rem}.ccx-stat-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin:14px 0}.ccx-vitals-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.ccx-stat-grid label,.ccx-vitals-grid label{font-size:.72rem;color:var(--muted)}.ccx-stat-grid input,.ccx-vitals-grid input{margin-top:4px;text-align:center;font-weight:800}.ccx-save-row{display:flex;justify-content:flex-end;margin-top:13px}.ccx-hero{background:linear-gradient(135deg,#12283b,#0b1422 58%,#21182a)!important;border-color:#36536e!important}
@media(max-width:950px){.ccx-world-columns{grid-template-columns:1fr}.ccx-stat-grid{grid-template-columns:repeat(3,1fr)}.ccx-vitals-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:620px){.ccx-world-grid{grid-template-columns:1fr}.ccx-form-grid{grid-template-columns:1fr}.ccx-form-grid .wide{grid-column:auto}.ccx-stat-grid,.ccx-vitals-grid{grid-template-columns:repeat(2,1fr)}}
`;
if(!document.querySelector('#ccx-style')){const s=document.createElement('style');s.id='ccx-style';s.textContent=ccxCss;document.head.appendChild(s)}

function ccxEnsureNav(){
  const nav=CCX_APP.querySelector('.nav');if(!nav)return;
  let world=nav.querySelector('[data-cc-world-tab]');
  if(!world){world=document.createElement('button');world.type='button';world.dataset.ccWorldTab='1';world.textContent='Evren';const rules=nav.querySelector('[data-tab="rules"]');rules?rules.before(world):nav.appendChild(world)}
  if(ccxIsGM()){
    let stats=nav.querySelector('[data-cc-stats-tab]');
    if(!stats){stats=document.createElement('button');stats.type='button';stats.dataset.ccStatsTab='1';stats.dataset.tab='stats-workshop';stats.textContent='Stat Atölyesi';const chars=nav.querySelector('[data-tab="characters"]'),races=nav.querySelector('[data-tab="races"]');chars?chars.after(stats):races?races.before(stats):nav.appendChild(stats)}
  }else nav.querySelector('[data-cc-stats-tab]')?.remove();
}

function ccxSelectNav(target){const nav=CCX_APP.querySelector('.nav');if(!nav)return;nav.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===target))}
function ccxMediaTitle(x,kind){return kind==='npc'?(x.name||'Adsız NPC'):(x.title||'Adsız Görsel')}
function ccxMediaNote(x,kind){return kind==='npc'?(x.note||''):(x.description||'')}
function ccxMediaCard(x,kind){
  const title=ccxMediaTitle(x,kind),note=ccxMediaNote(x,kind),img=x.image_url||'',tag=kind==='map'?'HARİTA':kind==='npc'?'NPC':'EVREN';
  return`<article class="card ccx-media" data-ccx-card="${x.id}"><div class="ccx-media-head"><div><span class="tag">${tag}</span><h3>${ccxH(title)}</h3></div>${ccxIsGM()?`<button type="button" class="ccx-danger small" data-ccx-delete="${x.id}" data-kind="${kind}">Sil</button>`:''}</div>${img?`<div class="ccx-media-frame" data-ccx-zoom="1"><img src="${ccxH(img)}" alt="${ccxH(title)}" loading="lazy"></div>`:''}<p>${ccxH(note)}</p></article>`
}

async function ccxRenderWorld(force=false){
  if(ccxMode!=='world'||ccxBusy)return;const main=CCX_APP.querySelector('main');if(!main)return;if(!force&&main.dataset.ccxPage==='world')return;ccxBusy=true;
  try{
    const [mr,or,nr]=await Promise.all([
      CCX_S.from('catlak_world_media').select('*').eq('media_type','map').order('sort_order').order('created_at',{ascending:true}),
      CCX_S.from('catlak_world_media').select('*').eq('media_type','other').order('sort_order').order('created_at',{ascending:true}),
      CCX_S.from('catlak_npcs').select('*').order('sort_order').order('created_at',{ascending:true})
    ]);
    if(mr.error)throw mr.error;if(or.error)throw or.error;if(nr.error)throw nr.error;
    const maps=mr.data||[],others=or.data||[],npcs=nr.data||[],gm=ccxIsGM();
    const forms=gm?`<div class="ccx-world-columns"><section class="card"><div class="eyebrow">HARİTA EKLE</div><h3>Yeni Harita</h3><div class="ccx-form-grid"><label>Başlık<input id="ccx-map-title"></label><label>Görsel URL<input id="ccx-map-url"></label><label class="wide">Açıklama<textarea id="ccx-map-note"></textarea></label></div><button class="primary" data-ccx-add="map">Haritayı Ekle</button></section><section class="card"><div class="eyebrow">EVREN GÖRSELİ EKLE</div><h3>Bölge / Sahne</h3><div class="ccx-form-grid"><label>Başlık<input id="ccx-other-title"></label><label>Görsel URL<input id="ccx-other-url"></label><label class="wide">Açıklama<textarea id="ccx-other-note"></textarea></label></div><button class="primary" data-ccx-add="other">Görseli Ekle</button></section><section class="card"><div class="eyebrow">NPC EKLE</div><h3>Yeni NPC</h3><div class="ccx-form-grid"><label>Ad<input id="ccx-npc-name"></label><label>Rol<input id="ccx-npc-role"></label><label>Yer<input id="ccx-npc-place"></label><label>İlişki<input id="ccx-npc-relation"></label><label class="wide">Görsel URL<input id="ccx-npc-url"></label><label class="wide">Not<textarea id="ccx-npc-note"></textarea></label></div><button class="primary" data-ccx-add="npc">NPC Ekle</button></section></div>`:'';
    main.innerHTML=`<section class="card ccx-hero"><div class="eyebrow">ÇATLAK ÇAĞI • EVREN</div><h1>Evren Arşivi</h1><p class="muted">Görseller kırpılmadan, gerçek oranları korunarak gösterilir. Görsele tıklayarak büyük açabilirsin.</p><div class="row"><span class="tag">${maps.length} HARİTA</span><span class="tag">${others.length} EVREN GÖRSELİ</span><span class="tag">${npcs.length} NPC</span></div></section>${forms}<section class="card"><div class="eyebrow">HARİTALAR</div><h2>Harita Arşivi</h2>${maps.length?`<div class="ccx-world-grid">${maps.map(x=>ccxMediaCard(x,'map')).join('')}</div>`:'<div class="ccx-empty">Harita yok.</div>'}</section><section class="card"><div class="eyebrow">EVREN GÖRSELLERİ</div><h2>Bölgeler & Sahneler</h2>${others.length?`<div class="ccx-world-grid">${others.map(x=>ccxMediaCard(x,'other')).join('')}</div>`:'<div class="ccx-empty">Evren görseli yok.</div>'}</section><section class="card"><div class="eyebrow">NPC ARŞİVİ</div><h2>Karakter Görselleri</h2>${npcs.length?`<div class="ccx-world-grid">${npcs.map(x=>ccxMediaCard(x,'npc')).join('')}</div>`:'<div class="ccx-empty">NPC yok.</div>'}</section>`;
    main.dataset.ccxPage='world';
  }catch(e){ccxToast('Evren yüklenemedi: '+(e?.message||String(e)))}finally{ccxBusy=false}
}

async function ccxAdd(kind){
  if(!ccxIsGM())return;
  if(kind==='npc'){
    const name=document.querySelector('#ccx-npc-name')?.value.trim();if(!name)return ccxToast('NPC adı gerekli.');
    const {error}=await CCX_S.from('catlak_npcs').insert({name,role:document.querySelector('#ccx-npc-role')?.value.trim()||'NPC',place:document.querySelector('#ccx-npc-place')?.value.trim()||'',relation:document.querySelector('#ccx-npc-relation')?.value.trim()||'',image_url:document.querySelector('#ccx-npc-url')?.value.trim()||'',note:document.querySelector('#ccx-npc-note')?.value||'',visible:true,sort_order:0,data:{}});if(error)throw error;
  }else{
    const prefix=kind==='map'?'map':'other',title=document.querySelector(`#ccx-${prefix}-title`)?.value.trim();if(!title)return ccxToast('Başlık gerekli.');
    const {error}=await CCX_S.from('catlak_world_media').insert({media_type:kind,title,image_url:document.querySelector(`#ccx-${prefix}-url`)?.value.trim()||'',description:document.querySelector(`#ccx-${prefix}-note`)?.value||'',visible:true,sort_order:0,data:{}});if(error)throw error;
  }
  ccxToast('Evren kaydı eklendi.');await ccxRenderWorld(true)
}

async function ccxDelete(id,kind){
  if(!ccxIsGM()||!confirm('Bu görsel kalıcı olarak silinsin mi?'))return;
  const table=kind==='npc'?'catlak_npcs':'catlak_world_media';const {error}=await CCX_S.from(table).delete().eq('id',id);if(error)throw error;
  document.querySelector(`[data-ccx-card="${CSS.escape(String(id))}"]`)?.remove();ccxToast('Görsel silindi.');
}

function ccxInput(c,key,value,min,max){return`<label>${key}<input type="number" min="${min}" max="${max}" data-ccx-field="${key}" value="${Number(value??0)}"></label>`}
function ccxCharacterCard(c){
  const s=c.base_stats||{},status=c.play_status==='active'?'CANLI':'HAZIR';
  return`<article class="card ccx-stat-card" data-ccx-character="${c.id}"><div class="ccx-stat-head"><div><div class="eyebrow">${status}</div><h2>${ccxH(c.name)}</h2><p class="muted">${ccxH(c.species_name||'')} • ${ccxH(c.class_name||'')} • ${ccxH(c.background_name||'')}</p></div><span class="ccx-stat-badge">${status}</span></div><h3>Temel Statlar</h3><div class="ccx-stat-grid">${CCX_STATS.map(k=>ccxInput(c,k,s[k]??10,1,99)).join('')}</div><h3>Can & Savaş Değerleri</h3><div class="ccx-vitals-grid">${ccxInput(c,'HP_CURRENT',c.hp_current,0,99999)}${ccxInput(c,'HP_MAX',c.hp_max,1,99999)}${ccxInput(c,'AC',c.base_ac,0,999)}${ccxInput(c,'SPEED',c.base_speed,0,9999)}${ccxInput(c,'LEVEL',c.level,1,20)}</div><div class="ccx-save-row"><button class="primary" data-ccx-save-stats="${c.id}">Değişiklikleri Kaydet</button></div></article>`
}

async function ccxRenderStats(force=false){
  if(ccxMode!=='stats'||!ccxIsGM()||ccxBusy)return;const main=CCX_APP.querySelector('main');if(!main)return;if(!force&&main.dataset.ccxPage==='stats')return;ccxBusy=true;
  try{
    const {data,error}=await CCX_S.from('catlak_characters').select('id,name,species_name,background_name,class_name,play_status,base_stats,hp_current,hp_max,base_ac,base_speed,level,created_at').in('play_status',['prepared','active']).order('play_status').order('created_at',{ascending:true});if(error)throw error;
    const chars=data||[];main.innerHTML=`<section class="card ccx-hero"><div class="eyebrow">GM • STAT ATÖLYESİ</div><h1>Karakter Değerlerini Düzenle</h1><p class="muted">Hazır ve canlı karakterlerin STR–CHA, HP, AC, Hız ve Seviye değerlerini buradan kalıcı olarak değiştirebilirsin. Kaydettiğin değerler oyuncu karakter kağıdına Realtime ile yansır.</p></section><div class="ccx-stat-list">${chars.length?chars.map(ccxCharacterCard).join(''):'<section class="card ccx-empty">Düzenlenecek karakter yok.</section>'}</div>`;main.dataset.ccxPage='stats';
  }catch(e){ccxToast('Stat Atölyesi yüklenemedi: '+(e?.message||String(e)))}finally{ccxBusy=false}
}

async function ccxSaveStats(id){
  const card=document.querySelector(`[data-ccx-character="${CSS.escape(String(id))}"]`);if(!card)return;
  const v=k=>Number(card.querySelector(`[data-ccx-field="${k}"]`)?.value);
  const stats={};CCX_STATS.forEach(k=>stats[k]=v(k));
  const {data,error}=await CCX_S.rpc('catlak_gm_update_character_sheet',{p_character_id:id,p_stats:stats,p_hp_current:v('HP_CURRENT'),p_hp_max:v('HP_MAX'),p_ac:v('AC'),p_speed:v('SPEED'),p_level:v('LEVEL')});if(error)throw error;
  ccxToast((data?.name||'Karakter')+' statları kaydedildi ve oyuncu kağıdına yansıtıldı.');
}

function ccxOpenZoom(img){const old=document.querySelector('.ccx-modal');if(old)old.remove();const m=document.createElement('div');m.className='ccx-modal';m.innerHTML=`<button type="button" class="danger" data-ccx-close-zoom>Kapat ✕</button><img src="${ccxH(img.src)}" alt="${ccxH(img.alt||'Görsel')}">`;document.body.appendChild(m)}

// Document capture: eski Evren renderer'ına ulaşmadan tek renderer sahipliği burada alınır.
document.addEventListener('click',e=>{
  const world=e.target.closest('#app [data-cc-world-tab]');
  if(world){e.preventDefault();e.stopImmediatePropagation();window.__catlakSetWorldActive?.(false);ccxMode='world';ccxSelectNav(world);const main=CCX_APP.querySelector('main');if(main){main.removeAttribute('data-ccPage');main.removeAttribute('data-ccSimpleLive')}ccxRenderWorld(true);return}
  const stats=e.target.closest('#app [data-cc-stats-tab]');
  if(stats&&ccxIsGM()){e.preventDefault();e.stopImmediatePropagation();window.__catlakSetWorldActive?.(false);ccxMode='stats';ccxSelectNav(stats);ccxRenderStats(true);return}
  const nav=e.target.closest('#app .nav button');if(nav&&!world&&!stats)ccxMode='';

  const add=e.target.closest('[data-ccx-add]');if(add){e.preventDefault();e.stopImmediatePropagation();ccxAdd(add.dataset.ccxAdd).catch(x=>ccxToast(x.message||String(x)));return}
  const del=e.target.closest('[data-ccx-delete]');if(del){e.preventDefault();e.stopImmediatePropagation();ccxDelete(del.dataset.ccxDelete,del.dataset.kind).catch(x=>ccxToast(x.message||String(x)));return}
  const save=e.target.closest('[data-ccx-save-stats]');if(save){e.preventDefault();e.stopImmediatePropagation();ccxSaveStats(save.dataset.ccxSaveStats).catch(x=>ccxToast(x.message||String(x)));return}
  const zoom=e.target.closest('[data-ccx-zoom] img');if(zoom){e.preventDefault();ccxOpenZoom(zoom);return}
  if(e.target.closest('[data-ccx-close-zoom]')||e.target.classList?.contains('ccx-modal'))document.querySelector('.ccx-modal')?.remove();
},true);

function ccxScheduleNav(){if(ccxNavScheduled)return;ccxNavScheduled=true;requestAnimationFrame(()=>{ccxNavScheduled=false;ccxEnsureNav();if(ccxMode==='world'&&!CCX_APP.querySelector('main')?.dataset.ccxPage)ccxRenderWorld();if(ccxMode==='stats'&&!CCX_APP.querySelector('main')?.dataset.ccxPage)ccxRenderStats()})}
new MutationObserver(ccxScheduleNav).observe(CCX_APP,{childList:true,subtree:true});
CCX_S.channel('ccx-unified-world').on('postgres_changes',{event:'*',schema:'public',table:'catlak_world_media'},()=>{if(ccxMode==='world')ccxRenderWorld(true)}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_npcs'},()=>{if(ccxMode==='world')ccxRenderWorld(true)}).subscribe();
ccxEnsureNav();
