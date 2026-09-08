const CC_MIG_S=window.__catlakSupabase;
const CC_MIG_APP=document.querySelector('#app');
const CC_MIG_PERMANENT_BASE='https://axionblooder.github.io/catlak-cagi-online/';
let ccMigScheduled=false,ccMigRendering=false;

function ccMigText(el){return String(el?.textContent||'').trim()}
function ccMigIsGM(){return ccMigText(CC_MIG_APP?.querySelector('.role'))==='GM'}
function ccMigTab(){return CC_MIG_APP?.querySelector('.nav button.on')?.dataset.tab||''}
function ccMigToast(text){
  const t=document.querySelector('#toast');if(!t)return;
  t.textContent=text;t.classList.remove('hidden');
  clearTimeout(ccMigToast.timer);ccMigToast.timer=setTimeout(()=>t.classList.add('hidden'),5200);
}
function ccMigEsc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function ccMigEnsurePanel(){
  if(ccMigRendering||!ccMigIsGM()||ccMigTab()!=='gm')return;
  const main=CC_MIG_APP?.querySelector('main');
  if(!main||main.querySelector('[data-cc-reconnect-panel]'))return;
  ccMigRendering=true;
  try{
    const {data,error}=await CC_MIG_S.from('catlak_characters')
      .select('id,name,species_name,class_name,owner_id,play_status')
      .eq('play_status','active')
      .not('owner_id','is',null)
      .order('updated_at',{ascending:false});
    if(error)throw error;
    if(!ccMigIsGM()||ccMigTab()!=='gm'||!main.isConnected||main.querySelector('[data-cc-reconnect-panel]'))return;
    const rows=data||[];
    if(!rows.length)return;
    const section=document.createElement('section');
    section.className='card';section.dataset.ccReconnectPanel='1';
    section.innerHTML=`<div class="eyebrow">KALICI GİTHUB PAGES</div><h2>Oyuncu Yeniden Bağlama</h2><p class="muted">Aktif oyuncu başka domaine geçerken karakter verisi taşınmaz; yalnız sahiplik yeni oyuncu oturumuna güvenli biçimde yeniden bağlanır. Bağlantı tek kullanımlıktır ve 24 saat geçerlidir.</p><div class="grid">${rows.map(c=>`<article class="card"><h3>${ccMigEsc(c.name)}</h3><p class="muted">${ccMigEsc(c.species_name||'')} • ${ccMigEsc(c.class_name||'')}</p><button type="button" class="primary" data-cc-reconnect="${c.id}" data-cc-reconnect-name="${ccMigEsc(c.name)}">Yeniden Bağlama Linki Oluştur</button></article>`).join('')}</div>`;
    const anchor=main.firstElementChild;
    if(anchor?.nextSibling)main.insertBefore(section,anchor.nextSibling);else main.appendChild(section);
  }catch(error){console.warn('CATLAK_RECONNECT_PANEL',error)}
  finally{ccMigRendering=false}
}

async function ccMigCreateReconnect(characterId,name){
  const {data,error}=await CC_MIG_S.rpc('catlak_generate_character_reconnect',{p_character_id:characterId});
  if(error)throw error;
  const link=CC_MIG_PERMANENT_BASE+'?join='+encodeURIComponent(data);
  try{await navigator.clipboard.writeText(link)}catch{}
  prompt(`${name} için kalıcı site yeniden bağlama linki. Bu link tek kullanımlıktır ve 24 saat geçerlidir:`,link);
  return link;
}

CC_MIG_APP?.addEventListener('click',event=>{
  const button=event.target.closest('[data-cc-reconnect]');if(!button)return;
  event.preventDefault();event.stopPropagation();
  button.disabled=true;
  ccMigCreateReconnect(button.dataset.ccReconnect,button.dataset.ccReconnectName||'Karakter')
    .then(()=>ccMigToast('Kalıcı GitHub Pages yeniden bağlama linki oluşturuldu ve panoya kopyalandı.'))
    .catch(error=>ccMigToast(error?.message||String(error)))
    .finally(()=>{button.disabled=false});
},true);

function ccMigSchedule(){
  if(ccMigScheduled)return;ccMigScheduled=true;
  setTimeout(()=>{ccMigScheduled=false;ccMigEnsurePanel()},180);
}
new MutationObserver(ccMigSchedule).observe(CC_MIG_APP||document.body,{childList:true,subtree:true});
ccMigSchedule();

// GitHub Pages production build trigger.
