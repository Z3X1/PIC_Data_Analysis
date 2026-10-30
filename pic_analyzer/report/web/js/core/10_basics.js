/* ============================================================ basics */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const D = R.data, N = D._dataset.length, P = R.params, PI = R.pinfo;
const DS = [...new Set(D._dataset)];
const PALETTE = ["#2a4bd1","#d1662a","#1d8a6b","#a23fb5","#c9a227","#2f9fc6","#b8455c","#5c7a2a","#6b5ed8","#8a6d4f","#2ab0a0","#d14f9a"];
let NAMES = {};
try { NAMES = JSON.parse(localStorage.getItem("pic-names-" + META.key) || "{}"); } catch (e) { NAMES = {}; }
const nm = ds => NAMES[ds] || ds;
const colorOf = ds => PALETTE[DS.indexOf(ds) % PALETTE.length];
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function fmt(v, d = 4) {
  if (v === null || v === undefined || (typeof v === "number" && !isFinite(v))) return "–";
  if (typeof v !== "number") return esc(v);
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1e5 || a < 1e-3) return v.toExponential(2);
  if (a >= 1000) return v.toFixed(0);
  if (a >= 100) return v.toFixed(1);
  if (a >= 10) return v.toFixed(2);
  return Number(v.toPrecision(d)).toString();
}
const pct = v => v === null || v === undefined ? "–" : (v > 0 ? "+" : "") + v.toFixed(1) + " %";
const median = a => { const b = a.filter(x => x !== null && isFinite(x)).sort((x, y) => x - y); if (!b.length) return NaN; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const mean = a => { const b = a.filter(x => x !== null && isFinite(x)); return b.reduce((s, x) => s + x, 0) / b.length; };
function rsig(a) { const b = a.filter(x => x !== null && isFinite(x)); const m = median(b); let s = 1.4826 * median(b.map(x => Math.abs(x - m))); if (!s) { const q = quant(b, [.25, .75]); s = (q[1] - q[0]) / 1.349; } if (!s) { const mu = mean(b); s = Math.sqrt(b.reduce((t, x) => t + (x - mu) ** 2, 0) / (b.length - 1)); } return s; }
function quant(a, qs) { const b = a.filter(x => x !== null && isFinite(x)).sort((x, y) => x - y); return qs.map(q => { const i = (b.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return b[lo] + (b[hi] - b[lo]) * (i - lo); }); }
const idxOf = ds => { const o = []; for (let i = 0; i < N; i++) if (D._dataset[i] === ds) o.push(i); return o; };
const DSIDX = Object.fromEntries(DS.map(d => [d, idxOf(d)]));
const ZC = {};
function zOf(p) { // robust z inside each dataset, log10 for log parameters (same rule as the engine)
  if (ZC[p]) return ZC[p];
  const z = new Array(N).fill(null), lg = R.log[p];
  for (const ds of DS) {
    const ix = DSIDX[ds];
    const v = ix.map(i => { const x = D[p][i]; return x === null ? null : (lg ? (x > 0 ? Math.log10(x) : null) : x); });
    const m = median(v), s = rsig(v);
    ix.forEach((i, k) => { z[i] = v[k] === null || !s ? null : (v[k] - m) / s; });
  }
  return (ZC[p] = z);
}
const ZF = R.thresholds.z_flag, ZW = R.thresholds.z_watch;
const unit = p => (PI[p] && PI[p].unit) ? PI[p].unit : "";
const dieLabel = i => `${nm(D._dataset[i])} · die ${D._die[i]} · 第 ${D._seq[i] + 1} 顆` + (D._x[i] !== null ? ` · (${D._x[i]},${D._y[i]})${D._dupxy && D._dupxy[i] ? " ⚠座標重複" : ""}` : "");

