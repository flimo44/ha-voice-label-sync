"""Tests of the HA-native, read-only migration snapshot adapter.

Native HA modules are replaced by small fakes only at the API boundary.
The snapshot/projection implementations are the actual project modules.
"""

from __future__ import annotations

import copy
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / "custom_components" / "ha_voice_label_sync"


@pytest.fixture
def modules(monkeypatch):
    prefix = "_test_hvls_live_migration"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)

    result = []
    for stem in ("migration_exposure", "migration_live_snapshot"):
        name = f"{prefix}.{stem}"
        spec = importlib.util.spec_from_file_location(name, COMPONENT / f"{stem}.py")
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, name, module)
        spec.loader.exec_module(module)
        result.append(module)
    return SimpleNamespace(exposure=result[0], live=result[1])


def state(entity_id, *, traits=True):
    return SimpleNamespace(
        entity_id=entity_id,
        traits_supported=traits,
        attributes={"private_key": "DO_NOT_INCLUDE_IN_REPORT"},
    )


def entry(entity_id, *, hidden=None, category=None, disabled=None):
    return SimpleNamespace(
        entity_id=entity_id,
        hidden_by=hidden,
        entity_category=category,
        disabled_by=disabled,
        labels={"other_private_label"},
    )


def fake_native_ha(monkeypatch, states, entries, *, traits_fn=None):
    ha = ModuleType("homeassistant")
    ha.__path__ = []
    components = ModuleType("homeassistant.components")
    components.__path__ = []
    google = ModuleType("homeassistant.components.google_assistant")
    google.__path__ = []
    const = ModuleType("homeassistant.components.google_assistant.const")
    const.DEFAULT_EXPOSED_DOMAINS = ["light", "switch"]
    helper = ModuleType("homeassistant.components.google_assistant.helpers")
    helper.supported_traits_for_state = (
        traits_fn
        if traits_fn is not None
        else (lambda s: ["native-trait"] if s.traits_supported else [])
    )
    helpers = ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    er = ModuleType("homeassistant.helpers.entity_registry")

    class Registry:
        def __init__(self):
            self.entities = {e.entity_id: e for e in entries}

    registry = Registry()
    er.async_get = lambda hass: registry
    helpers.entity_registry = er
    for name, module in (
        ("homeassistant", ha),
        ("homeassistant.components", components),
        ("homeassistant.components.google_assistant", google),
        ("homeassistant.components.google_assistant.const", const),
        ("homeassistant.components.google_assistant.helpers", helper),
        ("homeassistant.helpers", helpers),
        ("homeassistant.helpers.entity_registry", er),
    ):
        monkeypatch.setitem(sys.modules, name, module)

    return SimpleNamespace(
        states=SimpleNamespace(async_all=lambda: list(states)),
        registry=registry,
    )


def discovery_for(*, default=True, domains=None, entity_entries=None):
    return {
        "mode": "assisted_migration",
        "source": {"status": "resolved"},
        "global_blockers": [],
        "rules": {
            "expose_by_default": "true" if default else "false",
            "rule_type": (
                "default_exposed_domains"
                if domains is None and default
                else "domain_limited" if default else "explicit_only"
            ),
            "exposed_domains": list(domains or []),
        },
        "entities": list(entity_entries or []),
    }


def test_snapshot_uses_native_entities_and_default_domains(
    modules, monkeypatch
):
    states = [
        state("light.present"),
        state("light.hidden"),
        state("switch.unsupported", traits=False),
        state("sensor.no_registry"),
    ]
    entries = [
        entry("light.present"),
        entry("light.hidden", hidden="user"),
        entry("switch.unsupported"),
        entry("switch.disabled", disabled="user"),
    ]
    hass = fake_native_ha(monkeypatch, states, entries)
    original_states = copy.deepcopy(states)
    original_entries = copy.deepcopy(entries)

    snapshot = modules.live.capture_live_google_runtime(hass)
    by_id = {row["entity_id"]: row for row in snapshot["entities"]}

    assert snapshot["status"] == "complete"
    assert snapshot["inventory_complete"] is True
    assert snapshot["default_exposed_domains"] == ["light", "switch"]
    assert by_id["light.present"]["google_traits_supported"] is True
    assert by_id["switch.unsupported"]["google_traits_supported"] is False
    assert by_id["light.hidden"]["hidden_by"] == "hidden"
    assert by_id["switch.disabled"]["state_present"] is False
    assert by_id["switch.disabled"]["disabled_by"] == "disabled"
    assert by_id["sensor.no_registry"]["registry_present"] is False

    # Only sanitized metadata is returned, never attributes, labels or secrets.
    serialized = json.dumps(snapshot)
    assert "DO_NOT_INCLUDE_IN_REPORT" not in serialized
    assert "other_private_label" not in serialized
    assert states == original_states
    assert entries == original_entries


def test_one_trait_probe_failure_does_not_hide_other_entities(
    modules, monkeypatch
):
    def traits(state):
        if state.entity_id == "light.bad":
            raise RuntimeError("sensor credential SHOULD_NOT_LEAK")
        return ["supported"]

    hass = fake_native_ha(
        monkeypatch,
        [state("light.good"), state("light.bad")],
        [entry("light.good"), entry("light.bad")],
        traits_fn=traits,
    )
    snapshot = modules.live.capture_live_google_runtime(hass)
    by_id = {row["entity_id"]: row for row in snapshot["entities"]}
    assert snapshot["status"] == "partial"
    assert snapshot["inventory_complete"]
    assert snapshot["trait_check_failures"] == 1
    assert by_id["light.good"]["google_traits_supported"] is True
    assert by_id["light.bad"]["google_traits_supported"] is None
    assert "SHOULD_NOT_LEAK" not in json.dumps(snapshot)


def test_runtime_without_entity_registry_entry_is_not_invented(modules):
    snapshot = modules.live.build_runtime_snapshot(
        [state("light.legacy")],
        [],
        lambda _state: True,
        default_exposed_domains=["light"],
    )
    assert snapshot["entities"][0]["registry_present"] is False
    assert snapshot["entities"][0]["state_present"] is True


def test_invalid_probe_return_means_unknown_not_negative(modules):
    snapshot = modules.live.build_runtime_snapshot(
        [state("light.legacy")],
        [],
        lambda _state: None,
        default_exposed_domains=["light"],
    )
    assert snapshot["status"] == "partial"
    assert snapshot["entities"][0]["google_traits_supported"] is None


def test_duplicate_active_state_or_registry_is_refused(modules):
    with pytest.raises(modules.live.LiveSnapshotError, match="duplicate_state"):
        modules.live.build_runtime_snapshot(
            [state("light.a"), state("light.a")],
            [],
            lambda _state: True,
            default_exposed_domains=["light"],
        )
    with pytest.raises(modules.live.LiveSnapshotError, match="duplicate_registry"):
        modules.live.build_runtime_snapshot(
            [],
            [entry("light.a"), entry("light.a")],
            lambda _state: True,
            default_exposed_domains=["light"],
        )


def test_missing_or_invalid_native_snapshot_fails_closed(modules, monkeypatch):
    hass = fake_native_ha(monkeypatch, [], [])
    hass.states.async_all = lambda: (_ for _ in ()).throw(RuntimeError("oops"))
    snapshot = modules.live.capture_live_google_runtime(hass)
    assert snapshot["status"] == "unavailable"
    assert snapshot["inventory_complete"] is False
    assert snapshot["entities"] == []
    assert snapshot["reason"] == "ha_state_or_registry_unavailable"


def test_projection_bridge_uses_actual_native_traits(
    modules, monkeypatch
):
    states = [
        state("light.visible"),
        state("light.hidden"),
        state("switch.explicit", traits=False),
        state("sensor.no_default"),
    ]
    entries = [
        entry("light.visible"),
        entry("light.hidden", hidden="user"),
        entry("switch.explicit"),
    ]
    hass = fake_native_ha(monkeypatch, states, entries)
    discovered = discovery_for(
        entity_entries=[
            {
                "entity_id": "switch.explicit",
                "yaml_exposure_intent": "expose",
                "reasons": [],
            }
        ]
    )
    report = modules.live.project_discovery_on_live_ha(hass, discovered)
    rows = {row["entity_id"]: row for row in report["entities"]}
    assert report["status"] == "read_only_projection"
    assert report["runtime_snapshot_status"] == "complete"
    assert report["summary"] == {
        "considered": 4,
        "exposed": 1,
        "not_exposed": 3,
        "unknown": 0,
    }
    assert rows["light.visible"]["ha_sync_exposure"] == "exposed"
    assert rows["light.hidden"]["ha_sync_exposure"] == "not_exposed"
    assert rows["switch.explicit"]["ha_sync_exposure"] == "not_exposed"
    assert rows["sensor.no_default"]["ha_sync_exposure"] == "not_exposed"
    assert report["runtime_policy_verified"] is False
    assert report["cutover_allowed"] is False


def test_partial_probe_stays_unknown_in_combined_report(
    modules, monkeypatch
):
    def traits(_state):
        raise ValueError("possible sensitive data")

    hass = fake_native_ha(
        monkeypatch, [state("light.unknown")], [], traits_fn=traits
    )
    report = modules.live.project_discovery_on_live_ha(
        hass, discovery_for(default=True, domains=["light"])
    )
    assert report["summary"]["unknown"] == 1
    assert report["runtime_snapshot_status"] == "partial"
    assert report["trait_check_failures"] == 1
    assert report["entities"][0]["google_home_state"] == "unknown"
    assert report["cutover_allowed"] is False


def test_global_blocker_does_not_authorize_migration(
    modules, monkeypatch
):
    hass = fake_native_ha(
        monkeypatch, [state("light.good")], [entry("light.good")]
    )
    discovery = discovery_for()
    discovery["global_blockers"] = ["duplicate_mapping_key"]
    report = modules.live.project_discovery_on_live_ha(hass, discovery)
    assert report["status"] == "unavailable"
    assert report["cutover_allowed"] is False


def test_bridge_read_only_even_with_complete_runtime(
    modules, monkeypatch, tmp_path
):
    hass = fake_native_ha(
        monkeypatch, [state("light.good")], [entry("light.good")]
    )
    original_entries = copy.deepcopy(list(hass.registry.entities.values()))

    def forbidden(*_args, **_kwargs):
        raise AssertionError("Unexpected write")

    monkeypatch.setattr(Path, "write_text", forbidden)
    monkeypatch.setattr(Path, "write_bytes", forbidden)
    report = modules.live.project_discovery_on_live_ha(
        hass, discovery_for(default=True)
    )
    assert report["status"] == "read_only_projection"
    assert report["cutover_allowed"] is False
    assert list(hass.registry.entities.values()) == original_entries
