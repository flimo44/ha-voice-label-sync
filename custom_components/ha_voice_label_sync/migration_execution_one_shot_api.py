"""Admin-only one-shot transaction *rehearsal* orchestration.

Never promote #132 approval-intent audit into execution authority. Prepare
and confirm append a non-authorizing reservation; burn only appends a
'consumed without execution' record, irreversible under disk CAS.
"""

from __future__ import annotations

import hmac
import re
import secrets
import time
from functools import partial
from typing import Any

from .const import DOMAIN
from .migration_decision_draft import load_review_draft
from .migration_execution_approval_dryrun import (
    _ACTION,
    _fresh_preview_without_reentering_lock,
    _trusted_preview,
    _valid_request,
)
from .migration_execution_approval_records import (
    load_approval_intent_history,
)
from .migration_execution_one_shot_rehearsal import (
    _hash,
    append_rehearsal_transition,
    read_one_shot_rehearsals,
)
from .migration_journal import read_journal
from .workflow_lock import get_workflow_lock

_PENDING_KEY = "_migration_one_shot_reservation_pending"
_TTL = 180
_RECEIPT = re.compile(r"^[0-9a-f]{32}$")


class OneShotRehearsalApiError(ValueError):
    """Only fixed safe codes; never reveal protected files or admins."""


def _no_execution() -> dict[str, Any]:
    return {
        "schema_version": 1,
        "only_a_non_executing_rehearsal": True,
        "approval_intent_is_not_execution_authorization": True,
        "receipt_is_not_execution_capability": True,
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


def _disk_snapshot(config_dir: str, entity_id: str, evidence_sha: str) -> dict:
    journal = read_journal(config_dir)
    draft = load_review_draft(config_dir)
    approvals = load_approval_intent_history(config_dir)
    log = read_one_shot_rehearsals(config_dir)
    candidates = [
        record for record in approvals["records"]
        if record["entity_id"] == entity_id
        and record["action"] == _ACTION
        and record["admission_evidence_sha256"] == evidence_sha
    ]
    if not candidates:
        raise OneShotRehearsalApiError("matching_approval_intent_evidence_required")
    return {
        "journal_sha256": _hash(journal),
        "draft_sha256": _hash(draft),
        "admission_evidence_sha256": evidence_sha,
        "approval_intent_sha256": candidates[-1]["record_sha256"],
        "event_count": log["event_count"],
        "head_sha256": log["head_sha256"],
        "receipts": log["receipts"],
    }


async def _trusted_snapshot_locked(
    hass: Any, entity_id: str,
) -> dict[str, Any]:
    report = await _fresh_preview_without_reentering_lock(hass, entity_id)
    digest = _trusted_preview(report, entity_id)
    snapshot = await hass.async_add_executor_job(
        _disk_snapshot, hass.config.config_dir, entity_id, digest
    )
    # A second server-generated observation refuses native/YAML/journal
    # drift during the independent disk history read.
    latest = await _fresh_preview_without_reentering_lock(hass, entity_id)
    if not hmac.compare_digest(
        digest, _trusted_preview(latest, entity_id)
    ):
        raise OneShotRehearsalApiError("one_shot_preview_changed")
    return snapshot


async def prepare_one_shot_rehearsal(
    hass: Any, *, administrator_id: str,
    entity_id: str, action: str,
) -> dict[str, Any]:
    if not _valid_request(administrator_id, entity_id, action):
        raise OneShotRehearsalApiError("invalid_one_shot_scope")
    async with get_workflow_lock(hass):
        if len(hass.config_entries.async_entries(DOMAIN)) != 1:
            raise OneShotRehearsalApiError("integration_not_uniquely_configured")
        pending = hass.data.setdefault(DOMAIN, {}).setdefault(_PENDING_KEY, {})
        pending.pop(entity_id, None)
        snapshot = await _trusted_snapshot_locked(hass, entity_id)
        if any(
            row["entity_id"] == entity_id
            and row["lifecycle"] == "reserved_non_authorizing"
            for row in snapshot["receipts"]
        ):
            raise OneShotRehearsalApiError("reservation_already_active")
        token = secrets.token_urlsafe(32)
        pending[entity_id] = {
            "admin": administrator_id,
            "action": action,
            "token": token,
            "snapshot": snapshot,
            "expires_at": time.monotonic() + _TTL,
        }
        return {
            "status": "awaiting_one_shot_rehearsal_confirmation",
            "entity_id": entity_id, "action": action,
            "confirmation_token": token,
            "expires_in_seconds": _TTL,
            "audit_context_sha256": snapshot["approval_intent_sha256"],
            "human_confirmation_received": False,
            **_no_execution(),
        }


async def confirm_one_shot_rehearsal(
    hass: Any, *, administrator_id: str, entity_id: str, action: str,
    confirmation_token: str, confirmed: bool,
    acknowledge_external_uncertainty: bool,
) -> dict[str, Any]:
    if not _valid_request(administrator_id, entity_id, action):
        raise OneShotRehearsalApiError("invalid_one_shot_scope")
    if (
        confirmed is not True
        or acknowledge_external_uncertainty is not True
        or not isinstance(confirmation_token, str)
        or not 1 <= len(confirmation_token) <= 256
    ):
        raise OneShotRehearsalApiError("one_shot_explicit_confirmation_required")
    async with get_workflow_lock(hass):
        pending = hass.data.setdefault(DOMAIN, {}).get(_PENDING_KEY, {})
        proof = pending.get(entity_id)
        if (
            not isinstance(proof, dict)
            or time.monotonic() >= proof.get("expires_at", 0)
            or proof.get("admin") != administrator_id
            or not hmac.compare_digest(
                confirmation_token, proof.get("token", "")
            )
        ):
            raise OneShotRehearsalApiError("one_shot_challenge_invalid_or_expired")
        pending.pop(entity_id, None)
        if proof["action"] != action:
            raise OneShotRehearsalApiError("one_shot_action_changed")
        latest = await _trusted_snapshot_locked(hass, entity_id)
        if latest != proof["snapshot"]:
            raise OneShotRehearsalApiError("one_shot_evidence_changed")
        saved = await hass.async_add_executor_job(
            partial(
                append_rehearsal_transition,
                hass.config.config_dir,
                event="reserve_non_authorizing",
                entity_id=entity_id,
                administrator_id=administrator_id,
                admission_evidence_sha256=latest[
                    "admission_evidence_sha256"
                ],
                approval_intent_sha256=latest["approval_intent_sha256"],
                expected_journal_sha256=latest["journal_sha256"],
                expected_draft_sha256=latest["draft_sha256"],
                expected_event_count=latest["event_count"],
                expected_head_sha256=latest["head_sha256"],
            )
        )
        return {
            "status": "one_shot_reservation_recorded_without_execution",
            "receipt": saved["receipt"],
            "event_count": saved["event_count"],
            "record_fsync_completed": saved["record_fsync_completed"],
            "head_fsync_completed": saved["head_fsync_completed"],
            "human_confirmation_received": True,
            "journal_changed": False,
            "label_changed": False,
            "production_yaml_changed": False,
            **_no_execution(),
        }


async def burn_one_shot_rehearsal(
    hass: Any, *, administrator_id: str, entity_id: str, action: str,
    receipt_id: str, confirmed: bool,
    acknowledge_external_uncertainty: bool,
) -> dict[str, Any]:
    """Durably burn once WITHOUT invoking an executor, retry or journal ACK."""
    if (
        not _valid_request(administrator_id, entity_id, action)
        or not isinstance(receipt_id, str)
        or _RECEIPT.fullmatch(receipt_id) is None
    ):
        raise OneShotRehearsalApiError("invalid_one_shot_burn_scope")
    if confirmed is not True or acknowledge_external_uncertainty is not True:
        raise OneShotRehearsalApiError("one_shot_burn_confirmation_required")
    async with get_workflow_lock(hass):
        if len(hass.config_entries.async_entries(DOMAIN)) != 1:
            raise OneShotRehearsalApiError("integration_not_uniquely_configured")
        latest = await _trusted_snapshot_locked(hass, entity_id)
        selected = [
            r for r in latest["receipts"] if r["receipt_id"] == receipt_id
            and r["entity_id"] == entity_id
            and r["action"] == action
            and r["lifecycle"] == "reserved_non_authorizing"
        ]
        if len(selected) != 1:
            raise OneShotRehearsalApiError("one_shot_receipt_unavailable")
        saved = await hass.async_add_executor_job(
            partial(
                append_rehearsal_transition,
                hass.config.config_dir,
                event="burn_without_execution",
                entity_id=entity_id,
                administrator_id=administrator_id,
                admission_evidence_sha256=latest[
                    "admission_evidence_sha256"
                ],
                approval_intent_sha256=latest["approval_intent_sha256"],
                expected_journal_sha256=latest["journal_sha256"],
                expected_draft_sha256=latest["draft_sha256"],
                expected_event_count=latest["event_count"],
                expected_head_sha256=latest["head_sha256"],
                receipt_id=receipt_id,
            )
        )
        return {
            "status": "one_shot_receipt_consumed_without_execution",
            "receipt": saved["receipt"],
            "consumed_on_disk": True,
            "record_fsync_completed": saved["record_fsync_completed"],
            "head_fsync_completed": saved["head_fsync_completed"],
            "journal_changed": False,
            "label_changed": False,
            "production_yaml_changed": False,
            **_no_execution(),
        }


async def get_one_shot_rehearsal_history(hass: Any) -> dict[str, Any]:
    async with get_workflow_lock(hass):
        if len(hass.config_entries.async_entries(DOMAIN)) != 1:
            raise OneShotRehearsalApiError("integration_not_uniquely_configured")
        return await hass.async_add_executor_job(
            read_one_shot_rehearsals, hass.config.config_dir
        )
