"""Create SYNTHETIC sweep files to try the Sweep tab (not real data).
   python examples/make_demo_sweep.py <folder>
Writes DEMO_spectrum_<wafer>.csv (long: WAFER_ID, PART_ID, CH, Wavelength_nm, IL_dB)
and    DEMO_power_<wafer>.csv    (long: WAFER_ID, PART_ID, CH, Pin_mW, Pout_mW, Iph_uA)."""
import os, sys
import numpy as np
import pandas as pd

out = sys.argv[1] if len(sys.argv) > 1 else "."
rng = np.random.default_rng(7)
for w, shift in (("WAFERLOT 01", 0.0), ("WAFERLOT 08", 3.5)):
    rows, prow = [], []
    for die in range(12):
        c0 = 1310 + shift + rng.normal(0, 1.2)
        for ch in range(1, 9):
            cen = c0 + rng.normal(0, 0.4)
            il0 = 10.2 + 0.08 * ch + rng.normal(0, 0.15)
            for wl in np.arange(1280, 1340.01, 0.5):
                il = il0 + 0.0042 * (wl - cen) ** 2 * 1.0 + rng.normal(0, 0.01) + 0.02 * np.sin(wl * 2.1)
                rows.append((w, f"D{die:02d}", ch, round(wl, 2), round(il, 4)))
            t = 10 ** (-il0 / 10)
            psat = 80 + rng.normal(0, 8) - (55 if (w.endswith("08") and die == 3) else 0)  # one compressing die on W08
            for pin in np.linspace(0.5, 20, 25):
                pout = t * pin / (1 + (pin / psat) ** 2) ** 0.5
                prow.append((w, f"D{die:02d}", ch, round(pin, 4), round(pout * (1 + rng.normal(0, 0.002)), 6), round(pout * 0.9e3 * 0.02, 5)))
    tag = w.split()[-1]
    pd.DataFrame(rows, columns=["WAFER_ID", "PART_ID", "CH", "Wavelength_nm", "IL_dB"]).to_csv(os.path.join(out, f"DEMO_spectrum_W{tag}.csv"), index=False)
    pd.DataFrame(prow, columns=["WAFER_ID", "PART_ID", "CH", "Pin_mW", "Pout_mW", "Iph_uA"]).to_csv(os.path.join(out, f"DEMO_power_W{tag}.csv"), index=False)
print("synthetic demo sweep files written to", out)
