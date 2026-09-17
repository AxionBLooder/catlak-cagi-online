(function(){
'use strict';
if(window.__catlakGmLiveCompactV4)return;
window.__catlakGmLiveCompactV4=true;
document.getElementById('glc-style-v2')?.remove();
document.getElementById('glc-style-v3')?.remove();
const st=document.createElement('style');st.id='glc-style-v4';st.textContent=`
/* Sabit GM üst menü sırası: başka katmanlar DOM'a düğme eklese bile görsel sıra değişmez. */
#app.gmc-gm .nav [data-gmc-open]{order:10!important}
#app.gmc-gm .nav [data-prh-manager]{order:20!important}
#app.gmc-gm .nav [data-cc-management-room]{order:30!important}
#app.gmc-gm .nav [data-tab="gm"]{order:40!important}
#app.gmc-gm .nav [data-cc-map-tab]{order:50!important}
#app.gmc-gm .nav [data-cc-world-tab]{order:60!important}
#app.gmc-gm .nav [data-tab="rolls"]{order:70!important}
#app.gmc-gm .nav [data-tab="characters"]{display:none!important;order:900!important}
#app.gmc-gm .nav [data-gmt-open],#app.gmc-gm .nav [data-cc-stats-tab],#app.gmc-gm .nav [data-tab="builder"],#app.gmc-gm .nav [data-tab="races"],#app.gmc-gm .nav [data-tab="items"]{order:800!important}

/* Zar/oyuncu bölümü orta boy, kareye yakın iki kutu. */
@media(min-width:821px){
 #app main[data-cc-simple-live="1"] .cc-live-two{grid-template-columns:minmax(340px,410px) minmax(310px,370px)!important;justify-content:center!important;gap:14px!important;margin-left:auto!important;margin-right:auto!important}
 #app main[data-cc-simple-live="1"] .cc-live-two>.card{height:300px!important;max-height:300px!important;overflow:auto!important}
}
@media(max-width:820px){
 #app main[data-cc-simple-live="1"] .cc-live-two{grid-template-columns:1fr!important}
 #app main[data-cc-simple-live="1"] .cc-live-two>.card{height:auto!important;max-height:260px!important}
}
`;
document.head.appendChild(st);
})();