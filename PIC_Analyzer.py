#!/usr/bin/env python3
"""PIC Analyzer launcher. Double-click or run `python PIC_Analyzer.py` for the window; pass a folder for command-line mode.
Options: python PIC_Analyzer.py --help
"""
import os
import sys
import warnings

warnings.filterwarnings("ignore", category=Warning, module="pandas")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pic_analyzer.app.cli import main  # noqa: E402

if __name__ == "__main__":
    main()
