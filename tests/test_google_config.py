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



@pytest.mark.parametrize(
    ("literal", "state"),
    [
        ("true", "enabled"),
        ("TRUE", "enabled"),
        ("yes", "enabled"),
        ("YES", "enabled"),
        ("on", "enabled"),
        ("On", "enabled"),
        ("y", "enabled"),
        ("'true'", "enabled"),
        ("false", "disabled"),
        ("FALSE", "disabled"),
        ("no", "disabled"),
        ("NO", "disabled"),
        ("off", "disabled"),
        ("OFF", "disabled"),
        ("n", "disabled"),
    ],
)
def test_exposure_yaml_boolean_aliases(
    config_dir: Path, literal: str, state: str,
) -> None:
    """The diagnostic accepts HA YAML boolean aliases without mutations."""
    config = config_dir / "configuration.yaml"
    raw = f"google_assistant:\n  expose_by_default: {literal}\n"
    config.write_text(raw, encoding="utf-8")

    result = read_google_config(config)

    assert result["status"] == "found"
    assert result["expose_by_default_state"] == state
    assert bool(result["warnings"]) is (state == "enabled")
    assert config.read_text(encoding="utf-8") == raw


def test_exposure_missing_uses_google_assistant_default_true(
    config_dir: Path,
) -> None:
    config = config_dir / "configuration.yaml"
    config.write_text(
        "google_assistant:\n"
        "  project_id: example-project\n"
        "  service_account: !include creds.json\n",
        encoding="utf-8",
    )

    result = read_google_config(config)

    assert result["status"] == "found"
    assert "expose_by_default" not in result["settings"]
    assert result["expose_by_default_state"] == "enabled_default"
    assert any(
        "defaults to true" in text and "independently" in text
        for text in result["warnings"]
    )
    # Read only: do not try to resolve !include or create any missing file.
    assert not (config_dir / "creds.json").exists()


@pytest.mark.parametrize(
    "literal",
    ["maybe", "!secret google_exposure", "!include exposure.yaml", "null"],
)
def test_exposure_ambiguous_scalar_stays_unknown(
    config_dir: Path, literal: str,
) -> None:
    config = config_dir / "configuration.yaml"
    config.write_text(
        f"google_assistant:\n  expose_by_default: {literal}\n",
        encoding="utf-8",
    )

    result = read_google_config(config)

    assert result["status"] == "found"
    assert result["expose_by_default_state"] == "unknown"
    assert result["warnings"] and "could not be determined" in result["warnings"][0]
    assert not (config_dir / "exposure.yaml").exists()


def test_missing_or_indirect_google_block_does_not_infer_default(
    config_dir: Path,
) -> None:
    config = config_dir / "configuration.yaml"
    config.write_text("default_config:\n", encoding="utf-8")
    missing = read_google_config(config)
    assert missing["status"] == "not_found"
    assert "expose_by_default_state" not in missing
    assert not any("defaults to true" in w for w in missing["warnings"])

    config.write_text(
        "google_assistant: !include google.yaml\n", encoding="utf-8",
    )
    indirect = read_google_config(config)
    assert indirect["status"] == "external_or_unsupported"
    assert "expose_by_default_state" not in indirect
    assert not any("defaults to true" in w for w in indirect["warnings"])
