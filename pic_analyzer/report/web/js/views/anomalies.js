RENDER.anomalies = () => {
  const el = $("#v-anomalies");
  const A = R.anomalies.map(a => ({ ...a, ratio: a.median ? a.value / a.median : null }));
  const cols = [{ k: "level", l: T("Level"), f: r => r.level === "flag" ? tpill("critical", T("extreme")) : tpill("minor", T("watch")) },
    { k: "oos", l: "Spec", f: r => r.oos ? tpill("critical", T("out")) : "", s: r => r.oos ? 1 : 0 },
    { k: "dataset", l: T("Dataset"), f: r => `<span class="sw" style="background:${colorOf(r.dataset)}"></span>${esc(nm(r.dataset))}` },
    { k: "die", l: "Die" }, { k: "seq", l: T("Order"), n: 1, f: r => r.seq + 1 }, { k: "x", l: "X,Y", f: r => r.x === null ? "–" : `${r.x},${r.y}` },
    { k: "param", l: T("Parameter"), f: r => `<b>${esc(r.param)}</b>` }, { k: "family", l: "Family" },
    { k: "value", l: T("Value"), n: 1, f: r => fmt(r.value) }, { k: "median", l: T("Dataset median"), n: 1, f: r => fmt(r.median) },
    { k: "ratio", l: T("× median"), n: 1, f: r => fmt(r.ratio, 3) }, { k: "z", l: "Robust z", n: 1, f: r => r.z.toFixed(1), s: r => Math.abs(r.z), cls: r => Math.abs(r.z) > ZF ? "hot" : "warm" }];
  const fams = [...new Set(A.map(a => a.family))];
  const crow = fams.map(f => { const r = { f }; DS.forEach(ds => { r[ds] = A.filter(a => a.family === f && a.dataset === ds && a.level === "flag").length; r["w" + ds] = A.filter(a => a.family === f && a.dataset === ds && a.level === "watch").length; }); return r; });
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">${T("Every reading outside the population")}</div><h2>${T("Anomalies")}</h2>
    <p class="lead">${T("Extreme = |robust z| &gt; {0}; watch = {1} &lt; |z| ≤ {0}. z is computed within each dataset, so a whole-wafer shift does not appear as anomalies here (shifts are handled by the dataset comparison). The Spec column marks readings outside the TestSpec.", ZF, ZW)}</p></div>
    ${table([{ k: "f", l: "Family" }].concat(DS.map(ds => ({ k: ds, l: T("{0} extreme · watch", esc(nm(ds))), n: 1, f: r => `${r[ds]} · ${r["w" + ds]}`, cls: r => r[ds] ? "hot" : "" }))), crow)}
    <div class="row"><input type="search" id="af" placeholder="${T("Filter parameter / die")}" aria-label="${T("Filter anomalies")}"><label class="ctl"><input type="checkbox" id="aext" checked> ${T("Extreme only")}</label><button id="acopy">${T("Copy (TSV)")}</button><span id="amsg" class="dim"></span></div>
    <div id="atab"></div></div>`;
  const draw = () => {
    const q = $("#af").value.toLowerCase(), ex = $("#aext").checked;
    const rr = A.filter(a => (!ex || a.level === "flag") && (!q || (a.param + " " + a.die + " " + a.dataset).toLowerCase().includes(q))).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
    $("#atab").innerHTML = table(cols, rr, { tall: true, click: r => openParam(r.param) });
    $("#acopy").onclick = () => copyTSV(cols, rr).then(ok => $("#amsg").textContent = ok ? T("Copied {0} rows", rr.length) : T("The browser blocked copying"));
  };
  $("#af").oninput = draw; $("#aext").onchange = draw; draw();
};

