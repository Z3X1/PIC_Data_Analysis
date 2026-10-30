# PIC Data Analysis — multi-dataset analysis for silicon-photonics KGD test data

Point it at a folder of KGD test data (Excel / CSV / XML), a TestSpec and optional sweep files. It writes **one interactive HTML report and one Excel summary**. Each file becomes a dataset with an automatically generated name. The report covers:

- **Conclusions first**: findings ranked by severity. Each one comes with numeric evidence, a chart, root-cause hypotheses ranked by likelihood, and how to confirm them.
- **Comparison**: wafer-to-wafer, lot-to-lot and session-to-session; an R² check of the same test item between any two datasets.
- **Capability and limits**: the TestSpec is applied automatically; Cpk / Ppk and worst reading to limit.
- **Structure, space and process**: die-to-die and channel-to-channel variation, wafer maps, test-order trends.
- **Data integrity**: coordinates, test conditions, recorded resolution, GR&R.

> **Public edition.** This repository is the framework and shell: file reading, generic statistics, report, application. **The analysis steps, the findings rules, the silicon-photonics root-cause knowledge base and the parameter physics notes are a private core and are not in this repository.** Without the core the program reports that the core is not installed, and the tests that need it are skipped.

## Quick start

```bash
pip install -r requirements.txt
python PIC_Analyzer.py                      # window: choose folder → tick / rename → analyse
python PIC_Analyzer.py D:\data\LOT001       # command line
python PIC_Analyzer.py D:\data\LOT001 --lang en
python PIC_Analyzer.py --help
```

Output goes to `<folder>/PIC_Report/`: `PIC_Report_*.html` (works offline) and `PIC_Summary_*.xlsx`.

To try it without real data, use the synthetic generator:

```bash
python tests/synthetic.py demo_data && python PIC_Analyzer.py demo_data
```

## Architecture at a glance

```
          app ─────────── window / command line / runner.run (one complete run)
           │
   ┌───────┴────────┐
 engine           report ─ HTML (front-end sources in web/) and Excel
   │
 findings ────── rules → conclusions + root causes   [private]
   │
 analysis ────── analysis steps                       [private]
   │
 stats  ingest ─ pure numeric statistics / file reading
   │
 domain  config  i18n ─ parameter naming and units / thresholds / message translation
```

A layer may only import layers below it; `tests/test_architecture.py` enforces this. See [docs/01_architecture.md](docs/01_architecture.md).

## Reading order for the code

1. `pic_analyzer/app/runner.py` — every step of `run()` maps to one layer; start here for the overall flow.
2. `pic_analyzer/engine.py` — the analysis entry point (compute → findings → export).
3. `pic_analyzer/ingest/` — how data is read and named.
4. `pic_analyzer/report/` — how the result becomes HTML / Excel.
5. `pic_analyzer/config.py` — every threshold.
6. `pic_analyzer/i18n.py` — how messages are translated.

## Repository map

```
PIC_Analyzer.py              launcher (double-click = window; pass a folder = command line)
Run_PIC_Analyzer.bat         Windows double-click launcher
requirements.txt             pandas numpy scipy openpyxl xlsxwriter xlrd
assets/plotly.min.js         inlined into the HTML so reports work offline
config/spec_limits_template.csv   template for a simple spec table (/regex/ rows allowed)
examples/make_demo_sweep.py  writes sweep example files marked DEMO
docs/                        architecture, data contract, extension guide
tests/                       synthetic data, stats unit tests, architecture guard, template check

pic_analyzer/
├── __init__.py              version and layer overview
├── config.py                thresholds (Z_FLAG, Z_WATCH, ALPHA_Q, D_EFFECT, LOG_FAMILIES)
├── jsonsafe.py              numpy / pandas → JSON-safe values (jnum, to_jsonable)
├── i18n.py                  t() for Python messages; language selection; locale loading
├── engine.py                analysis entry: compute → build_findings → export (calls the private core)
│
├── ingest/                  ── layer 1: reading (no statistical judgement)
│   ├── datasets.py          folder scan, Excel / CSV / XML parsing, header detection, meta / parameter split, naming, merge
│   ├── specs.py             TestSpec (SPEC / FLOW sheets, TXPATH mapping), simple spec tables, resolve_specs
│   └── sweeps.py            sweep-file detection and reading (long / wide spectra, power) → raw curves
│
├── domain/                  ── layer 0: domain
│   ├── params.py            parameter-name parsing (family / stage / CH / port)
│   ├── units.py             dBm ↔ mW
│   └── (families.py, root_causes.py)   [private] parameter physics notes, root-cause library
│
├── locale/                  message tables per language (README here; the .json tables are private)
│
├── stats/                   ── layer 1: pure numeric statistics (arrays only)
│   ├── robust.py            robust σ (MAD), robust z, resolution, log-normal test
│   ├── capability.py        describe (yield, Ppk, worst-reading margin), Cpk (short-term I-MR σ)
│   ├── hypothesis.py        Benjamini-Hochberg FDR, Cohen d
│   ├── spc.py               Nelson rules R1 / R2 / R3
│   └── variance.py          ICC (share of variance between dies)
│
├── analysis/                ── layer 2: analysis steps               [private core, not in this repository]
├── findings/                ── layer 3: rules → conclusions + causes  [private core, not in this repository]
│
├── report/                  ── layer 4: output
│   ├── html.py              joins web/ sources + result JSON + message table + plotly → one HTML file
│   ├── excel.py             Excel summary (Findings, Wafer_Summary, Param_Summary, R2_*, Anomalies …)
│   ├── sweep_payload.py     sweep-curve down-sampling
│   └── web/
│       ├── page.html        page frame and tab containers
│       ├── style.css        light / dark theme tokens and layout
│       └── js/
│           ├── core/10_basics.js          data access, formatting, T() translation, front-end robust z
│           ├── core/20_plotly.js          shared layout, plot(), spec lines
│           ├── core/30_charts.js          box / CDF / trend / channel / leak / scatter / wafer map / heat map
│           ├── core/40_tables.js          tables, copy as TSV
│           ├── core/50_charts_findings.js [private] finding-specific charts
│           ├── core/60_router.js          tab list, routing
│           ├── core/90_boot.js            start-up
│           └── views/*.js                 one file per tab (paircorr.js and method.js are private)
│
└── app/                     ── layer 5: application
    ├── runner.py            run(): files → spec → sweeps → analysis → HTML + Excel
    ├── gui.py               tkinter window
    └── cli.py               command-line options (including --lang)
```

## Language

Every user-facing string in the source is English. A locale file `pic_analyzer/locale/<lang>.json`, if present, translates the Python messages and the report UI at run time. The language is picked in this order: `--lang` option, then `PIC_LANG` environment variable, then `zh_TW` when its locale file exists, then English. Locale files are not part of this repository. See [pic_analyzer/locale/README.md](pic_analyzer/locale/README.md).

## Documents

| Document | Contents |
|---|---|
| [01 Architecture](docs/01_architecture.md) | layers, dependency rules, data-flow diagram, intermediate data |
| [02 Data contract](docs/02_data_contract.md) | file classification, header and column detection, parameter naming, TestSpec, sweep formats, internal columns, output JSON |
| [03 Extending](docs/03_extending.md) | adding parameter families, rules, analysis steps, report tabs, languages |
| [CHANGELOG](CHANGELOG.md) | version history |

## Tests

```bash
python -m pytest      # stats unit tests, architecture guard, template check; end-to-end tests need the private core
```

The repository holds **no real measurement data and no customer TestSpec**, and `.gitignore` blocks `*.xls*`. All tests use synthetic data from `tests/synthetic.py`.
