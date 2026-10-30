RENDER.sweep = () => {
  const el = $("#v-sweep");
  const SW = META.sweep;
  if (!SW || (!SW.spectra.length && !SW.power.length)) {
    el.innerHTML = `<div class="stack" style="max-width:110ch"><div><div class="eyebrow">IL 對波長 · 光功率線性度</div><h2>這個資料夾沒有掃描資料</h2></div>
      <div class="panel"><p>把掃描檔放進同一個資料夾，重新分析就會出現這一頁。自動辨識的格式：</p>
      <ul class="ev">
        <li><b>IL 對波長（長表）</b>：每列一個點 — <code>WAFER_ID, PART_ID（或 X_COORD,Y_COORD）, CH, Wavelength_nm, IL_dB</code></li>
        <li><b>IL 對波長（寬表）</b>：每列一個 die × 通道，欄位標題是波長數字（例如 1290 … 1330）</li>
        <li><b>光功率掃描</b>：<code>WAFER_ID, PART_ID, CH, Pin_mW（或 Pin_dBm）, Pout_mW（或 Pout_dBm）, Iph_uA</code></li>
      </ul>
      <p>計算項目：峰值波長（拋物線擬合）、最小 IL、IL@${META.target_wl || 1310} nm、Δλ = 峰值 − 測試波長、1 dB / 3 dB 頻寬、dIL/dλ、ripple；功率掃描的 R²（目標 = 1）、斜率（穿透率 / 響應度）、dB 斜率（理想 1.000 dB/dB）、最大偏離線性 %、0.1 dB 壓縮點。</p>
      <p class="dim">想先看樣子：執行 <code>python examples/make_demo_sweep.py &lt;資料夾&gt;</code> 會產生標示為 DEMO 的合成檔案（不是實際資料）。</p></div></div>`;
    return;
  }
  const dsList = [...new Set(SW.spectra.map(s => s.dataset).concat(SW.power.map(s => s.dataset)))];
  const sc = (ds) => PALETTE[(DS.indexOf(ds) >= 0 ? DS.indexOf(ds) : dsList.indexOf(ds)) % PALETTE.length];
  const chKey = s => s.meta.CH || s.meta.CHANNEL || s.meta.ch || s.meta.Channel || "";
  const chs = [...new Set(SW.spectra.map(chKey).concat(SW.power.map(chKey)))].filter(Boolean);
  const demo = SW.files.some(f => /^DEMO_/i.test(f.file));
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">IL 對波長 · 光功率線性度</div><h2>掃描分析</h2>
    <p class="lead">${SW.files.map(f => `<span class="mono">${esc(f.file)}</span>（${f.kind === "power" ? "功率掃描" : "波長掃描"}，${f.rows} 列 → ${esc(f.dataset)}）`).join("；")}</p>
    ${demo ? `<div class="note warn">偵測到 DEMO_ 開頭的檔案：這些是合成示範資料，不是實際量測。</div>` : ""}</div>
    <div class="row"><label class="ctl" for="swc">通道</label><select id="swc"><option value="">全部</option>${chs.map(c => `<option ${c === state.swCh ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      <label class="ctl" for="swd">資料群</label><select id="swd"><option value="">全部</option>${dsList.map(c => `<option ${c === state.swDs ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
    ${SW.spectra.length ? `<div class="grid g2"><div class="panel"><h3>IL 頻譜</h3><div class="chart tall" id="sws"></div><p class="dim" style="font-size:12px;margin:4px 0 0">灰色虛線 = 測試波長 ${SW.target} nm。</p></div>
      <div class="panel"><h3>頻譜指標分佈</h3><div class="row"><select id="swm">${[["dlam", "Δλ 峰值 − 測試波長 [nm]"], ["peak", "峰值波長 [nm]"], ["ilmin", "最小 IL [dB]"], ["il_t", `IL@${SW.target} nm [dB]`], ["bw1", "1 dB 頻寬 [nm]"], ["bw3", "3 dB 頻寬 [nm]"], ["slope", "dIL/dλ [dB/nm]"], ["ripple", "Ripple p-p [dB]"]].map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div><div class="chart" id="swb"></div></div></div>` : ""}
    ${SW.power.length ? `<div class="grid g2"><div class="panel"><h3>功率掃描</h3><div class="row"><select id="swy">${[...new Set(SW.power.map(s => s.ycol))].map(c => `<option>${esc(c)}</option>`).join("")}</select><span class="seg"><button data-v="raw" class="on">輸出 vs 輸入</button><button data-v="res">偏離線性 %</button></span></div><div class="chart tall" id="swp"></div></div>
      <div class="panel"><h3>線性度指標</h3><div class="row"><select id="swl">${[["r2", "R²（目標 1）"], ["slope_db", "dB 斜率（理想 1.000）"], ["maxdev_pct", "最大偏離線性 [% FS]"], ["slope", "斜率（穿透率 / 響應度）"], ["p01db", "0.1 dB 壓縮點 [mW]"]].map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></div><div class="chart" id="swlb"></div></div></div>` : ""}
    <div class="panel"><h3>需要注意的曲線</h3><p class="dim" style="font-size:12px;margin:0 0 6px">頻譜指標在資料群內 |robust z| &gt; ${ZF}；功率掃描 R² &lt; 0.999、|dB 斜率 − 1| &gt; 0.02、或出現 0.1 dB 壓縮。</p><div id="swf"></div></div></div>`;
  const filt = s => (!state.swCh || chKey(s) === state.swCh) && (!state.swDs || s.dataset === state.swDs);
  const drawS = () => {
    if (!SW.spectra.length) return;
    const ss = SW.spectra.filter(filt).slice(0, 300), seen = {};
    const tr = ss.map(s => { const first = !seen[s.dataset]; seen[s.dataset] = 1; return { type: "scatter", mode: "lines", x: s.x, y: s.y, name: s.dataset, legendgroup: s.dataset, showlegend: first, line: { color: sc(s.dataset), width: 1 }, opacity: .55, hovertemplate: esc(s.curve) + "<br>%{x} nm: %{y:.3f} dB<extra></extra>" }; });
    const L = baseLayout({ shapes: [{ type: "line", x0: SW.target, x1: SW.target, yref: "paper", y0: 0, y1: 1, line: { color: css("--faint"), dash: "dash" } }] });
    L.xaxis.title = { text: "波長 [nm]" }; L.yaxis.title = { text: "IL [dB]" }; L.yaxis.autorange = "reversed";
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
        hovertemplate: `${esc(s.curve)}<br>R² ${fmt(s.m.r2, 6)} · dB 斜率 ${fmt(s.m.slope_db, 4)}<br>%{x} mW → %{y}<extra></extra>` }; });
    const L = baseLayout(); L.xaxis.title = { text: "輸入功率 [mW]" }; L.yaxis.title = { text: pv === "raw" ? yc : "偏離線性擬合 [% FS]" };
    plot("swp", tr, L);
    const m = $("#swl").value;
    plot("swlb", dsList.map(ds => ({ type: "box", name: ds, y: SW.power.filter(s => s.dataset === ds && s.ycol === yc && (!state.swCh || chKey(s) === state.swCh)).map(s => s.m[m]), boxpoints: "all", jitter: .4, pointpos: 0, marker: { color: sc(ds), size: 4 }, line: { color: sc(ds) }, fillcolor: "rgba(0,0,0,0)" })), baseLayout({ showlegend: false }));
  };
  const fl = (SW.summary.flags || []).slice(0, 500);
  $("#swf").innerHTML = fl.length ? table([{ k: "kind", l: "類型", f: r => r.kind === "power" ? "功率" : "頻譜" }, { k: "dataset", l: "資料群" }, { k: "curve", l: "曲線", cls: () => "wrap" }, { k: "metric", l: "指標" }, { k: "value", l: "值", n: 1, f: r => fmt(r.value, 6) }, { k: "z", l: "z", n: 1, f: r => fmt(r.z, 3) }, { k: "note", l: "說明", cls: () => "wrap" }], fl, { tall: true }) : '<div class="note">沒有需要注意的曲線。</div>';
  drawS(); drawP();
  ["swc", "swd"].forEach(id => $("#" + id).onchange = () => { state.swCh = $("#swc").value; state.swDs = $("#swd").value; drawS(); drawP(); });
  if ($("#swm")) $("#swm").onchange = drawS;
  if ($("#swy")) $("#swy").onchange = drawP;
  if ($("#swl")) $("#swl").onchange = drawP;
  el.querySelectorAll("button[data-v]").forEach(b => b.onclick = () => { pv = b.dataset.v; el.querySelectorAll("button[data-v]").forEach(x => x.classList.toggle("on", x === b)); drawP(); });
};

