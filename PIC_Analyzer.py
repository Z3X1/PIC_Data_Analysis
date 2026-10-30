#!/usr/bin/env python3
"""PIC Analyzer 啟動檔。雙擊或 `python PIC_Analyzer.py` 開視窗；加資料夾路徑則用命令列模式。
參數說明：python PIC_Analyzer.py --help
"""
import os
import sys
import warnings

warnings.filterwarnings("ignore", category=Warning, module="pandas")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pic_analyzer.app.cli import main  # noqa: E402

if __name__ == "__main__":
    main()
