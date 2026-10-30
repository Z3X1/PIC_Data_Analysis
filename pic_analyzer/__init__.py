"""PIC Analyzer — 矽光子 KGD 多資料群比對分析。

分層（上層只呼叫下層）：
    app        視窗 / 命令列 / 一次完整分析的流程（runner.run）
    report     HTML（web/ 前端原始碼）與 Excel 輸出
    findings   規則 → 結論、證據、root-cause 假說（每條規則一個檔案）
    analysis   分析步驟（pipeline.compute 依序呼叫）
    stats      純數值統計（robust z、Cpk、FDR、Nelson、ICC）
    domain     矽光子領域知識（參數命名、物理、root-cause 庫、單位）
    ingest     讀檔（測試資料、TestSpec、掃描曲線）
    config     判定門檻
"""
__version__ = "1.3.0"
