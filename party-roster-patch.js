(function(){
  'use strict';
  if(window.__catlakPartyPlayerBridgeInstalled)return;
  window.__catlakPartyPlayerBridgeInstalled=true;

  const APP=document.querySelector('#app');
  const S=window.__catlakSupabase;
  if(!APP||!S)return;

  const PKEY='cc_party_member';
  const BKEY='cc_battle_member';
  const txt=e=>String(e?.textContent||'').trim();
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isGM=()=>txt(APP.querySelector('.role'))==='GM';
  const hasRole=()=>!!txt(APP.querySelector('.role'));

  let partyOpen=false;
  let accessBusy=false;
  let renderBusy=false;
  let queued=false;
  let lastAccessAt=0;
  let owned=[];
  let partyAllowed=false;
  let battleAllowed=false;

  if(!document.querySelector('#cpr-player-style')){
    const st=document.createElement('style');
    st.id='cpr-player-style';
    st.textContent=`
      #app .cpr-hidden{display:none!important}
      #app .cpr-player-shell{max-width:1450px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
      #app .cpr-party-roster{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}
      #app .cpr-member{border:1px solid var(--line);border-radius:14px;padding:13px;background:#08131e}
      #app .cpr-member.self{border-color:#4a849d;background:#0c1d29}
      #app .cpr-pills{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
      #app .cpr-pill{font-size:.7rem;border:1px solid var(--line);border-radius:999px;padding:4px 8px;color:var(--muted)}
      #app .cpr-pill.on{border-color:#6d7e52;color:#cde9a8;background:#142018}
      #app .cpr-profile{border:1px solid #4d496c;border-radius:12px;padding:10px;margin-top:9px;background:#0b1320}
      #app .cpr-hero{background:linear-gradient(135deg,#10283a,#0b1724 55%,#21172a)!important}
    `;
    document.head.appendChild(st);
  }

  function nav(){return APP.querySelector('.nav')}
  function selectOnly(btn){const n=nav();if(!n)return;n.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));btn?.classList.add('on')}

  function injectPlayerNav(){
    const n=nav();if(!n||!hasRole())return;
    if(isGM()){
      n.querySelector('[data-cpr-party]')?.remove();
      return;
    }
    let pb=n.querySelector('[data-cpr-party]');
    if(partyAllowed){
      if(!pb){
        pb=document.createElement('button');pb.type='button';pb.dataset.cprParty='1';pb.textContent='◆ Parti Odası';
        const battle=n.querySelector('[data-ccr-battle]');battle?battle.before(pb):n.prepend(pb);
      }
      pb.classList.toggle('on',partyOpen);
    }else pb?.remove();

    const battle=n.querySelector('[data-ccr-battle]');
    if(battle)battle.classList.toggle('cpr-hidden',!battleAllowed);
  }

  async function refreshAccess(force=false){
    if(isGM()||accessBusy||!hasRole())return;
    if(!force&&Date.now()-lastAccessAt<3500)return;
    accessBusy=true;
    try{
      const gs=await S.auth.getSession();
      const uid=gs.data?.session?.user?.id||null;
      if(!uid){owned=[];partyAllowed=false;battleAllowed=false;return}
      const q=await S.from('catlak_characters').select('id,name,data,owner_id,play_status').eq('owner_id',uid).eq('play_status','active');
      if(q.error)throw q.error;
      owned=q.data||[];
      partyAllowed=owned.some(c=>c.data?.[PKEY]===true);
      battleAllowed=owned.some(c=>c.data?.[BKEY]===true);
      lastAccessAt=Date.now();
    }catch(e){console.warn('CPR_PLAYER_ACCESS',e)}finally{accessBusy=false;injectPlayerNav()}
  }

  async function allCharacters(){
    const r=await S.from('catlak_characters').select('id,name,species_name,class_name,level,hp_current,hp_max,base_ac,base_speed,data,owner_id,play_status,created_at').in('play_status',['active','prepared']).order('created_at',{ascending:true});
    if(r.error)throw r.error;return r.data||[];
  }

  function profileHtml(c){
    const p=c.data?.cc_profile;if(!p)return'';
    const traits=Array.isArray(p.traits)?p.traits:[];
    return `<div class="cpr-profile"><div class="eyebrow">${esc(p.title||c.data?.cc_role||c.class_name||'Karakter')}</div>${p.summary?`<div class="muted">${esc(p.summary)}</div>`:''}${traits.length?`<div class="cpr-pills">${traits.map(x=>`<span class="cpr-pill">${esc(x)}</span>`).join('')}</div>`:''}</div>`;
  }

  async function renderParty(){
    if(isGM()||!partyOpen||renderBusy)return;
    renderBusy=true;
    try{
      await refreshAccess(true);
      if(!partyAllowed){partyOpen=false;injectPlayerNav();return}
      const chars=await allCharacters();
      const members=chars.filter(c=>c.data?.[PKEY]===true);
      const mine=new Set(owned.map(c=>String(c.id)));
      const main=APP.querySelector('main');if(!main||!partyOpen)return;
      main.innerHTML=`<div class="cpr-player-shell" data-cpr-party-page><section class="card cpr-hero"><div class="eyebrow">◆ PARTİ ODASI</div><h1>Aktif Parti</h1><p class="muted">GM'nin bu oturum için seçtiği karakterler.</p></section><section class="card"><div class="eyebrow">PARTİ ÜYELERİ</div><h2>${members.length} Karakter</h2><div class="cpr-party-roster">${members.map(c=>`<article class="cpr-member ${mine.has(String(c.id))?'self':''}"><div class="eyebrow">${mine.has(String(c.id))?'SENİN KARAKTERİN':c.data?.cc_companion?'YARDIMCI KARAKTER':'PARTİ ÜYESİ'}</div><h3>${esc(c.name)}</h3><div class="muted">${esc(c.species_name||'')} • ${esc(c.data?.cc_role||c.class_name||'')} • Seviye ${Number(c.level||1)}</div><div class="cpr-pills"><span class="cpr-pill on">HP ${Number(c.hp_current||0)}/${Number(c.hp_max||0)}</span><span class="cpr-pill">AC ${Number(c.base_ac||0)}</span></div>${profileHtml(c)}</article>`).join('')||'<div class="empty">Parti üyesi seçilmedi.</div>'}</div></section></div>`;
      selectOnly(nav()?.querySelector('[data-cpr-party]'));
    }catch(e){console.warn('CPR_PARTY_RENDER',e)}finally{renderBusy=false}
  }

  async function syncCombat(){
    if(!isGM())return;
    try{
      const state=await S.from('catlak_combat_state').select('*').eq('id',1).maybeSingle();
      if(state.error||!state.data?.active)return;
      const [chars,combat]=await Promise.all([
        S.from('catlak_characters').select('id,data,play_status').eq('play_status','active'),
        S.from('catlak_combatants').select('id,character_id')
      ]);
      if(chars.error||combat.error)return;
      const selected=(chars.data||[]).filter(c=>c.data?.[BKEY]===true);
      const present=new Set((combat.data||[]).filter(x=>x.character_id).map(x=>String(x.character_id)));
      for(const c of selected){
        if(present.has(String(c.id)))continue;
        const r=await S.rpc('catlak_gm_combat_add_character',{p_character_id:c.id,p_initiative:null});
        if(r.error)console.warn('CPR_COMBAT_ADD',r.error);
      }
    }catch(e){console.warn('CPR_COMBAT_SYNC',e)}
  }

  APP.addEventListener('click',e=>{
    const pb=e.target.closest?.('[data-cpr-party]');
    if(pb&&!isGM()){
      e.preventDefault();e.stopImmediatePropagation();partyOpen=true;window.__catlakBattleRoomOpen=false;renderParty();return;
    }
    const other=e.target.closest?.('.nav button:not([data-cpr-party])');
    if(other)partyOpen=false;
  },true);

  function maintain(){
    queued=false;
    if(isGM())return;
    refreshAccess(false);
    injectPlayerNav();
    if(partyOpen&&!APP.querySelector('[data-cpr-party-page]'))renderParty();
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(maintain)}
  new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});

  try{
    S.channel('cpr-player-access-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{lastAccessAt=0;refreshAccess(true);if(partyOpen)renderParty()}).subscribe();
  }catch(_){ }

  setTimeout(maintain,600);
  window.__catlakPartyRoster={refreshAccess,renderParty,syncCombat,playerOnly:true};
})();
