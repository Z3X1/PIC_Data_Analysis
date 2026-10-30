"""Test-data reading: folder scan, Excel / CSV / XML parsing, automatic naming, merging.

Folder scanning and file parsing (Excel / CSV / XML) into one tidy table.

Every loaded row keeps:
  _dataset   auto-generated dataset name (e.g. WAFERLOT-W01), user-renamable
  _file      source file name
  _row       0-based row order inside the file (= test sequence if no time stamp)
and all original columns.  Parameter (measurement) columns are listed in
Dataset.params; spec limits found inside the file are returned in Dataset.specs.
"""
from __future__ import annotations

import os
import re
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

SUPPORTED = (".xlsx", ".xlsm", ".xls", ".csv", ".txt", ".xml")

# Columns that are identity / condition information, never measurements.
KNOWN_META = {
    "LOT_ID", "MODE", "PART_NUM", "PART_REV", "WO_ID", "CAL_FILE", "PROGRAM",
    "PROGRAM_REV", "MFG_PROC_ID", "MFG_PROC_REV", "OPERATOR", "TEST_TEMP",
    "TEST_FACILITY", "TESTER_ID", "START_DATE", "END_DATE", "TEST_CODE",
    "TESTER_TYPE", "SUBLOT_ID", "WO_OPCODE", "WAFER_ID", "X_DIR", "Y_DIR",
    "SITE_NUM", "PART_ID", "RESULT", "TEST_TIME", "HARD_BIN", "X_COORD",
    "Y_COORD", "SOFT_BIN", "SOFT_DESC", "RETEST", "DIE_X", "DIE_Y", "X", "Y",
    "SITE", "BIN", "SERIAL", "SN", "TIMESTAMP", "DATE", "TIME", "SLOT",
}
META_PATTERN = re.compile(
    r"(^|_)(ID|LOT|WAFER|DATE|BIN|COORD|SITE|DIR|REV|RESULT|RETEST|OPERATOR|"
    r"PROGRAM|FACILITY|TESTER|SLOT|SERIAL|DESC|MODE|OPCODE|CAL_FILE)($|_)",
    re.I,
)
SPEC_ROW_KEYS = {
    "lsl": "LSL", "lo_limit": "LSL", "lowlimit": "LSL", "low limit": "LSL",
    "lolim": "LSL", "min": "LSL", "lower": "LSL", "ll": "LSL",
    "usl": "USL", "hi_limit": "USL", "highlimit": "USL", "high limit": "USL",
    "hilim": "USL", "max": "USL", "upper": "USL", "ul": "USL",
    "unit": "UNIT", "units": "UNIT", "target": "TARGET", "nominal": "TARGET",
}


@dataclass
class Dataset:
    name: str
    path: str
    df: pd.DataFrame
    params: list
    meta: list
    specs: dict = field(default_factory=dict)   # param -> {LSL, USL, UNIT, TARGET}
    sheet: str = ""
    notes: list = field(default_factory=list)


# ----------------------------------------------------------------- scanning
def scan_folder(folder: str, recursive: bool = False, exclude_prefix=("~$", "PIC_Report", "PIC_Summary", "spec_limits", "pic_names")):
    out = []
    walker = os.walk(folder) if recursive else [(folder, [], os.listdir(folder))]
    for root, _dirs, files in walker:
        if "PIC_Report" in root.split(os.sep):
            continue
        for f in sorted(files):
            if f.startswith(exclude_prefix) or f.startswith("."):
                continue
            if f.lower().endswith(SUPPORTED):
                out.append(os.path.join(root, f))
    return out


# ------------------------------------------------------------ table helpers
def _is_num(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return False
    if isinstance(v, (int, float, np.number)) and not isinstance(v, bool):
        return True
    try:
        float(str(v).strip())
        return True
    except ValueError:
        return False


def _detect_header(raw: pd.DataFrame, max_scan: int = 25) -> int:
    """Header = first row that is mostly text and is followed by numeric rows."""
    best, best_score = 0, -1
    for i in range(min(max_scan, len(raw) - 1)):
        row = raw.iloc[i]
        nn = row.notna().sum()
        if nn < 3:
            continue
        txt = sum(1 for v in row if isinstance(v, str) and not _is_num(v))
        nxt = raw.iloc[i + 1: i + 6]
        numeric_below = np.mean([sum(_is_num(v) for v in r) for _, r in nxt.iterrows()]) if len(nxt) else 0
        score = txt / max(nn, 1) * 2 + numeric_below / max(nn, 1)
        if txt / max(nn, 1) > 0.6 and score > best_score:
            best, best_score = i, score
    return best


def _split_spec_rows(body: pd.DataFrame):
    """Pull out rows like 'LSL / USL / Unit' that sit between header and data."""
    specs_rows = {}
    keep = []
    for idx, row in body.iterrows():
        label = None
        for v in list(row.values)[:40]:
            if isinstance(v, str) and v.strip().lower() in SPEC_ROW_KEYS:
                label = SPEC_ROW_KEYS[v.strip().lower()]
                break
        if label and len(keep) == 0:  # only rows before the first data row
            specs_rows[label] = row
        else:
            keep.append(idx)
    return body.loc[keep], specs_rows


def _coerce_numeric(df: pd.DataFrame) -> pd.DataFrame:
    out = {}
    for c in df.columns:
        s = df[c]
        if not pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_datetime64_any_dtype(s):
            conv = pd.to_numeric(s, errors="coerce")
            ok = conv.notna().sum()
            if ok >= max(1, 0.8 * s.notna().sum()) and ok > 0:
                out[c] = conv
                continue
        out[c] = s
    return pd.DataFrame(out)


def classify_columns(df: pd.DataFrame):
    cols = list(df.columns)
    up = [str(c).upper() for c in cols]
    # Format with an explicit meta block (e.g. ... SOFT_DESC, RETEST, <params>)
    last_meta = max((i for i, c in enumerate(up) if c in KNOWN_META), default=-1)
    params, meta = [], []
    for i, c in enumerate(cols):
        is_num = pd.api.types.is_numeric_dtype(df[c])
        if up[i] in KNOWN_META:
            meta.append(c)
        elif last_meta >= 0 and i > last_meta and is_num:
            params.append(c)
        elif last_meta >= 0 and i < last_meta:
            meta.append(c)
        elif is_num and not META_PATTERN.search(str(c)):
            params.append(c)
        else:
            meta.append(c)
    # drop all-empty parameter columns
    params = [p for p in params if df[p].notna().any()]
    return params, meta


# ------------------------------------------------------------------ readers
def _read_excel(path):
    xl = pd.ExcelFile(path)
    best = None
    for sh in xl.sheet_names:
        raw = xl.parse(sh, header=None)
        if raw.empty:
            continue
        numeric_cells = raw.map(_is_num).values.sum()
        if best is None or numeric_cells > best[2]:
            best = (sh, raw, numeric_cells)
    if best is None:
        raise ValueError("no non-empty sheet")
    return best[0], best[1]


def _read_csv(path):
    raw = pd.read_csv(path, header=None, sep=None, engine="python")
    return "csv", raw


def _leaf_dict(el, prefix=""):
    d = {f"{prefix}{k}": v for k, v in el.attrib.items()}
    for ch in el:
        if len(ch) == 0 and not ch.attrib:
            d[f"{prefix}{ch.tag}"] = (ch.text or "").strip()
    return d


def _read_xml(path):
    """Generic XML: find the repeating record element.

    Supports two common layouts:
      A) <Die X=.. Y=..><IL>1.2</IL>...</Die>       (one element per die)
      B) <Die X=.. Y=..><Test name="IL" value="1.2" lo=".." hi=".." unit=".."/></Die>
    Spec limits from layout B are captured.
    """
    tree = ET.parse(path)
    root = tree.getroot()
    for el in root.iter():  # strip namespaces
        if isinstance(el.tag, str) and "}" in el.tag:
            el.tag = el.tag.split("}", 1)[1]
    cnt = Counter(el.tag for el in root.iter())
    # candidate record tag: repeats, has attributes or children
    cands = []
    for tag, n in cnt.items():
        if n < 2:
            continue
        sample = next(root.iter(tag))
        richness = len(sample.attrib) + len(list(sample))
        if richness >= 2:
            cands.append((n * richness, tag))
    if not cands:
        raise ValueError("no repeating record element found")
    # prefer the outer-most record that contains name/value tests
    rows, specs = [], {}
    name_keys = ("name", "testname", "test", "param", "parameter")
    val_keys = ("value", "result", "val", "measured")
    for _, tag in sorted(cands, reverse=True):
        rows, specs = [], {}
        for rec in root.iter(tag):
            d = _leaf_dict(rec)
            nv = 0
            for ch in rec:
                a = {k.lower(): v for k, v in ch.attrib.items()}
                nk = next((a[k] for k in name_keys if k in a), None)
                vk = next((a[k] for k in val_keys if k in a), None)
                if nk is not None and vk is not None:
                    d[nk] = vk
                    nv += 1
                    s = specs.setdefault(nk, {})
                    for k_src, k_dst in (("lo", "LSL"), ("lolim", "LSL"), ("lsl", "LSL"), ("low", "LSL"),
                                         ("hi", "USL"), ("hilim", "USL"), ("usl", "USL"), ("high", "USL"),
                                         ("unit", "UNIT"), ("units", "UNIT")):
                        if k_src in a and k_dst not in s:
                            s[k_dst] = a[k_src]
            rows.append(d)
        if rows and len(rows[0]) >= 2:
            break
    df = pd.DataFrame(rows)
    hdr = pd.DataFrame([list(df.columns)])
    raw = pd.concat([hdr, pd.DataFrame(df.values)], ignore_index=True)
    return "xml", raw, specs


# ----------------------------------------------------------------- naming
def auto_name(df: pd.DataFrame, path: str) -> str:
    base = os.path.splitext(os.path.basename(path))[0]
    wid = None
    for c in df.columns:
        if str(c).upper() == "WAFER_ID":
            v = df[c].dropna().astype(str)
            if len(v):
                wid = v.iloc[0].strip()
    if wid:
        m = re.match(r"^\s*([A-Za-z0-9\-]+)[\s_\-#]+(\d{1,3})\s*$", wid)
        if m:
            return f"{m.group(1)}-W{int(m.group(2)):02d}"
        return wid.replace(" ", "_")
    m = re.search(r"([A-Z0-9]{6,})[_\-](\d{1,2})[_\-]", base)
    if m:
        return f"{m.group(1)}-W{int(m.group(2)):02d}"
    lot = next((df[c].dropna().astype(str).iloc[0] for c in df.columns if str(c).upper() == "LOT_ID" and df[c].notna().any()), None)
    return lot or base


def _clean_name(path):
    # strip upload hash prefix like "cd8a7ad6-" so names stay readable
    b = os.path.basename(path)
    return re.sub(r"^[0-9a-f]{8}-", "", b)


# ------------------------------------------------------------------- main
def load_file(path: str) -> Dataset:
    ext = os.path.splitext(path)[1].lower()
    xml_specs = {}
    if ext in (".xlsx", ".xlsm", ".xls"):
        sheet, raw = _read_excel(path)
    elif ext in (".csv", ".txt"):
        sheet, raw = _read_csv(path)
    elif ext == ".xml":
        sheet, raw, xml_specs = _read_xml(path)
    else:
        raise ValueError(f"unsupported: {ext}")

    h = _detect_header(raw)
    header = [str(v).strip() if v is not None and not (isinstance(v, float) and np.isnan(v)) else f"COL{i}"
              for i, v in enumerate(raw.iloc[h].values)]
    # de-duplicate header names
    seen = Counter()
    hdr = []
    for c in header:
        seen[c] += 1
        hdr.append(c if seen[c] == 1 else f"{c}.{seen[c]-1}")
    body = raw.iloc[h + 1:].copy()
    body.columns = hdr
    body, spec_rows = _split_spec_rows(body)
    body = body.dropna(how="all")
    df = _coerce_numeric(body.reset_index(drop=True))
    params, meta = classify_columns(df)

    specs = {}
    for lab, row in spec_rows.items():
        for p in params:
            v = row.get(p)
            if v is None or (isinstance(v, float) and np.isnan(v)):
                continue
            specs.setdefault(p, {})[lab] = v if lab == "UNIT" else float(v)
    for p, s in xml_specs.items():
        for k, v in s.items():
            try:
                specs.setdefault(p, {})[k] = v if k == "UNIT" else float(v)
            except ValueError:
                pass

    name = auto_name(df, _clean_name(path))
    df.insert(0, "_row", np.arange(len(df)))
    df.insert(0, "_file", _clean_name(path))
    df.insert(0, "_dataset", name)
    notes = []
    if h > 0:
        notes.append(f"header detected on row {h + 1}")
    if spec_rows:
        notes.append("spec rows found in file: " + ", ".join(spec_rows))
    return Dataset(name=name, path=path, df=df, params=params, meta=meta, specs=specs, sheet=str(sheet), notes=notes)


def load_folder(folder: str, recursive=False, names: dict | None = None, files: list | None = None):
    """Load every supported file. `names` maps file path or base name -> custom dataset name."""
    from . import specs as _specs
    paths = files if files else scan_folder(folder, recursive)
    sets, errors = [], []
    for p in paths:
        if p.lower().endswith((".xls", ".xlsx", ".csv")) and _specs.is_program_spec(p):
            continue  # a test-spec workbook, not data
        from . import sweeps as _sweep
        if _sweep.detect(p)[0]:
            continue  # sweep data are analysed by the sweep module
        try:
            ds = load_file(p)
        except Exception as e:  # keep going, report later
            errors.append((os.path.basename(p), str(e)))
            continue
        if names:
            custom = names.get(p) or names.get(os.path.basename(p)) or names.get(_clean_name(p))
            if custom:
                ds.name = custom
                ds.df["_dataset"] = custom
        sets.append(ds)
    sets.sort(key=lambda d: [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", d.name)])
    # make names unique
    cnt = Counter(d.name for d in sets)
    used = Counter()
    for d in sets:
        if cnt[d.name] > 1:
            used[d.name] += 1
            if used[d.name] > 1:  # first file keeps the plain name, later ones = R2, R3 (retest / re-run)
                d.name = f"{d.name}-R{used[d.name]}"
                d.notes.append("same wafer as another file → named as re-run")
            d.df["_dataset"] = d.name
    return sets, errors


def combine(sets):
    """Union of all datasets; parameters = union preserving first-seen order."""
    params, seen = [], set()
    for d in sets:
        for p in d.params:
            if p not in seen:
                params.append(p)
                seen.add(p)
    df = pd.concat([d.df for d in sets], ignore_index=True, sort=False)
    specs = {}
    for d in sets:
        for p, s in d.specs.items():
            specs.setdefault(p, {}).update(s)
    return df, params, specs
