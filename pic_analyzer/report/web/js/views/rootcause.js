RENDER.rootcause = () => {
  const el = $("#v-rootcause");
  const F = R.findings.filter(f => f.causes.length);
  el.innerHTML = `<div class="stack"><div><div class="eyebrow">${T("Physics → evidence → next experiment")}</div><h2>${T("Root-cause worksheet")}</h2>
    <p class="lead">${T("The hypotheses of each finding are ranked by how well they explain the observed pattern; “Confirm” is the cheapest experiment that separates the first from the second.")}</p></div>
    ${F.map(f => `<div class="panel"><div class="row" style="justify-content:space-between"><h3>${f.id} · ${esc(f.title)}</h3>${spill(f.severity)}</div>
      <div class="tbox"><table><thead><tr><th class="nosort">#</th><th class="nosort">${T("Hypothesis")}</th><th class="nosort">${T("Why it fits / does not fit")}</th><th class="nosort">${T("How to confirm")}</th></tr></thead><tbody>
      ${f.causes.map(c => `<tr><td class="n">${c.rank}</td><td class="wrap"><b>${esc(c.h)}</b></td><td class="wrap">${esc(c.why)}</td><td class="wrap">${esc(c.confirm)}</td></tr>`).join("")}</tbody></table></div>
      ${f.actions.length ? `<ul class="ev mt">${f.actions.map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}</div>`).join("")}
    <div class="panel"><h3>${T("Standing recommendations")}</h3><ul class="ev">${META.generic.map(a => `<li>${esc(a)}</li>`).join("")}</ul></div></div>`;
};

