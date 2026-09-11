const AWS_APP=document.querySelector('#app');
if(!AWS_APP)throw new Error('Yetenek Atölyesi seçim koruması başlatılamadı.');

const AWS_FIELDS=[
  '#abs-name','#abs-type','#abs-effect','#abs-target','#abs-formula',
  '#abs-attack-bonus','#abs-requires-attack','#abs-description',
  '#abs-give-char','#abs-give-ability','#abs-give-uses'
];
let awsState={},awsWrapped=false,awsRestoring=false;

function awsRead(){
  const next={};
  AWS_FIELDS.forEach(q=>{
    const el=AWS_APP.querySelector(q);
    if(el)next[q]=el.value;
  });
  if(Object.keys(next).length)awsState={...awsState,...next};
  return next;
}

function awsCanSet(el,value){
  if(!el)return false;
  if(el.tagName==='SELECT')return [...el.options].some(o=>String(o.value)===String(value));
  return true;
}

function awsRestore(snapshot=awsState){
  if(awsRestoring||!snapshot)return;
  awsRestoring=true;
  try{
    Object.entries(snapshot).forEach(([q,value])=>{
      const el=AWS_APP.querySelector(q);
      if(el&&awsCanSet(el,value)&&String(el.value)!==String(value))el.value=value;
    });
  }finally{awsRestoring=false}
}

function awsRememberEvent(e){
  const el=e.target;
  if(!el?.matches?.(AWS_FIELDS.join(',')))return;
  awsState['#'+el.id]=el.value;
}
document.addEventListener('input',awsRememberEvent,true);
document.addEventListener('change',awsRememberEvent,true);

function awsWrapRender(){
  if(awsWrapped||typeof window.absRenderGM!=='function')return false;
  const original=window.absRenderGM;
  window.absRenderGM=async function(...args){
    const current=awsRead();
    const snapshot={...awsState,...current};
    const activeId=document.activeElement?.id||'';
    const result=await original.apply(this,args);
    awsRestore(snapshot);
    if(activeId){const active=AWS_APP.querySelector('#'+CSS.escape(activeId));active?.focus?.({preventScroll:true})}
    return result;
  };
  awsWrapped=true;
  return true;
}

const awsObserver=new MutationObserver(()=>{
  if(AWS_APP.querySelector('[data-abs-workshop]'))queueMicrotask(()=>awsRestore());
  awsWrapRender();
});
awsObserver.observe(AWS_APP,{childList:true,subtree:true});

let awsAttempts=0;
const awsBoot=setInterval(()=>{
  awsWrapRender();
  if(AWS_APP.querySelector('[data-abs-workshop]'))awsRestore();
  if(awsWrapped||++awsAttempts>40)clearInterval(awsBoot);
},100);

setTimeout(()=>{awsWrapRender();awsRead()},350);
window.__catlakAbilityWorkshopStateTest={read:awsRead,restore:awsRestore,wrapped:()=>awsWrapped};
