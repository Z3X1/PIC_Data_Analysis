RENDER.msa = () => {
  const el = $("#v-msa");
  const g = R.msa.grr;
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">量測系統分析</div><h2>測試能不能看出差異？</h2>
    <p class="lead">GR&R 需要同一顆 die 量兩次以上。把同一片 wafer 的 retest / 相關性檔案放進資料夾，這張表會自動產生；「R² 對比」分頁也會自動切換成同 die 配對。</p></div>
    <div class="note ${g.length ? "" : "warn"}">${esc(R.msa.status)}</div>
    ${g.length ? table([{ k: "param", l: "參數" }, { k: "sigma_rep", l: "σ 重複性", n: 1, f: r => fmt(r.sigma_rep) }, { k: "pct_tv", l: "%GRR / 總變異", n: 1, f: r => fmt(r.pct_tv, 3), cls: r => r.pct_tv > 30 ? "hot" : r.pct_tv > 10 ? "warm" : "" }, { k: "pct_tol", l: "%GRR / 公差", n: 1, f: r => fmt(r.pct_tol, 3), cls: r => r.pct_tol > 30 ? "hot" : r.pct_tol > 10 ? "warm" : "" }, { k: "ndc", l: "ndc", n: 1, f: r => fmt(r.ndc, 3), cls: r => r.ndc !== null && r.ndc < 5 ? "warm" : "" }], g, { tall: true }) : ""}
    <div><h3>記錄解析度</h3><p class="lead">經驗法則：解析度 ≤ 公差的 1/10，且 ≤ 製程 σ 的 ½。</p>
    ${table([{ k: "param", l: "參數" }, { k: "res", l: "解析度", n: 1, f: r => fmt(r.res) }, { k: "rsd", l: "Robust σ", n: 1, f: r => fmt(r.rsd) }, { k: "tol", l: "公差", n: 1, f: r => fmt(r.tol) },
      { k: "ok_tol", l: "≤ 公差/10", f: r => r.tol === null || r.tol === undefined ? "–" : r.ok_tol ? tpill("ok", "合格") : tpill("major", "太粗"), s: r => r.ok_tol ? 1 : 0 },
      { k: "ok_spread", l: "≤ ½ σ", f: r => r.ok_spread ? tpill("ok", "合格") : tpill("major", "太粗"), s: r => r.ok_spread ? 1 : 0 }], R.msa.resolution, { tall: true })}</div></div>`;
};

