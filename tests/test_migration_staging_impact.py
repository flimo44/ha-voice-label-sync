"""Loaded manual Google Assistant label-only staging impact regressions.

Synthetic native GoogleConfig and registry are read-only. These tests are
not authorization to mutate a real Home Assistant registry.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import Mock

import pytest

ROOT = (
    Path(__file__).resolve().parents[1]
    / "custom_components" / "ha_voice_label_sync"
)


@pytest.fixture
def impact():
    spec = importlib.util.spec_from_file_location(
        "_test_loaded_ga_stage_impact", ROOT / "migration_staging_impact.py"
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _diag(ids, *, policy="match_compared_fields", runtime="complete"):
    return {
        "entities": [{"entity_id": item} for item in ids],
        "loaded_policy": {"status": policy},
        "runtime_snapshot": {"status": runtime},
    }


def _plan(ids, *, blockers=None):
    return {
        "label_additions_proposed": [
            {"entity_id": item} for item in ids
        ],
        "global_blockers": blockers or [],
    }


def _one(impact, entity_id="light.kitchen", *,
         default=False, domain=True, auxiliary=False, explicit=None,
         actual=None, status="captured"):
    if actual is None:
        actual = (
            explicit if explicit is not None
            else default and domain and not auxiliary
        )
    return {
        "status": "captured",
        "observations": {
            entity_id: {
                "status": status,
                "explicit_expose": explicit,
                "default_exposure": default,
                "domain_allowed": domain,
                "auxiliary": auxiliary,
                "native_before": actual,
            }
        },
    }


def test_exposed_true_remains_true_in_label_only_projection(impact):
    original = _one(impact, explicit=True, actual=True)
    result = impact.assess_label_staging_impact(
        _diag(["light.kitchen"]), _plan(["light.kitchen"]), original,
    )
    assert result["status"] == "no_manual_policy_delta_detected"
    assert result["entities"][0]["native_loaded_before"] is True
    assert result["entities"][0]["hypothetical_after_label_only"] is True
    assert result["entities"][0]["manual_policy_delta_projected"] is False
    assert result["stage_allowed"] is False
    assert result["cutover_allowed"] is False
    assert result["other_label_consumers_verified"] is False
    assert result["google_home_state_verified"] is False


def test_explicit_false_overrides_expose_by_default_true(impact):
    observed = _one(
        impact, default=True, domain=True, explicit=False, actual=False
    )
    result = impact.assess_label_staging_impact(
        _diag(["light.kitchen"]), _plan(["light.kitchen"]), observed,
    )
    assert result["entities"][0]["hypothetical_after_label_only"] is False
    assert result["stage_allowed"] is False


@pytest.mark.parametrize(
    "default,domain,auxiliary,expected",
    [
        (True, True, False, True),
        (True, False, False, False),
        (True, True, True, False),
        (False, True, False, False),
    ],
)
def test_loaded_default_domain_visibility_precedence(
    impact, default, domain, auxiliary, expected
):
    evidence = _one(
        impact, default=default, domain=domain,
        auxiliary=auxiliary, actual=expected,
    )
    row = impact.assess_label_staging_impact(
        _diag(["light.kitchen"]), _plan(["light.kitchen"]), evidence,
    )["entities"][0]
    assert row["hypothetical_after_label_only"] is expected
    assert row["status"] == "no_manual_policy_delta_detected"


def test_native_google_disagreement_is_per_entity_blocker(impact):
    observed = _one(
        impact, default=False, domain=True, actual=True,
    )
    result = impact.assess_label_staging_impact(
        _diag(["light.kitchen"]), _plan(["light.kitchen"]), observed,
    )
    assert result["status"] == "local_review_pending"
    assert result["summary"]["needs_review"] == 1
    assert "manual_google_runtime_rule_disagreement" in (
        result["entities"][0]["reasons"]
    )
    assert result["stage_allowed"] is False


def test_70_valid_10_unknown_local_entities_remain_isolated(impact):
    ids = [f"light.good_{i}" for i in range(70)]
    bad = [f"light.bad_{i}" for i in range(10)]
    captured = {
        "status": "captured", "observations": {
            **{
                entity: {
                    "status": "captured",
                    "explicit_expose": True,
                    "default_exposure": False,
                    "domain_allowed": True,
                    "auxiliary": False,
                    "native_before": True,
                }
                for entity in ids
            },
            **{
                entity: {"status": "native_google_exposure_unavailable"}
                for entity in bad
            },
        },
    }
    result = impact.assess_label_staging_impact(
        _diag(ids + bad), _plan(ids + bad), captured,
    )
    assert result["status"] == "local_review_pending"
    assert result["summary"]["manual_policy_unchanged_projected"] == 70
    assert result["summary"]["needs_review"] == 10
    assert result["stage_allowed"] is False


def test_incomplete_runtime_inventory_is_global_blocker(impact):
    result = impact.assess_label_staging_impact(
        _diag(["light.kitchen"], runtime="partial"),
        _plan(["light.kitchen"]),
        _one(impact, explicit=True, actual=True),
    )
    assert result["status"] == "global_review_blocked"
    assert "incomplete_ha_runtime_snapshot" in result["global_blockers"]


@pytest.mark.parametrize("state", ["partial_unknown", "drift_detected", "unavailable"])
def test_loaded_policy_mismatch_or_ambiguity_blocks_globally(impact, state):
    result = impact.assess_label_staging_impact(
        _diag(["light.kitchen"], policy=state),
        _plan(["light.kitchen"]),
        _one(impact, explicit=True, actual=True),
    )
    assert result["status"] == "global_review_blocked"
    assert "loaded_manual_policy_not_fully_matching_disk" in (
        result["global_blockers"]
    )


def test_existing_planner_global_blockers_remain_global(impact):
    result = impact.assess_label_staging_impact(
        _diag(["light.kitchen"]),
        _plan(["light.kitchen"], blockers=["global_exposure_rules_differ"]),
        _one(impact, explicit=True, actual=True),
    )
    assert "global_exposure_rules_differ" in result["global_blockers"]
    assert result["stage_allowed"] is False


def test_no_proposals_never_implies_staging_permission(impact):
    result = impact.assess_label_staging_impact(
        _diag(["light.kitchen"]), _plan([]),
        {"status": "captured", "observations": {}},
    )
    assert result["status"] == "no_label_additions_proposed"
    assert result["entities"] == []
    assert result["stage_allowed"] is False


def test_absent_loaded_ga_runtime_is_global_blocker(impact):
    result = impact.assess_label_staging_impact(
        _diag(["light.kitchen"]), _plan(["light.kitchen"]),
        {"status": "unavailable", "reason": "loaded_ga_runtime_unavailable"},
    )
    assert result["status"] == "global_review_blocked"
    assert "loaded_manual_ga_impact_unavailable" in result["global_blockers"]


def test_missing_one_candidate_observation_is_local(impact):
    result = impact.assess_label_staging_impact(
        _diag(["light.kitchen"]), _plan(["light.kitchen"]),
        {"status": "captured", "observations": {}},
    )
    assert result["summary"]["needs_review"] == 1
    assert result["entities"][0]["manual_policy_delta_projected"] is None


@pytest.mark.parametrize("proposals", [
    [{"entity_id": "light.missing"}],
    [{"entity_id": "light.kitchen"}, {"entity_id": "light.kitchen"}],
    [{"entity_id": 17}],
])
def test_unreviewed_or_duplicate_proposals_rejected(impact, proposals):
    with pytest.raises(
        impact.StagingImpactError, match="impact_proposals_invalid"
    ):
        impact.assess_label_staging_impact(
            _diag(["light.kitchen"]),
            {"label_additions_proposed": proposals, "global_blockers": []},
            {"status": "captured", "observations": {}},
        )


def test_true_false_are_strict_booleans_not_ints(impact):
    invalid = _one(impact, explicit=True, actual=True)
    invalid["observations"]["light.kitchen"]["default_exposure"] = 1
    result = impact.assess_label_staging_impact(
        _diag(["light.kitchen"]), _plan(["light.kitchen"]), invalid,
    )
    assert result["status"] == "local_review_pending"


def _fake_ha(monkeypatch, *, overrides=None, default=False, domains=None,
             registry=None, active_entries=1, same_type=True, native=None):
    overrides = overrides if overrides is not None else {}
    domains = domains if domains is not None else ["light"]
    updates = Mock()

    class GoogleConfig:
        def __init__(self):
            self._config = {
                "expose_by_default": default,
                "exposed_domains": domains,
                "entity_config": overrides,
                "private_key": "PRIVATE_KEY_NOT_FOR_UI",
                "secure_devices_pin": "1234",
            }

        def should_expose(self, entity_id):
            if native is not None:
                return native.get(entity_id)
            entry = registry_data.async_get(entity_id)
            auxiliary = (
                entry is not None and (
                    entry.entity_category is not None
                    or entry.hidden_by is not None
                )
            )
            explicit = self._config["entity_config"].get(
                entity_id, {}
            ).get("expose")
            return bool(
                (default and entity_id.split(".", 1)[0] in domains
                 and not auxiliary and explicit is not False)
                or explicit
            )

    registry = registry if registry is not None else {
        "light.kitchen": SimpleNamespace(
            entity_category=None, hidden_by=None,
            labels={"original_label"},
        )
    }
    registry_data = SimpleNamespace(
        async_get=Mock(side_effect=lambda entity: registry.get(entity)),
        async_update_entity=updates,
    )
    runtime = GoogleConfig() if same_type else type(
        "CustomGoogleConfig", (GoogleConfig,), {}
    )()
    entries = [
        SimpleNamespace(source="import", runtime_data=runtime)
    ]
    if active_entries > 1:
        entries += [
            SimpleNamespace(source="ui", runtime_data=None)
            for _ in range(active_entries - 1)
        ]

    modules = {}
    for name in (
        "homeassistant",
        "homeassistant.components",
        "homeassistant.components.google_assistant",
        "homeassistant.components.google_assistant.http",
        "homeassistant.config_entries",
        "homeassistant.helpers",
        "homeassistant.helpers.entity_registry",
    ):
        modules[name] = ModuleType(name)
        monkeypatch.setitem(sys.modules, name, modules[name])
    modules["homeassistant.components.google_assistant.http"].GoogleConfig = (
        GoogleConfig
    )
    modules["homeassistant.config_entries"].SOURCE_IMPORT = "import"
    modules["homeassistant.helpers.entity_registry"].async_get = (
        Mock(return_value=registry_data)
    )
    hass = SimpleNamespace(
        config_entries=SimpleNamespace(
            async_entries=Mock(return_value=entries)
        )
    )
    return hass, registry_data, updates


def test_live_capture_never_modifies_labels_or_ga_configuration(
    impact, monkeypatch
):
    overrides = {
        "light.kitchen": {
            "expose": True,
            "name": "PRIVATE Google Display Name",
            "room": "PRIVATE ROOM",
            "aliases": ["PRIVATE ALIAS"],
        }
    }
    hass, registry, updates = _fake_ha(
        monkeypatch, overrides=overrides,
    )
    result = impact.capture_loaded_ga_label_impact(
        hass, ["light.kitchen"]
    )
    assert result["status"] == "captured"
    assert result["observations"]["light.kitchen"]["native_before"] is True
    registry.async_get.assert_called_once_with("light.kitchen")
    updates.assert_not_called()
    payload = json.dumps(result)
    for secret in (
        "PRIVATE", "Display Name", "ALIAS", "ROOM", "1234",
        "PRIVATE_KEY_NOT_FOR_UI",
    ):
        assert secret not in payload


def test_unexpected_implementation_fails_closed(impact, monkeypatch):
    hass, _, _ = _fake_ha(monkeypatch, same_type=False)
    result = impact.capture_loaded_ga_label_impact(
        hass, ["light.kitchen"]
    )
    assert result["status"] == "unavailable"
    assert result["reason"] == "unexpected_ga_runtime_type"


def test_coexisting_nonmanual_google_entry_fails_closed(impact, monkeypatch):
    hass, _, _ = _fake_ha(monkeypatch, active_entries=2)
    result = impact.capture_loaded_ga_label_impact(
        hass, ["light.kitchen"]
    )
    assert result["status"] == "unavailable"
    assert result["reason"] == "additional_ga_entries_present"


def test_invalid_loaded_entity_override_is_local(impact, monkeypatch):
    hass, _, _ = _fake_ha(
        monkeypatch, overrides={"light.kitchen": {"expose": "false"}}
    )
    result = impact.capture_loaded_ga_label_impact(
        hass, ["light.kitchen"]
    )
    assert result["status"] == "captured"
    assert result["observations"]["light.kitchen"]["status"] == (
        "loaded_policy_entity_invalid"
    )


def test_native_oracle_failure_only_affects_one_entity(impact, monkeypatch):
    hass, _, updates = _fake_ha(
        monkeypatch, registry={
            "light.kitchen": SimpleNamespace(
                entity_category=None, hidden_by=None
            ),
            "light.second": SimpleNamespace(
                entity_category=None, hidden_by=None
            ),
        },
        native={"light.kitchen": True, "light.second": None},
    )
    result = impact.capture_loaded_ga_label_impact(
        hass, ["light.kitchen", "light.second"]
    )
    assert result["observations"]["light.kitchen"]["status"] == "captured"
    assert result["observations"]["light.second"]["status"] == (
        "native_google_exposure_not_bool"
    )
    updates.assert_not_called()


def test_no_registry_entity_is_local_unknown(impact, monkeypatch):
    hass, _, _ = _fake_ha(monkeypatch, registry={})
    result = impact.capture_loaded_ga_label_impact(
        hass, ["light.kitchen"]
    )
    assert result["observations"]["light.kitchen"]["status"] == (
        "native_entity_registry_unavailable"
    )
    assert result["manual_google_policy_checked"] is True


@pytest.mark.parametrize("value", [True, "light", [None], ["light", 2]])
def test_invalid_exposed_domain_shape_refuses_capture(
    impact, monkeypatch, value
):
    hass, _, _ = _fake_ha(monkeypatch, domains=value)
    result = impact.capture_loaded_ga_label_impact(
        hass, ["light.kitchen"]
    )
    assert result["status"] == "unavailable"
    assert result["reason"] == "invalid_loaded_policy_shape"


def test_other_label_consumers_always_remain_unverified(impact):
    result = impact.assess_label_staging_impact(
        _diag(["light.kitchen"]),
        _plan(["light.kitchen"]),
        _one(impact, explicit=True, actual=True),
    )
    assert "external_label_consumers_unverified" in result["scope_limitations"]
    assert "no_postwrite_native_observation" in result["scope_limitations"]
    assert result["stage_allowed"] is False
    assert result["apply_allowed"] is False
    assert result["cutover_allowed"] is False
