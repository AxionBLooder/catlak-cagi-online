(function(){
'use strict';
if(window.__catlakLiveCombatAnchorSafetyV1)return;
window.__catlakLiveCombatAnchorSafetyV1=true;

const nativeInsert=Element.prototype.insertAdjacentHTML;
if(nativeInsert.__catlakLiveCombatSafe)return;

function retryLiveCombat(){
  clearTimeout(retryLiveCombat.t);
  retryLiveCombat.t=setTimeout(function(){
    try{window.__catlakLiveCombatCenter?.render?.()}catch(_){ }
  },90);
}

function safeInsert(position,html){
  const liveAnchor=this?.classList?.contains?.('cc-live-two');
  const detached=position==='afterend'&&liveAnchor&&!this.parentNode;
  if(!detached)return nativeInsert.call(this,position,html);

  const fresh=document.querySelector('#app main .cc-live-two');
  if(fresh&&fresh.parentNode){
    return nativeInsert.call(fresh,position,html);
  }

  console.warn('CATLAK_LIVE_COMBAT_ANCHOR_REFRESH');
  retryLiveCombat();
  return undefined;
}

safeInsert.__catlakLiveCombatSafe=true;
Element.prototype.insertAdjacentHTML=safeInsert;
})();
