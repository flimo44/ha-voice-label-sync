"""Pure, non-authorizing review scenarios for interrupted migration operations.

This module receives ONLY the sanitized read-only recovery report (#124).
It never reads HA internals, files, or journal and cannot acknowledge, retry
or roll back anything. A label observed in the desired state does not prove
that all side effects occurred or that Google Home is consistent.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

MAX_ROWS = 2000

_PHASES = frozenset({
    "baseline_ready", "labels_staging", "labels_staged",
    "review_pending", "cutover_prepared", "reload_pending",
    "google_validation_pending", "complete", "rollback_pending",
    "rolled_back",
})
_OP_STATES = frozenset({"intent", "applied", "rolled_back"})
_MEMBERSHIP = frozenset({"present", "absent", "unknown"})
_ALLOWED_OBSERVED = frozenset({
    "unconfirmed_intent", "entity_unavailable",
    "registry_identity_changed", "membership_unknown",
    "applied_verified", "rollback_verified", "membership_changed",
    "label_identity_missing",
})
_ID = __import__("re").compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")


class ResolutionScenarioError(ValueError):
    """Only fixed safe codes; never includes source data."""


def _empty(status: str) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "status": status,
        "summary": {
            "total": 0, "unconfirmed": 0,
            "requires_investigation": 0, "quarantined": 0,
            "observed_consistent": 0,
        },
        "global_cautions": [],
        "operations": [],
        "purpose": "human_investigation_not_reconciliation",
        "evidence_is_not_execution_authorization": True,
        "automatic_recovery_allowed": False,
        "journal_ack_allowed": False,
        "retry_allowed": False,
        "rollback_allowed": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
        "google_home_state_verified": False,
        "read_only": True,
    }


def build_resolution_scenarios(recovery: Mapping[str, Any]) -> dict[str, Any]:
    """Project investigation paths, never journal transitions or mutations.

    A global source-integrity failure does NOT hide independent per-entity
    observations. It merely prevents treating any candidate as actionable.
    """
    if not isinstance(recovery, Mapping):
        raise ResolutionScenarioError("invalid_recovery_report")
    result = _empty("unavailable")
    if any((
        recovery.get("read_only") is not True,
        recovery.get("automatic_recovery_allowed") is not False,
        recovery.get("stage_allowed") is not False,
        recovery.get("cutover_allowed") is not False,
    )):
        return result
    state = recovery.get("status")
    if state == "not_initialized":
        result["status"] = "not_initialized"
        return result
    if state not in {"review_required", "observed_no_pending"}:
        return result
    operations = recovery.get("operations")
    phase = recovery.get("phase")
    revision = recovery.get("journal_revision")
    source = recovery.get("source_integrity")
    if (
        not isinstance(operations, list)
        or len(operations) > MAX_ROWS
        or phase not in _PHASES
        or type(revision) is not int
        or revision < 0
        or source not in {"verified_unchanged", "changed_or_unavailable"}
    ):
        return result
    cautions = []
    if source != "verified_unchanged":
        cautions.append("source_integrity_not_verified")
    if phase not in {"labels_staging", "baseline_ready", "rolled_back"}:
        cautions.append("journal_phase_requires_separate_review")

    rows = []
    seen = set()
    for row in operations:
        if not isinstance(row, Mapping):
            return _empty("unavailable")
        entity_id = row.get("entity_id")
        op_state = row.get("operation_status")
        observed = row.get("observed_status")
        membership = row.get("membership")
        before = row.get("expected_before")
        after = row.get("expected_after")
        if (
            not isinstance(entity_id, str)
            or not _ID.fullmatch(entity_id)
            or entity_id in seen
            or op_state not in _OP_STATES
            or observed not in _ALLOWED_OBSERVED
            or membership not in _MEMBERSHIP
            or type(before) is not bool
            or type(after) is not bool
            or before == after
            or type(row.get("registry_identity_matches")) is not bool
            or type(row.get("label_identity_exists")) is not bool
            or type(row.get("needs_review")) is not bool
        ):
            return _empty("unavailable")
        seen.add(entity_id)
        reasons = []
        scenario: str
        category = "investigation"

        identity_ok = (
            row["registry_identity_matches"] is True
            and row["label_identity_exists"] is True
            and observed not in {
                "entity_unavailable", "registry_identity_changed",
                "membership_unknown", "label_identity_missing",
            }
            and membership != "unknown"
        )

        if not identity_ok:
            scenario = "identity_or_membership_unknown"
            category = "quarantine"
            if not row["label_identity_exists"]:
                reasons.append("label_identity_missing")
            if not row["registry_identity_matches"]:
                reasons.append("registry_identity_missing_or_changed")
            if membership == "unknown":
                reasons.append("membership_not_observable")
        elif op_state == "intent":
            # Even if the desired membership is observed, the unacknowledged
            # journal intent and any outside callbacks remain ambiguous.
            match_after = (membership == "present") == after
            scenario = (
                "intent_desired_membership_observed"
                if match_after else "intent_original_membership_observed"
            )
            reasons.extend((
                "journal_intent_still_unconfirmed",
                "external_effects_not_verified",
            ))
        elif observed == "membership_changed":
            scenario = "recorded_state_no_longer_matches"
            reasons.append("registry_membership_drift")
        elif op_state == "applied" and observed == "applied_verified":
            scenario = "applied_record_matches_observation"
            category = "observation_only"
            reasons.append("google_home_state_not_verified")
        elif op_state == "rolled_back" and observed == "rollback_verified":
            scenario = "rollback_record_matches_observation"
            category = "observation_only"
            reasons.append("external_effects_not_verified")
        else:
            scenario = "inconsistent_journal_observation"
            category = "quarantine"
            reasons.append("journal_and_observation_disagree")

        if op_state == "intent" and phase != "labels_staging":
            reasons.append("intent_outside_expected_phase")
        if cautions:
            reasons.append("global_review_required_before_any_resolution")
        rows.append({
            "entity_id": entity_id,
            "journal_status": op_state,
            "observed_status": observed,
            "scenario": scenario,
            "category": category,
            "current_membership": membership,
            "expected_before": before,
            "expected_after": after,
            "reason_codes": reasons,
            "human_investigation_required": category != "observation_only",
            "resolution_authorized": False,
        })
    result["status"] = (
        "investigation_required"
        if any(r["human_investigation_required"] for r in rows) or cautions
        else "observations_only"
    )
    if not rows and state == "review_required":
        result["status"] = "phase_review_required"
        cautions.append("journal_phase_requires_separate_review")
    result["global_cautions"] = list(dict.fromkeys(cautions))
    result["operations"] = rows
    result["summary"] = {
        "total": len(rows),
        "unconfirmed": sum(r["journal_status"] == "intent" for r in rows),
        "requires_investigation": sum(
            r["human_investigation_required"] for r in rows
        ),
        "quarantined": sum(r["category"] == "quarantine" for r in rows),
        "observed_consistent": sum(
            r["category"] == "observation_only" for r in rows
        ),
    }
    return result
