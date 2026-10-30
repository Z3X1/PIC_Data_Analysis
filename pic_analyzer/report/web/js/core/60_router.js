/* ============================================================ views */
const VIEWS = [
  ["overview", "總覽"], ["datasets", "Wafer summary"], ["params", "參數表"], ["explorer", "分佈・趨勢"],
  ["correlation", "參數相關"], ["paircorr", "R² 對比"], ["wafermap", "Wafer map"], ["sweep", "掃描"],
  ["anomalies", "異常清單"], ["dies", "晶粒健康"], ["rootcause", "根因"], ["msa", "量測能力"], ["method", "方法"]];
const rendered = {};
const state = { param: null, dist: "box", temp: false, cx: null, cy: null, unity: true, excl: true, mapP: null, mapM: "value", die: null, pair: 0, pitem: null, pfilter: "", swCh: "", swDs: "" };
function go(v) { if (!VIEWS.some(x => x[0] === v)) v = "overview"; if (location.hash.slice(1) !== v) history.replaceState(null, "", "#" + v); show(v); }
function show(v) {
  document.querySelectorAll("section.view").forEach(s => s.classList.toggle("on", s.id === "v-" + v));
  document.querySelectorAll("nav.tabs a").forEach(a => a.classList.toggle("on", a.dataset.v === v));
  if (!rendered[v]) { RENDER[v](); rendered[v] = true; }
  window.dispatchEvent(new Event("resize"));
}
const SEVZH = { critical: "嚴重", major: "重要", minor: "次要", info: "資訊" };
const spill = s => `<span class="pill s-${s}">${SEVZH[s] || s}</span>`;
const tpill = (cls, txt) => `<span class="pill s-${cls}">${txt}</span>`;
const sevCount = s => R.findings.filter(f => f.severity === s).length;
const openParam = p => { state.param = p; rendered.explorer = false; go("explorer"); };

const RENDER = {};
