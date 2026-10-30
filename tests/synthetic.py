"""Fully synthetic test data (no real measurement values) in the KGD Data Summary format.

Planted signals: a few leaking PD channels, a +10 % PDIph shift on the second wafer, and a heater channel gradient.

python tests/synthetic.py <folder>   writes two .xlsx files and spec_limits.csv
"""
from __future__ import annotations

import os
import sys

import numpy as np
import pandas as pd

IL_PORTS = ["O21O20", "O23O19", "O24O17", "O26O16", "O21O15", "O23O14", "O24O12", "O26O11"]
IN_PORTS = ["O21", "O23", "O24", "O26"]


def wafer(wafer_no: int, n_die: int = 30, iph_gain: float = 1.0, seed: int = 0) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    t0 = pd.Timestamp("2026-01-05 09:00:00") + pd.Timedelta(days=wafer_no)
    for i in range(n_die):
        x, y = i % 6, i // 6
        die = rng.normal(0, 1)  # shared die-level factor
        r = dict(LOT_ID="LOT001", MODE="ENG", PART_NUM=1000000001, PROGRAM="KGDTesting", PROGRAM_REV="1.0.0",
                 OPERATOR=f"OP{wafer_no}", TEST_TEMP=round(25 + rng.normal(0, 0.05), 2), TESTER_ID="StationA",
                 START_DATE=str(t0 + pd.Timedelta(seconds=280 * i)), TEST_CODE="DEMO.Ver1",
                 WAFER_ID=f"WAFERLOT {wafer_no:02d}", PART_ID=f"LOT001-SUB01-{y}-{x}", TEST_TIME=277,
                 HARD_BIN=1, X_COORD=x, Y_COORD=y, SOFT_BIN=1, SOFT_DESC="Pass")
        r["MZMVbr_CH1"] = round(18 + 0.3 * die + rng.normal(0, 0.1), 2)
        r["MZMVfw_CH1"] = round(0.80 + rng.normal(0, 0.005), 3)
        r["MZMIdark_CH1"] = round(float(np.exp(np.log(5) + rng.normal(0, 0.2))), 3)
        for stage in ("1st", "2nd"):
            for ch in range(1, 9):
                leak = rng.random() < 0.04
                idark = np.exp(np.log(10) + rng.normal(0, 0.15)) * (rng.uniform(20, 200) if leak else 1)
                r[f"{stage}PDVbr_CH{ch}"] = round((3.2 if leak else 11 + 0.2 * die) + rng.normal(0, 0.05), 2)
                r[f"{stage}PDVfw_CH{ch}"] = round(0.75 + rng.normal(0, 0.01), 2)
                r[f"{stage}PDIdark_CH{ch}"] = round(float(idark), 2)
                r[f"{stage}PDIph_CH{ch}"] = round(float(iph_gain * (300 + 5 * die + rng.normal(0, 4))), 1)
        for ch in range(1, 9):
            R = 500 * (1 + 0.006 * (ch - 1)) * (1 + 0.01 * die) + rng.normal(0, 1)
            k = 15.0 * (1 + rng.normal(0, 0.003))
            r[f"Heater{ch}"] = round(R, 2)
            r[f"MZMdcER_CH{ch}"] = round(30 + rng.normal(0, 3), 2)
            r[f"HeaterEff_CH{ch}"] = round(k * R / 1000, 4)
            r[f"MPD ratio_CH{ch}"] = round(r[f"1stPDIph_CH{ch}"] / r[f"2ndPDIph_CH{ch}"], 4)
        for k, port in enumerate(IN_PORTS):
            r[f"MZMIph_{port}"] = round(400 + 5 * rng.normal(), 1)
        for ch, ports in enumerate(IL_PORTS, start=1):
            r[f"IL_{ports}_CH{ch}"] = round(-(6 + rng.normal(0, 0.2)), 3)
        rows.append(r)
    return pd.DataFrame(rows)


SPEC = pd.DataFrame([
    ("/^(1st|2nd)PDIdark_CH\\d$/", None, 8000, "nA"),
    ("/^(1st|2nd)PDVbr_CH\\d$/", 2.7, None, "V"),
    ("/^(1st|2nd)PDIph_CH\\d$/", 150, 600, "uA"),
    ("/^Heater\\d$/", 400, 650, "ohm"),
    ("/^HeaterEff_CH\\d$/", 5, 12, "mW/pi"),
], columns=["Parameter", "LSL", "USL", "Unit"])


def write_folder(folder: str) -> list[str]:
    os.makedirs(folder, exist_ok=True)
    paths = []
    for no, gain, seed in ((1, 1.0, 1), (8, 1.10, 8)):
        p = os.path.join(folder, f"WAFERLOT_{no:02d}_DEMO_Data_Summary.xlsx")
        wafer(no, iph_gain=gain, seed=seed).to_excel(p, sheet_name="Summary", index=False)
        paths.append(p)
    SPEC.to_csv(os.path.join(folder, "spec_limits.csv"), index=False)
    return paths


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "demo_data"
    print("\n".join(write_folder(out)))
