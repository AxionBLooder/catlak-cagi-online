(function(){
'use strict';
if(window.__catlakGmLiveCompactV2)return;window.__catlakGmLiveCompactV2=true;
const APP=document.querySelector('#app');if(!APP)return;
const st=document.createElement('style');st.id='glc-style-v2';st.textContent=`
#app [data-gmc-route="characters"],#app [data-gm2-route="characters"]{display:none!important}
html body #app.gmc-gm .nav [data-tab="characters"]{display:inline-flex!important}
@media(min-width:1050px){
 #app main[data-cc-simple-live="1"]{max-width:1760px!important;padding:10px 14px!important}
 #app main[data-cc-simple-live="1"]>.card{padding:9px 11px!important;margin-bottom:8px!important}
 #app main[data-cc-simple-live="1"]>.card h1{font-size:1.28rem!important;margin:.08em 0!important}
 #app main[data-cc-simple-live="1"]>.card>p.muted{display:none!important}
 #app main[data-cc-simple-live="1"] .cc-live-two{grid-template-columns:minmax(0,1.65fr) minmax(220px,.35fr)!important;gap:8px!important;margin-bottom:8px!important;align-items:start!important}
 #app main[data-cc-simple-live="1"] .cc-live-two>.card{padding:7px 9px!important;margin:0!important;max-height:210px!important;overflow:auto!important}
 #app main[data-cc-simple-live="1"] .cc-live-two h2{font-size:.9rem!important;margin:.05em 0 .2em!important}
 #app main[data-cc-simple-live="1"] .cc-live-two .section-title{margin-bottom:3px!important}
 #app main[data-cc-simple-live="1"] .cc-simple-roll{grid-template-columns:26px minmax(0,1fr) 36px!important;gap:4px!important;padding:2px 0!important;min-height:24px!important;align-items:center!important}
 #app main[data-cc-simple-live="1"] .cc-simple-total{font-size:.72rem!important;line-height:1!important;min-width:20px!important}
 #app main[data-cc-simple-live="1"] .cc-simple-roll b{font-size:.68rem!important;line-height:1.05!important}
 #app main[data-cc-simple-live="1"] .cc-simple-roll span{font-size:.61rem!important;line-height:1.05!important}
 #app main[data-cc-simple-live="1"] .cc-simple-roll small{display:none!important}
 #app main[data-cc-simple-live="1"] .cc-simple-roll button{min-height:20px!important;padding:2px 4px!important;font-size:.56rem!important;line-height:1!important}
 #app main[data-cc-simple-live="1"] .cc-simple-player{padding:3px 0!important}
 #app main[data-cc-simple-live="1"] .cc-simple-player b{font-size:.68rem!important}
 #app main[data-cc-simple-live="1"] .lcc-board{margin-top:7px!important}
 #app main[data-cc-simple-live="1"] .lcc-columns{grid-template-columns:minmax(250px,.9fr) minmax(290px,1.05fr) minmax(270px,.95fr)!important;gap:8px!important}
 #app main[data-cc-simple-live="1"] .lcc-col{padding:8px 9px!important;margin:0!important;max-height:44vh;overflow:auto}
 #app main[data-cc-simple-live="1"] .lcc-head{margin-bottom:5px!important}
 #app main[data-cc-simple-live="1"] .lcc-col h2{font-size:.9rem!important;margin:.1em 0 .25em!important}
 #app main[data-cc-simple-live="1"] .lcc-toolbar{gap:4px!important}
 #app main[data-cc-simple-live="1"] .lcc-toolbar label{font-size:.68rem!important;gap:3px!important}
 #app main[data-cc-simple-live="1"] .lcc-toolbar input,#app main[data-cc-simple-live="1"] .lcc-toolbar select,#app main[data-cc-simple-live="1"] .lcc-toolbar textarea{padding:5px 6px!important;font-size:.72rem!important}
 #app main[data-cc-simple-live="1"] .lcc-toolbar textarea{min-height:42px!important}
 #app main[data-cc-simple-live="1"] .lcc-actions{margin-top:4px!important;gap:3px!important}
 #app main[data-cc-simple-live="1"] .lcc-actions button,#app main[data-cc-simple-live="1"] .lcc-toolbar button{padding:4px 6px!important;font-size:.66rem!important}
 #app main[data-cc-simple-live="1"] .lcc-combatant{padding:5px!important;margin-top:4px!important}
 #app main[data-cc-simple-live="1"] .lcc-combatant-top{grid-template-columns:30px minmax(0,1fr) auto!important;gap:5px!important}
 #app main[data-cc-simple-live="1"] .lcc-init{font-size:.88rem!important}
 #app main[data-cc-simple-live="1"] .lcc-mini{font-size:.62rem!important}
 #app main[data-cc-simple-live="1"] .lcc-cond{padding:5px 0!important}
}
@media(max-width:1049px){
 #app main[data-cc-simple-live="1"] .cc-live-two>.card{max-height:190px!important;overflow:auto!important}
 #app main[data-cc-simple-live="1"] .cc-simple-roll{grid-template-columns:24px minmax(0,1fr) 34px!important;gap:4px!important;padding:2px 0!important}
 #app main[data-cc-simple-live="1"] .cc-simple-roll small{display:none!important}
}
`;document.head.appendChild(st);
})();