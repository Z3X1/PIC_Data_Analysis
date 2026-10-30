"""Parameter-name parsing and per-family information.

`parse_param` splits a column name into structured fields:
  '1stPDIdark_CH4' -> family PDIdark, stage 1st, channel 4
  'IL_O24O17_CH3'  -> family IL, in O24, out O17, channel 3
  'Heater5'        -> family Heater, channel 5
  'MZMIph_O21'     -> family MZMIph, port O21
Units from the TestSpec override the defaults when a spec file is loaded.
"""
from __future__ import annotations

import re

from ..i18n import t


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


# Physics notes / units / direction per family live in the private knowledge base (domain/families.py).
# Without it FAMILY is empty: name parsing still works, the report simply shows no physics notes.
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
    base = FAMILY.get(k, dict(title=param, unit="", direction="target", block=t("Other"), physics=""))
    return {**p, "fkey": k, **base}
