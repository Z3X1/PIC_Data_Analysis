"""Excel 摘要：每個工作表的內容寫在 write_excel() 內，依報告閱讀順序排列。"""
from __future__ import annotations

import numpy as np
import pandas as pd


def write_excel(R, path, sweep=None):
    groups = R["groups"]
    ref = R["ref"]
    with pd.ExcelWriter(path, engine="xlsxwriter") as xw:
        wb = xw.book
        hdr = wb.add_format({"bold": True, "bg_color": "#E4E9FB", "border": 1, "text_wrap": True, "valign": "top"})
        red = wb.add_format({"font_color": "#C62F2F", "bold": True})

        def put(df, name, widths=None):
            df.to_excel(xw, sheet_name=name, index=False)
            ws = xw.sheets[name]
            for j, c in enumerate(df.columns):
                ws.write(0, j, c, hdr)
                ws.set_column(j, j, (widths or {}).get(c, max(10, min(40, len(str(c)) + 2))))
            ws.freeze_panes(1, 1)
            ws.autofilter(0, 0, len(df), len(df.columns) - 1)
            return ws

        # findings
        rows = []
        for f in R["findings"]:
            rows.append(dict(ID=f["id"], Severity={"critical": "嚴重", "major": "重要", "minor": "次要", "info": "資訊"}[f["severity"]], Category=f["category"], Title=f["title"], Summary=f["summary"],
                             Evidence="\n".join(f["evidence"]),
                             Top_root_cause=(f["causes"][0]["h"] if f["causes"] else ""),
                             Confirm=(f["causes"][0]["confirm"] if f["causes"] else ""),
                             Actions="\n".join(f["actions"])))
        put(pd.DataFrame(rows), "Findings", {"Title": 50, "Summary": 80, "Evidence": 80, "Top_root_cause": 45, "Confirm": 60, "Actions": 60})

        put(pd.DataFrame(R["dsum"]).drop(columns=["bins"], errors="ignore"), "Wafer_Summary")
        if R.get("specs"):
            put(pd.DataFrame([dict(Parameter=p, LSL=s.get("LSL"), USL=s.get("USL"), Unit=s.get("UNIT")) for p, s in R["specs"].items()]), "Spec_Applied")
        for pc in R.get("pair_corr", []):
            name = f"R2_{pc['a'][-6:]}_vs_{pc['b'][-6:]}"[:31]
            put(pd.DataFrame(pc["rows"]).assign(Mode=pc["mode"]), name)
        if sweep and (sweep.get("spectra") or sweep.get("power")):
            if sweep.get("spectra"):
                put(pd.DataFrame([dict(Dataset=s_["dataset"], Curve=s_["curve"], **s_["m"]) for s_ in sweep["spectra"]]), "Sweep_Spectrum")
            if sweep.get("power"):
                put(pd.DataFrame([dict(Dataset=s_["dataset"], Curve=s_["curve"], Y=s_["ycol"], **s_["m"]) for s_ in sweep["power"]]), "Sweep_Power")

        # parameter summary (long + wide)
        long = []
        for t in R["table"]:
            for g in groups:
                b = t["by"].get(g, {})
                c = t["comp"].get(g, {})
                long.append(dict(Parameter=t["param"], Family=t["family"], Unit=t["unit"], Log=t["log"], Dataset=g,
                                 N=b.get("n"), Mean=b.get("mean"), Sigma=b.get("sd"), Median=b.get("median"), Robust_sigma=b.get("rsd"),
                                 Q1=b.get("q1"), Q3=b.get("q3"), Min=b.get("min"), Max=b.get("max"), CV_pct=b.get("cv"), GeoMean=b.get("gmean"),
                                 N_extreme=b.get("n_flag"), N_watch=b.get("n_watch"), Resolution=b.get("res"),
                                 LSL=t["spec"].get("LSL"), USL=t["spec"].get("USL"), Ppk=b.get("ppk"), Spec_yield_pct=b.get("yield"),
                                 dMedian_vs_ref=c.get("dmed"), dMedian_pct=c.get("dmed_pct"), Cohen_d=c.get("d"),
                                 p_MannWhitney=c.get("p_mw"), q_FDR=c.get("q"), p_Welch=c.get("p_t"), p_variance=c.get("p_var"),
                                 Sigma_ratio=c.get("sd_ratio"), Significant=c.get("sig"),
                                 Cpk_IMR=b.get("cpk"), Worst=b.get("worst"), Margin=b.get("margin"), Margin_pct=b.get("margin_pct"), N_fail=b.get("n_fail"),
                                 rho_test_order=R["trends"][t["param"]].get(g, {}).get("rho_seq"),
                                 Ichart_rule_hits=R["trends"][t["param"]].get(g, {}).get("n_viol")))
        ws = put(pd.DataFrame(long), "Param_Summary")

        an = pd.DataFrame(R["anomalies"])
        if len(an):
            an = an.sort_values("z", key=lambda s: -s.abs())
        put(an, "Anomalies")
        dies = pd.DataFrame(R["dies"])
        if len(dies):
            dies["flags"] = dies["flags"].apply(lambda v: ", ".join(v))
            if "oos" in dies:
                dies["oos"] = dies["oos"].apply(lambda v: ", ".join(v))
            dies = dies.sort_values(["n_flag", "maxz"], ascending=False)
        put(dies, "Die_Health", {"flags": 80})

        rc = []
        for f in R["findings"]:
            for c in f["causes"]:
                rc.append(dict(Finding=f["id"], Title=f["title"], Rank=c["rank"], Hypothesis=c["h"], Why=c["why"], Confirm=c["confirm"]))
        put(pd.DataFrame(rc), "Root_Cause", {"Title": 40, "Hypothesis": 50, "Why": 80, "Confirm": 80})
        put(pd.DataFrame([dict(Level=c["level"], Check=c["title"], Detail=c["detail"]) for c in R["integrity"]["checks"]]), "Integrity", {"Check": 60, "Detail": 100})

        pairs = []
        for pp in R["structure"].get("_pairs", []):
            for g, s in pp["by"].items():
                pairs.append(dict(Pair=pp["label"], X=pp["x"], Y=pp["y"], Dataset=g, **s))
        if pairs:
            put(pd.DataFrame(pairs), "Correlation_Pairs")

        data = pd.DataFrame(R["data"])
        put(data, "Combined_Data")
        ws = xw.sheets["Combined_Data"]
        # mark extreme cells red
        col_ix = {c: j for j, c in enumerate(data.columns)}
        ds = data["_dataset"].values
        for a in R["anomalies"]:
            if a["level"] != "flag":
                continue
            rows_ = np.where((ds == a["dataset"]) & (data["_die"].values == a["die"]))[0]
            for r_ in rows_:
                ws.write(int(r_) + 1, col_ix[a["param"]], a["value"], red)
    return path
