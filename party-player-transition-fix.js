(function(){
'use strict';
if(window.__catlakPartyPlayerTransitionV1)return;
window.__catlakPartyPlayerTransitionV1=true;
const APP=document.querySelector('#app');
const S=window.__catlakSupabase;
if(!APP||!S)return;
const PKEY='cc_party_member',BKEY='cc_battle_member';
const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3600)};
let open=false,busy=false,token=0,prepTimer=0,livePrepTimer=0;

if(!document.querySelector('#pptf-style')){const st=document.createElement('style');st.id='pptf-style';st.textContent=`
#app .pptf-shell{max-width:1540px;margin:0 auto;display:flex;flex-direction:column;gap:14px}.pptf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}.pptf-card{border:1px solid var(--line);border-radius:14px;padding:14px;background:#081522}.pptf-card.party{border-color:#6c5b35;box-shadow:inset 3px 0 #cba65a}.pptf-card.battle{box-shadow:inset -3px 0 #8a4651}.pptf-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.pptf-head h3{margin:3px 0}.pptf-flags,.pptf-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.pptf-flag{border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:.7rem;color:var(--muted)}.pptf-flag.on{color:#cce9aa;border-color:#55764c}.pptf-flag.war{color:#ffc0c8;border-color:#75424b}.pptf-loading{padding:34px;text-align:center;border:1px dashed var(--line);border-radius:14px;color:var(--muted)}
html.pptf-player-prep #app main,html.pptf-live-prep #app main{visibility:hidden!important}html.pptf-player-prep #app,html.pptf-live-prep #app{min-height:100vh}
`;document.head.appendChild(st)}

function claim(){
 if(!isGM())return false;open=true;window.__catlakPartyRoomOwnsMain=true;window.__catlakBattleRoomOpen=false;window.__catlakGmCenterSelectedRoute='';
 try{window.__catlakGmTools?.close?.()}catch(_){ }try{window.__catlakCampaignStateTest?.close?.()}catch(_){ }try{window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.()}catch(_){ }
 APP.classList.remove('gmcr-center-open');APP.querySelector('[data-gm2-centerbar]')?.remove();
 const nav=APP.querySelector('.nav');nav?.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));nav?.querySelector('[data-prh-manager]')?.classList.add('on');return true;
}
function release(){open=false;window.__catlakPartyRoomOwnsMain=false;token++}
function card(c){const d=c.data||{},p=d[PKEY]===true,b=d[BKEY]===true;return `<article class="pptf-card ${p?'party':''} ${b?'battle':''}" data-pptf-char="${esc(c.id)}"><div class="pptf-head"><div><div class="eyebrow">${d.cc_companion?'OYNANABİLİR YARDIMCI':c.owner_id?'OYUNCUYA BAĞLI':'HAZIR KARAKTER'}</div><h3>${esc(c.name)}</h3><div class="muted">${esc(c.species_name||'')} • ${esc(d.cc_role||c.class_name||'')} • Seviye ${Number(c.level||1)}</div></div><span class="tag">${c.play_status==='active'?'CANLI':'HAZIR'}</span></div><div class="pptf-flags"><span class="pptf-flag ${p?'on':''}">${p?'✓ PARTİDE':'PARTİ DIŞI'}</span><span class="pptf-flag ${b?'war':''}">${b?'⚔ SAVAŞ ODASINDA':'SAVAŞ DIŞI'}</span></div><div class="muted" style="margin-top:8px">HP ${Number(c.hp_current||0)}/${Number(c.hp_max||0)} • AC ${Number(c.base_ac||0)} • Hız ${Number(c.base_speed||0)}</div><div class="pptf-actions"><button type="button" class="${p?'danger':'primary'}" data-pptf-party="${esc(c.id)}" data-v="${p?'0':'1'}">${p?'Partiden Çıkar':'Partiye Al'}</button><button type="button" class="${b?'danger':'primary'}" data-pptf-battle="${esc(c.id)}" data-v="${b?'0':'1'}">${b?'Savaştan Çıkar':'Savaş Odasına Al'}</button>${!c.owner_id?`<button type="button" data-pptf-invite="${esc(c.id)}" data-name="${esc(c.name)}">Oyuncuya Davet</button>`:''}</div></article>`}
async function render(){
 if(!claim()||busy)return;const my=++token,main=APP.querySelector('main');if(!main)return;busy=true;
 main.innerHTML='<div class="pptf-shell" data-pptf-page><section class="card"><div class="eyebrow">GM • PARTİ & SAVAŞ KATILIMI</div><h1>Parti Yönetimi</h1><p class="muted">Partiye ve Savaş Odasına girecek karakterleri buradan seç.</p></section><section class="card"><div class="pptf-loading">Karakterler yükleniyor…</div></section></div>';
 try{const r=await S.from('catlak_characters').select('id,name,species_name,class_name,level,hp_current,hp_max,base_ac,base_speed,data,owner_id,play_status,created_at').in('play_status',['prepared','active']).order('created_at',{ascending:true});if(r.error)throw r.error;if(!open||my!==token)return;const rows=r.data||[],page=APP.querySelector('[data-pptf-page]');if(!page)return;page.lastElementChild.innerHTML=`<div class="section-title"><div><div class="eyebrow">KATILIMCI HAVUZU</div><h2>${rows.length} Karakter</h2></div></div>${rows.length?`<div class="pptf-grid">${rows.map(card).join('')}</div>`:'<div class="empty">Hazır veya canlı karakter yok.</div>'}`;
 }catch(e){const page=APP.querySelector('[data-pptf-page]');if(page?.lastElementChild)page.lastElementChild.innerHTML=`<div class="empty">Parti Yönetimi yüklenemedi: ${esc(e?.message||String(e))}</div>`}finally{busy=false}
}
async function latest(id){const r=await S.from('catlak_characters').select('id,name,data,play_status').eq('id',id).maybeSingle();if(r.error)throw r.error;if(!r.data)throw new Error('Karakter bulunamadı.');return r.data}
async function setFlag(id,key,value){
 if(!open)claim();const c=await latest(id),data={...(c.data||{}),[key]:!!value};const u=await S.from('catlak_characters').update({data}).eq('id',id).select('id');if(u.error)throw u.error;
 if(key===BKEY){try{const st=await S.from('catlak_combat_state').select('active').eq('id',1).maybeSingle();if(st.data?.active){const cr=await S.from('catlak_combatants').select('id,character_id').eq('character_id',id).maybeSingle();if(value&&!cr.data&&c.play_status==='active')await S.rpc('catlak_gm_combat_add_character',{p_character_id:id,p_initiative:null});if(!value&&cr.data)await S.rpc('catlak_gm_combat_remove',{p_combatant_id:cr.data.id})}}catch(e){console.warn('PPTF combat sync',e)}}
 toast(value?(key===PKEY?'Karakter partiye alındı.':'Karakter savaş odasına alındı.'):(key===PKEY?'Karakter partiden çıkarıldı.':'Karakter savaş odasından çıkarıldı.'));busy=false;await render();
}
async function invite(id,name){const r=await S.rpc('catlak_generate_character_claim',{p_character_id:id});if(r.error)throw r.error;const link='https://axionblooder.github.io/catlak-cagi-online/?join='+encodeURIComponent(r.data);try{await navigator.clipboard.writeText(link)}catch(_){}prompt(`${name||'Karakter'} için oyuncu davet linki:`,link)}
function managerTarget(e){return e.target?.closest?.('#app [data-prh-manager],#app [data-pm3-open]')}
function interceptManager(e){if(!managerTarget(e)||!isGM())return false;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();render();return true}
window.addEventListener('pointerdown',interceptManager,true);
window.addEventListener('click',e=>{
 if(interceptManager(e))return;
 const p=e.target?.closest?.('[data-pptf-party]');if(p){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setFlag(p.dataset.pptfParty,PKEY,p.dataset.v==='1').catch(x=>toast(x?.message||String(x)));return}
 const b=e.target?.closest?.('[data-pptf-battle]');if(b){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setFlag(b.dataset.pptfBattle,BKEY,b.dataset.v==='1').catch(x=>toast(x?.message||String(x)));return}
 const i=e.target?.closest?.('[data-pptf-invite]');if(i){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();invite(i.dataset.pptfInvite,i.dataset.name).catch(x=>toast(x?.message||String(x)));return}
 const foreign=e.target?.closest?.('#app .nav button:not([data-prh-manager]):not([data-pm3-open]),#app [data-gm2-route],#app [data-gcs-route]');if(foreign&&open)release();
},true);

function playerSheetRequested(){return !isGM()&&APP.querySelector('.nav button.on[data-tab="sheet"]')}
function gmLiveRequested(){return isGM()&&APP.querySelector('.nav button.on[data-tab="gm"]')}
function prepPlayer(){if(isGM())return;document.documentElement.classList.add('pptf-player-prep');clearTimeout(prepTimer);prepTimer=setTimeout(showPlayer,1600)}
function showPlayer(){clearTimeout(prepTimer);document.documentElement.classList.remove('pptf-player-prep')}
function prepGmLive(){if(!isGM())return;document.documentElement.classList.add('pptf-live-prep');clearTimeout(livePrepTimer);livePrepTimer=setTimeout(showGmLive,1400)}
function showGmLive(){clearTimeout(livePrepTimer);document.documentElement.classList.remove('pptf-live-prep')}
function checkTransitions(){
 const main=APP.querySelector('main');if(!main)return;
 if(document.documentElement.classList.contains('pptf-player-prep')){
  const stacks=[...main.querySelectorAll('.cc-character-stack')],ready=main.classList.contains('ps-player-sheet')&&(stacks.length===0||stacks.every(x=>x.dataset.psSheet==='1'));
  if(ready||main.querySelector('.ps-sheet-empty'))requestAnimationFrame(()=>requestAnimationFrame(showPlayer));
 }
 if(document.documentElement.classList.contains('pptf-live-prep')){
  const ready=main.dataset.ccSimpleLive==='1'||!!main.querySelector('[data-lcc-board],.cc-live-two');
  if(ready)requestAnimationFrame(()=>requestAnimationFrame(showGmLive));
 }
}
window.addEventListener('pointerdown',e=>{const sheet=e.target?.closest?.('#app .nav [data-tab="sheet"]'),live=e.target?.closest?.('#app .nav [data-tab="gm"]');if(sheet&&!isGM())prepPlayer();if(live&&isGM())prepGmLive()},true);
new MutationObserver(checkTransitions).observe(APP,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-ps-sheet','data-cc-simple-live']});
if(playerSheetRequested()){prepPlayer();checkTransitions()}if(gmLiveRequested()){prepGmLive();checkTransitions()}

S.channel('pptf-party').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{if(open&&!busy)render()}).subscribe();
window.__catlakPartyPlayerTransition={open:render,close:release};
})();