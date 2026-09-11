const GMCR_APP=document.getElementById('app');
if(!GMCR_APP)throw new Error('GM Merkezi yönlendiricisi başlatılamadı.');

let gmcrLastRoute='';
let gmcrLastAt=0;

function gmcrIsGM(){return String(GMCR_APP.querySelector('.role')?.textContent||'').trim()==='GM'}
function gmcrButton(target){return target?.closest?.('#app [data-gm2-route]')||null}

window.addEventListener('pointerdown',e=>{
  const button=gmcrButton(e.target);
  if(!button||!gmcrIsGM())return;
  e.stopImmediatePropagation();
},true);

window.addEventListener('click',e=>{
  const button=gmcrButton(e.target);
  if(!button||!gmcrIsGM())return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const route=String(button.dataset.gm2Route||'');
  if(!route)return;

  const now=performance.now();
  if(route===gmcrLastRoute&&now-gmcrLastAt<180)return;
  gmcrLastRoute=route;
  gmcrLastAt=now;

  const go=window.__catlakGmHubV2Test?.route;
  if(typeof go==='function'){
    go(route);
    return;
  }

  let tries=0;
  const retry=()=>{
    const fn=window.__catlakGmHubV2Test?.route;
    if(typeof fn==='function'){
      fn(route);
      return;
    }
    if(++tries<12)setTimeout(retry,20);
  };
  retry();
},true);

window.__catlakGmCenterRouterCore={
  active:true,
  reset:()=>{gmcrLastRoute='';gmcrLastAt=0}
};
