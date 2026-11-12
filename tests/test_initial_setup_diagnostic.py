"""Diagnostic read-only du premier démarrage HVLS."""

import importlib.util
from pathlib import Path

MODULE = (
    Path(__file__).resolve().parents[1]
    / "custom_components/ha_voice_label_sync/google_config.py"
)

spec = importlib.util.spec_from_file_location(
    "hvls_initial_setup_test", MODULE
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def inspect(root, output):
    return module.inspect_initial_setup(root, output)


def test_clean_installation_has_no_collision(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "default_config:\n", encoding="utf-8"
    )
    output = tmp_path / "generated.yaml"

    report = inspect(tmp_path, output)

    assert report["discovery_status"] == "not_found"
    assert report["output_status"] == "absent"
    assert report["source_matches_output"] is False
    assert report["review_required"] is False
    assert not output.exists()


def test_existing_manual_yaml_is_detected_but_not_adopted(tmp_path):
    source = tmp_path / "manuel.yaml"
    original = b"light.salon:\n  expose: true\n"
    source.write_bytes(original)

    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config: !include manuel.yaml\n",
        encoding="utf-8",
    )

    output = tmp_path / "generated.yaml"
    report = inspect(tmp_path, output)

    assert report["discovery_status"] == "found"
    assert report["source_path"] == str(source)
    assert report["output_status"] == "absent"
    assert report["source_matches_output"] is False
    assert report["review_required"] is True
    assert source.read_bytes() == original
    assert not output.exists()


def test_existing_manual_yaml_cannot_be_silent_output(tmp_path):
    source = tmp_path / "manuel.yaml"
    original = b"switch.test:\n  expose: false\n"
    source.write_bytes(original)

    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config: !include manuel.yaml\n",
        encoding="utf-8",
    )

    report = inspect(tmp_path, source)

    assert report["discovery_status"] == "found"
    assert report["output_status"] == "existing"
    assert report["source_matches_output"] is True
    assert report["review_required"] is True
    assert source.read_bytes() == original


def test_unclaimed_existing_output_requires_review(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "default_config:\n", encoding="utf-8"
    )

    output = tmp_path / "generated.yaml"
    original = b"configuration preexistante\n"
    output.write_bytes(original)

    report = inspect(tmp_path, output)

    assert report["discovery_status"] == "not_found"
    assert report["output_status"] == "existing"
    assert report["review_required"] is True
    assert output.read_bytes() == original


def test_packages_configuration_requires_review(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "homeassistant:\n"
        "  packages: !include_dir_named packages\n",
        encoding="utf-8",
    )

    report = inspect(tmp_path, tmp_path / "generated.yaml")

    assert report["discovery_status"] == "ambiguous"
    assert report["review_required"] is True


def test_symlink_output_is_unsafe(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "default_config:\n", encoding="utf-8"
    )

    target = tmp_path / "original.yaml"
    target.write_bytes(b"ne pas modifier\n")

    output = tmp_path / "generated.yaml"
    output.symlink_to(target)

    report = inspect(tmp_path, output)

    assert report["output_status"] == "unsafe"
    assert report["review_required"] is True
    assert target.read_bytes() == b"ne pas modifier\n"


def test_absolute_output_outside_config_is_unsafe(tmp_path):
    config = tmp_path / "config"
    config.mkdir()
    (config / "configuration.yaml").write_text(
        "default_config:\n", encoding="utf-8"
    )

    report = inspect(config, tmp_path / "outside.yaml")

    assert report["output_status"] == "unsafe"
    assert report["review_required"] is True


def test_parent_traversal_is_unsafe(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "default_config:\n", encoding="utf-8"
    )

    report = inspect(tmp_path, "../outside.yaml")

    assert report["output_status"] == "unsafe"
    assert report["review_required"] is True


def test_symlink_parent_directory_is_unsafe(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "default_config:\n", encoding="utf-8"
    )

    real_directory = tmp_path / "real"
    real_directory.mkdir()

    (tmp_path / "linked").symlink_to(
        real_directory, target_is_directory=True
    )

    report = inspect(tmp_path, "linked/generated.yaml")

    assert report["output_status"] == "unsafe"
    assert report["review_required"] is True


def test_missing_google_source_still_requires_review(tmp_path):
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config: !include missing.yaml\n",
        encoding="utf-8",
    )

    report = inspect(tmp_path, tmp_path / "missing.yaml")

    assert report["discovery_status"] == "file_missing"
    assert report["source_matches_output"] is True
    assert report["output_status"] == "absent"
    assert report["review_required"] is True
