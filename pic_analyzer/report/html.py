"""互動 HTML 報告。

load_template()  把 web/ 下的 page.html、style.css、js/*.js 組成單一模板（JS 依 JS_FILES 順序串接）
build_html()     模板 + 分析結果 JSON + plotly（離線內嵌或 CDN）→ 單一 HTML 檔
"""
from __future__ import annotations

import datetime as _dt
import hashlib
import json
import os

from .. import __version__
try:
    from ..domain.root_causes import RECOMMENDED_ACTIONS_GENERIC  # private knowledge base
except ImportError:  # public build
    RECOMMENDED_ACTIONS_GENERIC = []

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "web")
ASSETS = os.path.join(os.path.dirname(os.path.dirname(HERE)), "assets")
PLOTLY_CDN = "https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.35.2/plotly.min.js"

# 前端程式依此順序串接成一個 <script>（後面的檔案可以用前面定義的函式）
JS_FILES = [
    "core/10_basics.js",            # 資料存取、格式化、robust z（與 Python 同規則）
    "core/20_plotly.js",            # layout、plot()、spec 線
    "core/30_charts.js",            # box / CDF / trend / channel / leak / scatter / wafer map / 相關熱圖
    "core/40_tables.js",            # 表格、複製 TSV
    "core/50_charts_findings.js",   # Cpk / heater / radial / R² 配對圖
    "core/60_router.js",            # 分頁清單、路由、共用 pill
    "views/overview.js",            # 總覽 + finding 圖
    "views/datasets.js",
    "views/params.js",
    "views/explorer.js",
    "views/correlation.js",
    "views/paircorr.js",
    "views/wafermap.js",
    "views/sweep.js",
    "views/anomalies.js",
    "views/dies.js",
    "views/rootcause.js",
    "views/msa.js",
    "views/method.js",
    "core/90_boot.js",              # 啟動
]


def _read(rel):
    with open(os.path.join(WEB, rel), encoding="utf-8") as fh:
        return fh.read()


# 私有的前端檔（方法說明）不在公開 repo；缺少時用這段替代
_STUB = '<div class="panel"><p class="dim">此區塊屬於私有模組，未包含在公開版本。</p></div>'
PRIVATE_JS = {
    "core/50_charts_findings.js": "function chartCpk(el) { el.innerHTML = `%s`; }\n"
                                  "function chartHeater(el) { el.innerHTML = `%s`; }\n"
                                  "function chartRadial(el) { el.innerHTML = `%s`; }\n"
                                  "function pairArrays() { return { x: [], y: [] }; }\n"
                                  "function chartPairItem(el) { el.innerHTML = `%s`; }\n" % ((_STUB,) * 4),
    "views/paircorr.js": 'RENDER.paircorr = () => { $("#v-paircorr").innerHTML = `%s`; };\n' % _STUB,
    "views/method.js": 'RENDER.method = () => { $("#v-method").innerHTML = `%s`; };\n' % _STUB,
}


def load_template():
    def js_file(f):
        path = os.path.join(WEB, "js", f)
        return _read("js/" + f) if os.path.exists(path) or f not in PRIVATE_JS else PRIVATE_JS[f]
    js = "".join(js_file(f) for f in JS_FILES)
    return (_read("page.html")
            .replace("/*__CSS__*/\n", _read("style.css"))
            .replace("/*__JS__*/\n", js))


def _meta(R, sets, folder, sweep=None):
    lots = sorted({str(v) for v in R["data"].get("LOT_ID", []) if v})
    wafers = sorted({str(v) for v in R["data"].get("WAFER_ID", []) if v})
    key = hashlib.md5(("|".join(sorted(d.name for d in sets)) + folder).encode()).hexdigest()[:10]
    return dict(
        version=__version__,
        generated=_dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
        folder=folder,
        key=key,
        title_sub=(", ".join(lots) + " · " if lots else "") + f"{len(wafers) or len(sets)} 片 wafer",
        sweep=sweep,
        target_wl=(sweep or {}).get("target", 1310),
        files=[dict(f=os.path.basename(d.path), ds=d.name, n=len(d.df), np=len(d.params), notes="; ".join(d.notes)) for d in sets],
        generic=RECOMMENDED_ACTIONS_GENERIC,
    )


def build_html(R, sets, folder, standalone=True, inline_plotly=True, sweep=None):
    """standalone=True -> full HTML document for a local file.
    standalone=False -> page body only (for publishing as a hosted page)."""
    tpl = load_template()
    meta = _meta(R, sets, folder, sweep)
    data_js = json.dumps(R, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    meta_js = json.dumps(meta, ensure_ascii=False).replace("</", "<\\/")
    plotly_path = os.path.join(ASSETS, "plotly.min.js")
    if inline_plotly and os.path.exists(plotly_path):
        with open(plotly_path, encoding="utf-8") as fh:
            plotly_tag = "<script>" + fh.read() + "</script>"
    else:
        plotly_tag = f'<script src="{PLOTLY_CDN}"></script>'
    html = (tpl.replace("<!--__PLOTLY__-->", plotly_tag)
               .replace("/*__DATA__*/null", data_js)
               .replace("/*__META__*/null", meta_js))
    if standalone:
        html = ('<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                + html.replace("<style>", "<style>\n:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}", 1)
                .replace("</style>", "</style>\n</head>\n<body>", 1)
                + "\n</body>\n</html>\n")
    return html
