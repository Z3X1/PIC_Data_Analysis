"""One complete analysis: folder → files → spec → sweeps → analysis → HTML + Excel.

run() is the only function to read; each step maps to one layer:
    ingest.datasets / ingest.specs / ingest.sweeps   reading
    analysis.sweep_metrics                          sweep metrics (private core)
    engine.analyse                                  analysis + findings (private core)
    report.html / report.excel                      output
"""
from __future__ import annotations

import datetime as dt
import os
import webbrowser

import pandas as pd

from .. import engine
from ..ingest import datasets, sweeps
from ..ingest import specs as specs_mod
from ..i18n import t
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
        raise SystemExit(t("The analysis core (pic_analyzer/analysis, findings, domain knowledge base) is not installed: this is the public shell and the core modules are private."))
    log(t("Scanning folder {folder} …", folder=folder))
    sets, errors = datasets.load_folder(folder, recursive=recursive, names=names, files=files)
    for f, e in errors:
        log(t("  skipped {file}: {error}", file=f, error=e))
    if not sets:
        raise SystemExit(t("No readable Excel/CSV/XML test data found."))
    for d in sets:
        log(t("  {name:<22} {rows:>5} rows  {params:>4} parameters  ← {file}", name=d.name, rows=len(d.df), params=len(d.params), file=os.path.basename(d.path)))
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
        log(t("  spec: {file} → {mapped} / {total} parameters mapped", file=os.path.basename(sp), mapped=len(res), total=len(params)))
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
        log(t("  sweep files: {files} ({spectra} spectra, {power} power curves)", files=len(sw["files"]), spectra=len(sw["spectra"]), power=len(sw["power"])))
    log(t("Analysing …"))
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
    log(t("Findings: critical {critical}, major {major}, minor {minor}, info {info}", **sev))
    log(t("Report: {path}", path=html_path))
    log(t("Excel: {path}", path=xlsx_path))
    if open_browser:
        webbrowser.open("file://" + os.path.abspath(html_path))
    return html_path, xlsx_path, R
