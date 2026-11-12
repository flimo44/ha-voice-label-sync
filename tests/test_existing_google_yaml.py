"""Tests de détection du YAML Google Assistant existant."""

import importlib.util
from pathlib import Path

import pytest


MODULE = (
    Path(__file__).resolve().parents[1]
    / "custom_components/ha_voice_label_sync/google_config.py"
)

spec = importlib.util.spec_from_file_location("hvls_google_config_test", MODULE)
google_config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(google_config)


def discover(root):
    return google_config.discover_existing_google_yaml(root)


def test_no_existing_configuration(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "default_config:\n", encoding="utf-8"
    )
    result = discover(tmp_path)
    assert result["status"] == "not_found"
    assert result["source_path"] is None


def test_existing_custom_path(tmp_path):
    folder = tmp_path / "google"
    folder.mkdir()
    source = folder / "mes_entites.yaml"
    content = b"light.salon:\n  expose: true\n"
    source.write_bytes(content)

    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  expose_by_default: false\n"
        "  entity_config: !include google/mes_entites.yaml\n",
        encoding="utf-8",
    )

    result = discover(tmp_path)

    assert result["status"] == "found"
    assert result["source_path"] == str(source)
    assert result["source_exists"] is True
    assert source.read_bytes() == content


def test_declared_file_missing(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config: !include absent.yaml\n",
        encoding="utf-8",
    )
    result = discover(tmp_path)
    assert result["status"] == "file_missing"
    assert result["source_exists"] is False


def test_path_outside_config_refused(tmp_path):
    root = tmp_path / "ha"
    root.mkdir()
    (root / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config: !include ../externe.yaml\n",
        encoding="utf-8",
    )
    result = discover(root)
    assert result["status"] == "unsafe_path"
    assert result["source_path"] is None


def test_duplicate_google_assistant_refused(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config: !include premier.yaml\n"
        "google_assistant:\n"
        "  entity_config: !include second.yaml\n",
        encoding="utf-8",
    )
    result = discover(tmp_path)
    assert result["status"] == "ambiguous"
    assert result["source_path"] is None


def test_symbolic_link_refused(tmp_path):
    source = tmp_path / "source.yaml"
    source.write_text("light.test: {}\n", encoding="utf-8")

    (tmp_path / "linked.yaml").symlink_to(source)

    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config: !include linked.yaml\n",
        encoding="utf-8",
    )

    result = discover(tmp_path)
    assert result["status"] == "unsafe_path"
    assert result["source_path"] is None


def test_absolute_path_refused(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config: !include /tmp/external.yaml\n",
        encoding="utf-8",
    )

    result = discover(tmp_path)
    assert result["status"] == "unsafe_path"
    assert result["source_path"] is None


def test_inline_entity_config_requires_review(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config:\n"
        "    light.salon:\n"
        "      expose: true\n",
        encoding="utf-8",
    )

    result = discover(tmp_path)
    assert result["status"] == "ambiguous"
    assert result["source_path"] is None


def test_packages_require_manual_review(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "homeassistant:\n"
        "  packages: !include_dir_named packages\n",
        encoding="utf-8",
    )

    result = discover(tmp_path)

    assert result["status"] == "ambiguous"
    assert result["source_path"] is None


def test_external_google_config_requires_review(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant: !include google_config.yaml\n",
        encoding="utf-8",
    )

    result = discover(tmp_path)

    assert result["status"] == "ambiguous"
    assert result["source_path"] is None


def test_missing_configuration_not_considered_clean(tmp_path):
    result = discover(tmp_path)

    assert result["status"] == "ambiguous"
    assert result["source_path"] is None
