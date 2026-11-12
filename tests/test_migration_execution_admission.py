"""Non-executing execution-admission policy: adversarial evidence contract."""

from __future__ import annotations

import ast
import importlib.util
from copy import deepcopy
from pathlib import Path

import pytest

ROOT = (
    Path(__file__).resolve().parents[1]
    / "custom_components" / "ha_voice_label_sync"
)
SPEC = importlib.util.spec_from_file_location(
    "_hvls_readonly_admission_policy",
    ROOT / "migration_execution_admission.py",
)
assert SPEC and SPEC.loader
POLICY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(POLICY)

BASE_SHA = "b" * 64
TOKEN = "a" * 64
ENTITY = "light.good"


@pytest.fixture
def evidence():
    return {
        "entity_id": ENTITY,
        "saved_draft": {
            "status": "saved_unapproved_draft",
            "stored_choices_unapproved": True,
            "draft_revision": 3,
            "baseline_manifest_sha256": BASE_SHA,
            "source_evidence_sha256": "c" * 64,
            "review_token_sha256": TOKEN,
            "journal_revision": 0,
            "journal_phase": "baseline_ready",
            "decisions": {
                ENTITY: {"action": "import"},
                "switch.unrelated": {"action": "keep"},
            },
        },
        "journal": {
            "schema_version": 1,
            "phase": "baseline_ready",
            "revision": 0,
            "baseline_manifest_sha256": BASE_SHA,
            "operations": [],
        },
        "sources_verified": {
            "verified": True, "manifest_sha256": BASE_SHA,
        },
        "review": {
            "read_only": True,
            "protected_baseline_status": "verified",
            "apply_allowed": False,
            "cutover_allowed": False,
            "diagnostic": {
                "read_only": True,
                "mode": "assisted_migration",
                "source": {"status": "resolved"},
                "global_blockers": [],
                "loaded_policy": {
                    "status": "match_compared_fields",
                    "differences": [], "rule_changes": [],
                },
            },
            "preflight": {
                "read_only": True,
                "status": "read_only_stage_preflight",
                "global_blockers": [],
                "review_token_sha256": TOKEN,
                "source_evidence_sha256": "c" * 64,
                "label_additions_proposed": [{
                    "entity_id": ENTITY,
                    "registry_id": "uuid_good",
                    "label_id": "google_assistant",
                    "expected_before": False,
                    "expected_after": True,
                }],
            },
            "pre_stage_impact": {
                "read_only": True,
                "cutover_allowed": False,
                "google_home_state_verified": False,
                "status": "no_manual_policy_delta_detected",
                "global_blockers": [],
            },
            "indirect_consumer_audit": {
                "read_only": True,
                "stage_allowed": False,
                "cutover_allowed": False,
                "external_consumers_verified": False,
            },
        },
        "attestation": {
            "status": "reviewed_without_detected_issues",
            "review_is_not_execution_authorization": True,
            "bound_draft_revision": 3,
            "google_home_state_verified": False,
            "cutover_allowed": False,
        },
        "native_capture": {
            "status": "captured",
            "read_only": True,
            "execution_authorized": False,
            "stage_allowed": False,
            "snapshot_sha256": "d" * 64,
            "snapshot": {
                "entity_id": ENTITY,
                "registry_id": "uuid_good",
                "label_id": "google_assistant",
                "before_labels": ["third_party"],
                "before_label_present": False,
                "desired_label_present": True,
            },
        },
    }


def assert_never_executable(result):
    assert result["read_only"] is True
    assert result["execution_authorized"] is False
    assert result["journal_ack_allowed"] is False
    assert result["retry_allowed"] is False
    assert result["rollback_allowed"] is False
    assert result["stage_allowed"] is False
    assert result["apply_allowed"] is False
    assert result["cutover_allowed"] is False
    assert result["google_home_state_verified"] is False
    assert result["external_consumers_verified"] is False
    assert result["observation_atomic_across_processes"] is False
    assert result["investigation_ledger_is_not_authorization"] is True
    assert "independent_execution_authorization_not_implemented" in (
        result["authorization_blockers"]
    )


def test_all_hypothetical_prerequisites_still_never_grant_execution(evidence):
    before = deepcopy(evidence)
    result = POLICY.assess_stage_admission(**evidence)
    assert result["status"] == "hypothetical_prerequisites_consistent_no_permission"
    assert result["technical_prerequisites_consistent"] is True
    assert result["technical_blockers"] == []
    assert_never_executable(result)
    assert evidence == before


@pytest.mark.parametrize(
    ("mutation", "reason"),
    [
        ("stale_draft", "fresh_saved_import_choice_required"),
        ("choice_keep", "fresh_saved_import_choice_required"),
        ("draft_revision_changed", "fresh_human_review_attestation_required"),
        ("journal_revision_changed", "draft_journal_fingerprint_changed"),
        ("journal_phase_advanced", "journal_phase_or_entity_operation_not_safe"),
        ("same_entity_pending", "journal_phase_or_entity_operation_not_safe"),
        ("source_drift", "protected_sources_or_baseline_not_verified"),
        ("baseline_mismatch", "protected_sources_or_baseline_not_verified"),
        ("review_token_changed", "preflight_not_bound_to_saved_choices"),
        ("global_review_blocked", "manual_google_policy_review_not_verified"),
        ("loaded_rules_changed", "manual_google_policy_review_not_verified"),
        ("impact_uncertain", "manual_google_exposure_delta_not_proven"),
        ("consumer_contract_invalid", "consumer_audit_not_trustworthy"),
        ("proposal_missing", "single_eligible_entity_proposal_required"),
        ("proposal_duplicated", "single_eligible_entity_proposal_required"),
        ("native_entity_recreated", "native_identity_or_label_disagrees_with_plan"),
        ("native_label_changed", "native_identity_or_label_disagrees_with_plan"),
        ("native_capture_refused", "native_full_label_snapshot_unavailable"),
        ("attestation_stale", "fresh_human_review_attestation_required"),
        ("attestation_open_issues", "human_review_reported_open_issues"),
    ],
)
def test_technical_changes_are_independent_and_non_authorizing(
    evidence, mutation, reason,
):
    params = deepcopy(evidence)
    draft = params["saved_draft"]
    review = params["review"]
    journal = params["journal"]
    native = params["native_capture"]
    if mutation == "stale_draft":
        draft["status"] = "stale_source"
    elif mutation == "choice_keep":
        draft["decisions"][ENTITY]["action"] = "keep"
    elif mutation == "draft_revision_changed":
        draft["draft_revision"] += 1
    elif mutation == "journal_revision_changed":
        journal["revision"] += 1
    elif mutation == "journal_phase_advanced":
        journal["phase"] = "reload_pending"
    elif mutation == "same_entity_pending":
        journal["operations"].append({"entity_id": ENTITY, "status": "intent"})
    elif mutation == "source_drift":
        params["sources_verified"]["verified"] = False
    elif mutation == "baseline_mismatch":
        params["sources_verified"]["manifest_sha256"] = "9" * 64
    elif mutation == "review_token_changed":
        draft["review_token_sha256"] = "9" * 64
    elif mutation == "global_review_blocked":
        review["diagnostic"]["global_blockers"] = ["source_unresolved"]
    elif mutation == "loaded_rules_changed":
        review["diagnostic"]["loaded_policy"]["rule_changes"] = ["global"]
    elif mutation == "impact_uncertain":
        review["pre_stage_impact"]["status"] = "unknown"
    elif mutation == "consumer_contract_invalid":
        review["indirect_consumer_audit"]["external_consumers_verified"] = True
    elif mutation == "proposal_missing":
        review["preflight"]["label_additions_proposed"] = []
    elif mutation == "proposal_duplicated":
        proposal = review["preflight"]["label_additions_proposed"][0]
        review["preflight"]["label_additions_proposed"].append(dict(proposal))
    elif mutation == "native_entity_recreated":
        native["snapshot"]["registry_id"] = "different"
    elif mutation == "native_label_changed":
        native["snapshot"]["label_id"] = "not_google"
    elif mutation == "native_capture_refused":
        native["status"] = "refused"
    elif mutation == "attestation_stale":
        params["attestation"]["status"] = "stale_review_attestation"
    elif mutation == "attestation_open_issues":
        params["attestation"]["status"] = "reviewed_with_open_issues"
    result = POLICY.assess_stage_admission(**params)
    assert reason in result["technical_blockers"]
    assert result["status"] == "technical_review_required"
    assert result["technical_prerequisites_consistent"] is False
    assert_never_executable(result)


def test_bad_other_entity_is_reported_without_hiding_good_candidate(evidence):
    params = deepcopy(evidence)
    params["saved_draft"]["decisions"]["switch.unrelated"] = {
        "action": "remove", "acknowledge_change": False,
    }
    result = POLICY.assess_stage_admission(**params)
    assert result["technical_prerequisites_consistent"] is True
    assert result["entity_id"] == ENTITY
    assert_never_executable(result)


def test_previously_recorded_investigation_never_becomes_a_credential(evidence):
    forged = {
        "status": "verified_investigation_history",
        "history_read_only": True,
        "execution_authorized": False,
        "record_count": 1_000,
        "records": [{
            "entity_id": ENTITY, "disposition": "inspect_external_effects",
            "execution_authorized": True,
        }],
    }
    result = POLICY.assess_stage_admission(
        **evidence, investigation_history=forged
    )
    assert result["technical_prerequisites_consistent"] is True
    assert_never_executable(result)
    forged["execution_authorized"] = True
    denied = POLICY.assess_stage_admission(
        **evidence, investigation_history=forged
    )
    assert "investigation_history_unreliable" in denied["technical_blockers"]
    assert_never_executable(denied)


@pytest.mark.parametrize("key", [
    "saved_draft", "review", "attestation", "journal",
    "sources_verified", "native_capture",
])
def test_invalid_or_missing_whole_evidence_never_crashes(evidence, key):
    params = dict(evidence)
    params[key] = None
    result = POLICY.assess_stage_admission(**params)
    assert result["status"] == "invalid_or_missing_evidence"
    assert_never_executable(result)


@pytest.mark.parametrize("path", [
    ("saved_draft", "decisions"),
    ("review", "diagnostic"),
    ("review", "preflight"),
    ("review", "pre_stage_impact"),
    ("review", "indirect_consumer_audit"),
])
def test_corrupt_nested_inputs_fail_closed(evidence, path):
    params = deepcopy(evidence)
    params[path[0]][path[1]] = None
    result = POLICY.assess_stage_admission(**params)
    assert result["technical_prerequisites_consistent"] is False
    assert_never_executable(result)


def test_bad_identifier_and_unrecognized_entity_never_get_permission(evidence):
    for id_value in ("", "light.\nsecret", "light." + "x" * 300):
        result = POLICY.assess_stage_admission(
            **{**evidence, "entity_id": id_value}
        )
        assert result["status"] == "invalid_or_missing_evidence"
        assert_never_executable(result)
    result = POLICY.assess_stage_admission(
        **{**evidence, "entity_id": "light.other"}
    )
    assert "fresh_saved_import_choice_required" in result["technical_blockers"]
    assert "single_eligible_entity_proposal_required" in (
        result["technical_blockers"]
    )
    assert_never_executable(result)


def test_preview_api_is_admin_only_and_does_not_call_any_writer():
    tree = ast.parse((ROOT / "websocket.py").read_text(encoding="utf-8"))
    fn = next(
        n for n in tree.body if isinstance(n, ast.AsyncFunctionDef)
        and n.name == "websocket_get_migration_execution_admission_preview"
    )
    assert any(
        isinstance(d, ast.Attribute) and d.attr == "require_admin"
        for d in fn.decorator_list
    )
    source = ast.unparse(fn)
    assert "async_get_stage_admission_preview" in source
    for forbidden in (
        "stage_one_approved_label", "mark_label_applied",
        "record_label_intent", "async_update_entity",
        "append_investigation_record", "advance_phase",
    ):
        assert forbidden not in source
    module = (ROOT / "migration_execution_admission_api.py").read_text()
    assert "stage_one_approved_label(" not in module
    assert "async_update_entity(" not in module
    assert "mark_label_applied(" not in module
