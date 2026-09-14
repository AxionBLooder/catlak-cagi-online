from pathlib import Path

def req_replace(path, old, new, count=1):
    p=Path(path); s=p.read_text(encoding='utf-8')
    if old not in s: raise SystemExit(f'{path}: expected pattern missing: {old[:80]!r}')
    p.write_text(s.replace(old,new,count),encoding='utf-8')

# GM router: one navigation owner, no observer/polling and immediate leave cleanup.
req_replace('gm-center-router-core.js',"function gmcrIsGM(){return gmcrRole()==='GM'||!!GMCR_APP.querySelector('[data-gm2-centerbar]')}","function gmcrIsGM(){return gmcrRole()==='GM'}")
req_replace('gm-center-router-core.js',"""function gmcrMakeButtonsClickable(){
  const bar=GMCR_APP.querySelector('[data-gm2-centerbar]');
  const center=GMCR_APP.querySelector('.nav [data-gmt-open]');
  const open=gmcrCenterOpen();
  if(center)center.classList.toggle('gm2-center-active',open);
  if(!bar)return;
  bar.style.display=open?'flex':'none';
  if(!open)return;
  bar.style.pointerEvents='auto';
  bar.style.position='sticky';bar.style.top='6px';
  bar.style.zIndex='2147483000';
  bar.querySelectorAll('[data-gm2-route]').forEach(b=>{
    b.disabled=false;
    b.removeAttribute('disabled');
    b.style.pointerEvents='auto';
    b.style.cursor='pointer';
    b.style.position='relative';
    b.style.zIndex='1';
  });
}
""","""// Chrome ownership belongs to gm-hub-v2. This controller only makes an existing
// center bar interactive; it never creates, hides or resurrects the bar itself.
function gmcrMakeButtonsClickable(){
  window.__catlakGmHubV2Test?.chrome?.();
  const bar=GMCR_APP.querySelector('[data-gm2-centerbar]');
  if(!bar)return;
  bar.style.pointerEvents='auto';
  bar.querySelectorAll('[data-gm2-route]').forEach(b=>{
    b.disabled=false;b.removeAttribute('disabled');b.style.pointerEvents='auto';b.style.cursor='pointer';
  });
}
""")
req_replace('gm-center-router-core.js',"function gmcrGo(route){","""function gmcrLeaveCenter(){
  gmcrToken++;gmcrLastRoute='';gmcrLastAt=0;gmcrPointerRoute='';gmcrPointerAt=0;window.__catlakGmCenterSelectedRoute='';
  const hub=window.__catlakGmHubV2Test;
  if(typeof hub?.leave==='function')hub.leave();
  else{hub?.release?.();window.__catlakGmTools?.close?.();window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.();GMCR_APP.querySelector('[data-gm2-centerbar]')?.remove();GMCR_APP.querySelector('.nav [data-gmt-open]')?.classList.remove('gm2-center-active')}
}

function gmcrGo(route){""")
req_replace('gm-center-router-core.js',"""    if(typeof go==='function'){
      go(route);
      requestAnimationFrame(()=>{if(token===gmcrToken){gmcrMakeButtonsClickable();gmcrSelect(route)}});
      setTimeout(()=>{if(token===gmcrToken){gmcrMakeButtonsClickable();gmcrSelect(route)}},80);
      return true;
    }
    return false;""","""    if(typeof go!=='function')return false;
    go(route);
    requestAnimationFrame(()=>{if(token===gmcrToken){gmcrMakeButtonsClickable();gmcrSelect(route)}});
    return true;""")
req_replace('gm-center-router-core.js','if(++tries<80)setTimeout(retry,20);','if(++tries<30)setTimeout(retry,20);')
req_replace('gm-center-router-core.js',"""window.addEventListener('pointerdown',e=>{
  const button=gmcrButton(e.target);
  if(!button||!gmcrIsGM())return;
  if(e.button!=null&&e.button!==0)return;
  const route=String(button.dataset.gm2Route||'');
  if(!GMCR_ROUTES.has(route))return;
  gmcrPointerRoute=route;gmcrPointerAt=performance.now();
  gmcrConsume(e,route);
},true);""","""window.addEventListener('pointerdown',e=>{
  if(e.button!=null&&e.button!==0)return;
  const button=gmcrButton(e.target);
  if(button&&gmcrIsGM()){
    const route=String(button.dataset.gm2Route||'');if(!GMCR_ROUTES.has(route))return;
    gmcrPointerRoute=route;gmcrPointerAt=performance.now();gmcrConsume(e,route);return;
  }
  const nav=e.target?.closest?.('#app .nav button');
  if(nav&&gmcrIsGM()&&!nav.matches('[data-gmt-open]'))gmcrLeaveCenter();
},true);""")
req_replace('gm-center-router-core.js',"""  if(e.isTrusted&&e.target?.closest?.('#app .nav button')){
    window.__catlakGmCenterSelectedRoute='';
    gmcrToken++;
    setTimeout(gmcrMakeButtonsClickable,0);
  }
},true);

const gmcrObserver=new MutationObserver(()=>{
  gmcrMakeButtonsClickable();
  const selected=String(window.__catlakGmCenterSelectedRoute||'');
  if(GMCR_ROUTES.has(selected))gmcrSelect(selected);
});
gmcrObserver.observe(GMCR_APP,{childList:true,subtree:true});
setInterval(gmcrMakeButtonsClickable,1200);""","""  const nav=e.target?.closest?.('#app .nav button');
  if(e.isTrusted&&nav&&gmcrIsGM()&&!nav.matches('[data-gmt-open]'))gmcrLeaveCenter();
},true);""")
req_replace('gm-center-router-core.js',"centerOpen:gmcrCenterOpen,\n  reset:()=>{gmcrLastRoute='';gmcrLastAt=0;gmcrPointerRoute='';gmcrPointerAt=0;gmcrToken++;window.__catlakGmCenterSelectedRoute='';gmcrMakeButtonsClickable()}","centerOpen:gmcrCenterOpen,\n  leave:gmcrLeaveCenter,\n  reset:gmcrLeaveCenter")

# GM hub owns center bar existence.
req_replace('gm-hub-v2-patch.js',"""  const center=nav.querySelector('[data-gmt-open]');if(center){if(gm2Txt(center)!=='GM Merkezi')center.textContent='GM Merkezi';center.classList.toggle('gm2-center-active',gm2HubContext())}
  GM2_APP.querySelectorAll('.gmt-tabs [data-abs-gm-open]').forEach(x=>x.remove());
  let bar=GM2_APP.querySelector('[data-gm2-centerbar]');
  if(!bar){bar=document.createElement('div');""","""  const open=gm2HubContext();
  const center=nav.querySelector('[data-gmt-open]');if(center){if(gm2Txt(center)!=='GM Merkezi')center.textContent='GM Merkezi';center.classList.toggle('gm2-center-active',open)}
  GM2_APP.querySelectorAll('.gmt-tabs [data-abs-gm-open]').forEach(x=>x.remove());
  let bar=GM2_APP.querySelector('[data-gm2-centerbar]');
  if(!open){bar?.remove();return}
  if(!bar){bar=document.createElement('div');""")
req_replace('gm-hub-v2-patch.js',"function gm2ReleaseAbility(){gm2AbilityOpen=false;window.__catlakGmHubOwnsMain=false;gm2Gen++;gm2Sig='';gm2QueueChrome()}\n","""function gm2ReleaseAbility(){gm2AbilityOpen=false;window.__catlakGmHubOwnsMain=false;gm2Gen++;gm2Sig='';gm2QueueChrome()}
function gm2LeaveCenter(){window.__catlakGmCenterSelectedRoute='';gm2AbilityOpen=false;window.__catlakGmHubOwnsMain=false;gm2Gen++;gm2Sig='';window.__catlakGmTools?.close?.();window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.();GM2_APP.querySelector('[data-gm2-centerbar]')?.remove();GM2_APP.querySelector('.nav [data-gmt-open]')?.classList.remove('gm2-center-active');gm2QueueChrome()}
""")
req_replace('gm-hub-v2-patch.js',"document.addEventListener('pointerdown',e=>{if(e.target.closest?.('[data-gmt-sub],.nav [data-gmt-open],.nav button[data-tab],.nav [data-cc-stats-tab]')){if(!e.target.closest?.('[data-gm2-route]'))gm2ReleaseAbility()}},true);","""document.addEventListener('pointerdown',e=>{if(e.target.closest?.('[data-gm2-route]'))return;const sub=e.target.closest?.('[data-gmt-sub]');if(sub){const r=String(sub.dataset.gmtSub||'');window.__catlakGmCenterSelectedRoute=GM2_ROUTES.some(([k])=>k===r)?r:'';gm2ReleaseAbility();return}if(e.target.closest?.('.nav [data-gmt-open]')){window.__catlakGmCenterSelectedRoute='';gm2ReleaseAbility();return}if(e.target.closest?.('.nav button[data-tab],.nav [data-cc-stats-tab]')&&!(window.__catlakGmCenterRouterCore&&window.__catlakGmCenterRouterCore.active))gm2LeaveCenter()},true);""")
req_replace('gm-hub-v2-patch.js','window.__catlakGmHubV2Test={chrome:gm2EnsureChrome,openAbility:gm2OpenAbility,renderAbility:gm2RenderAbility,route:gm2Go,release:gm2ReleaseAbility};','window.__catlakGmHubV2Test={chrome:gm2EnsureChrome,openAbility:gm2OpenAbility,renderAbility:gm2RenderAbility,route:gm2Go,release:gm2ReleaseAbility,leave:gm2LeaveCenter,isOpen:gm2HubContext};')

# Remove redundant nav polling.
req_replace('gm-nav-cleanup-patch.js','new MutationObserver(gncSchedule).observe(GNC_APP,{childList:true,subtree:true});\nsetInterval(gncClean,1200);\nsetTimeout(gncClean,80);','new MutationObserver(gncSchedule).observe(GNC_APP,{childList:true,subtree:true});\nsetTimeout(gncClean,80);')

# GM tools: replace 900ms DB polling with DOM scheduling + realtime invalidation.
req_replace('gm-tools-patch.js',"let gmtOpen=false,gmtSub='combat',gmtBusy=false,gmtRenderQueued=false,gmtGen=0,gmtRuleCache=null,gmtRuleAt=0,gmtPlayerBusy=false;","let gmtOpen=false,gmtSub='combat',gmtBusy=false,gmtRenderQueued=false,gmtGen=0,gmtRuleCache=null,gmtRuleAt=0,gmtPlayerBusy=false,gmtMaintainQueued=false;")
req_replace('gm-tools-patch.js','function gmtInvalidatePlayer(){setTimeout(()=>gmtRenderPlayerPanels(),30)}\n',"""function gmtInvalidatePlayer(){setTimeout(()=>gmtRenderPlayerPanels(),30)}
function gmtInvalidateSub(sub){const key=(sub==='events'||sub==='logs')?sub:'combat';gmtDataCache[key]=null;gmtDataAt[key]=0;if(gmtOpen&&gmtSub===sub&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),30)}}
function gmtMaintain(){gmtMaintainQueued=false;gmtInjectNav();const main=GMT_APP.querySelector('main');if(gmtOpen&&window.__catlakGmHubOwnsMain!==true){if(main&&(main.dataset.gmtTools!=='1'||main.dataset.gmtSub!==gmtSub))setTimeout(()=>gmtRender(true),0);return}if(gmtOpen)return;if(!gmtIsGM()&&gmtBaseTab()==='sheet'&&main&&!main.querySelector('[data-gmt-player-panel]'))gmtRenderPlayerPanels();if(gmtIsGM()&&gmtBaseTab()==='rolls')gmtSyncEventRules()}
function gmtScheduleMaintain(){if(gmtMaintainQueued)return;gmtMaintainQueued=true;requestAnimationFrame(gmtMaintain)}
""")
req_replace('gm-tools-patch.js',"""GMT_S.channel('cc-gmt-conditions').on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},()=>{gmtDataCache.combat=null;gmtDataAt.combat=0;if(gmtOpen&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),30)}else if(!gmtOpen)gmtInvalidatePlayer()}).subscribe();
GMT_S.channel('cc-gmt-combat').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{gmtDataCache.combat=null;gmtDataAt.combat=0;if(gmtOpen&&gmtSub==='combat'&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),30)}}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{gmtDataCache.combat=null;gmtDataAt.combat=0;if(gmtOpen&&gmtSub==='combat'&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),30)}}).subscribe();

const gmtObserver=new MutationObserver(()=>{
  gmtInjectNav();
  if(gmtOpen&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');if(m&&(m.dataset.gmtTools!=='1'||m.dataset.gmtSub!==gmtSub))setTimeout(()=>gmtRender(true),0)}
});
gmtObserver.observe(GMT_APP,{childList:true,subtree:true});
setInterval(()=>{gmtInjectNav();if(gmtOpen&&window.__catlakGmHubOwnsMain!==true)gmtRender();else if(!gmtOpen){gmtRenderPlayerPanels();gmtSyncEventRules()}},900);
setTimeout(()=>{gmtInjectNav();gmtRenderPlayerPanels();gmtSyncEventRules()},150);""","""GMT_S.channel('cc-gmt-conditions').on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},()=>{gmtInvalidateSub('combat');if(!gmtOpen)gmtInvalidatePlayer()}).subscribe();
GMT_S.channel('cc-gmt-combat').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>gmtInvalidateSub('combat')).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>gmtInvalidateSub('combat')).on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{gmtInvalidateSub('combat');if(!gmtOpen)gmtInvalidatePlayer()}).subscribe();
GMT_S.channel('cc-gmt-player-equipment').on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>{if(!gmtOpen)gmtInvalidatePlayer()}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_items'},()=>{if(!gmtOpen)gmtInvalidatePlayer()}).subscribe();
GMT_S.channel('cc-gmt-events-logs').on('postgres_changes',{event:'*',schema:'public',table:'catlak_event_rules'},()=>{gmtRuleCache=null;gmtRuleAt=0;gmtInvalidateSub('events');if(!gmtOpen)setTimeout(()=>gmtSyncEventRules(),30)}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_session_log'},()=>gmtInvalidateSub('logs')).subscribe();
const gmtObserver=new MutationObserver(gmtScheduleMaintain);gmtObserver.observe(GMT_APP,{childList:true,subtree:true});setTimeout(gmtMaintain,150);""")

# Event rolls: navigation/realtime instead of 450ms polling.
req_replace('event-rolls-patch.js',"setInterval(()=>{erNavLabel();if(erIsGM()&&erTab()==='rolls'){const main=ER_APP.querySelector('main');if(main&&!main.dataset.erRollCenter)erRender()}},450);","document.addEventListener('click',e=>{if(e.target.closest?.('.nav button[data-tab=\"rolls\"]'))setTimeout(()=>{erNavLabel();erRender()},0)},false);")

# Battle room: realtime refresh instead of full re-render every 2.5 seconds.
req_replace('room-system-patch.js',"""new MutationObserver(ccrSchedule).observe(CCR_APP,{childList:true,subtree:true});
setInterval(()=>{if(ccrBattleOpen)ccrBattleRender(true)},2500);
window.__catlakRoomSystemTest={openBattle:ccrOpenBattle,renderBattle:ccrBattleRender,managedTabs:[...ccrManagedTabs]};""","""function ccrRealtimeRefresh(){if(!ccrBattleOpen)return;const main=CCR_APP.querySelector('main');if(main)delete main.dataset.ccrBattle;ccrBattleRender(true)}
new MutationObserver(ccrSchedule).observe(CCR_APP,{childList:true,subtree:true});
if(typeof CCR_S.channel==='function')CCR_S.channel('ccr-battle-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},ccrRealtimeRefresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},ccrRealtimeRefresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},ccrRealtimeRefresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},ccrRealtimeRefresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},ccrRealtimeRefresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_items'},ccrRealtimeRefresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_rolls'},ccrRealtimeRefresh).subscribe();
window.__catlakRoomSystemTest={openBattle:ccrOpenBattle,renderBattle:ccrBattleRender,managedTabs:[...ccrManagedTabs],realtimeRefresh:ccrRealtimeRefresh};""")

# Remove global innerHTML monkey-patch from room guard and duplicate refresh.
p=Path('room-guard-patch.js');s=p.read_text(encoding='utf-8');a=s.index("// Savaş Odası'nın eski ana rendererı");b=s.index('// GM özel d20/d100 zarları',a);s=s[:a]+"// Savaş Odası artık periyodik tam-DOM yenilemesi kullanmıyor.\n// Oda verisi room-system-patch içindeki realtime akışından güncellenir.\n\n"+s[b:];s=s.replace("function crgRefreshBattle(){\n  setTimeout(()=>window.__catlakRoomSystemTest?.renderBattle?.(true),80);\n  setTimeout(()=>window.__catlakRoomSystemTest?.renderBattle?.(true),450);\n}","function crgRefreshBattle(){setTimeout(()=>window.__catlakRoomSystemTest?.renderBattle?.(true),60)}");s=s.replace("battleSuppressed:()=>window.__catlakBattleRenderSuppressed||0","battleSuppressed:()=>0");p.write_text(s,encoding='utf-8')

# Remove inline polling and bump cache keys.
p=Path('index.html');s=p.read_text(encoding='utf-8').replace('setInterval(maintain,1500);','').replace('setInterval(check,500);','')
for old,new in {
'gm-center-router-core.js?v=gmrouter-v4':'gm-center-router-core.js?v=gmrouter-v5','gm-hub-v2-patch.js?v=gmhub-v6':'gm-hub-v2-patch.js?v=gmhub-v7','gm-nav-cleanup-patch.js?v=gmnav-v1':'gm-nav-cleanup-patch.js?v=gmnav-v2','gm-tools-patch.js?v=gmtools-v7':'gm-tools-patch.js?v=gmtools-v8','event-rolls-patch.js?v=events-v2':'event-rolls-patch.js?v=events-v3','room-guard-patch.js?v=guard-v4':'room-guard-patch.js?v=guard-v5','room-system-patch.js?v=rooms-v2':'room-system-patch.js?v=rooms-v3'}.items():
    if old not in s: raise SystemExit('index marker missing: '+old)
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# Obsolete GM runtime generations: not deployed and superseded by current owners.
for name in ['gm-center-live-runtime.js','gm-center-tools-integration-patch.js','gm-hub-patch.js','gm-hub-route-fix-patch.js']:
    q=Path(name)
    if q.exists(): q.unlink()
