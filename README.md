# PIC Data Analysis — 矽光子 KGD 多資料群比對分析

把一個資料夾內的 KGD 測試資料（Excel / CSV / XML）、TestSpec 與掃描檔丟進去，就會輸出**一份互動 HTML 報告和一份 Excel 摘要**。每個檔案是一個資料群，名稱自動產生。報告內容如下：

- **結論先行**：嚴重度排序的 findings，每項附數字證據、圖、依可能性排序的 root-cause 假說與驗證方法。
- **比較**：wafer-to-wafer、lot-to-lot、session-to-session；任兩個資料群同一個 test item 的 R² 檢查。
- **能力與規格**：TestSpec 自動套用，Cpk / Ppk、最差讀值距 limit。
- **結構、空間、流程**：die 間與通道間變異、wafer map、測試順序趨勢。
- **資料完整性**：座標、測試條件、記錄解析度、GR&R。

> **公開版說明**：本 repo 是框架與外殼（讀檔、通用統計、報告、App）。**分析步驟、findings 規則、矽光子 root-cause 知識庫與參數物理說明屬於私有核心，不在此 repo**。沒有核心時程式會提示核心未安裝；測試中需要核心的項目會自動略過。

## 快速開始

```bash
pip install -r requirements.txt
python PIC_Analyzer.py                      # 視窗模式：選資料夾 → 勾選 / 改名 → 分析
python PIC_Analyzer.py D:\data\LOT001       # 命令列模式
python PIC_Analyzer.py --help
```

輸出在 `<資料夾>/PIC_Report/`：`PIC_Report_*.html`（離線可用）與 `PIC_Summary_*.xlsx`。

沒有真實資料時，可以先用合成資料試跑：

```bash
python tests/synthetic.py demo_data && python PIC_Analyzer.py demo_data
```

## 架構：一張圖

```
          app ─────────── 視窗 / 命令列 / runner.run（一次完整分析）
           │
   ┌───────┴────────┐
 engine           report ─ HTML（web/ 前端原始碼）與 Excel
   │
 findings ────── 規則 → 結論 + root-cause        [私有]
   │
 analysis ────── 分析步驟                        [私有]
   │
 stats  ingest ─ 純數值統計 ／ 讀檔
   │
 domain  config ─ 參數命名、單位 ／ 判定門檻
```

上層只能 import 下層，`tests/test_architecture.py` 會自動檢查。analysis 與 findings 為私有核心。詳細見 [docs/01_architecture.md](docs/01_architecture.md)。

## 讀程式碼的順序

1. `pic_analyzer/app/runner.py` — `run()` 一行對應一層，看整體流程
2. `pic_analyzer/engine.py` — 分析入口（compute → findings → export）
3. `pic_analyzer/ingest/` — 資料怎麼被讀進來、怎麼命名
4. `pic_analyzer/report/` — 結果怎麼變成 HTML / Excel
5. `pic_analyzer/config.py` — 所有門檻

## Repo 地圖

```
PIC_Analyzer.py              啟動檔（雙擊 = 視窗；給路徑 = 命令列）
Run_PIC_Analyzer.bat         Windows 雙擊啟動
requirements.txt             pandas numpy scipy openpyxl xlsxwriter xlrd
assets/plotly.min.js         離線報告用（內嵌進 HTML）
config/spec_limits_template.csv   簡易 spec 表範本（支援 /regex/ 列）
examples/make_demo_sweep.py  產生標示 DEMO 的掃描範例檔
docs/                        架構、資料規格、分析方法、規則表、擴充指南
tests/                       合成資料、端到端、統計單元、架構守門、模板完整性

pic_analyzer/
├── __init__.py              版本、分層說明
├── config.py                判定門檻（Z_FLAG、Z_WATCH、ALPHA_Q、D_EFFECT、LOG_FAMILIES）
├── jsonsafe.py              numpy / pandas → JSON 安全數值（jnum、to_jsonable）
├── engine.py                分析入口：compute → build_findings → export（呼叫私有核心）
│
├── ingest/                  ── 第 1 層：讀取（不做統計判斷）
│   ├── datasets.py          資料夾掃描、Excel / CSV / XML 解析、標題列偵測、meta / 參數分類、自動命名、合併
│   ├── specs.py             TestSpec（SPEC / FLOW 工作表、TXPATH 對應）、簡易 spec 表、resolve_specs
│   └── sweeps.py            掃描檔偵測與讀取（頻譜長表 / 寬表、功率）→ 原始曲線
│
├── domain/                  ── 第 0 層：領域知識
│   ├── params.py            參數命名解析（family / stage / CH / port）
│   ├── units.py             dBm ↔ mW
│   └── (families.py, root_causes.py)   [私有] 參數物理說明、root-cause 假說庫
│
├── stats/                   ── 第 1 層：純數值統計（只吃陣列）
│   ├── robust.py            robust σ（MAD）、robust z、解析度、log-normal 判定
│   ├── capability.py        describe（yield、Ppk、最差讀值餘裕）、Cpk（I-MR 短期 σ）
│   ├── hypothesis.py        Benjamini-Hochberg FDR、Cohen d
│   ├── spc.py               Nelson 規則 R1 / R2 / R3
│   └── variance.py          ICC（die 間變異比例）
│
├── analysis/                ── 第 2 層：分析步驟                [私有核心，不在公開 repo]
├── findings/                ── 第 3 層：規則 → 結論 + root-cause  [私有核心，不在公開 repo]
│
├── report/                  ── 第 4 層：輸出
│   ├── html.py              組合 web/ 原始碼 + 結果 JSON + plotly → 單一 HTML
│   ├── excel.py             Excel 摘要（Findings、Wafer_Summary、Param_Summary、R2_*、Anomalies …）
│   ├── sweep_payload.py     掃描曲線降取樣
│   └── web/
│       ├── page.html        外框與分頁容器
│       ├── style.css        亮 / 暗主題 token 與版面
│       └── js/
│           ├── core/10_basics.js          資料存取、格式化、前端 robust z
│           ├── core/20_plotly.js          共用 layout、plot()、spec 線
│           ├── core/30_charts.js          box / CDF / trend / channel / leak / scatter / wafer map / 熱圖
│           ├── core/40_tables.js          表格、複製 TSV
│           ├── core/50_charts_findings.js [私有] finding 專用圖
│           ├── core/60_router.js          分頁清單、路由
│           ├── core/90_boot.js            啟動
│           └── views/*.js                 每個分頁一個檔（paircorr.js、method.js 為私有）
│
└── app/                     ── 第 5 層：應用
    ├── runner.py            run()：讀檔 → spec → 掃描 → 分析 → HTML + Excel
    ├── gui.py               tkinter 視窗
    └── cli.py               命令列參數
```

## 文件

| 文件 | 內容 |
|---|---|
| [01 架構](docs/01_architecture.md) | 分層、相依規則、資料流圖、中間資料 |
| [02 資料規格](docs/02_data_contract.md) | 檔案分類、標題與欄位判斷、參數命名、TestSpec、掃描格式、內部欄位、輸出 JSON |
| [03 擴充指南](docs/03_extending.md) | 加參數家族、規則、分析步驟、報告分頁 |
| [CHANGELOG](CHANGELOG.md) | 版本紀錄 |

## 測試

```bash
python -m pytest      # 統計單元、架構守門、模板完整性；端到端測試需要私有核心
```

Repo 內**不含任何真實量測資料或客戶 TestSpec**，`.gitignore` 也會擋下 `*.xls*`。測試全部使用 `tests/synthetic.py` 產生的合成資料。
