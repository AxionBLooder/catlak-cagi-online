const SSP_APP=document.querySelector('#app');
if(!SSP_APP)throw new Error('Site stabilite katmanı başlatılamadı.');

const sspTxt=e=>String(e?.textContent||'').trim();
const sspRole=()=>sspTxt(SSP_APP.querySelector('.role'))||'anon';
let sspSuppressed=0,sspFreezeUntil=Number(window.__catlakUiFreezeUntil)||0,sspFreezeY=null,sspFreezeReason='';

function sspViewKey(){
  const role=sspRole();
  if(window.__catlakBattleRoomOpen===true)return role+':battle-room';
  if(window.__catlakGmHubOwnsMain===true)return role+':gm-hub';
  if(window.__catlakGmToolsOpen===true){
    const sub=SSP_APP.querySelector('.gmt-tabs button.on');
    return role+':gm-tools:'+(sub?.dataset.gmtSub||sspTxt(sub)||'main');
  }
  const nav=SSP_APP.querySelector('.nav button.on');
  if(!nav)return role+':unknown';
  const bits=[
    nav.dataset.tab,
    nav.dataset.gmtOpen?'gm-center':'',
    nav.dataset.ccrBattle?'battle':'',
    nav.dataset.ccrHub?'hub':'',
    nav.dataset.ccMapTab?'map':'',
    nav.dataset.ccWorldTab?'world':'',
    nav.dataset.ccStatsTab?'stats':''
  ].filter(Boolean);
  return role+':'+(bits.join(':')||sspTxt(nav)||'view');
}
function sspCustomOwnsView(){return window.__catlakBattleRoomOpen===true||window.__catlakGmToolsOpen===true||window.__catlakGmHubOwnsMain===true}
function sspIsAuthHtml(value){return typeof value==='string'&&(value.includes('class="auth"')||value.includes("class='auth'"))}
function sspRestoreY(y){if(!Number.isFinite(Number(y)))return;requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:Number(y),left:0,behavior:'auto'})))}
function sspSuppress(){sspSuppressed++;window.__catlakSiteRenderSuppressed=sspSuppressed}
function sspFreeze(ms=1200,reason='ui'){
  const until=Date.now()+Math.max(200,Number(ms)||1200);
  sspFreezeUntil=Math.max(sspFreezeUntil,until);window.__catlakUiFreezeUntil=sspFreezeUntil;
  sspFreezeY=window.scrollY;window.__catlakUiFreezeScrollY=sspFreezeY;
  sspFreezeReason=String(reason||'ui');window.__catlakUiFreezeReason=sspFreezeReason;
  return sspFreezeUntil;
}
window.__catlakStabilityFreeze=sspFreeze;

if(!window.__catlakSiteMainStabilityInstalled){
  const desc=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  if(desc?.get&&desc?.set){
    const lastMainByView=new Map(),lastAppByView=new Map();
    Object.defineProperty(Element.prototype,'innerHTML',{
      configurable:desc.configurable,
      enumerable:desc.enumerable,
      get:desc.get,
      set:function(value){
        if(typeof value!=='string')return desc.set.call(this,value);
        const now=Date.now(),main=SSP_APP.querySelector('main'),key=sspViewKey();
        if(this===SSP_APP){
          const auth=sspIsAuthHtml(value),freeze=Math.max(sspFreezeUntil,Number(window.__catlakUiFreezeUntil)||0)>now;
          if(this.childElementCount>0&&!auth&&(sspCustomOwnsView()||freeze)){
            sspSuppress();if(freeze)sspRestoreY(sspFreezeY??window.__catlakUiFreezeScrollY);return;
          }
          if(this.childElementCount>0&&lastAppByView.get(key)===value){sspSuppress();return}
          const y=window.scrollY,out=desc.set.call(this,value);lastAppByView.set(key,value);
          if(!auth)sspRestoreY(y);return out;
        }
        if(this===main){
          const sameView=this.dataset.sspStableView===key;
          const sameBase=lastMainByView.get(key)===value;
          if(sameView&&sameBase&&this.childElementCount>0){sspSuppress();return}
          const y=window.scrollY,out=desc.set.call(this,value);
          this.dataset.sspStableView=key;lastMainByView.set(key,value);sspRestoreY(y);return out;
        }
        return desc.set.call(this,value);
      }
    });
    window.__catlakSiteMainStabilityInstalled=true;
  }
}

if(!document.querySelector('#ssp-stability-style')){
  const s=document.createElement('style');
  s.id='ssp-stability-style';
  s.textContent=`
    #app main .br3-card,#app main .ccr-weapon,#app main .gmt-combatant,#app main .gmt-slot,#app main .roll,#app main .iw-player-item,#app main [data-gfs-live-turn]{animation:none!important}
    #app main[data-ssp-stable-view]{overflow-anchor:auto}
    #app .cc-character-stack,#app main .gmt-shell,#app main .er-wrap{isolation:isolate}
  `;
  document.head.appendChild(s);
}

// Şifre kurtarma: giriş ekranına hafif bir kontrol ekler; oyun/GM render akışına dokunmaz.
if(!window.__catlakAuthRecoveryV1){
  window.__catlakAuthRecoveryV1=true;
  const AR_S=window.__catlakSupabase;
  const AR_REDIRECT=window.location.origin+window.location.pathname+'?recovery=1';
  const arToast=text=>{
    const t=document.querySelector('#toast');
    if(!t)return;
    t.textContent=String(text||'');t.classList.remove('hidden');
    clearTimeout(arToast.t);arToast.t=setTimeout(()=>t.classList.add('hidden'),5200);
  };
  const arInject=()=>{
    const card=SSP_APP.querySelector('main.auth .card');
    if(!card||card.querySelector('[data-cc-forgot-password]'))return;
    const authButton=card.querySelector('button[data-a="auth"]');
    if(!authButton)return;
    const b=document.createElement('button');
    b.type='button';b.dataset.ccForgotPassword='1';b.className='widebtn';
    b.style.marginTop='8px';b.textContent='Şifremi Unuttum';
    authButton.insertAdjacentElement('afterend',b);
  };
  const arShowReset=()=>{
    if(document.querySelector('[data-cc-password-recovery]'))return;
    const wrap=document.createElement('div');
    wrap.dataset.ccPasswordRecovery='1';
    wrap.style.cssText='position:fixed;inset:0;z-index:99999;background:#050a10e8;display:grid;place-items:center;padding:20px';
    wrap.innerHTML=`<section class="card" style="width:min(520px,100%);margin:0">
      <div class="eyebrow">HESAP KURTARMA</div>
      <h2>Yeni Şifreni Belirle</h2>
      <p class="muted">Yeni şifren en az 8 karakter olsun.</p>
      <label>Yeni şifre<input type="password" data-cc-new-password autocomplete="new-password"></label>
      <label style="margin-top:10px">Yeni şifre tekrar<input type="password" data-cc-new-password-2 autocomplete="new-password"></label>
      <button type="button" class="primary widebtn" data-cc-save-password>Yeni Şifreyi Kaydet</button>
      <button type="button" class="widebtn" data-cc-cancel-recovery>İptal</button>
    </section>`;
    document.body.appendChild(wrap);
  };
  document.addEventListener('click',async e=>{
    const forgot=e.target.closest?.('[data-cc-forgot-password]');
    if(forgot){
      e.preventDefault();e.stopPropagation();
      const email=String(document.querySelector('#aemail')?.value||'').trim();
      if(!email){arToast('Önce e-posta adresini yaz.');document.querySelector('#aemail')?.focus();return}
      forgot.disabled=true;forgot.textContent='Gönderiliyor…';
      try{
        const {error}=await AR_S.auth.resetPasswordForEmail(email,{redirectTo:AR_REDIRECT});
        if(error)throw error;
        arToast('Şifre sıfırlama bağlantısı e-postana gönderildi. Gelen kutusu ve spam klasörünü kontrol et.');
      }catch(err){arToast('Şifre sıfırlama gönderilemedi: '+(err?.message||String(err)))}
      finally{forgot.disabled=false;forgot.textContent='Şifremi Unuttum'}
      return;
    }
    const save=e.target.closest?.('[data-cc-save-password]');
    if(save){
      e.preventDefault();
      const p1=String(document.querySelector('[data-cc-new-password]')?.value||'');
      const p2=String(document.querySelector('[data-cc-new-password-2]')?.value||'');
      if(p1.length<8){arToast('Yeni şifre en az 8 karakter olmalı.');return}
      if(p1!==p2){arToast('İki şifre aynı değil.');return}
      save.disabled=true;save.textContent='Kaydediliyor…';
      try{
        const {error}=await AR_S.auth.updateUser({password:p1});
        if(error)throw error;
        arToast('Şifren değiştirildi. Yeni şifrenle tekrar giriş yapabilirsin.');
        await AR_S.auth.signOut();
        history.replaceState({},'',window.location.pathname);
        setTimeout(()=>location.reload(),700);
      }catch(err){arToast('Şifre değiştirilemedi: '+(err?.message||String(err)));save.disabled=false;save.textContent='Yeni Şifreyi Kaydet'}
      return;
    }
    if(e.target.closest?.('[data-cc-cancel-recovery]')){
      document.querySelector('[data-cc-password-recovery]')?.remove();
      history.replaceState({},'',window.location.pathname);
    }
  },true);
  const arObserver=new MutationObserver(()=>arInject());
  arObserver.observe(SSP_APP,{childList:true,subtree:true});
  arInject();
  AR_S.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')setTimeout(arShowReset,0)});
  if(new URLSearchParams(location.search).get('recovery')==='1'){
    AR_S.auth.getSession().then(({data})=>{if(data?.session)arShowReset()}).catch(()=>{});
  }
  window.__catlakAuthRecoveryTest={inject:arInject,showReset:arShowReset};
}

window.__catlakSiteStabilityTest={
  viewKey:sspViewKey,
  suppressed:()=>window.__catlakSiteRenderSuppressed||0,
  freeze:sspFreeze,
  freezeReason:()=>window.__catlakUiFreezeReason||''
};
