(function(){
'use strict';
const APP=document.querySelector('#app');
if(!APP)return;
const S=window.__catlakSupabase;
if(!S){console.error('PRH: Supabase hazır değil');return}
const PKEY='cc_party_member',BKEY='cc_battle_member';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const txt=e=>String(e?.textContent||'').trim();
const norm=x=>String(x||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),5000)};
let managerOpen=false,busy=false,eeliotBusy=false,lastEnsure=0;
const PROFILE={title:'Çatlak Dikişçisi',subtitle:'Seviye 3 • Destek / Kontrol',race:'İnsan Kökenli Çatlak Yolcusu',class_name:'Çatlak Dikişçisi',role:'Destek • Kontrol • Acil Müdahale',summary:'Çatlak enerjisini hisseden, küçük yarıkları bastırabilen ve Wakfu bağlarıyla takım arkadaşlarını koruyan oynanabilir yardımcı karakter.',appearance:'İnce yapılı, çevik; koyu lacivert yolcu ceketi, deri kemerler ve soluk turkuaz dikiş-rünleri taşır. Çatlak enerjisi yakındayken gri-mavi gözlerinde parlak halkalar belirir.',personality:'Sakin, gözlemci ve ölçülü. Gruba bağlandığında özellikle yaralı ve savunmasız kişileri korur.',history:'Çocukken bir yarılma olayından sağ kurtuldu. O günden sonra çatlakların titreşimini duymaya başladı; yıllarca mühür ustaları ve harabelerden topladığı bilgilerle bu yeteneğini kontrol etmeyi öğrendi.',combat_style:'Ön safta kalmaz; hedefleri işaretler, müttefikleri destekler ve kritik anda iyileştirir.',weakness:'Düşük fiziksel güç ve orta AC nedeniyle yakın dövüş baskısına karşı zayıftır.',traits:['Çatlak Sezgisi','Wakfu Bağı','Mühürleme','Kırık İşaret','Acil Müdahale']};
const STATS={STR:8,DEX:14,CON:13,INT:16,WIS:15,CHA:10};
if(!document.querySelector('#prh-style')){const st=document.createElement('style');st.id='prh-style';st.textContent=`#app .prh-shell{max-width:1450px;margin:0 auto}.prh-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}.prh-card{border:1px solid var(--line);border-radius:15px;padding:14px;background:#081522}.prh-card.party{border-color:#716039}.prh-card.battle{box-shadow:inset -3px 0 #8a4651}.prh-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.prh-flags,.prh-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.prh-flag{border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:.7rem;color:var(--muted)}.prh-flag.on{color:#cde9a8;border-color:#55764c}.prh-flag.war{color:#ffc0c8;border-color:#75424b}.prh-eeliot{border-color:#65558c;background:linear-gradient(135deg,#101a27,#1b1425)}.prh-eeliot-note{margin-top:9px;font-size:.8rem;color:var(--muted);line-height:1.45}.prh-status{border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:.7rem}.prh-top{background:linear-gradient(135deg,#10283b,#0b1723 58%,#21172a)!important}.prh-top .actions{margin-top:12px}`;document.head.appendChild(st)}
async function getChars(){const r=await S.from('catlak_characters').select('id,name,species_name,background_name,class_name,level,hp_current,hp_max,base_ac,base_speed,base_stats,data,owner_id,play_status,created_at').in('play_status',['prepared','active']).order('created_at',{ascending:true});if(r.error)throw r.error;return r.data||[]}
async function writeData(c,patch){const data={...(c.data||{}),...patch};const r=await S.from('catlak_characters').update({data}).eq('id',c.id).select('id');if(r.error)throw r.error;return data}
async function ensureEeliot(force=false){
 if(!isGM()||eeliotBusy||(!force&&Date.now()-lastEnsure<10000))return null;
 eeliotBusy=true;lastEnsure=Date.now();
 try{
  let q=await S.from('catlak_characters').select('*').ilike('name','Eeliot').in('play_status',['prepared','active']).limit(1).maybeSingle();if(q.error)throw q.error;let c=q.data;
  if(!c){
   const [sp,bg,cl]=await Promise.all([S.from('catlak_species').select('name,sort_order').order('sort_order',{ascending:true}).limit(50),S.from('catlak_backgrounds').select('name,sort_order').order('sort_order',{ascending:true}).limit(50),S.from('catlak_classes').select('name,sort_order').order('sort_order',{ascending:true}).limit(50)]);for(const r of [sp,bg,cl])if(r.error)throw r.error;
   const pick=(rows,names)=>{for(const n of names){const f=(rows||[]).find(x=>norm(x.name).includes(norm(n)));if(f)return f.name}return rows?.[0]?.name||''};
   const species=pick(sp.data,['İnsan','Human','Elf']),background=pick(bg.data,['Bilgin','Araştırmacı','Gezgin','Sage']),klass=pick(cl.data,['Büyücü','Wizard','Mage','Warlock']);
   if(!species||!background||!klass)throw new Error('Eeliot için temel ırk / arka plan / sınıf bulunamadı.');
   const cr=await S.rpc('catlak_create_prepared_character',{p_name:'Eeliot',p_species:species,p_background:background,p_class:klass,p_stats:STATS,p_special_path:null});if(cr.error)throw cr.error;
   const id=cr.data;if(!id)throw new Error('Eeliot oluşturuldu fakat kimliği alınamadı.');
   const lv=await S.rpc('catlak_set_character_level',{p_character_id:id,p_level:3});if(lv.error)console.warn('PRH level',lv.error);
   const sh=await S.rpc('catlak_gm_update_character_sheet',{p_character_id:id,p_stats:STATS,p_hp_current:21,p_hp_max:21,p_ac:13,p_speed:30,p_level:3});if(sh.error)console.warn('PRH sheet',sh.error);
   q=await S.from('catlak_characters').select('*').eq('id',id).maybeSingle();if(q.error)throw q.error;c=q.data;
   toast('Eeliot kalıcı hazır karakter olarak oluşturuldu.');
  }
  if(c){await writeData(c,{cc_role:'Çatlak Dikişçisi',cc_companion:true,cc_profile:PROFILE,[PKEY]:c.data?.[PKEY]===true,[BKEY]:c.data?.[BKEY]===true});return c.id}
  return null;
 }catch(e){console.error('PRH EELIOT',e);toast('Eeliot oluşturulamadı: '+(e?.message||String(e)));return null}finally{eeliotBusy=false}
}
function ensureNav(){
 const nav=APP.querySelector('.nav');if(!nav)return;
 if(isGM()){
  const old=nav.querySelector('[data-cpr-manager]');if(old)old.remove();
  let b=nav.querySelector('[data-prh-manager]');if(!b){b=document.createElement('button');b.type='button';b.dataset.prhManager='1';b.textContent='Parti Yönetimi';const gm=nav.querySelector('[data-gmt-open]');gm?gm.after(b):nav.appendChild(b)}b.classList.toggle('on',managerOpen);
 }else nav.querySelector('[data-prh-manager]')?.remove();
}
function card(c){const d=c.data||{},p=d[PKEY]===true,b=d[BKEY]===true,e=norm(c.name)==='eeliot';return `<article class="prh-card ${p?'party':''} ${b?'battle':''} ${e?'prh-eeliot':''}"><div class="prh-head"><div><div class="eyebrow">${e?'OYNNANABİLİR YARDIMCI':c.owner_id?'OYUNCUYA BAĞLI':'HAZIR KARAKTER'}</div><h2>${esc(c.name)}</h2><div class="muted">${esc(c.species_name||'')} • ${esc(d.cc_role||c.class_name||'')} • Seviye ${Number(c.level||1)}</div></div><span class="prh-status">${c.play_status==='active'?'CANLI':'HAZIR'}</span></div><div class="prh-flags"><span class="prh-flag ${p?'on':''}">${p?'✓ PARTİDE':'PARTİ DIŞI'}</span><span class="prh-flag ${b?'war':''}">${b?'⚔ SAVAŞ ODASINDA':'SAVAŞ DIŞI'}</span></div><div class="muted">HP ${Number(c.hp_current||0)}/${Number(c.hp_max||0)} • AC ${Number(c.base_ac||0)} • Hız ${Number(c.base_speed||0)}</div>${e?`<div class="prh-eeliot-note"><b>Çatlak Dikişçisi</b><br>${esc(PROFILE.summary)}<br><br><b>Yetenekler:</b> ${PROFILE.traits.map(esc).join(' • ')}</div>`:''}<div class="prh-actions"><button type="button" class="${p?'danger':'primary'}" data-prh-party="${esc(c.id)}" data-v="${p?'0':'1'}">${p?'Partiden Çıkar':'Partiye Al'}</button><button type="button" class="${b?'danger':'primary'}" data-prh-battle="${esc(c.id)}" data-v="${b?'0':'1'}">${b?'Savaştan Çıkar':'Savaş Odasına Al'}</button>${!c.owner_id?`<button type="button" data-prh-invite="${esc(c.id)}" data-name="${esc(c.name)}">Oyuncuya Davet</button>`:''}</div></article>`}
async function render(){if(!managerOpen||!isGM()||busy)return;busy=true;try{await ensureEeliot(true);const chars=await getChars();if(!managerOpen)return;const main=APP.querySelector('main');if(!main)return;main.innerHTML=`<div class="prh-shell" data-prh-page><section class="card prh-top"><div class="eyebrow">GM • PARTİ & SAVAŞ KATILIMI</div><h1>Parti Yönetimi</h1><p class="muted">Tüm hazır ve aktif karakterleri buradan partiye veya savaş odasına alıp çıkarabilirsin.</p><div class="actions"><button type="button" class="primary" data-prh-ensure-eeliot>Eeliot'u Kontrol Et / Kur</button></div></section><section class="card"><div class="section-title"><div><div class="eyebrow">KATILIMCI HAVUZU</div><h2>${chars.length} Karakter</h2></div></div><div class="prh-grid">${chars.map(card).join('')}</div></section></div>`;navSelect()}catch(e){console.error('PRH RENDER',e);toast('Parti Yönetimi yüklenemedi: '+(e?.message||String(e)))}finally{busy=false}}
function navSelect(){const nav=APP.querySelector('.nav');nav?.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));nav?.querySelector('[data-prh-manager]')?.classList.add('on')}
async function toggle(id,key,v){const q=await S.from('catlak_characters').select('id,name,data').eq('id',id).maybeSingle();if(q.error)throw q.error;if(!q.data)throw new Error('Karakter bulunamadı');await writeData(q.data,{[key]:v});toast(v?(key===PKEY?'Karakter partiye alındı.':'Karakter savaş odasına alındı.'):(key===PKEY?'Karakter partiden çıkarıldı.':'Karakter savaş odasından çıkarıldı.'));if(key===BKEY&&window.__catlakPartyRoster?.syncCombat)window.__catlakPartyRoster.syncCombat();await render()}
async function invite(id,name){const r=await S.rpc('catlak_generate_character_claim',{p_character_id:id});if(r.error)throw r.error;const link='https://axionblooder.github.io/catlak-cagi-online/?join='+encodeURIComponent(r.data);try{await navigator.clipboard.writeText(link)}catch(_){}prompt(`${name||'Karakter'} için oyuncu davet linki:`,link)}
APP.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-prh-manager]');if(b){e.preventDefault();e.stopImmediatePropagation();managerOpen=true;window.__catlakBattleRoomOpen=false;render();return}
 const other=e.target.closest?.('.nav button:not([data-prh-manager])');if(other)managerOpen=false;
 const p=e.target.closest?.('[data-prh-party]');if(p){e.preventDefault();e.stopImmediatePropagation();toggle(p.dataset.prhParty,PKEY,p.dataset.v==='1').catch(x=>toast(x.message||String(x)));return}
 const w=e.target.closest?.('[data-prh-battle]');if(w){e.preventDefault();e.stopImmediatePropagation();toggle(w.dataset.prhBattle,BKEY,w.dataset.v==='1').catch(x=>toast(x.message||String(x)));return}
 const i=e.target.closest?.('[data-prh-invite]');if(i){e.preventDefault();e.stopImmediatePropagation();invite(i.dataset.prhInvite,i.dataset.name).catch(x=>toast(x.message||String(x)));return}
 if(e.target.closest?.('[data-prh-ensure-eeliot]')){e.preventDefault();e.stopImmediatePropagation();ensureEeliot(true).then(()=>render());return}
},true);
let queued=false;function maintain(){queued=false;ensureNav();if(isGM()){ensureEeliot(false);if(managerOpen&&!APP.querySelector('[data-prh-page]'))render()}}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(maintain)}
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
setTimeout(maintain,300);setTimeout(maintain,1200);setTimeout(()=>ensureEeliot(true),1800);
window.__catlakPartyEeliotHotfix={render,ensureEeliot,ensureNav};
})();