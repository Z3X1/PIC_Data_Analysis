RENDER.params = () => {
  const el = $("#v-params");
  const others = DS.filter(d => d !== R.ref);
  const rows = R.table.map(t => {
    const r = { p: t.param, fam: t.family, unit: t.unit, log: t.log, t };
    DS.forEach(ds => { const b = t.by[ds] || {}; r["m_" + ds] = b.median; r["s_" + ds] = b.rsd; r["f_" + ds] = b.n_flag; });
    const c = others.length ? t.comp[others[0]] || {} : {};
    r.dpct = c.dmed_pct; r.d = c.d; r.q = c.q; r.sig = c.sig; r.sdr = c.sd_ratio;
    const tr = R.trends[t.param] || {}; r.rho = Math.max(...Object.values(tr).map(v => Math.abs(v.rho_seq || 0)));
    r.nv = Object.values(tr).reduce((s, v) => s + (v.n_viol || 0), 0);
    r.tc = R.tcorr[t.param]; r.res = t.all.res; r.nflag = DS.reduce((s, ds) => s + (r["f_" + ds] || 0), 0);
    r.spec = t.spec && (t.spec.LSL !== undefined || t.spec.USL !== undefined) ? `${t.spec.LSL ?? ""} … ${t.spec.USL ?? ""}` : "";
    r.cpk = t.all.cpk; r.mg = t.all.margin_pct; r.nfail = t.all.n_fail;
    return r;
  });
  const cols = [{ k: "p", l: T("Parameter"), f: r => `<b>${esc(r.p)}</b>${r.log ? ' <span class="dim">log</span>' : ""}` }, { k: "fam", l: "Family" }, { k: "unit", l: T("Unit") }, { k: "spec", l: "Spec" },
    { k: "cpk", l: T("Cpk<br>worst"), n: 1, f: r => fmt(r.cpk, 3), cls: r => r.cpk === null || r.cpk === undefined ? "dim" : r.cpk < 1 ? "hot" : r.cpk < 1.33 ? "warm" : "" },
    { k: "mg", l: T("Worst reading<br>to limit"), n: 1, f: r => r.mg === null || r.mg === undefined ? "–" : r.mg.toFixed(1) + " %", cls: r => r.mg !== null && r.mg !== undefined && r.mg < 5 ? "warm" : "" },
    { k: "nfail", l: T("Out of<br>spec"), n: 1, cls: r => r.nfail ? "hot" : "dim" }]
    .concat(DS.flatMap(ds => [
      { k: "m_" + ds, l: T("{0}<br>median", esc(nm(ds))), n: 1, f: r => fmt(r["m_" + ds]) },
      { k: "s_" + ds, l: "robust σ", n: 1, f: r => fmt(r["s_" + ds]), t: "1.4826 × MAD" },
      { k: "f_" + ds, l: "|z|>" + ZF, n: 1, cls: r => r["f_" + ds] ? "hot" : "dim" }]))
    .concat(others.length ? [
      { k: "dpct", l: T("Δ median<br>{0} vs reference", esc(nm(others[0]))), n: 1, f: r => pct(r.dpct) },
      { k: "d", l: "Cohen d", n: 1, f: r => fmt(r.d, 2), cls: r => Math.abs(r.d || 0) >= R.thresholds.d_effect ? "warm" : "" },
      { k: "q", l: "q (FDR)", n: 1, f: r => r.q === null || r.q === undefined ? "–" : r.q.toExponential(1) },
      { k: "sig", l: T("Shift"), f: r => r.sig ? tpill("major", T("significant")) : "", s: r => r.sig ? 1 : 0 },
      { k: "sdr", l: T("σ ratio"), n: 1, f: r => fmt(r.sdr, 2), t: T("σ(other)/σ(reference), extremes excluded") }] : [])
    .concat([{ k: "rho", l: T("|ρ| test order"), n: 1, f: r => fmt(r.rho, 2), cls: r => r.rho >= .6 ? "warm" : "" },
      { k: "nv", l: T("I-chart rules"), n: 1 }, { k: "tc", l: "ρ TEST_TEMP", n: 1, f: r => fmt(r.tc, 2) }, { k: "res", l: T("Resolution"), n: 1, f: r => fmt(r.res) }]);
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">${T("All parameters")}</div><h2>${T("Parameter table")}</h2>
    <p class="lead">${T("Click a row to open it in Distribution · Trend; click a header to sort. Median and robust σ are not affected by leakage outliers; per-dataset mean, σ, p-values and Cpk are in Distribution · Trend and in Excel.")}</p></div>
    <div class="row"><input type="search" id="pf" placeholder="${T("Filter, e.g. IL or CH3")}" aria-label="${T("Filter parameters")}" style="width:220px">
      <select id="pfam" aria-label="Family"><option value="">${T("All families")}</option>${[...new Set(rows.map(r => r.fam))].map(f => `<option>${esc(f)}</option>`).join("")}</select>
      <label class="ctl"><input type="checkbox" id="psig"> ${T("Significant shifts only")}</label>
      <label class="ctl"><input type="checkbox" id="pflag"> ${T("With extremes only")}</label>
      <label class="ctl"><input type="checkbox" id="pcpk"> ${T("Cpk &lt; 1.33 only")}</label>
      <button id="pcopy">${T("Copy table (TSV)")}</button><span id="pmsg" class="dim"></span></div>
    <div id="ptab"></div></div>`;
  const draw = () => {
    const q = $("#pf").value.trim().toLowerCase(), fam = $("#pfam").value;
    const rr = rows.filter(r => (!q || r.p.toLowerCase().includes(q)) && (!fam || r.fam === fam) && (!$("#psig").checked || r.sig) && (!$("#pflag").checked || r.nflag > 0) && (!$("#pcpk").checked || (r.cpk !== null && r.cpk !== undefined && r.cpk < 1.33)));
    $("#ptab").innerHTML = table(cols, rr, { tall: true, click: r => openParam(r.p) });
    $("#pcopy").onclick = () => copyTSV(cols, rr).then(ok => $("#pmsg").textContent = ok ? T("Copied {0} rows", rr.length) : T("The browser blocked copying; select the table manually"));
  };
  ["pf", "pfam", "psig", "pflag", "pcpk"].forEach(id => $("#" + id).addEventListener("input", draw));
  draw();
};

