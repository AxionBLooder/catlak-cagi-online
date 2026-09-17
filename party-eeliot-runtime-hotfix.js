(function(){
'use strict';
if(window.__catlakPartyRuntimeStableV2)return;
window.__catlakPartyRuntimeStableV2=true;
const APP=document.querySelector('#app');
const S=window.__catlakSupabase;
if(!APP||!S)return;

const PKEY='cc_party_member',BKEY='cc_battle_member';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const txt=e=>String(e?.textContent||'').trim();
const norm=x=>String(x||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const hasRole=()=>!!txt(APP.querySelector('.role'));
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
const statActive=()=>{
  try{if(window.__catlakStatWorkshopRouteFix?.active?.())return true}catch(_){ }
  const main=APP.querySelector('main');
  return !!(main?.querySelector('.cux-workshop,[data-cux-editor]')||main?.dataset?.gm2Route==='stats'||APP.querySelector('.nav [data-cc-stats-tab].on'));
};

let managerOpen=false,partyOpen=false,busy=false,eeliotBusy=false,eeliotReady=false,queued=false;
let playerAccessAt=0,playerParty=false,playerBattle=false,owned=[];

const PROFILE={
  title:'Çatlak Dikişçisi',subtitle:'Seviye 3 • Destek / Kontrol',race:'İnsan Kökenli Çatlak Yolcusu',class_name:'Çatlak Dikişçisi',role:'Destek • Kontrol • Acil Müdahale',
  summary:'Çatlak enerjisini hisseden, küçük yarıkları bastırabilen ve Wakfu bağlarıyla takım arkadaşlarını koruyan oynanabilir yardımcı karakter.',
  appearance:'İnce yapılı ve çevik; koyu lacivert yolcu ceketi, deri kemerler ve soluk turkuaz dikiş-rünleri taşır.',
  personality:'Sakin, gözlemci ve ölçülü. Gruba bağlandığında özellikle yaralı ve savunmasız kişileri korur.',
  history:'Çocukken bir yarılma olayından sağ kurtuldu. O günden sonra çatlakların titreşimini duymaya başladı.',
  combat_style:'Ön safta kalmaz; hedefleri işaretler, müttefikleri destekler ve kritik anda iyileştirir.',
  weakness:'Düşük fiziksel güç ve orta AC nedeniyle yakın dövüş baskısına karşı zayıftır.',
  traits:['Çatlak Sezgisi','Wakfu Bağı','Mühürleme','Kırık İşaret','Acil Müdahale']
};
const INITIAL_STATS={STR:8,DEX:14,CON:13,INT:16,WIS:15,CHA:10};

if(!document.querySelector('#prh-style')){
 const st=document.createElement('style');st.id='prh-style';st.textContent=`
 #app .prh-shell{max-width:1450px;margin:0 auto}.prh-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}.prh-card{border:1px solid var(--line);border-radius:15px;padding:14px;background:#081522}.prh-card.party{border-color:#716039}.prh-card.battle{box-shadow:inset -3px 0 #8a4651}.prh-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.prh-flags,.prh-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.prh-flag{border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:.7rem;color:var(--muted)}.prh-flag.on{color:#cde9a8;border-color:#55764c}.prh-flag.war{color:#ffc0c8;border-color:#75424b}.prh-eeliot{border-color:#65558c;background:linear-gradient(135deg,#101a27,#1b1425)}.prh-note{margin-top:9px;font-size:.8rem;color:var(--muted);line-height:1.45}.prh-status{border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:.7rem}.prh-top{background:linear-gradient(135deg,#10283b,#0b1723 58%,#21172a)!important}.prh-party-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.prh-party-member{border:1px solid var(--line);border-radius:14px;padding:13px;background:#08131e}.prh-hidden{display:none!important}`;document.head.appendChild(st)
}

async function getChars(){
 const r=await S.from('catlak_characters').select('id,name,species_name,background_name,class_name,level,hp_current,hp_max,base_ac,base_speed,base_stats,data,owner_id,play_status,created_at').in('play_status',['prepared','active']).order('created_at',{ascending:true});
 if(r.error)throw r.error;return r.data||[];
}
async function patchData(c,patch){
 const current=c.data||{};let changed=false;const next={...current};
 for(const [k,v] of Object.entries(patch)){if(JSON.stringify(current[k])!==JSON.stringify(v)){next[k]=v;changed=true}}
 if(!changed)return current;
 const r=await S.from('catlak_characters').update({data:next}).eq('id',c.id).select('id');if(r.error)throw r.error;return next;
}

async function ensureEeliot(force=false){
 if(!isGM()||eeliotBusy||statActive()||(!force&&eeliotReady))return null;
 eeliotBusy=true;
 try{
  let q=await S.from('catlak_characters').select('*').ilike('name','Eeliot').in('play_status',['prepared','active']).limit(1).maybeSingle();if(q.error)throw q.error;let c=q.data;
  if(!c){
   const [sp,bg,cl]=await Promise.all([
    S.from('catlak_species').select('name,sort_order').order('sort_order',{ascending:true}).limit(50),
    S.from('catlak_backgrounds').select('name,sort_order').order('sort_order',{ascending:true}).limit(50),
    S.from('catlak_classes').select('name,sort_order').order('sort_order',{ascending:true}).limit(50)
   ]);for(const r of [sp,bg,cl])if(r.error)throw r.error;
   const pick=(rows,names)=>{for(const n of names){const f=(rows||[]).find(x=>norm(x.name).includes(norm(n)));if(f)return f.name}return rows?.[0]?.name||''};
   const species=pick(sp.data,['İnsan','Human','Elf']),background=pick(bg.data,['Bilgin','Araştırmacı','Gezgin','Sage']),klass=pick(cl.data,['Büyücü','Wizard','Mage','Warlock']);
   if(!species||!background||!klass)throw new Error('Eeliot için temel ırk / arka plan / sınıf bulunamadı.');
   const cr=await S.rpc('catlak_create_prepared_character',{p_name:'Eeliot',p_species:species,p_background:background,p_class:klass,p_stats:INITIAL_STATS,p_special_path:null});if(cr.error)throw cr.error;
   const id=cr.data;if(!id)throw new Error('Eeliot oluşturuldu fakat kimliği alınamadı.');
   await S.rpc('catlak_set_character_level',{p_character_id:id,p_level:3});
   await S.rpc('catlak_gm_update_character_sheet',{p_character_id:id,p_stats:INITIAL_STATS,p_hp_current:21,p_hp_max:21,p_ac:13,p_speed:30,p_level:3});
   q=await S.from('catlak_characters').select('*').eq('id',id).maybeSingle();if(q.error)throw q.error;c=q.data;
   toast('Eeliot kalıcı hazır karakter olarak oluşturuldu.');
  }
  if(c){
   await patchData(c,{cc_role:'Çatlak Dikişçisi',cc_companion:true,cc_profile:PROFILE,[PKEY]:c.data?.[PKEY]===true,[BKEY]:c.data?.[BKEY]===true});
   eeliotReady=true;return c.id;
  }
  return null;
 }catch(e){console.error('PRH EELIOT',e);toast('Eeliot kontrolü başarısız: '+(e?.message||String(e)));return null}
 finally{eeliotBusy=false}
}

async function refreshPlayerAccess(force=false){
 if(isGM()||!hasRole()||statActive())return;
 if(!force&&Date.now()-playerAccessAt<5000)return;
 playerAccessAt=Date.now();
 try{
  const gs=await S.auth.getSession();const uid=gs.data?.session?.user?.id;if(!uid){owned=[];playerParty=false;playerBattle=false;return}
  const r=await S.from('catlak_characters').select('id,name,data,owner_id,play_status').eq('owner_id',uid).eq('play_status','active');if(r.error)throw r.error;
  owned=r.data||[];playerParty=owned.some(c=>c.data?.[PKEY]===true);playerBattle=owned.some(c=>c.data?.[BKEY]===true);
 }catch(e){console.warn('PRH access',e)}
}

function ensureNav(){
 if(statActive())return;
 const nav=APP.querySelector('.nav');if(!nav)return;
 if(isGM()){
  nav.querySelector('[data-cpr-manager]')?.remove();
  let b=nav.querySelector('[data-prh-manager]');if(!b){b=document.createElement('button');b.type='button';b.dataset.prhManager='1';b.textContent='Parti Yönetimi';const gm=nav.querySelector('[data-gmt-open]');gm?gm.after(b):nav.appendChild(b)}b.classList.toggle('on',managerOpen);
  nav.querySelector('[data-prh-party]')?.remove();
 }else{
  nav.querySelector('[data-prh-manager]')?.remove();
  let p=nav.querySelector('[data-prh-party]');
  if(playerParty){if(!p){p=document.createElement('button');p.type='button';p.dataset.prhParty='1';p.textContent='◆ Parti Odası';const battle=nav.querySelector('[data-ccr-battle]');battle?battle.before(p):nav.appendChild(p)}p.classList.toggle('on',partyOpen)}else p?.remove();
  const battle=nav.querySelector('[data-ccr-battle]');if(battle)battle.classList.toggle('prh-hidden',!playerBattle);
 }
}

function closeViews(){managerOpen=false;partyOpen=false;window.__catlakPartyRoomOwnsMain=false;ensureNav()}
function claimManager(){
 if(!isGM())return false;
 // Parti Yönetimi açılırken GM Merkezi ve diğer özel odaların sahipliğini bırak.
 window.__catlakGmCenterSelectedRoute='';
 window.__catlakGmHubV2Test?.release?.();
 window.__catlakGmTools?.close?.();
 window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.();
 window.__catlakCampaignStateTest?.close?.();
 window.__catlakBattleRoomOpen=false;
 managerOpen=true;partyOpen=false;window.__catlakPartyRoomOwnsMain=true;
 const nav=APP.querySelector('.nav');nav?.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));
 ensureNav();return true;
}
function openManager(){if(!claimManager())return false;renderManager();return true}

function card(c){
 const d=c.data||{},p=d[PKEY]===true,b=d[BKEY]===true,e=norm(c.name)==='eeliot';
 return `<article class="prh-card ${p?'party':''} ${b?'battle':''} ${e?'prh-eeliot':''}" data-prh-char="${esc(c.id)}"><div class="prh-head"><div><div class="eyebrow">${e?'OYNANABİLİR YARDIMCI':c.owner_id?'OYUNCUYA BAĞLI':'HAZIR KARAKTER'}</div><h2>${esc(c.name)}</h2><div class="muted">${esc(c.species_name||'')} • ${esc(d.cc_role||c.class_name||'')} • Seviye ${Number(c.level||1)}</div></div><span class="prh-status">${c.play_status==='active'?'CANLI':'HAZIR'}</span></div><div class="prh-flags"><span class="prh-flag ${p?'on':''}">${p?'✓ PARTİDE':'PARTİ DIŞI'}</span><span class="prh-flag ${b?'war':''}">${b?'⚔ SAVAŞ ODASINDA':'SAVAŞ DIŞI'}</span></div><div class="muted">HP ${Number(c.hp_current||0)}/${Number(c.hp_max||0)} • AC ${Number(c.base_ac||0)} • Hız ${Number(c.base_speed||0)}</div>${e?`<div class="prh-note"><b>Çatlak Dikişçisi</b><br>${esc(PROFILE.summary)}<br><br><b>Yetenekler:</b> ${PROFILE.traits.map(esc).join(' • ')}</div>`:''}<div class="prh-actions"><button type="button" class="${p?'danger':'primary'}" data-prh-set-party="${esc(c.id)}" data-v="${p?'0':'1'}">${p?'Partiden Çıkar':'Partiye Al'}</button><button type="button" class="${b?'danger':'primary'}" data-prh-set-battle="${esc(c.id)}" data-v="${b?'0':'1'}">${b?'Savaştan Çıkar':'Savaş Odasına Al'}</button>${!c.owner_id?`<button type="button" data-prh-invite="${esc(c.id)}" data-name="${esc(c.name)}">Oyuncuya Davet</button>`:''}</div></article>`;
}

async function renderManager(){
 if(!managerOpen||!isGM()||busy||statActive())return;busy=true;
 try{
  await ensureEeliot(false);const chars=await getChars();if(!managerOpen||statActive())return;const main=APP.querySelector('main');if(!main)return;
  main.innerHTML=`<div class="prh-shell" data-prh-page><section class="card prh-top"><div class="eyebrow">GM • PARTİ & SAVAŞ KATILIMI</div><h1>Parti Yönetimi</h1><p class="muted">Karakter statlarına dokunmadan yalnız parti ve savaş katılımını yönetir.</p><div class="actions"><button type="button" class="primary" data-prh-ensure-eeliot>Eeliot'u Kontrol Et</button></div></section><section class="card"><div class="section-title"><div><div class="eyebrow">KATILIMCI HAVUZU</div><h2>${chars.length} Karakter</h2></div></div><div class="prh-grid">${chars.map(card).join('')}</div></section></div>`;
  const nav=APP.querySelector('.nav');nav?.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));nav?.querySelector('[data-prh-manager]')?.classList.add('on');
 }catch(e){console.error('PRH RENDER',e);toast('Parti Yönetimi yüklenemedi: '+(e?.message||String(e)))}finally{busy=false}
}

async function renderParty(){
 if(!partyOpen||isGM()||busy||statActive())return;busy=true;
 try{
  await refreshPlayerAccess(true);if(!playerParty){partyOpen=false;ensureNav();return}
  const chars=(await getChars()).filter(c=>c.data?.[PKEY]===true),mine=new Set(owned.map(c=>String(c.id))),main=APP.querySelector('main');if(!main)return;
  main.innerHTML=`<div class="prh-shell" data-prh-party-page><section class="card prh-top"><div class="eyebrow">◆ PARTİ ODASI</div><h1>Aktif Parti</h1><p class="muted">GM'nin seçtiği parti üyeleri.</p></section><section class="card"><div class="prh-party-grid">${chars.map(c=>`<article class="prh-party-member ${norm(c.name)==='eeliot'?'prh-eeliot':''}"><div class="eyebrow">${mine.has(String(c.id))?'SENİN KARAKTERİN':c.data?.cc_companion?'YARDIMCI KARAKTER':'PARTİ ÜYESİ'}</div><h3>${esc(c.name)}</h3><div class="muted">${esc(c.data?.cc_role||c.class_name||'')} • Seviye ${Number(c.level||1)}</div><div class="prh-flags"><span class="prh-flag on">HP ${Number(c.hp_current||0)}/${Number(c.hp_max||0)}</span><span class="prh-flag">AC ${Number(c.base_ac||0)}</span></div></article>`).join('')}</div></section></div>`;
  const nav=APP.querySelector('.nav');nav?.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));nav?.querySelector('[data-prh-party]')?.classList.add('on');
 }catch(e){console.error('PRH PARTY',e)}finally{busy=false}
}

async function setFlag(id,key,value){
 // İşlem boyunca Parti Yönetimi ana ekranın sahibi olarak kalır.
 if(isGM()&&!managerOpen)claimManager();
 const q=await S.from('catlak_characters').select('id,name,data').eq('id',id).maybeSingle();if(q.error)throw q.error;if(!q.data)throw new Error('Karakter bulunamadı');
 await patchData(q.data,{[key]:value});
 if(key===BKEY){
  try{
   const st=await S.from('catlak_combat_state').select('*').eq('id',1).maybeSingle();
   if(st.data?.active){
    const cr=await S.from('catlak_combatants').select('id,character_id').eq('character_id',id).maybeSingle();
    if(value&&!cr.data)await S.rpc('catlak_gm_combat_add_character',{p_character_id:id,p_initiative:null});
    if(!value&&cr.data)await S.rpc('catlak_gm_combat_remove',{p_combatant_id:cr.data.id});
   }
  }catch(e){console.warn('PRH combat sync',e)}
 }
 toast(value?(key===PKEY?'Karakter partiye alındı.':'Karakter savaş odasına alındı.'):(key===PKEY?'Karakter partiden çıkarıldı.':'Karakter savaş odasından çıkarıldı.'));
 if(managerOpen)await renderManager();
}
async function invite(id,name){const r=await S.rpc('catlak_generate_character_claim',{p_character_id:id});if(r.error)throw r.error;const link='https://axionblooder.github.io/catlak-cagi-online/?join='+encodeURIComponent(r.data);try{await navigator.clipboard.writeText(link)}catch(_){}prompt(`${name||'Karakter'} için oyuncu davet linki:`,link)}

APP.addEventListener('click',e=>{
 const mgr=e.target.closest?.('[data-prh-manager]');if(mgr){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openManager();return}
 const room=e.target.closest?.('[data-prh-party]');if(room){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();partyOpen=true;managerOpen=false;window.__catlakPartyRoomOwnsMain=true;renderParty();return}
 // GM Merkezi iç rotaları veya başka üst menü odaları açılırken Parti Yönetimi sahipliğini bırak.
 const foreign=e.target.closest?.('[data-gm2-route],[data-gmt-open],[data-gmt-sub],.nav button:not([data-prh-manager]):not([data-prh-party])');
 if(foreign){closeViews();return}
 const p=e.target.closest?.('[data-prh-set-party]');if(p){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setFlag(p.dataset.prhSetParty,PKEY,p.dataset.v==='1').catch(x=>toast(x.message||String(x)));return}
 const b=e.target.closest?.('[data-prh-set-battle]');if(b){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setFlag(b.dataset.prhSetBattle,BKEY,b.dataset.v==='1').catch(x=>toast(x.message||String(x)));return}
 const i=e.target.closest?.('[data-prh-invite]');if(i){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();invite(i.dataset.prhInvite,i.dataset.name).catch(x=>toast(x.message||String(x)));return}
 if(e.target.closest?.('[data-prh-ensure-eeliot]')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();eeliotReady=false;ensureEeliot(true).then(()=>renderManager());}
},true);

function maintain(){
 queued=false;if(statActive())return;
 if(isGM()){ensureNav();if(!eeliotReady)ensureEeliot(false);if(managerOpen&&!APP.querySelector('[data-prh-page]'))renderManager()}
 else if(hasRole()){refreshPlayerAccess(false).then(()=>{ensureNav();if(partyOpen&&!APP.querySelector('[data-prh-party-page]'))renderParty()})}
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(maintain)}
new MutationObserver(records=>{
 if(statActive())return;
 let relevant=false;
 for(const r of records){for(const n of r.addedNodes){if(n.nodeType===1&&(n.matches?.('.nav,.role,main')||n.querySelector?.('.nav,.role')))relevant=true}}
 if(relevant)schedule();
}).observe(APP,{childList:true,subtree:true});

setTimeout(maintain,350);setTimeout(maintain,1400);
window.__catlakPartyEeliotHotfix={render:renderManager,renderParty,ensureEeliot,ensureNav,open:openManager,close:closeViews,isOpen:()=>managerOpen||partyOpen,statSafe:true};
})();