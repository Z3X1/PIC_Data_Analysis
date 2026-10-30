RENDER.overview = () => {
  const el = $("#v-overview");
  const bin1 = D.HARD_BIN ? D.HARD_BIN.filter(b => b === 1).length : null;
  const clean = R.dies.filter(d => d.n_flag === 0).length;
  const specOK = R.dies.filter(d => !d.oos || d.oos.length === 0).length;
  const lots = [...new Set(D.LOT_ID || [])].filter(Boolean);
  const hasSpec = Object.keys(R.specs).length > 0;
  el.innerHTML = `
  <div class="stack">
    <div><div class="eyebrow">${T("Summary")}</div><h2>${T("{0} datasets · {1} dies · {2} parameters", DS.length, N, P.length)}</h2>
      <p class="lead">${lots.length ? T("Lot {0}. ", esc(lots.join(", "))) : ""}${T("Reference dataset: {0}.", "<b>" + esc(nm(R.ref)) + "</b>")}
      ${hasSpec ? T("Spec: {0}{1}, mapped to {2} / {3} parameters.", "<b>" + esc((R.spec_info.meta || {}).file || "spec_limits") + "</b>", (R.spec_info.meta || {}).description ? T("({0})", esc(R.spec_info.meta.description)) : "", Object.keys(R.specs).length, P.length) : T("No spec loaded.")}
      ${T("Outliers use robust z within each dataset (log scale for dark current); a dataset difference needs both FDR q &lt; {0} and effect size |d| ≥ {1}.", R.thresholds.alpha_q, R.thresholds.d_effect)}</p></div>
    <div class="kpis">
      <div class="kpi"><div class="l">${T("Tester Bin 1 yield")}</div><div class="v">${bin1 === null ? "–" : (100 * bin1 / N).toFixed(1) + " %"}</div><div class="n">${T("{0} / {1} dies", bin1 ?? "–", N)}</div></div>
      ${hasSpec ? `<div class="kpi"><div class="l">${T("Yield re-computed from TestSpec")}</div><div class="v ${specOK < N ? "hot" : ""}">${(100 * specOK / N).toFixed(1)} %</div><div class="n">${T("{0} / {1} dies with every parameter within limits", specOK, N)}</div></div>` : ""}
      <div class="kpi"><div class="l">${T("Dies without extreme values")}</div><div class="v ${clean / N < .8 ? "hot" : ""}">${(100 * clean / N).toFixed(1)} %</div><div class="n">${clean} / ${N} · |z| ≤ ${ZF}</div></div>
      <div class="kpi"><div class="l">${T("Critical findings")}</div><div class="v" style="color:var(--crit)">${sevCount("critical")}</div><div class="n">${T("data integrity / spec coverage")}</div></div>
      <div class="kpi"><div class="l">${T("Major findings")}</div><div class="v" style="color:var(--major)">${sevCount("major")}</div><div class="n">${T("device / process / tester")}</div></div>
      <div class="kpi"><div class="l">${T("Minor · Info")}</div><div class="v">${sevCount("minor")} · ${sevCount("info")}</div><div class="n">${T("measurement capability / structure")}</div></div>
    </div>
    <div class="legend-ds">${DS.map(ds => `<span><span class="sw" style="background:${colorOf(ds)}"></span>${esc(nm(ds))}</span>`).join("")}</div>
    <div><h3>${T("Findings (by severity)")}</h3><p class="lead" style="margin-bottom:8px">${T("Expand an item to see its evidence, chart, root-cause hypotheses ranked by likelihood (with how to confirm them) and recommended actions.")}</p>
      <div class="stack" id="findings"></div></div>
  </div>`;
  const box = $("#findings");
  R.findings.forEach((f, k) => {
    const d = document.createElement("details");
    d.className = "finding " + f.severity;
    if (k < 1) d.open = true;
    d.innerHTML = `<summary><span class="fid">${f.id}</span><span class="ft"><span class="chev">▸</span> ${esc(f.title)}</span>${spill(f.severity)}<span class="fs">${esc(f.category)} — ${esc(f.summary)}</span></summary>
      <div class="body">
        ${f.evidence.length ? `<div><div class="eyebrow">${T("Evidence")}</div><ul class="ev">${f.evidence.map(e => `<li>${esc(e)}</li>`).join("")}</ul></div>` : ""}
        ${f.chart ? `<div class="chart" id="fc-${k}"></div>` : ""}
        ${f.causes.length ? `<div><div class="eyebrow">${T("Root-cause hypotheses (most likely first)")}</div><div class="causes">${f.causes.map(c => `<div class="cause"><div class="rk">${c.rank}</div><div class="h">${esc(c.h)}</div><div class="w">${esc(c.why)}</div><div class="c"><b>${T("Confirm:")}</b>${esc(c.confirm)}</div></div>`).join("")}</div></div>` : ""}
        ${f.actions.length ? `<div><div class="eyebrow">${T("Recommended actions")}</div><ul class="ev">${f.actions.map(e => `<li>${esc(e)}</li>`).join("")}</ul></div>` : ""}
        ${f.params && f.params.length ? `<div class="row"><span class="eyebrow">${T("Open in Distribution · Trend")}</span>${f.params.slice(0, 10).map(p => `<button data-p="${esc(p)}">${esc(p)}</button>`).join("")}</div>` : ""}
      </div>`;
    box.appendChild(d);
    const draw = () => { if (d.dataset.drawn) return; d.dataset.drawn = 1; drawFindingChart(f, "fc-" + k); };
    d.addEventListener("toggle", () => { if (d.open) draw(); });
    if (d.open) setTimeout(draw, 30);
    d.querySelectorAll("button[data-p]").forEach(b => b.addEventListener("click", () => openParam(b.dataset.p)));
  });
};
function drawFindingChart(f, id) {
  const c = f.chart, el = document.getElementById(id); if (!c || !el) return;
  if (c.type === "map") chartMap(el, null);
  else if (c.type === "leak") chartLeak(el, c.fam);
  else if (c.type === "shift") chartBox(el, c.params);
  else if (c.type === "diebox") chartDieLines(el, c.fam);
  else if (c.type === "channel") chartChannel(el, c.fam);
  else if (c.type === "pair") chartScatter(el, c.x, c.y, { unity: false, excl: true });
  else if (c.type === "trend") chartTrend(el, c.param, { temp: true });
  else if (c.type === "cpk") { el.classList.add("tall"); chartCpk(el); }
  else if (c.type === "heater") chartHeater(el);
  else if (c.type === "radial") chartRadial(el, c.name);
}

