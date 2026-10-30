RENDER.anomalies = () => {
  const el = $("#v-anomalies");
  const A = R.anomalies.map(a => ({ ...a, ratio: a.median ? a.value / a.median : null }));
  const cols = [{ k: "level", l: "等級", f: r => r.level === "flag" ? tpill("critical", "極端") : tpill("minor", "觀察") },
    { k: "oos", l: "Spec", f: r => r.oos ? tpill("critical", "超出") : "", s: r => r.oos ? 1 : 0 },
    { k: "dataset", l: "資料群", f: r => `<span class="sw" style="background:${colorOf(r.dataset)}"></span>${esc(nm(r.dataset))}` },
    { k: "die", l: "Die" }, { k: "seq", l: "順序", n: 1, f: r => r.seq + 1 }, { k: "x", l: "X,Y", f: r => r.x === null ? "–" : `${r.x},${r.y}` },
    { k: "param", l: "參數", f: r => `<b>${esc(r.param)}</b>` }, { k: "family", l: "Family" },
    { k: "value", l: "數值", n: 1, f: r => fmt(r.value) }, { k: "median", l: "資料群中位數", n: 1, f: r => fmt(r.median) },
    { k: "ratio", l: "× 中位數", n: 1, f: r => fmt(r.ratio, 3) }, { k: "z", l: "Robust z", n: 1, f: r => r.z.toFixed(1), s: r => Math.abs(r.z), cls: r => Math.abs(r.z) > ZF ? "hot" : "warm" }];
  const fams = [...new Set(A.map(a => a.family))];
  const crow = fams.map(f => { const r = { f }; DS.forEach(ds => { r[ds] = A.filter(a => a.family === f && a.dataset === ds && a.level === "flag").length; r["w" + ds] = A.filter(a => a.family === f && a.dataset === ds && a.level === "watch").length; }); return r; });
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">母體以外的每一筆讀值</div><h2>異常清單</h2>
    <p class="lead">極端 = |robust z| &gt; ${ZF}；觀察 = ${ZW} &lt; |z| ≤ ${ZF}。z 在各資料群內計算，所以整片 wafer 的偏移不會在這裡變成異常（偏移在資料群比較處理）。Spec 欄標示是否超出 TestSpec。</p></div>
    ${table([{ k: "f", l: "Family" }].concat(DS.map(ds => ({ k: ds, l: esc(nm(ds)) + " 極端 · 觀察", n: 1, f: r => `${r[ds]} · ${r["w" + ds]}`, cls: r => r[ds] ? "hot" : "" }))), crow)}
    <div class="row"><input type="search" id="af" placeholder="篩選參數 / die" aria-label="篩選異常"><label class="ctl"><input type="checkbox" id="aext" checked> 只看極端</label><button id="acopy">複製（TSV）</button><span id="amsg" class="dim"></span></div>
    <div id="atab"></div></div>`;
  const draw = () => {
    const q = $("#af").value.toLowerCase(), ex = $("#aext").checked;
    const rr = A.filter(a => (!ex || a.level === "flag") && (!q || (a.param + " " + a.die + " " + a.dataset).toLowerCase().includes(q))).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
    $("#atab").innerHTML = table(cols, rr, { tall: true, click: r => openParam(r.param) });
    $("#acopy").onclick = () => copyTSV(cols, rr).then(ok => $("#amsg").textContent = ok ? "已複製 " + rr.length + " 列" : "瀏覽器不允許複製");
  };
  $("#af").oninput = draw; $("#aext").onchange = draw; draw();
};

