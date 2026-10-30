"""Analysis entry point: the whole analysis is three steps.

    ctx      = analysis.pipeline.compute(...)   # statistics, comparison, structure, spatial, MSA …
    findings = findings.build_findings(ctx)     # rules → conclusions + root-cause hypotheses
    result   = analysis.pipeline.export(ctx, findings)

`result` is a JSON-serialisable dict handed to report.html / report.excel.
analysis/ and findings/ are the private core and are not part of the public repository.
"""
from __future__ import annotations

import warnings

from .i18n import t

try:  # private core
    from .analysis import pipeline
    from .findings import build_findings
except ImportError as _e:  # public build
    pipeline = build_findings = None
    _MISSING = _e

warnings.filterwarnings("ignore", category=RuntimeWarning)


def core_available() -> bool:
    """True when the private analysis core is installed."""
    return pipeline is not None


def analyse(df, params, specs, group_col="_dataset", ref_group=None, spec_info=None):
    if pipeline is None:
        raise RuntimeError(t("The analysis core (pic_analyzer/analysis, pic_analyzer/findings) is not installed: "
                             "this is the public shell; the core modules are private — ask the author.")) from _MISSING
    ctx = pipeline.compute(df, params, specs, group_col=group_col, ref_group=ref_group, spec_info=spec_info)
    return pipeline.export(ctx, build_findings(ctx))
