"""Descriptive statistics and process capability.

describe        n / mean / sd / median / robust σ / quantiles / extreme counts; with a spec also yield, Ppk, worst reading to limit
cpk_short_term  Cpk with the short-term I-MR σ (mean(MR)/1.128); log parameters in log10 space, limits transformed too
"""
from __future__ import annotations

import numpy as np
from scipy import stats

from ..config import Z_FLAG, Z_WATCH
from .robust import resolution, robust_sigma


def describe(x, spec=None, logscale=False):
    x = np.asarray(x, float)
    x = x[~np.isnan(x)]
    n = len(x)
    out = dict(n=n)
    if n == 0:
        return out
    med = np.median(x)
    rs = robust_sigma(x) if n >= 3 else np.nan
    sd = np.std(x, ddof=1) if n > 1 else np.nan
    mean = np.mean(x)
    q1, q3 = np.percentile(x, [25, 75])
    out.update(mean=mean, sd=sd, median=med, rsd=rs, min=np.min(x), max=np.max(x), q1=q1, q3=q3,
               cv=(sd / abs(mean) * 100 if mean else np.nan), res=resolution(x), nuniq=len(np.unique(x)))
    if n >= 8:
        out["skew"] = stats.skew(x)
    if logscale and np.all(x > 0):
        lx = np.log10(x)
        out["gmean"] = 10 ** np.mean(lx)
        lmed, lrs = np.median(lx), robust_sigma(lx)
        out["log_rsd"] = lrs
        z = (lx - lmed) / lrs if lrs and lrs > 0 else np.zeros(n)
    else:
        z = (x - med) / rs if rs and rs > 0 else np.zeros(n)
    out["n_flag"] = int(np.sum(np.abs(z) > Z_FLAG))
    out["n_watch"] = int(np.sum((np.abs(z) > Z_WATCH) & (np.abs(z) <= Z_FLAG)))
    if spec:
        lsl, usl = spec.get("LSL"), spec.get("USL")
        if lsl is not None or usl is not None:
            fail = np.zeros(n, bool)
            if lsl is not None:
                fail |= x < lsl
            if usl is not None:
                fail |= x > usl
            out["n_fail"] = int(fail.sum())
            out["yield"] = 100 * (1 - fail.mean())
            # capability: log-normal parameters are judged in log10 space (limits transformed too)
            xx, lo, hi = x, lsl, usl
            if logscale and np.all(x > 0):
                xx = np.log10(x)
                lo = np.log10(lsl) if lsl is not None and lsl > 0 else None
                hi = np.log10(usl) if usl is not None and usl > 0 else None
            m_, s_ = np.mean(xx), np.std(xx, ddof=1) if n > 1 else np.nan
            if s_ and s_ > 0:
                cpu = (hi - m_) / (3 * s_) if hi is not None else np.nan
                cpl = (m_ - lo) / (3 * s_) if lo is not None else np.nan
                out["ppk"] = np.nanmin([cpu, cpl])
                if lo is not None and hi is not None:
                    out["pp"] = (hi - lo) / (6 * s_)
            # worst-case margin to the nearest limit
            margins = []
            if usl is not None:
                margins.append(("USL", usl - np.max(x), usl))
            if lsl is not None:
                margins.append(("LSL", np.min(x) - lsl, lsl))
            side, mg, lim = min(margins, key=lambda t: t[1] / (abs(t[2]) if t[2] else 1))
            out["margin"] = mg
            out["margin_side"] = side
            out["worst"] = np.max(x) if side == "USL" else np.min(x)
            out["margin_pct"] = 100 * mg / abs(lim) if lim else np.nan
            # distance of the median to the limit in robust sigmas
            rs2 = robust_sigma(xx)
            lim_t = hi if side == "USL" else lo
            if lim_t is not None and rs2 and rs2 > 0:
                out["sig_to_lim"] = abs(lim_t - np.median(xx)) / rs2
    return out


def cpk_short_term(x_ordered, spec, logscale=False):
    x = np.asarray(x_ordered, float)
    x = x[~np.isnan(x)]
    if len(x) < 5 or not spec:
        return None
    lsl, usl = spec.get("LSL"), spec.get("USL")
    if logscale and np.all(x > 0):
        x = np.log10(x)
        lsl = np.log10(lsl) if lsl is not None and lsl > 0 else None
        usl = np.log10(usl) if usl is not None and usl > 0 else None
    mr = np.abs(np.diff(x))
    s = np.mean(mr) / 1.128
    if s <= 0:
        return None
    m = np.mean(x)
    c = []
    if usl is not None:
        c.append((usl - m) / (3 * s))
    if lsl is not None:
        c.append((m - lsl) / (3 * s))
    return min(c) if c else None
