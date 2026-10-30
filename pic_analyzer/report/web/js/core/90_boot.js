/* ============================================================ boot */
function boot() {
  const cnt = { overview: R.findings.length, anomalies: R.anomalies.filter(a => a.level === "flag").length, sweep: META.sweep ? META.sweep.spectra.length + META.sweep.power.length : 0 };
  $("#tabs").innerHTML = VIEWS.map(([k, l]) => `<a href="#${k}" data-v="${k}">${l}${cnt[k] ? `<span class="ct">${cnt[k]}</span>` : ""}</a>`).join("");
  $("#subttl").textContent = `${META.title_sub} · 產生於 ${META.generated}`;
  $("#foot").innerHTML = `PIC Analyzer v${esc(META.version)} · 資料夾 <span class="mono">${esc(META.folder)}</span> · ${DS.length} 個資料群 · 門檻 z ${ZF}/${ZW}、q ${R.thresholds.alpha_q}、d ${R.thresholds.d_effect}`;
  window.addEventListener("hashchange", () => go(location.hash.slice(1)));
  go(location.hash.slice(1) || "overview");
  const rerender = () => { Object.keys(rendered).forEach(k => rendered[k] = false); show(location.hash.slice(1) || "overview"); };
  const mq = matchMedia("(prefers-color-scheme: dark)");
  if (mq.addEventListener) mq.addEventListener("change", rerender);
  new MutationObserver(rerender).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}
boot();
