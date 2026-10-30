/* ============================================================ plotly helpers */
function baseLayout(extra = {}) {
  const fg = css("--fg"), mu = css("--muted"), ln = css("--line2");
  return Object.assign({
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "IBM Plex Sans, Noto Sans TC, system-ui, sans-serif", size: 12, color: fg },
    margin: { l: 64, r: 18, t: 34, b: 52 }, hovermode: "closest",
    legend: { orientation: "h", y: 1.12, x: 0, font: { size: 11.5, color: mu } },
    xaxis: { gridcolor: ln, zerolinecolor: ln, linecolor: css("--line"), tickfont: { color: mu }, automargin: true },
    yaxis: { gridcolor: ln, zerolinecolor: ln, linecolor: css("--line"), tickfont: { color: mu }, automargin: true },
    hoverlabel: { font: { family: "IBM Plex Mono, monospace", size: 11.5 } },
  }, extra);
}
const CFG = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"], toImageButtonOptions: { format: "png", scale: 2 } };
function plot(el, traces, layout) {
  if (typeof el === "string") el = document.getElementById(el);
  if (!el) return;
  if (!window.Plotly) { el.innerHTML = '<div class="note warn">' + T("Plotly failed to load (offline?). Put plotly.min.js in the assets folder and rebuild the report.") + '</div>'; return; }
  Plotly.react(el, traces, layout, CFG);
}
function specShapes(p, axis = "y") {
  const s = R.specs[p] || {}, out = [];
  for (const k of ["LSL", "USL", "TARGET"]) if (s[k] !== undefined && s[k] !== null) {
    const line = { color: k === "TARGET" ? css("--ok") : css("--crit"), width: 1.4, dash: k === "TARGET" ? "dot" : "dash" };
    out.push(axis === "y" ? { type: "line", xref: "paper", x0: 0, x1: 1, y0: s[k], y1: s[k], line } : { type: "line", yref: "paper", y0: 0, y1: 1, x0: s[k], x1: s[k], line });
  }
  return out;
}
function yTitle(p) { return p + (unit(p) ? ` [${unit(p)}]` : ""); }

