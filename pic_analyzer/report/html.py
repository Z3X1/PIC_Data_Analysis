"""Interactive HTML report.

load_template()  joins web/page.html, style.css and js/*.js into one template (JS in JS_FILES order)
build_html()     template + result JSON + message table + plotly (inline or CDN) → one HTML file
"""
from __future__ import annotations

import datetime as _dt
import hashlib
import json
import os

from .. import __version__
from ..i18n import html_lang, language, t
from ..i18n import table as i18n_table
try:
    from ..domain.root_causes import RECOMMENDED_ACTIONS_GENERIC  # private knowledge base
except ImportError:  # public build
    RECOMMENDED_ACTIONS_GENERIC = []

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "web")
ASSETS = os.path.join(os.path.dirname(os.path.dirname(HERE)), "assets")
PLOTLY_CDN = "https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.35.2/plotly.min.js"

# Front-end sources, concatenated in this order into one <script> (later files may use earlier ones)
JS_FILES = [
    "core/10_basics.js",            # data access, formatting, T() translation, robust z (same rule as Python)
    "core/20_plotly.js",            # shared layout, plot(), spec lines
    "core/30_charts.js",            # box / CDF / trend / channel / leak / scatter / wafer map / correlation heat map
    "core/40_tables.js",            # tables, copy as TSV
    "core/50_charts_findings.js",   # [private] finding-specific charts
    "core/60_router.js",            # tab list, routing, shared pills
    "views/overview.js",            # overview + finding charts
    "views/datasets.js",
    "views/params.js",
    "views/explorer.js",
    "views/correlation.js",
    "views/paircorr.js",            # [private]
    "views/wafermap.js",
    "views/sweep.js",
    "views/anomalies.js",
    "views/dies.js",
    "views/rootcause.js",
    "views/msa.js",
    "views/method.js",              # [private]
    "core/90_boot.js",              # start-up
]


def _read(rel):
    with open(os.path.join(WEB, rel), encoding="utf-8") as fh:
        return fh.read()


# Private front-end files are not in the public repository; these stand-ins keep the page working without them.
_STUB = '<div class="panel"><p class="dim">${T("This section belongs to the private module and is not included in the public version.")}</p></div>'
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
        title_sub=(", ".join(lots) + " · " if lots else "") + t("{n} wafers", n=len(wafers) or len(sets)),
        lang=language(),
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
    i18n_js = json.dumps(i18n_table("web"), ensure_ascii=False).replace("</", "<\\/")
    plotly_path = os.path.join(ASSETS, "plotly.min.js")
    if inline_plotly and os.path.exists(plotly_path):
        with open(plotly_path, encoding="utf-8") as fh:
            plotly_tag = "<script>" + fh.read() + "</script>"
    else:
        plotly_tag = f'<script src="{PLOTLY_CDN}"></script>'
    html = (tpl.replace("<!--__PLOTLY__-->", plotly_tag)
               .replace("/*__DATA__*/null", data_js)
               .replace("/*__META__*/null", meta_js)
               .replace("/*__I18N__*/{}", i18n_js))
    if standalone:
        html = (f'<!doctype html>\n<html lang="{html_lang()}">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                + html.replace("<style>", "<style>\n:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}", 1)
                .replace("</style>", "</style>\n</head>\n<body>", 1)
                + "\n</body>\n</html>\n")
    return html
