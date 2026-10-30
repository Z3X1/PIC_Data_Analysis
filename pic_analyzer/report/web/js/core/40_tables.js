/* ============================================================ tables */
function table(cols, rows, o = {}) {
  // cols: [{k,l,n(bool numeric),f(fn->html), cls(fn)}]
  const id = "t" + Math.random().toString(36).slice(2, 8);
  const wrapCls = "tbox" + (o.tall ? " tall" : "");
  const head = cols.map((c, j) => `<th class="${c.n ? "n" : ""}${c.nosort ? " nosort" : ""}" data-j="${j}" title="${esc(c.t || "")}">${c.l}</th>`).join("");
  const body = rows.map((r, i) => `<tr${o.click ? ` class="click" data-i="${i}"` : ""}>` + cols.map(c => `<td class="${c.n ? "n" : ""} ${c.cls ? c.cls(r) : ""}">${c.f ? c.f(r) : esc(r[c.k])}</td>`).join("") + "</tr>").join("");
  setTimeout(() => {
    const t = document.getElementById(id); if (!t) return;
    let dir = {};
    t.querySelectorAll("th:not(.nosort)").forEach(th => th.addEventListener("click", () => {
      const j = +th.dataset.j, c = cols[j]; dir[j] = -(dir[j] || -1);
      const key = c.s || (r => r[c.k]);
      const idx = rows.map((r, i) => i).sort((a, b) => { let x = key(rows[a]), y = key(rows[b]); if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1; return (x > y ? 1 : x < y ? -1 : 0) * dir[j]; });
      const tb = t.querySelector("tbody"); const trs = [...tb.children]; idx.forEach(i => tb.appendChild(trs.find(tr => +tr.dataset.k === i)));
    }));
    [...t.querySelectorAll("tbody tr")].forEach((tr, i) => tr.dataset.k = i);
    if (o.click) t.querySelectorAll("tbody tr").forEach(tr => tr.addEventListener("click", () => o.click(rows[+tr.dataset.k])));
  });
  return `<div class="${wrapCls}"><table id="${id}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function copyTSV(cols, rows) {
  const txt = [cols.map(c => c.l.replace(/<[^>]+>/g, "")).join("\t")].concat(rows.map(r => cols.map(c => { const v = c.s ? c.s(r) : r[c.k]; return v === null || v === undefined ? "" : String(v).replace(/<[^>]+>/g, ""); }).join("\t"))).join("\n");
  return navigator.clipboard ? navigator.clipboard.writeText(txt).then(() => true, () => false) : Promise.resolve(false);
}
const pill = s => `<span class="pill s-${s}">${s.toUpperCase()}</span>`;

