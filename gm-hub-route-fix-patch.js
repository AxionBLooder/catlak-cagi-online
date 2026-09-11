const GHFX_APP=document.querySelector('#app');
if(!GHFX_APP)throw new Error('GM Merkezi rota düzeltmesi başlatılamadı.');
let ghfxTimer=null;
document.addEventListener('pointerup',e=>{
  const b=e.target.closest?.('[data-gmh-route="ability"]');
  if(!b||String(GHFX_APP.querySelector('.role')?.textContent||'').trim()!=='GM'||window.__catlakGmToolsOpen===true)return;
  clearTimeout(ghfxTimer);
  ghfxTimer=setTimeout(()=>window.__catlakGmHubTest?.ability?.(),320);
},true);
window.__catlakGmHubRouteFixTest={openAbility:()=>window.__catlakGmHubTest?.ability?.()};
