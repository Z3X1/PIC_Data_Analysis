RENDER.msa = () => {
  const el = $("#v-msa");
  const g = R.msa.grr;
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">${T("Measurement system analysis")}</div><h2>${T("Can the test see the difference?")}</h2>
    <p class="lead">${T("GR&R needs the same die measured at least twice. Put a retest / correlation file of the same wafer in the folder and this table is generated automatically; the R² comparison tab also switches to die-matched pairs.")}</p></div>
    <div class="note ${g.length ? "" : "warn"}">${esc(R.msa.status)}</div>
    ${g.length ? table([{ k: "param", l: T("Parameter") }, { k: "sigma_rep", l: T("σ repeatability"), n: 1, f: r => fmt(r.sigma_rep) }, { k: "pct_tv", l: T("%GRR / total variation"), n: 1, f: r => fmt(r.pct_tv, 3), cls: r => r.pct_tv > 30 ? "hot" : r.pct_tv > 10 ? "warm" : "" }, { k: "pct_tol", l: T("%GRR / tolerance"), n: 1, f: r => fmt(r.pct_tol, 3), cls: r => r.pct_tol > 30 ? "hot" : r.pct_tol > 10 ? "warm" : "" }, { k: "ndc", l: "ndc", n: 1, f: r => fmt(r.ndc, 3), cls: r => r.ndc !== null && r.ndc < 5 ? "warm" : "" }], g, { tall: true }) : ""}
    <div><h3>${T("Recorded resolution")}</h3><p class="lead">${T("Rule of thumb: resolution ≤ 1/10 of the tolerance and ≤ ½ of the process σ.")}</p>
    ${table([{ k: "param", l: T("Parameter") }, { k: "res", l: T("Resolution"), n: 1, f: r => fmt(r.res) }, { k: "rsd", l: "Robust σ", n: 1, f: r => fmt(r.rsd) }, { k: "tol", l: T("Tolerance"), n: 1, f: r => fmt(r.tol) },
      { k: "ok_tol", l: T("≤ tolerance/10"), f: r => r.tol === null || r.tol === undefined ? "–" : r.ok_tol ? tpill("ok", T("OK")) : tpill("major", T("too coarse")), s: r => r.ok_tol ? 1 : 0 },
      { k: "ok_spread", l: "≤ ½ σ", f: r => r.ok_spread ? tpill("ok", T("OK")) : tpill("major", T("too coarse")), s: r => r.ok_spread ? 1 : 0 }], R.msa.resolution, { tall: true })}</div></div>`;
};

