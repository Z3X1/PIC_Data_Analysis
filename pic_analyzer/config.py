"""判定門檻（全部集中在這裡調整）。

所有分析步驟與 findings 規則都從這個檔案讀門檻，不在其他地方寫死數字。
"""
from __future__ import annotations


LOG_FAMILIES = {"PDIdark", "MZMIdark"}
Z_FLAG = 5.0       # robust-z for an anomaly flag
Z_WATCH = 3.5      # robust-z for a watch-list entry
ALPHA_Q = 0.01     # FDR-adjusted significance for group shifts
D_EFFECT = 0.8     # Cohen's d threshold for a "large" shift
