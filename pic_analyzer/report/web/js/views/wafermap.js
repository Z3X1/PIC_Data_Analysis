RENDER.wafermap = () => {
  const el = $("#v-wafermap");
  if (!state.mapP) state.mapP = "die_PDVbr" in (R.derived || {}) ? "die_PDVbr" : (state.param || P[0]);
  const derOpts = Object.entries(R.derived || {}).map(([k, d]) => `<option value="${k}" ${k === state.mapP ? "selected" : ""}>◆ ${esc(d.label)}</option>`).join("");
  const sp = R.spatial || {};
  const rad = sp.ok ? Object.entries(sp.by).map(([k, per]) => ({ k, label: R.derived && R.derived[k] ? R.derived[k].label : k, ...Object.fromEntries(DS.map(ds => [ds, per[ds] || {}])) }))
    .filter(r => DS.some(ds => r[ds].rho !== undefined && r[ds].rho !== null)) : [];
  rad.sort((a, b) => Math.max(...DS.map(ds => -Math.abs(a[ds].rho || 0))) - Math.max(...DS.map(ds => -Math.abs(b[ds].rho || 0))));
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">原始晶圓座標</div><h2>Wafer map 與徑向分佈</h2>
    <p class="lead">每個方格是一顆 die 在原始晶圓座標（X_COORD / Y_COORD）的位置。兩顆 die 回報同一座標時左右並排並加外框；這些位置在座標修正前不可信。◆ 為 die 層級指標（多通道合併、排除漏電通道）。</p></div>
    <div class="row"><select id="wp" aria-label="指標"><option value="">座標佔用（每個座標的 die 數）</option>${derOpts}${P.map(q => `<option${q === state.mapP ? " selected" : ""}>${esc(q)}</option>`).join("")}</select>
      <span class="seg"><button data-m="value" class="${state.mapM === "value" ? "on" : ""}">數值</button><button data-m="z" class="${state.mapM === "z" ? "on" : ""}">Robust z</button></span></div>
    <div class="panel"><div class="chart" id="wm" style="min-height:${Math.ceil(DS.length / 3) * 420}px"></div></div>
    ${sp.ok ? `<div class="grid g2"><div class="panel"><h3>徑向分佈</h3><div class="chart" id="wr"></div></div>
      <div class="panel"><h3>對晶圓半徑的相關（Spearman ρ）</h3><p class="dim" style="font-size:12px;margin:0 0 6px">中心取量測範圍的中點（X ${sp.cx}、Y ${sp.cy}）。「只用不重複座標」欄排除座標重複的 die。|ρ| ≥ 0.5 標色。點一列畫徑向圖。</p>
      ${table([{ k: "label", l: "指標" }].concat(DS.flatMap(ds => [{ k: ds + "r", l: esc(nm(ds)) + " ρ", n: 1, f: r => fmt(r[ds].rho, 2), s: r => Math.abs(r[ds].rho || 0), cls: r => Math.abs(r[ds].rho || 0) >= .5 ? "warm" : "" },
        { k: ds + "u", l: "只用不重複座標", n: 1, f: r => fmt(r[ds].rho_unique, 2) }, { k: ds + "z", l: "中心 / 中間 / 邊緣", f: r => r[ds].zones ? ["中心", "中間", "邊緣"].map(z => fmt(r[ds].zones[z])).join(" / ") : "–", nosort: true }])), rad, { tall: true, click: r => { state.mapP = r.k; drawR(r.k); } })}</div></div>` : ""}</div>`;
  const draw = () => chartMap("wm", $("#wp").value || null, state.mapM);
  const drawR = k => { if (sp.ok) chartRadial("wr", k); };
  $("#wp").onchange = () => { state.mapP = $("#wp").value; draw(); if (state.mapP) drawR(state.mapP); };
  el.querySelectorAll("button[data-m]").forEach(b => b.onclick = () => { state.mapM = b.dataset.m; el.querySelectorAll("button[data-m]").forEach(x => x.classList.toggle("on", x === b)); draw(); });
  draw(); if (state.mapP) drawR(state.mapP);
};

