const CC_GMCTRL_APP=document.querySelector('#app');
if(!CC_GMCTRL_APP)throw new Error('GM kontrol uyumluluk katmanı başlatılamadı.');

// KP ve kişiye özel durum yönetimi artık Canlı Oyun'da gösterilmez.
// Bu takip Mühür Odası / ilgili GM odalarında tutulur. Eski sürümden DOM'da
// kalmış bir panel varsa da temizlenir.
function ccGmControlsCleanup(){
  CC_GMCTRL_APP.querySelectorAll('[data-cc-gm-controls],.cc-gm-controls').forEach(x=>x.remove());
}

let ccGmControlsQueued=false;
function ccGmControlsSchedule(){
  if(ccGmControlsQueued)return;
  ccGmControlsQueued=true;
  requestAnimationFrame(()=>{ccGmControlsQueued=false;ccGmControlsCleanup()});
}

new MutationObserver(ccGmControlsSchedule).observe(CC_GMCTRL_APP,{childList:true,subtree:true});
ccGmControlsCleanup();
window.__catlakGmControlsLivePanelDisabled=true;