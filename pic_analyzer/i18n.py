"""Runtime message translation.

All user-facing text in the public source is English.  A locale file
``pic_analyzer/locale/<lang>.json`` maps each English message to its
translation and is loaded at run time::

    {"py":  {"Scanning folder {folder} …": "…{folder}…"},
     "web": {"Overview": "…"}}

* ``py``  — used by :func:`t` in Python; placeholders follow ``str.format`` (``{folder}``).
* ``web`` — injected into the HTML report and used by ``T()`` in the browser;
  placeholders are positional (``{0}``, ``{1}`` …).

A key that is missing from the table falls back to the English text, so a partial
locale never breaks anything.

Language selection, first match wins:
    1. :func:`set_language` (the ``--lang`` command-line option)
    2. environment variable ``PIC_LANG``
    3. ``zh_TW`` when ``locale/zh_TW.json`` exists
    4. ``en``
"""
from __future__ import annotations

import json
import os

LOCALE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "locale")
PREFERRED = ("zh_TW",)          # used automatically when the locale file is present
HTML_LANG = {"en": "en", "zh_TW": "zh-Hant"}

_forced: str | None = None
_cache: dict[str, dict] = {}


def available() -> list[str]:
    """Languages with a locale file on disk (English is always available)."""
    try:
        return sorted(f[:-5] for f in os.listdir(LOCALE_DIR) if f.endswith(".json"))
    except FileNotFoundError:
        return []


def set_language(lang: str | None) -> None:
    """Force a language for this process (``None`` restores automatic selection)."""
    global _forced
    _forced = lang


def language() -> str:
    if _forced:
        return _forced
    if os.environ.get("PIC_LANG"):
        return os.environ["PIC_LANG"]
    have = available()
    return next((lang for lang in PREFERRED if lang in have), "en")


def table(section: str, lang: str | None = None) -> dict:
    """The ``py`` or ``web`` message table of a language ({} for English or a missing file)."""
    lang = lang or language()
    if lang == "en":
        return {}
    if lang not in _cache:
        try:
            with open(os.path.join(LOCALE_DIR, lang + ".json"), encoding="utf-8") as fh:
                _cache[lang] = json.load(fh)
        except FileNotFoundError:
            _cache[lang] = {}
    return _cache[lang].get(section, {})


def t(msg: str, **kw) -> str:
    """Translate an English message; keyword arguments fill ``{name}`` placeholders."""
    s = table("py").get(msg, msg)
    return s.format(**kw) if kw else s


def html_lang() -> str:
    """Value for ``<html lang=…>``."""
    lang = language()
    return HTML_LANG.get(lang, lang.replace("_", "-"))
