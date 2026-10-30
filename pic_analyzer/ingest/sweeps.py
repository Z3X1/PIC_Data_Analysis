"""掃描檔讀取：IL 對波長（spectrum）與光功率線性度（power）的曲線。指標計算在分析核心。

Sweep data: IL vs wavelength (spectrum) and optical-power linearity.

Accepted layouts (Excel / CSV), auto-detected:
  A) Long table — one row per point:
       [WAFER_ID] [PART_ID | DIE | X_COORD,Y_COORD] [CH | CHANNEL | PATH] Wavelength(nm) IL(dB)
       [WAFER_ID] [PART_ID ...] [CH ...] Pin(mW|dBm) Pout(mW|dBm) | Iph(uA)
  B) Wide spectrum — one row per die × channel, numeric column headers are wavelengths (e.g. 1290 … 1330)
A file is treated as a sweep when it has a wavelength / input-power axis column, or ≥ 10 numeric column
headers in a 1200–1700 range.
"""
from __future__ import annotations

import os
import re

import numpy as np
import pandas as pd

from ..domain.units import dbm_to_mw

WL_RX = re.compile(r"(wave|lambda|^wl$|^wl[_ ]|nm\b|_nm$|\(nm\))", re.I)
PIN_RX = re.compile(r"^(p_?in|pin|input[_ ]?power|power[_ ]?in|laser[_ ]?power|p_set|pset)", re.I)
POUT_RX = re.compile(r"^(p_?out|pout|output[_ ]?power|power[_ ]?out|pm|power[_ ]?meter)", re.I)
IL_RX = re.compile(r"^(il|loss|insertion|transmission|t_db|tx_db)", re.I)
IPH_RX = re.compile(r"(iph|photocurrent|i_pd|current)", re.I)
ID_COLS = ("WAFER_ID", "LOT_ID", "PART_ID", "DIE", "DIE_ID", "X_COORD", "Y_COORD", "X", "Y", "CH", "CHANNEL", "PATH", "PORT", "SITE")


def _read(path):
    if path.lower().endswith((".csv", ".txt")):
        return pd.read_csv(path, sep=None, engine="python")
    x = pd.ExcelFile(path)
    best = None
    for sh in x.sheet_names:
        d = x.parse(sh)
        if best is None or d.size > best.size:
            best = d
    return best


def detect(path):
    """Return ('spectrum'|'power'|None, DataFrame)."""
    try:
        d = _read(path)
    except Exception:  # noqa: BLE001
        return None, None
    if d is None or d.empty:
        return None, None
    cols = [str(c).strip() for c in d.columns]
    d.columns = cols
    numhdr = []
    for c in cols:
        try:
            v = float(c)
            if 1200 <= v <= 1700:
                numhdr.append(c)
        except ValueError:
            pass
    if len(numhdr) >= 10:
        return "spectrum_wide", d
    if any(WL_RX.search(c) for c in cols):
        return "spectrum", d
    if any(PIN_RX.search(c) for c in cols):
        return "power", d
    return None, None


def _id_cols(d, exclude):
    out = []
    for c in d.columns:
        if c in exclude:
            continue
        if c.upper() in ID_COLS or not pd.api.types.is_numeric_dtype(d[c]):
            out.append(c)
    return out


def _curve_id(row, ids):
    return " | ".join(f"{c}={row[c]}" for c in ids)


def read_curves(folder, files=None, recursive=False, dataset_name=None):
    """Read every sweep file into raw curves (no metrics).  Returns dict(spectra=[...], power=[...], files=[...])."""
    from .datasets import scan_folder, auto_name  # local import to avoid cycles
    paths = files or scan_folder(folder, recursive)
    spectra, power, used = [], [], []
    for p in paths:
        kind, d = detect(p)
        if not kind:
            continue
        name = (dataset_name or {}).get(os.path.basename(p)) or auto_name(d, os.path.basename(p))
        used.append(dict(file=os.path.basename(p), kind=kind, rows=len(d), dataset=name))
        if kind == "spectrum_wide":
            wcols = [c for c in d.columns if re.fullmatch(r"\d{4}(\.\d+)?", c)]
            ids = [c for c in d.columns if c not in wcols]
            wl = np.array([float(c) for c in wcols])
            for _, r in d.iterrows():
                spectra.append(dict(dataset=name, curve=_curve_id(r, ids), meta={c: str(r[c]) for c in ids},
                                    x=wl, y=r[wcols].values.astype(float)))
        elif kind == "spectrum":
            wc = next(c for c in d.columns if WL_RX.search(c))
            yc = next((c for c in d.columns if c != wc and IL_RX.search(c) and pd.api.types.is_numeric_dtype(d[c])), None)
            if yc is None:
                yc = next((c for c in d.columns if c != wc and pd.api.types.is_numeric_dtype(d[c]) and c.upper() not in ID_COLS), None)
            ids = _id_cols(d, {wc, yc})
            groups = d.groupby(ids, sort=False) if ids else [((), d)]
            for key, g in groups:
                meta = dict(zip(ids, key if isinstance(key, tuple) else (key,)))
                spectra.append(dict(dataset=name, curve=" | ".join(f"{k}={v}" for k, v in meta.items()), meta={k: str(v) for k, v in meta.items()},
                                    x=g[wc].values, y=g[yc].values, ycol=yc))
        elif kind == "power":
            pc = next(c for c in d.columns if PIN_RX.search(c))
            ycols = [c for c in d.columns if c != pc and pd.api.types.is_numeric_dtype(d[c]) and (POUT_RX.search(c) or IPH_RX.search(c))]
            ids = _id_cols(d, {pc, *ycols})
            pin_db = "dbm" in pc.lower()
            groups = d.groupby(ids, sort=False) if ids else [((), d)]
            for key, g in groups:
                x = g[pc].values.astype(float)
                xmw = dbm_to_mw(x) if pin_db else x
                meta = dict(zip(ids, key if isinstance(key, tuple) else (key,)))
                for yc in ycols:
                    power.append(dict(dataset=name, curve=" | ".join(f"{k}={v}" for k, v in meta.items()), meta={k: str(v) for k, v in meta.items()},
                                      ycol=yc, x=xmw, y=g[yc].values, y_is_db="dbm" in yc.lower()))
    return dict(spectra=spectra, power=power, files=used)
