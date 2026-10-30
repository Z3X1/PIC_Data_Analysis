"""一次完整分析：資料夾 → 讀檔 → spec → 掃描 → 分析 → HTML + Excel。

run() 是唯一需要看的函式；每一行對應一層：
    ingest.datasets / ingest.specs / ingest.sweeps   讀取
    analysis.sweep_metrics                          掃描指標（私有核心）
    engine.analyse                                  分析 + findings（私有核心）
    report.html / report.excel                      輸出
"""
from __future__ import annotations

import datetime as dt
import os
import webbrowser

import pandas as pd

from .. import engine
from ..ingest import datasets, sweeps
from ..ingest import specs as specs_mod
from ..report import excel, html, sweep_payload

NAMES_FILE = "pic_names.csv"  # remembered dataset names, saved in the data folder


def read_names(folder, path=None):
    p = path or os.path.join(folder, NAMES_FILE)
    if not os.path.exists(p):
        return {}
    t = pd.read_csv(p)
    return {str(r.iloc[0]): str(r.iloc[1]) for _, r in t.iterrows() if str(r.iloc[1]).strip()}


def save_names(folder, names):
    try:
        pd.DataFrame(sorted(names.items()), columns=["file", "name"]).to_csv(os.path.join(folder, NAMES_FILE), index=False)
    except OSError:
        pass


def run(folder, files=None, names=None, spec=None, out=None, ref=None, recursive=False, open_browser=True, log=print):
    if not engine.core_available():
        raise SystemExit("分析核心（pic_analyzer/analysis、findings、domain 知識庫）未安裝：這是公開版外殼，核心模組為私有。")
    log(f"掃描資料夾 {folder} …")
    sets, errors = datasets.load_folder(folder, recursive=recursive, names=names, files=files)
    for f, e in errors:
        log(f"  略過 {f}：{e}")
    if not sets:
        raise SystemExit("找不到可讀的 Excel/CSV/XML 測試資料。")
    for d in sets:
        log(f"  {d.name:<22} {len(d.df):>5} 列  {len(d.params):>4} 參數  ← {os.path.basename(d.path)}")
    df, params, specs = datasets.combine(sets)
    # spec: explicit file > program TestSpec in the folder > spec_limits.csv in the folder
    spec_info = {}
    spec_paths = [spec] if spec else specs_mod.find_spec_files(folder, recursive)
    for sp in spec_paths:
        si = specs_mod.read_spec(sp)
        res = specs_mod.resolve_specs(params, si["rules"])
        specs.update(res)
        if not spec_info or si.get("conditions"):
            spec_info = si
        log(f"  spec：{os.path.basename(sp)} → 對應 {len(res)} / {len(params)} 個參數")
    target = 1310.0
    for f_ in spec_info.get("flow", []):
        try:
            target = float(f_.get("wavelength"))
            break
        except (TypeError, ValueError):
            pass
    name_by_file = {os.path.basename(d.path): d.name for d in sets}
    if names:
        name_by_file.update(names)
    from ..analysis import sweep_metrics  # private core
    sw = sweep_metrics.evaluate(sweeps.read_curves(folder, recursive=recursive, dataset_name=name_by_file), target=target)
    if sw["files"]:
        log(f"  掃描檔：{len(sw['files'])} 個（{len(sw['spectra'])} 條頻譜、{len(sw['power'])} 條功率曲線）")
    log("分析中 …")
    R = engine.analyse(df, params, specs, ref_group=ref, spec_info=spec_info)
    swr = sweep_payload.to_report(sw) if sw["files"] else None
    out = out or os.path.join(folder, "PIC_Report")
    os.makedirs(out, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M")
    lots = "_".join(sorted({str(v) for v in R["data"].get("LOT_ID", []) if v}))[:40] or "data"
    html_path = os.path.join(out, f"PIC_Report_{lots}_{stamp}.html")
    xlsx_path = os.path.join(out, f"PIC_Summary_{lots}_{stamp}.xlsx")
    with open(html_path, "w", encoding="utf-8") as fh:
        fh.write(html.build_html(R, sets, folder, standalone=True, inline_plotly=True, sweep=swr))
    excel.write_excel(R, xlsx_path, sweep=sw if sw["files"] else None)
    sev = {s: sum(f["severity"] == s for f in R["findings"]) for s in ("critical", "major", "minor", "info")}
    log(f"Findings：嚴重 {sev['critical']}、重要 {sev['major']}、次要 {sev['minor']}、資訊 {sev['info']}")
    log(f"報告：{html_path}")
    log(f"Excel：{xlsx_path}")
    if open_browser:
        webbrowser.open("file://" + os.path.abspath(html_path))
    return html_path, xlsx_path, R
