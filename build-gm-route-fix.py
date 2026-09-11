from pathlib import Path
import re
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "_site")


def must_replace(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label}: beklenen kaynak parçası bulunamadı")
    return text.replace(old, new, 1)


def must_sub(text: str, pattern: str, repl: str, label: str, flags=0) -> str:
    out, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: beklenen blok bulunamadı ({count})")
    return out


# GM araçları: doğrudan rota API'si + render generation/queue koruması.
p = root / "gm-tools-patch.js"
s = p.read_text(encoding="utf-8")
s = must_replace(
    s,
    "let gmtOpen=false,gmtSub='combat',gmtBusy=false,gmtGen=0,gmtRuleCache=null,gmtRuleAt=0,gmtPlayerBusy=false;",
    "let gmtOpen=false,gmtSub='combat',gmtBusy=false,gmtRenderQueued=false,gmtGen=0,gmtRuleCache=null,gmtRuleAt=0,gmtPlayerBusy=false;",
    "gm-tools state",
)
s = must_replace(
    s,
    "function gmtClose(){if(!gmtOpen)return;gmtOpen=false;gmtGen++;window.__catlakGmToolsOpen=false}",
    "function gmtClose(){gmtOpen=false;gmtGen++;gmtRenderQueued=false;window.__catlakGmToolsOpen=false;const m=GMT_APP.querySelector('main');if(m){delete m.dataset.gmtTools;delete m.dataset.gmtSub}}",
    "gm-tools close",
)
new_render = r'''function gmtValidSub(x){return x==='combat'||x==='events'||x==='logs'}
function gmtOpenSub(sub='combat'){
  if(!gmtIsGM()||!gmtValidSub(sub))return false;
  gmtOpen=true;gmtSub=sub;gmtGen++;window.__catlakGmToolsOpen=true;window.__catlakGmHubOwnsMain=false;gmtSetNavOn();
  const m=GMT_APP.querySelector('main');if(m){m.dataset.gmtTools='';m.dataset.gmtSub=sub}
  if(gmtBusy)gmtRenderQueued=true;else gmtRender(true);
  return true;
}
async function gmtRender(force=false){
  if(!gmtOpen||!gmtIsGM()||window.__catlakGmHubOwnsMain===true)return;
  if(gmtBusy){gmtRenderQueued=true;return}
  const main=GMT_APP.querySelector('main');if(!main)return;
  const sub=gmtSub;if(!force&&main.dataset.gmtTools==='1'&&main.dataset.gmtSub===sub)return;
  const gen=++gmtGen;gmtBusy=true;
  try{
    const d=await gmtLoad();
    if(!gmtOpen||gen!==gmtGen||gmtSub!==sub||window.__catlakGmHubOwnsMain===true||GMT_APP.querySelector('main')!==main)return;
    gmtSetNavOn();
    main.innerHTML=`<div class="gmt-shell"><section class="card" data-gmt-legacy-header hidden><div class="eyebrow">GM • GÜVENLİ ARAÇLAR</div><h1>Oyun Yönetimi</h1><div class="gmt-tabs"><button type="button" class="${sub==='combat'?'on':''}" data-gmt-sub="combat">Savaş & Durumlar</button><button type="button" class="${sub==='events'?'on':''}" data-gmt-sub="events">Olay Atölyesi</button><button type="button" class="${sub==='logs'?'on':''}" data-gmt-sub="logs">Oturum Günlüğü</button></div></section>${sub==='combat'?gmtCombatHtml(d):sub==='events'?gmtEventsHtml(d):gmtLogsHtml(d)}</div>`;
    main.dataset.gmtTools='1';main.dataset.gmtSub=sub;
  }catch(e){gmtToast('GM Araçları yüklenemedi: '+(e?.message||String(e)))}finally{
    gmtBusy=false;
    if(gmtRenderQueued){gmtRenderQueued=false;if(gmtOpen&&window.__catlakGmHubOwnsMain!==true)setTimeout(()=>gmtRender(true),0)}
  }
}'''
s = must_sub(
    s,
    r"async function gmtRender\(force=false\)\{.*?\n\}\nasync function gmtRpc",
    new_render + "\nasync function gmtRpc",
    "gm-tools render",
    re.S,
)
s = must_replace(
    s,
    "const open=e.target.closest('[data-gmt-open]');if(open){e.preventDefault();e.stopImmediatePropagation();if(!gmtIsGM())return;gmtOpen=true;window.__catlakGmToolsOpen=true;gmtSetNavOn();gmtRender(true);return}\n  const base=e.target.closest('.nav button[data-tab]');if(base){gmtClose();return}\n  if(!gmtOpen)return;\n  const sub=e.target.closest('[data-gmt-sub]');if(sub){e.preventDefault();e.stopImmediatePropagation();gmtSub=sub.dataset.gmtSub;const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';gmtRender(true);return}",
    "const open=e.target.closest('[data-gmt-open]');if(open){e.preventDefault();e.stopImmediatePropagation();gmtOpenSub(gmtValidSub(gmtSub)?gmtSub:'combat');return}\n  const base=e.target.closest('.nav button[data-tab]');if(base){gmtClose();return}\n  if(!gmtOpen)return;\n  const sub=e.target.closest('[data-gmt-sub]');if(sub){e.preventDefault();e.stopImmediatePropagation();gmtOpenSub(String(sub.dataset.gmtSub||''));return}",
    "gm-tools click router",
)
old_realtime = "GMT_S.channel('cc-gmt-conditions').on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},()=>{if(gmtOpen){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),80)}else gmtInvalidatePlayer()}).subscribe();\nGMT_S.channel('cc-gmt-combat').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{if(gmtOpen&&gmtSub==='combat'){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),80)}}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{if(gmtOpen&&gmtSub==='combat'){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),80)}}).subscribe();"
new_realtime = "GMT_S.channel('cc-gmt-conditions').on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},()=>{if(gmtOpen&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),30)}else if(!gmtOpen)gmtInvalidatePlayer()}).subscribe();\nGMT_S.channel('cc-gmt-combat').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{if(gmtOpen&&gmtSub==='combat'&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),30)}}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{if(gmtOpen&&gmtSub==='combat'&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),30)}}).subscribe();"
s = must_replace(s, old_realtime, new_realtime, "gm-tools realtime")
new_tail = r'''const gmtObserver=new MutationObserver(()=>{
  gmtInjectNav();
  if(gmtOpen&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');if(m&&(m.dataset.gmtTools!=='1'||m.dataset.gmtSub!==gmtSub))setTimeout(()=>gmtRender(true),0)}
});
gmtObserver.observe(GMT_APP,{childList:true,subtree:true});
setInterval(()=>{gmtInjectNav();if(gmtOpen&&window.__catlakGmHubOwnsMain!==true)gmtRender();else if(!gmtOpen){gmtRenderPlayerPanels();gmtSyncEventRules()}},900);
setTimeout(()=>{gmtInjectNav();gmtRenderPlayerPanels();gmtSyncEventRules()},150);
window.gmtRender=gmtRender;
window.__catlakGmTools={open:gmtOpenSub,close:gmtClose,render:gmtRender,active:()=>gmtOpen?gmtSub:'',isOpen:()=>gmtOpen};
window.__catlakGmToolsTest={ruleText:gmtRuleText,range:gmtRange,slotName:gmtSlotName};'''
s = must_sub(
    s,
    r"const gmtObserver=new MutationObserver\(\(\)=>\{.*?window\.__catlakGmToolsTest=\{ruleText:gmtRuleText,range:gmtRange,slotName:gmtSlotName\};",
    new_tail,
    "gm-tools observer/api",
    re.S,
)
p.write_text(s, encoding="utf-8")


# GM Merkezi: araçları gerçek rota listesine ekle ve doğrudan API ile aç.
p = root / "gm-hub-v2-patch.js"
s = p.read_text(encoding="utf-8")
s = must_replace(
    s,
    "const GM2_ROUTES=[['ability','Yetenek'],['items','Eşya'],['stats','Stat'],['races','Irk'],['builder','Karakter Oluşturucu'],['creatures','Yaratık Kütüphanesi'],['characters','Yönetim Odası']];",
    "const GM2_ROUTES=[['ability','Yetenek'],['items','Eşya'],['stats','Stat'],['races','Irk'],['builder','Karakter Oluşturucu'],['combat','Savaş & Durumlar'],['events','Olay Atölyesi'],['logs','Oturum Günlüğü'],['creatures','Yaratık Kütüphanesi'],['characters','Yönetim Odası']];",
    "gm-hub routes",
)
s = must_replace(
    s,
    "function gm2ActiveRoute(){if(window.__catlakCreatureLibraryOpen===true)return'creatures';return gm2AbilityOpen&&window.__catlakGmHubOwnsMain===true?'ability':gm2NativeRoute()}",
    "function gm2ActiveRoute(){if(window.__catlakCreatureLibraryOpen===true)return'creatures';if(gm2AbilityOpen&&window.__catlakGmHubOwnsMain===true)return'ability';if(window.__catlakGmToolsOpen===true&&window.__catlakGmHubOwnsMain!==true){const r=window.__catlakGmTools?.active?.()||GM2_APP.querySelector('main .gmt-tabs [data-gmt-sub].on')?.dataset.gmtSub||'';if(r==='combat'||r==='events'||r==='logs')return r}return gm2NativeRoute()}",
    "gm-hub active route",
)
new_go = r'''function gm2Go(route){
  if(!gm2IsGM())return;
  if(route==='ability'){gm2OpenAbility();return}
  if(route==='combat'||route==='events'||route==='logs'){
    gm2ReleaseAbility();window.__catlakCreatureLibraryOpen=false;
    const tools=window.__catlakGmTools;
    if(tools&&typeof tools.open==='function')tools.open(route);else gm2Toast('GM araçları henüz hazır değil.');
    setTimeout(gm2QueueChrome,0);return
  }
  if(route==='creatures'){
    gm2ReleaseAbility();
    const open=window.__catlakQualityOfLifeTest?.openCreatureLibrary;
    if(typeof open==='function')open();else gm2Toast('Yaratık Kütüphanesi henüz hazır değil.');
    setTimeout(gm2QueueChrome,20);return
  }
  gm2ReleaseAbility();window.__catlakGmTools?.close?.();
  const t=gm2Target(route);if(!t){gm2Toast('Bu GM bölümü bulunamadı.');return}t.click();setTimeout(gm2QueueChrome,0)
}'''
s = must_sub(
    s,
    r"function gm2Go\(route\)\{.*?\n\}\n\nconst gm2Type",
    new_go + "\n\nconst gm2Type",
    "gm-hub router",
    re.S,
)
p.write_text(s, encoding="utf-8")


# Eski ek entegrasyonu yayından çıkar; değişen iki ana script için cache-bust.
p = root / "index.html"
s = p.read_text(encoding="utf-8")
s = s.replace("./gm-tools-patch.js?v=gmtools-v1", "./gm-tools-patch.js?v=gmtools-v3")
s = s.replace("./gm-hub-v2-patch.js?v=gmhub-v2", "./gm-hub-v2-patch.js?v=gmhub-v3")
s = re.sub(r'<script src="\./gm-center-tools-integration-patch\.js\?v=[^"]+"></script>', "", s)
p.write_text(s, encoding="utf-8")
