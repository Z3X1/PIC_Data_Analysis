RENDER.rootcause = () => {
  const el = $("#v-rootcause");
  const F = R.findings.filter(f => f.causes.length);
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">物理 → 證據 → 下一個實驗</div><h2>Root-cause 工作表</h2>
    <p class="lead">每個 finding 的假說依「能解釋觀察到的型態」排序；「驗證」是能把第一名與第二名分開的最便宜實驗。</p></div>
    ${F.map(f => `<div class="panel"><div class="row" style="justify-content:space-between"><h3>${f.id} · ${esc(f.title)}</h3>${spill(f.severity)}</div>
      <div class="tbox"><table><thead><tr><th class="nosort">#</th><th class="nosort">假說</th><th class="nosort">為何符合 / 不符合</th><th class="nosort">如何驗證</th></tr></thead><tbody>
      ${f.causes.map(c => `<tr><td class="n">${c.rank}</td><td class="wrap"><b>${esc(c.h)}</b></td><td class="wrap">${esc(c.why)}</td><td class="wrap">${esc(c.confirm)}</td></tr>`).join("")}</tbody></table></div>
      ${f.actions.length ? `<ul class="ev mt">${f.actions.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}</div>`).join("")}
    <div class="panel"><h3>常態建議</h3><ul class="ev">${META.generic.map(a => `<li>${esc(a)}</li>`).join("")}</ul></div></div>`;
};

