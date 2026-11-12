"""Admin-only durable approval-*intent* audit facade; no execution path.

The admin chooses to RECORD an explicit one-entity intention; the only
write permitted is a private audit record. It is not an execution grant.
"""

from __future__ import annotations

import hmac
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
    _hash,
    append_approval_intent_evidence,
    load_approval_intent_history,
)
from .migration_journal import read_journal
from .workflow_lock import get_workflow_lock

_PENDING_KEY = "_migration_durable_approval_intent_pending"
_TTL = 180


class DurableApprovalIntentError(ValueError):
    """Constant sanitized errors only."""


def _no_execution() -> dict[str, Any]:
    return {
        "approval_intent_is_not_execution_authorization": True,
        "independent_execution_authorization_not_implemented": True,
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


def _disk_fingerprint(config_dir: str) -> dict[str, Any]:
    """Read-only double CAS inputs, strictly from local protected files."""
    journal = read_journal(config_dir)
    draft = load_review_draft(config_dir)
    ledger = load_approval_intent_history(config_dir)
    return {
        "journal_revision": journal["revision"],
        "journal_sha256": _hash(journal),
        "saved_draft_sha256": _hash(draft),
        "history_count": ledger["record_count"],
        "history_head_sha256": ledger["last_record_sha256"],
    }


async def prepare_admin_durable_approval_intent(
    hass: Any, *, administrator_id: str,
    entity_id: str, action: str,
) -> dict[str, Any]:
    """Prepare a one-use request to persist ONLY a human approval-intent fact."""
    if not _valid_request(administrator_id, entity_id, action):
        raise DurableApprovalIntentError("invalid_durable_approval_scope")
    async with get_workflow_lock(hass):
        pending = hass.data.setdefault(DOMAIN, {}).setdefault(_PENDING_KEY, {})
        pending.pop(entity_id, None)
        report = await _fresh_preview_without_reentering_lock(hass, entity_id)
        digest = _trusted_preview(report, entity_id)
        disk = await hass.async_add_executor_job(
            _disk_fingerprint, hass.config.config_dir
        )
        # Verify that the HA-native server preview has not become stale
        # during the separate protected-disk audit read.
        latest = await _fresh_preview_without_reentering_lock(hass, entity_id)
        if not hmac.compare_digest(
            digest, _trusted_preview(latest, entity_id)
        ):
            raise DurableApprovalIntentError("approval_preview_changed")
        token = secrets.token_urlsafe(32)
        pending[entity_id] = {
            "administrator_id": administrator_id,
            "token": token,
            "action": action,
            "server_sha256": digest,
            "disk": disk,
            "expires_at_monotonic": time.monotonic() + _TTL,
        }
        return {
            "schema_version": 1,
            "status": "awaiting_durable_approval_intent_confirmation",
            "entity_id": entity_id,
            "action": action,
            "confirmation_token": token,
            "expires_in_seconds": _TTL,
            "server_evidence_sha256": digest,
            "expected_history_count": disk["history_count"],
            "expected_history_head_sha256": disk["history_head_sha256"],
            "explicit_human_confirmation_received": False,
            "record_not_yet_created": True,
            **_no_execution(),
        }


async def confirm_admin_durable_approval_intent(
    hass: Any, *, administrator_id: str,
    entity_id: str, action: str,
    confirmation_token: str, confirmed: bool,
    acknowledge_external_uncertainty: bool,
) -> dict[str, Any]:
    """Consume challenge, recheck all proofs and append ONE non-authority."""
    if not _valid_request(administrator_id, entity_id, action):
        raise DurableApprovalIntentError("invalid_durable_approval_scope")
    if (
        confirmed is not True
        or acknowledge_external_uncertainty is not True
        or not isinstance(confirmation_token, str)
        or not 1 <= len(confirmation_token) <= 256
    ):
        raise DurableApprovalIntentError(
            "explicit_durable_confirmation_required"
        )
    async with get_workflow_lock(hass):
        pending = hass.data.setdefault(DOMAIN, {}).get(_PENDING_KEY, {})
        proof = pending.get(entity_id)
        if (
            not isinstance(proof, dict)
            or time.monotonic() >= proof.get("expires_at_monotonic", 0)
            or proof.get("administrator_id") != administrator_id
            or not hmac.compare_digest(
                confirmation_token, proof.get("token", "")
            )
        ):
            raise DurableApprovalIntentError("challenge_expired_or_invalid")
        # A correctly authenticated challenge is irrevocably consumed.
        # Failure, disk conflicts and process restart never authorize retry.
        pending.pop(entity_id, None)
        if proof["action"] != action or action != _ACTION:
            raise DurableApprovalIntentError("challenge_scope_changed")
        preview = await _fresh_preview_without_reentering_lock(hass, entity_id)
        current_sha = _trusted_preview(preview, entity_id)
        if not hmac.compare_digest(current_sha, proof["server_sha256"]):
            raise DurableApprovalIntentError("approval_evidence_changed")
        disk = await hass.async_add_executor_job(
            _disk_fingerprint, hass.config.config_dir
        )
        if disk != proof["disk"]:
            raise DurableApprovalIntentError("approval_disk_snapshot_changed")
        # The disk writer revalidates journal, draft, original YAML and the
        # anchored audit chain under its cross-process CAS lock.
        saved = await hass.async_add_executor_job(
            partial(
                append_approval_intent_evidence,
                hass.config.config_dir,
                expected_record_count=disk["history_count"],
                expected_last_record_sha256=disk["history_head_sha256"],
                expected_journal_sha256=disk["journal_sha256"],
                expected_journal_revision=disk["journal_revision"],
                expected_draft_sha256=disk["saved_draft_sha256"],
                admission_evidence_sha256=current_sha,
                entity_id=entity_id,
                action=action,
                administrator_id=administrator_id,
            )
        )
        return {
            "schema_version": 1,
            "status": "durable_approval_intent_evidence_recorded_no_execution",
            "record": saved["record"],
            "record_count": saved["record_count"],
            "record_fsync_completed": saved["record_fsync_completed"],
            "history_head_fsync_completed": saved["history_head_fsync_completed"],
            "human_confirmation_received": True,
            "external_effects_acknowledged_as_unknown": True,
            "audit_record_written": True,
            "journal_changed": False,
            "label_changed": False,
            "production_yaml_changed": False,
            **_no_execution(),
        }


async def async_get_approval_intent_history(hass: Any) -> dict[str, Any]:
    """Read verified private history; no claim that old HA state is current."""
    async with get_workflow_lock(hass):
        if len(hass.config_entries.async_entries(DOMAIN)) != 1:
            raise DurableApprovalIntentError("integration_not_uniquely_configured")
        history = await hass.async_add_executor_job(
            load_approval_intent_history, hass.config.config_dir
        )
        return {
            "schema_version": 1,
            "status": "verified_durable_approval_intent_history",
            "record_count": history["record_count"],
            "last_record_sha256": history["last_record_sha256"],
            "records": history["records"],
            "last_50_records_only": True,
            "historical_evidence_not_revalidated_against_live_ha": True,
            "history_read_only": True,
            **_no_execution(),
        }
