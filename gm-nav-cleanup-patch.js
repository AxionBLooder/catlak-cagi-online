const GNC_APP=document.querySelector('#app');
if(!GNC_APP)throw new Error('GM navigasyon temizliği başlatılamadı.');

const gncTxt=e=>String(e?.textContent||'').trim();
const gncIsGM=()=>gncTxt(GNC_APP.querySelector('.role'))==='GM';
let gncQueued=false;
function gncClean(){
  gncQueued=false;
  if(!gncIsGM())return;
  GNC_APP.querySelectorAll('.nav [data-ccr-hub]').forEach(x=>x.remove());
}
function gncSchedule(){if(gncQueued)return;gncQueued=true;requestAnimationFrame(gncClean)}
new MutationObserver(gncSchedule).observe(GNC_APP,{childList:true,subtree:true});
setInterval(gncClean,1200);
setTimeout(gncClean,80);
window.__catlakGmNavCleanupTest={clean:gncClean};
