RENDER.datasets = () => {
  const el = $("#v-datasets");
  const S = R.dsum, hasSpec = S.some(r => r.spec_yield !== undefined);
  const cols = [
    { k: "dataset", l: T("Dataset"), f: r => `<span class="sw" style="background:${colorOf(r.dataset)}"></span><input type="text" id="nm-${esc(r.dataset)}" data-ds="${esc(r.dataset)}" value="${esc(nm(r.dataset))}" style="width:170px" aria-label="${T("Dataset name")}">`, nosort: true },
    { k: "file", l: T("Source file"), f: r => `<span class="mono">${esc(r.file)}</span>` },
    { k: "LOT_ID", l: "Lot" }, { k: "WAFER_ID", l: "Wafer" }, { k: "SUBLOT_ID", l: "Sublot" },
    { k: "n", l: T("Dies"), n: 1 }, { k: "pass", l: "Bin 1", n: 1 },
    { k: "yield", l: T("Bin 1 yield"), n: 1, f: r => r.yield === undefined ? "–" : r.yield.toFixed(1) + " %" }]
    .concat(hasSpec ? [{ k: "spec_yield", l: T("Spec yield (re-computed)"), n: 1, f: r => `${r.spec_pass} (${r.spec_yield.toFixed(1)} %)`, cls: r => r.spec_yield < 100 ? "hot" : "" }] : [])
    .concat([
    { k: "clean_yield", l: T("Dies without extremes"), n: 1, f: r => `${r.clean} (${r.clean_yield.toFixed(1)} %)`, cls: r => r.clean_yield < 80 ? "hot" : "" },
    { k: "n_flags", l: T("Extreme readings"), n: 1 }, { k: "n_dupxy", l: T("Dies with duplicate XY"), n: 1, cls: r => r.n_dupxy ? "hot" : "" },
    { k: "OPERATOR", l: "Operator" }, { k: "TESTER_ID", l: "Tester" },
    { k: "start", l: T("Start"), f: r => `<span class="mono">${esc((r.start || "").slice(0, 16))}</span>` },
    { k: "hours", l: T("Hours"), n: 1, f: r => fmt(r.hours) }, { k: "sessions", l: T("Sessions"), n: 1, cls: r => r.sessions > 1 ? "warm" : "" },
    { k: "tt_med", l: T("Median test time [s]"), n: 1, f: r => fmt(r.tt_med) },
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
  const fcols = [{ k: "g", l: T("Parameter group") }, { k: "n", l: T("Parameter count"), n: 1 }, { k: "unit", l: T("Unit") }, { k: "spec", l: "Spec" }]
    .concat(DS.map(ds => ({ k: ds, l: T("{0} median", esc(nm(ds))), n: 1, f: r => fmt(r[ds]) })))
    .concat(DS.filter(d => d !== R.ref).map(ds => ({ k: "d_" + ds, l: T("Δ {0} vs reference", esc(nm(ds))), n: 1, f: r => pct(r["d_" + ds]), cls: r => Math.abs(r["d_" + ds] || 0) >= 5 ? "warm" : "" })));
  const meta = R.integrity.meta, mk = R.integrity.meta_keys;
  const mrows = mk.map(k => { const r = { k }; DS.forEach(ds => r[ds] = meta[ds] ? meta[ds][k] : "–"); r.diff = new Set(DS.map(ds => r[ds])).size > 1; return r; });
  const mcols = [{ k: "k", l: T("Field") }].concat(DS.map(ds => ({ k: ds, l: esc(nm(ds)), cls: r => r.diff ? "diff" : "" })));
  const si = R.spec_info || {};
  el.innerHTML = `<div class="stack">
    <div><div class="eyebrow">Wafer summary</div><h2>${T("One row per dataset")}</h2><p class="lead">${T("Names are generated from WAFER_ID (Lot-W##; a second file of the same wafer becomes -R2). Rename them below — names are kept in this browser; the launcher window can also rename before the analysis.")}</p>
      ${table(cols, S)}</div>
    ${si.meta ? `<div class="grid g2"><div class="panel"><h3>${T("Test spec: {0}", esc(si.meta.file || ""))}</h3>
        <div class="statgrid"><div><div class="l">Test code</div><div class="v">${esc(si.meta.test_code || "–")}</div></div><div><div class="l">Part number</div><div class="v">${esc(si.meta.part_number || "–")}</div></div><div><div class="l">REV</div><div class="v">${esc(si.meta.rev || "–")}</div></div><div><div class="l">${T("Description")}</div><div class="v">${esc(si.meta.description || "–")}</div></div></div>
        ${(si.conditions || []).length ? `<div class="mt">${table([{ k: "item", l: T("Test condition") }, { k: "value", l: T("Setting") }, { k: "unit", l: T("Unit") }], si.conditions)}</div>` : ""}</div>
      ${(si.flow || []).length ? `<div class="panel"><h3>${T("Optical test flow (FLOW)")}</h3><p class="dim" style="font-size:12px;margin:0 0 6px">${T("detector 0 = input-side alignment reading (MZMIph); detector 1 = output side (IL).")}</p>${table(Object.keys(si.flow[0]).map(k => ({ k, l: k })), si.flow)}</div>` : ""}</div>` : ""}
    <div><h3>${T("Test conditions compared")}</h3><p class="lead">${T("Highlighted rows differ between datasets; any wafer difference is confounded with them.")}</p>${table(mcols, mrows)}</div>
    <div><h3>${T("Parameter-group medians (channels pooled)")}</h3><p class="lead">${T("A quick wafer-to-wafer view; Δ is relative to the reference dataset, ≥ 5 % highlighted.")}</p>${table(fcols, frows)}</div>
    <div><h3>${T("Data integrity checks")}</h3>${table([{ k: "level", l: T("Level"), f: r => spill(r.level === "warn" ? "minor" : r.level) }, { k: "title", l: T("Check") }, { k: "detail", l: T("Description"), cls: () => "wrap" }], R.integrity.checks)}</div>
  </div>`;
  el.querySelectorAll("input[data-ds]").forEach(inp => inp.addEventListener("change", () => {
    const v = inp.value.trim(); if (v && v !== inp.dataset.ds) NAMES[inp.dataset.ds] = v; else delete NAMES[inp.dataset.ds];
    try { localStorage.setItem("pic-names-" + META.key, JSON.stringify(NAMES)); } catch (e) {}
    Object.keys(rendered).forEach(k => { if (k !== "datasets") rendered[k] = false; });
  }));
};

