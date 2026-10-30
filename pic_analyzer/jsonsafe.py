"""Turn numpy / pandas values into Python values that JSON can hold.

jnum(x, nd)     one number → rounded float; NaN / inf → None
to_jsonable(o)  recursive over dict / list / numpy types
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd


def jnum(x, nd=4):
    """float -> rounded python float / None (JSON safe)."""
    if x is None:
        return None
    try:
        x = float(x)
    except (TypeError, ValueError):
        return None
    if math.isnan(x) or math.isinf(x):
        return None
    if x == 0:
        return 0.0
    return float(f"{x:.{nd}g}") if abs(x) < 1e-3 or abs(x) >= 1e5 else round(x, nd)


def to_jsonable(o):
    if isinstance(o, dict):
        return {str(k): to_jsonable(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [to_jsonable(v) for v in o]
    if isinstance(o, (np.bool_,)):
        return bool(o)
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return jnum(o, 6)
    if isinstance(o, (pd.Timestamp,)):
        return str(o)
    return o
