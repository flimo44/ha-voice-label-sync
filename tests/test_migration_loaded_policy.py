"""Behavioral tests: disk Google YAML versus active loaded exposure policy."""

from __future__ import annotations

import copy
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

COMPONENT = (
    Path(__file__).resolve().parents[1]
    / "custom_components"
    / "ha_voice_label_sync"
)


def _module(name: str):
    spec = importlib.util.spec_from_file_location(
        f"test_migration_{name}", COMPONENT / f"{name}.py"
    )
    assert spec is not None and spec.loader is not None
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


discovery_module = _module("migration_discovery")
comparison = _module("migration_loaded_policy")

DEFAULT_DOMAINS = ["light", "lock", "switch", "sensor"]
SOURCE_YAML = """
google_assistant:
  project_id: demo-project
  expose_by_default: false
  entity_config:
    light.kitchen:
      expose: true
      name: Kitchen light
      room: Kitchen
      aliases:
        - Kitchen lights
    lock.front:
      expose: false
"""


def _discovery(tmp_path: Path, content: str = SOURCE_YAML):
    (tmp_path / "configuration.yaml").write_text(content, encoding="utf-8")
    report = discovery_module.discover_google_assistant(tmp_path)
    assert report["source"]["status"] == "resolved"
    return report


def _loaded():
    return {
        "project_id": "demo-project",
        "expose_by_default": False,
        "exposed_domains": DEFAULT_DOMAINS,
        "entity_config": {
            "light.kitchen": {
                "expose": True,
                "name": "Kitchen light",
                "room": "Kitchen",
                "aliases": ["Kitchen lights"],
            },
            "lock.front": {"expose": False},
        },
        "secure_devices_pin": "1234-SUPER-SECRET",
        "service_account": {"private_key": "PRIVATE-KEY-NOT-FOR-REPORT"},
    }


def _compare(tmp_path: Path, loaded=None, content: str = SOURCE_YAML):
    disk = _discovery(tmp_path, content)
    return comparison.compare_disk_and_loaded_policy(
        disk,
        _loaded() if loaded is None else loaded,
        default_exposed_domains=DEFAULT_DOMAINS,
    )


def test_identical_validated_policy_matches(tmp_path: Path):
    report = _compare(tmp_path)
    assert report["status"] == "match_compared_fields"
    assert report["compared_fields_match"] is True
    assert report["rule_changes"] == []
    assert report["differences"] == []
    assert report["summary"]["unchanged"] == 2
    assert report["cutover_allowed"] is False
    assert report["restart_only_options_compared"] is False
    assert report["source_freshness_verified"] is False
    assert report["google_home_state_verified"] is False


def test_changed_name_and_alias_are_reported_without_values(tmp_path: Path):
    loaded = _loaded()
    loaded["entity_config"]["light.kitchen"]["name"] = "Ancien nom privé"
    loaded["entity_config"]["light.kitchen"]["aliases"] = ["Private alias"]
    report = _compare(tmp_path, loaded)
    assert report["status"] == "drift_detected"
    assert report["compared_fields_match"] is False
    assert report["differences"] == [
        {
            "entity_id": "light.kitchen",
            "status": "changed",
            "changed_fields": ["name", "aliases"],
        }
    ]
    serialized = json.dumps(report)
    assert "Ancien nom privé" not in serialized
    assert "Private alias" not in serialized
    assert "Kitchen light" not in serialized


def test_explicit_expose_false_was_changed_in_memory(tmp_path: Path):
    loaded = _loaded()
    loaded["entity_config"]["lock.front"]["expose"] = True
    report = _compare(tmp_path, loaded)
    assert report["status"] == "drift_detected"
    assert report["differences"] == [
        {
            "entity_id": "lock.front",
            "status": "changed",
            "changed_fields": ["expose"],
        }
    ]


def test_loaded_entry_removed_on_disk(tmp_path: Path):
    content = SOURCE_YAML.replace(
        "    lock.front:\n      expose: false\n", ""
    )
    report = _compare(tmp_path, content=content)
    assert report["status"] == "drift_detected"
    assert report["differences"][0]["status"] == "removed_on_disk"
    assert report["differences"][0]["entity_id"] == "lock.front"


def test_new_entry_on_disk_not_yet_loaded(tmp_path: Path):
    content = SOURCE_YAML + "    switch.new:\n      expose: true\n"
    report = _compare(tmp_path, content=content)
    assert report["status"] == "drift_detected"
    assert report["differences"][0]["status"] == "added_on_disk"
    assert report["differences"][0]["entity_id"] == "switch.new"


def test_default_rule_change_detected(tmp_path: Path):
    loaded = _loaded()
    loaded["expose_by_default"] = True
    report = _compare(tmp_path, loaded)
    assert report["rule_changes"] == ["expose_by_default"]
    assert report["status"] == "drift_detected"


def test_missing_domain_list_uses_ha_defaults(tmp_path: Path):
    report = _compare(tmp_path)
    assert report["rule_changes"] == []
    loaded = _loaded()
    loaded["exposed_domains"] = []
    mismatch = _compare(tmp_path, loaded)
    assert mismatch["rule_changes"] == ["exposed_domains"]


def test_explicit_empty_domains_are_not_ha_default(tmp_path: Path):
    content = """
google_assistant:
  expose_by_default: true
  exposed_domains: []
  entity_config: {}
"""
    loaded = {
        "expose_by_default": True,
        "exposed_domains": [],
        "entity_config": {},
    }
    report = _compare(tmp_path, loaded, content)
    assert report["status"] == "match_compared_fields"
    loaded["exposed_domains"] = list(DEFAULT_DOMAINS)
    mismatch = _compare(tmp_path, loaded, content)
    assert mismatch["rule_changes"] == ["exposed_domains"]


def test_order_of_domain_list_is_semantically_irrelevant(tmp_path: Path):
    loaded = _loaded()
    loaded["exposed_domains"] = list(reversed(DEFAULT_DOMAINS))
    report = _compare(tmp_path, loaded)
    assert report["status"] == "match_compared_fields"


def test_local_invalid_option_does_not_hide_other_entities(tmp_path: Path):
    content = """
google_assistant:
  expose_by_default: false
  entity_config:
    light.good:
      expose: true
    light.bad:
      expose: true
      room: [invalid, list]
"""
    loaded = {
        "expose_by_default": False,
        "exposed_domains": list(DEFAULT_DOMAINS),
        "entity_config": {
            "light.good": {"expose": True},
            "light.bad": {"expose": True, "room": "old"},
        },
    }
    report = _compare(tmp_path, loaded, content)
    assert report["status"] == "partial_unknown"
    assert report["compared_fields_match"] is None
    assert report["differences"] == [
        {
            "entity_id": "light.bad",
            "status": "unknown",
            "changed_fields": [],
        }
    ]
    assert report["summary"]["unchanged"] == 1
    assert report["summary"]["unknown"] == 1


def test_unresolved_yaml_is_not_compared(tmp_path: Path):
    disk = _discovery(tmp_path)
    disk["global_blockers"] = ["duplicate_mapping_key"]
    report = comparison.compare_disk_and_loaded_policy(
        disk, _loaded(), default_exposed_domains=DEFAULT_DOMAINS
    )
    assert report["status"] == "unavailable"
    assert report["reason"] == "disk_configuration_has_blockers"


@pytest.mark.parametrize(
    ("field", "bad_value", "code"),
    [
        ("expose_by_default", "yes", "invalid_loaded_default_exposure"),
        ("exposed_domains", "light", "invalid_loaded_exposed_domains"),
        ("entity_config", ["invalid"], "invalid_loaded_entity_config"),
    ],
)
def test_invalid_loaded_policy_fails_closed(
    tmp_path: Path, field: str, bad_value, code: str
):
    loaded = _loaded()
    loaded[field] = bad_value
    report = _compare(tmp_path, loaded)
    assert report["status"] == "unavailable"
    assert report["reason"] == code


def test_missing_disk_domain_metadata_cannot_be_guessed(tmp_path: Path):
    disk = _discovery(tmp_path)
    disk["rules"].pop("exposed_domains_declared")
    report = comparison.compare_disk_and_loaded_policy(
        disk, _loaded(), default_exposed_domains=DEFAULT_DOMAINS
    )
    assert report["status"] == "unavailable"
    assert report["reason"] == "unknown_disk_domain_source"


def _fake_homeassistant(monkeypatch, loaded, *, source="import", extra=False):
    ha = ModuleType("homeassistant")
    ha.__path__ = []
    components = ModuleType("homeassistant.components")
    components.__path__ = []
    google = ModuleType("homeassistant.components.google_assistant")
    google.__path__ = []
    const = ModuleType("homeassistant.components.google_assistant.const")
    const.DEFAULT_EXPOSED_DOMAINS = list(DEFAULT_DOMAINS)
    http = ModuleType("homeassistant.components.google_assistant.http")

    class GoogleConfig:
        def __init__(self, config):
            self._config = config

    http.GoogleConfig = GoogleConfig
    config_entries = ModuleType("homeassistant.config_entries")
    config_entries.SOURCE_IMPORT = "import"
    entry = SimpleNamespace(source=source, runtime_data=GoogleConfig(loaded))
    entries = [entry]
    if extra:
        entries.append(SimpleNamespace(source="cloud", runtime_data=None))

    for name, module in (
        ("homeassistant", ha),
        ("homeassistant.components", components),
        ("homeassistant.components.google_assistant", google),
        ("homeassistant.components.google_assistant.const", const),
        ("homeassistant.components.google_assistant.http", http),
        ("homeassistant.config_entries", config_entries),
    ):
        monkeypatch.setitem(sys.modules, name, module)

    hass = SimpleNamespace(
        config_entries=SimpleNamespace(async_entries=lambda domain: entries)
    )
    return hass


def test_active_ga_runtime_matches_disk(tmp_path: Path, monkeypatch):
    disk = _discovery(tmp_path)
    loaded = _loaded()
    before = copy.deepcopy(loaded)
    hass = _fake_homeassistant(monkeypatch, loaded)
    result = comparison.compare_loaded_google_on_ha(hass, disk)
    assert result["status"] == "match_compared_fields"
    assert result["loaded_policy_checked"] is True
    assert loaded == before


def test_after_reload_runtime_differs_from_disk(tmp_path: Path, monkeypatch):
    disk = _discovery(tmp_path)
    loaded = _loaded()
    hass = _fake_homeassistant(monkeypatch, loaded)
    loaded["entity_config"]["lock.front"]["expose"] = True
    result = comparison.compare_loaded_google_on_ha(hass, disk)
    assert result["status"] == "drift_detected"
    assert "expose" in result["differences"][0]["changed_fields"]


def test_cloud_only_and_mixed_cloud_cannot_be_certified(
    tmp_path: Path, monkeypatch
):
    disk = _discovery(tmp_path)
    cloud = _fake_homeassistant(monkeypatch, _loaded(), source="cloud")
    result = comparison.compare_loaded_google_on_ha(cloud, disk)
    assert result["status"] == "unavailable"
    assert result["reason"] == "manual_ga_entry_not_unique"

    mixed = _fake_homeassistant(monkeypatch, _loaded(), extra=True)
    result = comparison.compare_loaded_google_on_ha(mixed, disk)
    assert result["status"] == "unavailable"
    assert result["reason"] == "additional_google_assistant_entries_present"


def test_unexpected_runtime_object_is_not_trusted(tmp_path: Path, monkeypatch):
    disk = _discovery(tmp_path)
    hass = _fake_homeassistant(monkeypatch, _loaded())
    entry = hass.config_entries.async_entries("google_assistant")[0]
    entry.runtime_data = SimpleNamespace(_config=_loaded())
    result = comparison.compare_loaded_google_on_ha(hass, disk)
    assert result["status"] == "unavailable"
    assert result["reason"] == "unexpected_ga_runtime_type"


def test_comparison_never_writes_or_leaks_secrets(
    tmp_path: Path, monkeypatch
):
    disk = _discovery(tmp_path)
    loaded = _loaded()
    original = copy.deepcopy(loaded)
    hass = _fake_homeassistant(monkeypatch, loaded)

    def forbidden(*_args, **_kwargs):
        raise AssertionError("Unexpected write during policy comparison")

    monkeypatch.setattr(Path, "write_text", forbidden)
    monkeypatch.setattr(Path, "write_bytes", forbidden)
    report = comparison.compare_loaded_google_on_ha(hass, disk)
    assert report["status"] == "match_compared_fields"
    text = json.dumps(report)
    assert "1234-SUPER-SECRET" not in text
    assert "PRIVATE-KEY-NOT-FOR-REPORT" not in text
    assert "service_account" not in text
    assert loaded == original
    assert report["cutover_allowed"] is False


def test_invalid_new_disk_entity_remains_unknown_not_added(tmp_path: Path):
    content = SOURCE_YAML + (
        "    light.invalid_new:\n"
        "      expose: invalid\n"
    )
    report = _compare(tmp_path, content=content)
    assert report["status"] == "partial_unknown"
    assert report["compared_fields_match"] is None
    assert report["differences"] == [
        {
            "entity_id": "light.invalid_new",
            "status": "unknown",
            "changed_fields": [],
        }
    ]
    assert report["summary"]["unchanged"] == 2
