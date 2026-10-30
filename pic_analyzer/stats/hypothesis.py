"""Group-difference statistics.

bh_fdr   Benjamini-Hochberg FDR adjustment (multiple comparisons)
cohen_d  effect size (mean_b − mean_a) / pooled SD
"""
from __future__ import annotations

import numpy as np


def bh_fdr(p):
    p = np.asarray(p, float)
    n = np.sum(~np.isnan(p))
    q = np.full_like(p, np.nan)
    idx = np.where(~np.isnan(p))[0]
    if n == 0:
        return q
    order = idx[np.argsort(p[idx])]
    ranked = p[order] * n / (np.arange(1, n + 1))
    ranked = np.minimum.accumulate(ranked[::-1])[::-1]
    q[order] = np.minimum(ranked, 1.0)
    return q


def cohen_d(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    s = np.sqrt((np.var(a, ddof=1) + np.var(b, ddof=1)) / 2)
    return (np.mean(b) - np.mean(a)) / s if s > 0 else np.nan
