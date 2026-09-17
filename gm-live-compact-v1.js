(function(){
'use strict';
if(window.__catlakGmLiveCompactV1)return;window.__catlakGmLiveCompactV1=true;
const APP=document.querySelector('#app');if(!APP)return;
const st=document.createElement('style');st.id='glc-style';st.textContent=`
@media(min-width:1050px){
 #app main[data-cc-simple-live="1"]{max-width:1780px!important;padding:14px 18px!important}
 #app main[data-cc-simple-live="1"]>.card{padding:12px 14px!important;margin-bottom:10px!important}
 #app main[data-cc-simple-live="1"]>.card h1{font-size:1.55rem!important;margin:.12em 0!important}
 #app main[data-cc-simple-live="1"]>.card>p.muted{display:none!important}
 #app main[data-cc-simple-live="1"] .cc-live-two{grid-template-columns:minmax(0,1.55fr) minmax(240px,.45fr)!important;gap:10px!important;margin-bottom:10px!important}
 #app main[data-cc-simple-live="1"] .cc-live-two>.card{padding:11px 13px!important;margin:0!important;max-height:34vh;overflow:auto}
 #app main[data-cc-simple-live="1"] .cc-live-two h2{font-size:1rem!important;margin:.15em 0 .35em!important}
 #app main[data-cc-simple-live="1"] .cc-simple-roll{grid-template-columns:34px minmax(0,1fr) auto!important;gap:6px!important;padding:3px 0!important;align-items:center!important}
 #app main[data-cc-simple-live="1"] .cc-simple-total{font-size:.88rem!important;line-height:1!important;min-width:28px!important}
 #app main[data-cc-simple-live="1"] .cc-simple-roll b{font-size:.78rem!important;line-height:1.2!important}
 #app main[data-cc-simple-live="1"] .cc-simple-roll small{font-size:.65rem!important;line-height:1.2!important}
 #app main[data-cc-simple-live="1"] .cc-simple-player{padding:6px 0!important}
 #app main[data-cc-simple-live="1"] .lcc-board{margin-top:8px!important}
 #app main[data-cc-simple-live="1"] .lcc-columns{grid-template-columns:minmax(260px,.9fr) minmax(300px,1.05fr) minmax(280px,.95fr)!important;gap:10px!important}
 #app main[data-cc-simple-live="1"] .lcc-col{padding:11px 12px!important;margin:0!important;max-height:46vh;overflow:auto}
 #app main[data-cc-simple-live="1"] .lcc-head{margin-bottom:6px!important}
 #app main[data-cc-simple-live="1"] .lcc-col h2{font-size:1rem!important;margin:.15em 0 .3em!important}
 #app main[data-cc-simple-live="1"] .lcc-toolbar{gap:5px!important}
 #app main[data-cc-simple-live="1"] .lcc-toolbar label{font-size:.72rem!important;gap:3px!important}
 #app main[data-cc-simple-live="1"] .lcc-toolbar input,#app main[data-cc-simple-live="1"] .lcc-toolbar select,#app main[data-cc-simple-live="1"] .lcc-toolbar textarea{padding:6px 7px!important;font-size:.78rem!important}
 #app main[data-cc-simple-live="1"] .lcc-toolbar textarea{min-height:48px!important}
 #app main[data-cc-simple-live="1"] .lcc-actions{margin-top:5px!important;gap:4px!important}
 #app main[data-cc-simple-live="1"] .lcc-actions button,#app main[data-cc-simple-live="1"] .lcc-toolbar button{padding:6px 8px!important;font-size:.75rem!important}
 #app main[data-cc-simple-live="1"] .lcc-combatant{padding:7px!important;margin-top:5px!important}
 #app main[data-cc-simple-live="1"] .lcc-combatant-top{grid-template-columns:34px minmax(0,1fr) auto!important;gap:6px!important}
 #app main[data-cc-simple-live="1"] .lcc-init{font-size:1rem!important}
 #app main[data-cc-simple-live="1"] .lcc-mini{font-size:.68rem!important}
 #app main[data-cc-simple-live="1"] .lcc-cond{padding:6px 0!important}
}
`;document.head.appendChild(st);
})();