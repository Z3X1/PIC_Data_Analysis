"""Unit conversions.
"""
from __future__ import annotations

import numpy as np


def dbm_to_mw(v):
    return 10 ** (np.asarray(v, float) / 10)
