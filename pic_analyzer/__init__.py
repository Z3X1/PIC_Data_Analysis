"""PIC Analyzer — multi-dataset analysis for silicon-photonics KGD test data.

Layers (a layer only imports from layers below it):
    app        window / command line / one complete run (runner.run)
    report     HTML (front-end sources in web/) and Excel output
    findings   [private] rules → conclusions, evidence, root-cause hypotheses
    analysis   [private] analysis steps (called in order by pipeline.compute)
    stats      pure numeric statistics (robust z, Cpk, FDR, Nelson, ICC)
    domain     parameter naming and units (physics notes and root-cause library are private)
    ingest     file reading (test data, TestSpec, sweep curves)
    config     decision thresholds
    i18n       message translation (English source, optional private locale files)
"""
__version__ = "1.3.0"
