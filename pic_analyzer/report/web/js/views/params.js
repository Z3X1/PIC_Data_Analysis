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
  const cols = [{ k: "p", l: "參數", f: r => `<b>${esc(r.p)}</b>${r.log ? ' <span class="dim">log</span>' : ""}` }, { k: "fam", l: "Family" }, { k: "unit", l: "單位" }, { k: "spec", l: "Spec" },
    { k: "cpk", l: "Cpk<br>最差", n: 1, f: r => fmt(r.cpk, 3), cls: r => r.cpk === null || r.cpk === undefined ? "dim" : r.cpk < 1 ? "hot" : r.cpk < 1.33 ? "warm" : "" },
    { k: "mg", l: "最差讀值<br>距 limit", n: 1, f: r => r.mg === null || r.mg === undefined ? "–" : r.mg.toFixed(1) + " %", cls: r => r.mg !== null && r.mg !== undefined && r.mg < 5 ? "warm" : "" },
    { k: "nfail", l: "超出<br>spec", n: 1, cls: r => r.nfail ? "hot" : "dim" }]
    .concat(DS.flatMap(ds => [
      { k: "m_" + ds, l: esc(nm(ds)) + "<br>中位數", n: 1, f: r => fmt(r["m_" + ds]) },
      { k: "s_" + ds, l: "robust σ", n: 1, f: r => fmt(r["s_" + ds]), t: "1.4826 × MAD" },
      { k: "f_" + ds, l: "|z|>" + ZF, n: 1, cls: r => r["f_" + ds] ? "hot" : "dim" }]))
    .concat(others.length ? [
      { k: "dpct", l: "Δ 中位數<br>" + esc(nm(others[0])) + " vs 基準", n: 1, f: r => pct(r.dpct) },
      { k: "d", l: "Cohen d", n: 1, f: r => fmt(r.d, 2), cls: r => Math.abs(r.d || 0) >= R.thresholds.d_effect ? "warm" : "" },
      { k: "q", l: "q (FDR)", n: 1, f: r => r.q === null || r.q === undefined ? "–" : r.q.toExponential(1) },
      { k: "sig", l: "偏移", f: r => r.sig ? tpill("major", "顯著") : "", s: r => r.sig ? 1 : 0 },
      { k: "sdr", l: "σ 比", n: 1, f: r => fmt(r.sdr, 2), t: "σ(其他)/σ(基準)，已排除極端值" }] : [])
    .concat([{ k: "rho", l: "|ρ| 測試順序", n: 1, f: r => fmt(r.rho, 2), cls: r => r.rho >= .6 ? "warm" : "" },
      { k: "nv", l: "I-chart 規則", n: 1 }, { k: "tc", l: "ρ TEST_TEMP", n: 1, f: r => fmt(r.tc, 2) }, { k: "res", l: "解析度", n: 1, f: r => fmt(r.res) }]);
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">所有參數</div><h2>參數總表</h2>
    <p class="lead">點一列可在「分佈・趨勢」開啟；點欄位標題排序。中位數與 robust σ 不受漏電離群影響；各資料群的平均、σ、P 值與 Cpk 在「分佈・趨勢」與 Excel。</p></div>
    <div class="row"><input type="search" id="pf" placeholder="篩選，例如 IL 或 CH3" aria-label="篩選參數" style="width:220px">
      <select id="pfam" aria-label="Family"><option value="">全部 family</option>${[...new Set(rows.map(r => r.fam))].map(f => `<option>${esc(f)}</option>`).join("")}</select>
      <label class="ctl"><input type="checkbox" id="psig"> 只看顯著偏移</label>
      <label class="ctl"><input type="checkbox" id="pflag"> 只看有極端值</label>
      <label class="ctl"><input type="checkbox" id="pcpk"> 只看 Cpk &lt; 1.33</label>
      <button id="pcopy">複製表格（TSV）</button><span id="pmsg" class="dim"></span></div>
    <div id="ptab"></div></div>`;
  const draw = () => {
    const q = $("#pf").value.trim().toLowerCase(), fam = $("#pfam").value;
    const rr = rows.filter(r => (!q || r.p.toLowerCase().includes(q)) && (!fam || r.fam === fam) && (!$("#psig").checked || r.sig) && (!$("#pflag").checked || r.nflag > 0) && (!$("#pcpk").checked || (r.cpk !== null && r.cpk !== undefined && r.cpk < 1.33)));
    $("#ptab").innerHTML = table(cols, rr, { tall: true, click: r => openParam(r.p) });
    $("#pcopy").onclick = () => copyTSV(cols, rr).then(ok => $("#pmsg").textContent = ok ? "已複製 " + rr.length + " 列" : "瀏覽器不允許複製，請手動選取表格");
  };
  ["pf", "pfam", "psig", "pflag", "pcpk"].forEach(id => $("#" + id).addEventListener("input", draw));
  draw();
};

