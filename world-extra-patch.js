const CCX_S=window.__catlakSupabase;
const CCX_APP=document.querySelector('#app');
if(!CCX_S||!CCX_APP)throw new Error('Evren ek görsel katmanı başlatılamadı.');
const ccxH=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ccxBusy=false,ccxScheduled=false;

function ccxWorldActive(){return !!CCX_APP.querySelector('[data-cc-world-tab].on')}

async function ccxRenderOthers(){
  if(!ccxWorldActive()||ccxBusy)return;
  const main=CCX_APP.querySelector('main');
  if(!main||main.querySelector('[data-cc-world-other-section]'))return;
  ccxBusy=true;
  try{
    const {data,error}=await CCX_S.from('catlak_world_media').select('*').eq('media_type','other').order('created_at',{ascending:true});
    if(error)throw error;
    if(!ccxWorldActive())return;
    const current=CCX_APP.querySelector('main');
    if(!current||current.querySelector('[data-cc-world-other-section]'))return;
    const section=document.createElement('section');
    section.className='card';
    section.dataset.ccWorldOtherSection='1';
    section.innerHTML=`<div class="eyebrow">EVREN GÖRSELLERİ</div><h2>Bölgeler & Sahne Görselleri</h2><p class="muted">Harita olmayan evren, bölge ve sahne görselleri burada tutulur.</p>${(data||[]).length?`<div class="cc-world-grid">${data.map(x=>`<article class="card cc-world-card"><div class="cc-world-head"><div><span class="tag">EVREN</span><h3>${ccxH(x.title||'Adsız Görsel')}</h3></div></div>${x.image_url?`<img src="${ccxH(x.image_url)}" alt="${ccxH(x.title||'Evren görseli')}">`:''}<p>${ccxH(x.description||'')}</p></article>`).join('')}</div>`:'<div class="cc-world-empty">Ek evren görseli yok.</div>'}`;
    current.appendChild(section);
  }catch(e){console.error('CC_WORLD_OTHER',e)}finally{ccxBusy=false}
}

function ccxSchedule(){if(ccxScheduled)return;ccxScheduled=true;requestAnimationFrame(()=>{ccxScheduled=false;ccxRenderOthers()})}
new MutationObserver(ccxSchedule).observe(CCX_APP,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
CCX_S.channel('cc-world-other-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_world_media'},()=>{const s=CCX_APP.querySelector('[data-cc-world-other-section]');if(s)s.remove();ccxSchedule()}).subscribe();
ccxSchedule();
