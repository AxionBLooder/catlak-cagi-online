const CIV_S=window.__catlakSupabase;
const CIV_APP=document.querySelector('#app');
if(!CIV_S||!CIV_APP)throw new Error('Çatlak Çağı davet görünürlük katmanı başlatılamadı.');

const CIV_BASE='https://axionblooder.github.io/catlak-cagi-online/';
const civTxt=e=>String(e?.textContent||'').trim();
const civIsGM=()=>civTxt(CIV_APP.querySelector('.role'))==='GM';
const civCharTab=()=>CIV_APP.querySelector('.nav [data-tab="characters"].on');
const civEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const civToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(civToast.t);civToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let civRows=null,civFetch=null,civScheduled=false,civBusy=false;

if(!document.querySelector('#civ-style')){
  const s=document.createElement('style');s.id='civ-style';s.textContent=`
  .civ-panel{border-color:#6b5930!important;background:linear-gradient(135deg,#111b25,#15150f)!important}
  .civ-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:12px}
  .civ-card{border:1px solid var(--line);border-radius:14px;padding:13px;background:#08131e}.civ-card h3{margin:4px 0}.civ-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  .civ-delete{border-color:#713b49!important;color:#ffb7c2!important}.civ-note{margin-top:10px;font-size:.78rem;color:var(--muted)}
  `;document.head.appendChild(s);
}

async function civLoad(force=false){
  if(!force&&civRows)return civRows;if(civFetch)return civFetch;
  civFetch=(async()=>{const {data,error}=await CIV_S.from('catlak_characters').select('id,name,species_name,class_name,level,owner_id,play_status,created_at').in('play_status',['prepared','active']).order('created_at',{ascending:false});if(error)throw error;civRows=data||[];return civRows})().finally(()=>{civFetch=null});
  return civFetch;
}
function civCard(c,mode){
  const prepared=mode==='invite';
  return `<article class="civ-card"><div class="eyebrow">${prepared?'HAZIR • OYUNCU BEKLİYOR':'AKTİF • BAĞLI KARAKTER'}</div><h3>${civEsc(c.name)}</h3><div class="muted">${civEsc(c.species_name||'')} • ${civEsc(c.class_name||'')} ${Number(c.level||1)}</div><div class="civ-actions"><button type="button" class="primary" ${prepared?`data-civ-invite="${c.id}" data-civ-name="${civEsc(c.name)}"`:`data-civ-reconnect="${c.id}" data-civ-name="${civEsc(c.name)}"`}>${prepared?'Oyuncu Davet Linki Oluştur':'Yeniden Bağlama Linki Oluştur'}</button><button type="button" class="civ-delete" data-civ-delete="${c.id}" data-civ-name="${civEsc(c.name)}" data-civ-mode="${prepared?'prepared':'active'}">${prepared?'Hazır Karakteri Sil':'Oyuncuyu / Karakteri Sil'}</button></div></article>`;
}
async function civRender(){
  if(!civIsGM()||!civCharTab())return;
  const main=CIV_APP.querySelector('main');if(!main||main.querySelector('[data-civ-panel]'))return;
  try{
    const rows=await civLoad();if(!civIsGM()||!civCharTab()||CIV_APP.querySelector('main')!==main||main.querySelector('[data-civ-panel]'))return;
    const prepared=rows.filter(c=>c.play_status==='prepared');
    const active=rows.filter(c=>c.play_status==='active'&&c.owner_id);
    const section=document.createElement('section');section.className='card civ-panel';section.dataset.civPanel='1';
    section.innerHTML=`<div class="eyebrow">GM • DAVET & BAĞLANTI</div><h2>Karakteri Oyuncuya Gönder</h2><p class="muted">Hazır karakter için normal oyuncu daveti; daha önce bağlanmış aktif karakter için güvenli yeniden bağlama linki oluştur. Yanlışlıkla açılmış veya masaya alınmış karakterleri GM olarak buradan silebilirsin.</p><h3>Hazır Karakterler</h3>${prepared.length?`<div class="civ-grid">${prepared.map(c=>civCard(c,'invite')).join('')}</div>`:'<div class="cc-empty">Davet bekleyen hazır karakter yok.</div>'}<h3 style="margin-top:18px">Aktif / Bağlı Karakterler</h3>${active.length?`<div class="civ-grid">${active.map(c=>civCard(c,'reconnect')).join('')}</div>`:'<div class="cc-empty">Yeniden bağlanabilecek aktif karakter yok.</div>'}<div class="civ-note">Silme işlemi karakter kaydını kalıcı olarak kaldırır; oyuncunun ChatGPT/site hesabını silmez. Güvenlik için silmeden önce iki aşamalı onay istenir. Yeniden bağlama bağlantısı tek kullanımlık ve 24 saat geçerlidir.</div>`;
    const head=main.querySelector('[data-ccr-hub-head]');head?head.insertAdjacentElement('afterend',section):main.insertBefore(section,main.firstChild);
  }catch(e){console.warn('CATLAK_INVITE_VISIBILITY',e);civToast('Davet paneli yüklenemedi: '+(e?.message||String(e)))}
}
async function civMake(kind,id,name){
  if(civBusy||!civIsGM())return;civBusy=true;
  try{
    const fn=kind==='invite'?'catlak_generate_character_claim':'catlak_generate_character_reconnect';
    const {data,error}=await CIV_S.rpc(fn,{p_character_id:id});if(error)throw error;
    const link=CIV_BASE+'?join='+encodeURIComponent(data);
    try{await navigator.clipboard.writeText(link)}catch{}
    prompt(kind==='invite'?`${name} için oyuncu davet linki. Oyuncuya bunu gönder:`:`${name} için yeniden bağlama linki. Tek kullanımlık ve 24 saat geçerlidir:`,link);
    civToast(kind==='invite'?'Oyuncu davet linki oluşturuldu ve panoya kopyalandı.':'Yeniden bağlama linki oluşturuldu ve panoya kopyalandı.');
  }catch(e){civToast(e?.message||String(e))}finally{civBusy=false}
}
async function civDelete(id,name,mode){
  if(civBusy||!civIsGM())return;
  const label=mode==='prepared'?'hazır karakter':'aktif oyuncu karakteri';
  if(!confirm(`${name} adlı ${label} kalıcı olarak silinsin mi? Bu işlem karakterin envanterini, zar geçmişini ve durumlarını da kaldırır.`))return;
  const typed=prompt(`Son onay: silmek için karakter adını aynen yaz:\n${name}`,'');
  if(String(typed??'').trim()!==String(name).trim()){civToast('Silme iptal edildi: karakter adı eşleşmedi.');return}
  civBusy=true;
  try{
    const {data,error}=await CIV_S.from('catlak_characters').delete().eq('id',id).select('id,name').maybeSingle();
    if(error)throw error;if(!data)throw new Error('Karakter silinemedi veya GM yetkisi doğrulanamadı.');
    civRows=null;
    CIV_APP.querySelector('main')?.querySelector('[data-civ-panel]')?.remove();
    civToast(`${name} masadan kalıcı olarak silindi.`);
    await civLoad(true);civSchedule();
  }catch(e){civToast('Silme başarısız: '+(e?.message||String(e)))}finally{civBusy=false}
}
CIV_APP.addEventListener('click',e=>{
  const a=e.target.closest('[data-civ-invite]');if(a){e.preventDefault();e.stopImmediatePropagation();civMake('invite',a.dataset.civInvite,a.dataset.civName||'Karakter');return}
  const r=e.target.closest('[data-civ-reconnect]');if(r){e.preventDefault();e.stopImmediatePropagation();civMake('reconnect',r.dataset.civReconnect,r.dataset.civName||'Karakter');return}
  const d=e.target.closest('[data-civ-delete]');if(d){e.preventDefault();e.stopImmediatePropagation();civDelete(d.dataset.civDelete,d.dataset.civName||'Karakter',d.dataset.civMode||'active');return}
},true);
function civSchedule(){if(civScheduled)return;civScheduled=true;setTimeout(()=>{civScheduled=false;civRender()},160)}
new MutationObserver(civSchedule).observe(CIV_APP,{childList:true,subtree:true});
CIV_S.channel('cc-invite-visibility-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{civRows=null;civSchedule()}).subscribe();
civSchedule();
window.__catlakInviteVisibilityTest={card:civCard,render:civRender};
