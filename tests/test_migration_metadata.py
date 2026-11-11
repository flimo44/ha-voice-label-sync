"""Protected-baseline metadata overlay regression and non-destructive tests."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType

import pytest
import yaml

COMPONENT = (
    Path(__file__).resolve().parents[1] / "custom_components" / "ha_voice_label_sync"
)
MAIN = b"""# These bytes must never be rewritten.
google_assistant:
  project_id: private-id
  secure_devices_pin: !secret private_pin
  expose_by_default: false
  entity_config: !include google_entities.yaml
"""
ENTITIES = """light.good:
  expose: true
  name: "Salon # Ouest"
  room: "Cuisine: Été"
  aliases: [Lumière, "On", "12"]
light.empty_aliases:
  expose: true
  aliases: []
light.plain:
  expose: true
light.bad:
  expose: true
  name: Valid Name
  device_type: custom
lock.excluded:
  expose: false
  name: Secret locked door
""".encode()


@pytest.fixture
def modules(monkeypatch):
    prefix = "_test_hvls_metadata_overlay"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)
    loaded = {}
    for stem in ("migration_discovery", "migration_baseline", "migration_metadata"):
        name = f"{prefix}.{stem}"
        spec = importlib.util.spec_from_file_location(
            name, COMPONENT / f"{stem}.py"
        )
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, name, module)
        spec.loader.exec_module(module)
        loaded[stem] = module
    return loaded


def _setup(tmp_path, modules, *, main=MAIN, entities=ENTITIES):
    (tmp_path / "configuration.yaml").write_bytes(main)
    (tmp_path / "google_entities.yaml").write_bytes(entities)
    discovery = modules["migration_discovery"].discover_google_assistant(tmp_path)
    assert discovery["source"]["status"] == "resolved"
    baseline = modules["migration_baseline"].capture_baseline(
        tmp_path, discovery
    )
    return baseline


def _generated(*ids):
    result = {}
    for entity_id in ids:
        result[entity_id] = {
            "expose": True, "name": "HVLS generated name", "room": "HA default"
        }
    return yaml.safe_dump(result, allow_unicode=True, sort_keys=False)


def _preview(modules, original, *entity_ids):
    return modules["migration_metadata"].preview_metadata_overlay(
        _generated(*entity_ids), original, list(entity_ids)
    )


def _row(report, entity_id):
    return next(x for x in report["entities"] if x["entity_id"] == entity_id)


def test_baseline_extracts_all_exact_fields_without_touching_secrets(
    tmp_path, modules
):
    baseline = _setup(tmp_path, modules)
    metadata = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    assert metadata["baseline_manifest_sha256"] == baseline["manifest_sha256"]
    assert metadata["verified_from_protected_baseline"] is True
    rows = metadata["entities"]
    assert rows["light.good"]["metadata"] == {
        "name": "Salon # Ouest",
        "room": "Cuisine: Été",
        "aliases": ["Lumière", "On", "12"],
    }
    assert rows["light.good"]["explicit_fields"] == [
        "name", "room", "aliases"
    ]
    assert rows["light.empty_aliases"]["metadata"] == {"aliases": []}
    assert rows["light.plain"]["metadata"] == {}
    assert rows["light.bad"]["status"] == "needs_review"
    assert "unsupported_entity_option" in rows["light.bad"]["reasons"]
    assert rows["light.bad"]["metadata"] == {}
    assert rows["lock.excluded"]["exposure_intent"] == "exclude"
    assert (tmp_path / "configuration.yaml").read_bytes() == MAIN
    assert (tmp_path / "google_entities.yaml").read_bytes() == ENTITIES


def test_exact_metadata_overlay_roundtrip_preserves_unicode_and_strings(
    tmp_path, modules
):
    _setup(tmp_path, modules)
    metadata = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    result = _preview(modules, metadata, "light.good", "light.empty_aliases")
    assert result["status"] == "read_only_metadata_preview"
    assert result["read_only"] is True
    assert result["apply_allowed"] is False
    assert result["cutover_allowed"] is False
    assert result["summary"]["metadata_fields_preserved"] == 4
    assert result["summary"]["manual_entries_not_imported"] == 3
    assert result["google_home_state_verified"] is False
    mapping = yaml.safe_load(result["content"])
    assert mapping["light.good"] == {
        "expose": True,
        "name": "Salon # Ouest",
        "room": "Cuisine: Été",
        "aliases": ["Lumière", "On", "12"],
    }
    assert mapping["light.empty_aliases"]["aliases"] == []
    assert mapping["light.empty_aliases"]["name"] == "HVLS generated name"
    assert _row(result, "light.good")["fields_preserved"] == [
        "aliases", "name", "room"
    ]
    # Names/aliases/rooms must not appear in diagnostic entity reports.
    details = json.dumps(result["entities"], ensure_ascii=False)
    assert "Salon # Ouest" not in details
    assert "Cuisine: Été" not in details
    assert "Secret locked door" not in details


def test_local_unsupported_option_does_not_erase_unaffected_preview(
    tmp_path, modules
):
    _setup(tmp_path, modules)
    snapshot = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    result = _preview(modules, snapshot, "light.good", "light.bad")
    assert _row(result, "light.bad")["status"] == "needs_review"
    assert "unsupported_manual_entity_options" in (
        _row(result, "light.bad")["reasons"]
    )
    mapped = yaml.safe_load(result["content"])
    assert "light.good" in mapped
    assert "light.bad" not in mapped
    assert result["summary"]["needs_review"] == 1
    assert result["cutover_allowed"] is False


def test_excluded_entity_never_generated_exposed_even_if_import_requested(
    tmp_path, modules
):
    _setup(tmp_path, modules)
    snapshot = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    result = _preview(modules, snapshot, "light.good", "lock.excluded")
    assert _row(result, "lock.excluded")["status"] == "needs_review"
    assert "explicitly_excluded" in (
        _row(result, "lock.excluded")["reasons"]
    )
    assert "lock.excluded" not in yaml.safe_load(result["content"])
    assert result["cutover_allowed"] is False


def test_unapproved_generated_entity_blocks_preview_content(
    tmp_path, modules
):
    _setup(tmp_path, modules)
    metadata = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    result = modules["migration_metadata"].preview_metadata_overlay(
        _generated("light.good", "lock.excluded"),
        metadata,
        ["light.good"],
    )
    assert result["content"] is None
    assert result["summary"]["unreviewed_generated_entities"] == 1
    assert "generated_entity_not_approved_for_migration" in (
        _row(result, "lock.excluded")["reasons"]
    )
    assert result["apply_allowed"] is False


def test_baseline_preserves_original_even_when_live_yaml_changes(
    tmp_path, modules
):
    _setup(tmp_path, modules)
    (tmp_path / "google_entities.yaml").write_text("light.unrelated: {}\n")
    metadata = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    assert metadata["entities"]["light.good"]["metadata"]["name"] == (
        "Salon # Ouest"
    )
    assert "light.unrelated" not in metadata["entities"]
    assert (tmp_path / "google_entities.yaml").read_text() == (
        "light.unrelated: {}\n"
    )


def test_corrupt_baseline_refused_without_mutation(tmp_path, modules):
    _setup(tmp_path, modules)
    saved = (
        tmp_path / ".storage" / "hvls_migration"
        / "baseline" / "files" / "google_entities.yaml"
    )
    saved.write_text("corrupted")
    with pytest.raises(
        modules["migration_baseline"].BaselineError, match="baseline_corrupt"
    ):
        modules["migration_metadata"].read_baseline_metadata(tmp_path)
    assert (tmp_path / "configuration.yaml").read_bytes() == MAIN


def test_invalid_local_secret_reference_is_not_read(tmp_path, modules):
    entries = b"""light.secret:
  expose: true
  name: !secret forbidden
light.good:
  expose: true
  aliases: [Ok]
"""
    _setup(tmp_path, modules, entities=entries)
    metadata = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    assert metadata["entities"]["light.secret"]["status"] == "needs_review"
    assert "invalid_name" in metadata["entities"]["light.secret"]["reasons"]
    assert metadata["entities"]["light.secret"]["metadata"] == {}
    assert metadata["entities"]["light.good"]["metadata"] == {
        "aliases": ["Ok"]
    }


def test_invalid_or_empty_local_values_only_block_that_entity(
    tmp_path, modules
):
    entries = b"""light.blank:
  expose: true
  name: ""
light.bad_alias:
  expose: true
  aliases: expected_list
light.good:
  expose: true
  name: "Valid"
"""
    _setup(tmp_path, modules, entities=entries)
    metadata = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    assert metadata["entities"]["light.blank"]["status"] == "needs_review"
    assert metadata["entities"]["light.bad_alias"]["status"] == "needs_review"
    result = _preview(
        modules, metadata, "light.good", "light.blank", "light.bad_alias"
    )
    mapping = yaml.safe_load(result["content"])
    assert set(mapping) == {"light.good"}
    assert result["summary"]["needs_review"] == 2


def test_include_topology_relative_to_ga_included_file(
    tmp_path, modules
):
    (tmp_path / "ga").mkdir()
    main = b"google_assistant: !include ga/google.yaml\n"
    (tmp_path / "configuration.yaml").write_bytes(main)
    (tmp_path / "ga" / "google.yaml").write_bytes(
        b"expose_by_default: false\nentity_config: !include entities.yaml\n"
    )
    (tmp_path / "ga" / "entities.yaml").write_bytes(
        b'light.good:\n  expose: true\n  name: "Cuisine"\n'
    )
    discovery = modules["migration_discovery"].discover_google_assistant(
        tmp_path
    )
    assert discovery["source"]["status"] == "resolved"
    modules["migration_baseline"].capture_baseline(tmp_path, discovery)
    metadata = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    assert metadata["entities"]["light.good"]["metadata"] == {
        "name": "Cuisine"
    }


def test_generated_yaml_duplicate_key_refused(tmp_path, modules):
    _setup(tmp_path, modules)
    snapshot = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    malicious = """light.good:
  expose: true
  name: One
light.good:
  expose: true
  name: Two
"""
    with pytest.raises(
        modules["migration_metadata"].MetadataError,
        match="generated_preview_invalid_yaml",
    ):
        modules["migration_metadata"].preview_metadata_overlay(
            malicious, snapshot, ["light.good"]
        )


def test_generated_yaml_unknown_fields_or_custom_tags_rejected(
    tmp_path, modules
):
    _setup(tmp_path, modules)
    snapshot = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    candidates = [
        "light.good:\n  expose: true\n  secure_devices_pin: 1234\n",
        "light.good:\n  expose: true\n  name: !secret forbidden\n",
        "light.good:\n  expose: false\n",
    ]
    for generated in candidates:
        with pytest.raises(modules["migration_metadata"].MetadataError):
            modules["migration_metadata"].preview_metadata_overlay(
                generated, snapshot, ["light.good"]
            )


def test_import_decisions_cannot_contain_duplicates_or_bad_entity_id(
    tmp_path, modules
):
    _setup(tmp_path, modules)
    metadata = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    for selections in (["light.good", "light.good"], ["../path"], "light.good"):
        with pytest.raises(
            modules["migration_metadata"].MetadataError,
            match="import_selection_invalid",
        ):
            modules["migration_metadata"].preview_metadata_overlay(
                _generated("light.good"), metadata, selections
            )


def test_no_implicit_carryover_of_uncertain_manual_policy(
    tmp_path, modules
):
    _setup(tmp_path, modules)
    metadata = modules["migration_metadata"].read_baseline_metadata(tmp_path)
    result = _preview(modules, metadata, "light.good")
    assert "lock.excluded" in [
        x["entity_id"] for x in result["entities"]
        if x["status"] == "not_imported"
    ]
    assert result["summary"]["manual_entries_not_imported"] == 4
    assert result["cutover_allowed"] is False
    assert result["apply_allowed"] is False
