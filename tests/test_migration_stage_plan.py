"""Regression tests for conservative read-only migration decision preflight."""

from __future__ import annotations

import copy
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType

import pytest

COMPONENT = (
    Path(__file__).resolve().parents[1] / "custom_components" / "ha_voice_label_sync"
)


@pytest.fixture
def planner(monkeypatch):
    prefix = "_test_hvls_migration_stage_plan"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)
    name = f"{prefix}.migration_stage_plan"
    spec = importlib.util.spec_from_file_location(
        name, COMPONENT / "migration_stage_plan.py"
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, name, module)
    spec.loader.exec_module(module)
    return module


def row(
    entity_id,
    *,
    category="candidate_for_review",
    projection="exposed",
    intent="expose",
    metadata=None,
    reasons=None,
    **extra,
):
    return {
        "entity_id": entity_id,
        "category": category,
        "disk_ha_sync_projection": projection,
        "yaml_exposure_intent": intent,
        "customization_fields_present": list(metadata or []),
        "reasons": list(reasons or []),
        "active_google_home_state": "unknown",
        **extra,
    }


def report(*rows, status="match_compared_fields", differences=None):
    return {
        "schema_version": 1,
        "read_only": True,
        "mode": "assisted_migration",
        "source": {
            "status": "resolved",
            "locations": [
                {"path": "configuration.yaml", "digest_sha256": "a" * 64}
            ],
        },
        "global_blockers": [],
        "runtime_snapshot": {"status": "complete"},
        "disk_projection": {
            "status": "read_only_projection",
            "basis": "disk_yaml_only",
            "active_runtime_policy_certified": False,
        },
        "loaded_policy": {
            "status": status,
            "rule_changes": [],
            "differences": differences or [],
        },
        "entities": list(rows),
        "cutover_allowed": False,
    }


def facts(*entities):
    return {
        name: {
            "registry_id": f"registry_{name.replace('.', '_')}",
            "label_present": False,
            "eligible": True,
        }
        for name in entities
    }


def selections(*entities, **overrides):
    data = {name: {"action": "import"} for name in entities}
    data.update(overrides)
    return data


def plan(planner, data, decisions, observed):
    return planner.build_reviewed_stage_plan(
        data, decisions, observed, label_id="google_assistant"
    )


def by_id(result):
    return {row["entity_id"]: row for row in result["entities"]}


def test_70_good_entities_continue_despite_10_local_errors(planner):
    good = [f"light.good_{i}" for i in range(70)]
    bad = [f"light.bad_{i}" for i in range(10)]
    diagnostic = report(
        *[row(name) for name in good],
        *[
            row(
                name, category="needs_review",
                projection="unknown",
                reasons=["invalid_room_option"],
            )
            for name in bad
        ],
        status="partial_unknown",
        differences=[
            {"entity_id": name, "status": "unknown", "changed_fields": []}
            for name in bad
        ],
    )
    decisions = selections(*(good + bad))
    result = plan(planner, diagnostic, decisions, facts(*(good + bad)))
    assert result["summary"]["considered"] == 80
    assert result["summary"]["proposed_label_additions"] == 70
    assert result["summary"]["needs_review"] == 10
    assert set(item["entity_id"] for item in result["label_additions_proposed"]) == (
        set(good)
    )
    assert result["apply_allowed"] is False
    assert result["cutover_allowed"] is False


def test_explicit_exclusion_preserved_by_default_and_not_imported(planner):
    excluded = row(
        "lock.front", category="explicitly_excluded",
        projection="not_exposed", intent="exclude",
        reasons=["explicitly_excluded"],
    )
    diag = report(excluded)
    result = plan(planner, diag, {}, facts("lock.front"))
    assert result["label_additions_proposed"] == []
    assert by_id(result)["lock.front"]["decision"] == "keep"
    assert by_id(result)["lock.front"]["decision_defaulted"] is True
    assert by_id(result)["lock.front"]["status"] == "keep_no_label_change"

    result2 = plan(
        planner, diag,
        {"lock.front": {
            "action": "import",
            "acknowledge_sensitive_exposure": True,
        }},
        facts("lock.front"),
    )
    assert result2["label_additions_proposed"] == []
    assert (
        "explicit_exclusion_must_be_preserved"
        in by_id(result2)["lock.front"]["reasons"]
    )


def test_explicit_personalization_never_silently_lost(planner):
    person = row(
        "light.custom", category="needs_review",
        metadata=["name", "room", "aliases"],
        private_name="VERY_PRIVATE_CUSTOM_GOOGLE_NAME",
        private_aliases=["VERY_PRIVATE_CUSTOM_GOOGLE_ALIAS"],
    )
    diag = report(person)
    obs = facts("light.custom")
    proposals = [
        {"action": "import"},
        {"action": "import", "metadata_policy": "retain_manual_yaml"},
        {
            "action": "import",
            "metadata_policy": "discard_after_review",
            "acknowledge_change": True,
        },
    ]
    for decision in proposals:
        result = plan(planner, diag, {"light.custom": decision}, obs)
        entry = by_id(result)["light.custom"]
        assert entry["status"] == "needs_review"
        assert "metadata_preservation_not_yet_implemented" in entry["reasons"]
        assert result["label_additions_proposed"] == []
        serialized = json.dumps(result)
        assert "VERY_PRIVATE_CUSTOM_GOOGLE_NAME" not in serialized
        assert "VERY_PRIVATE_CUSTOM_GOOGLE_ALIAS" not in serialized
        assert "private_name" not in serialized


def test_sensitive_exposure_needs_separate_confirmation(planner):
    for entity in ("lock.entry", "alarm_control_panel.house", "cover.garage"):
        diag = report(row(entity))
        default = plan(planner, diag, selections(entity), facts(entity))
        assert default["label_additions_proposed"] == []
        assert "sensitive_exposure_needs_acknowledgement" in (
            by_id(default)[entity]["reasons"]
        )
        acknowledged = plan(
            planner, diag,
            {entity: {
                "action": "import",
                "acknowledge_sensitive_exposure": True,
            }},
            facts(entity),
        )
        assert len(acknowledged["label_additions_proposed"]) == 1
        assert acknowledged["cutover_allowed"] is False


def test_local_loaded_policy_drift_does_not_block_unrelated(planner):
    good, drifted = "light.good", "light.drifted"
    diag = report(
        row(good), row(drifted),
        status="drift_detected",
        differences=[{
            "entity_id": drifted,
            "status": "changed",
            "changed_fields": ["room"],
            "private_value": "DO_NOT_LEAK",
        }],
    )
    result = plan(
        planner, diag, selections(good, drifted), facts(good, drifted)
    )
    assert [op["entity_id"] for op in result["label_additions_proposed"]] == [
        good
    ]
    assert by_id(result)[drifted]["status"] == "needs_review"
    assert "DO_NOT_LEAK" not in json.dumps(result)


def test_global_rule_drift_fails_closed(planner):
    diag = report(row("light.good"))
    diag["loaded_policy"]["rule_changes"] = ["expose_by_default"]
    result = plan(
        planner, diag, selections("light.good"), facts("light.good")
    )
    assert "global_exposure_rules_differ" in result["global_blockers"]
    assert result["label_additions_proposed"] == []
    assert result["cutover_allowed"] is False


@pytest.mark.parametrize(
    ("key", "value", "code"),
    [
        ("source", {"status": "ambiguous", "locations": []},
         "source_not_resolved"),
        ("runtime_snapshot", {"status": "unavailable"},
         "ha_runtime_unavailable"),
        ("loaded_policy", {"status": "unavailable", "differences": []},
         "loaded_policy_unavailable"),
        ("mode", "new_configuration", "manual_migration_source_required"),
    ],
)
def test_critical_global_sources_block_proposals(
    planner, key, value, code
):
    diag = report(row("light.good"))
    diag[key] = value
    result = plan(planner, diag, selections("light.good"), facts("light.good"))
    assert code in result["global_blockers"]
    assert result["label_additions_proposed"] == []


def test_incomplete_source_digest_fails_closed(planner):
    diag = report(row("light.good"))
    diag["source"]["locations"][0]["digest_sha256"] = "not-a-sha"
    result = plan(
        planner, diag, selections("light.good"), facts("light.good")
    )
    assert "source_hashes_missing" in result["global_blockers"]
    assert result["label_additions_proposed"] == []


def test_registry_identity_membership_or_eligibility_missing(planner):
    entity = "light.good"
    diag = report(row(entity))
    for fields in (
        {},
        {"registry_id": None, "label_present": False, "eligible": True},
        {"registry_id": "reg", "label_present": None, "eligible": True},
        {"registry_id": "reg", "label_present": False, "eligible": False},
    ):
        result = plan(planner, diag, selections(entity), {entity: fields})
        assert result["label_additions_proposed"] == []
        assert by_id(result)[entity]["status"] == "needs_review"


def test_already_labeled_is_no_op(planner):
    entity = "light.good"
    observed = facts(entity)
    observed[entity]["label_present"] = True
    result = plan(planner, report(row(entity)), selections(entity), observed)
    assert result["label_additions_proposed"] == []
    assert by_id(result)[entity]["status"] == "already_labeled"


def test_keep_disable_remove_require_manual_policy_and_confirmation(planner):
    entity = "light.good"
    diag = report(row(entity))
    observed = facts(entity)
    keep = plan(planner, diag, {entity: {"action": "keep"}}, observed)
    assert "effective_exposure_preservation_not_proven" in (
        by_id(keep)[entity]["reasons"]
    )
    for action in ("disable", "remove"):
        result = plan(planner, diag, {entity: {"action": action}}, observed)
        assert result["label_additions_proposed"] == []
        reasons = by_id(result)[entity]["reasons"]
        assert "destructive_choice_needs_acknowledgement" in reasons
        assert "manual_cutover_policy_required" in reasons
        confirmed = plan(
            planner, diag, {entity: {
                "action": action, "acknowledge_change": True
            }}, observed,
        )
        assert confirmed["label_additions_proposed"] == []
        assert by_id(confirmed)[entity]["status"] == "needs_review"


def test_implicit_exposure_requires_opt_in_and_does_not_change_default(planner):
    entity = "switch.new"
    diag = report(row(
        entity, category="implicitly_exposed", projection="exposed",
        intent="not_configured", reasons=["implicitly_exposed"],
    ))
    pending = plan(planner, diag, {}, facts(entity))
    assert pending["label_additions_proposed"] == []
    assert by_id(pending)[entity]["status"] == "needs_review"
    chosen = plan(planner, diag, selections(entity), facts(entity))
    assert len(chosen["label_additions_proposed"]) == 1
    assert chosen["data_freshness_verified_at_write"] is False
    assert chosen["metadata_preservation_verified"] is False


def test_no_unreviewed_write_or_mutation(planner):
    diag = report(row("light.one"), row(
        "light.other", category="needs_review", projection="unknown",
    ))
    choices = selections("light.one")
    observed = facts("light.one", "light.other")
    before = copy.deepcopy((diag, choices, observed))
    result = plan(planner, diag, choices, observed)
    assert (diag, choices, observed) == before
    assert result["read_only"] is True
    assert result["cutover_allowed"] is False
    assert result["apply_allowed"] is False
    assert result["label_additions_proposed"] == [{
        "entity_id": "light.one",
        "registry_id": "registry_light_one",
        "label_id": "google_assistant",
        "expected_before": False,
        "expected_after": True,
    }]
    assert result["review_token_sha256"]
    assert result["google_home_state_verified"] is False


def test_conflicting_or_unrecognized_input_rejected(planner):
    diag = report(row("light.good"))
    with pytest.raises(planner.StagePlanError, match="decision_for_unknown_entity"):
        plan(planner, diag, selections("light.missing"), facts("light.good"))
    diag["entities"].append(row("light.good"))
    with pytest.raises(planner.StagePlanError, match="duplicate_diagnostic_entity"):
        plan(planner, diag, {}, facts("light.good"))


def test_bad_decision_is_local_and_does_not_hide_valid_row(planner):
    first, second = "light.one", "light.two"
    diag = report(row(first), row(second))
    result = plan(
        planner, diag,
        {first: {"action": "import"}, second: {"action": "unknown"}},
        facts(first, second),
    )
    assert [op["entity_id"] for op in result["label_additions_proposed"]] == [
        first
    ]
    assert "decision_invalid" in by_id(result)[second]["reasons"]


def test_unknown_projections_never_assumed_safe(planner):
    diag = report(row("light.unknown", projection="unknown"))
    result = plan(
        planner, diag, selections("light.unknown"), facts("light.unknown")
    )
    assert result["label_additions_proposed"] == []
    assert "currently_exposed_state_not_proven" in (
        by_id(result)["light.unknown"]["reasons"]
    )


def test_metadata_evidence_corrupted_blocks_operation(planner):
    diag = report(row("light.bad", metadata=["invalid_field"]))
    result = plan(
        planner, diag, selections("light.bad"), facts("light.bad")
    )
    assert result["label_additions_proposed"] == []
    assert "metadata_evidence_invalid" in by_id(result)["light.bad"]["reasons"]
