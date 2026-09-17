(function(){
  if(window.__catlakStatEditorHardfixInstalled)return;
  window.__catlakStatEditorHardfixInstalled=true;

  const INPUT_SEL='#app [data-cux-editor] input[data-cux-field]';
  const STEP_SEL='#app [data-cux-editor] [data-cux-step][data-cux-delta]';
  const EDITOR_SEL='#app [data-cux-editor]';
  const CHARACTER_SEL='#app main .cux-character-btn[data-cux-character],#app main [data-cux-character]';
  const LIST_SEL='#app main .cux-character-list';
  let lastStepButton=null,lastStepAt=0;
  let characterToken=0;

  function closest(target,selector){
    return target&&typeof target.closest==='function'?target.closest(selector):null;
  }
  function lock(){
    window.__catlakStatEditLockUntil=Date.now()+30000;
  }
  function enable(input){
    if(!input)return null;
    input.disabled=false;
    input.readOnly=false;
    input.removeAttribute('disabled');
    input.removeAttribute('readonly');
    input.tabIndex=0;
    input.style.pointerEvents='auto';
    input.style.touchAction='manipulation';
    return input;
  }
  function focusInput(input){
    input=enable(input);if(!input)return;
    lock();
    try{
      const api=window.__catlakStatsTest;
      if(api&&typeof api.focus==='function')api.focus(input);
      else input.focus({preventScroll:true});
    }catch(_){try{input.focus()}catch(__){}}
  }
  function stepInput(btn){
    if(!btn)return;
    const now=performance.now();
    if(btn===lastStepButton&&now-lastStepAt<420)return;
    lastStepButton=btn;lastStepAt=now;lock();
    try{
      const api=window.__catlakStatsTest;
      if(api&&typeof api.step==='function'){api.step(btn);return}
    }catch(_){ }
    const editor=closest(btn,'[data-cux-editor]');if(!editor)return;
    const key=String(btn.dataset.cuxStep||'');
    const input=editor.querySelector('[data-cux-field="'+CSS.escape(key)+'"]');if(!input)return;
    enable(input);
    const delta=Number(btn.dataset.cuxDelta||0),min=Number(input.min),max=Number(input.max);
    let next=Number(input.value||0)+delta;
    if(Number.isFinite(min))next=Math.max(min,next);
    if(Number.isFinite(max))next=Math.min(max,next);
    input.value=String(next);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    focusInput(input);
  }
  function normalize(root=document){
    root.querySelectorAll?.(INPUT_SEL).forEach(enable);
  }

  function characterFromPoint(x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    const list=document.querySelector(LIST_SEL);if(!list)return null;
    const lr=list.getBoundingClientRect();
    if(x<lr.left||x>lr.right||y<lr.top||y>lr.bottom)return null;
    const buttons=list.querySelectorAll('[data-cux-character]');
    for(const btn of buttons){
      const r=btn.getBoundingClientRect();
      if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return btn;
    }
    return null;
  }
  function characterFromEvent(e){
    return closest(e&&e.target,CHARACTER_SEL)||characterFromPoint(Number(e&&e.clientX),Number(e&&e.clientY));
  }
  function currentEditorId(){
    return String(document.querySelector('#app main [data-cux-editor]')?.dataset?.cuxEditor||'');
  }
  function currentSelectedId(){
    try{return String(window.__catlakStatsTest?.selected?.()||'')}catch(_){return''}
  }
  function statWorkshopOpen(){
    return !!document.querySelector('#app main .cux-workshop .cux-character-list');
  }
  function forceCharacter(id){
    id=String(id||'');
    if(!id||!statWorkshopOpen())return false;
    const token=++characterToken;
    const statTab=document.querySelector('#app .nav [data-cc-stats-tab]');
    if(statTab&&!statTab.classList.contains('on'))statTab.classList.add('on');

    const apply=async(attempt)=>{
      if(token!==characterToken||!statWorkshopOpen())return;
      const api=window.__catlakStatsTest;
      if(!api||typeof api.select!=='function'){
        if(attempt<12)setTimeout(()=>apply(attempt+1),25);
        return;
      }
      try{api.select(id)}catch(err){console.warn('STAT_EARLY_SELECT',err)}
      await new Promise(resolve=>requestAnimationFrame(resolve));
      if(token!==characterToken)return;
      if(currentSelectedId()===id&&currentEditorId()===id)return;
      if(typeof api.render==='function'){
        try{await Promise.resolve(api.render(true))}catch(err){console.warn('STAT_EARLY_RENDER',err)}
        if(token!==characterToken)return;
        try{api.select(id)}catch(err){console.warn('STAT_EARLY_RESELECT',err)}
      }
      await new Promise(resolve=>requestAnimationFrame(resolve));
      if(token!==characterToken)return;
      if((currentSelectedId()!==id||currentEditorId()!==id)&&attempt<4)setTimeout(()=>apply(attempt+1),45);
    };
    apply(0);
    return true;
  }
  function interceptCharacter(e){
    if(e.button!=null&&e.button!==0)return false;
    const btn=characterFromEvent(e);if(!btn)return false;
    const id=String(btn.dataset.cuxCharacter||'');if(!id)return false;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    forceCharacter(id);
    return true;
  }

  const oldStyle=document.querySelector('#cc-stat-editor-hardfix-style');
  oldStyle?.remove();
  const style=document.createElement('style');
  style.id='cc-stat-editor-hardfix-style';
  style.textContent=`
    #app main .cux-workshop{isolation:isolate!important}
    #app main .cux-workshop>aside{position:relative!important;z-index:30!important;pointer-events:auto!important;min-width:0!important}
    #app main .cux-character-list{position:relative!important;z-index:31!important;pointer-events:auto!important}
    #app main .cux-character-btn,#app main .cux-character-btn *{pointer-events:auto!important}
    #app main .cux-character-btn{position:relative!important;z-index:32!important;cursor:pointer!important;touch-action:manipulation!important}
    #app main .cux-editor{position:sticky!important;z-index:2!important;isolation:isolate!important;min-width:0!important}
    #app main .cux-number-control{position:relative!important;z-index:2!important}
    #app main .cux-number-control input{position:relative!important;z-index:3!important;pointer-events:auto!important;cursor:text!important;user-select:text!important;-webkit-user-select:text!important;touch-action:manipulation!important}
    #app main .cux-number-control button{position:relative!important;z-index:4!important;pointer-events:auto!important;cursor:pointer!important;touch-action:manipulation!important}
    #app main .cux-editor::before,#app main .cux-editor::after,#app main .cux-field::before,#app main .cux-field::after,#app main .cux-number-control::before,#app main .cux-number-control::after{pointer-events:none!important}
    @media(max-width:900px){#app main .cux-editor{position:static!important}}
  `;
  document.head.appendChild(style);

  // Bu dosya browser-app.js'den önce yüklenir. Karakter seçimi burada en erken capture katmanında tutulur.
  window.addEventListener('pointerdown',function(e){
    if(interceptCharacter(e))return;
    if(e.button!=null&&e.button!==0)return;
    const input=closest(e.target,INPUT_SEL);
    if(input){focusInput(input);e.stopImmediatePropagation();return}
    const step=closest(e.target,STEP_SEL);
    if(step){e.preventDefault();e.stopImmediatePropagation();stepInput(step)}
  },true);

  window.addEventListener('mousedown',function(e){
    if(interceptCharacter(e))return;
    if(e.button!=null&&e.button!==0)return;
    const input=closest(e.target,INPUT_SEL);
    if(input){focusInput(input);e.stopImmediatePropagation();return}
    const step=closest(e.target,STEP_SEL);
    if(step){e.preventDefault();e.stopImmediatePropagation();stepInput(step)}
  },true);

  window.addEventListener('click',function(e){
    if(interceptCharacter(e))return;
    const input=closest(e.target,INPUT_SEL);
    if(input){focusInput(input);e.stopImmediatePropagation();return}
    const step=closest(e.target,STEP_SEL);
    if(step){e.preventDefault();e.stopImmediatePropagation();stepInput(step)}
  },true);

  window.addEventListener('keydown',function(e){
    const input=closest(e.target,INPUT_SEL);if(!input)return;
    focusInput(input);
    e.stopImmediatePropagation();
  },true);

  window.addEventListener('beforeinput',function(e){
    const input=closest(e.target,INPUT_SEL);if(!input)return;
    focusInput(input);
    e.stopImmediatePropagation();
  },true);

  window.addEventListener('input',function(e){
    const input=closest(e.target,INPUT_SEL);if(!input)return;
    lock();enable(input);
  },true);

  window.addEventListener('change',function(e){
    const input=closest(e.target,INPUT_SEL);if(!input)return;
    lock();enable(input);
  },true);

  document.addEventListener('focusin',function(e){
    const input=closest(e.target,INPUT_SEL);if(input)focusInput(input);
  },true);

  new MutationObserver(function(records){
    for(const r of records)for(const n of r.addedNodes){if(n&&n.nodeType===1){if(n.matches?.(EDITOR_SEL)||n.querySelector?.(EDITOR_SEL))normalize(n.matches?.(EDITOR_SEL)?n.parentNode:n)}}
  }).observe(document.documentElement,{childList:true,subtree:true});

  normalize();
  window.__catlakStatEditorHardfix={focus:focusInput,step:stepInput,normalize,select:forceCharacter,locked:()=>Date.now()<Number(window.__catlakStatEditLockUntil||0)};
})();
