@echo off
cd /d "%~dp0"
python PIC_Analyzer.py %*
if errorlevel 1 pause
