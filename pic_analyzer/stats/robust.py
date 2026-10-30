"""穩健統計：不受少數離群值影響的中心 / 尺度估計。

robust_sigma   1.4826 × MAD（MAD = 0 時退回 IQR/1.349，再退回 SD）
robust_z       (x − median) / robust_sigma，log 參數在 log10 尺度
resolution     記錄解析度 = 相鄰不同數值的最小間距
is_log_param   是否以 log-normal 處理（暗電流家族，或高度右偏且 log 後對稱）
"""
from __future__ import annotations

import numpy as np
from scipy import stats

from ..config import LOG_FAMILIES


def robust_sigma(x):
    x = np.asarray(x, float)
    x = x[~np.isnan(x)]
    if len(x) < 3:
        return np.nan
    med = np.median(x)
    s = 1.4826 * np.median(np.abs(x - med))
    if s == 0:
        q1, q3 = np.percentile(x, [25, 75])
        s = (q3 - q1) / 1.349
    if s == 0:
        s = np.std(x, ddof=1)
    return s


def robust_z(x, logscale):
    x = np.asarray(x, float)
    v = np.log10(np.where(x > 0, x, np.nan)) if logscale else x
    med = np.nanmedian(v)
    rs = robust_sigma(v)
    if not rs or np.isnan(rs) or rs == 0:
        return np.zeros_like(v)
    return (v - med) / rs


def resolution(x):
    u = np.unique(np.round(np.asarray(x, float)[~np.isnan(np.asarray(x, float))], 9))
    if len(u) < 2:
        return np.nan
    d = np.diff(u)
    d = d[d > 0]
    return float(np.min(d)) if len(d) else np.nan


def is_log_param(fkey, x):
    if fkey in LOG_FAMILIES:
        return True
    x = np.asarray(x, float)
    x = x[~np.isnan(x)]
    if len(x) < 8 or np.any(x <= 0):
        return False
    return stats.skew(x) > 3 and abs(stats.skew(np.log10(x))) < stats.skew(x) / 3
