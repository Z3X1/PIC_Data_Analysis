RENDER.correlation = () => {
  const el = $("#v-correlation");
  const pres = (R.structure._pairs || []).map(pp => ({ x: pp.x, y: pp.y, label: pp.label, r2: pp.by.ALL ? pp.by.ALL.r2 : null }));
  ((R.structure._vbr_idark || {}).pairs || []).filter(([a]) => PI[a].fkey === "PDVbr").slice(0, 1).forEach(([a, b]) => pres.unshift({ x: b, y: a, label: T("Breakdown vs dark current (same diode)"), r2: null, logx: true }));
  if (!state.cx) { const f = pres.find(q => q.label.includes("PDIph")) || pres[0] || { x: P[0], y: P[1] }; state.cx = f.x; state.cy = f.y; }
  const opt = sel => P.map(q => `<option${q === sel ? " selected" : ""}>${esc(q)}</option>`).join("");
  const fams = [...new Set(P.map(p => PI[p].fkey))];
  el.innerHTML = `<div class="stack">
    <div><div class="eyebrow">${T("Parameter vs parameter")}</div><h2>${T("Parameter correlation and R²")}</h2>
      <p class="lead">${T("R² = 1 means two readings carry the same information. The dashed y = x line is the reference for the same physical quantity (e.g. 1st vs 2nd monitor PD): points should sit on it; a slope ≠ 1 is a gain error, a parallel offset is a bias. To compare the same test item between two datasets, use the R² comparison tab.")}</p></div>
    <div class="panel"><div class="row">
      <label class="ctl" for="cx">X</label><select id="cx">${opt(state.cx)}</select>
      <label class="ctl" for="cy">Y</label><select id="cy">${opt(state.cy)}</select>
      <button id="cswap">${T("Swap")}</button>
      <label class="ctl"><input type="checkbox" id="cun" ${state.unity ? "checked" : ""}> ${T("y = x line")}</label>
      <label class="ctl"><input type="checkbox" id="cex" ${state.excl ? "checked" : ""}> ${T("Fit excludes |z|&gt;{0}", ZF)}</label>
      <select id="cpre" aria-label="${T("Engineering presets")}"><option value="">${T("Engineering presets…")}</option>${pres.map((q, i) => `<option value="${i}">${T("{0}: {1} vs {2}", esc(q.label), esc(q.x), esc(q.y))}${q.r2 !== null ? T(" (R² {0})", q.r2.toFixed(2)) : ""}</option>`).join("")}</select></div>
      <div class="grid g2 mt"><div class="chart tall" id="cc"></div><div id="cstat"></div></div></div>
    <div class="panel"><div class="row" style="justify-content:space-between"><h3>${T("Correlation matrix (Pearson r, extremes excluded, log for leakage)")}</h3>
      <select id="hf" aria-label="${T("Parameter subset")}"><option value="">${T("Representative: CH1 of each family")}</option>${fams.map(f => `<option>${esc(f)}</option>`).join("")}<option value="*">${T("All {0} parameters", P.length)}</option></select></div>
      <div class="chart" id="hm" style="min-height:560px"></div></div>
  </div>`;
  const drawSc = () => {
    const pre = pres.find(q => q.x === state.cx && q.y === state.cy);
    const st = chartScatter("cc", state.cx, state.cy, { unity: state.unity, excl: state.excl, logx: pre && pre.logx ? true : undefined });
    $("#cstat").innerHTML = table([{ k: "ds", l: T("Fit"), f: r => r.ds === "ALL" ? "<b>" + T("All datasets") + "</b>" : `<span class="sw" style="background:${colorOf(r.ds)}"></span>${esc(nm(r.ds))}` },
      { k: "n", l: "N", n: 1 }, { k: "r2", l: "R²", n: 1, f: r => r.r2.toFixed(3), cls: r => r.r2 < .5 ? "warm" : "" }, { k: "r", l: "r", n: 1, f: r => r.r.toFixed(3) },
      { k: "b", l: T("Slope"), n: 1, f: r => fmt(r.b) }, { k: "a", l: T("Intercept"), n: 1, f: r => fmt(r.a) }], st) +
      `<p class="dim" style="font-size:12px">${R.log[state.cx] || R.log[state.cy] ? T("Fits on log axes are done in log10 space.") : ""}${T("Y = intercept + slope·X.")}</p>`;
  };
  drawSc();
  $("#cx").onchange = e => { state.cx = e.target.value; drawSc(); };
  $("#cy").onchange = e => { state.cy = e.target.value; drawSc(); };
  $("#cswap").onclick = () => { [state.cx, state.cy] = [state.cy, state.cx]; $("#cx").value = state.cx; $("#cy").value = state.cy; drawSc(); };
  $("#cun").onchange = e => { state.unity = e.target.checked; drawSc(); };
  $("#cex").onchange = e => { state.excl = e.target.checked; drawSc(); };
  $("#cpre").onchange = e => { const q = pres[+e.target.value]; if (!q) return; state.cx = q.x; state.cy = q.y; $("#cx").value = q.x; $("#cy").value = q.y; drawSc(); };
  const drawH = () => {
    const v = $("#hf").value;
    const ps = v === "*" ? P : v ? P.filter(p => PI[p].fkey === v || (v === "IL" && PI[p].fkey === "MZMIph")) : P.filter(p => PI[p].ch === 1 || PI[p].ch === null);
    chartCorrHeat("hm", ps);
  };
  $("#hf").onchange = drawH; drawH();
};

