# 02 Data contract: inputs, internal columns, output

## 1. How the files in a folder are classified

`ingest/datasets.scan_folder` scans `.xlsx .xlsm .xls .csv .txt .xml` and then classifies each file in this order:

| Test | Function | Result |
|---|---|---|
| file name starts with `~$`, `PIC_Report`, `PIC_Summary`, `spec_limits` or `pic_names` | `scan_folder` | skipped |
| has a `SYMBOL / MIN / MAX` header row, or a sheet named `SPEC` | `ingest.specs.is_program_spec` | **TestSpec** |
| has a wavelength-axis column, or ≥ 10 numeric column names in 1200–1700 | `ingest.sweeps.detect` → spectrum | **IL-vs-wavelength sweep** |
| has an input-power column (Pin / P_set …) | `ingest.sweeps.detect` → power | **optical-power linearity sweep** |
| anything else | `ingest.datasets.load_file` | **test data** (one file = one dataset) |

## 2. Test-data files

- **Header detection** (`_detect_header`): among the first 25 rows, a row qualifies if more than 60 % of its cells are text and the 5 rows below it are mostly numeric. Each candidate gets the score 2 × text share + numeric share below, and the highest score wins.
- **Spec rows inside the file** (`_split_spec_rows`): rows between the header and the first data row that carry a label like `LSL / USL / Min / Max / Unit / Target …` are read as that file's spec (`SPEC_ROW_KEYS`).
- **Meta vs parameter columns** (`classify_columns`):
  1. a column name in `KNOWN_META` → meta
  2. when the file has an explicit meta block (e.g. `… SOFT_DESC, RETEST, <parameters>`): numeric columns **after** the last known meta column → parameters, columns before it → meta
  3. otherwise: a numeric column whose name does not match `META_PATTERN` (ID, LOT, WAFER, DATE, BIN, COORD …) → parameter, everything else → meta
  4. parameter columns that are entirely empty are dropped
- **XML**: two layouts are supported. In the first, each die is one element and its measurements are child elements. In the second, measurements are `<Test name value lo hi unit>` elements, and their limits are read too.
- **Naming** (`auto_name`): `WAFER_ID = "LOT123 01"` → `LOT123-W01`. A second file of the same wafer becomes `-R2` and is treated as a retest. Names changed by the user are stored in `pic_names.csv` in the data folder.

### Parameter naming (`domain/params.parse_param`)

| Column name | family | stage | ch | port |
|---|---|---|---|---|
| `1stPDIdark_CH4` | PDIdark | 1st | 4 | — |
| `IL_O24O17_CH3` | IL | — | 3 | O24 (in) → O17 (out) |
| `Heater5` | Heater | — | 5 | — |
| `MZMIph_O21` | MZMIph | — | — | O21 |
| `MPD ratio_CH2` | MPDratio | — | 2 | — |

To support a new naming form, add a regex to `_PATTERNS` (and, in the private core, a family entry).

## 3. TestSpec

`ingest/specs.read_spec(path)` returns:

| key | contents |
|---|---|
| `rules` | `{parameter name or /regex/: {LSL, USL, UNIT}}`, applied by `resolve_specs(params, rules)`. Regex rules are applied first and exact names second, so an exact row wins. |
| `conditions` | test conditions (PD bias, compliance, alignment power, temperature) |
| `flow` | optical test steps; the first wavelength is the "test wavelength" for sweep metrics (default 1310 nm) |
| `paths` | IN / OUT ports of each TXPATHn |

A simple spec table (`config/spec_limits_template.csv`) has the columns `Parameter, LSL, USL, Unit, Target`.

## 4. Sweep files

| Layout | Columns |
|---|---|
| A, long table (spectrum) | `[WAFER_ID] [PART_ID / DIE / X_COORD,Y_COORD] [CH] Wavelength(nm) IL(dB)` |
| A, long table (power) | `[…ID…] Pin(mW or dBm) Pout(mW or dBm) / Iph(uA)` |
| B, wide table (spectrum) | one row per die × channel; column names are wavelengths (1290 … 1330) |

The ID columns (`ID_COLS`, or any non-numeric column) make up each curve's name. `examples/make_demo_sweep.py` writes example files marked DEMO.

## 5. Internal columns (df after preparation)

| Column | Meaning |
|---|---|
| `_dataset` | dataset name |
| `_file` `_row` | source file name, row order inside the file |
| `_t` `_t_iso` | test start time (START_DATE / TIMESTAMP / DATE) |
| `_seq` | test order inside the dataset (time order when time stamps exist) |
| `_die` | the trailing `number-number` of PART_ID (e.g. `…-3-4` → `3-4`); `_seq` when there is no PART_ID |
| `_x` `_y` | original wafer coordinates (X_COORD / DIE_X / X) |
| `_gap_s` `_session` | gap to the previous die; the session number increases at a long break |
| `_dupxy` | coordinate shared with another die in the same dataset |
| `_mkey` | key that matches a die across datasets: `x,y` when coordinates are unique, otherwise `_die` |
| `_r` | normalised wafer radius |

## 6. Output (`const R` inside the HTML)

The output is a JSON-serialisable dict. Its main keys are `groups ref params pinfo table anomalies dies trends structure corr derived spatial heater pair_corr integrity msa dsum findings data specs spec_info thresholds`.

Each finding has the fields `id severity category title summary evidence[] causes[{rank,h,why,confirm}] actions[] params[] chart`. The private core produces their content.
