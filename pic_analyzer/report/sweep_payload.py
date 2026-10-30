"""掃描曲線 → 報告用資料（降取樣 + 摘要）。
"""
from __future__ import annotations

import numpy as np

from ..jsonsafe import jnum


def to_report(sw, max_points=400):
    """Down-sample curves for the HTML report."""
    def ds(xs, ys):
        if len(xs) <= max_points:
            return xs, ys
        idx = np.linspace(0, len(xs) - 1, max_points).astype(int)
        return [xs[i] for i in idx], [ys[i] for i in idx]
    out = dict(target=sw["target"], files=sw["files"], spectra=[], power=[])
    for s in sw["spectra"]:
        x, y = ds(s["x"], s["y"])
        out["spectra"].append(dict(dataset=s["dataset"], curve=s["curve"], meta=s["meta"], x=[jnum(v, 6) for v in x], y=[jnum(v, 5) for v in y],
                                   m={k: jnum(v, 5) for k, v in s["m"].items()}))
    for s in sw["power"]:
        x, y = ds(s["x"], s["y"])
        out["power"].append(dict(dataset=s["dataset"], curve=s["curve"], ycol=s["ycol"], meta=s["meta"], x=[jnum(v, 6) for v in x], y=[jnum(v, 6) for v in y],
                                 m={k: jnum(v, 7) for k, v in s["m"].items()}))
    from ..analysis.sweep_metrics import summarize  # private core
    out["summary"] = summarize(sw)
    return out
