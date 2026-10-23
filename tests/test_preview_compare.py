"""Regression tests for read-only HVLS preview comparison."""

import importlib.util
from pathlib import Path

import pytest

MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "custom_components/ha_voice_label_sync/preview_compare.py"
)
spec = importlib.util.spec_from_file_location("hvls_preview_compare_test", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_same_yaml():
    content = "switch.a:\n  expose: true\n  name: Test\n  room: Cuisine\n"
    result = module.analyze_preview(content, content)
    assert result["summary"]["total"] == 1
    assert result["summary"]["rooms"] == 1
    assert result["comparison"]["identical_text"] is True
    assert result["comparison"]["unchanged"] == 1


def test_added_removed_modified():
    previous = """switch.old:
  expose: true
switch.change:
  expose: true
  name: Old
"""
    preview = """switch.new:
  expose: true
switch.change:
  expose: true
  name: New
"""
    comparison = module.analyze_preview(preview, previous)["comparison"]
    assert comparison["added"] == ["switch.new"]
    assert comparison["removed"] == ["switch.old"]
    assert comparison["modified"][0]["fields"]["name"] == {
        "before": "Old",
        "after": "New",
    }
    assert comparison["unified_diff"].startswith("--- Production")


def test_absent_production_not_misreported_as_no_change():
    result = module.analyze_preview("switch.one:\n  expose: true\n", None)
    assert result["comparison"]["status"] == "missing"


def test_invalid_production():
    result = module.analyze_preview("switch.one:\n  expose: true\n", "oops: [")
    assert result["comparison"]["status"] == "invalid"


def test_room_domain_and_missing_room():
    preview = """switch.a:
  expose: true
  room: Bureau
light.b:
  expose: true
  room: Bureau
select.c:
  expose: true
"""
    summary = module.analyze_preview(preview, None)["summary"]
    assert summary == {
        "total": 3,
        "rooms": 1,
        "without_room": 1,
        "domains": {"light": 1, "select": 1, "switch": 1},
        "by_room": {"Bureau": 2, "Sans pièce": 1},
    }


def test_invalid_preview():
    with pytest.raises(module.PreviewFormatError):
        module.analyze_preview("switch.one: [", None)


def test_semantically_same_but_reordered_yaml():
    before = "switch.x:\n  expose: true\n  name: X\n"
    after = "switch.x:\n  name: X\n  expose: true\n"
    comparison = module.analyze_preview(after, before)["comparison"]
    assert comparison["identical_entities"] is True
    assert comparison["identical_text"] is False
