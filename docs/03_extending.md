# 03 怎麼擴充

> 標示 [私有] 的位置在私有核心內，公開版沒有這些檔案。

| 想做的事 | 改哪裡 | 步驟 |
|---|---|---|
| 調整門檻 | `pic_analyzer/config.py` | 改數字即可，所有步驟與規則共用 |
| 新的參數家族（例如 RingIph） | `domain/params.py` | 1. `_PATTERNS` 加命名 regex 2. [私有] `domain/families.py` 的 `FAMILY` 加 title / unit / direction / physics 3. 若為 log-normal，加到 `config.LOG_FAMILIES` |
| 新的 root-cause 假說 [私有] | `domain/root_causes.py` | `ROOT_CAUSES["新 key"] = [(假說, 為什麼, 怎麼驗證), …]`，依可能性排序 |
| 新的判斷規則 [私有] | `findings/` | 1. 複製一個 `rNN_*.py`，改檔名編號 2. 修改 docstring（觸發 / 嚴重度）和 `rule(ctx, add)` 3. 加到 `findings/__init__.py` 的 `RULES` 4. 更新私有文件 |
| 新的分析步驟 [私有] | `analysis/` | 1. 新檔案，一個純函式，輸入 df 和參數資訊，輸出 dict 2. 在 `pipeline.compute` 呼叫並放進 ctx 3. 要出現在報告上就放進 `pipeline.export` 4. 有新的統計方法就放 `stats/`，並寫單元測試 |
| 新的 TestSpec 格式 | `ingest/specs.py` | 寫 `is_xxx_spec` 和 `read_xxx_spec`，回傳與 `read_spec` 相同的 dict，再在 `read_spec` 分派 |
| 新的資料檔格式 | `ingest/datasets.py` | 在 `load_file` 依副檔名分派，回傳 raw 表（第一列為標題） |
| 報告新分頁 | `report/web/` | 1. `page.html` 加 `<section class="view" id="v-xxx">` 2. `js/core/60_router.js` 的 `VIEWS` 加一筆 3. 新增 `js/views/xxx.js`，寫 `RENDER.xxx = () => {…}` 4. 加到 `report/html.py` 的 `JS_FILES` |
| 新的圖 | `report/web/js/core/30_charts.js` 或 `50_charts_findings.js` | `chartXxx(el, …)` 內呼叫 `plot(el, traces, baseLayout({...}))`；要用在 finding 上，就在 `drawFindingChart` 加一個 `chart.type` |
| Excel 新工作表 | `report/excel.py` | 在 `write_excel` 用 `put(df, "名稱")` |

## 驗證
```
python -m pytest            # 單元測試、端到端（合成資料）、架構守門、模板完整性
python tests/synthetic.py demo_data && python PIC_Analyzer.py demo_data
```
`tests/test_architecture.py` 會擋下「下層 import 上層」，並檢查每條規則都已登錄、順序和檔名編號一致。
