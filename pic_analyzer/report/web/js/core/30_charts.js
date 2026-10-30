/* ============================================================ charts */
function chartBox(el, params, opts = {}) {
  // box + jittered points on numeric positions: one slot per parameter, one offset per dataset
  const tr = [], multi = params.length > 1, lg = params.some(p => R.log[p]);
  const nd = DS.length, w = Math.min(0.8 / nd, 0.36);
  let rnd = 1;
  const jit = () => { rnd = (rnd * 16807) % 2147483647; return (rnd / 2147483647 - 0.5); };
  DS.forEach((ds, di) => {
    const off = (di - (nd - 1) / 2) * (0.84 / nd);
    const bx = [], by = [], px = [], py = [], txt = [], fx = [], fy = [], ftxt = [];
    params.forEach((p, j) => {
      const z = zOf(p), pos = j + off;
      for (const i of DSIDX[ds]) {
        const v = D[p][i]; if (v === null) continue;
        bx.push(pos); by.push(v);
        const t = `${dieLabel(i)}<br>${p} = ${fmt(v)} ${unit(p)}<br>robust z = ${z[i] === null ? "–" : z[i].toFixed(1)}`;
        const xj = pos + jit() * w * 0.75;
        if (z[i] !== null && Math.abs(z[i]) > ZF) { fx.push(xj); fy.push(v); ftxt.push(t); } else { px.push(xj); py.push(v); txt.push(t); }
      }
    });
    tr.push({ type: "box", x: bx, y: by, name: nm(ds), legendgroup: ds, width: w, marker: { color: colorOf(ds) }, line: { width: 1.3, color: colorOf(ds) }, fillcolor: "rgba(0,0,0,0)", boxpoints: false, hoverinfo: "y" });
    tr.push({ type: "scatter", mode: "markers", x: px, y: py, legendgroup: ds, showlegend: false, marker: { color: colorOf(ds), size: multi ? 4 : 6, opacity: .65 }, text: txt, hoverinfo: "text" });
    if (fx.length) tr.push({ type: "scatter", mode: "markers", x: fx, y: fy, legendgroup: ds, name: `|z|>${ZF}`, showlegend: di === 0, marker: { color: css("--crit"), size: multi ? 7 : 9, symbol: "diamond", line: { color: colorOf(ds), width: 1.5 } }, text: ftxt, hoverinfo: "text" });
  });
  const L = baseLayout({ margin: { l: 70, r: 18, t: 34, b: multi ? 96 : 46 } });
  L.xaxis = Object.assign(L.xaxis, multi
    ? { tickvals: params.map((_, j) => j), ticktext: params }
    : { tickvals: DS.map((_, di) => (di - (nd - 1) / 2) * (0.84 / nd)), ticktext: DS.map(nm) },
    { range: [-0.6, params.length - 0.4], zeroline: false, showgrid: false });
  L.yaxis.type = lg ? "log" : "linear";
  L.yaxis.title = { text: multi ? (PI[params[0]].fkey + (unit(params[0]) ? ` [${unit(params[0])}]` : "")) : yTitle(params[0]), font: { size: 12 } };
  if (!multi) L.shapes = specShapes(params[0]);
  if (multi) { L.xaxis.tickangle = -40; L.shapes = params.slice(1).map((_, j) => ({ type: "line", x0: j + .5, x1: j + .5, yref: "paper", y0: 0, y1: 1, line: { color: css("--line2"), width: 1 } })); }
  if (opts.title) L.title = { text: opts.title, font: { size: 13 }, x: 0, xanchor: "left" };
  plot(el, tr, L);
}

function chartDist(el, p, mode) {
  const tr = [], lg = R.log[p];
  DS.forEach(ds => {
    const v = DSIDX[ds].map(i => D[p][i]).filter(x => x !== null);
    if (mode === "cdf") {
      const s = [...v].sort((a, b) => a - b);
      tr.push({ type: "scatter", mode: "lines+markers", x: s, y: s.map((_, k) => 100 * (k + 0.5) / s.length), name: nm(ds), line: { shape: "hv", color: colorOf(ds), width: 1.6 }, marker: { size: 4 },
        hovertemplate: "%{x}<br>%{y:.1f} %<extra>" + esc(nm(ds)) + "</extra>" });
    } else {
      tr.push({ type: "histogram", x: lg ? v.map(x => Math.log10(Math.max(x, 1e-12))) : v, name: nm(ds), opacity: .55, marker: { color: colorOf(ds) }, nbinsx: 30 });
    }
  });
  const L = baseLayout({ barmode: "overlay" });
  if (mode === "cdf") { L.xaxis.type = lg ? "log" : "linear"; L.yaxis.title = { text: T("Cumulative %") }; L.shapes = specShapes(p, "x"); }
  else { L.yaxis.title = { text: T("Count") }; }
  L.xaxis.title = { text: (mode !== "cdf" && lg ? "log10 " : "") + yTitle(p) };
  plot(el, tr, L);
}

function chartTrend(el, p, opts = {}) {
  // concatenated test-order trend across datasets, I-chart limits per dataset, session breaks, flagged points
  const tr = [], shapes = [], ann = [], lg = R.log[p], z = zOf(p);
  let off = 0;
  const showTemp = opts.temp && D.TEST_TEMP;
  DS.forEach(ds => {
    const ix = [...DSIDX[ds]].sort((a, b) => D._seq[a] - D._seq[b]);
    const xs = ix.map(i => off + D._seq[i] + 1), ys = ix.map(i => D[p][i]);
    const fl = ix.map(i => z[i] !== null && Math.abs(z[i]) > ZF);
    tr.push({ type: "scatter", mode: "lines+markers", x: xs, y: ys, name: nm(ds), line: { color: colorOf(ds), width: 1.2 },
      marker: { size: fl.map(f => f ? 9 : 5), color: fl.map(f => f ? css("--crit") : colorOf(ds)), line: { width: fl.map(f => f ? 1.5 : 0), color: css("--fg") } },
      text: ix.map(i => `${dieLabel(i)}<br>${D._t_iso ? (D._t_iso[i] || "") : ""}<br>${p} = ${fmt(D[p][i])} ${unit(p)}<br>z = ${z[i] === null ? "–" : z[i].toFixed(1)}`), hoverinfo: "text" });
    const t = (R.trends[p] || {})[ds];
    if (t && t.center !== null && t.sigma_st) {
      const c = t.center, s = t.sigma_st, tf = v => lg ? Math.pow(10, v) : v;
      const x0 = off + .5, x1 = off + ix.length + .5;
      [[c, "solid", .9], [c + 3 * s, "dash", .9], [c - 3 * s, "dash", .9]].forEach(([y, d]) => shapes.push({ type: "line", x0, x1, y0: tf(y), y1: tf(y), line: { color: colorOf(ds), width: 1, dash: d }, opacity: .55 }));
    }
    // session breaks
    ix.forEach((i, k) => { if (k > 0 && D._session[i] !== D._session[ix[k - 1]]) { shapes.push({ type: "line", x0: off + k + .5, x1: off + k + .5, yref: "paper", y0: 0, y1: 1, line: { color: css("--major"), width: 1.2, dash: "dot" } });
      ann.push({ x: off + k + .5, yref: "paper", y: 0.99, text: " " + T("break {0} min", Math.round((D._gap_s[i] || 0) / 60)), showarrow: false, font: { size: 10, color: css("--major") }, xanchor: "left", yanchor: "top", bgcolor: css("--panel") }); } });
    if (off > 0) shapes.push({ type: "line", x0: off + .5, x1: off + .5, yref: "paper", y0: 0, y1: 1, line: { color: css("--faint"), width: 1.5 } });
    ann.push({ x: off + 1, yref: "paper", y: -0.001, text: esc(nm(ds)), showarrow: false, xanchor: "left", yanchor: "top", font: { size: 10.5, color: colorOf(ds) }, yshift: -26 });
    if (showTemp) tr.push({ type: "scatter", mode: "lines", x: xs, y: ix.map(i => D.TEST_TEMP[i]), name: "TEST_TEMP " + nm(ds), yaxis: "y2", line: { color: css("--faint"), width: 1, dash: "dot" }, hovertemplate: "%{y:.2f} °C<extra></extra>", showlegend: off === 0 });
    off += ix.length;
  });
  const L = baseLayout({ shapes: shapes.concat(specShapes(p)), annotations: ann, margin: { l: 70, r: showTemp ? 60 : 18, t: 34, b: 64 } });
  L.yaxis.type = lg ? "log" : "linear"; L.yaxis.title = { text: yTitle(p) };
  L.xaxis.title = { text: T("Test order (datasets concatenated)"), standoff: 28 };
  if (showTemp) L.yaxis2 = { overlaying: "y", side: "right", title: { text: "TEST_TEMP [°C]" }, showgrid: false, tickfont: { color: css("--muted") } };
  plot(el, tr, L);
}

function familyMembers(fam) { return P.filter(p => PI[p].fkey === fam); }
function chartChannel(el, fam, opts = {}) {
  const ps = familyMembers(fam).filter(p => PI[p].ch !== null);
  if (!ps.length) { el.innerHTML = '<div class="note">This parameter has no channel structure.</div>'; return; }
  chartBox(el, ps, opts);
}

function chartDieLines(el, fam) {
  // one line per die across channels (leaky / extreme points removed) -> shows die-level stacking
  const ps = familyMembers(fam).filter(p => PI[p].ch !== null);
  const lg = ps.some(p => R.log[p]);
  const partner = {};
  ((R.structure._vbr_idark || {}).pairs || []).forEach(([a, b]) => partner[a] = b);
  const tr = [];
  DS.forEach(ds => DSIDX[ds].forEach((i, k) => {
    const y = ps.map(p => { const z = zOf(p)[i]; const bad = (z !== null && Math.abs(z) > ZF) || (partner[p] && Math.abs(zOf(partner[p])[i] ?? 0) > ZW); return bad ? null : D[p][i]; });
    tr.push({ type: "scatter", mode: "lines", x: ps, y, line: { color: colorOf(ds), width: 1 }, opacity: .45, name: nm(ds), legendgroup: ds, showlegend: k === 0, connectgaps: false,
      hovertemplate: esc(dieLabel(i)) + "<br>%{x}: %{y}<extra></extra>" });
  }));
  const L = baseLayout({ margin: { l: 70, r: 18, t: 34, b: 90 } });
  L.xaxis.tickangle = -40; L.yaxis.type = lg ? "log" : "linear"; L.yaxis.title = { text: fam + (unit(ps[0]) ? ` [${unit(ps[0])}]` : "") };
  plot(el, tr, L);
}

function chartLeak(el, fam) {
  const pairs = ((R.structure._vbr_idark || {}).pairs || []).filter(([a, b]) => PI[b].fkey === fam);
  if (!pairs.length) { chartBox(el, familyMembers(fam)); return; }
  const tr = [];
  DS.forEach(ds => {
    const x = [], y = [], t = [];
    pairs.forEach(([a, b]) => DSIDX[ds].forEach(i => { if (D[a][i] !== null && D[b][i] !== null) { x.push(D[b][i]); y.push(D[a][i]); t.push(`${dieLabel(i)}<br>${b} = ${fmt(D[b][i])}<br>${a} = ${fmt(D[a][i])}`); } }));
    tr.push({ type: "scatter", mode: "markers", x, y, name: nm(ds), marker: { color: colorOf(ds), size: 6, opacity: .7 }, text: t, hoverinfo: "text" });
  });
  const allI = pairs.flatMap(([a, b]) => D[b]).filter(v => v !== null);
  const L = baseLayout();
  L.xaxis.type = "log"; L.xaxis.title = { text: T("Dark current (all {0} channels) [{1}]", fam, unit(pairs[0][1])) };
  L.yaxis.title = { text: T("Breakdown voltage (same diode) [{0}]", unit(pairs[0][0])) };
  const zthr = Math.pow(10, Math.log10(median(allI)) + ZF * rsig(allI.map(v => Math.log10(v))));
  L.shapes = [{ type: "line", x0: zthr, x1: zthr, yref: "paper", y0: 0, y1: 1, line: { color: css("--major"), dash: "dot", width: 1.2 } }];
  const su = (R.specs[pairs[0][1]] || {}).USL, sl = (R.specs[pairs[0][0]] || {}).LSL;
  const extraAnn = [];
  if (su !== undefined) { L.shapes.push({ type: "line", x0: su, x1: su, yref: "paper", y0: 0, y1: 1, line: { color: css("--crit"), dash: "dash", width: 1.4 } });
    extraAnn.push({ x: Math.log10(su), y: 0.02, yref: "paper", text: `Idark USL ${fmt(su)} `, showarrow: false, xanchor: "right", font: { size: 10.5, color: css("--crit") } }); }
  if (sl !== undefined) { L.shapes.push({ type: "line", xref: "paper", x0: 0, x1: 1, y0: sl, y1: sl, line: { color: css("--crit"), dash: "dash", width: 1.4 } });
    extraAnn.push({ xref: "paper", x: 0.01, y: sl, text: `Vbr LSL ${fmt(sl)} V`, showarrow: false, xanchor: "left", yanchor: "bottom", font: { size: 10.5, color: css("--crit") } }); }
  L.annotations = extraAnn.concat([{ x: Math.log10(zthr), y: 1, yref: "paper", text: " " + T("statistical outlier limit ≈ {0} (robust z {1})", fmt(zthr), ZF), showarrow: false, xanchor: "left", font: { size: 10.5, color: css("--major") } }]);
  plot(el, tr, L);
}

function regress(x, y) {
  const n = x.length; if (n < 3) return null;
  const mx = mean(x), my = mean(y);
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); syy += (y[i] - my) ** 2; }
  if (!sxx || !syy) return null;
  const b = sxy / sxx, a = my - b * mx, r = sxy / Math.sqrt(sxx * syy);
  return { a, b, r, r2: r * r, n };
}
function chartScatter(el, px, py, o = {}) {
  const tr = [], stats = [], zx = zOf(px), zy = zOf(py);
  const allx = [], ally = [];
  const lx = o.logx ?? R.log[px], ly = o.logy ?? R.log[py];
  DS.forEach(ds => {
    const x = [], y = [], t = [], fx = [], fy = [];
    DSIDX[ds].forEach(i => {
      const a = D[px][i], b = D[py][i]; if (a === null || b === null) return;
      const out = (zx[i] !== null && Math.abs(zx[i]) > ZF) || (zy[i] !== null && Math.abs(zy[i]) > ZF);
      x.push(a); y.push(b); t.push(`${dieLabel(i)}${out ? "<br><b>" + T("excluded from fit (|z|>{0})", ZF) + "</b>" : ""}`);
      if (!(o.excl && out)) { fx.push(lx ? Math.log10(a) : a); fy.push(ly ? Math.log10(b) : b); }
    });
    tr.push({ type: "scatter", mode: "markers", x, y, name: nm(ds), legendgroup: ds, marker: { color: colorOf(ds), size: 7, opacity: .8 }, text: t, hovertemplate: "%{text}<br>x=%{x}<br>y=%{y}<extra></extra>" });
    const f = regress(fx, fy);
    allx.push(...fx); ally.push(...fy);
    if (f) {
      const xr = [Math.min(...fx), Math.max(...fx)];
      tr.push({ type: "scatter", mode: "lines", x: xr.map(v => lx ? 10 ** v : v), y: xr.map(v => { const yy = f.a + f.b * v; return ly ? 10 ** yy : yy; }), line: { color: colorOf(ds), width: 1.6 }, legendgroup: ds, showlegend: false, hoverinfo: "skip" });
      stats.push({ ds, ...f });
    }
  });
  const fa = regress(allx, ally); if (fa) stats.push({ ds: "ALL", ...fa });
  const L = baseLayout();
  L.xaxis.type = lx ? "log" : "linear"; L.yaxis.type = ly ? "log" : "linear";
  L.xaxis.title = { text: yTitle(px) }; L.yaxis.title = { text: yTitle(py) };
  if (o.unity) {
    const v = [...allx, ...ally].map(q => lx ? 10 ** q : q); const lo = Math.min(...v), hi = Math.max(...v);
    L.shapes = [{ type: "line", x0: lo, x1: hi, y0: lo, y1: hi, line: { color: css("--faint"), dash: "dash", width: 1.2 } }];
    L.annotations = [{ x: lx ? Math.log10(hi) : hi, y: ly ? Math.log10(hi) : hi, text: T("y = x (R² = 1 reference)"), showarrow: false, xanchor: "right", yanchor: "bottom", font: { size: 10.5, color: css("--faint") } }];
  }
  plot(el, tr, L);
  return stats;
}

function chartMap(el, p, metric) {
  // wafer map small multiples; duplicated coordinates are split side by side and outlined
  const traces = [], n = DS.length, cols = Math.min(n, 3), rows = Math.ceil(n / cols);
  const L = baseLayout({ grid: { rows, columns: cols, pattern: "independent", xgap: .08, ygap: .14 }, margin: { l: 40, r: 70, t: 36, b: 30 }, annotations: [] });
  const der = p && R.derived && R.derived[p];
  const raw = p ? (der ? der.values : D[p]) : null;
  const vals = p ? (metric === "z" && !der ? zOf(p) : raw) : null;
  const allv = vals ? vals.filter(v => v !== null) : [];
  const lg = p && !der && metric !== "z" && R.log[p];
  const munit = der ? der.unit : unit(p);
  let cmin, cmax;
  if (vals) { if (metric === "z" && !der) { cmin = -6; cmax = 6; } else { const q = quant(lg ? allv.map(v => Math.log10(v)) : allv, [.02, .98]); cmin = q[0]; cmax = q[1]; } }
  DS.forEach((ds, k) => {
    const ax = k ? String(k + 1) : "";
    const cnt = {};
    DSIDX[ds].forEach(i => { const key = D._x[i] + "," + D._y[i]; cnt[key] = (cnt[key] || 0) + 1; });
    const seen = {};
    const x = [], y = [], c = [], t = [], lw = [];
    DSIDX[ds].forEach(i => {
      if (D._x[i] === null) return;
      const key = D._x[i] + "," + D._y[i]; seen[key] = (seen[key] || 0) + 1;
      const dup = cnt[key] > 1;
      x.push(D._x[i] + (dup ? (seen[key] === 1 ? -0.22 : 0.22) : 0)); y.push(D._y[i]);
      if (vals) { const v = vals[i]; c.push(v === null ? null : (lg ? Math.log10(v) : v)); }
      else c.push(cnt[key]);
      lw.push(dup ? 2 : 0);
      t.push(`${dieLabel(i)}${dup ? "<br><b>" + T("{0} dies share this coordinate", cnt[key]) + "</b>" : ""}${vals ? `<br>${der ? der.label : p} = ${fmt(raw[i])}${metric === "z" && !der && vals[i] !== null ? " (z " + vals[i].toFixed(1) + ")" : ""}` : ""}`);
    });
    traces.push({ type: "scatter", mode: "markers", x, y, xaxis: "x" + ax, yaxis: "y" + ax, text: t, hoverinfo: "text", showlegend: false,
      marker: { symbol: "square", size: 15, color: c, cmin: vals ? cmin : 1, cmax: vals ? cmax : 2, colorscale: vals ? (metric === "z" && !der ? "RdBu" : "Viridis") : [[0, css("--ok")], [1, css("--crit")]], reversescale: metric === "z" && !der,
        showscale: k === 0, colorbar: { thickness: 10, len: .8, title: { text: vals ? (metric === "z" && !der ? "robust z" : (lg ? "log10 " : "") + (munit || "")) : T("dies per coordinate"), side: "right" }, tickfont: { color: css("--muted") } },
        line: { width: lw, color: css("--fg") } } });
    const X = D._x.filter(v => v !== null), Y = D._y.filter(v => v !== null);
    L["xaxis" + ax] = { gridcolor: css("--line2"), zeroline: false, dtick: 1, range: [Math.min(...X) - 1, Math.max(...X) + 1], constrain: "domain", tickfont: { size: 9, color: css("--muted") }, title: { text: "X", font: { size: 10 } } };
    L["yaxis" + ax] = { gridcolor: css("--line2"), zeroline: false, dtick: 1, range: [Math.max(...Y) + 1, Math.min(...Y) - 1], tickfont: { size: 9, color: css("--muted") }, title: { text: "Y", font: { size: 10 } } };
    L.annotations.push({ text: esc(nm(ds)), xref: "x" + ax + " domain", yref: "y" + ax + " domain", x: 0, y: 1.06, showarrow: false, xanchor: "left", font: { size: 12, color: colorOf(ds) } });
  });
  plot(el, traces, L);
}

function chartCorrHeat(el, params) {
  const ix = params.map(p => R.corr.params.indexOf(p));
  const z = ix.map(i => ix.map(j => R.corr.r[i][j]));
  plot(el, [{ type: "heatmap", z, x: params, y: params, zmin: -1, zmax: 1, colorscale: "RdBu", reversescale: true, hovertemplate: "%{y} vs %{x}<br>r = %{z:.2f}<extra></extra>", colorbar: { thickness: 10, tickfont: { color: css("--muted") } } }],
    baseLayout({ margin: { l: 130, r: 20, t: 20, b: 130 }, xaxis: { tickangle: -45, tickfont: { size: 9.5, color: css("--muted") } }, yaxis: { autorange: "reversed", tickfont: { size: 9.5, color: css("--muted") } } }));
}

function chartDieZ(el, i) {
  const z = P.map(p => zOf(p)[i]);
  const ord = P.map((p, k) => [p, z[k]]).filter(v => v[1] !== null);
  plot(el, [{ type: "bar", x: ord.map(v => v[0]), y: ord.map(v => v[1]), marker: { color: ord.map(v => Math.abs(v[1]) > ZF ? css("--crit") : Math.abs(v[1]) > ZW ? css("--major") : css("--faint")) },
    hovertemplate: "%{x}<br>z = %{y:.2f}<extra></extra>" }],
    baseLayout({ margin: { l: 52, r: 10, t: 16, b: 110 }, shapes: [ZF, -ZF].map(v => ({ type: "line", xref: "paper", x0: 0, x1: 1, y0: v, y1: v, line: { color: css("--crit"), dash: "dash", width: 1 } })),
      xaxis: { tickangle: -60, tickfont: { size: 9, color: css("--muted") } }, yaxis: { title: { text: T("robust z (within dataset)") }, gridcolor: css("--line2"), tickfont: { color: css("--muted") } } }));
}

