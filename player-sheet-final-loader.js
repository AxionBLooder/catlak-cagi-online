(()=>{
  const A=document.querySelector('#app');if(!A)return;
  if(!document.querySelector('#psf-loader-blue-theme')){
    const s=document.createElement('style');s.id='psf-loader-blue-theme';s.textContent=`
      #app main.ps-player-sheet{--gold:#59adff!important;--accent:#59adff!important}
      #app main.ps-player-sheet .eyebrow,#app main.ps-player-sheet .section-title .eyebrow,#app main.ps-player-sheet [data-gmt-player-panel] .eyebrow{color:#59adff!important}
      #app main.ps-player-sheet [data-gmt-player-panel] .gmt-slot{border-color:#315b79!important;background:#091b29!important;box-shadow:none!important}
      #app main.ps-player-sheet [data-gmt-player-panel] .gmt-slot b{color:#59adff!important}
      #app main.ps-player-sheet .iw-player-item.on{border-color:#4e96d3!important;box-shadow:inset 0 0 0 1px #59adff2b,0 0 18px #2c78b81c!important}
      #app main.ps-player-sheet .actions button[data-a="equip"],#app main.ps-player-sheet .actions button[data-ws-remove],#app main.ps-player-sheet .actions [data-wlive-remove],#app main.ps-player-sheet .actions [data-psf-toggle],#app main.ps-player-sheet .actions [data-psf-equip],#app main.ps-player-sheet .actions [data-psf-remove],#app main.ps-player-sheet .actions [data-ws-controls]{display:none!important}
    `;document.head.appendChild(s)
  }
})();
