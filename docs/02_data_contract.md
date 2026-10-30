# 02 資料規格：輸入、內部欄位、輸出

## 1. 資料夾裡的檔案怎麼被分類

`ingest/datasets.scan_folder` 會掃描 `.xlsx .xlsm .xls .csv .txt .xml`，然後依序判斷每個檔案：

| 判斷 | 函式 | 結果 |
|---|---|---|
| 檔名以 `~$`、`PIC_Report`、`PIC_Summary`、`spec_limits`、`pic_names` 開頭 | `scan_folder` | 略過 |
| 有 `SYMBOL / MIN / MAX` 標題列，或有名為 `SPEC` 的工作表 | `ingest.specs.is_program_spec` | 當作 **TestSpec** |
| 有波長軸欄位，或有 ≥ 10 個 1200–1700 的數字欄名 | `ingest.sweeps.detect` → spectrum | 當作 **IL 對波長掃描** |
| 有輸入功率欄位（Pin / P_set …） | `ingest.sweeps.detect` → power | 當作 **光功率線性度掃描** |
| 其他 | `ingest.datasets.load_file` | 當作 **測試資料**（一個檔案 = 一個資料群） |

## 2. 測試資料檔

- **標題列自動偵測**（`_detect_header`）：前 25 列中，文字儲存格 > 60 %、且下面 5 列以數字為主的那一列；分數 = 2 × 文字比例 + 下方數字比例，取最高。
- **檔內 spec 列**（`_split_spec_rows`）：標題列與第一筆資料之間，含 `LSL / USL / Min / Max / Unit / Target …` 標籤的列，讀成該檔的 spec（`SPEC_ROW_KEYS`）。
- **meta 與參數的區分**（`classify_columns`）：
  1. 欄名在 `KNOWN_META` → meta
  2. 檔案有明確 meta 區塊（例如 `… SOFT_DESC, RETEST, <參數>`）時：最後一個已知 meta 欄**之後**的數值欄 → 參數，之前的欄 → meta
  3. 否則：數值欄且欄名不符合 `META_PATTERN`（ID、LOT、WAFER、DATE、BIN、COORD …）→ 參數，其餘 → meta
  4. 全空的參數欄丟掉
- **XML**：支援兩種版面：每個 die 一個元素且量測值是子元素；或 `<Test name value lo hi unit>`（limit 一起讀）。
- **命名**（`auto_name`）：`WAFER_ID = "LOT123 01"` → `LOT123-W01`；同一片 wafer 的第二個檔 → `-R2`（視為 retest）。使用者改的名稱存在資料夾的 `pic_names.csv`。

### 參數命名規則（`domain/params.parse_param`）

| 欄名範例 | family | stage | ch | port |
|---|---|---|---|---|
| `1stPDIdark_CH4` | PDIdark | 1st | 4 | — |
| `IL_O24O17_CH3` | IL | — | 3 | O24（輸入）→ O17（輸出） |
| `Heater5` | Heater | — | 5 | — |
| `MZMIph_O21` | MZMIph | — | — | O21（CH1、CH5 的輸入端） |
| `MPD ratio_CH2` | MPDratio | — | 2 | — |

新的命名形式：在 `_PATTERNS` 加一條 regex，在 `FAMILY` 加一筆物理說明。

## 3. TestSpec

`ingest/specs.read_spec(path)` 回傳：

| key | 內容 |
|---|---|
| `rules` | `{參數名或 /regex/: {LSL, USL, UNIT}}`，由 `resolve_specs(params, rules)` 套用（regex 先、精確名稱後，所以精確名稱優先） |
| `conditions` | 測試條件（PD bias、compliance、對位功率、溫度） |
| `flow` | 光學測試步驟，第一個波長當作掃描指標的「測試波長」（預設 1310 nm） |
| `paths` | TXPATHn 的 IN / OUT port |

簡易 spec 表（`config/spec_limits_template.csv`）欄位：`Parameter, LSL, USL, Unit, Target`。

## 4. 掃描檔

| 版面 | 欄位 |
|---|---|
| A 長表（頻譜） | `[WAFER_ID] [PART_ID / DIE / X_COORD,Y_COORD] [CH] Wavelength(nm) IL(dB)` |
| A 長表（功率） | `[…ID…] Pin(mW 或 dBm) Pout(mW 或 dBm) / Iph(uA)` |
| B 寬表（頻譜） | 每列一個 die × 通道，欄名是波長（1290 … 1330） |

ID 欄位（`ID_COLS` 或非數值欄）組成每條曲線的名稱。`examples/make_demo_sweep.py` 會產生標示 DEMO 的範例檔。

## 5. 內部欄位（`analysis/prepare.py` 之後的 df）

| 欄位 | 意義 |
|---|---|
| `_dataset` | 資料群名稱 |
| `_file` `_row` | 來源檔名、檔內列序 |
| `_t` `_t_iso` | 測試開始時間（START_DATE / TIMESTAMP / DATE） |
| `_seq` | 資料群內的測試順序（有時間就依時間排序） |
| `_die` | PART_ID 結尾的 `數字-數字`（例如 `…-3-4` → `3-4`）；沒有 PART_ID 時用 `_seq` |
| `_x` `_y` | 原始晶圓座標（X_COORD / DIE_X / X） |
| `_gap_s` `_session` | 與前一顆的間隔；長時間中斷時 session + 1 |
| `_dupxy` | 同一資料群內座標重複 |
| `_mkey` | 跨資料群配對 die 的鍵：座標唯一時為 `x,y`，否則為 `_die` |
| `_r` | 正規化晶圓半徑 |

## 6. 輸出結果（HTML 內的 `const R`）

一個可序列化的 dict，主要 key：`groups ref params pinfo table anomalies dies trends structure corr derived spatial heater pair_corr integrity msa dsum findings data specs spec_info thresholds`。

每個 finding：`id severity category title summary evidence[] causes[{rank,h,why,confirm}] actions[] params[] chart`。產生這些內容的分析邏輯屬於私有核心。
