(function(){
'use strict';
if(window.__catlakVisualArchiveMapFlowV2)return;
window.__catlakVisualArchiveMapFlowV2=true;
const APP=document.querySelector('#app');
const S=window.__catlakSupabase;
if(!APP||!S)return;
const BUCKET='catlak-world-media';
const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3600)};
let busy=false,queued=false;

if(!document.querySelector('#vamf-style')){
 const st=document.createElement('style');st.id='vamf-style';st.textContent=`
 #app [data-vamf-places] .vamf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px}
 #app .vamf-card{overflow:hidden}.vamf-frame{min-height:220px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:14px;background:#050b14;padding:8px;margin:9px 0}.vamf-frame img{display:block;width:auto;height:auto;max-width:100%;max-height:410px;object-fit:contain}.vamf-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.vamf-actions .danger{margin-left:auto}
 #app main[data-sw-page="gallery"]>section.card:has(.sw-gallery-head),#app main[data-sw-page="gallery"] .sw-gallery,#app main[data-sw-page="gallery"] .sw-gallery-head{display:none!important}
 `;document.head.appendChild(st)
}

function mapActive(){return !!APP.querySelector('.nav [data-cc-map-tab].on')}
function cleanupArchivePage(){
 const main=APP.querySelector('main');if(!main||main.dataset.swPage!=='gallery')return;
 [...main.querySelectorAll(':scope > section.card')].forEach(sec=>{
   if(sec.querySelector('.sw-gallery-head,.sw-gallery')||txt(sec.querySelector('h2'))==='Yüklenen Görseller')sec.remove()
 });
 const hero=main.querySelector('.sw-hero');if(hero){
  const h=hero.querySelector('h1');if(h&&isGM())h.textContent='Görsel Yükleme';
  const p=hero.querySelector('p');if(p&&isGM())p.textContent='Bu ekran yalnız görsel eklemek içindir. Yüklediğin görseller Harita ekranındaki ilgili bölüme otomatik yerleşir.';
 }
 main.querySelectorAll('option[value="other"]').forEach(o=>o.textContent='Yer / Sahne');
}

function enhanceBaseCards(){
 if(!mapActive())return;
 APP.querySelectorAll('main .cc-map-card').forEach(card=>{
  const push=card.querySelector('[data-cc-party-push]');if(!push||card.querySelector('[data-vamf-delete]'))return;
  const id=push.dataset.ccPartyPush,kind=push.dataset.kind||'map';
  const b=document.createElement('button');b.type='button';b.className='danger';b.dataset.vamfDelete=id;b.dataset.kind=kind;b.textContent='Sil';
  const actions=push.closest('.cc-map-actions')||push.parentElement;actions?.appendChild(b);
 });
}

async function renderPlaces(){
 if(!mapActive()||busy)return;
 const main=APP.querySelector('main');if(!main||main.dataset.ccMapPage!=='1')return;
 main.querySelector('[data-ccq-other-archive]')?.remove();
 if(main.querySelector('[data-vamf-places]')){enhanceBaseCards();return}
 busy=true;
 try{
  const r=await S.from('catlak_world_media').select('*').eq('media_type','other').eq('visible',true).order('created_at',{ascending:false});if(r.error)throw r.error;
  if(!mapActive())return;const now=APP.querySelector('main');if(!now||now.dataset.ccMapPage!=='1')return;
  now.querySelector('[data-ccq-other-archive]')?.remove();
  const rows=r.data||[],sec=document.createElement('section');sec.className='card';sec.dataset.vamfPlaces='1';
  sec.innerHTML=`<div class="eyebrow">YERLER & SAHNELER</div><h2>Evren Görselleri</h2><p class="muted">Görsel Yükleme ekranında “Yer / Sahne” olarak eklenen kayıtlar burada tutulur.</p>${rows.length?`<div class="vamf-grid">${rows.map(x=>`<article class="card vamf-card" data-vamf-card="${esc(x.id)}"><span class="tag">YER / SAHNE</span><h3>${esc(x.title||'Adsız Yer')}</h3>${x.image_url?`<div class="vamf-frame"><img src="${esc(x.image_url)}" alt="${esc(x.title||'Yer görseli')}" loading="lazy"></div>`:''}${x.description?`<p>${esc(x.description)}</p>`:''}<div class="vamf-actions"><button type="button" class="primary" data-vamf-party="${esc(x.id)}">Partiye Yansıt</button><button type="button" class="danger" data-vamf-delete="${esc(x.id)}" data-kind="other">Sil</button></div></article>`).join('')}</div>`:'<div class="empty">Henüz Yer / Sahne görseli yok.</div>'}`;
  now.appendChild(sec);enhanceBaseCards();
 }catch(e){console.error('VAMF_RENDER',e)}finally{busy=false}
}

async function partyOther(id){
 const r=await S.from('catlak_world_media').select('*').eq('id',id).eq('media_type','other').maybeSingle();if(r.error)throw r.error;if(!r.data)throw new Error('Görsel bulunamadı.');const x=r.data;
 const u=await S.from('catlak_party_visual').upsert({singleton:true,kind:'other',ref_id:id,title:x.title||'',image_url:x.image_url||'',note:x.description||'',updated_at:new Date().toISOString()},{onConflict:'singleton'});if(u.error)throw u.error;toast((x.title||'Görsel')+' partiye yansıtıldı.');
}
async function deleteVisual(id,kind){
 if(!isGM()||!confirm('Bu görsel kalıcı olarak silinsin mi?'))return;
 const table=kind==='npc'?'catlak_npcs':'catlak_world_media';
 const r=await S.from(table).select('id,image_url,data').eq('id',id).maybeSingle();if(r.error)throw r.error;if(!r.data)return;
 const path=r.data?.data?.storage_path||'';if(path){const rm=await S.storage.from(BUCKET).remove([path]);if(rm.error)console.warn('VAMF_STORAGE',rm.error)}
 const del=await S.from(table).delete().eq('id',id);if(del.error)throw del.error;
 try{const pv=await S.from('catlak_party_visual').select('singleton,ref_id,kind').eq('singleton',true).maybeSingle();if(pv.data&&String(pv.data.ref_id)===String(id)){await S.from('catlak_party_visual').update({kind:'',ref_id:null,title:'',image_url:'',note:'',updated_at:new Date().toISOString()}).eq('singleton',true)}}catch(_){ }
 APP.querySelector(`[data-vamf-card="${CSS.escape(String(id))}"]`)?.remove();
 APP.querySelector(`[data-cc-party-push="${CSS.escape(String(id))}"]`)?.closest('.cc-map-card')?.remove();
 APP.querySelector('[data-vamf-places]')?.remove();toast('Görsel silindi.');schedule(20);
}
function maintain(){queued=false;cleanupArchivePage();if(mapActive()){enhanceBaseCards();renderPlaces()}}
function schedule(ms=0){if(queued)return;queued=true;setTimeout(()=>requestAnimationFrame(maintain),ms)}

window.addEventListener('click',e=>{
 const p=e.target?.closest?.('[data-vamf-party]');if(p){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();partyOther(p.dataset.vamfParty).catch(x=>toast('Partiye yansıtılamadı: '+(x?.message||String(x))));return}
 const d=e.target?.closest?.('[data-vamf-delete]');if(d){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();deleteVisual(d.dataset.vamfDelete,d.dataset.kind||'map').catch(x=>toast('Silinemedi: '+(x?.message||String(x))));return}
 if(e.target?.closest?.('[data-cc-map-tab],[data-cc-world-tab]'))schedule(80);
},true);
new MutationObserver(rs=>{
  if(mapActive()){schedule(0);return}
  const relevant=rs.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('[data-cc-map-tab],[data-cc-world-tab],[data-vamf-card],[data-vamf-places],.cc-map-gallery')||n.querySelector?.('[data-cc-map-tab],[data-cc-world-tab],[data-vamf-card],[data-vamf-places],.cc-map-gallery'))));
  if(relevant)schedule(0);
}).observe(APP,{childList:true,subtree:true});
S.channel('vamf-world').on('postgres_changes',{event:'*',schema:'public',table:'catlak_world_media'},()=>{APP.querySelector('[data-vamf-places]')?.remove();schedule(80)}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_npcs'},()=>schedule(80)).subscribe();
setTimeout(()=>schedule(0),300);
window.__catlakVisualArchiveMapFlow={maintain,renderPlaces};
})();