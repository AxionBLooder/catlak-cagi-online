const SSP_APP=document.querySelector('#app');
if(!SSP_APP)throw new Error('Site stabilite katmanı başlatılamadı.');

const sspTxt=e=>String(e?.textContent||'').trim();
const sspRole=()=>sspTxt(SSP_APP.querySelector('.role'))||'anon';
let sspSuppressed=0;

function sspViewKey(){
  const role=sspRole();
  if(window.__catlakBattleRoomOpen===true)return role+':battle-room';
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

if(!window.__catlakSiteMainStabilityInstalled){
  const desc=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  if(desc?.get&&desc?.set){
    const lastByView=new Map();
    Object.defineProperty(Element.prototype,'innerHTML',{
      configurable:desc.configurable,
      enumerable:desc.enumerable,
      get:desc.get,
      set:function(value){
        const main=SSP_APP.querySelector('main');
        if(this===main&&typeof value==='string'){
          const key=sspViewKey();
          const sameView=this.dataset.sspStableView===key;
          const sameBase=lastByView.get(key)===value;
          if(sameView&&sameBase&&this.childElementCount>0){
            sspSuppressed++;
            window.__catlakSiteRenderSuppressed=sspSuppressed;
            return;
          }
          const out=desc.set.call(this,value);
          this.dataset.sspStableView=key;
          lastByView.set(key,value);
          return out;
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
    #app main .br3-card,#app main .ccr-weapon,#app main .gmt-combatant,#app main .gmt-slot{animation:none!important}
    #app main[data-ssp-stable-view]{overflow-anchor:auto}
  `;
  document.head.appendChild(s);
}

window.__catlakSiteStabilityTest={
  viewKey:sspViewKey,
  suppressed:()=>window.__catlakSiteRenderSuppressed||0
};
