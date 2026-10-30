"""Decision thresholds — the single place to tune them.

Every analysis step and findings rule reads its thresholds from this file; no other module hard-codes them.
"""
from __future__ import annotations


LOG_FAMILIES = {"PDIdark", "MZMIdark"}
Z_FLAG = 5.0       # robust-z for an anomaly flag
Z_WATCH = 3.5      # robust-z for a watch-list entry
ALPHA_Q = 0.01     # FDR-adjusted significance for group shifts
D_EFFECT = 0.8     # Cohen's d threshold for a "large" shift
