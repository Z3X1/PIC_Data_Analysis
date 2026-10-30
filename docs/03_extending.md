# 03 Extending

> Entries marked [private] live in the private core; the public edition does not contain those files.

| Goal | Where | Steps |
|---|---|---|
| Tune a threshold | `pic_analyzer/config.py` | Change the number. Every step and rule reads it from there. |
| New parameter family (e.g. RingIph) | `domain/params.py` | 1. Add a naming regex to `_PATTERNS`. 2. [private] Add title / unit / direction / physics to `FAMILY` in `domain/families.py`. 3. If it is log-normal, add it to `config.LOG_FAMILIES`. |
| New root-cause hypothesis [private] | `domain/root_causes.py` | `ROOT_CAUSES["new key"] = [(hypothesis, why, how to confirm), …]`, most likely first. |
| New judgement rule [private] | `findings/` | 1. Copy an `rNN_*.py` and renumber it. 2. Edit its docstring (trigger / severity) and `rule(ctx, add)`. 3. Add it to `RULES` in `findings/__init__.py`. 4. Update the private documents. |
| New analysis step [private] | `analysis/` | 1. Write a new file with one pure function: df and parameter info in, dict out. 2. Call it in `pipeline.compute` and put the result into ctx. 3. To show it in the report, add it to `pipeline.export`. 4. Put any new statistical method in `stats/`, with a unit test. |
| New TestSpec format | `ingest/specs.py` | Write `is_xxx_spec` and `read_xxx_spec` returning the same dict as `read_spec`, then dispatch to them from `read_spec`. |
| New data-file format | `ingest/datasets.py` | Dispatch on the extension in `load_file` and return a raw table whose first row is the header. |
| New report tab | `report/web/` | 1. Add `<section class="view" id="v-xxx">` to `page.html`. 2. Add an entry to `VIEWS` in `js/core/60_router.js`. 3. Create `js/views/xxx.js` with `RENDER.xxx = () => {…}`. 4. Add it to `JS_FILES` in `report/html.py`. |
| New chart | `report/web/js/core/30_charts.js` | `chartXxx(el, …)` calls `plot(el, traces, baseLayout({...}))`. To use it from a finding, add a `chart.type` to `drawFindingChart`. |
| New Excel sheet | `report/excel.py` | Call `put(df, "Name")` inside `write_excel`. |
| New UI text | any public file | Write the English text and wrap it: `t("…")` in Python, `T("…")` in JS. Use `{name}` placeholders in Python and `{0}` in JS. |
| New language | `pic_analyzer/locale/` | Add `<lang>.json` with `py` and `web` tables (see `locale/README.md`), then run with `--lang <lang>`. |

## Checks
```
python -m pytest            # stats unit tests, architecture guard, template check (+ end-to-end with the private core)
python tests/synthetic.py demo_data && python PIC_Analyzer.py demo_data --lang en
```
`tests/test_architecture.py` rejects upward imports. `tests/test_public_english.py` checks two things:
1. Public files contain no CJK text.
2. When a locale file exists, every key used in the code has a translation.
