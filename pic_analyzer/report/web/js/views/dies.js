RENDER.dies = () => {
  const el = $("#v-dies");
  const rows = R.dies.map((d, i) => ({ ...d, i })).sort((a, b) => b.n_flag - a.n_flag || b.maxz - a.maxz);
  if (state.die === null) state.die = rows[0].i;
  const cols = [{ k: "dataset", l: T("Dataset"), f: r => `<span class="sw" style="background:${colorOf(r.dataset)}"></span>${esc(nm(r.dataset))}` }, { k: "die", l: "Die" }, { k: "seq", l: T("Order"), n: 1, f: r => r.seq + 1 },
    { k: "x", l: "X,Y", f: r => r.x === null ? "–" : `${r.x},${r.y}${r.dupxy ? " ⚠" : ""}` }, { k: "sbin", l: "Tester bin", f: r => esc(r.sbin || r.bin) },
    { k: "oos", l: T("Out of spec"), n: 1, f: r => (r.oos || []).length, s: r => (r.oos || []).length, cls: r => (r.oos || []).length ? "hot" : "dim" },
    { k: "n_flag", l: T("Extreme"), n: 1, cls: r => r.n_flag ? "hot" : "" }, { k: "n_watch", l: T("Watch"), n: 1 }, { k: "maxz", l: T("Max |z|"), n: 1, f: r => fmt(r.maxz, 3) },
    { k: "flags", l: T("Extreme parameters"), f: r => esc(r.flags.join(", ")), cls: () => "wrap" },
    { k: "verdict", l: T("Statistical verdict"), f: r => r.n_flag ? tpill("critical", T("review")) : r.n_watch ? tpill("minor", T("watch")) : tpill("ok", T("clean")), s: r => r.n_flag * 100 + r.n_watch }];
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">${T("Every die")}</div><h2>${T("Die health ranking")}</h2>
    <p class="lead">${T("Sorted by the number of extreme readings. Tester bin and statistical verdict side by side: a die the tester passes but that is a statistical outlier is a PAT candidate. Click a die for its full z-profile. ⚠ = original coordinate shared with another die.")}</p></div>
    <div class="panel"><h3 id="dtitle"></h3><div class="chart" id="dz"></div></div>
    ${table(cols, rows, { tall: true, click: r => { state.die = r.i; drawD(); } })}</div>`;
  const drawD = () => { $("#dtitle").textContent = "z-profile · " + dieLabel(state.die).replace(/<[^>]+>/g, ""); chartDieZ("dz", state.die); };
  drawD();
};

