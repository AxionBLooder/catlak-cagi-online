from pathlib import Path
import re
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "_site")


def must_sub(text: str, pattern: str, repl: str, label: str) -> str:
    out, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: beklenen blok bulunamadı ({count})")
    return out


def must_replace(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label}: beklenen kaynak parçası bulunamadı")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# GM Araçları: her rota yalnız ihtiyacı olan Supabase tablolarını yükler.
# Kısa süreli cache + idle prefetch sayesinde ilk geçişten sonra ekranlar anlık açılır.
# ---------------------------------------------------------------------------
p = root / "gm-tools-patch.js"
s = p.read_text(encoding="utf-8")

state_marker = "let gmtOpen=false,gmtSub='combat',gmtBusy=false,gmtRenderQueued=false,gmtGen=0,gmtRuleCache=null,gmtRuleAt=0,gmtPlayerBusy=false;"
s = must_replace(
    s,
    state_marker,
    state_marker + "\nconst gmtDataCache={combat:null,events:null,logs:null};\nconst gmtDataAt={combat:0,events:0,logs:0};\nconst GMT_CACHE_MS=8000;",
    "gm tools cache state",
)

new_load = r'''async function gmtLoad(sub=gmtSub,force=false){
  const key=(sub==='events'||sub==='logs')?sub:'combat';
  if(!force&&gmtDataCache[key]&&Date.now()-gmtDataAt[key]<GMT_CACHE_MS)return gmtDataCache[key];
  const base={state:{id:1,active:false,name:'Savaş',round:1,current_combatant_id:null},combatants:[],chars:[],conditions:[],rules:[],logs:[]};
  if(key==='events'){
    const er=await GMT_S.from('catlak_event_rules').select('*').order('table_key',{ascending:true}).order('sort_order',{ascending:true});
    if(er.error)throw er.error;base.rules=er.data||[];gmtRuleCache=base.rules;gmtRuleAt=Date.now();
  }else if(key==='logs'){
    const lr=await GMT_S.from('catlak_session_log').select('*').order('created_at',{ascending:false}).limit(120);
    if(lr.error)throw lr.error;base.logs=lr.data||[];
  }else{
    const [sr,br,cr,kr]=await Promise.all([
      GMT_S.from('catlak_combat_state').select('*').eq('id',1).maybeSingle(),
      GMT_S.from('catlak_combatants').select('*').order('initiative',{ascending:false}).order('created_at',{ascending:true}),
      GMT_S.from('catlak_characters').select('id,name,hp_current,hp_max,base_ac,base_stats,play_status').eq('play_status','active').order('created_at',{ascending:true}),
      GMT_S.from('catlak_character_conditions').select('*').eq('active',true).order('created_at',{ascending:true})
    ]);
    for(const r of [sr,br,cr,kr])if(r.error)throw r.error;
    base.state=sr.data||base.state;base.combatants=br.data||[];base.chars=cr.data||[];base.conditions=kr.data||[];
  }
  gmtDataCache[key]=base;gmtDataAt[key]=Date.now();return base;
}'''

s = must_sub(
    s,
    r"async function gmtLoad\(\)\{.*?\n\}\n\nfunction gmtCombatHtml",
    new_load + "\n\nfunction gmtCombatHtml",
    "gm tools selective load",
)

# Açılışta cache kullanılabilsin; zorunlu full-refresh yalnız gerçek veri değişimlerinde kalsın.
s = must_replace(
    s,
    "if(gmtBusy)gmtRenderQueued=true;else gmtRender(true);",
    "if(gmtBusy)gmtRenderQueued=true;else gmtRender(false);",
    "gm tools open cached render",
)
s = must_replace(
    s,
    "const d=await gmtLoad();",
    "const d=await gmtLoad(sub,force);",
    "gm tools render selective data",
)

# Realtime gelince ilgili cache'i düşür.
s = s.replace(
    "GMT_S.channel('cc-gmt-conditions').on('postgres_changes'",
    "GMT_S.channel('cc-gmt-conditions').on('postgres_changes'",
    1,
)
s = s.replace(
    "()=>{if(gmtOpen&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');",
    "()=>{gmtDataCache.combat=null;gmtDataAt.combat=0;if(gmtOpen&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');",
    1,
)
# combatants ve combat_state aynı kanal zincirindeki iki callback için cache invalidation ekle.
s = s.replace(
    "()=>{if(gmtOpen&&gmtSub==='combat'&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');",
    "()=>{gmtDataCache.combat=null;gmtDataAt.combat=0;if(gmtOpen&&gmtSub==='combat'&&window.__catlakGmHubOwnsMain!==true){const m=GMT_APP.querySelector('main');",
    2,
)

# Sayfa boşta kaldığında üç GM aracını arkadan hazırla.
prefetch = "\nsetTimeout(()=>{if(gmtIsGM())['combat','events','logs'].forEach((sub,i)=>setTimeout(()=>gmtLoad(sub,false).catch(()=>{}),i*90))},420);\n"
if prefetch.strip() not in s:
    s += prefetch
p.write_text(s, encoding="utf-8")


# ---------------------------------------------------------------------------
# GM Merkezi: üst rota çubuğu tek kez oluşturulur ve sabit kalır.
# Yetenek ekranı artık önce eski GM araçlarını açıp beklemez; kendi kabuğunu anında kurar.
# ---------------------------------------------------------------------------
p = root / "gm-hub-v2-patch.js"
s = p.read_text(encoding="utf-8")

new_chrome = r'''function gm2EnsureChrome(){
  if(!gm2IsGM()){GM2_APP.classList.remove('gm2-gm');GM2_APP.querySelector('[data-gm2-centerbar]')?.remove();return}
  GM2_APP.classList.add('gm2-gm');gm2PatchLegacyRender();
  const nav=GM2_APP.querySelector('.nav');if(!nav)return;
  const center=nav.querySelector('[data-gmt-open]');if(center){if(gm2Txt(center)!=='GM Merkezi')center.textContent='GM Merkezi';center.classList.toggle('gm2-center-active',gm2HubContext())}
  GM2_APP.querySelectorAll('.gmt-tabs [data-abs-gm-open]').forEach(x=>x.remove());
  let bar=GM2_APP.querySelector('[data-gm2-centerbar]');
  if(!bar){bar=document.createElement('div');bar.className='gm2-centerbar';bar.dataset.gm2Centerbar='1';nav.insertAdjacentElement('afterend',bar)}
  if(bar.dataset.gm2Stable!=='1'){
    bar.replaceChildren();
    const label=document.createElement('span');label.className='gm2-label';label.textContent='GM MERKEZİ';bar.appendChild(label);
    for(const[k,n]of GM2_ROUTES){const b=document.createElement('button');b.type='button';b.dataset.gm2Route=k;b.textContent=n;if(k==='creatures')b.dataset.fupCreatures='1';bar.appendChild(b)}
    bar.dataset.gm2Stable='1';
  }
  const active=gm2ActiveRoute();
  bar.querySelectorAll('[data-gm2-route]').forEach(b=>{const on=b.dataset.gm2Route===active;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')});
}'''
s = must_sub(
    s,
    r"function gm2EnsureChrome\(\)\{.*?\n\}\nfunction gm2QueueChrome",
    new_chrome + "\nfunction gm2QueueChrome",
    "gm hub stable chrome",
)

new_open_ability = r'''function gm2OpenAbility(){
  if(!gm2IsGM())return;
  window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.();
  window.__catlakGmTools?.close?.();
  gm2AbilityOpen=true;gm2Gen++;window.__catlakGmHubOwnsMain=true;
  const main=GM2_APP.querySelector('main');if(!main)return;
  main.dataset.gm2Route='ability';
  main.innerHTML='<div class="gmt-shell"><section class="card" data-gm2-host hidden><div class="eyebrow">GM • MERKEZ</div><h1>GM Merkezi</h1></section><div class="gm2-loading">Yetenek Atölyesi hazırlanıyor…</div></div>';
  gm2RenderAbility(false);gm2QueueChrome();
}'''
s = must_sub(
    s,
    r"function gm2OpenAbility\(\)\{.*?\n\}\nfunction gm2Go",
    new_open_ability + "\nfunction gm2Go",
    "gm hub instant ability open",
)

# Ability renderer artık gmtOpen'a bağımlı değil; doğrudan GM Hub ana alanında çalışır.
s = must_replace(
    s,
    "if(!gm2AbilityOpen||!gm2IsGM()||window.__catlakGmToolsOpen!==true)return;if(gm2RenderBusy){gm2RenderQueued=true;return}",
    "if(!gm2AbilityOpen||!gm2IsGM()||window.__catlakGmHubOwnsMain!==true)return;if(gm2RenderBusy){gm2RenderQueued=true;return}",
    "gm hub ability ownership",
)
s = must_replace(
    s,
    "const d=await gm2Load();",
    "const d=await gm2Load(force);",
    "gm hub ability load force",
)

# Ability verisini de kısa cache ile önceden hazırla.
s = must_replace(
    s,
    "let gm2AbilityOpen=false,gm2RenderBusy=false,gm2RenderQueued=false,gm2ActionBusy=false,gm2ChromeQueued=false,gm2Gen=0,gm2Sig='',gm2Cache={abilities:[],chars:[],assignments:[]};",
    "let gm2AbilityOpen=false,gm2RenderBusy=false,gm2RenderQueued=false,gm2ActionBusy=false,gm2ChromeQueued=false,gm2Gen=0,gm2Sig='',gm2Cache={abilities:[],chars:[],assignments:[]},gm2DataCache=null,gm2DataAt=0;",
    "gm hub ability cache state",
)

new_gm2_load = r'''async function gm2Load(force=false){
  if(!force&&gm2DataCache&&Date.now()-gm2DataAt<10000)return gm2DataCache;
  const[ar,cr,xr]=await Promise.all([
    GM2_S.from('catlak_abilities').select('*').order('name',{ascending:true}),
    GM2_S.from('catlak_characters').select('id,name,play_status,created_at').in('play_status',['prepared','active']).order('created_at',{ascending:true}),
    GM2_S.from('catlak_character_abilities').select('id,character_id,ability_id,uses_per_combat,uses_remaining,created_at').order('created_at',{ascending:true})
  ]);
  for(const r of[ar,cr,xr])if(r.error)throw r.error;
  gm2DataCache={abilities:ar.data||[],chars:cr.data||[],assignments:xr.data||[]};gm2DataAt=Date.now();return gm2DataCache;
}'''
s = must_sub(
    s,
    r"async function gm2Load\(\)\{.*?\}\nfunction gm2Options",
    new_gm2_load + "\nfunction gm2Options",
    "gm hub cached ability load",
)

# Realtime olduğunda cache'i düşür; açılıştan kısa süre sonra önceden yükle.
s = s.replace("()=>{gm2Sig='';if(gm2AbilityOpen)gm2RenderAbility(true)}", "()=>{gm2DataCache=null;gm2DataAt=0;gm2Sig='';if(gm2AbilityOpen)gm2RenderAbility(true)}")
s = s.replace("()=>{gm2Sig='';if(gm2AbilityOpen)gm2RenderAbility(true);gm2QueueChrome()}", "()=>{gm2DataCache=null;gm2DataAt=0;gm2Sig='';if(gm2AbilityOpen)gm2RenderAbility(true);gm2QueueChrome()}")

# Yapay 40ms rota gecikmelerini kaldır.
s = s.replace("setTimeout(gm2QueueChrome,40);return", "gm2QueueChrome();return")
s = s.replace("t.click();setTimeout(gm2QueueChrome,40)", "t.click();gm2QueueChrome()")

# Native rotalarda hangi ekran seçildiyse ana alan sahipliği bilgisini taşı.
s = s.replace(
    "const t=gm2Target(route);if(!t){gm2Toast('Bu GM bölümü bulunamadı.');return}\n  t.click();gm2QueueChrome()",
    "const t=gm2Target(route);if(!t){gm2Toast('Bu GM bölümü bulunamadı.');return}\n  const main=GM2_APP.querySelector('main');if(main)main.dataset.gm2Route=route;\n  t.click();gm2QueueChrome()",
    1,
)

# Yetenek verisini kullanıcı tıklamadan önce hazırla.
s += "\nsetTimeout(()=>{if(gm2IsGM())gm2Load(false).catch(()=>{})},520);\n"
p.write_text(s, encoding="utf-8")


# ---------------------------------------------------------------------------
# Router: kalıcı merkez barı sticky olsun; daha seyrek bakım yapsın.
# ---------------------------------------------------------------------------
p = root / "gm-center-router-core.js"
s = p.read_text(encoding="utf-8")
s = must_replace(s, "bar.style.position='relative';", "bar.style.position='sticky';bar.style.top='6px';", "router sticky bar")
s = must_replace(s, "setInterval(gmcrMakeButtonsClickable,600);", "setInterval(gmcrMakeButtonsClickable,1200);", "router maintenance interval")
p.write_text(s, encoding="utf-8")


# ---------------------------------------------------------------------------
# Cache bust: yeni hızlı kalıcı kabuk dosyaları kesin yüklensin.
# ---------------------------------------------------------------------------
p = root / "index.html"
s = p.read_text(encoding="utf-8")
s = s.replace("./gm-center-router-core.js?v=gmrouter-v3", "./gm-center-router-core.js?v=gmrouter-v4")
s = s.replace("./gm-tools-patch.js?v=gmtools-v4", "./gm-tools-patch.js?v=gmtools-v5")
s = s.replace("./gm-hub-v2-patch.js?v=gmhub-v4", "./gm-hub-v2-patch.js?v=gmhub-v5")
p.write_text(s, encoding="utf-8")
