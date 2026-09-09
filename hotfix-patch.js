const CC_HOTFIX_S=window.__catlakSupabase;
const CC_HOTFIX_APP=document.querySelector('#app');
if(!CC_HOTFIX_S||!CC_HOTFIX_APP)throw new Error('Çatlak Çağı hotfix başlatılamadı.');

// Hazır Karakterler ekranının tek render sahibi bu katmandır.
window.__catlakPreparedOwner=true;

const ccHx=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ccHn=x=>Number(x||0);
const ccHmd=x=>Math.floor((ccHn(x)-10)/2);
const ccHsg=x=>ccHn(x)>=0?'+'+ccHn(x):String(ccHn(x));
const ccHtxt=e=>String(e?.textContent||'').trim();
const ccHTab=()=>CC_HOTFIX_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const ccHIsGM=()=>ccHtxt(CC_HOTFIX_APP.querySelector('.role'))==='GM';
const ccHToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(ccHToast.t);ccHToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
const CC_H_STATS=['STR','DEX','CON','INT','WIS','CHA'];

if(!document.querySelector('#cc-hotfix-style')){
  const s=document.createElement('style');s.id='cc-hotfix-style';s.textContent=`
  .cc-h-prepared-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
  .cc-h-prepared-card{border-color:#66552d!important;min-height:260px;opacity:1!important;filter:none!important;transform:none!important}
  .cc-h-prepared-card .stats{margin:14px 0}
  .cc-h-prepared-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
  .cc-player-gm-note{border-color:#7f5633!important;background:linear-gradient(135deg,#241a12,#111923)!important}
  .cc-player-gm-note .cc-effect-text{white-space:pre-wrap;font-size:1rem;line-height:1.55;color:#ffe5b5}
  .cc-player-gm-note .cc-effect-badge{display:inline-block;border:1px solid #8d6339;border-radius:999px;padding:5px 9px;color:#ffd38c;font-size:.72rem;letter-spacing:.08em;margin-bottom:8px}
  [data-cc-prepared-loading]{min-height:240px;display:grid;place-items:center}
  `;document.head.appendChild(s);
}

// ---------- KP: tek click sahibi + doğrudan UI güncellemesi ----------
const ccHKpBusy=new Set();
async function ccHUpdateKp(characterId,delta){
  if(ccHKpBusy.has(characterId))return;
  ccHKpBusy.add(characterId);
  const buttons=[...CC_HOTFIX_APP.querySelectorAll(`[data-a="vkp"][data-id="${characterId}"]`)];
  buttons.forEach(b=>b.disabled=true);
  try{
    const {data,error}=await CC_HOTFIX_S.rpc('catlak_update_vampire_kp',{p_character_id:characterId,p_delta:Number(delta||0)});
    if(error)throw error;
    for(const b of buttons){
      const card=b.closest('section.vampire');
      const title=card?.querySelector('h2');
      if(title){const m=title.textContent.match(/\/\s*(\d+)/);title.textContent=`KP ${Number(data)}/${m?m[1]:'?'}`;}
    }
    ccHToast(`KP: ${Number(data)}`);
  }catch(e){ccHToast(e?.message||String(e))}
  finally{buttons.forEach(b=>b.disabled=false);ccHKpBusy.delete(characterId)}
}

CC_HOTFIX_APP.addEventListener('click',e=>{
  const b=e.target.closest('[data-a="vkp"][data-id][data-d]');
  if(!b)return;
  // Eski base click handlerına ulaşmasını engeller; çift RPC / render yarışını keser.
  e.preventDefault();e.stopImmediatePropagation();
  ccHUpdateKp(b.dataset.id,b.dataset.d);
},true);

// ---------- Hazır Karakterler: cache + tek renderer ----------
let ccHPreparedCache=null,ccHPreparedFetch=null,ccHPreparedVersion=0;
function ccHPreparedMarkup(rows){
  return `<section class="card" data-cc-hotfix-prepared="${ccHPreparedVersion}"><div class="section-title"><div><div class="eyebrow">HAZIR KARAKTER HAVUZU</div><h2>Oyuncuya Gönderilmeyi Bekleyen Karakterler</h2><p class="muted">Bu ekran tek render katmanıyla sabitlendi. Kartlar artık yenileme sırasında hayaletlenmez veya yalnız isme düşmez.</p></div><button class="primary" data-tab="builder">+ Yeni Karakter Oluştur</button></div>${rows.length?`<div class="cc-h-prepared-grid">${rows.map(c=>`<article class="card cc-h-prepared-card"><div class="cc-char-head"><div><span class="tag">HAZIR</span><h3>${ccHx(c.name)}</h3><p class="muted">${ccHx(c.species_name)} • ${ccHx(c.class_name)} ${ccHn(c.level)} • ${ccHx(c.background_name)}</p></div><span class="cc-status" style="color:var(--gold);border-color:#66552d">OYUNCU BEKLİYOR</span></div><div class="stats">${CC_H_STATS.map(a=>`<div class="stat static"><b>${a}</b><strong>${ccHn(c.base_stats?.[a])}</strong><small>${ccHsg(ccHmd(c.base_stats?.[a]))}</small></div>`).join('')}</div><div class="cc-h-prepared-actions"><button class="primary" data-cc-invite="${c.id}" data-name="${ccHx(c.name)}">Oyuncu Davet Linki Oluştur</button><button class="cc-danger" data-cc-delete-char="${c.id}" data-name="${ccHx(c.name)}">Hazır Karakteri Sil</button></div></article>`).join('')}</div>`:`<div class="cc-empty">Hazır karakter yok. Karakter Oluşturucu'dan yeni bir karakter hazırlayabilirsin.</div>`}</section>`;
}
function ccHRenderPreparedSync(){
  if(!ccHIsGM()||ccHTab()!=='characters')return;
  const main=CC_HOTFIX_APP.querySelector('main');if(!main)return;
  if(ccHPreparedCache){
    if(main.querySelector(`[data-cc-hotfix-prepared="${ccHPreparedVersion}"]`))return;
    main.innerHTML=ccHPreparedMarkup(ccHPreparedCache);
  }else if(!main.querySelector('[data-cc-prepared-loading]')){
    main.innerHTML='<section class="card" data-cc-prepared-loading="1"><div><div class="eyebrow">HAZIR KARAKTERLER</div><h2>Karakter kartları hazırlanıyor…</h2></div></section>';
  }
}
async function ccHRefreshPrepared(force=false){
  if(!ccHIsGM()||ccHTab()!=='characters')return;
  ccHRenderPreparedSync();
  if(ccHPreparedFetch&&!force)return ccHPreparedFetch;
  ccHPreparedFetch=(async()=>{
    const {data,error}=await CC_HOTFIX_S.from('catlak_characters').select('*').eq('play_status','prepared').order('created_at',{ascending:false});
    if(error)throw error;
    ccHPreparedCache=data||[];ccHPreparedVersion++;
    if(ccHIsGM()&&ccHTab()==='characters'){
      const main=CC_HOTFIX_APP.querySelector('main');if(main)main.innerHTML=ccHPreparedMarkup(ccHPreparedCache);
    }
  })().catch(e=>ccHToast(e?.message||String(e))).finally(()=>{ccHPreparedFetch=null});
  return ccHPreparedFetch;
}

// ---------- GM notunu yalnız karakter sahibine görünür durum/debuff olarak göster ----------
let ccHNotesCache=new Map(),ccHNotesFetch=null,ccHNotesUser=null;
async function ccHLoadPlayerNotes(force=false){
  const {data:{session}}=await CC_HOTFIX_S.auth.getSession();
  const uid=session?.user?.id||null;
  if(!uid||ccHIsGM()){ccHNotesCache=new Map();ccHNotesUser=uid;return}
  if(!force&&ccHNotesUser===uid&&ccHNotesFetch)return ccHNotesFetch;
  ccHNotesUser=uid;
  ccHNotesFetch=(async()=>{
    const {data,error}=await CC_HOTFIX_S.from('catlak_characters').select('id,name,data,owner_id,play_status').eq('owner_id',uid).eq('play_status','active');
    if(error)throw error;
    ccHNotesCache=new Map((data||[]).map(c=>[String(c.id),String(c.data?.gm_note||'').trim()]));
    ccHRenderPlayerNotes();
  })().catch(e=>console.warn('CC_PLAYER_NOTE',e)).finally(()=>{ccHNotesFetch=null});
  return ccHNotesFetch;
}
function ccHRenderPlayerNotes(){
  if(ccHIsGM()||ccHTab()!=='sheet')return;
  const main=CC_HOTFIX_APP.querySelector('main');if(!main)return;
  // Önce artık geçerli olmayan kartları temizle.
  main.querySelectorAll('[data-cc-player-note-for]').forEach(el=>{const id=el.dataset.ccPlayerNoteFor;if(!ccHNotesCache.get(id))el.remove()});
  const heroes=[...main.querySelectorAll('section.hero')];
  for(const hero of heroes){
    const id=hero.querySelector('[data-a="hp"][data-id]')?.dataset.id;
    if(!id)continue;
    const note=ccHNotesCache.get(String(id));
    let card=main.querySelector(`[data-cc-player-note-for="${id}"]`);
    if(!note){card?.remove();continue}
    if(!card){card=document.createElement('section');card.className='card cc-player-gm-note';card.dataset.ccPlayerNoteFor=id;hero.insertAdjacentElement('afterend',card)}
    card.innerHTML=`<span class="cc-effect-badge">GM • KİŞİYE ÖZEL DURUM</span><h2>Aktif Etki / Debuff</h2><div class="cc-effect-text">${ccHx(note)}</div>`;
  }
}
function ccHEnhanceGmNoteEditor(){
  if(!ccHIsGM())return;
  const ta=CC_HOTFIX_APP.querySelector('#char-note');if(!ta)return;
  const label=ta.closest('label');
  if(label&&!label.dataset.ccPlayerVisible){
    label.dataset.ccPlayerVisible='1';
    const first=[...label.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(first)first.textContent='Oyuncuya Özel Durum / Debuff Notu';
    const help=document.createElement('div');help.className='notice';help.dataset.ccPlayerNoteHelp='1';help.innerHTML='<b>OYUNCUYA GÖRÜNÜR</b><p>Buraya yazdığın not yalnız bu karakterin sahibi ve GM tarafından görülebilir. Debuff, lanet, yaralanma veya geçici durum yazabilirsin.</p>';
    label.before(help);
  }
}

let ccHScheduled=false;
function ccHSchedule(){
  if(ccHScheduled)return;ccHScheduled=true;
  queueMicrotask(()=>{
    ccHScheduled=false;
    if(ccHIsGM()&&ccHTab()==='characters'){ccHRenderPreparedSync();ccHRefreshPrepared(false)}
    if(!ccHIsGM()&&ccHTab()==='sheet'){ccHRenderPlayerNotes();if(!ccHNotesFetch)ccHLoadPlayerNotes(false)}
    ccHEnhanceGmNoteEditor();
  });
}

new MutationObserver(ccHSchedule).observe(CC_HOTFIX_APP,{childList:true,subtree:true});
CC_HOTFIX_APP.addEventListener('click',e=>{
  if(e.target.closest('[data-tab="characters"]'))queueMicrotask(()=>ccHRefreshPrepared(false));
},false);

CC_HOTFIX_S.channel('cc-hotfix-live')
  .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{
    ccHPreparedCache=null;ccHPreparedVersion++;
    ccHLoadPlayerNotes(true);
    ccHSchedule();
  }).subscribe();

ccHLoadPlayerNotes(true);
ccHSchedule();
