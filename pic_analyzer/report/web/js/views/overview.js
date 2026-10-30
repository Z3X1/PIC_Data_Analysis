RENDER.overview = () => {
  const el = $("#v-overview");
  const bin1 = D.HARD_BIN ? D.HARD_BIN.filter(b => b === 1).length : null;
  const clean = R.dies.filter(d => d.n_flag === 0).length;
  const specOK = R.dies.filter(d => !d.oos || d.oos.length === 0).length;
  const lots = [...new Set(D.LOT_ID || [])].filter(Boolean);
  const hasSpec = Object.keys(R.specs).length > 0;
  el.innerHTML = `
  <div class="stack">
    <div><div class="eyebrow">摘要</div><h2>${DS.length} 個資料群 · ${N} 顆 die · ${P.length} 個參數</h2>
      <p class="lead">${lots.length ? "測試批號 " + esc(lots.join(", ")) + "。" : ""}比較基準為 <b>${esc(nm(R.ref))}</b>。
      ${hasSpec ? `Spec：<b>${esc((R.spec_info.meta || {}).file || "spec_limits")}</b>${(R.spec_info.meta || {}).description ? "（" + esc(R.spec_info.meta.description) + "）" : ""}，對應到 ${Object.keys(R.specs).length} / ${P.length} 個參數。` : "未載入 spec。"}
      離群值以各資料群內的 robust z 判定（暗電流用 log 尺度）；資料群差異需同時達到 FDR q &lt; ${R.thresholds.alpha_q} 與效果量 |d| ≥ ${R.thresholds.d_effect}。</p></div>
    <div class="kpis">
      <div class="kpi"><div class="l">Tester Bin 1 良率</div><div class="v">${bin1 === null ? "–" : (100 * bin1 / N).toFixed(1) + " %"}</div><div class="n">${bin1 ?? "–"} / ${N} 顆</div></div>
      ${hasSpec ? `<div class="kpi"><div class="l">依 TestSpec 重算良率</div><div class="v ${specOK < N ? "hot" : ""}">${(100 * specOK / N).toFixed(1)} %</div><div class="n">${specOK} / ${N} 顆全部參數在 limit 內</div></div>` : ""}
      <div class="kpi"><div class="l">沒有極端值的 die</div><div class="v ${clean / N < .8 ? "hot" : ""}">${(100 * clean / N).toFixed(1)} %</div><div class="n">${clean} / ${N} · |z| ≤ ${ZF}</div></div>
      <div class="kpi"><div class="l">嚴重 findings</div><div class="v" style="color:var(--crit)">${sevCount("critical")}</div><div class="n">資料完整性 / spec 涵蓋</div></div>
      <div class="kpi"><div class="l">重要 findings</div><div class="v" style="color:var(--major)">${sevCount("major")}</div><div class="n">元件 / 製程 / tester</div></div>
      <div class="kpi"><div class="l">次要 · 資訊</div><div class="v">${sevCount("minor")} · ${sevCount("info")}</div><div class="n">量測能力 / 結構</div></div>
    </div>
    <div class="legend-ds">${DS.map(ds => `<span><span class="sw" style="background:${colorOf(ds)}"></span>${esc(nm(ds))}</span>`).join("")}</div>
    <div><h3>Findings（依嚴重度排序）</h3><p class="lead" style="margin-bottom:8px">展開每一項可看證據、圖表、依可能性排序的 root-cause 假說（含驗證方法）與建議行動。</p>
      <div class="stack" id="findings"></div></div>
  </div>`;
  const box = $("#findings");
  R.findings.forEach((f, k) => {
    const d = document.createElement("details");
    d.className = "finding " + f.severity;
    if (k < 1) d.open = true;
    d.innerHTML = `<summary><span class="fid">${f.id}</span><span class="ft"><span class="chev">▸</span> ${esc(f.title)}</span>${spill(f.severity)}<span class="fs">${esc(f.category)} — ${esc(f.summary)}</span></summary>
      <div class="body">
        ${f.evidence.length ? `<div><div class="eyebrow">證據</div><ul class="ev">${f.evidence.map(e => `<li>${esc(e)}</li>`).join("")}</ul></div>` : ""}
        ${f.chart ? `<div class="chart" id="fc-${k}"></div>` : ""}
        ${f.causes.length ? `<div><div class="eyebrow">Root-cause 假說（依可能性排序）</div><div class="causes">${f.causes.map(c => `<div class="cause"><div class="rk">${c.rank}</div><div class="h">${esc(c.h)}</div><div class="w">${esc(c.why)}</div><div class="c"><b>驗證：</b>${esc(c.confirm)}</div></div>`).join("")}</div></div>` : ""}
        ${f.actions.length ? `<div><div class="eyebrow">建議行動</div><ul class="ev">${f.actions.map(e => `<li>${esc(e)}</li>`).join("")}</ul></div>` : ""}
        ${f.params && f.params.length ? `<div class="row"><span class="eyebrow">在分佈・趨勢中開啟</span>${f.params.slice(0, 10).map(p => `<button data-p="${esc(p)}">${esc(p)}</button>`).join("")}</div>` : ""}
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

