from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "_site")


def must_replace(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label}: beklenen kaynak parçası bulunamadı")
    return text.replace(old, new, 1)


# Yetenek ekranı GM Hub ana alanına sahip olduğu sürece eski render tarafından
# silinirse anında geri çizilsin. Artık eski GM Tools açık olma koşuluna bağlı değil.
p = root / "gm-hub-v2-patch.js"
s = p.read_text(encoding="utf-8")
s = must_replace(
    s,
    "if(gm2AbilityOpen&&window.__catlakGmToolsOpen===true&&!GM2_APP.querySelector('[data-gm2-ability-page]'))gm2RenderAbility(false)",
    "if(gm2AbilityOpen&&window.__catlakGmHubOwnsMain===true&&!GM2_APP.querySelector('[data-gm2-ability-page]'))gm2RenderAbility(false)",
    "ability restore ownership",
)
p.write_text(s, encoding="utf-8")

# Bir araç yüklenirken başka araca basılırsa sıradaki render önceden hazırlanmış
# cache'i kullanabilsin; gereksiz force refresh rota geçişini yavaşlatmasın.
p = root / "gm-tools-patch.js"
s = p.read_text(encoding="utf-8")
s = must_replace(
    s,
    "if(gmtRenderQueued){gmtRenderQueued=false;if(gmtOpen&&window.__catlakGmHubOwnsMain!==true)setTimeout(()=>gmtRender(true),0)}",
    "if(gmtRenderQueued){gmtRenderQueued=false;if(gmtOpen&&window.__catlakGmHubOwnsMain!==true)setTimeout(()=>gmtRender(false),0)}",
    "queued gm render cache",
)
p.write_text(s, encoding="utf-8")

# Yeni dosyaların tarayıcı cache'ine takılmaması için sürüm yükselt.
p = root / "index.html"
s = p.read_text(encoding="utf-8")
s = s.replace("./gm-tools-patch.js?v=gmtools-v5", "./gm-tools-patch.js?v=gmtools-v6")
s = s.replace("./gm-hub-v2-patch.js?v=gmhub-v5", "./gm-hub-v2-patch.js?v=gmhub-v6")
p.write_text(s, encoding="utf-8")
