"""Architecture guard: a layer may import lower layers, never higher ones. Blocks upward dependencies when modules are added."""
import ast
import pathlib

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1] / "pic_analyzer"

# higher number = higher layer
LAYER = {
    "config": 0, "jsonsafe": 0, "i18n": 0, "domain": 0, "__init__": 0,
    "ingest": 1, "stats": 1,
    "analysis": 2,
    "findings": 3,
    "engine": 4, "report": 4,
    "app": 5,
}


def layer_of(parts):
    return LAYER[parts[0].removesuffix(".py")]


def imports(path):
    """Yield the first package component of every relative / pic_analyzer import in a file."""
    rel = path.relative_to(ROOT).parts
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            if node.level:  # relative
                base = list(rel[:-1])[: len(rel) - node.level] if node.level > 1 else list(rel[:-1])
                mod = base + (node.module.split(".") if node.module else [])
                if not mod:  # "from .. import __version__"
                    mod = ["__init__"]
                yield mod[0], node.lineno
            elif node.module and node.module.startswith("pic_analyzer"):
                yield (node.module.split(".")[1:] or ["__init__"])[0], node.lineno


FILES = sorted(p for p in ROOT.rglob("*.py"))


@pytest.mark.parametrize("path", FILES, ids=lambda p: str(p.relative_to(ROOT)))
def test_no_upward_import(path):
    here = layer_of(path.relative_to(ROOT).parts)
    for target, line in imports(path):
        assert LAYER[target] <= here, f"{path.relative_to(ROOT)}:{line} imports higher layer '{target}'"


def test_every_package_is_mapped():
    top = {p.name.removesuffix(".py") for p in ROOT.iterdir() if p.suffix == ".py" or (p.is_dir() and (p / "__init__.py").exists())}
    assert top <= set(LAYER), f"add new top-level module to LAYER: {top - set(LAYER)}"


def test_findings_rules_registered_in_order():
    pytest.importorskip("pic_analyzer.findings", reason="private analysis core not installed (public build)")
    from pic_analyzer.findings import RULES
    files = sorted(p.stem for p in (ROOT / "findings").glob("r[0-9][0-9]_*.py"))
    assert [r.__module__.split(".")[-1] for r in RULES] == files
