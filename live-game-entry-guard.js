(function(){
'use strict';
if(window.__catlakLiveGameEntryGuardV4)return;
window.__catlakLiveGameEntryGuardV4=true;
const APP=document.getElementById('app');
const ROOT=document.documentElement;
if(!APP)return;

const PAGES_BASE=location.origin+location.pathname;
const inviteLinks=new Map();
let liveFallback=0,liveRaf=0,maintenanceQueued=false;
let managementBusy=false,managementToken=0,managementRealtime=false;
let playerRetrying=false,playerFailsafe=0;
let initiativeBusy=false;

if(!document.getElementById('cc-live-entry-guard-style')){
 const style=document.createElement('style');
 style.id='cc-live-entry-guard-style';
 style.textContent=`
 html.cc-live-entry-pending #app main,
 html.cc-ext-management-pending #app main{visibility:hidden!important}

 html body #app.gmc-gm .nav [data-tab="characters"]{display:inline-flex!important}
 html body #app .nav [data-gmc-route="characters"]{display:none!important}

 html body #app main[data-cc-simple-live="1"]{max-width:1760px!important;padding:10px 14px!important}
 html body #app main[data-cc-simple-live="1"]>.card{padding:9px 11px!important;margin-bottom:8px!important}
 html body #app main[data-cc-simple-live="1"]>.card h1{font-size:1.28rem!important;margin:.08em 0!important}
 html body #app main[data-cc-simple-live="1"]>.card>p.muted{display:none!important}
 html body #app main[data-cc-simple-live="1"] .cc-live-two{grid-template-columns:minmax(0,1.65fr) minmax(220px,.35fr)!important;gap:8px!important;margin-bottom:8px!important;align-items:start!important}
 html body #app main[data-cc-simple-live="1"] .cc-live-two>.card{padding:7px 9px!important;margin:0!important;max-height:210px!important;overflow:auto!important}
 html body #app main[data-cc-simple-live="1"] .cc-live-two .section-title{margin-bottom:3px!important;gap:5px!important}
 html body #app main[data-cc-simple-live="1"] .cc-live-two h2{font-size:.9rem!important;margin:.05em 0 .2em!important}
 html body #app main[data-cc-simple-live="1"] .cc-live-two .eyebrow{font-size:.58rem!important}
 html body #app main[data-cc-simple-live="1"] .cc-clear-rolls{padding:3px 5px!important;font-size:.58rem!important;min-height:22px!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-roll{display:grid!important;grid-template-columns:26px minmax(0,1fr) 36px!important;gap:4px!important;align-items:center!important;padding:2px 0!important;min-height:24px!important;border-bottom:1px solid var(--line)!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-total{font-size:.72rem!important;line-height:1!important;min-width:20px!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-roll b{font-size:.68rem!important;line-height:1.05!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-roll span{font-size:.61rem!important;line-height:1.05!important;color:var(--muted)!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-roll small{display:none!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-roll button{min-height:20px!important;padding:2px 4px!important;font-size:.56rem!important;line-height:1!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-player{padding:3px 0!important;line-height:1.05!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-player b{font-size:.68rem!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-player small{font-size:.56rem!important}
 html body #app main[data-cc-simple-live="1"] label:has(#lcc-char-init){display:none!important}
 html body #app main[data-cc-simple-live="1"] [data-cc-dex-init-note]{grid-column:1/-1;font-size:.66rem;color:var(--muted);padding:2px 0}

 html body #app main[data-cc-simple-live="1"] .lcc-board{margin-top:7px!important}
 html body #app main[data-cc-simple-live="1"] .lcc-columns{gap:8px!important}
 html body #app main[data-cc-simple-live="1"] .lcc-col{padding:8px 9px!important}
 html body #app main[data-cc-simple-live="1"] .lcc-combatant{padding:5px!important;margin-top:4px!important}
 html body #app main[data-cc-simple-live="1"] .lcc-actions{gap:3px!important;margin-top:4px!important}
 html body #app main[data-cc-simple-live="1"] .lcc-actions button{padding:4px 6px!important;font-size:.66rem!important}

 #app main[data-cc-external-management="1"]{max-width:1640px!important}
 #app .cc-exm-page{max-width:1540px;margin:0 auto}
 #app .cc-exm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
 #app .cc-exm-card{border:1px solid var(--line);border-radius:14px;padding:14px;background:#081522}
 #app .cc-exm-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
 #app .cc-exm-meta{font-size:.8rem;color:var(--muted);line-height:1.45}
 #app .cc-exm-pill{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:3px 7px;font-size:.68rem;white-space:nowrap}
 #app .cc-exm-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
 #app .cc-exm-actions button{padding:6px 8px;font-size:.72rem}
 #app .cc-exm-invite{margin-top:10px;padding:9px;border:1px solid #496781;border-radius:10px;background:#091827}
 #app .cc-exm-invite input{width:100%;margin-top:6px;box-sizing:border-box}
 #app .cc-exm-note textarea{min-height:66px}

 @media(max-width:800px){
   html body #app main[data-cc-simple-live="1"] .cc-live-two{grid-template-columns:1fr!important}
   html body #app main[data-cc-simple-live="1"] .cc-live-two>.card{max-height:190px!important}
   html body #app main[data-cc-simple-live="1"] .cc-simple-roll{grid-template-columns:24px minmax(0,1fr) 34px!important}
 }
 `;
 document.head.appendChild(style);
}

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const role=()=>String(APP.querySelector('.role')?.textContent||'').trim();
const isGM=()=>role()==='GM';
const isPlayer=()=>{const r=role();return !!r&&r!=='GM'};
const gmActive=()=>!!APP.querySelector('.nav [data-tab="gm"].on');
const charactersActive=()=>!!APP.querySelector('.nav [data-tab="characters"].on');
function toast(m){const t=document.getElementById('toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3600)}

function ensureManagementNav(){
 if(!isGM())return;
 const nav=APP.querySelector('.nav');if(!nav)return;
 const ext=nav.querySelector('[data-tab="characters"]');
 if(ext){
   ext.hidden=false;
   ext.removeAttribute('aria-hidden');
   ext.removeAttribute('tabindex');
   ext.removeAttribute('data-cc-legacy-management');
   ext.style.removeProperty('display');
   if(ext.textContent!=='Karakter Yönetimi')ext.textContent='Karakter Yönetimi';
 }
 APP.querySelectorAll('[data-gmc-centerbar] [data-gmc-route="characters"],[data-gm2-centerbar] [data-gm2-route="characters"]').forEach(x=>x.remove());
}
function closeGmCenterForExternal(){
 try{window.__catlakGmCleanRouter?.close?.()}catch(_){}
 APP.querySelector('[data-gmc-centerbar]')?.remove();
 APP.querySelector('.nav [data-gmc-open]')?.classList.remove('on');
}
function markExternalActive(){
 const nav=APP.querySelector('.nav');if(!nav)return;
 nav.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));
 nav.querySelector('[data-tab="characters"]')?.classList.add('on');
}
function classBonus(c){
 const b=c?.data?.class_bonus_v1;if(!b?.applied)return'';
 const bits=Object.entries(b.stats||{}).filter(([,v])=>num(v)).map(([k,v])=>`${k} ${num(v)>0?'+':''}${num(v)}`);
 if(num(b.hp))bits.push(`HP +${num(b.hp)}`);if(num(b.ac))bits.push(`AC +${num(b.ac)}`);
 return bits.join(' • ');
}
function managementCard(c){
 const active=String(c.play_status||'')==='active',bonus=classBonus(c),link=inviteLinks.get(String(c.id))||'';
 return `<article class="cc-exm-card" data-cc-exm-char="${esc(c.id)}"><div class="cc-exm-head"><div><div class="eyebrow">${active?'CANLI KARAKTER':'HAZIR KARAKTER'}</div><h3>${esc(c.name||'Adsız')}</h3><div class="cc-exm-meta">${esc(c.species_name||'-')} • ${esc(c.class_name||'-')} • Seviye ${num(c.level)||1}<br>${esc(c.background_name||'-')} • HP ${num(c.hp_current)}/${num(c.hp_max)} • AC ${num(c.base_ac)}</div></div><span class="cc-exm-pill">${c.owner_id?'OYUNCUYA BAĞLI':active?'CANLI':'HAZIR'}</span></div>${bonus?`<div class="notice"><b>SINIF BONUSU</b><div>${esc(bonus)}</div></div>`:''}<div class="cc-exm-actions"><button type="button" data-cc-exm-action="level" data-id="${esc(c.id)}" data-d="-1">Lv −</button><button type="button" data-cc-exm-action="level" data-id="${esc(c.id)}" data-d="1">Lv +</button><button type="button" data-cc-exm-action="hp" data-id="${esc(c.id)}" data-d="-1">HP −</button><button type="button" data-cc-exm-action="hp" data-id="${esc(c.id)}" data-d="1">HP +</button><button type="button" class="primary" data-cc-exm-action="invite" data-id="${esc(c.id)}" data-name="${esc(c.name||'Karakter')}" data-owned="${c.owner_id?'1':'0'}">${c.owner_id?'Yeniden Bağlama Linki':'Oyuncu Daveti'}</button><button type="button" class="danger" data-cc-exm-action="delete" data-id="${esc(c.id)}" data-name="${esc(c.name||'Karakter')}">Sil</button></div>${link?`<div class="cc-exm-invite"><b>Bu karakterin bağlantısı</b><input readonly value="${esc(link)}"><div class="cc-exm-actions"><button type="button" data-cc-exm-action="copy" data-id="${esc(c.id)}">Linki Kopyala</button></div></div>`:''}<label class="cc-exm-note">Oyuncuya Özel Durum / GM Notu<textarea data-cc-exm-note="${esc(c.id)}">${esc(c?.data?.gm_note||'')}</textarea></label><button type="button" data-cc-exm-action="note" data-id="${esc(c.id)}">Notu Kaydet</button></article>`;
}
async function renderExternalManagement(force=true){
 if(!isGM())return false;
 const S=window.__catlakSupabase;if(!S){setTimeout(()=>renderExternalManagement(force),80);return false}
 closeGmCenterForExternal();
 markExternalActive();
 ensureManagementNav();
 window.__catlakPreparedOwner=true;
 ROOT.classList.add('cc-ext-management-pending');
 const token=++managementToken;
 const main=APP.querySelector('main');if(!main)return false;
 main.dataset.ccExternalManagement='1';
 main.innerHTML='<div class="cc-exm-page"><section class="card"><div class="muted">Karakterler yükleniyor…</div></section></div>';
 try{
   const r=await S.from('catlak_characters').select('*').order('created_at',{ascending:true});
   if(r.error)throw r.error;
   if(token!==managementToken||!charactersActive())return false;
   const rows=r.data||[];
   const active=rows.filter(x=>x.play_status==='active'),prepared=rows.filter(x=>x.play_status==='prepared');
   const ordered=[...active,...prepared,...rows.filter(x=>!['active','prepared'].includes(String(x.play_status||'')))];
   main.innerHTML=`<div class="cc-exm-page"><section class="card"><div class="eyebrow">GM • KARAKTER YÖNETİMİ</div><h1>Karakter Yönetimi</h1><p class="muted">Bütün hazır ve canlı karakterler, oyuncu davetleri ve yeniden bağlama bağlantıları artık doğrudan bu üst menü ekranında.</p><div class="cc-exm-actions"><button type="button" class="primary" data-cc-exm-action="builder">+ Yeni Karakter</button></div></section><section class="card"><div class="section-title"><div><div class="eyebrow">KARAKTERLER</div><h2>${rows.length} Karakter</h2></div></div>${ordered.length?`<div class="cc-exm-grid">${ordered.map(managementCard).join('')}</div>`:'<div class="empty">Henüz karakter yok.</div>'}</section></div>`;
   requestAnimationFrame(()=>requestAnimationFrame(()=>ROOT.classList.remove('cc-ext-management-pending')));
   return true;
 }catch(e){
   if(token===managementToken)main.innerHTML=`<section class="card"><h2>Karakter Yönetimi açılamadı</h2><p class="muted">${esc(e?.message||String(e))}</p></section>`;
   ROOT.classList.remove('cc-ext-management-pending');
   return false;
 }
}
async function externalManagementAction(b){
 if(managementBusy||!isGM())return;
 const S=window.__catlakSupabase;if(!S)return toast('Veri bağlantısı henüz hazır değil.');
 managementBusy=true;
 try{
   const type=b.dataset.ccExmAction||'',id=b.dataset.id;
   if(type==='builder'){
     closeGmCenterForExternal();
     const builder=APP.querySelector('.nav [data-tab="builder"]');
     if(!builder)throw new Error('Karakter Oluşturucu bulunamadı.');
     builder.click();
     return;
   }
   if(type==='level'){
     const q=await S.from('catlak_characters').select('id,level').eq('id',id).maybeSingle();if(q.error)throw q.error;
     const level=Math.max(1,Math.min(20,num(q.data?.level)+num(b.dataset.d)));
     const r=await S.rpc('catlak_set_character_level',{p_character_id:id,p_level:level});if(r.error)throw r.error;
     toast(`Seviye ${level} oldu.`);await renderExternalManagement(true);return;
   }
   if(type==='hp'){
     const q=await S.from('catlak_characters').select('id,hp_current,hp_max').eq('id',id).maybeSingle();if(q.error)throw q.error;
     const hp=Math.max(0,Math.min(num(q.data?.hp_max),num(q.data?.hp_current)+num(b.dataset.d)));
     const r=await S.from('catlak_characters').update({hp_current:hp}).eq('id',id);if(r.error)throw r.error;
     await renderExternalManagement(true);return;
   }
   if(type==='note'){
     const q=await S.from('catlak_characters').select('id,data').eq('id',id).maybeSingle();if(q.error)throw q.error;
     const note=APP.querySelector(`[data-cc-exm-note="${CSS.escape(String(id))}"]`)?.value||'';
     const data={...(q.data?.data||{}),gm_note:note};
     const r=await S.from('catlak_characters').update({data}).eq('id',id);if(r.error)throw r.error;
     toast('Karakter notu kaydedildi.');return;
   }
   if(type==='delete'){
     if(!confirm(`${b.dataset.name||'Karakter'} kalıcı olarak silinsin mi?`))return;
     const r=await S.from('catlak_characters').delete().eq('id',id);if(r.error)throw r.error;
     inviteLinks.delete(String(id));toast('Karakter silindi.');await renderExternalManagement(true);return;
   }
   if(type==='invite'){
     const owned=b.dataset.owned==='1',fn=owned?'catlak_generate_character_reconnect':'catlak_generate_character_claim';
     const r=await S.rpc(fn,{p_character_id:id});if(r.error)throw r.error;
     const raw=r.data?.token??r.data?.code??r.data?.invite??r.data;
     if(raw==null||String(raw).trim()==='')throw new Error('Davet anahtarı üretilemedi.');
     const link=PAGES_BASE+'?join='+encodeURIComponent(String(raw));inviteLinks.set(String(id),link);
     try{await navigator.clipboard.writeText(link)}catch(_){}
     toast((owned?'Yeniden bağlama':'Karakter davet')+' linki oluşturuldu ve kopyalandı.');
     await renderExternalManagement(true);return;
   }
   if(type==='copy'){
     const link=inviteLinks.get(String(id));if(!link)throw new Error('Önce bağlantı oluştur.');
     try{await navigator.clipboard.writeText(link);toast('Link kopyalandı.')}catch(_){prompt('Bağlantı:',link)}
   }
 }catch(e){toast(e?.message||String(e))}finally{managementBusy=false}
}

function combatExpected(){return !!window.__catlakLiveCombatCenter||!!document.querySelector('script[data-live-combat-center-runtime]')}
function decorateLive(){
 const main=APP.querySelector('main');
 if(!isGM()||!gmActive()||!main||main.dataset.ccSimpleLive!=='1'||!main.querySelector('.cc-live-two'))return false;
 const input=main.querySelector('#lcc-char-init');
 if(input){const label=input.closest('label');if(label)label.style.display='none';const toolbar=input.closest('.lcc-toolbar');if(toolbar&&!toolbar.querySelector('[data-cc-dex-init-note]')){const n=document.createElement('div');n.dataset.ccDexInitNote='1';n.textContent='Oyuncu inisiyatifi otomatik: d20 + DEX bonusu';toolbar.appendChild(n)}}
 if(combatExpected()&&!main.querySelector('[data-lcc-board]'))return false;
 main.dataset.ccLiveV4Ready='1';
 return true;
}
function finalLiveReady(){const main=APP.querySelector('main');return !!(decorateLive()&&main?.dataset.ccLiveV4Ready==='1')}
function clearLivePending(){clearTimeout(liveFallback);liveFallback=0;if(liveRaf){cancelAnimationFrame(liveRaf);liveRaf=0}ROOT.classList.remove('cc-live-entry-pending')}
function watchLiveReady(){
 if(!ROOT.classList.contains('cc-live-entry-pending'))return;
 if(!isGM()||!gmActive()){clearLivePending();return}
 if(finalLiveReady()){requestAnimationFrame(()=>requestAnimationFrame(()=>{if(finalLiveReady())clearLivePending()}));return}
 liveRaf=requestAnimationFrame(watchLiveReady);
}
function beginLive(){
 if(!isGM())return;
 clearTimeout(liveFallback);if(liveRaf)cancelAnimationFrame(liveRaf);
 APP.querySelector('main')?.removeAttribute('data-cc-live-v4-ready');
 ROOT.classList.add('cc-live-entry-pending');
 liveFallback=setTimeout(clearLivePending,5500);
 liveRaf=requestAnimationFrame(watchLiveReady);
}

async function getDex(characterId){
 const S=window.__catlakSupabase;if(!S)throw new Error('Veri bağlantısı hazır değil.');
 const r=await S.from('catlak_characters').select('id,name,base_stats').eq('id',characterId).maybeSingle();if(r.error)throw r.error;
 if(!r.data)throw new Error('Karakter bulunamadı.');
 const dex=num(r.data.base_stats?.DEX);return {name:r.data.name||'Karakter',dex,mod:Math.floor((dex-10)/2)};
}
function rollDexInit(d){const die=1+Math.floor(Math.random()*20);return {die,total:die+d.mod}}
async function addCharacterWithDex(){
 if(initiativeBusy)return;initiativeBusy=true;
 try{
   const S=window.__catlakSupabase,cid=APP.querySelector('#lcc-add-char')?.value;if(!S||!cid)throw new Error('Eklenecek oyuncu yok.');
   const d=await getDex(cid),r=rollDexInit(d);
   const q=await S.rpc('catlak_gm_combat_add_character',{p_character_id:cid,p_initiative:r.total});if(q.error)throw q.error;
   toast(`${d.name} • İnisiyatif ${r.total} (d20 ${r.die} ${d.mod>=0?'+':'−'} ${Math.abs(d.mod)} DEX)`);
   setTimeout(()=>window.__catlakLiveCombatCenter?.render?.(),20);
 }catch(e){toast('İnisiyatif hesaplanamadı: '+(e?.message||String(e)))}finally{initiativeBusy=false}
}
async function rerollPlayerDex(combatantId){
 if(initiativeBusy)return;initiativeBusy=true;
 try{
   const S=window.__catlakSupabase;if(!S)throw new Error('Veri bağlantısı hazır değil.');
   const c=await S.from('catlak_combatants').select('id,kind,character_id,name').eq('id',combatantId).maybeSingle();if(c.error)throw c.error;
   if(!c.data||c.data.kind!=='player'||!c.data.character_id){initiativeBusy=false;return false}
   const d=await getDex(c.data.character_id),r=rollDexInit(d);
   const u=await S.from('catlak_combatants').update({initiative:r.total}).eq('id',combatantId);if(u.error)throw u.error;
   toast(`${d.name} • İnisiyatif ${r.total} (d20 ${r.die} ${d.mod>=0?'+':'−'} ${Math.abs(d.mod)} DEX)`);
   setTimeout(()=>window.__catlakLiveCombatCenter?.render?.(),20);
   return true;
 }catch(e){toast('İnisiyatif yenilenemedi: '+(e?.message||String(e)));return true}finally{initiativeBusy=false}
}

function playerSheetHasContent(){
 const main=APP.querySelector('main');if(!main)return false;
 if(main.querySelector('section.hero,.cc-character-stack,.ps-sheet-empty,.ccbv-no-character'))return true;
 return /Canlı Karakter|Canlı oyuna hazır|Henüz karakter|karakter bulunamadı/i.test(String(main.textContent||''));
}
function refreshPlayerLayers(){
 try{window.__catlakPlayerSheetSupport?.refresh?.(true)}catch(_){}
 try{window.__catlakPlayerLiveTest?.refresh?.(true)}catch(_){}
 try{window.__catlakPlayerSheetEquipmentAbilitiesTest?.paint?.(true)}catch(_){}
 try{window.__catlakPlayerSheetTest?.apply?.()}catch(_){}
}
function playerSheetRepair(userInitiated=false){
 if(!isPlayer())return;
 clearTimeout(playerFailsafe);
 const sheet=APP.querySelector('.nav [data-tab="sheet"]');if(!sheet)return;
 [70,260,760,1500].forEach(ms=>setTimeout(()=>{
   if(!isPlayer()||!sheet.classList.contains('on'))return;
   refreshPlayerLayers();
   if(playerSheetHasContent())ROOT.classList.remove('cc-player-critical-pending','pptf-player-prep');
 },ms));
 if(userInitiated)setTimeout(()=>{
   if(!isPlayer()||!sheet.classList.contains('on')||playerSheetHasContent()||playerRetrying)return;
   playerRetrying=true;
   try{sheet.click()}catch(_){}
   setTimeout(()=>{playerRetrying=false;refreshPlayerLayers()},0);
 },620);
 playerFailsafe=setTimeout(()=>{ROOT.classList.remove('cc-player-critical-pending','pptf-player-prep');refreshPlayerLayers()},3600);
}

function scheduleMaintenance(){if(maintenanceQueued)return;maintenanceQueued=true;requestAnimationFrame(()=>{
 maintenanceQueued=false;
 ensureManagementNav();
 if(isGM())APP.querySelectorAll('[data-gmc-route="characters"]').forEach(x=>x.remove());
 if(isGM()&&charactersActive()){
   window.__catlakPreparedOwner=true;
   const main=APP.querySelector('main');
   if(main&&!main.querySelector('[data-cc-exm-char],.cc-exm-page')&&!managementBusy)renderExternalManagement(false);
 }
 if(isGM()&&gmActive())decorateLive();
 if(isPlayer()&&APP.querySelector('.nav [data-tab="sheet"].on'))refreshPlayerLayers();
})}

window.addEventListener('pointerdown',e=>{
 if(e.button!=null&&e.button!==0)return;
 const gm=e.target?.closest?.('#app .nav [data-tab="gm"]');
 if(gm&&isGM()){beginLive();return}
 const chars=e.target?.closest?.('#app .nav [data-tab="characters"]');
 if(chars&&isGM()){ROOT.classList.add('cc-ext-management-pending');return}
},true);

window.addEventListener('click',e=>{
 const chars=e.target?.closest?.('#app .nav [data-tab="characters"]');
 if(chars&&isGM()){
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   renderExternalManagement(true);return;
 }
 const action=e.target?.closest?.('[data-cc-exm-action]');
 if(action&&isGM()){
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   externalManagementAction(action);return;
 }
 const add=e.target?.closest?.('[data-lcc-add-char]');
 if(add&&isGM()){
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   addCharacterWithDex();return;
 }
 const ini=e.target?.closest?.('[data-lcc-init]');
 if(ini&&isGM()){
   const id=ini.dataset.lccInit;
   const S=window.__catlakSupabase;
   if(S&&id){
     e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
     (async()=>{const c=await S.from('catlak_combatants').select('id,kind').eq('id',id).maybeSingle();if(c.error){toast(c.error.message);return}if(c.data?.kind==='player')await rerollPlayerDex(id);else{const r=await S.rpc('catlak_gm_combat_roll_initiative',{p_combatant_id:id});if(r.error)toast(r.error.message);else{toast('İnisiyatif: '+r.data);setTimeout(()=>window.__catlakLiveCombatCenter?.render?.(),20)}}})();
     return;
   }
 }
 const sheet=e.target?.closest?.('#app .nav [data-tab="sheet"]');
 if(sheet&&isPlayer()&&!playerRetrying){playerSheetRepair(true);return}
 const nav=e.target?.closest?.('#app .nav button');
 if(nav&&isGM()&&!nav.matches('[data-tab="gm"],[data-tab="characters"]')){clearLivePending();ROOT.classList.remove('cc-ext-management-pending')}
},true);

new MutationObserver(()=>{
 scheduleMaintenance();
 if(ROOT.classList.contains('cc-live-entry-pending')){
   if(!isGM()||!gmActive())clearLivePending();
   else if(finalLiveReady())requestAnimationFrame(()=>requestAnimationFrame(()=>{if(finalLiveReady())clearLivePending()}));
 }
}).observe(APP,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-cc-simple-live']});

async function startRealtime(){
 if(managementRealtime)return;
 for(let i=0;i<160&&!window.__catlakSupabase;i++)await new Promise(r=>setTimeout(r,50));
 const S=window.__catlakSupabase;if(!S||managementRealtime)return;
 managementRealtime=true;
 S.channel('cc-external-management-v4').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{
   if(isGM()&&charactersActive()&&!managementBusy)renderExternalManagement(false);
   if(isPlayer()&&APP.querySelector('.nav [data-tab="sheet"].on'))playerSheetRepair(false);
 }).subscribe();
}

queueMicrotask(()=>{scheduleMaintenance();startRealtime();setTimeout(scheduleMaintenance,250);setTimeout(scheduleMaintenance,900)});
window.__catlakLiveGameEntryGuard={
 begin:beginLive,clear:clearLivePending,ready:finalLiveReady,
 repairPlayerSheet:()=>playerSheetRepair(true),
 openManagement:()=>renderExternalManagement(true),
 maintain:scheduleMaintenance
};
})();