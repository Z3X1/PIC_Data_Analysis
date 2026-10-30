"""tkinter 視窗：選資料夾 → 勾選 / 改名資料群 → 選比較基準 → 分析。"""
from __future__ import annotations

import os

from ..ingest import datasets, sweeps
from ..ingest import specs as specs_mod
from .runner import read_names, run, save_names


def gui():
    import threading
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk

    root = tk.Tk()
    root.title("PIC Analyzer")
    root.geometry("900x620")
    st = dict(folder="", spec="", files=[], names={})

    top = ttk.Frame(root, padding=10)
    top.pack(fill="x")
    folder_var, spec_var, ref_var = tk.StringVar(), tk.StringVar(), tk.StringVar()
    rec_var = tk.BooleanVar(value=False)
    ttk.Label(top, text="資料夾").grid(row=0, column=0, sticky="w")
    ttk.Entry(top, textvariable=folder_var, width=80).grid(row=0, column=1, sticky="we", padx=6)
    ttk.Button(top, text="瀏覽…", command=lambda: pick_folder()).grid(row=0, column=2)
    ttk.Label(top, text="TestSpec（可留空，自動找資料夾內的 spec）").grid(row=1, column=0, sticky="w")
    ttk.Entry(top, textvariable=spec_var, width=80).grid(row=1, column=1, sticky="we", padx=6)
    ttk.Button(top, text="瀏覽…", command=lambda: spec_var.set(filedialog.askopenfilename(filetypes=[("TestSpec / spec table", "*.xls *.xlsx *.csv")]) or spec_var.get())).grid(row=1, column=2)
    ttk.Checkbutton(top, text="包含子資料夾", variable=rec_var, command=lambda: rescan()).grid(row=2, column=1, sticky="w")
    top.columnconfigure(1, weight=1)

    mid = ttk.Frame(root, padding=(10, 0))
    mid.pack(fill="both", expand=True)
    ttk.Label(mid, text="資料群 — 點「Use」欄取消勾選、雙擊名稱改名；名稱記在 pic_names.csv。TestSpec 與掃描檔會自動辨識，不列在這裡。").pack(anchor="w")
    tv = ttk.Treeview(mid, columns=("use", "name", "file", "rows"), show="headings", height=14)
    for c, w in (("use", 50), ("name", 200), ("file", 480), ("rows", 70)):
        tv.heading(c, text=c.capitalize())
        tv.column(c, width=w, anchor="w")
    tv.pack(fill="both", expand=True, pady=4)
    refrow = ttk.Frame(mid)
    refrow.pack(fill="x")
    ttk.Label(refrow, text="比較基準").pack(side="left")
    ref_cb = ttk.Combobox(refrow, textvariable=ref_var, width=30, state="readonly")
    ref_cb.pack(side="left", padx=6)

    logbox = tk.Text(root, height=8, font=("Consolas", 9))
    logbox.pack(fill="x", padx=10, pady=4)
    bot = ttk.Frame(root, padding=10)
    bot.pack(fill="x")
    run_btn = ttk.Button(bot, text="分析 → 開啟報告", command=lambda: start())
    run_btn.pack(side="right")

    def log(msg):
        logbox.insert("end", msg + "\n")
        logbox.see("end")
        root.update_idletasks()

    def pick_folder():
        f = filedialog.askdirectory()
        if f:
            folder_var.set(f)
            rescan()

    def rescan():
        tv.delete(*tv.get_children())
        f = folder_var.get()
        if not os.path.isdir(f):
            return
        st["names"] = read_names(f)
        st["files"] = [p for p in datasets.scan_folder(f, rec_var.get())
                       if not (p.lower().endswith((".xls", ".xlsx", ".csv")) and specs_mod.is_program_spec(p)) and not sweeps.detect(p)[0]]
        names = []
        for p in st["files"]:
            try:
                d = datasets.load_file(p)
                nm = st["names"].get(os.path.basename(p), d.name)
                rows = len(d.df)
            except Exception as e:  # noqa: BLE001
                nm, rows = "(unreadable)", str(e)[:30]
            tv.insert("", "end", iid=p, values=("✔", nm, os.path.relpath(p, f), rows))
            names.append(nm)
        ref_cb["values"] = names
        if names:
            ref_var.set(names[0])
        log(f"{len(st['files'])} 個資料檔：{f}")

    def toggle(event):
        iid = tv.identify_row(event.y)
        col = tv.identify_column(event.x)
        if not iid:
            return
        v = list(tv.item(iid, "values"))
        if col == "#1":
            v[0] = "" if v[0] else "✔"
            tv.item(iid, values=v)

    def rename(event):
        iid = tv.identify_row(event.y)
        if not iid or tv.identify_column(event.x) != "#2":
            return
        x, y, w, h = tv.bbox(iid, "#2")
        e = ttk.Entry(tv)
        e.place(x=x, y=y, width=w, height=h)
        e.insert(0, tv.item(iid, "values")[1])
        e.focus()

        def done(_=None):
            v = list(tv.item(iid, "values"))
            v[1] = e.get().strip() or v[1]
            tv.item(iid, values=v)
            e.destroy()
        e.bind("<Return>", done)
        e.bind("<FocusOut>", done)

    tv.bind("<Button-1>", toggle)
    tv.bind("<Double-1>", rename)

    def start():
        f = folder_var.get()
        if not os.path.isdir(f):
            messagebox.showerror("PIC Analyzer", "請先選擇資料夾。")
            return
        files, names = [], {}
        for iid in tv.get_children():
            v = tv.item(iid, "values")
            if v[0]:
                files.append(iid)
                names[os.path.basename(iid)] = v[1]
        if not files:
            messagebox.showerror("PIC Analyzer", "沒有勾選任何資料群。")
            return
        save_names(f, names)
        run_btn.state(["disabled"])

        def work():
            try:
                ref = ref_var.get() or None
                run(f, files=files, names=names, spec=spec_var.get() or None, ref=ref, recursive=rec_var.get(), log=log)
            except SystemExit as e:
                log(str(e))
            except Exception as e:  # noqa: BLE001
                log(f"ERROR: {e}")
            finally:
                run_btn.state(["!disabled"])
        threading.Thread(target=work, daemon=True).start()

    root.mainloop()
