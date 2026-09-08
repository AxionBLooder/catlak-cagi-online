(async()=>{
  const app=document.querySelector('#app');
  const fail=(e)=>{
    console.error(e);
    if(app) app.innerHTML='<main style="padding:30px"><h1>Çatlak Çağı</h1><p>Site yüklenemedi: '+String(e?.message||e)+'</p></main>';
  };
  try{
    await import('./bundle.js?v=30');
    await import('./ui-patch.js?v=30');
    await import('./world-patch.js?v=30');
  }catch(e){fail(e)}
})();
