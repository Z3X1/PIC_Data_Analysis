/* ============================================================ boot */
function boot() {
  document.title = $("#ttl").textContent = T("PIC KGD Data Analysis");
  const cnt = { overview: R.findings.length, anomalies: R.anomalies.filter(a => a.level === "flag").length, sweep: META.sweep ? META.sweep.spectra.length + META.sweep.power.length : 0 };
  $("#tabs").innerHTML = VIEWS.map(([k, l]) => `<a href="#${k}" data-v="${k}">${l}${cnt[k] ? `<span class="ct">${cnt[k]}</span>` : ""}</a>`).join("");
  $("#subttl").textContent = `${META.title_sub} · ${T("generated {0}", META.generated)}`;
  $("#foot").innerHTML = `PIC Analyzer v${esc(META.version)} · ${T("folder")} <span class="mono">${esc(META.folder)}</span> · ${T("{0} datasets", DS.length)} · ${T("thresholds z {0}/{1}, q {2}, d {3}", ZF, ZW, R.thresholds.alpha_q, R.thresholds.d_effect)}`;
  window.addEventListener("hashchange", () => go(location.hash.slice(1)));
  go(location.hash.slice(1) || "overview");
  const rerender = () => { Object.keys(rendered).forEach(k => rendered[k] = false); show(location.hash.slice(1) || "overview"); };
  const mq = matchMedia("(prefers-color-scheme: dark)");
  if (mq.addEventListener) mq.addEventListener("change", rerender);
  new MutationObserver(rerender).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}
boot();
