"""分析引擎入口：整個分析只有三步。

    ctx      = analysis.pipeline.compute(...)   # 統計、比較、結構、空間、MSA …
    findings = findings.build_findings(ctx)     # 規則 → 結論 + root-cause 假說
    result   = analysis.pipeline.export(ctx, findings)

result 是一個可序列化的 dict，交給 report.html / report.excel。
"""
from __future__ import annotations

import warnings

try:  # analysis/ 與 findings/ 是私有核心，不在公開 repo
    from .analysis import pipeline
    from .findings import build_findings
except ImportError as _e:  # public build
    pipeline = build_findings = None
    _MISSING = _e

warnings.filterwarnings("ignore", category=RuntimeWarning)


def core_available() -> bool:
    return pipeline is not None


def analyse(df, params, specs, group_col="_dataset", ref_group=None, spec_info=None):
    if pipeline is None:
        raise RuntimeError("分析核心（pic_analyzer/analysis、pic_analyzer/findings）未安裝：這是公開版外殼，"
                           "核心模組為私有，請向作者取得。") from _MISSING
    ctx = pipeline.compute(df, params, specs, group_col=group_col, ref_group=ref_group, spec_info=spec_info)
    return pipeline.export(ctx, build_findings(ctx))
