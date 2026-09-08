const CUX_S=window.__catlakSupabase;
const CUX_APP=document.querySelector('#app');
if(!CUX_S||!CUX_APP)throw new Error('Çatlak Çağı UX katmanı başlatılamadı.');

const CUX_STATS=['STR','DEX','CON','INT','WIS','CHA'];
const cuxH=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cuxTxt=e=>String(e?.textContent||'').trim();
const cuxIsGM=()=>cuxTxt(CUX_APP.querySelector('.role'))==='GM';
const cuxStatsActive=()=>!!CUX_APP.querySelector('[data-cc-stats-tab].on');
const cuxToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(cuxToast.t);cuxToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let cuxChars=[],cuxSelected='',cuxBusy=false,cuxSeq=0;

const cuxCss=`
.cux-route-loading{min-height:280px;display:flex;align-items:center;justify-content:center;text-align:center}.cux-route-loading .cux-pulse{width:11px;height:11px;border-radius:50%;background:var(--cyan);display:inline-block;margin-right:8px;box-shadow:0 0 0 0 #69d7ff66;animation:cuxPulse 1.15s infinite}@keyframes cuxPulse{70%{box-shadow:0 0 0 12px #69d7ff00}}
.cux-workshop{display:grid;grid-template-columns:minmax(220px,.56fr) minmax(0,1.44fr);gap:16px;align-items:start}.cux-character-list{display:grid;gap:8px;max-height:68vh;overflow:auto;padding-right:4px}.cux-character-btn{width:100%;text-align:left;padding:11px 12px!important;border:1px solid var(--line)!important;border-radius:12px!important;background:#07111d!important}.cux-character-btn.on{border-color:var(--cyan)!important;background:#102437!important;box-shadow:0 0 0 2px #69d7ff14}.cux-character-btn b{display:block;font-size:.95rem}.cux-character-btn small{display:block;color:var(--muted);margin-top:3px}.cux-character-btn .cux-state{float:right;font-size:.62rem;letter-spacing:.07em;color:var(--gold)}
.cux-editor{position:sticky;top:12px;border-color:#34516d!important}.cux-editor-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.cux-editor-head h2{margin:.15rem 0}.cux-stat-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin:12px 0 16px}.cux-vital-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.cux-field{display:block;font-size:.68rem;color:var(--muted);letter-spacing:.04em}.cux-field input{margin-top:4px;text-align:center;font-weight:900;padding:9px 7px}.cux-editor-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.cux-mini-note{font-size:.8rem;color:var(--muted);margin:5px 0 0}.cux-compact-hero{padding-top:16px!important;padding-bottom:16px!important}.cux-compact-hero h1{margin:.1em 0 .2em}
@media(max-width:900px){.cux-workshop{grid-template-columns:1fr}.cux-character-list{max-height:none;grid-template-columns:repeat(2,minmax(0,1fr))}.cux-editor{position:static}.cux-stat-grid{grid-template-columns:repeat(3,1fr)}.cux-vital-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:600px){.cux-character-list{grid-template-columns:1fr}.cux-stat-grid,.cux-vital-grid{grid-template-columns:repeat(2,1fr)}}
`;
if(!document.querySelector('#cux-style')){const s=document.createElement('style');s.id='cux-style';s.textContent=cuxCss;document.head.appendChild(s)}

function cuxRouteLoading(label='Sayfa'){
  const main=CUX_APP.querySelector('main');if(!main)return;
  main.innerHTML=`<section class="card cux-route-loading"><div><div><span class="cux-pulse"></span><b>${cuxH(label)} açılıyor</b></div><p class="muted">Eski ekran temizlendi; yeni içerik hazırlanıyor.</p></div></section>`;
  main.removeAttribute('data-ccx-page');main.removeAttribute('data-ccxPage');main.removeAttribute('data-ccMapPage');main.removeAttribute('data-ccSimpleLive');main.removeAttribute('data-ccPage');
}
window.__catlakRouteLoading=cuxRouteLoading;

function cuxField(key,value,min,max,label=key){return`<label class="cux-field">${cuxH(label)}<input type="number" min="${min}" max="${max}" data-cux-field="${key}" value="${Number(value??0)}"></label>`}
function cuxStatus(c){return c.play_status==='active'?'CANLI':'HAZIR'}
function cuxCharButton(c){const on=c.id===cuxSelected?' on':'';return`<button type="button" class="cux-character-btn${on}" data-cux-character="${c.id}"><span class="cux-state">${cuxStatus(c)}</span><b>${cuxH(c.name)}</b><small>${cuxH(c.species_name||'')} • ${cuxH(c.class_name||'')} ${Number(c.level||1)}</small></button>`}
function cuxEditor(c){
  if(!c)return`<section class="card cux-editor"><div class="cc-empty">Düzenlenecek karakter yok.</div></section>`;
  const s=c.base_stats||{};
  return`<section class="card cux-editor" data-cux-editor="${c.id}"><div class="cux-editor-head"><div><div class="eyebrow">${cuxStatus(c)} • KARAKTER</div><h2>${cuxH(c.name)}</h2><p class="cux-mini-note">${cuxH(c.species_name||'')} • ${cuxH(c.class_name||'')} • ${cuxH(c.background_name||'')}</p></div><span class="tag">LV ${Number(c.level||1)}</span></div><h3>Temel Statlar</h3><div class="cux-stat-grid">${CUX_STATS.map(k=>cuxField(k,s[k]??10,1,99)).join('')}</div><h3>Can & Savaş</h3><div class="cux-vital-grid">${cuxField('HP_CURRENT',c.hp_current,0,99999,'HP')}${cuxField('HP_MAX',c.hp_max,1,99999,'MAX HP')}${cuxField('AC',c.base_ac,0,999,'AC')}${cuxField('SPEED',c.base_speed,0,9999,'HIZ')}${cuxField('LEVEL',c.level,1,20,'LV')}</div><div class="cux-editor-actions"><button type="button" class="primary" data-cux-save="${c.id}">Kaydet</button></div></section>`
}
function cuxPaint(){
  if(!cuxStatsActive()||!cuxIsGM())return;
  const main=CUX_APP.querySelector('main');if(!main)return;
  const selected=cuxChars.find(c=>c.id===cuxSelected)||cuxChars[0];if(selected)cuxSelected=selected.id;
  main.innerHTML=`<section class="card ccx-hero cux-compact-hero"><div class="eyebrow">GM • STAT ATÖLYESİ</div><h1>Hızlı Karakter Düzenleme</h1><p class="muted">Soldan karakteri seç, sağdan değerleri değiştir ve kaydet. Bütün karakter kartlarını aynı anda açmadığımız için sayfa kısa ve hızlı kalır.</p></section><div class="cux-workshop"><aside class="card"><div class="eyebrow">KARAKTERLER</div><h3>Hazır & Canlı</h3><div class="cux-character-list">${cuxChars.length?cuxChars.map(cuxCharButton).join(''):'<div class="cc-empty">Karakter yok.</div>'}</div></aside>${cuxEditor(selected)}</div>`;
  main.dataset.cuxPage='stats';
}

async function cuxRenderStats(force=false){
  if(!cuxIsGM()||!cuxStatsActive()||cuxBusy)return;
  const main=CUX_APP.querySelector('main');if(!main)return;if(!force&&main.dataset.cuxPage==='stats')return;
  const seq=++cuxSeq;cuxBusy=true;
  try{
    const {data,error}=await CUX_S.from('catlak_characters').select('id,name,species_name,background_name,class_name,play_status,base_stats,hp_current,hp_max,base_ac,base_speed,level,created_at').in('play_status',['prepared','active']).order('play_status').order('created_at',{ascending:true});
    if(error)throw error;
    if(seq!==cuxSeq||!cuxStatsActive())return;
    cuxChars=data||[];
    if(!cuxSelected||!cuxChars.some(c=>c.id===cuxSelected))cuxSelected=cuxChars[0]?.id||'';
    cuxPaint();
  }catch(e){cuxToast('Stat Atölyesi yüklenemedi: '+(e?.message||String(e)))}finally{cuxBusy=false}
}
window.__catlakRenderCompactStats=cuxRenderStats;

async function cuxSave(id){
  if(!cuxIsGM())return;const editor=CUX_APP.querySelector(`[data-cux-editor="${CSS.escape(String(id))}"]`);if(!editor)return;
  const val=k=>Number(editor.querySelector(`[data-cux-field="${k}"]`)?.value);
  const stats={};for(const k of CUX_STATS)stats[k]=val(k);
  const payload={p_character_id:id,p_stats:stats,p_hp_current:val('HP_CURRENT'),p_hp_max:val('HP_MAX'),p_ac:val('AC'),p_speed:val('SPEED'),p_level:val('LEVEL')};
  const btn=editor.querySelector('[data-cux-save]');if(btn){btn.disabled=true;btn.textContent='Kaydediliyor…'}
  try{
    const {error}=await CUX_S.rpc('catlak_gm_update_character_sheet',payload);if(error)throw error;
    cuxToast('Karakter değerleri kaydedildi.');await cuxRenderStats(true);
  }catch(e){cuxToast('Kaydedilemedi: '+(e?.message||String(e)))}finally{if(btn){btn.disabled=false;btn.textContent='Kaydet'}}
}

document.addEventListener('click',e=>{
  const nav=e.target.closest('#app .nav button');
  if(nav&&!nav.classList.contains('on')&&!nav.matches('[data-cc-world-tab],[data-cc-stats-tab],[data-cc-map-tab]'))cuxRouteLoading(cuxTxt(nav)||'Sayfa');
  const pick=e.target.closest('[data-cux-character]');if(pick){e.preventDefault();cuxSelected=pick.dataset.cuxCharacter;cuxPaint();return}
  const save=e.target.closest('[data-cux-save]');if(save){e.preventDefault();cuxSave(save.dataset.cuxSave);return}
},true);

CUX_S.channel('cux-stats-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{if(cuxStatsActive()){const m=CUX_APP.querySelector('main');if(m)m.dataset.cuxPage='';cuxRenderStats(true)}}).subscribe();
