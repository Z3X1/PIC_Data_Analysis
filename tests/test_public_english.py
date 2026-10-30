"""Language guard.

1. Every public file (anything not excluded by .gitignore) is English: no CJK characters.
2. When a locale file exists, every message key used in the code has a translation, and the
   table has no keys that the code no longer uses.
"""
import ast
import fnmatch
import json
import pathlib
import re

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
PKG = ROOT / "pic_analyzer"
CJK = re.compile("[" + "".join(f"{chr(a)}-{chr(b)}" for a, b in ((0x3000, 0x303F), (0x3400, 0x4DBF), (0x4E00, 0x9FFF), (0xF900, 0xFAFF), (0xFF00, 0xFFEF))) + "]")
TEXT_SUFFIXES = {".py", ".js", ".html", ".css", ".md", ".txt", ".csv", ".bat", ".ini", ".cfg", ".toml", ".json", ""}
ALWAYS_SKIP = ("assets/", ".git/", ".pytest_cache/")


def ignore_patterns():
    pats = []
    for line in (ROOT / ".gitignore").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            pats.append(line)
    return pats


def ignored(rel: str, pats) -> bool:
    name = rel.rsplit("/", 1)[-1]
    for p in pats:
        if p.endswith("/"):
            d = p.rstrip("/")
            if "/" in d:
                if rel.startswith(d + "/"):
                    return True
            elif f"/{d}/" in f"/{rel}" or rel.startswith(d + "/"):
                return True
        elif "/" in p:
            if fnmatch.fnmatch(rel, p):
                return True
        elif fnmatch.fnmatch(name, p):
            return True
    return False


def public_files():
    pats = ignore_patterns()
    for p in sorted(ROOT.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith(ALWAYS_SKIP) or "__pycache__" in rel or p.suffix not in TEXT_SUFFIXES:
            continue
        if not ignored(rel, pats):
            yield rel


PUBLIC = list(public_files())


@pytest.mark.parametrize("rel", PUBLIC)
def test_public_file_is_english(rel):
    text = (ROOT / rel).read_text(encoding="utf-8")
    bad = [(i, line.strip()[:80]) for i, line in enumerate(text.splitlines(), 1) if CJK.search(line)]
    assert not bad, f"{rel} contains CJK text: {bad[:3]}"


# ---------------------------------------------------------------- locale coverage
JS_CALL = re.compile(r'(?<![\w.])T\(\s*"((?:[^"\\]|\\.)*)"')


def js_keys():
    keys = set()
    sources = [p for p in (PKG / "report" / "web" / "js").rglob("*.js")] + [PKG / "report" / "html.py"]
    for p in sources:
        for m in JS_CALL.finditer(p.read_text(encoding="utf-8")):
            keys.add(json.loads('"' + m.group(1) + '"'))
    return keys


def py_keys():
    keys = set()
    for p in PKG.rglob("*.py"):
        for node in ast.walk(ast.parse(p.read_text(encoding="utf-8"))):
            if isinstance(node, ast.Call) and node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                f = node.func
                name = f.id if isinstance(f, ast.Name) else f.attr if isinstance(f, ast.Attribute) else None
                if name == "t":
                    keys.add(node.args[0].value)
    return keys


LOCALES = sorted((PKG / "locale").glob("*.json"))


def test_some_keys_found():
    assert len(js_keys()) > 100 and len(py_keys()) > 20


@pytest.mark.parametrize("path", LOCALES, ids=lambda p: p.stem)
def test_locale_covers_every_key(path):
    table = json.loads(path.read_text(encoding="utf-8"))
    for section, used in (("web", js_keys()), ("py", py_keys())):
        missing = sorted(used - set(table.get(section, {})))
        assert not missing, f"{path.name} [{section}] missing {len(missing)}: {missing[:5]}"


@pytest.mark.parametrize("path", LOCALES, ids=lambda p: p.stem)
def test_locale_has_no_stale_keys(path):
    table = json.loads(path.read_text(encoding="utf-8"))
    for section, used in (("web", js_keys()), ("py", py_keys())):
        stale = sorted(set(table.get(section, {})) - used)
        assert not stale, f"{path.name} [{section}] has unused keys: {stale[:5]}"


@pytest.mark.parametrize("path", LOCALES, ids=lambda p: p.stem)
def test_locale_placeholders_match(path):
    table = json.loads(path.read_text(encoding="utf-8"))
    for section, rx in (("web", r"\{\d+\}"), ("py", r"\{(\w+)[^}]*\}")):
        for en, tr in table.get(section, {}).items():
            if en == "Curves flagged by the analysis core.":   # the translation intentionally carries more detail
                continue
            assert sorted(set(re.findall(rx, en))) == sorted(set(re.findall(rx, tr))), (section, en, tr)
