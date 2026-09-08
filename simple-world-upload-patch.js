const SW_S=window.__catlakSupabase;
const SW_APP=document.querySelector('#app');
if(!SW_S||!SW_APP)throw new Error('Görsel Arşivi katmanı başlatılamadı.');

const SW_BUCKET='catlak-world-media';
const SW_ALLOWED=new Set(['image/jpeg','image/png','image/webp','image/gif']);
const swH=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const swTxt=e=>String(e?.textContent||'').trim();
const swGM=()=>swTxt(SW_APP.querySelector('.role'))==='GM';
const swToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(swToast.t);swToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let swActive=false,swBusy=false,swToken=0,swPreviewUrl='';

const swCss=`
.sw-hero{background:linear-gradient(135deg,#12283b,#0b1422 58%,#21182a)!important;border-color:#36536e!important}.sw-upload{display:grid;grid-template-columns:minmax(230px,1.25fr) minmax(150px,.55fr) minmax(190px,.8fr) auto;gap:10px;align-items:end}.sw-filepick{position:relative;border:1px dashed #4a6f8f;border-radius:14px;background:#091522;padding:13px;min-height:74px;display:flex;align-items:center;gap:11px;cursor:pointer}.sw-filepick:hover{border-color:var(--cyan);background:#0d1d2c}.sw-filepick input{position:absolute;inset:0;opacity:0;cursor:pointer}.sw-file-icon{width:42px;height:42px;border-radius:12px;background:#10283b;border:1px solid #315775;display:grid;place-items:center;font-size:1.2rem}.sw-file-meta{min-width:0}.sw-file-meta b,.sw-file-meta span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sw-file-meta span{color:var(--muted);font-size:.76rem;margin-top:3px}.sw-upload button{height:42px}.sw-note{margin-top:10px}.sw-note summary{font-weight:700;color:var(--muted)}.sw-preview{display:none;margin-top:12px;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#07101a;max-height:300px}.sw-preview.on{display:block}.sw-preview img{width:100%;max-height:300px;object-fit:contain;display:block}.sw-gallery-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:14px}.sw-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.sw-card{padding:12px;overflow:hidden}.sw-img{aspect-ratio:16/10;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#060d15;display:flex;align-items:center;justify-content:center;cursor:zoom-in}.sw-img img{width:100%;height:100%;object-fit:contain;display:block}.sw-card-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;margin-top:10px}.sw-card h3{margin:4px 0 2px;font-size:1.04rem}.sw-card p{margin:8px 0 0;color:var(--muted);font-size:.86rem;white-space:pre-line}.sw-card-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.sw-empty{padding:30px;border:1px dashed var(--line);border-radius:14px;text-align:center;color:var(--muted)}.sw-danger{border-color:#713b49!important;color:#ffb7c2!important}.sw-modal{position:fixed;inset:0;z-index:99999;background:#02050bea;display:flex;align-items:center;justify-content:center;padding:24px}.sw-modal img{max-width:96vw;max-height:91vh;object-fit:contain;border-radius:14px}.sw-modal button{position:fixed;right:20px;top:18px}.sw-loading{opacity:.65;pointer-events:none}
@media(max-width:900px){.sw-upload{grid-template-columns:1fr 1fr}.sw-filepick{grid-column:1/-1}.sw-upload button{width:100%}}
@media(max-width:620px){.sw-upload{grid-template-columns:1fr}.sw-filepick{grid-column:auto}.sw-gallery{grid-template-columns:1fr}.sw-gallery-head{align-items:flex-start;flex-direction:column}}
`;
if(!document.querySelector('#sw-style')){const s=document.createElement('style');s.id='sw-style';s.textContent=swCss;document.head.appendChild(s)}

function swEnsureNav(){
  const nav=SW_APP.querySelector('.nav');if(!nav)return;
  const b=nav.querySelector('[data-cc-world-tab]');if(b)b.textContent='Görsel Arşivi';
}
function swSelectNav(btn){const nav=SW_APP.querySelector('.nav');if(nav)nav.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===btn))}
function swKindLabel(k){return k==='map'?'HARİTA':k==='npc'?'NPC':'EVREN'}
function swTitle(x,k){return k==='npc'?(x.name||'Adsız NPC'):(x.title||'Adsız Görsel')}
function swNoteText(x,k){return k==='npc'?(x.note||''):(x.description||'')}
function swCard(x,k){
  const title=swTitle(x,k),note=swNoteText(x,k),img=x.image_url||'';
  return `<article class="card sw-card" data-sw-card="${swH(x.id)}"><div class="sw-img" data-sw-zoom="1"><img src="${swH(img)}" alt="${swH(title)}" loading="lazy"></div><div class="sw-card-head"><div><span class="tag">${swKindLabel(k)}</span><h3>${swH(title)}</h3></div></div>${note?`<p>${swH(note)}</p>`:''}${swGM()?`<div class="sw-card-actions"><button type="button" class="small primary" data-sw-party="${swH(x.id)}" data-sw-kind="${k}">Partiye Yansıt</button><button type="button" class="small sw-danger" data-sw-delete="${swH(x.id)}" data-sw-kind="${k}">Sil</button></div>`:''}</article>`;
}

async function swRender(force=false){
  if(!swActive||swBusy)return;const main=SW_APP.querySelector('main');if(!main)return;if(!force&&main.dataset.swPage==='gallery')return;
  const token=++swToken;swBusy=true;
  try{
    const [mr,or,nr]=await Promise.all([
      SW_S.from('catlak_world_media').select('*').eq('media_type','map').eq('visible',true).order('created_at',{ascending:false}),
      SW_S.from('catlak_world_media').select('*').eq('media_type','other').eq('visible',true).order('created_at',{ascending:false}),
      SW_S.from('catlak_npcs').select('*').eq('visible',true).order('created_at',{ascending:false})
    ]);
    if(mr.error)throw mr.error;if(or.error)throw or.error;if(nr.error)throw nr.error;
    if(!swActive||token!==swToken)return;
    const all=[...(mr.data||[]).map(x=>[x,'map']),...(or.data||[]).map(x=>[x,'other']),...(nr.data||[]).map(x=>[x,'npc'])].sort((a,b)=>String(b[0].created_at||'').localeCompare(String(a[0].created_at||'')));
    const gm=swGM();
    main.innerHTML=`<section class="card sw-hero"><div class="eyebrow">ÇATLAK ÇAĞI • GÖRSEL ARŞİVİ</div><h1>${gm?'Görsel Seç ve Yükle':'Evren Görselleri'}</h1><p class="muted">${gm?'Bilgisayarından görsel seç, türünü belirle ve yükle. URL kopyalamana gerek yok.':'GM tarafından paylaşılan haritaları, sahneleri ve NPC görsellerini burada görebilirsin.'}</p></section>${gm?`<section class="card"><div class="sw-upload"><label class="sw-filepick"><input id="sw-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><span class="sw-file-icon">＋</span><span class="sw-file-meta"><b id="sw-file-name">Görsel Dosyası Seç</b><span>PNG, JPG, WEBP veya GIF • en fazla 12 MB</span></span></label><label>Tür<select id="sw-kind"><option value="other">Evren Görseli</option><option value="map">Harita</option><option value="npc">NPC</option></select></label><label>Başlık<input id="sw-title" placeholder="İstersen boş bırak"></label><button type="button" class="primary" data-sw-upload>Yükle</button></div><details class="sw-note"><summary>İsteğe bağlı not ekle</summary><textarea id="sw-note" placeholder="Oyuncuların göreceği kısa not..."></textarea></details><div class="sw-preview" id="sw-preview"><img alt="Seçilen görsel ön izlemesi"></div></section>`:''}<section class="card"><div class="sw-gallery-head"><div><div class="eyebrow">ARŞİV</div><h2>Yüklenen Görseller</h2></div><span class="tag">${all.length} GÖRSEL</span></div>${all.length?`<div class="sw-gallery">${all.map(([x,k])=>swCard(x,k)).join('')}</div>`:'<div class="sw-empty">Henüz görsel yüklenmedi.</div>'}</section>`;
    main.dataset.swPage='gallery';
  }catch(e){swToast('Görsel Arşivi yüklenemedi: '+(e?.message||String(e)))}finally{swBusy=false}
}

function swExt(file){const m={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};return m[file.type]||'img'}
async function swUpload(){
  if(!swGM()||swBusy)return;
  const file=document.querySelector('#sw-file')?.files?.[0];if(!file)return swToast('Önce bir görsel dosyası seç.');
  if(!SW_ALLOWED.has(file.type))return swToast('Yalnızca PNG, JPG, WEBP veya GIF yükleyebilirsin.');
  if(file.size>12*1024*1024)return swToast('Görsel 12 MB’dan büyük olamaz.');
  const kind=document.querySelector('#sw-kind')?.value||'other';
  const rawTitle=document.querySelector('#sw-title')?.value.trim()||file.name.replace(/\.[^.]+$/,'');
  const note=document.querySelector('#sw-note')?.value||'';
  const uid=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2));
  const path=`${kind}/${Date.now()}-${uid}.${swExt(file)}`;
  const main=SW_APP.querySelector('main');main?.classList.add('sw-loading');swBusy=true;
  try{
    const up=await SW_S.storage.from(SW_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(up.error)throw up.error;
    const pub=SW_S.storage.from(SW_BUCKET).getPublicUrl(path);const url=pub?.data?.publicUrl;if(!url)throw new Error('Görsel bağlantısı oluşturulamadı.');
    const meta={storage_bucket:SW_BUCKET,storage_path:path,original_name:file.name};
    let ins;
    if(kind==='npc')ins=await SW_S.from('catlak_npcs').insert({name:rawTitle,role:'NPC',place:'',relation:'',image_url:url,note,visible:true,sort_order:0,data:meta});
    else ins=await SW_S.from('catlak_world_media').insert({media_type:kind,title:rawTitle,image_url:url,description:note,visible:true,sort_order:0,data:meta});
    if(ins.error){await SW_S.storage.from(SW_BUCKET).remove([path]);throw ins.error}
    swToast('Görsel yüklendi.');
    swBusy=false;await swRender(true);
  }catch(e){swToast('Yükleme başarısız: '+(e?.message||String(e)))}finally{swBusy=false;main?.classList.remove('sw-loading')}
}

async function swDelete(id,kind){
  if(!swGM()||!confirm('Bu görsel kalıcı olarak silinsin mi?'))return;
  const table=kind==='npc'?'catlak_npcs':'catlak_world_media';
  const row=await SW_S.from(table).select('id,image_url,data').eq('id',id).maybeSingle();if(row.error)throw row.error;
  const path=row.data?.data?.storage_path||'';
  if(path){const rm=await SW_S.storage.from(SW_BUCKET).remove([path]);if(rm.error)throw rm.error}
  const del=await SW_S.from(table).delete().eq('id',id);if(del.error)throw del.error;
  swToast('Görsel silindi.');await swRender(true);
}

async function swParty(id,kind){
  if(!swGM())return;const table=kind==='npc'?'catlak_npcs':'catlak_world_media';
  const row=await SW_S.from(table).select('*').eq('id',id).maybeSingle();if(row.error)throw row.error;if(!row.data)return;
  const x=row.data,title=swTitle(x,kind),note=swNoteText(x,kind);
  const r=await SW_S.from('catlak_party_visual').upsert({singleton:true,kind,ref_id:id,title,image_url:x.image_url||'',note,updated_at:new Date().toISOString()},{onConflict:'singleton'});if(r.error)throw r.error;
  swToast('Görsel oyunculara yansıtıldı.');
}

function swZoom(img){document.querySelector('.sw-modal')?.remove();const m=document.createElement('div');m.className='sw-modal';m.innerHTML=`<button type="button" class="danger" data-sw-close>Kapat ✕</button><img src="${swH(img.src)}" alt="${swH(img.alt||'Görsel')}">`;document.body.appendChild(m)}

// Capture kullanarak eski Evren rendererından önce sahipliği al.
document.addEventListener('click',e=>{
  const world=e.target.closest?.('#app [data-cc-world-tab]');
  if(world){e.preventDefault();e.stopImmediatePropagation();swActive=true;swSelectNav(world);window.__catlakRouteLoading?.('Görsel Arşivi');swRender(true);return}
  const nav=e.target.closest?.('#app .nav button');if(nav&&!world){swActive=false;swToken++;}
},true);

document.addEventListener('click',async e=>{
  try{
    if(e.target.closest('[data-sw-upload]'))return await swUpload();
    const del=e.target.closest('[data-sw-delete]');if(del)return await swDelete(del.dataset.swDelete,del.dataset.swKind);
    const party=e.target.closest('[data-sw-party]');if(party)return await swParty(party.dataset.swParty,party.dataset.swKind);
    const zoom=e.target.closest('[data-sw-zoom] img');if(zoom)return swZoom(zoom);
    if(e.target.closest('[data-sw-close]')||e.target.classList?.contains('sw-modal'))e.target.closest('.sw-modal')?.remove();
  }catch(err){swToast(err?.message||String(err))}
});

document.addEventListener('change',e=>{
  if(e.target?.id!=='sw-file')return;const file=e.target.files?.[0],name=document.querySelector('#sw-file-name'),title=document.querySelector('#sw-title'),preview=document.querySelector('#sw-preview'),img=preview?.querySelector('img');
  if(swPreviewUrl){URL.revokeObjectURL(swPreviewUrl);swPreviewUrl=''}
  if(!file){if(name)name.textContent='Görsel Dosyası Seç';preview?.classList.remove('on');return}
  if(name)name.textContent=file.name;if(title&&!title.value)title.value=file.name.replace(/\.[^.]+$/,'');
  swPreviewUrl=URL.createObjectURL(file);if(img)img.src=swPreviewUrl;preview?.classList.add('on');
});

const swObs=new MutationObserver(()=>{swEnsureNav();if(swActive){const b=SW_APP.querySelector('[data-cc-world-tab]');if(b&&!b.classList.contains('on'))swSelectNav(b)}});swObs.observe(SW_APP,{childList:true,subtree:true});swEnsureNav();
['catlak_world_media','catlak_npcs'].forEach(t=>SW_S.channel('simple-world-'+t).on('postgres_changes',{event:'*',schema:'public',table:t},()=>{if(swActive&&!swBusy)swRender(true)}).subscribe());

window.__catlakRenderSimpleWorld=swRender;
