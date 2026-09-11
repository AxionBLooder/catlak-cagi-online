from pathlib import Path
import re
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else '_site')


def must_sub(text, pattern, repl, label):
    out,count=re.subn(pattern,repl,text,count=1,flags=re.S)
    if count!=1:
        raise SystemExit(f'{label}: beklenen blok bulunamadı ({count})')
    return out


# Ana uygulama: sabit katalog tablolarını yalnız ilk yüklemede al.
# Canlı oyunda yalnız karakter/eşya/envanter/son zarlar yenilenir.
p=root/'browser-app.js'
s=p.read_text(encoding='utf-8')
new_refresh=r'''async function se(){
  var O,Y;
  if(!((O=o.ses)!=null&&O.user))return;
  let p=o.ses.user.id;
  window.__catlakLowEgressCore=true;
  if(o.__ccLoadUid!==p){o.__ccLoadUid=p;o.__ccRoleLoaded=false}
  if(!o.__ccRoleLoaded){
    const {data:f,error:v}=await t.from("catlak_roles").select("role").eq("user_id",p).maybeSingle();
    if(v)throw v;
    o.role=(f==null?void 0:f.role)||"player";o.__ccRoleLoaded=true;
  }
  const needStatic=!o.__ccStaticLoaded;
  const q=[
    t.from("catlak_characters").select("*").order("created_at"),
    t.from("catlak_items").select("*").order("created_at"),
    t.from("catlak_inventory").select("*").order("granted_at"),
    t.from("catlak_rolls").select("*").order("created_at",{ascending:false}).limit(o.role==="gm"?60:30)
  ];
  if(needStatic)q.push(
    t.from("catlak_species_powers").select("*").order("species_name").order("unlock_level"),
    t.from("catlak_species").select("*").order("sort_order"),
    t.from("catlak_backgrounds").select("*").order("sort_order"),
    t.from("catlak_classes").select("*").order("sort_order"),
    t.from("catlak_special_paths").select("*").order("sort_order")
  );
  let noteIndex=-1;
  if(o.role==="gm"){noteIndex=q.length;q.push(t.from("catlak_item_gm_notes").select("*"))}
  const w=await Promise.all(q);
  for(const r of w)if(r.error)throw r.error;
  o.chars=w[0].data||[];o.items=w[1].data||[];o.inv=w[2].data||[];o.rolls=w[3].data||[];
  if(needStatic){
    let i=4;
    o.notes=w[i++].data||[];o.speciesRows=w[i++].data||[];o.backgroundRows=w[i++].data||[];o.classRows=w[i++].data||[];o.paths=w[i++].data||[];
    o.__ccStaticLoaded=true;
  }
  o.gmnotes=noteIndex>=0?(w[noteIndex].data||[]):[];
  o.role==="gm"&&["sheet","builder"].includes(o.tab)&&(o.tab="gm");
  o.role!=="gm"&&E()&&!o.chars.some(H=>H.owner_id===p)&&(o.tab="builder");
  we();
}
function ri()'''
s=must_sub(s,r'async function se\(\)\{.*?\}function ri\(\)',new_refresh,'core selective refresh')

# Realtime: artık sabit katalog değişiklikleri tüm uygulamayı yeniden sorgulatmaz.
core_channel='''t.channel("catlak-live").on("postgres_changes",{event:"*",schema:"public",table:"catlak_rolls"},Le).on("postgres_changes",{event:"*",schema:"public",table:"catlak_inventory"},Le).on("postgres_changes",{event:"*",schema:"public",table:"catlak_characters"},Le).on("postgres_changes",{event:"*",schema:"public",table:"catlak_items"},Le).subscribe()'''
s=must_sub(
    s,
    r't\.channel\("catlak-live"\)(?:\.on\("postgres_changes",\{event:"\*",schema:"public",table:"[^"]+"\},Le\))+\.subscribe\(\)',
    core_channel,
    'core realtime table scope'
)
p.write_text(s,encoding='utf-8')


# Oyuncu canlı aksiyon katmanı: DOM değişiklikleri veritabanı sorgusu başlatmasın.
# Ana uygulamanın realtime kanalı veri yenilemenin tek sahibi olsun.
p=root/'player-live-actions-patch.js'
s=p.read_text(encoding='utf-8')
s=must_sub(
    s,
    r"const plaObserver=new MutationObserver\(\(\)=>\{if\(plaIsSheet\(\)\)\{plaClaimInventory\(\);plaStaticStats\(\);plaRefreshSoon\(false,120\)\}\}\);plaObserver\.observe\(PLA_APP,\{childList:true,subtree:true\}\);",
    "const plaObserver=new MutationObserver(()=>{if(plaIsSheet()){plaClaimInventory();plaStaticStats()}});plaObserver.observe(PLA_APP,{childList:true,subtree:true});",
    'player dom-only observer'
)
s=must_sub(
    s,
    r"PLA_S\.channel\('cc-player-live-actions'\).*?\.subscribe\(\);",
    "window.__catlakPlayerLiveRealtimeOwnedByCore=true;",
    'player duplicate realtime channel'
)
s=must_sub(
    s,
    r"setInterval\(\(\)=>\{if\(plaIsSheet\(\)\)\{plaClaimInventory\(\);plaStaticStats\(\);plaRefreshSoon\(false,0\)\}\},4000\);",
    "window.__catlakPlayerPollingDisabled=true;",
    'player four second polling'
)
s=must_sub(
    s,
    r"setTimeout\(\(\)=>\{plaClaimInventory\(\);plaStaticStats\(\);plaRefreshSoon\(true,0\)\},120\);",
    "plaStaticStats();window.__catlakLowEgressV1=true;",
    'player duplicate initial fetch'
)
p.write_text(s,encoding='utf-8')
