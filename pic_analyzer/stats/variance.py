"""變異分解。

icc_die  ICC(1)：die × 通道矩陣中，die 之間的變異佔總變異的比例
"""
from __future__ import annotations

import numpy as np


def icc_die(mat):
    """mat: dies x channels (nan allowed). Return share of variance explained by die (ICC1)."""
    m = np.asarray(mat, float)
    rows = [r[~np.isnan(r)] for r in m]
    rows = [r for r in rows if len(r) >= 2]
    if len(rows) < 3:
        return np.nan
    k = np.mean([len(r) for r in rows])
    grand = np.mean(np.concatenate(rows))
    msb = sum(len(r) * (r.mean() - grand) ** 2 for r in rows) / (len(rows) - 1)
    msw = sum(((r - r.mean()) ** 2).sum() for r in rows) / (sum(len(r) for r in rows) - len(rows))
    if msb + (k - 1) * msw == 0:
        return np.nan
    return max(0.0, (msb - msw) / (msb + (k - 1) * msw))
