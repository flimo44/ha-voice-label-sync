"""Two-phase, single-use *execution approval rehearsal*, NEVER an authority.

A normal administrator's confirmation is simulated against server-only
admission evidence. The challenge remains in volatile HA memory and is
consumed once; no executor, label, migration journal or YAML is touched.
A positive rehearsal is not a staging token, grant, or production approval.
"""

from __future__ import annotations

import hmac
import re
import secrets
import time
from typing import Any

from .const import DOMAIN
from .workflow_lock import get_workflow_lock

_PENDING_KEY = "_migration_execution_approval_dryrun"
_TTL = 180
_ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
_SHA = re.compile(r"^[0-9a-f]{64}$")
_ACTION = "stage_one_label_addition"


class ApprovalDryRunError(ValueError):
    """Constant sanitized error code. No raw YAML or user data."""


def _no_authority() -> dict[str, Any]:
    return {
        "schema_version": 1,
        "purpose": "execution_approval_protocol_rehearsal_only",
        "simulated_confirmation_only": True,
        "decision_not_durably_saved": True,
        "no_action_was_performed": True,
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


def _valid_request(administrator_id: Any, entity_id: Any, action: Any) -> bool:
    return (
        isinstance(administrator_id, str)
        and 0 < len(administrator_id) <= 128
        and isinstance(entity_id, str)
        and len(entity_id) <= 255
        and _ENTITY.fullmatch(entity_id) is not None
        and action == _ACTION
        and isinstance(action, str)
    )


def _trusted_preview(report: Any, entity_id: str) -> str:
    """No permission, but stable server-controlled evidence for a dry-run."""
    if not isinstance(report, dict):
        raise ApprovalDryRunError("admission_evidence_unavailable")
    digest = report.get("server_evidence_sha256")
    if (
        report.get("entity_id") != entity_id
        or report.get("status")
        != "hypothetical_prerequisites_consistent_no_permission"
        or report.get("technical_prerequisites_consistent") is not True
        or report.get("technical_blockers") != []
        or report.get("read_only") is not True
        or report.get("review_history_is_not_authorization") is not True
        or report.get("attestation_is_not_authorization") is not True
        or report.get("investigation_ledger_is_not_authorization") is not True
        or not isinstance(report.get("authorization_blockers"), list)
        or "independent_execution_authorization_not_implemented"
        not in report["authorization_blockers"]
        or "write_time_disk_and_native_transaction_not_proven"
        not in report["authorization_blockers"]
        or "external_event_aba_and_google_side_effects_unverified"
        not in report["authorization_blockers"]
        or any(report.get(flag) is not False for flag in (
            "execution_authorized", "journal_ack_allowed", "retry_allowed",
            "rollback_allowed", "stage_allowed", "apply_allowed",
            "cutover_allowed", "google_home_state_verified",
            "external_consumers_verified", "observation_atomic_across_processes",
        ))
        or not isinstance(digest, str)
        or _SHA.fullmatch(digest) is None
    ):
        raise ApprovalDryRunError("technical_admission_not_consistent")
    return digest


async def prepare_admin_execution_approval_dryrun(
    hass: Any, *, administrator_id: str,
    entity_id: str, action: str,
) -> dict[str, Any]:
    """Prepare fresh one-entity rehearsal; supersede old challenge for entity."""
    if not _valid_request(administrator_id, entity_id, action):
        raise ApprovalDryRunError("invalid_approval_scope")
    async with get_workflow_lock(hass):
        pending = hass.data.setdefault(DOMAIN, {}).setdefault(_PENDING_KEY, {})
        # A second admin may prepare, but not reuse a first admin's token.
        # Only one pending challenge per entity; no ambiguity on competing
        # confirmations (and still NO permission to stage).
        pending.pop(entity_id, None)
        report = await _fresh_preview_without_reentering_lock(hass, entity_id)
        digest = _trusted_preview(report, entity_id)
        token = secrets.token_urlsafe(32)
        pending[entity_id] = {
            "token": token,
            "administrator_id": administrator_id,
            "action": action,
            "evidence_sha256": digest,
            "expires_at_monotonic": time.monotonic() + _TTL,
        }
        return {
            "status": "awaiting_simulated_execution_approval_confirmation",
            "entity_id": entity_id,
            "action": action,
            "confirmation_token": token,
            "expires_in_seconds": _TTL,
            "server_evidence_sha256": digest,
            "human_confirmation_received": False,
            **_no_authority(),
        }


async def confirm_admin_execution_approval_dryrun(
    hass: Any, *, administrator_id: str,
    entity_id: str, action: str,
    confirmation_token: str, confirmed: bool,
    acknowledge_external_uncertainty: bool,
) -> dict[str, Any]:
    """Consume one-use challenge, recompute evidence, return NO AUTHORITY."""
    if not _valid_request(administrator_id, entity_id, action):
        raise ApprovalDryRunError("invalid_approval_scope")
    if (
        confirmed is not True
        or acknowledge_external_uncertainty is not True
        or not isinstance(confirmation_token, str)
        or not 1 <= len(confirmation_token) <= 256
    ):
        raise ApprovalDryRunError("explicit_confirmation_and_uncertainty_required")
    async with get_workflow_lock(hass):
        pending = hass.data.setdefault(DOMAIN, {}).get(_PENDING_KEY, {})
        proof = pending.get(entity_id)
        if (
            not isinstance(proof, dict)
            or time.monotonic() >= proof.get("expires_at_monotonic", 0)
            or not hmac.compare_digest(
                confirmation_token, proof.get("token", "")
            )
            or administrator_id != proof.get("administrator_id")
        ):
            raise ApprovalDryRunError("challenge_expired_or_invalid")
        # Consume a correctly authenticated challenge BEFORE repeating the
        # heavyweight read. A stale or interrupted confirmation cannot retry.
        pending.pop(entity_id, None)
        if action != proof["action"]:
            raise ApprovalDryRunError("challenge_scope_changed")
        report = await _fresh_preview_without_reentering_lock(hass, entity_id)
        digest = _trusted_preview(report, entity_id)
        if not hmac.compare_digest(digest, proof["evidence_sha256"]):
            raise ApprovalDryRunError("evidence_changed_since_prepare")
        return {
            "status": "simulated_execution_approval_confirmed_no_execution",
            "entity_id": entity_id,
            "action": action,
            "server_evidence_sha256": digest,
            "human_confirmation_received": True,
            "fresh_evidence_rechecked": True,
            "external_uncertainty_acknowledged": True,
            "challenge_consumed": True,
            **_no_authority(),
        }


async def _fresh_preview_without_reentering_lock(
    hass: Any, entity_id: str,
) -> dict[str, Any]:
    """Call the existing preview's *locked core*, never acquire lock twice."""
    from .migration_execution_admission_api import (
        _async_collect_stage_admission_locked,
    )
    return await _async_collect_stage_admission_locked(
        hass, entity_id=entity_id
    )
