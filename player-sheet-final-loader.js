(()=>{
  const A=document.querySelector('#app');if(!A)return;
  if(!document.querySelector('#psf-loader-blue-theme')){
    const s=document.createElement('style');
    s.id='psf-loader-blue-theme';
    s.textContent=`
      #app main.ps-player-sheet{--gold:#59adff!important;--accent:#59adff!important}
      #app main.ps-player-sheet section.hero{border-color:#35698f!important;background:linear-gradient(135deg,#0c2234,#071724 60%,#091925)!important}
      #app main.ps-player-sheet .eyebrow,
      #app main.ps-player-sheet .section-title .eyebrow,
      #app main.ps-player-sheet [data-gmt-player-panel] .eyebrow{color:#59adff!important}
      #app main.ps-player-sheet .stat:hover{border-color:#59adff!important;box-shadow:inset 0 0 0 1px #59adff33!important}
      #app main.ps-player-sheet .stat strong,
      #app main.ps-player-sheet .stat b{color:#9bd1ff!important}
      #app main.ps-player-sheet [data-gmt-player-panel] .gmt-slot{border-color:#315b79!important;background:#091b29!important;box-shadow:none!important}
      #app main.ps-player-sheet [data-gmt-player-panel] .gmt-slot b{color:#59adff!important}
      #app main.ps-player-sheet [data-gmt-slot="main_weapon"],
      #app main.ps-player-sheet [data-gmt-slot="off_weapon"]{border-color:#315b79!important;background:#091b29!important;box-shadow:none!important}
      #app main.ps-player-sheet [data-gmt-slot="main_weapon"] b,
      #app main.ps-player-sheet [data-gmt-slot="off_weapon"] b{color:#59adff!important}
      #app main.ps-player-sheet .iw-player-item.on{border-color:#4e96d3!important;box-shadow:inset 0 0 0 1px #59adff2b,0 0 18px #2c78b81c!important}
      #app main.ps-player-sheet .ws-slot-badge{border-color:#3a6786!important;background:#0a1e2e!important;color:#bfe0f6!important}
      #app main.ps-player-sheet .ws-slot-controls button.ws-active{border-color:#59adff!important;background:#123a59!important;color:#d9efff!important;box-shadow:inset 0 0 0 1px #79bbff2e!important}
      #app main.ps-player-sheet section.hero .qol-rest button{border-color:#3d7dad!important;background:#0d2d45!important;color:#a7d7ff!important}
      #app main.ps-player-sheet [data-cc-party-visual-card]{border-color:#315f83!important;background:linear-gradient(180deg,#0b1a28,#07131f)!important}
      #app main.ps-player-sheet [data-cc-party-visual-card] .eyebrow:before{color:#59adff!important}
      #app main.ps-player-sheet .ps-combat-card{border-color:#3d7dad!important;background:linear-gradient(135deg,#0b2438,#081724)!important}
      #app main.ps-player-sheet .ps-turn-self{color:#9bd1ff!important}
      #app main.ps-player-sheet .roll .die{border-color:#3d7dad!important;background:#0b2d46!important;color:#a7d7ff!important}
    `;
    document.head.appendChild(s);
  }
  let tries=0;
  function boot(){
    if(window.__catlakPlayerSheetFinal){window.__catlakPlayerSheetFinal.layout?.();return}
    if(!window.__catlakSupabase){if(tries++<240)setTimeout(boot,75);return}
    if(document.querySelector('script[data-psfinal-runtime]'))return;
    const s=document.createElement('script');
    s.dataset.psfinalRuntime='1';
    s.src='./player-sheet-final-patch.js?v=psfinal-runtime-v2';
    s.async=false;
    s.onload=()=>setTimeout(()=>window.__catlakPlayerSheetFinal?.layout?.(),40);
    document.body.appendChild(s);
  }
  boot();
})();
