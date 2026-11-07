"""Tests for safe HVLS label updates."""

import importlib.util
from pathlib import Path

import pytest

path = (
    Path(__file__).resolve().parents[1]
    / "custom_components/ha_voice_label_sync/label_update.py"
)
spec = importlib.util.spec_from_file_location("hvls_label_update_test", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

prepare = module.prepare_label_update
LabelUpdateError = module.LabelUpdateError


def test_add_preserves_other_labels():
    result = prepare(
        {"salon", "eclairage"},
        "google_assistant",
        True,
        False,
    )
    assert result == {"salon", "eclairage", "google_assistant"}


def test_remove_preserves_other_labels():
    result = prepare(
        {"salon", "google_assistant"},
        "google_assistant",
        False,
        True,
    )
    assert result == {"salon"}


def test_refuse_stale_update():
    with pytest.raises(LabelUpdateError):
        prepare(
            {"google_assistant"},
            "google_assistant",
            True,
            False,
        )


def test_idempotent_update():
    assert prepare({"hvls"}, "hvls", True, True) == {"hvls"}
    assert prepare(set(), "hvls", False, False) == set()


def test_missing_label_identifier():
    with pytest.raises(LabelUpdateError):
        prepare(set(), "", True, False)


def test_invalid_boolean():
    with pytest.raises(LabelUpdateError):
        prepare(set(), "hvls", "true", False)


def test_resolve_existing_label():
    labels = [
        {"label_id": "google_assistant", "name": "Google Assistant"}
    ]
    assert module.resolve_unique_label_id(
        labels, "Google Assistant"
    ) == "google_assistant"


def test_refuse_unknown_label():
    with pytest.raises(LabelUpdateError):
        module.resolve_unique_label_id([], "google_assistant")


def test_refuse_ambiguous_labels():
    labels = [
        {"label_id": "google_assistant", "name": "Google Assistant"},
        {"label_id": "other_label", "name": "Google-Assistant"},
    ]

    with pytest.raises(LabelUpdateError, match="Ambiguous"):
        module.resolve_unique_label_id(
            labels, "Google Assistant"
        )
