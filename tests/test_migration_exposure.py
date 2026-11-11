"""Behavioral tests for the read-only manual Google Assistant exposure model.

Anchored against HA Core 2026.10.2 and 2026.11.0:
google_assistant/http.py GoogleConfig.should_expose,
google_assistant/__init__.py ENTITY_SCHEMA + default domain list,
google_assistant/helpers.py async_get_entities trait filtering.
No Google Home parity is implied.
"""

from __future__ import annotations

import copy
import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / "custom_components" / "ha_voice_label_sync"


def load_module(module_name: str):
    path = COMPONENT / f"{module_name}.py"
    spec = importlib.util.spec_from_file_location(f"test_{module_name}", path)
    assert spec is not None and spec.loader is not None
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


discovery = load_module("migration_discovery")
model = load_module("migration_exposure")
CASES = {
    case["id"]: case
    for case in json.loads(
        (ROOT / "tests/fixtures/migration/contract_cases.json").read_text(
            encoding="utf-8"
        )
    )["cases"]
}


def analyze_fixture(tmp_path: Path, case_id: str):
    for name, content in CASES[case_id]["files"].items():
        path = tmp_path / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    return discovery.discover_google_assistant(tmp_path)


def runtime(
    entity_id: str,
    *,
    active: bool | None = True,
    supported: bool | None = True,
    registered: bool = True,
    hidden: str | None = None,
    category: str | None = None,
    disabled: str | None = None,
):
    return {
        "entity_id": entity_id,
        "state_present": active,
        "google_traits_supported": supported,
        "registry_present": registered,
        "hidden_by": hidden,
        "entity_category": category,
        "disabled_by": disabled,
    }


def by_id(report):
    return {row["entity_id"]: row for row in report["entities"]}


def test_explicit_true_and_excluded_false_default_deny(tmp_path: Path):
    report = analyze_fixture(tmp_path, "S02")
    result = model.project_manual_google_exposure(
        report,
        [runtime("light.salon"), runtime("switch.ancien")],
        inventory_complete=True,
    )
    rows = by_id(result)
    assert rows["light.salon"]["ha_sync_exposure"] == "exposed"
    assert rows["switch.ancien"]["ha_sync_exposure"] == "not_exposed"
    assert rows["switch.ancien"]["manual_ga_rule_exposes"] is False
    assert result["summary"] == {
        "considered": 2, "exposed": 1, "not_exposed": 1, "unknown": 0
    }
    assert result["cutover_allowed"] is False


def test_inline_name_only_counts_as_explicitly_exposed(tmp_path: Path):
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  expose_by_default: false\n"
        "  entity_config:\n"
        "    light.salon:\n"
        "      name: Salon\n",
        encoding="utf-8",
    )
    report = discovery.discover_google_assistant(tmp_path)
    assert report["entities"][0]["yaml_exposure_intent"] == "expose"
    result = model.project_manual_google_exposure(
        report, [runtime("light.salon")], inventory_complete=True
    )
    assert by_id(result)["light.salon"]["ha_sync_exposure"] == "exposed"


def test_hidden_and_category_suppressed_only_by_implicit_default(
    tmp_path: Path,
):
    report = analyze_fixture(tmp_path, "S05")
    result = model.project_manual_google_exposure(
        report,
        [
            runtime("light.visible"),
            runtime("light.hidden", hidden="user"),
            runtime("switch.diagnostic", category="diagnostic"),
            runtime("light.unregistered", registered=False),
            runtime("switch.portal"),
        ],
        inventory_complete=True,
    )
    rows = by_id(result)
    assert rows["light.visible"]["ha_sync_exposure"] == "exposed"
    assert rows["light.hidden"]["ha_sync_exposure"] == "not_exposed"
    assert rows["switch.diagnostic"]["ha_sync_exposure"] == "not_exposed"
    assert rows["light.unregistered"]["ha_sync_exposure"] == "exposed"
    assert rows["switch.portal"]["ha_sync_exposure"] == "not_exposed"
    assert "entity_without_registry_entry" in rows["light.unregistered"]["reasons"]


def test_explicit_true_can_expose_hidden_entity(tmp_path: Path):
    report = analyze_fixture(tmp_path, "S19")
    result = model.project_manual_google_exposure(
        report,
        [runtime("switch.ventilation", hidden="user", category="config")],
        inventory_complete=True,
    )
    row = by_id(result)["switch.ventilation"]
    assert row["ha_sync_exposure"] == "exposed"
    assert row["manual_ga_rule_exposes"] is True
    assert "explicitly_exposed" in row["reasons"]


def test_implicit_domains_omitted_need_real_ha_defaults(tmp_path: Path):
    report = analyze_fixture(tmp_path, "S04")
    entries = [
        runtime("light.salon"),
        runtime("button.scene"),
        runtime("camera.front"),
    ]
    unresolved = model.project_manual_google_exposure(
        report, entries, inventory_complete=True
    )
    assert unresolved["summary"]["unknown"] == 2
    assert not unresolved["default_domains_resolved"]

    with_defaults = model.project_manual_google_exposure(
        report,
        entries,
        default_exposed_domains=["light", "switch", "sensor"],
        inventory_complete=True,
    )
    rows = by_id(with_defaults)
    assert rows["light.salon"]["ha_sync_exposure"] == "exposed"
    assert rows["button.scene"]["ha_sync_exposure"] == "not_exposed"
    assert rows["camera.front"]["ha_sync_exposure"] == "not_exposed"
    assert with_defaults["summary"]["unknown"] == 0


def test_explicit_empty_exposed_domains_is_not_implicit_all(tmp_path: Path):
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  expose_by_default: true\n"
        "  exposed_domains: []\n",
        encoding="utf-8",
    )
    report = discovery.discover_google_assistant(tmp_path)
    result = model.project_manual_google_exposure(
        report, [runtime("light.salon")], inventory_complete=True
    )
    assert by_id(result)["light.salon"]["ha_sync_exposure"] == "not_exposed"


def test_no_state_even_when_explicitly_exposed_not_in_ha_sync(tmp_path: Path):
    report = analyze_fixture(tmp_path, "S02")
    result = model.project_manual_google_exposure(
        report,
        [runtime("light.salon", active=False, disabled="user")],
        inventory_complete=True,
    )
    row = by_id(result)["light.salon"]
    assert row["manual_ga_rule_exposes"] is True
    assert row["ha_sync_exposure"] == "not_exposed"
    assert "disabled_in_registry" in row["reasons"]
    assert "no_active_state" in row["reasons"]


def test_not_supported_by_google_traits_is_not_synced(tmp_path: Path):
    report = analyze_fixture(tmp_path, "S02")
    result = model.project_manual_google_exposure(
        report,
        [runtime("light.salon", supported=False)],
        inventory_complete=True,
    )
    assert by_id(result)["light.salon"]["ha_sync_exposure"] == "not_exposed"
    assert "google_traits_unsupported" in by_id(result)["light.salon"]["reasons"]


def test_missing_support_or_unknown_registry_visibility_stays_unknown(
    tmp_path: Path,
):
    report = analyze_fixture(tmp_path, "S05")
    unknown_registry = runtime("light.unknown")
    unknown_registry.pop("hidden_by")
    unknown_registry.pop("entity_category")
    result = model.project_manual_google_exposure(
        report, [runtime("light.traits", supported=None), unknown_registry]
    )
    rows = by_id(result)
    assert rows["light.traits"]["ha_sync_exposure"] == "unknown"
    assert rows["light.unknown"]["ha_sync_exposure"] == "unknown"
    assert result["summary"]["unknown"] == 2


def test_invalid_local_options_keep_only_that_entity_uncertain(
    tmp_path: Path,
):
    report = analyze_fixture(tmp_path, "S13")
    result = model.project_manual_google_exposure(
        report,
        [runtime("light.good"), runtime("light.bad")],
        inventory_complete=True,
    )
    rows = by_id(result)
    assert rows["light.good"]["ha_sync_exposure"] == "exposed"
    assert rows["light.bad"]["ha_sync_exposure"] == "unknown"
    assert "source_entity_requires_validation" in rows["light.bad"]["reasons"]


def test_nonexistent_yaml_entity_not_assumed_missing_on_partial_inventory(
    tmp_path: Path,
):
    report = analyze_fixture(tmp_path, "S14")
    partial = model.project_manual_google_exposure(report, [])
    assert by_id(partial)["sensor.legacy_temperature"]["ha_sync_exposure"] == "unknown"
    complete = model.project_manual_google_exposure(
        report, [], inventory_complete=True
    )
    assert by_id(complete)["sensor.legacy_temperature"]["ha_sync_exposure"] == (
        "not_exposed"
    )


def test_blocked_discovery_never_becomes_exposure_certificate(tmp_path: Path):
    report = analyze_fixture(tmp_path, "S08")
    result = model.project_manual_google_exposure(
        report, [runtime("light.salon")]
    )
    assert result["status"] == "unavailable"
    assert result["cutover_allowed"] is False


def test_new_configuration_is_not_migration(tmp_path: Path):
    report = analyze_fixture(tmp_path, "S01")
    result = model.project_manual_google_exposure(report, [])
    assert result["status"] == "unavailable"


def test_duplicate_runtime_entity_ids_are_rejected(tmp_path: Path):
    report = analyze_fixture(tmp_path, "S02")
    with pytest.raises(ValueError, match="Duplicate runtime"):
        model.project_manual_google_exposure(
            report, [runtime("light.salon"), runtime("light.salon")]
        )


def test_projection_does_not_modify_inputs_or_write(tmp_path: Path, monkeypatch):
    report = analyze_fixture(tmp_path, "S02")
    before = copy.deepcopy(report)
    entities = [runtime("light.salon"), runtime("switch.ancien")]
    original = copy.deepcopy(entities)

    def forbid_write(*_args, **_kwargs):
        raise AssertionError("Unexpected write from exposure projection")

    monkeypatch.setattr(Path, "write_text", forbid_write)
    monkeypatch.setattr(Path, "write_bytes", forbid_write)
    result = model.project_manual_google_exposure(
        report, entities, inventory_complete=True
    )
    assert result["summary"]["considered"] == 2
    assert report == before
    assert entities == original
    assert all(r["google_home_state"] == "unknown" for r in result["entities"])
