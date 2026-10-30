"""TestSpec 讀取：程式 spec 工作簿、簡易 spec 表，以及把規則套到參數上。

Test-specification readers.

Supports
  1. Program spec workbooks like PROGRAM_SPEC.Ver3.xls  (sheet SPEC: Item | SYMBOL | MIN | MAX | UNITS,
     TXPATHn blocks with IN/OUT ports, SETTINGS block; sheet FLOW: optical test sequence)
  2. Simple tables (spec_limits.csv / .xlsx): Parameter, LSL, USL, Unit, Target  (regex rows /.../ allowed)

`read_spec(path)` returns a dict:
  rules       {name-or-/regex/: {LSL, USL, UNIT}}   -> resolve_specs(params, rules)
  conditions  [{item, value, unit}]                 test settings (bias, compliance, power, temperature)
  flow        [{step, path, channel, detector, wavelength}]
  paths       {ch: {in, out}}
  meta        {test_code, part_number, rev, description, file}
"""
from __future__ import annotations

import os
import re

import numpy as np
import pandas as pd


def _num(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    try:
        return float(str(v).strip())
    except ValueError:
        return None


def _s(v):
    return "" if v is None or (isinstance(v, float) and np.isnan(v)) else str(v).strip()


def _sheets(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in (".csv", ".txt"):
        return {"csv": pd.read_csv(path, header=None, sep=None, engine="python")}
    xl = pd.ExcelFile(path)
    return {s: xl.parse(s, header=None) for s in xl.sheet_names}


def is_program_spec(path) -> bool:
    """True if the workbook looks like a program test spec (SYMBOL/MIN/MAX header)."""
    try:
        for name, d in _sheets(path).items():
            for i in range(min(10, len(d))):
                row = [_s(v).upper() for v in d.iloc[i].values]
                if "SYMBOL" in row and "MIN" in row and "MAX" in row:
                    return True
                if name.upper() == "SPEC" and "MIN" in row and "MAX" in row:
                    return True
    except Exception:  # noqa: BLE001
        return False
    return False


def is_simple_spec(path) -> bool:
    try:
        t = pd.read_csv(path, nrows=3, comment="#") if path.lower().endswith(".csv") else pd.read_excel(path, nrows=3)
    except Exception:  # noqa: BLE001
        return False
    cols = {str(c).strip().lower() for c in t.columns}
    return ("lsl" in cols or "usl" in cols) and ("parameter" in cols or "param" in cols or "name" in cols)


def read_program_spec(path):
    sh = _sheets(path)
    spec_name = next((n for n in sh if n.upper() == "SPEC"), list(sh)[0])
    d = sh[spec_name]
    # header row
    hdr = 0
    for i in range(min(10, len(d))):
        row = [_s(v).upper() for v in d.iloc[i].values]
        if "MIN" in row and "MAX" in row:
            hdr = i
            break
    hrow = [_s(v).upper() for v in d.iloc[hdr].values]
    c_sym = hrow.index("SYMBOL") if "SYMBOL" in hrow else 1
    c_min, c_max = hrow.index("MIN"), hrow.index("MAX")
    c_unit = hrow.index("UNITS") if "UNITS" in hrow else (hrow.index("UNIT") if "UNIT" in hrow else c_max + 1)
    meta = dict(file=os.path.basename(path))
    top = " ".join(_s(v) for v in d.iloc[:hdr].values.ravel())
    m = re.search(r"Part number\s*:\s*(\S+)", top, re.I)
    meta["part_number"] = m.group(1) if m else ""
    m = re.search(r"REV\s*:\s*(\S+)", top, re.I)
    meta["rev"] = m.group(1) if m else ""
    m = re.search(r"Description\s*:\s*(.+?)(?:\s{2,}|$)", top, re.I)
    meta["description"] = m.group(1).strip() if m else ""
    meta["test_code"] = _s(d.iloc[0, 0]) if hdr > 0 else ""

    rules, conditions, paths = {}, [], {}
    section, cur_path, pending_in = "", None, None
    for i in range(hdr + 1, len(d)):
        r = d.iloc[i].values
        item, sym = _s(r[0]), _s(r[c_sym]) if c_sym < len(r) else ""
        vmin = r[c_min] if c_min < len(r) else None
        vmax = r[c_max] if c_max < len(r) else None
        unit = _s(r[c_unit]) if c_unit < len(r) else ""
        if item and not sym and _s(vmin) == "" and _s(vmax) == "" and item.isupper() and len(item) > 6 and "," not in item:
            section = item.strip()            # e.g. SETTINGS, TX OPTICAL TEST PARAMETERS
            cur_path = None
            continue
        mp = re.match(r"^(TX|RX)PATH\s*(\d+)$", item, re.I)
        if mp:
            cur_path = int(mp.group(2))
            if _s(vmin).upper() == "IN":
                paths.setdefault(cur_path, {})["in"] = _s(vmax)
            continue
        if not item and _s(vmin).upper() == "OUT" and cur_path:
            paths.setdefault(cur_path, {})["out"] = _s(vmax)
            continue
        if section.upper().startswith("SETTING"):
            if item:
                conditions.append(dict(item=item, value=_s(vmin), unit=unit))
            continue
        if not sym:
            continue
        lo, hi = _num(vmin), _num(vmax)
        if lo is None and hi is None:
            continue  # symbol defined but not tested / no limits
        s = {}
        if lo is not None:
            s["LSL"] = lo
        if hi is not None:
            s["USL"] = hi
        if unit:
            s["UNIT"] = unit.replace("uA", "µA").replace("ohm", "Ω").replace("mW/pi", "mW/π")
        symc = sym.replace(" ", r"\s?")
        if cur_path:
            ch = cur_path
            pin, pout = paths.get(ch, {}).get("in", ""), paths.get(ch, {}).get("out", "")
            if sym.upper() == "IL":
                key = f"/^IL_{pin}{pout}_CH{ch}$/" if pin and pout else f"/^IL_.*_CH{ch}$/"
            elif sym.upper() == "MZMIPH":
                key = f"/^MZMIph_{pin}$/" if pin else f"/^MZMIph_.*$/"
            else:
                key = f"/^{symc}_?CH{ch}$/"
        elif sym.lower() == "heater":
            key = r"/^Heater\d+$/"
        else:
            key = f"/^{symc}(_?CH\\d+)?$/"
        rules[key] = s

    flow = []
    fl = next((sh[n] for n in sh if n.upper() == "FLOW"), None)
    if fl is not None:
        start = None
        for i in range(len(fl)):
            row = [_s(v).upper() for v in fl.iloc[i].values]
            if "STEP" in row:
                start = i
                cols = row
                break
        if start is not None:
            for i in range(start + 1, len(fl)):
                r = [_s(v) for v in fl.iloc[i].values]
                if not r[0]:
                    continue
                flow.append({cols[j].lower().replace(" ", "_"): r[j] for j in range(len(cols)) if cols[j]})
        for i in range(len(fl)):
            r = [_s(v) for v in fl.iloc[i].values]
            if r[0] and r[0].upper() in ("TX INPUT", "TX OUTPUT", "RX IN"):
                conditions.append(dict(item=r[0], value=r[1], unit=""))
    return dict(rules=rules, conditions=conditions, flow=flow, paths=paths, meta=meta)


def read_simple_spec(path):
    t = pd.read_csv(path, comment="#") if path.lower().endswith(".csv") else pd.read_excel(path)
    cols = {str(c).lower().strip(): c for c in t.columns}
    pcol = cols.get("parameter") or cols.get("param") or cols.get("name") or t.columns[0]
    rules = {}
    for _, r in t.iterrows():
        key = _s(r[pcol])
        if not key or key.lower() == "nan" or key.startswith("#"):
            continue
        s = {}
        for k in ("LSL", "USL", "Target", "Unit"):
            c = cols.get(k.lower())
            if c is not None and _s(r[c]) != "":
                s[k.upper()] = _s(r[c]) if k == "Unit" else float(r[c])
        if s:
            rules[key] = s
    return dict(rules=rules, conditions=[], flow=[], paths={}, meta=dict(file=os.path.basename(path)))


def read_spec(path):
    if is_program_spec(path):
        return read_program_spec(path)
    return read_simple_spec(path)


def find_spec_files(folder, recursive=False):
    out = []
    walker = os.walk(folder) if recursive else [(folder, [], os.listdir(folder))]
    for root, _d, files in walker:
        if "PIC_Report" in root.split(os.sep):
            continue
        for f in sorted(files):
            p = os.path.join(root, f)
            if f.startswith(("~$", ".")) or not f.lower().endswith((".xls", ".xlsx", ".csv")):
                continue
            if f.lower().startswith("spec_limits") or is_program_spec(p):
                out.append(p)
    return out


def resolve_specs(params, rules: dict) -> dict:
    """Apply spec rules to parameter names.  Regex rules (/.../) first, exact names afterwards so an exact row wins."""
    out = {}
    # regex rules first, exact names afterwards so an exact row always wins
    ordered = sorted(rules.items(), key=lambda kv: 0 if (kv[0].startswith("/") and kv[0].endswith("/")) else 1)
    for key, s in ordered:
        if key.startswith("/") and key.endswith("/") and len(key) > 2:
            rx = re.compile(key[1:-1])
            for p in params:
                if rx.fullmatch(p) or rx.search(p):
                    out.setdefault(p, {}).update(s)
        elif key in params:
            out.setdefault(key, {}).update(s)
    return out
