"""Regression tests for label matching and YAML-safe entity names."""

import pytest
import yaml

from hvls.backends.google import render_google_assistant, yaml_escape
from hvls.engine import resolve_label_ids
from hvls.models import SelectedEntity, SelectionResult


def test_non_latin_labels_do_not_match_each_other():
    labels = [
        {"label_id": "yin_sheng", "name": "音声"},
        {"label_id": "maison", "name": "🏠"},
        {"label_id": "google_assistant", "name": "Google Assistant"},
    ]
    identifiers, warnings = resolve_label_ids(labels, "音声")
    assert identifiers == {"音声", "yin_sheng"}
    assert warnings == ()

    identifiers, warnings = resolve_label_ids(labels, "🚀")
    assert identifiers == {"🚀"}
    assert warnings  # No silent match on the empty slug.


def test_latin_label_slug_matching_is_unchanged():
    labels = [{"label_id": "ga", "name": "Google-Assistant"}]
    identifiers, _ = resolve_label_ids(labels, "google assistant")
    assert "ga" in identifiers


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("a\x7fb", "a b"),
        ("caf\x80é", "caf é"),
        ("x\x00\x1by", "x y"),
        ("bad\ud800half", "bad half"),
        ("non\uffffchar", "non char"),
        ("ligne\u2028sep\u0085nel", "ligne sep nel"),
        ("Lampe « salon » #1: ok", "Lampe « salon » #1: ok"),
        ("null", "null"),
    ],
)
def test_yaml_escape_always_produces_loadable_string(raw, expected):
    document = f"e.x:\n  name: {yaml_escape(raw)}\n"
    assert yaml.safe_load(document)["e.x"]["name"] == expected


def test_control_characters_in_room_comment_and_name_keep_file_valid():
    entity = SelectedEntity(
        entity_id="light.a", domain="light",
        name="Lampe\x7f", room="Salon\x85\x9b",
    )
    result = render_google_assistant(SelectionResult(
        entities=(entity,), domain_counts={"light": 1}, warnings=(),
    ))
    result.content.encode("utf-8")
    loaded = yaml.safe_load(result.content)
    assert loaded == {
        "light.a": {"expose": True, "name": "Lampe", "room": "Salon"},
    }
