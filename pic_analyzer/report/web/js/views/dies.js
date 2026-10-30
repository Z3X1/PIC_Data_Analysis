RENDER.dies = () => {
  const el = $("#v-dies");
  const rows = R.dies.map((d, i) => ({ ...d, i })).sort((a, b) => b.n_flag - a.n_flag || b.maxz - a.maxz);
  if (state.die === null) state.die = rows[0].i;
  const cols = [{ k: "dataset", l: "資料群", f: r => `<span class="sw" style="background:${colorOf(r.dataset)}"></span>${esc(nm(r.dataset))}` }, { k: "die", l: "Die" }, { k: "seq", l: "順序", n: 1, f: r => r.seq + 1 },
    { k: "x", l: "X,Y", f: r => r.x === null ? "–" : `${r.x},${r.y}${r.dupxy ? " ⚠" : ""}` }, { k: "sbin", l: "Tester bin", f: r => esc(r.sbin || r.bin) },
    { k: "oos", l: "超出 spec", n: 1, f: r => (r.oos || []).length, s: r => (r.oos || []).length, cls: r => (r.oos || []).length ? "hot" : "dim" },
    { k: "n_flag", l: "極端", n: 1, cls: r => r.n_flag ? "hot" : "" }, { k: "n_watch", l: "觀察", n: 1 }, { k: "maxz", l: "最大 |z|", n: 1, f: r => fmt(r.maxz, 3) },
    { k: "flags", l: "極端參數", f: r => esc(r.flags.join(", ")), cls: () => "wrap" },
    { k: "verdict", l: "統計判定", f: r => r.n_flag ? tpill("critical", "需審查") : r.n_watch ? tpill("minor", "觀察") : tpill("ok", "乾淨"), s: r => r.n_flag * 100 + r.n_watch }];
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">每顆 die</div><h2>晶粒健康排名</h2>
    <p class="lead">依極端讀值數排序。Tester bin 與統計判定並列：tester 判 PASS、但統計上離群的 die 就是 PAT 候選。點一顆 die 看完整 z-profile。⚠ = 原始座標與另一顆 die 重複。</p></div>
    <div class="panel"><h3 id="dtitle"></h3><div class="chart" id="dz"></div></div>
    ${table(cols, rows, { tall: true, click: r => { state.die = r.i; drawD(); } })}</div>`;
  const drawD = () => { $("#dtitle").textContent = "z-profile · " + dieLabel(state.die).replace(/<[^>]+>/g, ""); chartDieZ("dz", state.die); };
  drawD();
};

