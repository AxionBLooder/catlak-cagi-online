const CC_PRES_S=window.__catlakSupabase;
const CC_PRES_APP=document.querySelector('#app');
if(!CC_PRES_S||!CC_PRES_APP)throw new Error('Canlı oyuncu durumu başlatılamadı.');

const ccPrEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ccPrTxt=e=>String(e?.textContent||'').trim();
const ccPrIsGM=()=>ccPrTxt(CC_PRES_APP.querySelector('.role'))==='GM';
const ccPrTab=()=>CC_PRES_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const ccPrIsVampire=c=>String(c?.species_name||'').trim().toLocaleLowerCase('tr-TR')==='vampir';
const ccPrKpMax=c=>3+(Number(c?.level||1)>=4?1:0)+(Number(c?.level||1)>=14?2:0);
const ccPrKpNow=c=>Math.max(0,Math.min(ccPrKpMax(c),Number(c?.data?.vampire_kp??3)));

if(!document.querySelector('#cc-presence-style')){
  const s=document.createElement('style');s.id='cc-presence-style';s.textContent=`
  .cc-live-two{display:grid!important;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr)!important;gap:16px!important}
  .cc-live-two>section:nth-child(2){display:block!important}
  .cc-presence-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}
  .cc-presence-head h2{margin:.15em 0 0}
  .cc-presence-summary{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .cc-presence-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-top:10px}
  .cc-presence-player{border:1px solid #29445e;border-radius:10px;padding:9px 10px;background:#071321;display:flex;justify-content:space-between;gap:10px;align-items:center}
  .cc-presence-player h3{margin:0 0 2px;font-size:.95rem}.cc-presence-player small{color:var(--muted);font-size:.75rem}
  .cc-online,.cc-offline{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 7px;font-size:.66rem;font-weight:900;white-space:nowrap}
  .cc-online{color:#a7f3c8;border:1px solid #357a58;background:#0c2b20}.cc-offline{color:#aeb8c5;border:1px solid #485563;background:#141a22}
  .cc-presence-kp{margin-top:3px;font-size:.72rem;color:#ffbdc8;font-weight:800}
  .cc-player-live-card{border-color:#315f50!important;background:linear-gradient(135deg,#0d201b,#0a1521)!important}
  .cc-player-live-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
  .cc-player-live-kp{margin-top:9px;padding-top:9px;border-top:1px solid #315044;font-weight:900;color:#ffbdc8}
  @media(max-width:800px){.cc-live-two{grid-template-columns:1fr!important}.cc-presence-head{display:block}.cc-presence-summary{margin-top:8px}}
  `;document.head.appendChild(s);
}

let ccPrChannel=null,ccPrWatch=null,ccPrUid=null,ccPrMyChars=null,ccPrGmChars=null,ccPrGmFetch=null,ccPrPlayerFetch=null,ccPrOnline=new Set();
let ccPrLastView='',ccPrLastGmSig='',ccPrLastPlayerSig='';

function ccPrSig(v){try{return JSON.stringify(v)}catch{return String(Date.now())}}
function ccPrCurrentView(){return `${ccPrIsGM()?'gm':'player'}:${ccPrTab()}`}

function ccPrCollectOnline(){
  const next=new Set();
  const state=ccPrChannel?.presenceState?.()||{};
  for(const entries of Object.values(state))for(const p of (entries||[])){
    if(p?.type!=='player')continue;
    for(const id of (Array.isArray(p.character_ids)?p.character_ids:[]))next.add(String(id));
  }
  const before=[...ccPrOnline].sort().join('|'),after=[...next].sort().join('|');
  ccPrOnline=next;
  if(before!==after){ccPrLastGmSig='';ccPrRenderGm()}
}

async function ccPrLoadGmChars(force=false){
  if(!ccPrIsGM()||ccPrTab()!=='gm')return;
  if(ccPrGmFetch&&!force)return ccPrGmFetch;
  if(ccPrGmChars&&!force){ccPrRenderGm();return}
  ccPrGmFetch=(async()=>{
    const {data,error}=await CC_PRES_S.from('catlak_characters').select('id,name,species_name,level,data,play_status,created_at').eq('play_status','active').order('created_at',{ascending:true});
    if(error)throw error;
    ccPrGmChars=data||[];ccPrLastGmSig='';ccPrRenderGm();
  })().catch(e=>console.warn('CC_PRES_GM',e)).finally(()=>{ccPrGmFetch=null});
  return ccPrGmFetch;
}

function ccPrRosterMarkup(){
  const rows=ccPrGmChars||[];
  const onlineCount=rows.filter(c=>ccPrOnline.has(String(c.id))).length;
  return `<div class="cc-presence-head"><div><div class="eyebrow">OYUNCULAR</div><h2>Canlı Karakterler</h2></div><div class="cc-presence-summary"><span class="cc-online">● ${onlineCount}</span><span class="cc-offline">○ ${Math.max(0,rows.length-onlineCount)}</span></div></div>${rows.length?`<div class="cc-presence-grid">${rows.map(c=>{const on=ccPrOnline.has(String(c.id));return `<div class="cc-presence-player" data-cc-presence-character="${c.id}"><div><h3>${ccPrEsc(c.name)}</h3><small>${ccPrEsc(c.species_name||'Irk')} • Seviye ${Number(c.level||1)}</small>${ccPrIsVampire(c)?`<div class="cc-presence-kp">Vampir KP ${ccPrKpNow(c)} / ${ccPrKpMax(c)}</div>`:''}</div><span class="${on?'cc-online':'cc-offline'}">${on?'● ÇEVRİMİÇİ':'○ ÇEVRİMDIŞI'}</span></div>`}).join('')}</div>`:'<div class="cc-empty">Aktif karakter yok.</div>'}`;
}

function ccPrRenderGm(){
  if(!ccPrIsGM()||ccPrTab()!=='gm'||!ccPrGmChars)return;
  const main=CC_PRES_APP.querySelector('main');if(!main)return;
  const sec=main.querySelector('.cc-live-two>section:nth-child(2)');if(!sec)return;
  if(sec.dataset.ccPresenceCompact!=='1')ccPrLastGmSig='';
  const sig=ccPrSig({rows:ccPrGmChars.map(c=>[c.id,c.name,c.species_name,c.level,c.data?.vampire_kp]),online:[...ccPrOnline].sort()});
  if(sig!==ccPrLastGmSig){sec.innerHTML=ccPrRosterMarkup();sec.dataset.ccPresenceCompact='1';ccPrLastGmSig=sig}
}

async function ccPrLoadPlayer(force=false){
  if(!ccPrUid||ccPrIsGM()||ccPrTab()!=='sheet')return;
  if(ccPrPlayerFetch&&!force)return ccPrPlayerFetch;
  if(ccPrMyChars!==null&&!force){ccPrRenderPlayer();return}
  ccPrPlayerFetch=(async()=>{
    const {data,error}=await CC_PRES_S.from('catlak_characters').select('id,name,species_name,level,data,play_status,owner_id').eq('owner_id',ccPrUid).eq('play_status','active');
    if(error)throw error;
    ccPrMyChars=data||[];ccPrLastPlayerSig='';ccPrRenderPlayer();
  })().catch(e=>console.warn('CC_PRES_PLAYER',e)).finally(()=>{ccPrPlayerFetch=null});
  return ccPrPlayerFetch;
}

function ccPrRenderPlayer(){
  if(!ccPrUid||ccPrIsGM()||ccPrTab()!=='sheet')return;
  const main=CC_PRES_APP.querySelector('main');if(!main)return;
  const c=(ccPrMyChars||[])[0];if(!c)return;
  let card=main.querySelector('[data-cc-player-live-card]');
  if(!card){card=document.createElement('section');card.className='card cc-player-live-card';card.dataset.ccPlayerLiveCard='1';const hero=main.querySelector('section.hero');hero?hero.insertAdjacentElement('afterend',card):main.prepend(card);ccPrLastPlayerSig=''}
  const sig=ccPrSig([c.id,c.name,c.species_name,c.level,c.data?.vampire_kp]);
  if(sig===ccPrLastPlayerSig)return;
  card.innerHTML=`<div class="cc-player-live-row"><div><div class="eyebrow">CANLI DURUM</div><h2>${ccPrEsc(c.name)}</h2></div><span class="cc-online">● ÇEVRİMİÇİ</span></div><small class="muted">GM seni şu anda çevrimiçi görüyor.</small>${ccPrIsVampire(c)?`<div class="cc-player-live-kp">VAMPİR • KP ${ccPrKpNow(c)} / ${ccPrKpMax(c)}</div>`:''}`;
  ccPrLastPlayerSig=sig;
}

async function ccPrStopPresence(){
  if(!ccPrChannel)return;
  try{await ccPrChannel.untrack()}catch{}
  try{CC_PRES_S.removeChannel(ccPrChannel)}catch{}
  ccPrChannel=null;
}

async function ccPrStart(){
  const {data:{session}}=await CC_PRES_S.auth.getSession();
  const uid=session?.user?.id||null;
  if(!uid){ccPrUid=null;ccPrMyChars=null;await ccPrStopPresence();return}
  if(ccPrUid===uid&&ccPrChannel)return;
  await ccPrStopPresence();
  ccPrUid=uid;ccPrMyChars=null;ccPrLastPlayerSig='';
  const {data,error}=await CC_PRES_S.from('catlak_characters').select('id,name,species_name,level,data,play_status,owner_id').eq('owner_id',uid).eq('play_status','active');
  if(!error)ccPrMyChars=data||[];else ccPrMyChars=[];
  ccPrChannel=CC_PRES_S.channel('catlak-online-presence',{config:{presence:{key:String(uid)}}});
  ccPrChannel.on('presence',{event:'sync'},ccPrCollectOnline).on('presence',{event:'join'},ccPrCollectOnline).on('presence',{event:'leave'},ccPrCollectOnline);
  ccPrChannel.subscribe(async status=>{
    if(status==='SUBSCRIBED'){
      if((ccPrMyChars||[]).length){try{await ccPrChannel.track({type:'player',user_id:uid,character_ids:ccPrMyChars.map(c=>String(c.id)),online_at:new Date().toISOString()})}catch{}}
      ccPrCollectOnline();
    }
  });
  ccPrTick(true);
}

function ccPrTick(force=false){
  const view=ccPrCurrentView();
  if(view!==ccPrLastView){ccPrLastView=view;ccPrLastGmSig='';ccPrLastPlayerSig='';force=true}
  if(ccPrIsGM()&&ccPrTab()==='gm')ccPrLoadGmChars(force&&ccPrGmChars===null);
  else if(!ccPrIsGM()&&ccPrTab()==='sheet')ccPrLoadPlayer(force&&ccPrMyChars===null);
}

CC_PRES_S.auth.onAuthStateChange(()=>setTimeout(()=>ccPrStart().catch(e=>console.warn('CC_PRES_AUTH',e)),0));
ccPrWatch=CC_PRES_S.channel('cc-presence-character-watch').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{
  ccPrGmChars=null;ccPrMyChars=null;ccPrLastGmSig='';ccPrLastPlayerSig='';
  if(ccPrIsGM()&&ccPrTab()==='gm')ccPrLoadGmChars(true);else if(!ccPrIsGM()&&ccPrTab()==='sheet')ccPrLoadPlayer(true);
}).subscribe();
window.addEventListener('beforeunload',()=>{try{ccPrChannel?.untrack()}catch{}});
setInterval(()=>ccPrTick(false),700);
ccPrStart().catch(e=>console.warn('CC_PRES_START',e));
ccPrTick(true);
