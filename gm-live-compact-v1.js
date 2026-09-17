(function(){
'use strict';
if(window.__catlakGmLiveCompactV3)return;
window.__catlakGmLiveCompactV3=true;
document.getElementById('glc-style-v2')?.remove();
const st=document.createElement('style');st.id='glc-style-v3';st.textContent=`
@media(min-width:821px){
 #app main[data-cc-simple-live="1"] .cc-live-two{grid-template-columns:minmax(340px,410px) minmax(310px,370px)!important;justify-content:center!important;gap:14px!important}
 #app main[data-cc-simple-live="1"] .cc-live-two>.card{height:300px!important;max-height:300px!important;overflow:auto!important}
}
@media(max-width:820px){
 #app main[data-cc-simple-live="1"] .cc-live-two{grid-template-columns:1fr!important}
 #app main[data-cc-simple-live="1"] .cc-live-two>.card{height:auto!important;max-height:260px!important}
}
`;
document.head.appendChild(st);
})();