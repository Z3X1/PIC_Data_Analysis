RENDER.sweep = () => {
  const el = $("#v-sweep");
  const SW = META.sweep;
  if (!SW || (!SW.spectra.length && !SW.power.length)) {
    el.innerHTML = `<div class="stack" style="max-width:110ch"><div><div class="eyebrow">${T("IL vs wavelength · optical-power linearity")}</div><h2>${T("No sweep data in this folder")}</h2></div>
      <div class="panel"><p>${T("Put sweep files in the same folder and re-run the analysis to get this page. Auto-detected formats:")}</p>
      <ul class="ev">
        <li><b>${T("IL vs wavelength (long table)")}</b>${T(": one point per row — ")}<code>WAFER_ID, PART_ID${T(" (or X_COORD,Y_COORD)")}, CH, Wavelength_nm, IL_dB</code></li>
        <li><b>${T("IL vs wavelength (wide table)")}</b>${T(": one die × channel per row; column headers are wavelengths (e.g. 1290 … 1330)")}</li>
        <li><b>${T("Optical-power sweep")}</b>${T(": ")}<code>WAFER_ID, PART_ID, CH, Pin_mW${T(" (or Pin_dBm)")}, Pout_mW${T(" (or Pout_dBm)")}, Iph_uA</code></li>
      </ul>
      <p>${T("Computed: peak wavelength, minimum IL, IL@{0} nm, Δλ to the test wavelength, 1 dB / 3 dB bandwidth, dIL/dλ and ripple; for power sweeps R², slope, dB slope, maximum deviation from linear and the 0.1 dB compression point.", META.target_wl || 1310)}</p>
      <p class="dim">${T("To preview: run {0} to create synthetic files marked DEMO (not real data).", "<code>python examples/make_demo_sweep.py &lt;" + T("folder") + "&gt;</code>")}</p></div></div>`;
    return;
  }
  const dsList = [...new Set(SW.spectra.map(s => s.dataset).concat(SW.power.map(s => s.dataset)))];
  const sc = (ds) => PALETTE[(DS.indexOf(ds) >= 0 ? DS.indexOf(ds) : dsList.indexOf(ds)) % PALETTE.length];
  const chKey = s => s.meta.CH || s.meta.CHANNEL || s.meta.ch || s.meta.Channel || "";
  const chs = [...new Set(SW.spectra.map(chKey).concat(SW.power.map(chKey)))].filter(Boolean);
  const demo = SW.files.some(f => /^DEMO_/i.test(f.file));
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">${T("IL vs wavelength · optical-power linearity")}</div><h2>${T("Sweep analysis")}</h2>
    <p class="lead">${SW.files.map(f => T("{0} ({1}, {2} rows → {3})", `<span class="mono">${esc(f.file)}</span>`, f.kind === "power" ? T("power sweep") : T("wavelength sweep"), f.rows, esc(f.dataset))).join(T("; "))}</p>
    ${demo ? `<div class="note warn">${T("Files starting with DEMO_ detected: these are synthetic demo data, not real measurements.")}</div>` : ""}</div>
    <div class="row"><label class="ctl" for="swc">${T("Channel")}</label><select id="swc"><option value="">${T("All")}</option>${chs.map(c => `<option ${c === state.swCh ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <label class="ctl" for="swd">${T("Dataset")}</label><select id="swd"><option value="">${T("All")}</option>${dsList.map(c => `<option ${c === state.swDs ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
    ${SW.spectra.length ? `<div class="grid g2"><div class="panel"><h3>${T("IL spectrum")}</h3><div class="chart tall" id="sws"></div><p class="dim" style="font-size:12px;margin:4px 0 0">${T("Grey dashed line = test wavelength {0} nm.", SW.target)}</p></div>
      <div class="panel"><h3>${T("Spectrum metric distribution")}</h3><div class="row"><select id="swm">${[["dlam", T("Δλ peak − test wavelength [nm]")], ["peak", T("Peak wavelength [nm]")], ["ilmin", T("Minimum IL [dB]")], ["il_t", `IL@${SW.target} nm [dB]`], ["bw1", T("1 dB bandwidth [nm]")], ["bw3", T("3 dB bandwidth [nm]")], ["slope", "dIL/dλ [dB/nm]"], ["ripple", "Ripple p-p [dB]"]].map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div><div class="chart" id="swb"></div></div></div>` : ""}
    ${SW.power.length ? `<div class="grid g2"><div class="panel"><h3>${T("Power sweep")}</h3><div class="row"><select id="swy">${[...new Set(SW.power.map(s => s.ycol))].map(c => `<option>${esc(c)}</option>`).join("")}</select><span class="seg"><button data-v="raw" class="on">${T("Output vs input")}</button><button data-v="res">${T("Deviation from linear %")}</button></span></div><div class="chart tall" id="swp"></div></div>
      <div class="panel"><h3>${T("Linearity metrics")}</h3><div class="row"><select id="swl">${[["r2", T("R² (target 1)")], ["slope_db", T("dB slope (ideal 1.000)")], ["maxdev_pct", T("Max deviation from linear [% FS]")], ["slope", T("Slope (transmission / responsivity)")], ["p01db", T("0.1 dB compression point [mW]")]].map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div><div class="chart" id="swlb"></div></div></div>` : ""}
    <div class="panel"><h3>${T("Curves to review")}</h3><p class="dim" style="font-size:12px;margin:0 0 6px">${T("Curves flagged by the analysis core.", ZF)}</p><div id="swf"></div></div></div>`;
  const filt = s => (!state.swCh || chKey(s) === state.swCh) && (!state.swDs || s.dataset === state.swDs);
  const drawS = () => {
    if (!SW.spectra.length) return;
    const ss = SW.spectra.filter(filt).slice(0, 300), seen = {};
    const tr = ss.map(s => { const first = !seen[s.dataset]; seen[s.dataset] = 1; return { type: "scatter", mode: "lines", x: s.x, y: s.y, name: s.dataset, legendgroup: s.dataset, showlegend: first, line: { color: sc(s.dataset), width: 1 }, opacity: .55, hovertemplate: esc(s.curve) + "<br>%{x} nm: %{y:.3f} dB<extra></extra>" }; });
    const L = baseLayout({ shapes: [{ type: "line", x0: SW.target, x1: SW.target, yref: "paper", y0: 0, y1: 1, line: { color: css("--faint"), dash: "dash" } }] });
    L.xaxis.title = { text: T("Wavelength [nm]") }; L.yaxis.title = { text: "IL [dB]" }; L.yaxis.autorange = "reversed";
    plot("sws", tr, L);
    const m = $("#swm").value;
    const tr2 = dsList.map(ds => ({ type: "box", name: ds, y: SW.spectra.filter(s => s.dataset === ds && (!state.swCh || chKey(s) === state.swCh)).map(s => s.m[m]), boxpoints: "all", jitter: .4, pointpos: 0, marker: { color: sc(ds), size: 4 }, line: { color: sc(ds) }, fillcolor: "rgba(0,0,0,0)" }));
    plot("swb", tr2, baseLayout({ showlegend: false }));
  };
  let pv = "raw";
  const drawP = () => {
    if (!SW.power.length) return;
    const yc = $("#swy").value, ss = SW.power.filter(s => s.ycol === yc && filt(s)).slice(0, 300), seen = {};
    const tr = ss.map(s => { const first = !seen[s.dataset]; seen[s.dataset] = 1;
      const y = pv === "raw" ? s.y : s.x.map((x, i) => 100 * (s.y[i] - (s.m.slope * x + s.m.icpt)) / Math.max(...s.y.map(Math.abs)));
      return { type: "scatter", mode: "lines+markers", x: s.x, y, name: s.dataset, legendgroup: s.dataset, showlegend: first, line: { color: sc(s.dataset), width: 1 }, marker: { size: 3 }, opacity: .6,
        hovertemplate: `${esc(s.curve)}<br>R² ${fmt(s.m.r2, 6)} · ${T("dB slope")} ${fmt(s.m.slope_db, 4)}<br>%{x} mW → %{y}<extra></extra>` }; });
    const L = baseLayout(); L.xaxis.title = { text: T("Input power [mW]") }; L.yaxis.title = { text: pv === "raw" ? yc : T("Deviation from linear fit [% FS]") };
    plot("swp", tr, L);
    const m = $("#swl").value;
    plot("swlb", dsList.map(ds => ({ type: "box", name: ds, y: SW.power.filter(s => s.dataset === ds && s.ycol === yc && (!state.swCh || chKey(s) === state.swCh)).map(s => s.m[m]), boxpoints: "all", jitter: .4, pointpos: 0, marker: { color: sc(ds), size: 4 }, line: { color: sc(ds) }, fillcolor: "rgba(0,0,0,0)" })), baseLayout({ showlegend: false }));
  };
  const fl = (SW.summary.flags || []).slice(0, 500);
  $("#swf").innerHTML = fl.length ? table([{ k: "kind", l: T("Type"), f: r => r.kind === "power" ? T("power") : T("spectrum") }, { k: "dataset", l: T("Dataset") }, { k: "curve", l: T("Curve"), cls: () => "wrap" }, { k: "metric", l: T("Metric") }, { k: "value", l: T("Reading"), n: 1, f: r => fmt(r.value, 6) }, { k: "z", l: "z", n: 1, f: r => fmt(r.z, 3) }, { k: "note", l: T("Description"), cls: () => "wrap" }], fl, { tall: true }) : '<div class="note">' + T("No curves to review.") + '</div>';
  drawS(); drawP();
  ["swc", "swd"].forEach(id => $("#" + id).onchange = () => { state.swCh = $("#swc").value; state.swDs = $("#swd").value; drawS(); drawP(); });
  if ($("#swm")) $("#swm").onchange = drawS;
  if ($("#swy")) $("#swy").onchange = drawP;
  if ($("#swl")) $("#swl").onchange = drawP;
  el.querySelectorAll("button[data-v]").forEach(b => b.onclick = () => { pv = b.dataset.v; el.querySelectorAll("button[data-v]").forEach(x => x.classList.toggle("on", x === b)); drawP(); });
};

