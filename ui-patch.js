import{createClient}from'https://esm.sh/@supabase/supabase-js@2.115.0?bundle';

const S=createClient('https://ygbereitlhjvoqgqlwfe.supabase.co','sb_publishable_haPHSdfajhnaiHUZkVqN9Q_Yk6KrMMA',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const APP=document.querySelector('#app');
if(!APP)throw new Error('Çatlak Çağı uygulama kökü bulunamadı.');

const A=['STR','DEX','CON','INT','WIS','CHA'];
let wizardStep=1,scheduled=false,busy=false;
const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=x=>Number(x||0),md=x=>Math.floor((n(x)-10)/2),sg=x=>n(x)>=0?'+'+n(x):String(n(x));
const txt=e=>String(e?.textContent||'').trim();
const tabId=()=>APP.querySelector('.nav button.on')?.dataset.tab||'';
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const toast=x=>{let t=document.querySelector('#toast');if(!t)return;t.textContent=x;t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};

const css=`
.cc-desk-intro,.cc-live-hero{background:linear-gradient(135deg,#122a3e,#0a1523 58%,#20182d)!important;border-color:#36536e!important}.cc-desk-intro h1,.cc-live-hero h1{margin:.15em 0 .25em}.cc-summary,.cc-roll-dashboard{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:15px}.cc-mini-stat{border:1px solid var(--line);border-radius:13px;padding:12px;background:#07121f;text-align:center}.cc-mini-stat b{display:block;font-size:1.35rem;color:var(--gold)}.cc-mini-stat span{font-size:.68rem;color:var(--muted);letter-spacing:.08em}.cc-character-stack{border:1px solid #263a56;border-radius:22px;padding:10px;margin-bottom:22px;background:#050b14aa;box-shadow:0 20px 60px #0006}.cc-character-stack>.card:last-child{margin-bottom:0}.cc-character-label{display:flex;align-items:center;justify-content:space-between;padding:5px 7px 12px;color:var(--muted);font-size:.72rem;letter-spacing:.12em;font-weight:900}.cc-character-label span:last-child{color:var(--cyan)}.cc-roll-panel{border-color:#31516e!important}.cc-wizard{margin:12px 0 18px}.cc-stepper{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.cc-step{padding:10px 8px!important;text-align:left!important;background:#091522!important}.cc-step small{display:block;color:var(--muted);font-size:.65rem}.cc-step.on{border-color:var(--cyan)!important;background:#10263a!important;box-shadow:0 0 0 2px #69d7ff18}.cc-step.done{border-color:#3c735e!important}.cc-wizard-actions{display:flex;justify-content:space-between;gap:10px;margin-top:14px}.cc-wizard-note{margin:12px 0;color:var(--muted);font-size:.82rem}.cc-hidden-step{display:none!important}.cc-preview-dim{display:none!important}.cc-live-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:14px}.cc-live-char{border-color:#34516d!important}.cc-live-char .stats{grid-template-columns:repeat(3,1fr)}.cc-live-char .stat{cursor:pointer}.cc-char-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.cc-status{font-size:.68rem;border:1px solid #32644f;color:var(--green);border-radius:999px;padding:4px 8px}.cc-prepared{border-color:#655637!important}.cc-prepared-actions{display:flex;gap:8px;flex-wrap:wrap}.cc-roll-line{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:10px;background:#07101d}.cc-roll-line.cc-critical{border-color:#806934;box-shadow:inset 3px 0 #ffd479}.cc-roll-line.cc-fumble{border-color:#713b49;box-shadow:inset 3px 0 #ff7f93}.cc-roll-line .die{width:44px;height:44px}.cc-roll-actions{display:flex;gap:6px;align-items:center}.cc-roll-actions input{min-width:220px}.cc-danger{border-color:#713b49!important;color:#ffb7c2!important}.cc-empty{padding:28px;border:1px dashed var(--line);border-radius:14px;text-align:center;color:var(--muted)}.cc-flow{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.cc-flow b{color:var(--cyan)}
@media(max-width:760px){.cc-summary,.cc-roll-dashboard{grid-template-columns:repeat(2,1fr)}.cc-stepper{grid-template-columns:repeat(2,1fr)}.cc-character-stack{padding:6px;border-radius:16px}.cc-roll-line{grid-template-columns:48px 1fr}.cc-roll-actions{grid-column:1/-1;flex-wrap:wrap}.cc-roll-actions input{min-width:0;flex:1}.cc-live-grid{grid-template-columns:1fr}}
`;
if(!document.querySelector('#cc-ui-patch-style')){const s=document.createElement('style');s.id='cc-ui-patch-style';s.textContent=css;document.head.appendChild(s)}

function fixNav(){
  const nav=APP.querySelector('.nav');if(!nav)return;
  if(isGM()){
    const labels={gm:'Canlı Oyun Masası',builder:'Karakter Oluşturucu',characters:'Hazır Karakterler',races:'Irk Atölyesi',items:'Eşya Atölyesi',rolls:'Zar Akışı',rules:'Kaynaklar',account:'Hesap'};
    Object.entries(labels).forEach(([id,label])=>{const b=nav.querySelector(`[data-tab="${id}"]`);if(b)b.textContent=label});
    if(!nav.querySelector('[data-tab="builder"]')){
      const chars=nav.querySelector('[data-tab="characters"]');if(chars){const b=document.createElement('button');b.dataset.tab='builder';b.textContent='Karakter Oluşturucu';chars.before(b)}
    }
  }else{
    const b=nav.querySelector('[data-tab="builder"]');if(b)b.remove();
    const sh=nav.querySelector('[data-tab="sheet"]');if(sh)sh.textContent='Oyuncu Masası';
  }
}

function enhancePlayerDesk(){
  if(isGM()||tabId()!=='sheet')return;
  const main=APP.querySelector('main');if(!main||main.dataset.ccDesk==='1')return;
  const heroes=[...main.children].filter(x=>x.matches?.('section.hero'));
  if(!heroes.length){
    main.innerHTML=`<section class="card cc-desk-intro"><div class="eyebrow">OYUNCU MASASI</div><h1>Canlı oyuna hazır</h1><p class="muted">Burada sadece GM'nin sana gönderdiği ve canlı oyuna bağlanan karakter görünür. GM'den karakter davet linkini açtığında karakter otomatik olarak bu masaya gelir.</p></section>`;
    main.dataset.ccDesk='1';return;
  }
  const intro=document.createElement('section');intro.className='card cc-desk-intro';
  intro.innerHTML=`<div class="eyebrow">OYUNCU MASASI</div><h1>Canlı Karakterlerim</h1><p class="muted">Canlı oyuna bağlanan karakterlerin, karakter kağıdı, envanteri ve zar sonuçları aynı masada görünür.</p><div class="cc-summary"><div class="cc-mini-stat"><b>${heroes.length}</b><span>AKTİF KARAKTER</span></div><div class="cc-mini-stat"><b>${main.querySelectorAll('.roll').length}</b><span>SON ZARLAR</span></div><div class="cc-mini-stat"><b>●</b><span>REALTIME</span></div><div class="cc-mini-stat"><b>DM</b><span>AYNI AKIŞ</span></div></div>`;
  main.insertBefore(intro,main.firstChild);
  const nodes=[...main.children].filter(x=>x!==intro);let group=null,i=0;
  for(const node of nodes){
    if(node.matches?.('section.hero')){i++;group=document.createElement('div');group.className='cc-character-stack';group.innerHTML=`<div class="cc-character-label"><span>CANLI KARAKTER ${i}</span><span>KARAKTER + ZAR + ENVANTER</span></div>`;main.appendChild(group)}
    if(group)group.appendChild(node);
  }
  main.querySelectorAll('section.card').forEach(c=>{if(txt(c.querySelector('.eyebrow'))==='SON ZARLAR')c.classList.add('cc-roll-panel')});
  main.dataset.ccDesk='1';
}

function setWizardStep(step){
  wizardStep=Math.max(1,Math.min(4,step));const root=APP.querySelector('.builder');if(!root)return;
  root.querySelectorAll('.cc-step').forEach((b,i)=>{b.classList.toggle('on',i+1===wizardStep);b.classList.toggle('done',i+1<wizardStep)});
  const map={bname:1,bsp:2,bbg:2,bcl:3,bpath:3};
  Object.entries(map).forEach(([id,s])=>{const el=root.querySelector('#'+id);if(el?.parentElement)el.parentElement.classList.toggle('cc-hidden-step',s!==wizardStep)});
  const stats=root.querySelector('.effects'),title=[...root.querySelectorAll('h3')].find(x=>txt(x)==='Başlangıç Statları');if(stats)stats.classList.toggle('cc-hidden-step',wizardStep!==4);if(title)title.classList.toggle('cc-hidden-step',wizardStep!==4);
  const create=root.querySelector('[data-a="ccCreatePrepared"]');if(create)create.classList.toggle('cc-hidden-step',wizardStep!==4);
  const previews=[root.querySelector('#speciesPreview'),root.querySelector('#bgPreview'),root.querySelector('#pathPreview')];previews.forEach((p,i)=>p?.classList.toggle('cc-preview-dim',!((wizardStep===2&&i<2)||(wizardStep===3&&i===2)||(wizardStep===4))));
  const note=root.querySelector('.cc-wizard-note');if(note)note.textContent=['Karakterin adını belirle. Bu karakter henüz canlı oyunda görünmez.','19 ırktan birini ve 22 arka plan hikâyesinden birini seç.','Sınıfı ve varsa özel yolu seç.','Statları kontrol et. Kaydedince hazır karakter oluşturulur ve oyuncu davet linki üretilir.'][wizardStep-1];
  const back=root.querySelector('[data-cc-wizard="back"]'),next=root.querySelector('[data-cc-wizard="next"]');if(back)back.disabled=wizardStep===1;if(next){next.classList.toggle('hidden',wizardStep===4);next.textContent=wizardStep===3?'Statlara Geç':'Devam'}
}

function enhanceBuilder(){
  const main=APP.querySelector('main');if(!main)return;
  if(!isGM()&&tabId()==='builder'){
    main.innerHTML=`<section class="card"><div class="eyebrow">OYUNCU</div><h2>Karakteri GM hazırlar</h2><p class="muted">GM sana hazır karakter davet linkini gönderdiğinde linki açman yeterli. Karakter otomatik olarak canlı Oyuncu Masası'na bağlanır.</p></section>`;return;
  }
  if(!isGM()||tabId()!=='builder')return;
  const root=APP.querySelector('.builder');if(!root||root.dataset.ccWizard==='1')return;
  const card=root.querySelector(':scope > section.card');if(!card)return;
  const eye=card.querySelector('.eyebrow');if(eye)eye.textContent='GM • KARAKTER OLUŞTURUCU';
  const title=card.querySelector('h2');if(title)title.textContent='Hazır karakter oluştur ve oyuncuya gönder';
  const create=card.querySelector('[data-a="create"]');if(create){create.dataset.a='ccCreatePrepared';create.textContent='Hazır Karakteri Oluştur + Davet Linki';}
  const wizard=document.createElement('div');wizard.className='cc-wizard';wizard.innerHTML=`<div class="cc-stepper"><button type="button" class="cc-step" data-cc-step="1"><small>ADIM 1</small>Kimlik</button><button type="button" class="cc-step" data-cc-step="2"><small>ADIM 2</small>Irk & Arka Plan</button><button type="button" class="cc-step" data-cc-step="3"><small>ADIM 3</small>Sınıf & Yol</button><button type="button" class="cc-step" data-cc-step="4"><small>ADIM 4</small>Statlar & Gönder</button></div><div class="cc-wizard-note"></div><div class="cc-wizard-actions"><button type="button" data-cc-wizard="back">← Geri</button><button type="button" class="primary" data-cc-wizard="next">Devam</button></div>`;
  card.insertBefore(wizard,card.querySelector('.form'));root.dataset.ccWizard='1';setWizardStep(1);
}

async function makeInvite(characterId,name){
  const {data,error}=await S.rpc('catlak_generate_character_claim',{p_character_id:characterId});if(error)throw error;
  const link='https://hidden-spring-7923.hosted.pageshare.ai/?join='+encodeURIComponent(data);
  try{await navigator.clipboard.writeText(link)}catch{}
  prompt(`${name} için oyuncu davet linki. Oyuncuya bunu gönder:`,link);
  return link;
}

async function renderPrepared(){
  if(!isGM()||tabId()!=='characters')return;
  const main=APP.querySelector('main');if(!main||main.dataset.ccPage==='prepared')return;
  main.dataset.ccPage='loading-prepared';
  const {data,error}=await S.from('catlak_characters').select('*').eq('play_status','prepared').order('created_at',{ascending:false});
  if(error){main.dataset.ccPage='';toast(error.message);return}
  main.innerHTML=`<section class="card"><div class="section-title"><div><div class="eyebrow">HAZIR KARAKTER HAVUZU</div><h2>Oyuncuya Gönderilmeyi Bekleyen Karakterler</h2><p class="muted">Bu karakterler henüz Canlı Oyun Masası'nda değildir. Davet linki oyuncu tarafından açıldığında otomatik olarak aktif masaya geçer.</p></div><button class="primary" data-tab="builder">+ Yeni Karakter Oluştur</button></div>${data.length?`<div class="grid">${data.map(c=>`<article class="card cc-prepared"><div class="cc-char-head"><div><span class="tag">HAZIR</span><h3>${h(c.name)}</h3><p class="muted">${h(c.species_name)} • ${h(c.class_name)} ${c.level} • ${h(c.background_name)}</p></div><span class="cc-status" style="color:var(--gold);border-color:#66552d">OYUNCU BEKLİYOR</span></div><div class="stats">${A.map(a=>`<div class="stat static"><b>${a}</b><strong>${n(c.base_stats?.[a])}</strong><small>${sg(md(c.base_stats?.[a]))}</small></div>`).join('')}</div><div class="cc-prepared-actions"><button class="primary" data-cc-invite="${c.id}" data-name="${h(c.name)}">Oyuncu Davet Linki Oluştur</button><button class="cc-danger" data-cc-delete-char="${c.id}" data-name="${h(c.name)}">Hazır Karakteri Sil</button></div></article>`).join('')}</div>`:`<div class="cc-empty">Hazır karakter yok. Karakter Oluşturucu'dan yeni bir karakter hazırlayabilirsin.</div>`}</section>`;
  main.dataset.ccPage='prepared';
}

function derived(c,items,inv){
  const stats={...(c.base_stats||{})};let ac=n(c.base_ac),speed=n(c.base_speed),hp=n(c.hp_max),sets=[],bonus=0;
  for(const r of inv.filter(x=>x.character_id===c.id&&x.equipped)){const it=items.find(i=>i.id===r.item_id);if(!it)continue;const fx=it.effects||{};for(const a of A)stats[a]=n(stats[a])+n(fx[a]);speed+=n(fx.speed);hp+=n(fx.hp_max);if(it.item_type==='armor'){if(it.ac_mode==='set')sets.push(n(it.ac_value));if(it.ac_mode==='bonus')bonus+=n(it.ac_value)}}
  if(sets.length)ac=Math.max(ac,...sets);return{stats,ac:ac+bonus,speed,hp};
}

function rollHtml(r,chars,withRuling=true){
  const c=chars.find(x=>x.id===r.character_id),die=Array.isArray(r.dice)?Number(r.dice[0]):NaN,cls=die===20?' cc-critical':die===1?' cc-fumble':'';
  return`<div class="cc-roll-line${cls}" data-roll-id="${r.id}"><div class="die">${r.total==null?'?':r.total}</div><div><b>${h(c?.name||r.label||'Karakter')}</b><br><span>${h(r.label||r.roll_kind||'Zar')}</span><br><small class="muted">${h(r.formula||'')} ${r.modifier?sg(r.modifier):''} • ${new Date(r.created_at).toLocaleTimeString('tr-TR')}</small>${r.dm_ruling?`<div class="gold">GM: ${h(r.dm_ruling)}</div>`:''}</div><div class="cc-roll-actions">${withRuling?`<input id="ru-${r.id}" value="${h(r.dm_ruling||'')}" placeholder="GM kararı / not"><button data-a="ruling" data-id="${r.id}">Notu Kaydet</button>`:''}<button class="cc-danger" data-cc-delete-roll="${r.id}">Zarı Sil</button></div></div>`;
}

async function renderLiveTable(){
  if(!isGM()||tabId()!=='gm')return;
  const main=APP.querySelector('main');if(!main||main.dataset.ccPage==='live')return;
  main.dataset.ccPage='loading-live';
  const [cr,rr,ir,itr]=await Promise.all([
    S.from('catlak_characters').select('*').eq('play_status','active').order('created_at'),
    S.from('catlak_rolls').select('*').order('created_at',{ascending:false}).limit(100),
    S.from('catlak_inventory').select('*'),
    S.from('catlak_items').select('*')
  ]);
  const problem=[cr,rr,ir,itr].find(x=>x.error);if(problem){main.dataset.ccPage='';toast(problem.error.message);return}
  const chars=cr.data||[],rolls=(rr.data||[]).filter(r=>chars.some(c=>c.id===r.character_id)),inv=ir.data||[],items=itr.data||[];
  main.innerHTML=`<section class="card cc-live-hero"><div class="eyebrow">CANLI OYUN MASASI</div><h1>Çatlak Çağı • Canlı Masa</h1><p class="muted">Sadece oyuncu davetini kabul edip oyuna bağlanan karakterler burada görünür. Zarlar oyuncu ve DM tarafında aynı kayıt üzerinden canlı güncellenir.</p><div class="cc-summary"><div class="cc-mini-stat"><b>${chars.length}</b><span>OYUNDAKİ KARAKTER</span></div><div class="cc-mini-stat"><b>${rolls.length}</b><span>ZAR KAYDI</span></div><div class="cc-mini-stat"><b>●</b><span>REALTIME</span></div><div class="cc-mini-stat"><b>${chars.length?new Set(rolls.map(r=>r.character_id)).size:0}</b><span>ZAR ATAN KARAKTER</span></div></div></section><section class="cc-live-grid">${chars.length?chars.map(c=>{const d=derived(c,items,inv);const ownRolls=rolls.filter(r=>r.character_id===c.id).slice(0,5);return`<article class="card cc-live-char"><div class="cc-char-head"><div><div class="eyebrow">OYUNDA</div><h2>${h(c.name)}</h2><p class="muted">${h(c.species_name)} • ${h(c.class_name)} ${c.level} • ${h(c.background_name)}</p></div><span class="cc-status">● CANLI</span></div><div class="vitals"><div class="vital"><span>HP</span><b>${c.hp_current}/${d.hp}</b><div class="row center"><button class="small" data-a="hp" data-id="${c.id}" data-d="-1">−</button><button class="small" data-a="hp" data-id="${c.id}" data-d="1">+</button></div></div><div class="vital"><span>AC</span><b>${d.ac}</b></div><div class="vital"><span>HIZ</span><b>${d.speed}</b></div><div class="vital"><span>LV</span><b>${c.level}</b><div class="row center"><button class="small" data-a="level" data-id="${c.id}" data-d="-1">−</button><button class="small" data-a="level" data-id="${c.id}" data-d="1">+</button></div></div></div><h3>Hızlı Zar</h3><div class="stats">${A.map(a=>`<button class="stat" data-a="stat" data-id="${c.id}" data-stat="${a}"><b>${a}</b><strong>${d.stats[a]}</strong><small>${sg(md(d.stats[a]))} • d20</small></button>`).join('')}</div><h3>Son Zarlar</h3>${ownRolls.length?ownRolls.map(r=>rollHtml(r,chars,false)).join(''):'<div class="cc-empty">Henüz zar atılmadı.</div>'}</article>`}).join(''):`<div class="card cc-empty">Henüz canlı oyuna bağlanmış karakter yok. Karakter Oluşturucu'dan karakter hazırlayıp oyuncuya davet linki gönder.</div>`}</section><section class="card"><div class="section-title"><div><div class="eyebrow">ORTAK ZAR AKIŞI</div><h2>DM + Oyuncular</h2></div><span class="live">● CANLI</span></div>${rolls.length?`<div class="rolls">${rolls.slice(0,30).map(r=>rollHtml(r,chars,true)).join('')}</div>`:'<div class="cc-empty">Canlı masada henüz zar yok.</div>'}</section>`;
  main.dataset.ccPage='live';
}

function enhanceRollPage(){
  if(!isGM()||tabId()!=='rolls')return;const main=APP.querySelector('main'),card=main?.querySelector(':scope > section.card');if(!card||card.dataset.ccRollEnhanced==='1')return;
  const rows=[...card.querySelectorAll('.roll')];rows.forEach(r=>{const id=r.querySelector('[data-a="ruling"]')?.dataset.id;if(id&&!r.querySelector('[data-cc-delete-roll]')){const b=document.createElement('button');b.className='cc-danger';b.dataset.ccDeleteRoll=id;b.textContent='Zarı Sil';const box=r.querySelector('.ruleedit')||r;b.closest;box.appendChild(b)}const die=Number(txt(r.querySelector('.die')));if(die===20)r.classList.add('cc-critical');if(die===1)r.classList.add('cc-fumble')});
  const dash=document.createElement('div'),crit=rows.filter(r=>r.classList.contains('cc-critical')).length,fumble=rows.filter(r=>r.classList.contains('cc-fumble')).length;dash.innerHTML=`<div class="cc-roll-dashboard"><div class="cc-mini-stat"><b>${rows.length}</b><span>AKIŞTAKİ ZAR</span></div><div class="cc-mini-stat"><b>${crit}</b><span>20 / KRİTİK</span></div><div class="cc-mini-stat"><b>${fumble}</b><span>1 / HATA</span></div><div class="cc-mini-stat"><b>DM</b><span>SİLME YETKİSİ</span></div></div>`;card.insertBefore(dash,card.querySelector('.rolls'));card.dataset.ccRollEnhanced='1';
}

async function createPrepared(){
  if(busy)return;busy=true;
  try{
    const name=APP.querySelector('#bname')?.value.trim();if(!name||name.length<2)throw new Error('Karakter adı en az 2 karakter olmalı.');
    const stats=Object.fromEntries(A.map(a=>[a,n(APP.querySelector('#bs-'+a)?.value)]));
    const payload={p_name:name,p_species:APP.querySelector('#bsp')?.value,p_background:APP.querySelector('#bbg')?.value,p_class:APP.querySelector('#bcl')?.value,p_stats:stats,p_special_path:APP.querySelector('#bpath')?.value||null};
    const {data,error}=await S.rpc('catlak_create_prepared_character',payload);if(error)throw error;
    toast('Hazır karakter oluşturuldu. Oyuncu daveti hazırlanıyor…');await makeInvite(data,name);
    const b=APP.querySelector('.nav [data-tab="characters"]');if(b)b.click();
  }catch(e){toast(e.message||String(e))}finally{busy=false}
}

async function deleteRoll(id){
  if(busy)return;busy=true;try{const {error}=await S.rpc('catlak_delete_roll',{p_roll_id:Number(id)});if(error)throw error;document.querySelectorAll(`[data-roll-id="${id}"]`).forEach(x=>x.remove());toast('Zar kaydı silindi. Oyuncu ve DM ekranından kaldırıldı.')}catch(e){toast(e.message||String(e))}finally{busy=false}
}

async function deletePrepared(id,name){
  if(!confirm(`${name||'Bu hazır karakter'} silinsin mi?`))return;const {error}=await S.from('catlak_characters').delete().eq('id',id).eq('play_status','prepared');if(error)return toast(error.message);toast('Hazır karakter silindi.');const main=APP.querySelector('main');if(main)main.dataset.ccPage='';schedule();
}

function run(){scheduled=false;fixNav();enhancePlayerDesk();enhanceBuilder();renderPrepared();renderLiveTable();enhanceRollPage()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(run)}

APP.addEventListener('click',e=>{
  const step=e.target.closest('[data-cc-step]');if(step){e.preventDefault();e.stopPropagation();setWizardStep(Number(step.dataset.ccStep));return}
  const wiz=e.target.closest('[data-cc-wizard]');if(wiz){e.preventDefault();e.stopPropagation();if(wiz.dataset.ccWizard==='back')setWizardStep(wizardStep-1);else{if(wizardStep===1&&!APP.querySelector('#bname')?.value.trim()){APP.querySelector('#bname')?.focus();return}setWizardStep(wizardStep+1)}return}
  const create=e.target.closest('[data-a="ccCreatePrepared"]');if(create){e.preventDefault();e.stopPropagation();createPrepared();return}
  const inv=e.target.closest('[data-cc-invite]');if(inv){e.preventDefault();e.stopPropagation();makeInvite(inv.dataset.ccInvite,inv.dataset.name||'Karakter').catch(x=>toast(x.message||String(x)));return}
  const dr=e.target.closest('[data-cc-delete-roll]');if(dr){e.preventDefault();e.stopPropagation();deleteRoll(dr.dataset.ccDeleteRoll);return}
  const dc=e.target.closest('[data-cc-delete-char]');if(dc){e.preventDefault();e.stopPropagation();deletePrepared(dc.dataset.ccDeleteChar,dc.dataset.name);return}
},true);

new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
S.channel('cc-ui-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{const m=APP.querySelector('main');if(m)m.dataset.ccPage='';schedule()}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_rolls'},()=>{const m=APP.querySelector('main');if(m)m.dataset.ccPage='';schedule()}).subscribe();
schedule();

