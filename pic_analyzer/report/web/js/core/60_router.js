/* ============================================================ views */
const VIEWS = [
  ["overview", T("Overview")], ["datasets", T("Wafer summary")], ["params", T("Parameters")], ["explorer", T("Distribution · Trend")],
  ["correlation", T("Correlation")], ["paircorr", T("R² comparison")], ["wafermap", T("Wafer map")], ["sweep", T("Sweeps")],
  ["anomalies", T("Anomalies")], ["dies", T("Die health")], ["rootcause", T("Root cause")], ["msa", T("MSA")], ["method", T("Method")]];
const rendered = {};
const state = { param: null, dist: "box", temp: false, cx: null, cy: null, unity: true, excl: true, mapP: null, mapM: "value", die: null, pair: 0, pitem: null, pfilter: "", swCh: "", swDs: "" };
function go(v) { if (!VIEWS.some(x => x[0] === v)) v = "overview"; if (location.hash.slice(1) !== v) history.replaceState(null, "", "#" + v); show(v); }
function show(v) {
  document.querySelectorAll("section.view").forEach(s => s.classList.toggle("on", s.id === "v-" + v));
  document.querySelectorAll("nav.tabs a").forEach(a => a.classList.toggle("on", a.dataset.v === v));
  if (!rendered[v]) { RENDER[v](); rendered[v] = true; }
  window.dispatchEvent(new Event("resize"));
}
const SEV_LABEL = { critical: T("Critical"), major: T("Major"), minor: T("Minor"), info: T("Info") };
const spill = s => `<span class="pill s-${s}">${SEV_LABEL[s] || s}</span>`;
const tpill = (cls, txt) => `<span class="pill s-${cls}">${txt}</span>`;
const sevCount = s => R.findings.filter(f => f.severity === s).length;
const openParam = p => { state.param = p; rendered.explorer = false; go("explorer"); };

const RENDER = {};
