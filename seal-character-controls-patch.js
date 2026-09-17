(function(){
'use strict';
if(window.__catlakSealCharacterControlsV1)return;
window.__catlakSealCharacterControlsV1=true;
const APP=document.querySelector('#app');
const S=window.__catlakSupabase;
if(!APP||!S)return;
const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const isVamp=c=>String(c?.species_name||'').trim().toLocaleLowerCase('tr-TR')==='vampir';
const kpMax=c=>3+(Number(c?.level||1)>=4?1:0)+(Number(c?.level||1)>=14?2:0);
const kpNow=c=>Math.max(0,Math.min(kpMax(c),Number(c?.data?.vampire_kp??3)));
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3600)};
let busy=false,queued=false,rows=[];

if(!document.querySelector('#scc-style')){const st=document.createElement('style');st.id='scc-style';st.textContent=`
.scc-wrap{margin-top:14px}.scc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:12px}.scc-card{border:1px solid var(--line);border-radius:14px;background:#08131e;padding:13px}.scc-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.scc-head h3{margin:3px 0}.scc-kp{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:10px 0;padding:10px;border:1px solid #6b3c48;border-radius:12px;background:#170d13}.scc-kp strong{color:#ffb7c2}.scc-kp-actions{display:flex;gap:6px}.scc-note{min-height:82px}.scc-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.scc-badge{font-size:.68rem;border:1px solid var(--line);border-radius:999px;padding:4px 8px;color:var(--muted)}
`;document.head.appendChild(st)}

function sealsOpen(){return isGM()&&!!APP.querySelector('[data-gcs-page="seals"]')}
function card(c){const vamp=isVamp(c),note=String(c?.data?.gm_note||'');return `<article class="scc-card" data-scc-char="${esc(c.id)}"><div class="scc-head"><div><div class="eyebrow">${vamp?'VAMPİR • ÖZEL KAYNAK':'KİŞİYE ÖZEL DURUM'}</div><h3>${esc(c.name)}</h3><div class="muted">${esc(c.species_name||'')} • Seviye ${Number(c.level||1)}</div></div><span class="scc-badge">${c.play_status==='active'?'CANLI':'HAZIR'}</span></div>${vamp?`<div class="scc-kp"><div><small>KAN PUANI</small><br><strong>KP <span data-scc-kp-value="${esc(c.id)}">${kpNow(c)}</span> / ${kpMax(c)}</strong></div><div class="scc-kp-actions"><button type="button" class="danger" data-scc-kp="${esc(c.id)}" data-d="-1">−</button><button type="button" class="primary" data-scc-kp="${esc(c.id)}" data-d="1">+</button></div></div>`:''}<label>KİŞİYE ÖZEL DURUM / DEBUFF / ÖZEL GÜÇ NOTU<textarea class="scc-note" data-scc-note="${esc(c.id)}" maxlength="2000" placeholder="Örn. Kan Laneti, özel güç durumu, geçici bedel...">${esc(note)}</textarea></label><div class="scc-actions"><button type="button" class="primary" data-scc-save="${esc(c.id)}">Kaydet / Oyuncuya Göster</button><button type="button" data-scc-clear="${esc(c.id)}">Temizle</button></div></article>`}
async function load(){const r=await S.from('catlak_characters').select('id,name,species_name,level,data,play_status,owner_id,created_at').in('play_status',['prepared','active']).order('created_at',{ascending:true});if(r.error)throw r.error;rows=r.data||[];return rows}
async function render(force=false){
 if(!sealsOpen()||busy)return;const page=APP.querySelector('[data-gcs-page="seals"]');if(!page)return;
 if(!force&&page.querySelector('[data-scc-panel]'))return;busy=true;
 try{await load();if(!sealsOpen())return;const p=APP.querySelector('[data-gcs-page="seals"]');if(!p)return;p.querySelector('[data-scc-panel]')?.remove();const sec=document.createElement('section');sec.className='card scc-wrap';sec.dataset.sccPanel='1';sec.innerHTML=`<div class="section-title"><div><div class="eyebrow">GM • KARAKTER KONTROLLERİ</div><h2>KP & Kişiye Özel Durumlar</h2><p class="muted">KP, debuff, geçici bedel ve özel güç notlarını buradan yönet. Canlı Oyun ekranı sade kalır; oyuncu yalnız kendi karakterine ait durumu görür.</p></div><span class="tag">${rows.length} KARAKTER</span></div>${rows.length?`<div class="scc-grid">${rows.map(card).join('')}</div>`:'<div class="empty">Hazır veya canlı karakter yok.</div>'}`;p.appendChild(sec)}catch(e){toast('Karakter kontrolleri yüklenemedi: '+(e?.message||String(e)))}finally{busy=false}
}
async function changeKp(id,d){const c=rows.find(x=>String(x.id)===String(id));if(!c||!isVamp(c))return;const r=await S.rpc('catlak_update_vampire_kp',{p_character_id:id,p_delta:Number(d)});if(r.error)throw r.error;c.data={...(c.data||{}),vampire_kp:Number(r.data)};APP.querySelectorAll(`[data-scc-kp-value="${CSS.escape(String(id))}"]`).forEach(x=>x.textContent=String(Number(r.data)));toast(`${c.name} KP: ${Number(r.data)} / ${kpMax(c)}`)}
async function saveNote(id,value){const clean=String(value||'').slice(0,2000);const r=await S.rpc('catlak_gm_set_character_note',{p_character_id:id,p_note:clean});if(r.error)throw r.error;const c=rows.find(x=>String(x.id)===String(id));if(c)c.data={...(c.data||{}),gm_note:String(r.data||'')};const ta=APP.querySelector(`[data-scc-note="${CSS.escape(String(id))}"]`);if(ta)ta.value=String(r.data||'');toast(clean.trim()?'Kişiye özel durum kaydedildi.':'Kişiye özel durum temizlendi.')}
function schedule(ms=0){if(queued)return;queued=true;setTimeout(()=>requestAnimationFrame(()=>{queued=false;render(false)}),ms)}

window.addEventListener('click',e=>{
 const k=e.target?.closest?.('[data-scc-kp]');if(k){e.preventDefault();e.stopPropagation();changeKp(k.dataset.sccKp,k.dataset.d).catch(x=>toast('KP güncellenemedi: '+(x?.message||String(x))));return}
 const s=e.target?.closest?.('[data-scc-save]');if(s){e.preventDefault();e.stopPropagation();const id=s.dataset.sccSave,ta=APP.querySelector(`[data-scc-note="${CSS.escape(String(id))}"]`);saveNote(id,ta?.value||'').catch(x=>toast('Durum kaydedilemedi: '+(x?.message||String(x))));return}
 const c=e.target?.closest?.('[data-scc-clear]');if(c){e.preventDefault();e.stopPropagation();const id=c.dataset.sccClear,ta=APP.querySelector(`[data-scc-note="${CSS.escape(String(id))}"]`);if(ta)ta.value='';saveNote(id,'').catch(x=>toast('Durum temizlenemedi: '+(x?.message||String(x))));return}
 if(e.target?.closest?.('[data-gcs-route="seals"]'))schedule(100);
},true);
new MutationObserver(()=>schedule(0)).observe(APP,{childList:true,subtree:true});
S.channel('scc-characters').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{APP.querySelector('[data-scc-panel]')?.remove();schedule(100)}).subscribe();
setTimeout(()=>schedule(0),500);
window.__catlakSealCharacterControls={render};
})();