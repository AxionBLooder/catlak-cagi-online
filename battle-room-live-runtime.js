(()=>{
  if(window.__catlakBattleRoomLiveV1)return;
  window.__catlakBattleRoomLiveV1=true;
  const A=document.querySelector('#app');if(!A)return;
  const txt=e=>String(e?.textContent||'').trim();
  let tries=0,S=null,active=null,busy=false,queued=false,timer=0;

  if(!document.querySelector('#br-live-ready-style')){
    const st=document.createElement('style');st.id='br-live-ready-style';st.textContent=`
      #app main.br-live-ready-only > :not([data-br-live-ready]){display:none!important}
      #app main.br-live-ready-only [data-br-live-ready]{display:block!important;visibility:visible!important;opacity:1!important}
      #app [data-br-live-ready]{border:1px solid #315b79!important;background:linear-gradient(135deg,#0c2234,#071724 62%,#091925)!important;box-shadow:0 18px 48px #0006!important}
      #app [data-br-live-ready] .eyebrow{color:#59adff!important}
      #app [data-br-live-ready] h1{margin:.25rem 0 .45rem;color:#eef8ff!important}
    `;document.head.appendChild(st)
  }

  const isPlayer=()=>!!txt(A.querySelector('.role'))&&txt(A.querySelector('.role'))!=='GM';
  const battleView=()=>{
    const main=A.querySelector('main'),btn=A.querySelector('.nav [data-ccr-battle]');
    return isPlayer()&&(window.__catlakBattleRoomOpen===true||btn?.classList.contains('on')||main?.dataset.ccrBattle==='1');
  };
  function readyCard(){
    const s=document.createElement('section');s.className='card hero';s.dataset.brLiveReady='1';
    s.innerHTML='<div><div class="eyebrow">⚔ OYUNCU • SAVAŞ ODASI</div><h1>Savaşa Hazırlanıyor</h1><p class="muted">Şu anda aktif bir savaş yok. GM savaşı başlattığında bu oda otomatik olarak canlı savaşa geçecek.</p></div>';
    return s
  }
  function cleanupLegacy(main){
    main.querySelectorAll('[data-br3-turn],[data-br3-creatures],[data-br3-abilities],[data-br3-log],[data-br3-weapon-actions]').forEach(x=>x.remove())
  }
  function apply(){
    const main=A.querySelector('main');if(!main)return;
    if(!battleView()||active!==false){
      main.classList.remove('br-live-ready-only');
      main.querySelector('[data-br-live-ready]')?.remove();
      return
    }
    cleanupLegacy(main);
    let card=main.querySelector(':scope > [data-br-live-ready]');
    if(!card){card=readyCard();main.prepend(card)}
    main.classList.add('br-live-ready-only')
  }
  async function sync(){
    if(!S||!isPlayer())return;
    if(busy){queued=true;return}busy=true;
    try{
      const r=await S.rpc('catlak_player_combat_snapshot');if(r.error)throw r.error;
      active=!!r.data?.active;apply()
    }catch(e){console.warn('CATLAK_BATTLE_READY_SYNC',e)}finally{busy=false;if(queued){queued=false;setTimeout(sync,0)}}
  }
  function soon(ms=35){clearTimeout(timer);timer=setTimeout(sync,ms)}
  function boot(){
    S=window.__catlakSupabase;
    if(!S){if(tries++<300)setTimeout(boot,60);return}
    new MutationObserver(()=>{apply();if(battleView()&&active===null)soon(0)}).observe(A,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('pointerdown',e=>{if(e.target?.closest?.('[data-ccr-battle]'))soon(25)},true);
    S.channel('cc-battle-ready-live-v1').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>soon(20)).subscribe();
    setInterval(()=>{if(battleView())soon(0)},1400);
    soon(0)
  }
  boot();
  window.__catlakBattleRoomLive={sync:()=>soon(0),active:()=>active,apply}
})();
