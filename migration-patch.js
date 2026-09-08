const CC_MIG_S=window.__catlakSupabase;
const CC_MIG_APP=document.querySelector('#app');
const CC_MIG_OLD_ORIGIN='https://hidden-spring-7923.hosted.pageshare.ai';
const CC_MIG_NEW_ORIGIN='https://catlak-cagi-online.netlify.app';
const CC_MIG_NEW_BASE=CC_MIG_NEW_ORIGIN+'/';
let ccMigTargetWindow=null,ccMigPendingSession=null;

function ccMigText(el){return String(el?.textContent||'').trim()}
function ccMigIsGM(){return ccMigText(CC_MIG_APP?.querySelector('.role'))==='GM'}
function ccMigTab(){return CC_MIG_APP?.querySelector('.nav button.on')?.dataset.tab||''}
function ccMigToast(text){
  const t=document.querySelector('#toast');
  if(!t)return;
  t.textContent=text;t.classList.remove('hidden');
  clearTimeout(ccMigToast.timer);ccMigToast.timer=setTimeout(()=>t.classList.add('hidden'),5200);
}

function ccMigPrepareReceiver(){
  if(location.origin!==CC_MIG_NEW_ORIGIN||location.hash!=='#catlak-transfer')return;
  const receive=async(event)=>{
    if(event.origin!==CC_MIG_OLD_ORIGIN||event.source!==window.opener)return;
    if(event.data?.type!=='catlak-transfer-session')return;
    const access_token=event.data?.access_token,refresh_token=event.data?.refresh_token;
    if(!access_token||!refresh_token)return;
    try{
      const {error}=await CC_MIG_S.auth.setSession({access_token,refresh_token});
      if(error)throw error;
      window.removeEventListener('message',receive);
      try{window.opener?.postMessage({type:'catlak-transfer-complete'},CC_MIG_OLD_ORIGIN)}catch{}
      history.replaceState(null,'',location.pathname+location.search);
      location.reload();
    }catch(error){
      history.replaceState(null,'',location.pathname+location.search);
      ccMigToast('Oyuncu oturumu aktarılamadı: '+(error?.message||String(error)));
    }
  };
  window.addEventListener('message',receive);
  if(window.opener)window.opener.postMessage({type:'catlak-transfer-ready'},CC_MIG_OLD_ORIGIN);
}

async function ccMigOpenPermanent(){
  if(location.origin!==CC_MIG_OLD_ORIGIN)return;
  ccMigTargetWindow=window.open(CC_MIG_NEW_BASE+'#catlak-transfer','_blank');
  if(!ccMigTargetWindow)throw new Error('Yeni sekme açılamadı. Tarayıcı açılır pencereye izin vermeli.');
  const {data,error}=await CC_MIG_S.auth.getSession();
  if(error)throw error;
  const session=data?.session;
  if(!session?.access_token||!session?.refresh_token)throw new Error('Aktarılacak oyuncu oturumu bulunamadı.');
  ccMigPendingSession={access_token:session.access_token,refresh_token:session.refresh_token};
}

window.addEventListener('message',event=>{
  if(location.origin!==CC_MIG_OLD_ORIGIN||event.origin!==CC_MIG_NEW_ORIGIN||event.source!==ccMigTargetWindow)return;
  if(event.data?.type==='catlak-transfer-ready'&&ccMigPendingSession){
    ccMigTargetWindow.postMessage({type:'catlak-transfer-session',...ccMigPendingSession},CC_MIG_NEW_ORIGIN);
    return;
  }
  if(event.data?.type==='catlak-transfer-complete'){
    ccMigPendingSession=null;
    ccMigToast('Kalıcı site bağlantısı tamamlandı. Açılan Netlify sekmesini kullanabilirsin.');
  }
});

function ccMigEnsureButton(){
  if(location.origin!==CC_MIG_OLD_ORIGIN||ccMigIsGM()||ccMigTab()!=='sheet')return;
  const main=CC_MIG_APP?.querySelector('main');if(!main||main.querySelector('[data-cc-migrate]'))return;
  const card=main.querySelector('.cc-desk-intro')||main.querySelector('section.hero')||main.firstElementChild;if(!card)return;
  const box=document.createElement('div');box.className='cc-flow';box.style.marginTop='14px';box.dataset.ccMigrateBox='1';
  box.innerHTML='<button type="button" class="primary" data-cc-migrate="1">Kalıcı Siteye Geç</button><small class="muted">Karakterin, envanterin ve oyuncu oturumun aynı hesapla kalıcı Netlify sitesine aktarılır.</small>';
  card.appendChild(box);
}

CC_MIG_APP?.addEventListener('click',event=>{
  const button=event.target.closest('[data-cc-migrate]');if(!button)return;
  event.preventDefault();event.stopPropagation();
  ccMigOpenPermanent().catch(error=>ccMigToast(error?.message||String(error)));
},true);

ccMigPrepareReceiver();
new MutationObserver(ccMigEnsureButton).observe(CC_MIG_APP||document.body,{childList:true,subtree:true});
ccMigEnsureButton();
