"""Tests for the read-only Google Assistant configuration checker."""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

MODULE = (
    Path(__file__).resolve().parents[1]
    / "custom_components"
    / "ha_voice_label_sync"
    / "google_config.py"
)

spec = importlib.util.spec_from_file_location("hvls_google_config", MODULE)
assert spec is not None and spec.loader is not None

google_config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(google_config)

read_google_config = google_config.read_google_config
check_entity_config = google_config.check_entity_config


@pytest.fixture
def config_dir(tmp_path: Path) -> Path:
    return tmp_path


def test_google_assistant_configuration(config_dir: Path) -> None:
    config = config_dir / "configuration.yaml"
    config.write_text(
        """
google_assistant:
  project_id: test-project
  service_account: !include credentials.json
  report_state: true
  expose_by_default: false
  entity_config: !include google_assistant_entities.yaml
""",
        encoding="utf-8",
    )

    result = read_google_config(config)

    assert result["status"] == "found"
    assert result["settings"]["project_id"] == "test-project"
    assert result["settings"]["service_account"] == ("!include credentials.json")
    assert result["settings"]["expose_by_default"] == "false"
    assert result["warnings"] == []


def test_missing_google_assistant(config_dir: Path) -> None:
    config = config_dir / "configuration.yaml"
    config.write_text("homeassistant:\n  name: Test\n", encoding="utf-8")

    result = read_google_config(config)
    assert result["status"] == "not_found"


def test_invalid_yaml(config_dir: Path) -> None:
    config = config_dir / "configuration.yaml"
    config.write_text("google_assistant: [invalid\n", encoding="utf-8")

    result = read_google_config(config)
    assert result["status"] == "read_error"


def test_missing_configuration_file(config_dir: Path) -> None:
    result = read_google_config(config_dir / "missing.yaml")
    assert result["status"] == "missing_file"


def test_expose_by_default_warning(config_dir: Path) -> None:
    config = config_dir / "configuration.yaml"
    config.write_text(
        "google_assistant:\n  expose_by_default: true\n",
        encoding="utf-8",
    )

    result = read_google_config(config)
    assert result["warnings"]


def test_secret_content_not_loaded(config_dir: Path) -> None:
    config = config_dir / "configuration.yaml"

    config.write_text(
        "google_assistant:\n  service_account: !include credentials.json\n",
        encoding="utf-8",
    )

    # Deliberately do not create credentials.json.
    result = read_google_config(config)

    assert result["status"] == "found"
    assert result["settings"]["service_account"] == ("!include credentials.json")


def test_entity_config_file_present(config_dir: Path) -> None:
    generated = config_dir / "google_assistant_entities.yaml"
    generated.touch()

    google = {
        "status": "found",
        "settings": {"entity_config": "!include google_assistant_entities.yaml"},
    }

    result = check_entity_config(google, str(generated), config_dir)

    assert result["status"] == "ok"
    assert result["file_exists"] is True
    assert result["paths_match"] is True


def test_entity_config_path_mismatch(config_dir: Path) -> None:
    generated = config_dir / "google_assistant_entities.yaml"
    generated.touch()

    google = {
        "status": "found",
        "settings": {"entity_config": "!include google_assistant_entities.yaml"},
    }

    result = check_entity_config(google, str(config_dir / "different.yaml"), config_dir)

    assert result["status"] == "path_mismatch"
    assert result["paths_match"] is False


def test_entity_config_file_missing(config_dir: Path) -> None:
    google = {
        "status": "found",
        "settings": {"entity_config": "!include google_assistant_entities.yaml"},
    }

    result = check_entity_config(
        google,
        str(config_dir / "google_assistant_entities.yaml"),
        config_dir,
    )

    assert result["status"] == "file_missing"
    assert result["file_exists"] is False


def test_entity_config_outside_config(config_dir: Path) -> None:
    google = {
        "status": "found",
        "settings": {"entity_config": "!include ../outside.yaml"},
    }

    result = check_entity_config(google, str(config_dir / "output.yaml"), config_dir)

    assert result["status"] == "outside_config_directory"
