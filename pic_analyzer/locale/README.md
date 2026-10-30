# Locale files

All user-facing text in the source code is English. A locale file `<lang>.json` in this folder translates it at run time:

```json
{
  "py":  { "Scanning folder {folder} …": "…{folder}…" },
  "web": { "Overview": "…", "{0} datasets": "…{0}…" }
}
```

- `py`: messages printed by the Python code (`pic_analyzer.i18n.t`). Placeholders use `str.format`, for example `{folder}`.
- `web`: text in the HTML report (`T()` in `report/web/js/core/10_basics.js`). Placeholders are positional: `{0}`, `{1}` …
- A key that is not in the table is shown in English.

The language is chosen in this order:
1. the `--lang` command-line option
2. the `PIC_LANG` environment variable
3. `zh_TW` when `zh_TW.json` exists
4. `en`

Locale files are not part of this repository.
