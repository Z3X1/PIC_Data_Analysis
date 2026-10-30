"""前端模板：web/ 下的每個 JS 檔都有被組進去，每個分頁都有 renderer。"""
import pathlib
import re

from pic_analyzer.report.html import JS_FILES, PRIVATE_JS, WEB, load_template


def test_all_js_files_listed():
    on_disk = {str(p.relative_to(pathlib.Path(WEB) / "js")) for p in (pathlib.Path(WEB) / "js").rglob("*.js")}
    assert on_disk <= set(JS_FILES)                       # nothing unlisted on disk
    assert set(JS_FILES) - on_disk <= set(PRIVATE_JS)     # only private files may be absent


def test_template_markers_present():
    t = load_template()
    for marker in ("<!--__PLOTLY__-->", "/*__DATA__*/null", "/*__META__*/null"):
        assert marker in t
    assert "/*__CSS__*/" not in t and "/*__JS__*/" not in t


def test_every_view_has_a_renderer():
    t = load_template()
    views = re.findall(r'<section class="view" id="v-(\w+)">', t)
    for v in views:
        assert f"RENDER.{v} = " in t, v
