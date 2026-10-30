RENDER.wafermap = () => {
  const el = $("#v-wafermap");
  if (!state.mapP) state.mapP = "die_PDVbr" in (R.derived || {}) ? "die_PDVbr" : (state.param || P[0]);
  const derOpts = Object.entries(R.derived || {}).map(([k, d]) => `<option value="${k}" ${k === state.mapP ? "selected" : ""}>◆ ${esc(d.label)}</option>`).join("");
  const sp = R.spatial || {};
  const rad = sp.ok ? Object.entries(sp.by).map(([k, per]) => ({ k, label: R.derived && R.derived[k] ? R.derived[k].label : k, ...Object.fromEntries(DS.map(ds => [ds, per[ds] || {}])) }))
    .filter(r => DS.some(ds => r[ds].rho !== undefined && r[ds].rho !== null)) : [];
  rad.sort((a, b) => Math.max(...DS.map(ds => -Math.abs(a[ds].rho || 0))) - Math.max(...DS.map(ds => -Math.abs(b[ds].rho || 0))));
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">${T("Original wafer coordinates")}</div><h2>${T("Wafer map and radial profile")}</h2>
    <p class="lead">${T("Each cell is a die at its original wafer coordinate (X_COORD / Y_COORD). Two dies reporting the same coordinate are drawn side by side with an outline; those positions cannot be trusted until the coordinates are fixed. ◆ marks die-level metrics (channels pooled, leaking channels excluded).")}</p></div>
    <div class="row"><select id="wp" aria-label="${T("Metric")}"><option value="">${T("Coordinate occupancy (dies per coordinate)")}</option>${derOpts}${P.map(q => `<option${q === state.mapP ? " selected" : ""}>${esc(q)}</option>`).join("")}</select>
      <span class="seg"><button data-m="value" class="${state.mapM === "value" ? "on" : ""}">${T("Value")}</button><button data-m="z" class="${state.mapM === "z" ? "on" : ""}">Robust z</button></span></div>
    <div class="panel"><div class="chart" id="wm" style="min-height:${Math.ceil(DS.length / 3) * 420}px"></div></div>
    ${sp.ok ? `<div class="grid g2"><div class="panel"><h3>${T("Radial profile")}</h3><div class="chart" id="wr"></div></div>
      <div class="panel"><h3>${T("Correlation with wafer radius (Spearman ρ)")}</h3><p class="dim" style="font-size:12px;margin:0 0 6px">${T("Centre = midpoint of the measured range (X {0}, Y {1}). The “unique coordinates only” column excludes dies with duplicate coordinates. |ρ| ≥ 0.5 highlighted. Click a row to plot its radial profile.", sp.cx, sp.cy)}</p>
      ${table([{ k: "label", l: T("Metric") }].concat(DS.flatMap(ds => [{ k: ds + "r", l: esc(nm(ds)) + " ρ", n: 1, f: r => fmt(r[ds].rho, 2), s: r => Math.abs(r[ds].rho || 0), cls: r => Math.abs(r[ds].rho || 0) >= .5 ? "warm" : "" },
        { k: ds + "u", l: T("Unique coordinates only"), n: 1, f: r => fmt(r[ds].rho_unique, 2) }, { k: ds + "z", l: T("Centre / middle / edge"), f: r => r[ds].zones ? ["center", "middle", "edge"].map(z => fmt(r[ds].zones[z])).join(" / ") : "–", nosort: true }])), rad, { tall: true, click: r => { state.mapP = r.k; drawR(r.k); } })}</div></div>` : ""}</div>`;
  const draw = () => chartMap("wm", $("#wp").value || null, state.mapM);
  const drawR = k => { if (sp.ok) chartRadial("wr", k); };
  $("#wp").onchange = () => { state.mapP = $("#wp").value; draw(); if (state.mapP) drawR(state.mapP); };
  el.querySelectorAll("button[data-m]").forEach(b => b.onclick = () => { state.mapM = b.dataset.m; el.querySelectorAll("button[data-m]").forEach(x => x.classList.toggle("on", x === b)); draw(); });
  draw(); if (state.mapP) drawR(state.mapP);
};

