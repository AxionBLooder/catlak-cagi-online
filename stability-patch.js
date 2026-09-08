const CC_S=window.__catlakSupabase;
const CC_APP=document.querySelector('#app');
if(!CC_S||!CC_APP)throw new Error('Çatlak Çağı stabilite katmanı başlatılamadı.');

const ccH=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ccTxt=e=>String(e?.textContent||'').trim();
const ccIsGM=()=>ccTxt(CC_APP.querySelector('.role'))==='GM';
const ccTab=()=>CC_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const ccToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(ccToast.t);ccToast.t=setTimeout(()=>t.classList.add('hidden'),4500)};
let ccMapActive=false,ccScheduled=false,ccMapBusy=false,ccRollBusy=false,ccLiveBusy=false;

const ccCss=`
.cc-live-two{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);gap:16px}.cc-simple-roll{display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)}.cc-simple-roll:last-child{border-bottom:0}.cc-simple-total{font-size:1.55rem;font-weight:900;color:var(--gold);text-align:center}.cc-simple-player{padding:12px 0;border-bottom:1px solid var(--line)}.cc-simple-player:last-child{border-bottom:0}.cc-simple-player b{font-size:1.04rem}.cc-map-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.cc-map-card{overflow:hidden}.cc-map-card img,.cc-party-show img{width:100%;max-height:360px;object-fit:cover;border-radius:14px;border:1px solid var(--line);background:#050b14}.cc-map-card img{height:210px}.cc-map-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.cc-party-show{border-color:#705f36!important;background:linear-gradient(135deg,#181a1d,#15111d)!important}.cc-party-mini{display:grid;grid-template-columns:130px 1fr;gap:14px;align-items:center}.cc-party-mini img{width:130px;height:90px;object-fit:cover;border-radius:10px;border:1px solid var(--line)}.cc-map-tabs-note{color:var(--muted);font-size:.85rem}.cc-map-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.cc-clear-rolls{margin-left:auto}
@media(max-width:800px){.cc-live-two{grid-template-columns:1fr}.cc-simple-roll{grid-template-columns:58px minmax(0,1fr)}.cc-simple-roll .cc-roll-delete{grid-column:1/-1}.cc-party-mini{grid-template-columns:1fr}.cc-party-mini img{width:100%;height:180px}}
`;
if(!document.querySelector('#cc-stability-style')){const s=document.createElement('style');s.id='cc-stability-style';s.textContent=ccCss;document.head.appendChild(s)}

function ccEnsureMapNav(){
  const nav=CC_APP.querySelector('.nav');if(!nav)return;
  let b=nav.querySelector('[data-cc-map-tab]');
  if(ccIsGM()){
    if(!b){b=document.createElement('button');b.type='button';b.dataset.ccMapTab='1';b.textContent='Harita';const world=nav.querySelector('[data-cc-world-tab]'),rules=nav.querySelector('[data-tab="rules"]');world?world.after(b):rules?rules.before(b):nav.appendChild(b)}
    if(ccMapActive)nav.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
  }else if(b)b.remove();
}

function ccRollName(r,chars){return chars.find(c=>c.id===r.character_id)?.name||r.label||'Oyuncu'}
function ccRollLabel(r){return r.label||r.roll_kind||r.formula||'Zar'}

async function ccDeleteRoll(id){
  if(ccRollBusy||!ccIsGM())return;ccRollBusy=true;
  try{
    const {data:sessionData}=await CC_S.auth.getSession();
    if(!sessionData?.session)throw new Error('GM oturumu bulunamadı. Tekrar giriş yap.');
    let ok=false,firstError=null;
    const rpc=await CC_S.rpc('catlak_delete_roll',{p_roll_id:Number(id)});
    if(!rpc.error&&rpc.data===true)ok=true;else firstError=rpc.error;
    if(!ok){
      const direct=await CC_S.from('catlak_rolls').delete().eq('id',Number(id)).select('id');
      if(direct.error)throw(firstError||direct.error);
      ok=(direct.data||[]).length>0;
    }
    if(!ok)throw new Error('Zar kaydı bulunamadı veya silme yetkisi uygulanmadı.');
    document.querySelectorAll(`[data-roll-id="${CSS.escape(String(id))}"],[data-cc-roll-id="${CSS.escape(String(id))}"]`).forEach(x=>x.remove());
    ccToast('Zar silindi; DM ve oyuncu ekranlarından kaldırılıyor.');
    await ccRenderSimpleGm(true);
  }catch(e){ccToast('Zar silinemedi: '+(e?.message||String(e)))}finally{ccRollBusy=false}
}

async function ccClearRolls(){
  if(ccRollBusy||!ccIsGM())return;
  if(!confirm('Tüm zar geçmişi silinsin mi? Oyuncu ve DM tarafındaki bütün zar kayıtları kaldırılacak.'))return;
  ccRollBusy=true;
  try{
    const {data:sessionData}=await CC_S.auth.getSession();if(!sessionData?.session)throw new Error('GM oturumu bulunamadı.');
    let count=0;
    const rpc=await CC_S.rpc('catlak_clear_roll_log');
    if(!rpc.error)count=Number(rpc.data)||0;
    else{
      const direct=await CC_S.from('catlak_rolls').delete().gte('id',0).select('id');
      if(direct.error)throw rpc.error||direct.error;count=(direct.data||[]).length;
    }
    ccToast(count+' zar kaydı silindi.');
    await ccRenderSimpleGm(true);
  }catch(e){ccToast('Toplu zar silinemedi: '+(e?.message||String(e)))}finally{ccRollBusy=false}
}

async function ccRenderSimpleGm(force=false){
  if(!ccIsGM()||ccMapActive||ccTab()!=='gm'||ccLiveBusy)return;
  const main=CC_APP.querySelector('main');if(!main)return;
  if(!force&&main.dataset.ccSimpleLive==='1')return;
  ccLiveBusy=true;
  try{
    const [cr,rr,pv]=await Promise.all([
      CC_S.from('catlak_characters').select('id,name,created_at').eq('play_status','active').order('created_at',{ascending:true}),
      CC_S.from('catlak_rolls').select('*').order('created_at',{ascending:false}).limit(80),
      CC_S.from('catlak_party_visual').select('*').eq('singleton',true).maybeSingle()
    ]);
    if(cr.error)throw cr.error;if(rr.error)throw rr.error;
    const chars=cr.data||[],ids=new Set(chars.map(c=>c.id)),rolls=(rr.data||[]).filter(r=>ids.has(r.character_id));
    const party=pv.data;
    const partyHtml=party?.image_url?`<section class="card cc-party-show"><div class="eyebrow">PARTİYE YANSITILAN GÖRSEL</div><div class="cc-party-mini"><img src="${ccH(party.image_url)}" alt="${ccH(party.title||'Parti görseli')}"><div><h2>${ccH(party.title||'Parti Görseli')}</h2><p class="muted">${ccH(party.note||'')}</p></div></div></section>`:'';
    main.innerHTML=`${partyHtml}<section class="card"><div class="eyebrow">CANLI OYUN MASASI</div><h1>Oyuncular & Zarlar</h1><p class="muted">Solda oyuncuların attığı zarlar, sağda canlı oyundaki karakter adları görünür. Stat kutuları bu masadan kaldırıldı.</p></section><div class="cc-live-two"><section class="card"><div class="section-title"><div><div class="eyebrow">ZAR AKIŞI</div><h2>Atılan Zarlar</h2></div><button type="button" class="danger cc-clear-rolls" data-cc-clear-all-rolls>Toplu Zar Sil</button></div>${rolls.length?rolls.slice(0,40).map(r=>`<div class="cc-simple-roll" data-cc-roll-id="${r.id}"><div class="cc-simple-total">${r.total??'?'}</div><div><b>${ccH(ccRollName(r,chars))}</b><br><span>${ccH(ccRollLabel(r))}</span></div><button type="button" class="danger small cc-roll-delete" data-cc-delete-roll="${r.id}">Sil</button></div>`).join(''):'<div class="cc-world-empty">Henüz zar atılmadı.</div>'}</section><section class="card"><div class="eyebrow">OYUNCULAR</div><h2>Canlı Karakterler</h2>${chars.length?chars.map(c=>`<div class="cc-simple-player"><b>${ccH(c.name)}</b><br><small class="muted">● CANLI</small></div>`).join(''):'<div class="cc-world-empty">Canlı oyuna bağlı karakter yok.</div>'}</section></div>`;
    main.dataset.ccSimpleLive='1';
  }catch(e){ccToast('Canlı masa yüklenemedi: '+(e?.message||String(e)))}finally{ccLiveBusy=false}
}

function ccMapCard(x,kind){
  const title=kind==='map'?(x.title||'Adsız Harita'):(x.name||'Adsız NPC');
  const note=kind==='map'?(x.description||''):(x.note||'');
  const img=x.image_url||'';
  return`<article class="card cc-map-card"><div class="cc-map-head"><div><span class="tag">${kind==='map'?'HARİTA':'NPC'}</span><h3>${ccH(title)}</h3></div></div>${img?`<img src="${ccH(img)}" alt="${ccH(title)}">`:''}<p>${ccH(note)}</p><div class="cc-map-actions"><button type="button" class="primary" data-cc-party-push="${x.id}" data-kind="${kind}">Partiye Yansıt</button></div></article>`
}

async function ccRenderMapPage(force=false){
  if(!ccMapActive||!ccIsGM()||ccMapBusy)return;const main=CC_APP.querySelector('main');if(!main)return;
  if(!force&&main.dataset.ccMapPage==='1')return;ccMapBusy=true;
  try{
    const [mr,nr,pr]=await Promise.all([
      CC_S.from('catlak_world_media').select('*').eq('media_type','map').order('created_at',{ascending:true}),
      CC_S.from('catlak_npcs').select('*').order('created_at',{ascending:true}),
      CC_S.from('catlak_party_visual').select('*').eq('singleton',true).maybeSingle()
    ]);
    if(mr.error)throw mr.error;if(nr.error)throw nr.error;
    const maps=mr.data||[],npcs=nr.data||[],party=pr.data;
    main.innerHTML=`<section class="card"><div class="eyebrow">HARİTA • GÖRSEL ARŞİVİ</div><h1>Harita & NPC Görselleri</h1><p class="cc-map-tabs-note">Evren bölümünde eklediğin bütün harita ve NPC'ler otomatik olarak burada görünür. Buradan seçtiğin görseli canlı parti ekranına yansıtabilirsin.</p></section>${party?.image_url?`<section class="card cc-party-show"><div class="section-title"><div><div class="eyebrow">ŞU AN PARTİDE</div><h2>${ccH(party.title||'Parti Görseli')}</h2></div><button type="button" class="danger" data-cc-party-clear>Partiden Kaldır</button></div><img src="${ccH(party.image_url)}" alt="${ccH(party.title||'Parti görseli')}"><p>${ccH(party.note||'')}</p></section>`:''}<section class="card"><div class="eyebrow">HARİTALAR</div><h2>Evren Haritaları</h2>${maps.length?`<div class="cc-map-gallery">${maps.map(x=>ccMapCard(x,'map')).join('')}</div>`:'<div class="cc-world-empty">Harita yok. Evren bölümünden ekleyebilirsin.</div>'}</section><section class="card"><div class="eyebrow">NPC GÖRSELLERİ</div><h2>NPC Arşivi</h2>${npcs.length?`<div class="cc-map-gallery">${npcs.map(x=>ccMapCard(x,'npc')).join('')}</div>`:'<div class="cc-world-empty">NPC yok. Evren bölümünden ekleyebilirsin.</div>'}</section>`;
    main.dataset.ccMapPage='1';
  }catch(e){ccToast('Harita arşivi yüklenemedi: '+(e?.message||String(e)))}finally{ccMapBusy=false}
}

async function ccPushParty(id,kind){
  if(!ccIsGM())return;
  try{
    let row,error;
    if(kind==='map'){const r=await CC_S.from('catlak_world_media').select('*').eq('id',id).single();row=r.data;error=r.error}
    else{const r=await CC_S.from('catlak_npcs').select('*').eq('id',id).single();row=r.data;error=r.error}
    if(error)throw error;
    const title=kind==='map'?row.title:row.name,note=kind==='map'?row.description:row.note;
    const u=await CC_S.from('catlak_party_visual').update({kind,ref_id:id,title:title||'',image_url:row.image_url||'',note:note||'',updated_at:new Date().toISOString()}).eq('singleton',true).select('singleton');
    if(u.error)throw u.error;if(!(u.data||[]).length)throw new Error('Parti görseli satırı güncellenemedi.');
    ccToast((title||'Görsel')+' partiye yansıtıldı.');await ccRenderMapPage(true);
  }catch(e){ccToast('Partiye yansıtılamadı: '+(e?.message||String(e)))}
}

async function ccClearParty(){
  if(!ccIsGM())return;const u=await CC_S.from('catlak_party_visual').update({kind:'',ref_id:null,title:'',image_url:'',note:'',updated_at:new Date().toISOString()}).eq('singleton',true);if(u.error)return ccToast(u.error.message);ccToast('Parti görseli kaldırıldı.');await ccRenderMapPage(true)
}

async function ccInjectPartyVisual(){
  if(ccMapActive)return;const tab=ccTab();if(tab!=='sheet'||ccIsGM())return;const main=CC_APP.querySelector('main');if(!main||main.querySelector('[data-cc-party-visual-card]'))return;
  const {data,error}=await CC_S.from('catlak_party_visual').select('*').eq('singleton',true).maybeSingle();if(error||!data?.image_url)return;
  const s=document.createElement('section');s.className='card cc-party-show';s.dataset.ccPartyVisualCard='1';s.innerHTML=`<div class="eyebrow">GM'NİN PARTİYE YANSITTIĞI GÖRSEL</div><div class="cc-party-mini"><img src="${ccH(data.image_url)}" alt="${ccH(data.title||'Parti görseli')}"><div><h2>${ccH(data.title||'Parti Görseli')}</h2><p class="muted">${ccH(data.note||'')}</p></div></div>`;main.insertBefore(s,main.firstChild);
}

document.addEventListener('click',e=>{
  const map=e.target.closest('[data-cc-map-tab]');
  if(map&&ccIsGM()){
    e.preventDefault();e.stopImmediatePropagation();
    const worldOn=CC_APP.querySelector('[data-cc-world-tab].on');
    if(worldOn){const gm=CC_APP.querySelector('.nav [data-tab="gm"]');if(gm)gm.click()}
    requestAnimationFrame(()=>{ccMapActive=true;ccEnsureMapNav();ccRenderMapPage(true)});return;
  }
  const normal=e.target.closest('#app .nav button[data-tab],#app [data-cc-world-tab]');if(normal&&!normal.hasAttribute('data-cc-map-tab'))ccMapActive=false;
  const del=e.target.closest('[data-cc-delete-roll]');if(del&&ccIsGM()){e.preventDefault();e.stopImmediatePropagation();ccDeleteRoll(del.dataset.ccDeleteRoll);return}
  const clear=e.target.closest('[data-cc-clear-all-rolls]');if(clear&&ccIsGM()){e.preventDefault();e.stopImmediatePropagation();ccClearRolls();return}
  const push=e.target.closest('[data-cc-party-push]');if(push&&ccIsGM()){e.preventDefault();e.stopImmediatePropagation();ccPushParty(push.dataset.ccPartyPush,push.dataset.kind);return}
  const pc=e.target.closest('[data-cc-party-clear]');if(pc&&ccIsGM()){e.preventDefault();e.stopImmediatePropagation();ccClearParty();return}
},true);

function ccRun(){ccScheduled=false;ccEnsureMapNav();if(ccMapActive)ccRenderMapPage();else{ccRenderSimpleGm();ccInjectPartyVisual()}}
function ccSchedule(){if(ccScheduled)return;ccScheduled=true;requestAnimationFrame(ccRun)}
new MutationObserver(ccSchedule).observe(CC_APP,{childList:true,subtree:true});
CC_S.channel('cc-stability-live')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_rolls'},()=>{const m=CC_APP.querySelector('main');if(m){m.dataset.ccSimpleLive='';m.dataset.ccMapPage=''}ccRenderSimpleGm(true)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{const m=CC_APP.querySelector('main');if(m)m.dataset.ccSimpleLive='';ccRenderSimpleGm(true)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_world_media'},()=>{const m=CC_APP.querySelector('main');if(m)m.dataset.ccMapPage='';if(ccMapActive)ccRenderMapPage(true)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_npcs'},()=>{const m=CC_APP.querySelector('main');if(m)m.dataset.ccMapPage='';if(ccMapActive)ccRenderMapPage(true)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_party_visual'},()=>{const m=CC_APP.querySelector('main');if(m){m.querySelector('[data-cc-party-visual-card]')?.remove();m.dataset.ccMapPage='';m.dataset.ccSimpleLive=''}if(ccMapActive)ccRenderMapPage(true);else{ccRenderSimpleGm(true);ccInjectPartyVisual()}})
 .subscribe();
ccSchedule();
