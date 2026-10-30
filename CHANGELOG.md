# CHANGELOG

## 1.3.0 — layered structure, public edition, English source
- The code is split into the layers `ingest / domain / stats / analysis / findings / report / app`. A layer only imports layers below it, and a test enforces this.
- The report template is split into `report/web/`: page.html, style.css, and one JS file per tab.
- New `tests/` (synthetic data, stats unit tests, architecture guard, template check) and `docs/`.
- Public edition: the analysis steps, findings rules, root-cause knowledge base, parameter physics notes and method page are a private core and are not in this repository.
- All public source text is English. Run-time translation uses `pic_analyzer/i18n.py` (Python) and `T()` (report); a locale file adds a language, and `--lang` / `PIC_LANG` select one.
- The output was compared before and after the restructuring on the same data: the analysis results and the rendered report are identical.

## 1.2.0
- Heater analysis update; a matching wafer-map metric in the report.

## 1.1.0
- Automatic TestSpec use, R² comparison between any two datasets, sweep data (IL vs wavelength, optical-power linearity).

## 1.0.0
- Multi-dataset loading and naming, anomaly and comparison analysis, interactive HTML + Excel.
