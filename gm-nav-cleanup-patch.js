const GNC_APP=document.querySelector('#app');
if(!GNC_APP)throw new Error('GM navigasyon temizliği başlatılamadı.');

const gncTxt=e=>String(e?.textContent||'').trim();
const gncIsGM=()=>gncTxt(GNC_APP.querySelector('.role'))==='GM';
const gncSheet=()=>!gncIsGM()&&GNC_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab==='sheet';
let gncQueued=false;

if(!document.querySelector('#gnc-player-rest-style')){
  const s=document.createElement('style');s.id='gnc-player-rest-style';s.textContent=`
  #app main.ps-player-sheet section.hero{padding:16px!important;gap:14px!important;border-radius:16px!important}
  #app main.ps-player-sheet section.hero h1{font-size:clamp(1.55rem,2.6vw,2.25rem)!important;line-height:1.08!important;margin:.05em 0 .16em!important}
  #app main.ps-player-sheet section.hero>div:first-child>p{font-size:.88rem!important;line-height:1.35!important;margin:.16rem 0!important}
  #app main.ps-player-sheet section.hero .vitals{min-width:250px!important;gap:7px!important}
  #app main.ps-player-sheet section.hero .vital{padding:9px 10px!important;border-radius:11px!important;min-width:0!important}
  #app main.ps-player-sheet section.hero .vital span{font-size:.62rem!important}
  #app main.ps-player-sheet section.hero .vital b{font-size:1.3rem!important}
  #app main.ps-player-sheet .qol-rest{display:flex!important;align-items:center!important;gap:7px!important;flex-wrap:wrap!important;margin-top:9px!important}
  #app main.ps-player-sheet .qol-rest button{min-height:38px!important;padding:8px 12px!important;border-color:#866b39!important;background:linear-gradient(135deg,#201a0e,#151510)!important;color:#f4d584!important;font-size:.88rem!important;font-weight:900!important}
  #app main.ps-player-sheet .qol-rest span{font-size:.74rem!important;line-height:1.3!important;color:var(--muted)!important}
  @media(max-width:1050px){#app main.ps-player-sheet section.hero .vitals{min-width:0!important}}
  @media(max-width:700px){#app main.ps-player-sheet section.hero{padding:13px!important}#app main.ps-player-sheet .qol-rest{align-items:stretch!important}#app main.ps-player-sheet .qol-rest button,#app main.ps-player-sheet .qol-rest span{width:100%!important}}
  `;document.head.appendChild(s)
}

function gncEnsureRest(){
  if(!gncSheet())return;
  GNC_APP.querySelectorAll('main .cc-character-stack').forEach(st=>{
    const hero=st.querySelector('section.hero'),hp=hero?.querySelector('[data-a="hp"][data-id]'),lead=hero?.querySelector(':scope > div:first-child');
    if(!hero||!hp||!lead)return;
    let box=st.querySelector('[data-qol-rest]');
    if(!box){box=document.createElement('div');box.className='qol-rest';box.dataset.qolRest='1';lead.appendChild(box)}
    else if(box.parentElement!==lead)lead.appendChild(box);
  })
}
function gncClean(){gncQueued=false;if(gncIsGM())GNC_APP.querySelectorAll('.nav [data-ccr-hub]').forEach(x=>x.remove());else gncEnsureRest()}
function gncSchedule(){if(gncQueued)return;gncQueued=true;requestAnimationFrame(gncClean)}
new MutationObserver(gncSchedule).observe(GNC_APP,{childList:true,subtree:true});
setInterval(gncClean,1200);
setTimeout(gncClean,80);
window.__catlakGmNavCleanupTest={clean:gncClean,ensureRest:gncEnsureRest};
