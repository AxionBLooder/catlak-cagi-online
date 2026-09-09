const CC_GMCTRL_S=window.__catlakSupabase;
const CC_GMCTRL_APP=document.querySelector('#app');
if(!CC_GMCTRL_S||!CC_GMCTRL_APP)throw new Error('GM kontrol katmanı başlatılamadı.');

const ccGmEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ccGmTxt=e=>String(e?.textContent||'').trim();
const ccGmIsGM=()=>ccGmTxt(CC_GMCTRL_APP.querySelector('.role'))==='GM';
const ccGmTab=()=>CC_GMCTRL_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const ccGmToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(ccGmToast.t);ccGmToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
const ccGmIsVampire=c=>String(c?.species_name||'').trim().toLocaleLowerCase('tr-TR')==='vampir';
const ccGmKpMax=c=>3+(Number(c?.level||1)>=4?1:0)+(Number(c?.level||1)>=14?2:0);
const ccGmKpNow=c=>Math.max(0,Math.min(ccGmKpMax(c),Number(c?.data?.vampire_kp??3)));

if(!document.querySelector('#cc-gm-controls-style')){
  const s=document.createElement('style');s.id='cc-gm-controls-style';s.textContent=`
  .cc-gm-controls{margin-top:16px;border-color:#4e6079!important}
  .cc-gm-control-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-top:14px}
  .cc-gm-control-card{border:1px solid #30435c;border-radius:16px;padding:15px;background:#07111f}
  .cc-gm-control-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px}
  .cc-gm-control-head h3{margin:3px 0}
  .cc-gm-note-label{display:block;font-size:.72rem;letter-spacing:.08em;color:var(--muted);font-weight:800;margin:12px 0 6px}
  .cc-gm-note{width:100%;min-height:92px;resize:vertical}
  .cc-gm-note-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
  .cc-gm-note-actions small{color:var(--muted)}
  .cc-gm-vampire-box{margin-top:12px;padding:12px;border:1px solid #713b49;border-radius:14px;background:#1a0d14}
  .cc-gm-vampire-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px}
  .cc-gm-vampire-head strong{font-size:1.25rem;color:#ffb7c2}
  .cc-gm-kp-actions{display:flex;gap:8px}
  .cc-gm-kp-actions button{min-width:48px;font-weight:900}
  `;document.head.appendChild(s);
}

let ccGmRows=null,ccGmFetch=null,ccGmVersion=0,ccGmScheduled=false;
const ccGmKpBusy=new Set(),ccGmNoteBusy=new Set();

function ccGmCard(c){
  const vampire=ccGmIsVampire(c);
  const note=String(c?.data?.gm_note||'');
  const kp=vampire?ccGmKpNow(c):0,max=vampire?ccGmKpMax(c):0;
  return `<article class="cc-gm-control-card" data-cc-gm-character="${c.id}">
    <div class="cc-gm-control-head"><div><span class="tag">${ccGmEsc(c.species_name||'IRK')}</span><h3>${ccGmEsc(c.name)}</h3><small class="muted">Seviye ${Number(c.level||1)}</small></div><span class="cc-status">● CANLI</span></div>
    ${vampire?`<div class="cc-gm-vampire-box" data-cc-vampire-kp-box="${c.id}"><div class="cc-gm-vampire-head"><div><div class="eyebrow">VAMPİR • KAN PUANI</div><strong>KP <span data-cc-gm-kp-value="${c.id}">${kp}</span> / ${max}</strong></div><div class="cc-gm-kp-actions"><button type="button" class="danger" data-cc-gm-kp="${c.id}" data-d="-1">−</button><button type="button" class="primary" data-cc-gm-kp="${c.id}" data-d="1">+</button></div></div><small class="muted">KP yalnız Vampir ırkına özeldir.</small></div>`:''}
    <label class="cc-gm-note-label" for="cc-gm-note-${c.id}">OYUNCUYA ÖZEL DURUM / DEBUFF</label>
    <textarea id="cc-gm-note-${c.id}" class="cc-gm-note" data-cc-gm-note="${c.id}" maxlength="2000" placeholder="Örn: Kan Laneti — saldırı zarlarına -1. Sadece bu karakterin sahibi görür.">${ccGmEsc(note)}</textarea>
    <div class="cc-gm-note-actions"><button type="button" class="primary" data-cc-gm-note-save="${c.id}">Oyuncuya Gönder / Kaydet</button><button type="button" data-cc-gm-note-clear="${c.id}">Notu Temizle</button><small>Yalnız GM ve bu karakterin sahibi görür.</small></div>
  </article>`;
}

function ccGmRender(){
  if(!ccGmIsGM()||ccGmTab()!=='gm'||!ccGmRows)return;
  const main=CC_GMCTRL_APP.querySelector('main');if(!main)return;
  const existing=main.querySelector(`[data-cc-gm-controls-version="${ccGmVersion}"]`);if(existing)return;
  main.querySelectorAll('[data-cc-gm-controls]').forEach(x=>x.remove());
  const sec=document.createElement('section');sec.className='card cc-gm-controls';sec.dataset.ccGmControls='1';sec.dataset.ccGmControlsVersion=String(ccGmVersion);
  sec.innerHTML=`<div class="eyebrow">GM • KARAKTER KONTROLLERİ</div><h2>KP & Kişiye Özel Durumlar</h2><p class="muted">Her karakterin kişiye özel debuff/notunu buradan yönet. KP kontrolü yalnız Vampir karakterlerde görünür.</p>${ccGmRows.length?`<div class="cc-gm-control-grid">${ccGmRows.map(ccGmCard).join('')}</div>`:'<div class="cc-empty">Canlı karakter yok.</div>'}`;
  main.appendChild(sec);
}

async function ccGmLoad(force=false){
  if(!ccGmIsGM()||ccGmTab()!=='gm')return;
  if(ccGmFetch&&!force)return ccGmFetch;
  if(ccGmRows&&!force){ccGmRender();return}
  ccGmFetch=(async()=>{
    const {data,error}=await CC_GMCTRL_S.from('catlak_characters').select('id,name,species_name,level,data,play_status,owner_id,created_at').eq('play_status','active').order('created_at',{ascending:true});
    if(error)throw error;
    ccGmRows=data||[];ccGmVersion++;
    ccGmRender();
  })().catch(e=>ccGmToast('GM karakter kontrolleri yüklenemedi: '+(e?.message||String(e)))).finally(()=>{ccGmFetch=null});
  return ccGmFetch;
}

async function ccGmChangeKp(id,delta){
  if(ccGmKpBusy.has(id))return;
  const row=ccGmRows?.find(c=>String(c.id)===String(id));
  if(!row||!ccGmIsVampire(row))return ccGmToast('KP yalnız Vampir ırkına özeldir.');
  ccGmKpBusy.add(id);
  const buttons=[...CC_GMCTRL_APP.querySelectorAll(`[data-cc-gm-kp="${CSS.escape(String(id))}"]`)];buttons.forEach(b=>b.disabled=true);
  try{
    const {data,error}=await CC_GMCTRL_S.rpc('catlak_update_vampire_kp',{p_character_id:id,p_delta:Number(delta)});if(error)throw error;
    row.data={...(row.data||{}),vampire_kp:Number(data)};
    CC_GMCTRL_APP.querySelectorAll(`[data-cc-gm-kp-value="${CSS.escape(String(id))}"]`).forEach(x=>x.textContent=String(Number(data)));
    ccGmToast(`${row.name} KP: ${Number(data)} / ${ccGmKpMax(row)}`);
  }catch(e){ccGmToast('KP güncellenemedi: '+(e?.message||String(e)))}finally{buttons.forEach(b=>b.disabled=false);ccGmKpBusy.delete(id)}
}

async function ccGmSaveNote(id,text){
  if(ccGmNoteBusy.has(id))return;
  ccGmNoteBusy.add(id);
  const buttons=[...CC_GMCTRL_APP.querySelectorAll(`[data-cc-gm-note-save="${CSS.escape(String(id))}"],[data-cc-gm-note-clear="${CSS.escape(String(id))}"]`)];buttons.forEach(b=>b.disabled=true);
  try{
    const clean=String(text||'').slice(0,2000);
    const {data,error}=await CC_GMCTRL_S.rpc('catlak_gm_set_character_note',{p_character_id:id,p_note:clean});if(error)throw error;
    const row=ccGmRows?.find(c=>String(c.id)===String(id));if(row)row.data={...(row.data||{}),gm_note:String(data||'')};
    const ta=CC_GMCTRL_APP.querySelector(`[data-cc-gm-note="${CSS.escape(String(id))}"]`);if(ta)ta.value=String(data||'');
    ccGmToast(clean.trim()?'Kişiye özel durum oyuncuya gönderildi.':'Kişiye özel durum temizlendi.');
  }catch(e){ccGmToast('GM notu kaydedilemedi: '+(e?.message||String(e)))}finally{buttons.forEach(b=>b.disabled=false);ccGmNoteBusy.delete(id)}
}

CC_GMCTRL_APP.addEventListener('click',e=>{
  const kp=e.target.closest('[data-cc-gm-kp][data-d]');if(kp){e.preventDefault();e.stopPropagation();ccGmChangeKp(kp.dataset.ccGmKp,kp.dataset.d);return}
  const save=e.target.closest('[data-cc-gm-note-save]');if(save){e.preventDefault();const id=save.dataset.ccGmNoteSave;const ta=CC_GMCTRL_APP.querySelector(`[data-cc-gm-note="${CSS.escape(String(id))}"]`);ccGmSaveNote(id,ta?.value||'');return}
  const clear=e.target.closest('[data-cc-gm-note-clear]');if(clear){e.preventDefault();const id=clear.dataset.ccGmNoteClear;const ta=CC_GMCTRL_APP.querySelector(`[data-cc-gm-note="${CSS.escape(String(id))}"]`);if(ta)ta.value='';ccGmSaveNote(id,'');return}
},true);

function ccGmSchedule(){if(ccGmScheduled)return;ccGmScheduled=true;queueMicrotask(()=>{ccGmScheduled=false;if(ccGmIsGM()&&ccGmTab()==='gm'){ccGmRender();ccGmLoad(false)}})}
new MutationObserver(ccGmSchedule).observe(CC_GMCTRL_APP,{childList:true,subtree:true});
CC_GMCTRL_S.channel('cc-gm-controls-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{ccGmRows=null;ccGmVersion++;ccGmLoad(true)}).subscribe();
ccGmSchedule();
