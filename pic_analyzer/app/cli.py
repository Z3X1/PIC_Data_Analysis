"""PIC Analyzer — pick a folder, compare every Excel/CSV/XML test file in it.

Double-click (or `python PIC_Analyzer.py`) → window: choose folder, check/rename datasets,
optional spec file, Analyze → interactive HTML report + Excel summary, opened in the browser.

Command line:
  python PIC_Analyzer.py D:\\data\\lotA                      # analyse folder, open report
  python PIC_Analyzer.py D:\\data\\lotA --spec spec_limits.csv --out D:\\reports
  python PIC_Analyzer.py D:\\data\\lotA --names names.csv     # csv: file,name
  python PIC_Analyzer.py D:\\data\\lotA --ref WAFERLOT-W01 --recursive --no-open
  python PIC_Analyzer.py D:\\data\\lotA --lang en             # force English output
"""
from __future__ import annotations

import argparse

from ..i18n import available, set_language
from .gui import gui
from .runner import read_names, run


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder", nargs="?")
    ap.add_argument("--spec", help="spec_limits.csv / .xlsx (Parameter, LSL, USL, Unit, Target)")
    ap.add_argument("--names", help="csv file,name to rename datasets")
    ap.add_argument("--out", help="output folder (default <folder>/PIC_Report)")
    ap.add_argument("--ref", help="reference dataset name (default: first)")
    ap.add_argument("--recursive", action="store_true")
    ap.add_argument("--no-open", action="store_true")
    ap.add_argument("--lang", choices=["en"] + available(),
                    help="report / message language (default: zh_TW when its locale file exists, else en)")
    a = ap.parse_args()
    if a.lang:
        set_language(a.lang)
    if not a.folder:
        try:
            gui()
            return
        except ImportError:
            ap.error("tkinter not available — pass the folder on the command line")
    names = read_names(a.folder, a.names)
    run(a.folder, names=names, spec=a.spec, out=a.out, ref=a.ref, recursive=a.recursive, open_browser=not a.no_open)
