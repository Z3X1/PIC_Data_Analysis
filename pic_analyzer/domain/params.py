"""參數名稱解析與各參數家族的物理說明。

`parse_param` 把欄位名稱拆成結構化欄位：
  '1stPDIdark_CH4' -> family PDIdark, stage 1st, channel 4
  'IL_O24O17_CH3'  -> family IL, in O24, out O17, channel 3
  'Heater5'        -> family Heater, channel 5
  'MZMIph_O21'     -> family MZMIph, port O21
單位以 TestSpec（PROGRAM_SPEC.Ver3）為準；spec 檔載入時會覆寫這裡的預設。
"""
from __future__ import annotations

import re


_PATTERNS = [
    re.compile(r"^(?P<fam>IL|Loss|TL|RL)_(?P<inp>O\d+)(?P<out>O\d+)_CH(?P<ch>\d+)$", re.I),
    re.compile(r"^(?P<stage>1st|2nd|3rd|\d+th)?(?P<fam>[A-Za-z][A-Za-z ]*?)[ _]?CH(?P<ch>\d+)$", re.I),
    re.compile(r"^(?P<fam>[A-Za-z][A-Za-z]*?)_(?P<port>O\d+)$", re.I),
    re.compile(r"^(?P<fam>Heater|Htr|Ring|Res)(?P<ch>\d+)$", re.I),
    re.compile(r"^(?P<fam>[A-Za-z][A-Za-z ]*?)[ _]?(?P<ch>\d+)$", re.I),
]


def parse_param(name: str) -> dict:
    n = str(name).strip()
    for rx in _PATTERNS:
        m = rx.match(n)
        if m:
            g = {k: v for k, v in m.groupdict().items() if v}
            fam = g.get("fam", n).strip().replace(" ", "")
            stage = g.get("stage", "")
            return {"name": n, "family": fam, "stage": stage, "ch": int(g["ch"]) if "ch" in g else None,
                    "port": g.get("port") or g.get("inp") or "", "out": g.get("out", ""),
                    "group": (stage + fam) if stage else fam}
    return {"name": n, "family": n, "stage": "", "ch": None, "port": "", "out": "", "group": n}


# 各家族的物理說明 / 單位 / 方向屬於私有知識庫（domain/families.py，不在公開 repo）。
# 沒有私有模組時 FAMILY 為空：命名解析照常運作，報告只是不顯示物理說明。
try:
    from .families import FAMILY
except ImportError:  # public build
    FAMILY = {}


def family_key(fam: str) -> str:
    f = fam.replace(" ", "")
    if f in FAMILY:
        return f
    for k in FAMILY:
        if f.lower() == k.lower():
            return k
    f2 = re.sub(r"^(1st|2nd|3rd)", "", f, flags=re.I)
    for k in FAMILY:
        if f2.lower() == k.lower():
            return k
    return f


def info(param: str) -> dict:
    p = parse_param(param)
    k = family_key(p["family"])
    base = FAMILY.get(k, dict(title=param, unit="", direction="target", block="其他", physics=""))
    return {**p, "fkey": k, **base}
