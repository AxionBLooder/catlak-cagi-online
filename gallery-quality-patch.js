const CCQ_S=window.__catlakSupabase;
const CCQ_APP=document.querySelector('#app');
if(!CCQ_S||!CCQ_APP)throw new Error('Görsel kalite katmanı başlatılamadı.');

const ccqH=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ccqToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(ccqToast.t);ccqToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let ccqBusy=false,ccqTimer=null;

const ccqCss=`
.cc-map-card img{display:block!important;width:auto!important;height:auto!important;max-width:100%!important;max-height:420px!important;object-fit:contain!important;margin:10px auto!important;image-rendering:auto!important;background:#050b14!important}
.cc-party-show>img{display:block!important;width:auto!important;height:auto!important;max-width:100%!important;max-height:72vh!important;object-fit:contain!important;margin:12px auto!important;image-rendering:auto!important}
.ccx-media-frame img{width:auto!important;height:auto!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;padding:0!important;image-rendering:auto!important}
.ccq-world-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.ccq-card{overflow:hidden}.ccq-frame{min-height:240px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:14px;background:#050b14;padding:10px}.ccq-frame img{display:block;width:auto;height:auto;max-width:100%;max-height:400px;object-fit:contain;image-rendering:auto}.ccq-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.ccq-quality-note{font-size:.78rem;color:var(--muted);margin-top:8px}
`;
if(!document.querySelector('#ccq-style')){const s=document.createElement('style');s.id='ccq-style';s.textContent=ccqCss;document.head.appendChild(s)}

function ccqMapActive(){return !!CCQ_APP.querySelector('[data-cc-map-tab].on')}

async function ccqRenderOthers(){
  if(!ccqMapActive()||ccqBusy)return;
  const main=CCQ_APP.querySelector('main');
  if(!main||main.dataset.ccMapPage!=='1'||main.querySelector('[data-ccq-other-archive]'))return;
  ccqBusy=true;
  try{
    const {data,error}=await CCQ_S.from('catlak_world_media').select('*').eq('media_type','other').order('sort_order').order('created_at',{ascending:true});
    if(error)throw error;
    if(!ccqMapActive())return;
    const current=CCQ_APP.querySelector('main');
    if(!current||current.dataset.ccMapPage!=='1'||current.querySelector('[data-ccq-other-archive]'))return;
    const rows=data||[];
    const section=document.createElement('section');
    section.className='card';section.dataset.ccqOtherArchive='1';
    section.innerHTML=`<div class="eyebrow">EVREN GÖRSELLERİ</div><h2>Bölgeler & Sahneler</h2><p class="muted">Harita olmayan Evren görselleri burada ayrı tutulur. Yine de buradan canlı partiye yansıtabilirsin.</p>${rows.length?`<div class="ccq-world-grid">${rows.map(x=>`<article class="card ccq-card"><span class="tag">EVREN</span><h3>${ccqH(x.title||'Adsız Görsel')}</h3>${x.image_url?`<div class="ccq-frame"><img src="${ccqH(x.image_url)}" alt="${ccqH(x.title||'Evren görseli')}" loading="lazy"></div>`:''}<p>${ccqH(x.description||'')}</p><div class="ccq-actions"><button type="button" class="primary" data-ccq-party-other="${x.id}">Partiye Yansıt</button></div><div class="ccq-quality-note">Eski düşük çözünürlüklü arşiv görselleri doğal boyutuna yakın gösterilir; yapay olarak karta büyütülmez.</div></article>`).join('')}</div>`:'<div class="cc-world-empty">Evren görseli yok.</div>'}`;
    current.appendChild(section);
  }catch(e){console.error('CCQ_RENDER',e)}finally{ccqBusy=false}
}

async function ccqPushOther(id){
  const {data:row,error}=await CCQ_S.from('catlak_world_media').select('*').eq('id',id).eq('media_type','other').single();
  if(error)throw error;
  const u=await CCQ_S.from('catlak_party_visual').update({kind:'other',ref_id:id,title:row.title||'',image_url:row.image_url||'',note:row.description||'',updated_at:new Date().toISOString()}).eq('singleton',true).select('singleton');
  if(u.error)throw u.error;if(!(u.data||[]).length)throw new Error('Parti görseli güncellenemedi.');
  ccqToast((row.title||'Evren görseli')+' partiye yansıtıldı.');
}

function ccqSchedule(delay=80){clearTimeout(ccqTimer);ccqTimer=setTimeout(ccqRenderOthers,delay)}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-cc-map-tab]'))ccqSchedule(180);
  const p=e.target.closest('[data-ccq-party-other]');if(p){e.preventDefault();e.stopImmediatePropagation();ccqPushOther(p.dataset.ccqPartyOther).catch(err=>ccqToast('Partiye yansıtılamadı: '+(err?.message||String(err))));return}
},true);

CCQ_S.channel('ccq-gallery-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_world_media'},()=>{CCQ_APP.querySelector('[data-ccq-other-archive]')?.remove();ccqSchedule(120)}).subscribe();
setTimeout(()=>ccqSchedule(0),900);
