"""Two-phase *simulation* of a human recovery investigation decision.

One-use, short-lived, admin-bound challenge tied to the exact protected
journal and fresh native HA observations. Nothing is saved to disk and no
resolution, journal acknowledgement, retry, rollback, stage or Google action
can be invoked here. The result is explicitly NOT an execution authorization.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import re
import secrets
import time
from collections.abc import Mapping
from typing import Any

from .const import DOMAIN
from .migration_recovery_view import _async_collect_recovery_locked
from .workflow_lock import get_workflow_lock

_PENDING_KEY = "_migration_recovery_dryrun_pending"
_TTL_SECONDS = 180
_MAX_EVIDENCE_BYTES = 4 * 1024 * 1024
_ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
_SHA = re.compile(r"^[0-9a-f]{64}$")
_DISPOSITIONS = frozenset({
    "inspect_external_effects",
    "quarantine_for_investigation",
    "defer_until_further_evidence",
})


class RecoveryConfirmationError(ValueError):
    """Only constant, non-sensitive error codes."""


def _not_authorized() -> dict[str, Any]:
    return {
        "read_only": True,
        "decision_not_durably_saved": True,
        "simulated_confirmation_only": True,
        "execution_authorized": False,
        "journal_ack_allowed": False,
        "automatic_recovery_allowed": False,
        "retry_allowed": False,
        "rollback_allowed": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
        "google_home_state_verified": False,
        "observation_atomic_across_processes": False,
    }


def _valid_admin(admin_id: Any) -> bool:
    return isinstance(admin_id, str) and 0 < len(admin_id) <= 128


def _valid_request(entity_id: Any, disposition: Any) -> bool:
    return (
        isinstance(entity_id, str)
        and _ENTITY.fullmatch(entity_id) is not None
        and isinstance(disposition, str)
        and disposition in _DISPOSITIONS
    )


def _fresh_evidence(
    report: Mapping[str, Any], entity_id: str
) -> tuple[str, dict[str, Any]]:
    """Require full, currently verified read-only evidence for one row."""
    if not isinstance(report, Mapping):
        raise RecoveryConfirmationError("recovery_evidence_unavailable")
    scenario = report.get("resolution_scenarios")
    journal_sha = report.get("journal_evidence_sha256")
    if (
        report.get("status") != "review_required"
        or report.get("phase") != "labels_staging"
        or report.get("source_integrity") != "verified_unchanged"
        or type(report.get("journal_revision")) is not int
        or report["journal_revision"] < 0
        or not isinstance(journal_sha, str)
        or not _SHA.fullmatch(journal_sha)
        or report.get("read_only") is not True
        or report.get("automatic_recovery_allowed") is not False
        or report.get("stage_allowed") is not False
        or report.get("apply_allowed") is not False
        or report.get("cutover_allowed") is not False
        or not isinstance(scenario, Mapping)
        or scenario.get("status") != "investigation_required"
        or scenario.get("read_only") is not True
        or scenario.get("evidence_is_not_execution_authorization") is not True
        or any(
            scenario.get(name) is not False
            for name in (
                "automatic_recovery_allowed", "journal_ack_allowed",
                "retry_allowed", "rollback_allowed", "stage_allowed",
                "apply_allowed", "cutover_allowed",
            )
        )
        or not isinstance(report.get("operations"), list)
        or not isinstance(scenario.get("operations"), list)
    ):
        raise RecoveryConfirmationError("recovery_review_not_safe")

    rows = [
        row for row in report["operations"]
        if isinstance(row, Mapping) and row.get("entity_id") == entity_id
    ]
    scenarios = [
        row for row in scenario["operations"]
        if isinstance(row, Mapping) and row.get("entity_id") == entity_id
    ]
    if len(rows) != 1 or len(scenarios) != 1:
        raise RecoveryConfirmationError("entity_not_uniquely_reviewable")
    row, hypothesis = rows[0], scenarios[0]
    if (
        row.get("needs_review") is not True
        or hypothesis.get("human_investigation_required") is not True
        or hypothesis.get("resolution_authorized") is not False
        or hypothesis.get("category") not in {"investigation", "quarantine"}
        or hypothesis.get("journal_status") != row.get("operation_status")
        or hypothesis.get("observed_status") != row.get("observed_status")
        or hypothesis.get("current_membership") != row.get("membership")
        or hypothesis.get("expected_before") != row.get("expected_before")
        or hypothesis.get("expected_after") != row.get("expected_after")
    ):
        raise RecoveryConfirmationError("entity_not_uniquely_reviewable")

    try:
        raw = json.dumps(
            report, ensure_ascii=False, sort_keys=True,
            separators=(",", ":"), allow_nan=False,
        ).encode("utf-8")
    except (TypeError, UnicodeError, ValueError) as exc:
        raise RecoveryConfirmationError("invalid_recovery_evidence") from exc
    if len(raw) > _MAX_EVIDENCE_BYTES:
        raise RecoveryConfirmationError("recovery_evidence_too_large")
    return hashlib.sha256(raw).hexdigest(), {
        "entity_id": entity_id,
        "scenario": hypothesis["scenario"],
        "category": hypothesis["category"],
        "membership": row["membership"],
        "journal_revision": report["journal_revision"],
        "journal_evidence_sha256": journal_sha,
        "source_integrity": report["source_integrity"],
    }


async def prepare_admin_recovery_decision(
    hass: Any, *, administrator_id: str,
    entity_id: str, disposition: str,
) -> dict[str, Any]:
    """Prepare a read-only human intent; supersede any prior user challenge."""
    if not _valid_admin(administrator_id):
        raise RecoveryConfirmationError("administrator_unavailable")
    if not _valid_request(entity_id, disposition):
        raise RecoveryConfirmationError("invalid_investigation_choice")
    async with get_workflow_lock(hass):
        pending = hass.data.setdefault(DOMAIN, {}).setdefault(
            _PENDING_KEY, {}
        )
        pending.pop(administrator_id, None)
        if len(hass.config_entries.async_entries(DOMAIN)) != 1:
            raise RecoveryConfirmationError("integration_not_uniquely_configured")
        report = await _async_collect_recovery_locked(hass)
        evidence, details = _fresh_evidence(report, entity_id)
        challenge = secrets.token_urlsafe(32)
        pending[administrator_id] = {
            "challenge": challenge,
            "entity_id": entity_id,
            "disposition": disposition,
            "evidence_sha256": evidence,
            "expires": time.monotonic() + _TTL_SECONDS,
        }
        return {
            "schema_version": 1,
            "status": "awaiting_simulated_human_confirmation",
            "confirmation_token": challenge,
            "expires_in_seconds": _TTL_SECONDS,
            "disposition": disposition,
            "recovery_evidence_sha256": evidence,
            **details,
            **_not_authorized(),
        }


async def confirm_admin_recovery_decision(
    hass: Any, *, administrator_id: str,
    entity_id: str, disposition: str,
    confirmation_token: str, confirmed: bool,
    acknowledge_external_uncertainty: bool,
) -> dict[str, Any]:
    """Consume challenge, revalidate full evidence, then report NO ACTION."""
    if not _valid_admin(administrator_id):
        raise RecoveryConfirmationError("administrator_unavailable")
    if (
        not _valid_request(entity_id, disposition)
        or confirmed is not True
        or acknowledge_external_uncertainty is not True
        or not isinstance(confirmation_token, str)
        or not 1 <= len(confirmation_token) <= 256
    ):
        raise RecoveryConfirmationError("explicit_confirmation_required")

    async with get_workflow_lock(hass):
        pending = hass.data.setdefault(DOMAIN, {}).get(_PENDING_KEY, {})
        proof = pending.get(administrator_id)
        if (
            not isinstance(proof, dict)
            or time.monotonic() >= proof.get("expires", 0)
            or not hmac.compare_digest(
                confirmation_token, proof.get("challenge", "")
            )
        ):
            raise RecoveryConfirmationError("challenge_expired_or_invalid")
        # A correctly presented challenge is consumed even when stale facts,
        # a different action, or an HA observation causes a later failure.
        pending.pop(administrator_id, None)
        if (
            proof["entity_id"] != entity_id
            or proof["disposition"] != disposition
        ):
            raise RecoveryConfirmationError("challenge_scope_mismatch")
        if len(hass.config_entries.async_entries(DOMAIN)) != 1:
            raise RecoveryConfirmationError("integration_not_uniquely_configured")
        report = await _async_collect_recovery_locked(hass)
        evidence, details = _fresh_evidence(report, entity_id)
        if not hmac.compare_digest(evidence, proof["evidence_sha256"]):
            raise RecoveryConfirmationError("evidence_changed_since_prepare")
        return {
            "schema_version": 1,
            "status": "simulated_review_confirmation_no_execution",
            "entity_id": entity_id,
            "disposition": disposition,
            "recovery_evidence_sha256": evidence,
            "fresh_evidence_rechecked": True,
            "human_confirmation_received": True,
            "external_effects_acknowledged_as_unknown": True,
            "no_action_was_performed": True,
            **details,
            **_not_authorized(),
        }
