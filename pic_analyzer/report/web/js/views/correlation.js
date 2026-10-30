RENDER.correlation = () => {
  const el = $("#v-correlation");
  const pres = (R.structure._pairs || []).map(pp => ({ x: pp.x, y: pp.y, label: pp.label, r2: pp.by.ALL ? pp.by.ALL.r2 : null }));
  ((R.structure._vbr_idark || {}).pairs || []).filter(([a]) => PI[a].fkey === "PDVbr").slice(0, 1).forEach(([a, b]) => pres.unshift({ x: b, y: a, label: "崩潰電壓 vs 暗電流（同一顆二極體）", r2: null, logx: true }));
  if (!state.cx) { const f = pres.find(q => q.label.includes("PDIph")) || pres[0] || { x: P[0], y: P[1] }; state.cx = f.x; state.cy = f.y; }
  const opt = sel => P.map(q => `<option${q === sel ? " selected" : ""}>${esc(q)}</option>`).join("");
  const fams = [...new Set(P.map(p => PI[p].fkey))];
  el.innerHTML = `<div class="stack">
    <div><div class="eyebrow">參數對參數</div><h2>參數相關與 R²</h2>
      <p class="lead">R² = 1 表示兩個讀值帶有相同資訊。虛線 y = x 是同一個物理量的參考線（例如 1st vs 2nd monitor PD）：點應落在線上；斜率 ≠ 1 是增益誤差，平行偏移是 bias。要比較「兩個資料群的同一個 test item」，請用「R² 對比」分頁。</p></div>
    <div class="panel"><div class="row">
      <label class="ctl" for="cx">X</label><select id="cx">${opt(state.cx)}</select>
      <label class="ctl" for="cy">Y</label><select id="cy">${opt(state.cy)}</select>
      <button id="cswap">交換</button>
      <label class="ctl"><input type="checkbox" id="cun" ${state.unity ? "checked" : ""}> y = x 線</label>
      <label class="ctl"><input type="checkbox" id="cex" ${state.excl ? "checked" : ""}> 擬合排除 |z|&gt;${ZF}</label>
      <select id="cpre" aria-label="工程預設組合"><option value="">工程預設組合…</option>${pres.map((q, i) => `<option value="${i}">${esc(q.label)}：${esc(q.x)} vs ${esc(q.y)}${q.r2 !== null ? "（R² " + q.r2.toFixed(2) + "）" : ""}</option>`).join("")}</select></div>
      <div class="grid g2 mt"><div class="chart tall" id="cc"></div><div id="cstat"></div></div></div>
    <div class="panel"><div class="row" style="justify-content:space-between"><h3>相關矩陣（Pearson r，排除極端值，漏電用 log）</h3>
      <select id="hf" aria-label="參數子集"><option value="">代表：每個 family 的 CH1</option>${fams.map(f => `<option>${esc(f)}</option>`).join("")}<option value="*">全部 ${P.length} 個參數</option></select></div>
      <div class="chart" id="hm" style="min-height:560px"></div></div>
  </div>`;
  const drawSc = () => {
    const pre = pres.find(q => q.x === state.cx && q.y === state.cy);
    const st = chartScatter("cc", state.cx, state.cy, { unity: state.unity, excl: state.excl, logx: pre && pre.logx ? true : undefined });
    $("#cstat").innerHTML = table([{ k: "ds", l: "擬合", f: r => r.ds === "ALL" ? "<b>全部資料群</b>" : `<span class="sw" style="background:${colorOf(r.ds)}"></span>${esc(nm(r.ds))}` },
      { k: "n", l: "N", n: 1 }, { k: "r2", l: "R²", n: 1, f: r => r.r2.toFixed(3), cls: r => r.r2 < .5 ? "warm" : "" }, { k: "r", l: "r", n: 1, f: r => r.r.toFixed(3) },
      { k: "b", l: "斜率", n: 1, f: r => fmt(r.b) }, { k: "a", l: "截距", n: 1, f: r => fmt(r.a) }], st) +
      `<p class="dim" style="font-size:12px">${R.log[state.cx] || R.log[state.cy] ? "log 軸的擬合在 log10 空間進行。" : ""}Y = 截距 + 斜率·X。</p>`;
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

