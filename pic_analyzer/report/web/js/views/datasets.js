RENDER.datasets = () => {
  const el = $("#v-datasets");
  const S = R.dsum, hasSpec = S.some(r => r.spec_yield !== undefined);
  const cols = [
    { k: "dataset", l: "資料群", f: r => `<span class="sw" style="background:${colorOf(r.dataset)}"></span><input type="text" id="nm-${esc(r.dataset)}" data-ds="${esc(r.dataset)}" value="${esc(nm(r.dataset))}" style="width:170px" aria-label="資料群名稱">`, nosort: true },
    { k: "file", l: "來源檔案", f: r => `<span class="mono">${esc(r.file)}</span>` },
    { k: "LOT_ID", l: "Lot" }, { k: "WAFER_ID", l: "Wafer" }, { k: "SUBLOT_ID", l: "Sublot" },
    { k: "n", l: "Die 數", n: 1 }, { k: "pass", l: "Bin 1", n: 1 },
    { k: "yield", l: "Bin 1 良率", n: 1, f: r => r.yield === undefined ? "–" : r.yield.toFixed(1) + " %" }]
    .concat(hasSpec ? [{ k: "spec_yield", l: "Spec 重算良率", n: 1, f: r => `${r.spec_pass} (${r.spec_yield.toFixed(1)} %)`, cls: r => r.spec_yield < 100 ? "hot" : "" }] : [])
    .concat([
    { k: "clean_yield", l: "無極端值 die", n: 1, f: r => `${r.clean} (${r.clean_yield.toFixed(1)} %)`, cls: r => r.clean_yield < 80 ? "hot" : "" },
    { k: "n_flags", l: "極端讀值", n: 1 }, { k: "n_dupxy", l: "座標重複 die", n: 1, cls: r => r.n_dupxy ? "hot" : "" },
    { k: "OPERATOR", l: "Operator" }, { k: "TESTER_ID", l: "Tester" },
    { k: "start", l: "開始", f: r => `<span class="mono">${esc((r.start || "").slice(0, 16))}</span>` },
    { k: "hours", l: "時數", n: 1, f: r => fmt(r.hours) }, { k: "sessions", l: "Session 數", n: 1, cls: r => r.sessions > 1 ? "warm" : "" },
    { k: "tt_med", l: "Test time 中位 [s]", n: 1, f: r => fmt(r.tt_med) },
    { k: "temp_min", l: "TEST_TEMP [°C]", n: 1, f: r => r.temp_min === undefined ? "–" : `${fmt(r.temp_min)}–${fmt(r.temp_max)}` }]);
  const fams = [...new Set(P.map(p => PI[p].group))];
  const frows = fams.map(g => {
    const ps = P.filter(p => PI[p].group === g);
    const sp = R.specs[ps[0]] || {};
    const r = { g, unit: unit(ps[0]), n: ps.length, spec: sp.LSL !== undefined || sp.USL !== undefined ? `${sp.LSL ?? ""} … ${sp.USL ?? ""}` : "" };
    DS.forEach(ds => { r[ds] = median(ps.flatMap(p => DSIDX[ds].map(i => D[p][i]))); });
    const a = r[R.ref];
    DS.forEach(ds => { if (ds !== R.ref) r["d_" + ds] = a ? (r[ds] - a) / Math.abs(a) * 100 : null; });
    return r;
  });
  const fcols = [{ k: "g", l: "參數群" }, { k: "n", l: "參數數", n: 1 }, { k: "unit", l: "單位" }, { k: "spec", l: "Spec" }]
    .concat(DS.map(ds => ({ k: ds, l: esc(nm(ds)) + " 中位數", n: 1, f: r => fmt(r[ds]) })))
    .concat(DS.filter(d => d !== R.ref).map(ds => ({ k: "d_" + ds, l: "Δ " + esc(nm(ds)) + " vs 基準", n: 1, f: r => pct(r["d_" + ds]), cls: r => Math.abs(r["d_" + ds] || 0) >= 5 ? "warm" : "" })));
  const meta = R.integrity.meta, mk = R.integrity.meta_keys;
  const mrows = mk.map(k => { const r = { k }; DS.forEach(ds => r[ds] = meta[ds] ? meta[ds][k] : "–"); r.diff = new Set(DS.map(ds => r[ds])).size > 1; return r; });
  const mcols = [{ k: "k", l: "欄位" }].concat(DS.map(ds => ({ k: ds, l: esc(nm(ds)), cls: r => r.diff ? "diff" : "" })));
  const si = R.spec_info || {};
  el.innerHTML = `<div class="stack">
    <div><div class="eyebrow">Wafer summary</div><h2>每個資料群一列</h2><p class="lead">名稱由 WAFER_ID 自動產生（Lot-W##，同一片 wafer 的第二份為 -R2）。在下方直接改名，名稱會記在這個瀏覽器；啟動視窗也可以在分析前改名。</p>
      ${table(cols, S)}</div>
    ${si.meta ? `<div class="grid g2"><div class="panel"><h3>Test spec：${esc(si.meta.file || "")}</h3>
        <div class="statgrid"><div><div class="l">Test code</div><div class="v">${esc(si.meta.test_code || "–")}</div></div><div><div class="l">Part number</div><div class="v">${esc(si.meta.part_number || "–")}</div></div><div><div class="l">REV</div><div class="v">${esc(si.meta.rev || "–")}</div></div><div><div class="l">說明</div><div class="v">${esc(si.meta.description || "–")}</div></div></div>
        ${(si.conditions || []).length ? `<div class="mt">${table([{ k: "item", l: "測試條件" }, { k: "value", l: "設定" }, { k: "unit", l: "單位" }], si.conditions)}</div>` : ""}</div>
      ${(si.flow || []).length ? `<div class="panel"><h3>光學測試流程（FLOW）</h3><p class="dim" style="font-size:12px;margin:0 0 6px">detector 0 = 輸入端對位量測（MZMIph）；detector 1 = 輸出端（IL）。</p>${table(Object.keys(si.flow[0]).map(k => ({ k, l: k })), si.flow)}</div>` : ""}</div>` : ""}
    <div><h3>測試條件比對</h3><p class="lead">標色的列在資料群之間不同；任何 wafer 差異都會與它混淆。</p>${table(mcols, mrows)}</div>
    <div><h3>參數群中位數（各通道合併）</h3><p class="lead">快速看 wafer-to-wafer；Δ 相對於基準資料群，≥ 5 % 標色。</p>${table(fcols, frows)}</div>
    <div><h3>資料完整性檢查</h3>${table([{ k: "level", l: "等級", f: r => spill(r.level === "warn" ? "minor" : r.level) }, { k: "title", l: "檢查" }, { k: "detail", l: "說明", cls: () => "wrap" }], R.integrity.checks)}</div>
  </div>`;
  el.querySelectorAll("input[data-ds]").forEach(inp => inp.addEventListener("change", () => {
    const v = inp.value.trim(); if (v && v !== inp.dataset.ds) NAMES[inp.dataset.ds] = v; else delete NAMES[inp.dataset.ds];
    try { localStorage.setItem("pic-names-" + META.key, JSON.stringify(NAMES)); } catch (e) {}
    Object.keys(rendered).forEach(k => { if (k !== "datasets") rendered[k] = false; });
  }));
};

