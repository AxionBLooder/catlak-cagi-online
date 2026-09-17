(function(){
  if(window.__catlakStatEditorHardfixInstalled)return;
  window.__catlakStatEditorHardfixInstalled=true;

  const INPUT_SEL='#app [data-cux-editor] input[data-cux-field]';
  const STEP_SEL='#app [data-cux-editor] [data-cux-step][data-cux-delta]';
  const EDITOR_SEL='#app [data-cux-editor]';
  let lastStepButton=null,lastStepAt=0;

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

  const oldStyle=document.querySelector('#cc-stat-editor-hardfix-style');
  oldStyle?.remove();
  const style=document.createElement('style');
  style.id='cc-stat-editor-hardfix-style';
  style.textContent=`
    #app main .cux-workshop{isolation:isolate!important}
    #app main .cux-workshop>aside{position:relative!important;z-index:10!important;pointer-events:auto!important;min-width:0!important}
    #app main .cux-character-list{position:relative!important;z-index:11!important;pointer-events:auto!important}
    #app main .cux-character-btn,#app main .cux-character-btn *{pointer-events:auto!important}
    #app main .cux-character-btn{position:relative!important;z-index:12!important;cursor:pointer!important;touch-action:manipulation!important}
    #app main .cux-editor{position:sticky!important;z-index:2!important;isolation:isolate!important;min-width:0!important}
    #app main .cux-number-control{position:relative!important;z-index:2!important}
    #app main .cux-number-control input{position:relative!important;z-index:3!important;pointer-events:auto!important;cursor:text!important;user-select:text!important;-webkit-user-select:text!important;touch-action:manipulation!important}
    #app main .cux-number-control button{position:relative!important;z-index:4!important;pointer-events:auto!important;cursor:pointer!important;touch-action:manipulation!important}
    #app main .cux-editor::before,#app main .cux-editor::after,#app main .cux-field::before,#app main .cux-field::after,#app main .cux-number-control::before,#app main .cux-number-control::after{pointer-events:none!important}
    @media(max-width:900px){#app main .cux-editor{position:static!important}}
  `;
  document.head.appendChild(style);

  window.addEventListener('pointerdown',function(e){
    if(e.button!=null&&e.button!==0)return;
    const input=closest(e.target,INPUT_SEL);
    if(input){focusInput(input);e.stopImmediatePropagation();return}
    const step=closest(e.target,STEP_SEL);
    if(step){e.preventDefault();e.stopImmediatePropagation();stepInput(step)}
  },true);

  window.addEventListener('mousedown',function(e){
    if(e.button!=null&&e.button!==0)return;
    const input=closest(e.target,INPUT_SEL);
    if(input){focusInput(input);e.stopImmediatePropagation();return}
    const step=closest(e.target,STEP_SEL);
    if(step){e.preventDefault();e.stopImmediatePropagation();stepInput(step)}
  },true);

  window.addEventListener('click',function(e){
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
  window.__catlakStatEditorHardfix={focus:focusInput,step:stepInput,normalize,locked:()=>Date.now()<Number(window.__catlakStatEditLockUntil||0)};
})();
