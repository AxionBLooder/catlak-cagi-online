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
  .cc-live-two{grid-template-columns:1fr!important}
  .cc-live-two>section:nth-child(2){display:none!important}
  .cc-presence-roster{border-color:#31506c!important}
  .cc-presence-summary{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin:8px 0 14px}
  .cc-presence-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}
  .cc-presence-player{border:1px solid #29445e;border-radius:14px;padding:12px;background:#071321;display:flex;justify-content:space-between;gap:12px;align-items:center}
  .cc-presence-player h3{margin:0 0 3px;font-size:1rem}.cc-presence-player small{color:var(--muted)}
  .cc-online,.cc-offline{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 9px;font-size:.72rem;font-weight:900;white-space:nowrap}
  .cc-online{color:#a7f3c8;border:1px solid #357a58;background:#0c2b20}.cc-offline{color:#aeb8c5;border:1px solid #485563;background:#141a22}
  .cc-presence-kp{margin-top:5px;font-size:.78rem;color:#ffbdc8;font-weight:800}
  .cc-player-live-card{border-color:#315f50!important;background:linear-gradient(135deg,#0d201b,#0a1521)!important}
  .cc-player-live-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
  .cc-player-live-kp{margin-top:9px;padding-top:9px;border-top:1px solid #315044;font-weight:900;color:#ffbdc8}
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
  return `<div class="eyebrow">CANLI OYUNCULAR</div><h2>Oyuncu Durumu</h2><div class="cc-presence-summary"><span class="cc-online">● ${onlineCount} ÇEVRİMİÇİ</span><span class="cc-offline">○ ${Math.max(0,rows.length-onlineCount)} ÇEVRİMDIŞI</span><small class="muted">Oyuncu siteyi açık tuttuğu sürece çevrimiçi görünür.</small></div>${rows.length?`<div class="cc-presence-grid">${rows.map(c=>{const on=ccPrOnline.has(String(c.id));return `<div class="cc-presence-player" data-cc-presence-character="${c.id}"><div><h3>${ccPrEsc(c.name)}</h3><small>${ccPrEsc(c.species_name||'Irk')} • Seviye ${Number(c.level||1)}</small>${ccPrIsVampire(c)?`<div class="cc-presence-kp">Vampir KP ${ccPrKpNow(c)} / ${ccPrKpMax(c)}</div>`:''}</div><span class="${on?'cc-online':'cc-offline'}">${on?'● ÇEVRİMİÇİ':'○ ÇEVRİMDIŞI'}</span></div>`}).join('')}</div>`:'<div class="cc-empty">Aktif karakter yok.</div>'}`;
}

function ccPrRenderGm(){
  if(!ccPrIsGM()||ccPrTab()!=='gm'||!ccPrGmChars)return;
  const main=CC_PRES_APP.querySelector('main');if(!main)return;
  let sec=main.querySelector('[data-cc-presence-roster]');
  if(!sec){sec=document.createElement('section');sec.className='card cc-presence-roster';sec.dataset.ccPresenceRoster='1';const live=main.querySelector('.cc-live-two');live?live.before(sec):main.prepend(sec);ccPrLastGmSig=''}
  const sig=ccPrSig({rows:ccPrGmChars.map(c=>[c.id,c.name,c.species_name,c.level,c.data?.vampire_kp]),online:[...ccPrOnline].sort()});
  if(sig!==ccPrLastGmSig){sec.innerHTML=ccPrRosterMarkup();ccPrLastGmSig=sig}
  for(const c of ccPrGmChars){
    const on=ccPrOnline.has(String(c.id));
    const badge=main.querySelector(`[data-cc-gm-character="${CSS.escape(String(c.id))}"] .cc-status`);
    if(badge){const cls=`cc-status ${on?'cc-online':'cc-offline'}`,txt=on?'● ÇEVRİMİÇİ':'○ ÇEVRİMDIŞI';if(badge.className!==cls)badge.className=cls;if(badge.textContent!==txt)badge.textContent=txt}
  }
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
