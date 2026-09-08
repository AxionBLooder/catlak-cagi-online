const SW_S=window.__catlakSupabase;
const SW_APP=document.querySelector('#app');
if(!SW_S||!SW_APP)throw new Error('Görsel Arşivi katmanı başlatılamadı.');

const SW_BUCKET='catlak-world-media';
const SW_ALLOWED=new Set(['image/jpeg','image/png','image/webp','image/gif']);
const SW_MAX_SIZE=12*1024*1024;
const SW_MAX_BATCH=30;
const swH=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const swTxt=e=>String(e?.textContent||'').trim();
const swGM=()=>swTxt(SW_APP.querySelector('.role'))==='GM';
const swToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(swToast.t);swToast.t=setTimeout(()=>t.classList.add('hidden'),5200)};
let swActive=false,swBusy=false,swToken=0,swQueue=[];

const swCss=`
.sw-hero{background:linear-gradient(135deg,#12283b,#0b1422 58%,#21182a)!important;border-color:#36536e!important}.sw-upload{display:grid;grid-template-columns:minmax(260px,1.4fr) minmax(170px,.55fr) auto;gap:10px;align-items:end}.sw-filepick{position:relative;border:1px dashed #4a6f8f;border-radius:14px;background:#091522;padding:13px;min-height:74px;display:flex;align-items:center;gap:11px;cursor:pointer}.sw-filepick:hover{border-color:var(--cyan);background:#0d1d2c}.sw-filepick input{position:absolute;inset:0;opacity:0;cursor:pointer}.sw-file-icon{width:42px;height:42px;border-radius:12px;background:#10283b;border:1px solid #315775;display:grid;place-items:center;font-size:1.2rem;flex:0 0 auto}.sw-file-meta{min-width:0}.sw-file-meta b,.sw-file-meta span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sw-file-meta span{color:var(--muted);font-size:.76rem;margin-top:3px}.sw-upload button{height:42px}.sw-note{margin-top:10px}.sw-note summary{font-weight:700;color:var(--muted)}.sw-batch{display:grid;gap:9px;margin-top:12px}.sw-batch-empty{padding:18px;border:1px dashed var(--line);border-radius:14px;color:var(--muted);text-align:center}.sw-batch-row{display:grid;grid-template-columns:92px minmax(180px,1fr) minmax(145px,.48fr) auto;gap:10px;align-items:center;padding:9px;border:1px solid var(--line);border-radius:14px;background:#08121d}.sw-batch-thumb{width:92px;height:68px;border-radius:10px;object-fit:contain;background:#050b11;border:1px solid var(--line)}.sw-batch-meta{min-width:0}.sw-batch-meta small{display:block;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:5px}.sw-batch-meta input{width:100%}.sw-batch-status{font-size:.72rem;color:var(--muted);margin-top:4px}.sw-batch-status.ok{color:#8be0ae}.sw-batch-status.err{color:#ff9fac}.sw-gallery-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:14px}.sw-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.sw-card{padding:12px;overflow:hidden}.sw-img{aspect-ratio:16/10;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#060d15;display:flex;align-items:center;justify-content:center;cursor:zoom-in}.sw-img img{width:100%;height:100%;object-fit:contain;display:block}.sw-card-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-top:10px}.sw-card h3{margin:4px 0 2px;font-size:1.04rem}.sw-card p{margin:8px 0 0;color:var(--muted);font-size:.86rem;white-space:pre-line}.sw-card-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.sw-empty{padding:30px;border:1px dashed var(--line);border-radius:14px;text-align:center;color:var(--muted)}.sw-danger{border-color:#713b49!important;color:#ffb7c2!important}.sw-modal{position:fixed;inset:0;z-index:99999;background:#02050bea;display:flex;align-items:center;justify-content:center;padding:24px}.sw-modal img{max-width:96vw;max-height:91vh;object-fit:contain;border-radius:14px}.sw-modal button{position:fixed;right:20px;top:18px}.sw-loading{opacity:.65;pointer-events:none}
@media(max-width:900px){.sw-upload{grid-template-columns:1fr 1fr}.sw-filepick{grid-column:1/-1}.sw-upload button{width:100%}.sw-batch-row{grid-template-columns:74px minmax(160px,1fr) minmax(130px,.55fr) auto}.sw-batch-thumb{width:74px;height:58px}}
@media(max-width:620px){.sw-upload{grid-template-columns:1fr}.sw-filepick{grid-column:auto}.sw-gallery{grid-template-columns:1fr}.sw-gallery-head{align-items:flex-start;flex-direction:column}.sw-batch-row{grid-template-columns:68px 1fr}.sw-batch-thumb{width:68px;height:56px}.sw-batch-row>select,.sw-batch-row>[data-sw-q-remove]{grid-column:2}.sw-batch-row>[data-sw-q-remove]{width:100%}}
`;
if(!document.querySelector('#sw-style')){const s=document.createElement('style');s.id='sw-style';s.textContent=swCss;document.head.appendChild(s)}

function swEnsureNav(){const nav=SW_APP.querySelector('.nav');if(!nav)return;const b=nav.querySelector('[data-cc-world-tab]');if(b&&swTxt(b)!=='Görsel Arşivi')b.textContent='Görsel Arşivi'}
function swSelectNav(btn){const nav=SW_APP.querySelector('.nav');if(nav)nav.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===btn))}
function swKindLabel(k){return k==='map'?'HARİTA':k==='npc'?'NPC':'EVREN'}
function swKindOptions(value){return `<option value="other"${value==='other'?' selected':''}>Evren Görseli</option><option value="map"${value==='map'?' selected':''}>Harita</option><option value="npc"${value==='npc'?' selected':''}>NPC</option>`}
function swTitle(x,k){return k==='npc'?(x.name||'Adsız NPC'):(x.title||'Adsız Görsel')}
function swNoteText(x,k){return k==='npc'?(x.note||''):(x.description||'')}
function swCard(x,k){const title=swTitle(x,k),note=swNoteText(x,k),img=x.image_url||'';return `<article class="card sw-card" data-sw-card="${swH(x.id)}"><div class="sw-img" data-sw-zoom="1"><img src="${swH(img)}" alt="${swH(title)}" loading="lazy"></div><div class="sw-card-head"><div><span class="tag">${swKindLabel(k)}</span><h3>${swH(title)}</h3></div></div>${note?`<p>${swH(note)}</p>`:''}${swGM()?`<div class="sw-card-actions"><button type="button" class="small" data-sw-rename="${swH(x.id)}" data-sw-kind="${k}" data-sw-name="${swH(title)}">Adı Değiştir</button><button type="button" class="small primary" data-sw-party="${swH(x.id)}" data-sw-kind="${k}">Partiye Yansıt</button><button type="button" class="small sw-danger" data-sw-delete="${swH(x.id)}" data-sw-kind="${k}">Sil</button></div>`:''}</article>`}

function swQueueHtml(){
  if(!swQueue.length)return '<div class="sw-batch-empty">Toplu yükleme için bir veya birden fazla görsel seç.</div>';
  return swQueue.map(q=>`<div class="sw-batch-row" data-sw-q="${swH(q.id)}"><img class="sw-batch-thumb" src="${swH(q.url)}" alt=""><div class="sw-batch-meta"><small>${swH(q.file.name)} • ${(q.file.size/1024/1024).toFixed(1)} MB</small><input data-sw-q-name="${swH(q.id)}" value="${swH(q.name)}" placeholder="Görsele ad ver"><div class="sw-batch-status ${q.status==='Yüklendi'?'ok':q.status?.startsWith('Hata')?'err':''}">${swH(q.status||'Yüklemeye hazır')}</div></div><select data-sw-q-kind="${swH(q.id)}">${swKindOptions(q.kind)}</select><button type="button" class="small sw-danger" data-sw-q-remove="${swH(q.id)}">Kaldır</button></div>`).join('');
}
function swRenderQueue(){const box=document.querySelector('#sw-batch');if(box)box.innerHTML=swQueueHtml();const n=document.querySelector('#sw-file-name');if(n)n.textContent=swQueue.length?`${swQueue.length} görsel seçildi`:'Görselleri Seç';const b=document.querySelector('[data-sw-upload]');if(b)b.textContent=swQueue.length?`Toplu Yükle (${swQueue.length})`:'Toplu Yükle'}
function swClearQueue(){swQueue.forEach(q=>{try{URL.revokeObjectURL(q.url)}catch{}});swQueue=[];swRenderQueue()}

async function swRender(force=false){
  if(!swActive||swBusy)return;const main=SW_APP.querySelector('main');if(!main)return;if(!force&&main.dataset.swPage==='gallery')return;
  const token=++swToken;swBusy=true;
  try{
    const [mr,or,nr]=await Promise.all([
      SW_S.from('catlak_world_media').select('*').eq('media_type','map').eq('visible',true).order('created_at',{ascending:false}),
      SW_S.from('catlak_world_media').select('*').eq('media_type','other').eq('visible',true).order('created_at',{ascending:false}),
      SW_S.from('catlak_npcs').select('*').eq('visible',true).order('created_at',{ascending:false})
    ]);
    if(mr.error)throw mr.error;if(or.error)throw or.error;if(nr.error)throw nr.error;if(!swActive||token!==swToken)return;
    const all=[...(mr.data||[]).map(x=>[x,'map']),...(or.data||[]).map(x=>[x,'other']),...(nr.data||[]).map(x=>[x,'npc'])].sort((a,b)=>String(b[0].created_at||'').localeCompare(String(a[0].created_at||'')));
    const gm=swGM();
    main.innerHTML=`<section class="card sw-hero"><div class="eyebrow">ÇATLAK ÇAĞI • GÖRSEL ARŞİVİ</div><h1>${gm?'Toplu Görsel Yükleme':'Evren Görselleri'}</h1><p class="muted">${gm?'Bir seferde birden fazla görsel seç; her birine ayrı ad ve tür ver, sonra topluca yükle.':'GM tarafından paylaşılan haritaları, sahneleri ve NPC görsellerini burada görebilirsin.'}</p></section>${gm?`<section class="card"><div class="sw-upload"><label class="sw-filepick"><input id="sw-file" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif"><span class="sw-file-icon">＋</span><span class="sw-file-meta"><b id="sw-file-name">Görselleri Seç</b><span>PNG, JPG, WEBP veya GIF • görsel başına 12 MB • en fazla ${SW_MAX_BATCH} dosya</span></span></label><label>Yeni dosyaların varsayılan türü<select id="sw-default-kind">${swKindOptions('other')}</select></label><button type="button" class="primary" data-sw-upload>Toplu Yükle</button></div><details class="sw-note"><summary>Tüm seçilenlere ortak not ekle (isteğe bağlı)</summary><textarea id="sw-note" placeholder="Oyuncuların göreceği kısa not..."></textarea></details><div class="sw-batch" id="sw-batch">${swQueueHtml()}</div></section>`:''}<section class="card"><div class="sw-gallery-head"><div><div class="eyebrow">ARŞİV</div><h2>Yüklenen Görseller</h2></div><span class="tag">${all.length} GÖRSEL</span></div>${all.length?`<div class="sw-gallery">${all.map(([x,k])=>swCard(x,k)).join('')}</div>`:'<div class="sw-empty">Henüz görsel yüklenmedi.</div>'}</section>`;
    main.dataset.swPage='gallery';
  }catch(e){swToast('Görsel Arşivi yüklenemedi: '+(e?.message||String(e)))}finally{swBusy=false}
}

function swExt(file){const m={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};return m[file.type]||'img'}
async function swUploadOne(q,note){
  const file=q.file,kind=q.kind||'other',rawTitle=(q.name||file.name.replace(/\.[^.]+$/,'')).trim()||'Adsız Görsel';
  const uid=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2));
  const path=`${kind}/${Date.now()}-${uid}.${swExt(file)}`;
  const up=await SW_S.storage.from(SW_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(up.error)throw up.error;
  const pub=SW_S.storage.from(SW_BUCKET).getPublicUrl(path);const url=pub?.data?.publicUrl;if(!url){await SW_S.storage.from(SW_BUCKET).remove([path]);throw new Error('Görsel bağlantısı oluşturulamadı.')}
  const meta={storage_bucket:SW_BUCKET,storage_path:path,original_name:file.name};let ins;
  if(kind==='npc')ins=await SW_S.from('catlak_npcs').insert({name:rawTitle,role:'NPC',place:'',relation:'',image_url:url,note,visible:true,sort_order:0,data:meta});
  else ins=await SW_S.from('catlak_world_media').insert({media_type:kind,title:rawTitle,image_url:url,description:note,visible:true,sort_order:0,data:meta});
  if(ins.error){await SW_S.storage.from(SW_BUCKET).remove([path]);throw ins.error}
}
async function swUploadBatch(){
  if(!swGM()||swBusy)return;if(!swQueue.length)return swToast('Önce bir veya birden fazla görsel seç.');
  const main=SW_APP.querySelector('main'),note=document.querySelector('#sw-note')?.value||'';let ok=0,fail=0;
  main?.classList.add('sw-loading');swBusy=true;
  try{
    for(const q of swQueue){
      const nameEl=document.querySelector(`[data-sw-q-name="${CSS.escape(q.id)}"]`),kindEl=document.querySelector(`[data-sw-q-kind="${CSS.escape(q.id)}"]`);if(nameEl)q.name=nameEl.value.trim();if(kindEl)q.kind=kindEl.value;
      q.status='Yükleniyor…';swRenderQueue();
      try{await swUploadOne(q,note);q.status='Yüklendi';q.done=true;ok++}catch(e){q.status='Hata: '+(e?.message||String(e));q.done=false;fail++}swRenderQueue();
    }
    const done=swQueue.filter(q=>q.done);done.forEach(q=>{try{URL.revokeObjectURL(q.url)}catch{}});swQueue=swQueue.filter(q=>!q.done);
    swToast(fail?`${ok} görsel yüklendi, ${fail} görsel yüklenemedi. Hatalı olanlar listede kaldı.`:`${ok} görsel başarıyla yüklendi.`);
  }finally{swBusy=false;main?.classList.remove('sw-loading');await swRender(true)}
}

async function swRename(id,kind,current){
  if(!swGM())return;const next=prompt('Görselin yeni adı:',current||'');if(next===null)return;const name=next.trim();if(!name)return swToast('Görsel adı boş olamaz.');
  const table=kind==='npc'?'catlak_npcs':'catlak_world_media',patch=kind==='npc'?{name}:{title:name};const r=await SW_S.from(table).update(patch).eq('id',id);if(r.error)throw r.error;swToast('Görsel adı güncellendi.');await swRender(true)
}
async function swDelete(id,kind){
  if(!swGM()||!confirm('Bu görsel kalıcı olarak silinsin mi?'))return;const table=kind==='npc'?'catlak_npcs':'catlak_world_media';const row=await SW_S.from(table).select('id,image_url,data').eq('id',id).maybeSingle();if(row.error)throw row.error;const path=row.data?.data?.storage_path||'';if(path){const rm=await SW_S.storage.from(SW_BUCKET).remove([path]);if(rm.error)throw rm.error}const del=await SW_S.from(table).delete().eq('id',id);if(del.error)throw del.error;swToast('Görsel silindi.');await swRender(true)
}
async function swParty(id,kind){
  if(!swGM())return;const table=kind==='npc'?'catlak_npcs':'catlak_world_media';const row=await SW_S.from(table).select('*').eq('id',id).maybeSingle();if(row.error)throw row.error;if(!row.data)return;const x=row.data,title=swTitle(x,kind),note=swNoteText(x,kind);const r=await SW_S.from('catlak_party_visual').upsert({singleton:true,kind,ref_id:id,title,image_url:x.image_url||'',note,updated_at:new Date().toISOString()},{onConflict:'singleton'});if(r.error)throw r.error;swToast('Görsel oyunculara yansıtıldı.')
}
function swZoom(img){document.querySelector('.sw-modal')?.remove();const m=document.createElement('div');m.className='sw-modal';m.innerHTML=`<button type="button" class="danger" data-sw-close>Kapat ✕</button><img src="${swH(img.src)}" alt="${swH(img.alt||'Görsel')}">`;document.body.appendChild(m)}

document.addEventListener('click',e=>{
  const world=e.target.closest?.('#app [data-cc-world-tab]');if(world){e.preventDefault();e.stopImmediatePropagation();swActive=true;swSelectNav(world);window.__catlakRouteLoading?.('Görsel Arşivi');swRender(true);return}const nav=e.target.closest?.('#app .nav button');if(nav&&!world){swActive=false;swToken++}
},true);

document.addEventListener('click',async e=>{
  try{
    if(e.target.closest('[data-sw-upload]'))return await swUploadBatch();
    const qr=e.target.closest('[data-sw-q-remove]');if(qr){const i=swQueue.findIndex(q=>q.id===qr.dataset.swQRemove);if(i>=0){try{URL.revokeObjectURL(swQueue[i].url)}catch{}swQueue.splice(i,1);swRenderQueue()}return}
    const ren=e.target.closest('[data-sw-rename]');if(ren)return await swRename(ren.dataset.swRename,ren.dataset.swKind,ren.dataset.swName);
    const del=e.target.closest('[data-sw-delete]');if(del)return await swDelete(del.dataset.swDelete,del.dataset.swKind);
    const party=e.target.closest('[data-sw-party]');if(party)return await swParty(party.dataset.swParty,party.dataset.swKind);
    const zoom=e.target.closest('[data-sw-zoom] img');if(zoom)return swZoom(zoom);
    if(e.target.closest('[data-sw-close]')||e.target.classList?.contains('sw-modal'))e.target.closest('.sw-modal')?.remove();
  }catch(err){swToast(err?.message||String(err))}
});

document.addEventListener('change',e=>{
  if(e.target?.id==='sw-file'){
    const files=[...(e.target.files||[])],kind=document.querySelector('#sw-default-kind')?.value||'other';if(!files.length)return;
    let accepted=0,rejected=0;for(const file of files){if(swQueue.length>=SW_MAX_BATCH){rejected++;continue}if(!SW_ALLOWED.has(file.type)||file.size>SW_MAX_SIZE){rejected++;continue}const id=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2));swQueue.push({id,file,name:file.name.replace(/\.[^.]+$/,''),kind,url:URL.createObjectURL(file),status:''});accepted++}e.target.value='';swRenderQueue();if(rejected)swToast(`${accepted} görsel eklendi. ${rejected} dosya tür/boyut/30 dosya sınırı nedeniyle alınmadı.`);return
  }
  const qk=e.target?.dataset?.swQKind;if(qk){const q=swQueue.find(x=>x.id===qk);if(q)q.kind=e.target.value}
});
document.addEventListener('input',e=>{const qn=e.target?.dataset?.swQName;if(qn){const q=swQueue.find(x=>x.id===qn);if(q)q.name=e.target.value}});

// Navigasyonun tek sahibi nav-lite-patch.js. Burada MutationObserver kullanma.
swEnsureNav();
['catlak_world_media','catlak_npcs'].forEach(t=>SW_S.channel('simple-world-'+t).on('postgres_changes',{event:'*',schema:'public',table:t},()=>{if(swActive&&!swBusy)swRender(true)}).subscribe());
window.__catlakRenderSimpleWorld=swRender;
