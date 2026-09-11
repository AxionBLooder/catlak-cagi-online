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

window.__catlakSiteStabilityTest={
  viewKey:sspViewKey,
  suppressed:()=>window.__catlakSiteRenderSuppressed||0,
  freeze:sspFreeze,
  freezeReason:()=>window.__catlakUiFreezeReason||''
};
