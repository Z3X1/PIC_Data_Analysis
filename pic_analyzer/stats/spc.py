"""SPC control-chart rules.

nelson  Nelson rules on an I-chart (σ = mean(MR)/1.128):
        R1 one point beyond 3σ, R2 nine points in a row on one side, R3 six points steadily rising / falling
"""
from __future__ import annotations

import numpy as np

from ..i18n import t


def nelson(x):
    """Return list of (rule, index) violations on an I-chart with MR-based sigma."""
    x = np.asarray(x, float)
    ok = ~np.isnan(x)
    idx_map = np.where(ok)[0]
    x = x[ok]
    n = len(x)
    if n < 8:
        return [], None, None
    mr = np.abs(np.diff(x))
    s = np.mean(mr) / 1.128
    c = np.mean(x)
    out = []
    if s <= 0:
        return [], c, s
    for i in range(n):
        if abs(x[i] - c) > 3 * s:
            out.append((t("R1: beyond 3σ"), int(idx_map[i])))
    side = np.sign(x - c)
    run = 1
    for i in range(1, n):
        run = run + 1 if side[i] == side[i - 1] and side[i] != 0 else 1
        if run == 9:
            out.append((t("R2: 9 in a row on one side"), int(idx_map[i])))
    d = np.sign(np.diff(x))
    run = 1
    for i in range(1, len(d)):
        run = run + 1 if d[i] == d[i - 1] and d[i] != 0 else 1
        if run == 5:  # 6 points steadily rising/falling
            out.append((t("R3: 6 in a row rising / falling"), int(idx_map[i + 1])))
    return out, c, s
