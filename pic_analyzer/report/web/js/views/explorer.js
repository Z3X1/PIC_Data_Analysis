RENDER.explorer = () => {
  const el = $("#v-explorer");
  if (!state.param) state.param = (R.findings.find(f => f.params && f.params.length && P.includes(f.params[0])) || {}).params?.[0] || P[0];
  const p = state.param, t = R.table.find(x => x.param === p), info = PI[p];
  const opts = P.map(q => `<option${q === p ? " selected" : ""}>${esc(q)}</option>`).join("");
  const statRows = DS.map(ds => ({ ds, ...(t.by[ds] || {}), comp: t.comp[ds] }));
  const sp = R.specs[p] || {};
  const scol = [{ k: "ds", l: T("Dataset"), f: r => `<span class="sw" style="background:${colorOf(r.ds)}"></span>${esc(nm(r.ds))}` },
    { k: "n", l: "N", n: 1 }, { k: "mean", l: T("Mean"), n: 1, f: r => fmt(r.mean) }, { k: "sd", l: "σ", n: 1, f: r => fmt(r.sd) },
    { k: "median", l: T("Median"), n: 1, f: r => fmt(r.median) }, { k: "rsd", l: "Robust σ", n: 1, f: r => fmt(r.rsd) },
    { k: "q1", l: "Q1", n: 1, f: r => fmt(r.q1) }, { k: "q3", l: "Q3", n: 1, f: r => fmt(r.q3) },
    { k: "min", l: T("Min"), n: 1, f: r => fmt(r.min) }, { k: "max", l: T("Max"), n: 1, f: r => fmt(r.max) }, { k: "cv", l: "CV %", n: 1, f: r => fmt(r.cv, 3) },
    { k: "gmean", l: T("Geometric mean"), n: 1, f: r => fmt(r.gmean) },
    { k: "n_flag", l: `|z|>${ZF}`, n: 1, cls: r => r.n_flag ? "hot" : "" }, { k: "n_watch", l: T("Watch"), n: 1 },
    { k: "cpk", l: "Cpk (I-MR)", n: 1, f: r => fmt(r.cpk, 3), cls: r => r.cpk !== null && r.cpk !== undefined && r.cpk < 1.33 ? "warm" : "" }, { k: "ppk", l: "Ppk", n: 1, f: r => fmt(r.ppk, 3) },
    { k: "margin", l: T("Worst to limit"), n: 1, f: r => r.margin === null || r.margin === undefined ? "–" : `${fmt(r.margin)} (${(r.margin_pct ?? 0).toFixed(1)} %)` },
    { k: "yield", l: T("Spec yield"), n: 1, f: r => r.yield === undefined || r.yield === null ? "–" : r.yield.toFixed(1) + " %" },
    { k: "dm", l: T("Δ median vs reference"), n: 1, f: r => r.comp ? pct(r.comp.dmed_pct) : T("reference"), s: r => r.comp ? r.comp.dmed_pct : 0 },
    { k: "p", l: "p (MW) · q", n: 1, f: r => r.comp ? `${r.comp.p_mw?.toExponential(1) ?? "–"} · ${r.comp.q?.toExponential(1) ?? "–"}` : "", s: r => r.comp ? r.comp.q : 0 },
    { k: "dd", l: "Cohen d", n: 1, f: r => r.comp ? fmt(r.comp.d, 2) : "", s: r => r.comp ? r.comp.d : 0 }];
  const tr = R.trends[p] || {};
  el.innerHTML = `<div class="stack">
    <div class="row"><label class="ctl" for="xp">${T("Parameter")}</label><select id="xp">${opts}</select>
      <button id="xprev" aria-label="${T("Previous parameter")}">◀</button><button id="xnext" aria-label="${T("Next parameter")}">▶</button>
      <span class="dim">${esc(info.title || "")}${unit(p) ? " · " + T("unit {0}", esc(unit(p))) : ""}${sp.LSL !== undefined || sp.USL !== undefined ? ` · spec ${sp.LSL ?? "—"} … ${sp.USL ?? "—"}` : ""}${R.log[p] ? " · " + T("analysed in log10") : ""}</span></div>
    ${info.physics ? `<div class="note">${esc(info.physics)}</div>` : ""}
    <div class="grid g2">
      <div class="panel"><div class="row" style="justify-content:space-between"><h3>${T("Distribution by dataset")}</h3>
        <span class="seg"><button data-d="box" class="${state.dist === "box" ? "on" : ""}">${T("Box + points")}</button><button data-d="cdf" class="${state.dist === "cdf" ? "on" : ""}">CDF</button><button data-d="hist" class="${state.dist === "hist" ? "on" : ""}">${T("Histogram")}</button></span></div>
        <div class="chart" id="xc-dist"></div><p class="dim" style="margin:4px 0 0;font-size:12px">${T("Red diamonds: |robust z| &gt; {0} within the dataset. Red dashed lines: spec limits.", ZF)}</p></div>
      <div class="panel"><div class="row" style="justify-content:space-between"><h3>${T("Trend (test order)")}</h3><label class="ctl"><input type="checkbox" id="xtemp" ${state.temp ? "checked" : ""}> ${T("Overlay TEST_TEMP")}</label></div>
        <div class="chart" id="xc-trend"></div><p class="dim" style="margin:4px 0 0;font-size:12px">${T("Centre line and ±3σ per dataset come from the moving range (I-MR chart, extremes excluded). Orange dashed line = test break.")}
        ${Object.entries(tr).map(([ds, v]) => `${T("{0}: ρ(order) {1}, rule violations {2}", esc(nm(ds)), fmt(v.rho_seq, 2), v.n_viol)}${v.step ? T(", break step d={0} p={1}", fmt(v.step.d, 2), v.step.p?.toExponential(1)) : ""}`).join(" · ")}</p></div>
    </div>
    <div class="panel"><h3>${T("Statistics")}</h3>${table(scol, statRows)}</div>
    ${info.ch !== null ? `<div class="panel"><h3>${T("{0} by channel", esc(info.fkey))}</h3><div class="chart tall" id="xc-ch"></div></div>` : ""}
    <div class="panel"><h3>Wafer map — ${esc(p)}</h3><div class="chart tall" id="xc-map"></div><p class="dim" style="margin:4px 0 0;font-size:12px">${T("Outlined side-by-side cells = two different dies reporting the same original wafer coordinate (see data integrity).")}</p></div>
  </div>`;
  const redraw = () => { if (state.dist === "box") chartBox("xc-dist", [p]); else chartDist(document.getElementById("xc-dist"), p, state.dist); };
  redraw();
  chartTrend("xc-trend", p, { temp: state.temp });
  if (info.ch !== null) chartChannel(document.getElementById("xc-ch"), info.fkey);
  chartMap("xc-map", p, "value");
  $("#xp").addEventListener("change", e => { state.param = e.target.value; RENDER.explorer(); });
  $("#xprev").onclick = () => { state.param = P[(P.indexOf(p) - 1 + P.length) % P.length]; RENDER.explorer(); };
  $("#xnext").onclick = () => { state.param = P[(P.indexOf(p) + 1) % P.length]; RENDER.explorer(); };
  el.querySelectorAll("button[data-d]").forEach(b => b.onclick = () => { state.dist = b.dataset.d; el.querySelectorAll("button[data-d]").forEach(x => x.classList.toggle("on", x === b)); redraw(); });
  $("#xtemp").onchange = e => { state.temp = e.target.checked; chartTrend("xc-trend", p, { temp: state.temp }); };
  rendered.explorer = true;
};

