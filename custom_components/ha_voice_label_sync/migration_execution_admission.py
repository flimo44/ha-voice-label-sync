"""Fail-closed execution-admission PREVIEW, never an executable grant.

Admits no operation. Separates a candidate's technical prerequisites from
the missing independent authorization, ABA/side-effect proofs and final
transaction-level CAS. Investigation records and review attestations are
explicitly incapable of becoming execution capabilities.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any

_ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
_SHA = re.compile(r"^[a-f0-9]{64}$")
_MAX_ROWS = 20_000

_PERMANENT_BLOCKERS = [
    "independent_execution_authorization_not_implemented",
    "write_time_disk_and_native_transaction_not_proven",
    "external_event_aba_and_google_side_effects_unverified",
]


def _base(entity_id: str | None, status: str) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "status": status,
        "entity_id": entity_id,
        "technical_prerequisites_consistent": False,
        "technical_blockers": [],
        "authorization_blockers": list(_PERMANENT_BLOCKERS),
        "review_history_is_not_authorization": True,
        "attestation_is_not_authorization": True,
        "investigation_ledger_is_not_authorization": True,
        "read_only": True,
        "execution_authorized": False,
        "journal_ack_allowed": False,
        "retry_allowed": False,
        "rollback_allowed": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
        "google_home_state_verified": False,
        "external_consumers_verified": False,
        "observation_atomic_across_processes": False,
    }


def assess_stage_admission(
    *,
    entity_id: str,
    saved_draft: Mapping[str, Any],
    review: Mapping[str, Any],
    attestation: Mapping[str, Any],
    journal: Mapping[str, Any],
    sources_verified: Mapping[str, Any],
    native_capture: Mapping[str, Any],
    investigation_history: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Explain missing per-entity prerequisites with no authority output.

    Arguments MUST be freshly obtained by a trusted server facade; this pure
    function is not an authorization boundary. Even forged 'success' data
    cannot induce a positive stage_allowed or execution_authorized flag.
    """
    if (
        not isinstance(entity_id, str)
        or len(entity_id) > 255
        or _ENTITY.fullmatch(entity_id) is None
        or any(not isinstance(x, Mapping) for x in (
            saved_draft, review, attestation, journal, sources_verified,
            native_capture,
        ))
    ):
        return _base(None, "invalid_or_missing_evidence")

    result = _base(entity_id, "technical_review_required")
    blockers: list[str] = []
    if (
        saved_draft.get("status") != "saved_unapproved_draft"
        or saved_draft.get("stored_choices_unapproved") is not True
        or type(saved_draft.get("draft_revision")) is not int
        or not isinstance(saved_draft.get("decisions"), Mapping)
        or saved_draft.get("decisions", {}).get(entity_id, {}).get("action")
        != "import"
    ):
        blockers.append("fresh_saved_import_choice_required")

    baseline_sha = saved_draft.get("baseline_manifest_sha256")
    journal_rev = journal.get("revision")
    if (
        type(journal_rev) is not int
        or journal_rev < 0
        or journal.get("phase") not in ("baseline_ready", "labels_staging")
        or not isinstance(journal.get("operations"), list)
        or len(journal["operations"]) > 2000
        or any(not isinstance(x, Mapping) for x in journal["operations"])
        or any(x.get("entity_id") == entity_id for x in journal["operations"])
    ):
        blockers.append("journal_phase_or_entity_operation_not_safe")
    if (
        not isinstance(baseline_sha, str)
        or not _SHA.fullmatch(baseline_sha)
        or journal.get("baseline_manifest_sha256") != baseline_sha
        or sources_verified.get("verified") is not True
        or sources_verified.get("manifest_sha256") != baseline_sha
    ):
        blockers.append("protected_sources_or_baseline_not_verified")

    if (
        saved_draft.get("journal_revision") != journal_rev
        or saved_draft.get("journal_phase") != journal.get("phase")
    ):
        blockers.append("draft_journal_fingerprint_changed")

    preflight = review.get("preflight")
    diagnostic = review.get("diagnostic")
    impact = review.get("pre_stage_impact")
    consumer = review.get("indirect_consumer_audit")
    if not all(isinstance(x, Mapping) for x in (
        preflight, diagnostic, impact, consumer
    )):
        blockers.append("complete_live_review_unavailable")
    else:
        if (
            review.get("read_only") is not True
            or review.get("protected_baseline_status") != "verified"
            or review.get("apply_allowed") is not False
            or review.get("cutover_allowed") is not False
            or diagnostic.get("read_only") is not True
            or diagnostic.get("mode") != "assisted_migration"
            or diagnostic.get("global_blockers")
            or diagnostic.get("source", {}).get("status") != "resolved"
            or diagnostic.get("loaded_policy", {}).get("status")
            != "match_compared_fields"
            or diagnostic.get("loaded_policy", {}).get("differences")
            or diagnostic.get("loaded_policy", {}).get("rule_changes")
        ):
            blockers.append("manual_google_policy_review_not_verified")
        if (
            preflight.get("read_only") is not True
            or preflight.get("status") != "read_only_stage_preflight"
            or preflight.get("global_blockers")
            or preflight.get("review_token_sha256")
            != saved_draft.get("review_token_sha256")
            or preflight.get("source_evidence_sha256")
            != saved_draft.get("source_evidence_sha256")
        ):
            blockers.append("preflight_not_bound_to_saved_choices")
        if (
            impact.get("read_only") is not True
            or impact.get("cutover_allowed") is not False
            or impact.get("google_home_state_verified") is not False
            or impact.get("status") not in {
                "no_manual_policy_delta_detected", "no_label_additions_proposed"
            }
            or impact.get("global_blockers")
        ):
            blockers.append("manual_google_exposure_delta_not_proven")
        if (
            consumer.get("read_only") is not True
            or consumer.get("stage_allowed") is not False
            or consumer.get("cutover_allowed") is not False
            or consumer.get("external_consumers_verified") is not False
        ):
            blockers.append("consumer_audit_not_trustworthy")
        proposed = preflight.get("label_additions_proposed", [])
        if (
            not isinstance(proposed, list)
            or len(proposed) > _MAX_ROWS
            or any(not isinstance(x, Mapping) for x in proposed)
        ):
            blockers.append("stage_proposals_unavailable")
            selected = []
        else:
            selected = [x for x in proposed if x.get("entity_id") == entity_id]
        if len(selected) != 1 or any(
            x.get("entity_id") == entity_id for x in proposed
            if x is not selected[0]
        ) if selected else True:
            blockers.append("single_eligible_entity_proposal_required")

    if (
        attestation.get("status") not in {
            "reviewed_without_detected_issues",
            "reviewed_with_open_issues",
        }
        or attestation.get("review_is_not_execution_authorization") is not True
        or attestation.get("bound_draft_revision")
        != saved_draft.get("draft_revision")
        or attestation.get("google_home_state_verified") is not False
        or attestation.get("cutover_allowed") is not False
    ):
        blockers.append("fresh_human_review_attestation_required")
    elif attestation.get("status") == "reviewed_with_open_issues":
        blockers.append("human_review_reported_open_issues")

    snapshot = native_capture.get("snapshot")
    if (
        native_capture.get("status") != "captured"
        or native_capture.get("read_only") is not True
        or native_capture.get("execution_authorized") is not False
        or native_capture.get("stage_allowed") is not False
        or not isinstance(snapshot, Mapping)
        or snapshot.get("entity_id") != entity_id
        or snapshot.get("before_label_present") is not False
        or snapshot.get("desired_label_present") is not True
        or not isinstance(snapshot.get("before_labels"), list)
        or not isinstance(native_capture.get("snapshot_sha256"), str)
        or not _SHA.fullmatch(native_capture["snapshot_sha256"])
    ):
        blockers.append("native_full_label_snapshot_unavailable")
    elif isinstance(preflight, Mapping):
        selected = [
            x for x in preflight.get("label_additions_proposed", [])
            if isinstance(x, Mapping) and x.get("entity_id") == entity_id
        ] if isinstance(preflight.get("label_additions_proposed"), list) else []
        if (
            len(selected) != 1
            or snapshot.get("registry_id") != selected[0].get("registry_id")
            or snapshot.get("label_id") != selected[0].get("label_id")
        ):
            blockers.append("native_identity_or_label_disagrees_with_plan")

    # This evidence never increases trust: malformed or forged history
    # explicitly reports a discrepancy, while a clean historical record
    # can never make authorization_blockers disappear.
    if investigation_history is not None and (
        not isinstance(investigation_history, Mapping)
        or investigation_history.get("execution_authorized") is not False
        or investigation_history.get("history_read_only") is not True
        or investigation_history.get("status")
        != "verified_investigation_history"
    ):
        blockers.append("investigation_history_unreliable")

    result["technical_blockers"] = list(dict.fromkeys(blockers))
    result["technical_prerequisites_consistent"] = not blockers
    result["status"] = (
        "hypothetical_prerequisites_consistent_no_permission"
        if not blockers else "technical_review_required"
    )
    # Even the first status is strictly a non-executable diagnosis.
    return result
