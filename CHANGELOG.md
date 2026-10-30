# CHANGELOG

## 1.3.0 — 分層重構、公開版
- 拆成 `ingest / domain / stats / analysis / findings / report / app` 分層，上層只 import 下層，並由測試守門。
- 報告模板拆成 `report/web/`（page.html、style.css、每個分頁一個 JS 檔）。
- 新增 `tests/`（合成資料、統計單元、架構守門、模板完整性）與 `docs/`。
- 公開版：分析步驟、findings 規則、root-cause 知識庫、參數物理說明、方法說明頁改為私有核心，不在公開 repo。
- 重構前後以同一份資料比對，分析結果與報告輸出相同。

## 1.2.0
- Heater 相關分析更新；報告新增對應的 wafer map 指標。

## 1.1.0
- TestSpec 自動套用、任兩資料群 R² 對比、掃描資料（IL 對波長、光功率線性度）、繁體中文報告。

## 1.0.0
- 多資料群載入與自動命名、異常與比較分析、互動 HTML + Excel。
