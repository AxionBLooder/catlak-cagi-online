from pathlib import Path
import re
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "_site")


def must_replace(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label}: beklenen kaynak parçası bulunamadı")
    return text.replace(old, new, 1)


def must_sub(text: str, pattern: str, repl: str, label: str) -> str:
    out, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{label}: beklenen blok bulunamadı ({count})")
    return out


# 1) Savaş yerleşimi GM Merkezi'ndeki Yaratık Kütüphanesi düğmesini artık taşımaz.
p = root / "battle-room-actions-layout-patch.js"
s = p.read_text(encoding="utf-8")
s = must_sub(
    s,
    r"function braPlaceCreatureLibrary\(\)\{.*?\n\}\n\nasync function braRefreshLiveLog",
    "function braPlaceCreatureLibrary(){\n"
    "  const bar=BRA_APP.querySelector('[data-gm2-centerbar]');if(!bar)return;\n"
    "  const lib=bar.querySelector('[data-gm2-route=\"creatures\"]');\n"
    "  if(lib)lib.dataset.fupCreatures='1';\n"
    "}\n\nasync function braRefreshLiveLog",
    "battle creature route ownership",
)
p.write_text(s, encoding="utf-8")


# 2) Oda Koruması yeni GM Merkezi çubuğunu gizleyemez.
p = root / "room-guard-patch.js"
s = p.read_text(encoding="utf-8")
s = must_replace(
    s,
    "    #app [data-gm2-centerbar]{display:none!important}\n"
    "    #app:has(main .gmt-shell) [data-gm2-centerbar]{display:flex!important}",
    "    #app.gm2-gm [data-gm2-centerbar]{display:flex!important;pointer-events:auto!important}",
    "room guard gm center css",
)
p.write_text(s, encoding="utf-8")


# 3) Invite görünürlük katmanı GM Merkezi pointerdown/click rotalarına dokunmaz.
p = root / "invite-visibility-patch.js"
s = p.read_text(encoding="utf-8")
s = must_replace(
    s,
    "function civPrepareGmRoute(e){\n  const route=e.target.closest?.('[data-gm2-route]');",
    "function civPrepareGmRoute(e){\n  if(window.__catlakGmCenterRouterCore?.active)return;\n  const route=e.target.closest?.('[data-gm2-route]');",
    "invite gm route prepare",
)
p.write_text(s, encoding="utf-8")


# 4) Eski inline Yaratık Kütüphanesi yönlendiricisi merkezi çubuğu yönetemez.
p = root / "index.html"
s = p.read_text(encoding="utf-8")
s = must_sub(
    s,
    r"function route\(\)\{if\(!gm\(\)\)return;var bar=.*?\}function openLib\(\)",
    "function route(){return}function openLib()",
    "inline legacy creature route",
)
s = must_replace(
    s,
    "if(b){e.preventDefault();e.stopImmediatePropagation();openLib();return}",
    "if(b&&!(window.__catlakGmCenterRouterCore&&window.__catlakGmCenterRouterCore.active)){e.preventDefault();e.stopImmediatePropagation();openLib();return}",
    "inline legacy creature click",
)

# Yeni tıklama sahipliği için cache bust.
s = s.replace("./gm-center-router-core.js?v=gmrouter-v2", "./gm-center-router-core.js?v=gmrouter-v3")
s = s.replace("./battle-room-actions-layout-patch.js?v=battleactions-v1", "./battle-room-actions-layout-patch.js?v=battleactions-v2")
s = s.replace("./room-guard-patch.js?v=guard-v3", "./room-guard-patch.js?v=guard-v4")
s = s.replace("./invite-visibility-patch.js?v=inviteui-v3", "./invite-visibility-patch.js?v=inviteui-v4")
p.write_text(s, encoding="utf-8")
