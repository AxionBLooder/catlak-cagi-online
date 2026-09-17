(function(){
'use strict';
if(window.__catlakPartyManagerV4)return;
window.__catlakPartyManagerV4=true;
const APP=document.querySelector('#app');
const S=window.__catlakSupabase;
if(!APP||!S)return;
const PKEY='cc_party_member',BKEY='cc_battle_member';
const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3500)};
let open=false,busy=false,queued=false;

if(!document.querySelector('#pm3-style')){const st=document.createElement('style');st.id='pm3-style';st.textContent=`
#app .pm3-shell{max-width:1450px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
#app .pm3-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
#app .pm3-card{border:1px solid var(--line);border-radius:14px;padding:14px;background:#081522}
#app .pm3-card.party{border-color:#6c5b35;box-shadow:inset 3px 0 #cba65a}
#app .pm3-card.battle{box-shadow:inset -3px 0 #8a4651}
#app .pm3-card h3{margin:.2em 0}.pm3-flags,.pm3-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
#app .pm3-flag{border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:.7rem;color:var(--muted)}
#app .pm3-flag.on{color:#cce9aa;border-color:#55764c}.pm3-flag.war{color:#ffc0c8;border-color:#75424b}
#app .pm3-actions button{flex:1 1 125px}
#app .pm3-top{background:linear-gradient(135deg,#10283a,#0b1724 60%,#21172a)!important}
`;document.head.appendChild(st)}

async function chars(){const r=await S.from('catlak_characters').select('id,name,species_name,class_name,level,hp_current,hp_max,base_ac,base_speed,data,owner_id,play_status,created_at').in('play_status',['prepared','active']).order('created_at',{ascending:true});if(r.error)throw r.error;return r.data||[]}
async function latest(id){const r=await S.from('catlak_characters').select('id,name,data,play_status').eq('id',id).maybeSingle();if(r.error)throw r.error;if(!r.data)throw new Error('Karakter bulunamadı.');return r.data}
async function setFlag(id,key,value){const c=await latest(id);const data={...(c.data||{}),[key]:!!value};const u=await S.from('catlak_characters').update({data}).eq('id',id).select('id');if(u.error)throw u.error;
 if(key===BKEY){try{const st=await S.from('catlak_combat_state').select('*').eq('id',1).maybeSingle();if(st.data?.active){const cr=await S.from('catlak_combatants').select('id,character_id').eq('character_id',id).maybeSingle();if(value&&!cr.data&&c.play_status==='active')await S.rpc('catlak_gm_combat_add_character',{p_character_id:id,p_initiative:null});if(!value&&cr.data)await S.rpc('catlak_gm_combat_remove',{p_combatant_id:cr.data.id})}}catch(e){console.warn('PM3 combat sync',e)}}
 toast(value?(key===PKEY?'Karakter partiye alındı.':'Karakter savaş odasına alındı.'):(key===PKEY?'Karakter partiden çıkarıldı.':'Karakter savaş odasından çıkarıldı.'));await render();}

function ensureButtons(){
 if(!isGM())return;
 const nav=APP.querySelector('.nav');
 if(nav){
  nav.querySelectorAll('[data-cpr-manager],[data-prh-manager]').forEach(x=>x.remove());
  let b=nav.querySelector('[data-pm3-open]');
  if(!b){b=document.createElement('button');b.type='button';b.dataset.pm3Open='1';b.textContent='Parti Yönetimi'}
  const live=nav.querySelector('[data-tab="gm"]');
  if(live){if(live.nextElementSibling!==b)live.insertAdjacentElement('afterend',b)}
  else if(b.parentElement!==nav)nav.appendChild(b);
 }
 const bar=APP.querySelector('[data-gm2-centerbar]');
 if(bar&&!bar.querySelector('[data-pm3-center]')){const b=document.createElement('button');b.type='button';b.dataset.pm3Center='1';b.textContent='Parti Yönetimi';bar.appendChild(b)}
}

function cleanLiveTableIntro(){
 if(!isGM())return;
 const live=APP.querySelector('.nav [data-tab="gm"].on');
 if(!live)return;
 APP.querySelectorAll('main section.card').forEach(sec=>{
  if(txt(sec.querySelector('.eyebrow'))!=='CANLI OYUN MASASI')return;
  sec.querySelectorAll('p.muted,p').forEach(p=>{
   if(txt(p).includes('Solda oyuncuların attığı zarlar'))p.remove();
  });
 });
}

function card(c){const d=c.data||{},p=d[PKEY]===true,b=d[BKEY]===true;return `<article class="pm3-card ${p?'party':''} ${b?'battle':''}"><div class="eyebrow">${c.owner_id?'OYUNCUYA BAĞLI':d.cc_companion?'OYNANABİLİR YARDIMCI':'HAZIR KARAKTER'}</div><h3>${esc(c.name)}</h3><div class="muted">${esc(c.species_name||'')} • ${esc(d.cc_role||c.class_name||'')} • Seviye ${Number(c.level||1)}</div><div class="pm3-flags"><span class="pm3-flag ${p?'on':''}">${p?'✓ PARTİDE':'PARTİ DIŞI'}</span><span class="pm3-flag ${b?'war':''}">${b?'⚔ SAVAŞ ODASINDA':'SAVAŞ DIŞI'}</span></div><div class="muted" style="margin-top:8px">HP ${Number(c.hp_current||0)}/${Number(c.hp_max||0)} • AC ${Number(c.base_ac||0)} • Hız ${Number(c.base_speed||0)}</div><div class="pm3-actions"><button type="button" class="${p?'danger':'primary'}" data-pm3-party="${esc(c.id)}" data-v="${p?'0':'1'}">${p?'Partiden Çıkar':'Partiye Al'}</button><button type="button" class="${b?'danger':'primary'}" data-pm3-battle="${esc(c.id)}" data-v="${b?'0':'1'}">${b?'Savaştan Çıkar':'Savaş Odasına Al'}</button>${!c.owner_id?`<button type="button" data-pm3-invite="${esc(c.id)}" data-name="${esc(c.name)}">Oyuncuya Davet</button>`:''}</div></article>`}

async function render(){if(!open||!isGM()||busy)return;busy=true;try{const list=await chars();if(!open)return;const main=APP.querySelector('main');if(!main)return;main.innerHTML=`<div class="pm3-shell" data-pm3-page><section class="card pm3-top"><div class="eyebrow">GM • PARTİ & SAVAŞ KATILIMI</div><h1>Parti Yönetimi</h1><p class="muted">Buradaki seçimler karakter statlarını değiştirmez. Yalnız parti ve savaş odası katılımını yönetir.</p></section><section class="card"><div class="section-title"><div><div class="eyebrow">KATILIMCI HAVUZU</div><h2>${list.length} Karakter</h2></div></div><div class="pm3-grid">${list.map(card).join('')}</div></section></div>`;const nav=APP.querySelector('.nav');nav?.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));nav?.querySelector('[data-pm3-open]')?.classList.add('on');APP.querySelector('[data-pm3-center]')?.classList.add('on')}catch(e){console.error('PM3 render',e);toast('Parti Yönetimi yüklenemedi: '+(e?.message||String(e)))}finally{busy=false}}
function openManager(){if(!isGM())return;open=true;window.__catlakGmCenterSelectedRoute='party-manager-v4';window.__catlakGmTools?.close?.();window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.();window.__catlakBattleRoomOpen=false;render()}
function closeManager(){open=false}
async function invite(id,name){const r=await S.rpc('catlak_generate_character_claim',{p_character_id:id});if(r.error)throw r.error;const link='https://axionblooder.github.io/catlak-cagi-online/?join='+encodeURIComponent(r.data);try{await navigator.clipboard.writeText(link)}catch(_){}prompt(`${name||'Karakter'} için oyuncu davet linki:`,link)}

function openFromEvent(e){const op=e.target?.closest?.('#app [data-pm3-open],#app [data-pm3-center]');if(!op)return false;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openManager();return true}
window.addEventListener('pointerdown',openFromEvent,true);
window.addEventListener('click',e=>{
 if(openFromEvent(e))return;
 const p=e.target.closest?.('#app [data-pm3-party]');if(p){e.preventDefault();e.stopImmediatePropagation();setFlag(p.dataset.pm3Party,PKEY,p.dataset.v==='1').catch(x=>toast(x.message||String(x)));return}
 const b=e.target.closest?.('#app [data-pm3-battle]');if(b){e.preventDefault();e.stopImmediatePropagation();setFlag(b.dataset.pm3Battle,BKEY,b.dataset.v==='1').catch(x=>toast(x.message||String(x)));return}
 const i=e.target.closest?.('#app [data-pm3-invite]');if(i){e.preventDefault();e.stopImmediatePropagation();invite(i.dataset.pm3Invite,i.dataset.name).catch(x=>toast(x.message||String(x)));return}
 if(e.target.closest?.('#app .nav button:not([data-pm3-open]),#app [data-gm2-route],#app [data-gmt-sub]'))closeManager();
},true);
new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensureButtons();cleanLiveTableIntro();if(open&&!APP.querySelector('[data-pm3-page]'))render()})}).observe(APP,{childList:true,subtree:true});
S.channel('pm3-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{ensureButtons();cleanLiveTableIntro();if(open)render()}).subscribe();
setTimeout(()=>{ensureButtons();cleanLiveTableIntro()},80);setTimeout(()=>{ensureButtons();cleanLiveTableIntro()},350);setTimeout(()=>{ensureButtons();cleanLiveTableIntro()},1200);
window.__catlakPartyManager={open:openManager,close:closeManager,render,ensureButtons,cleanLiveTableIntro};
})();
