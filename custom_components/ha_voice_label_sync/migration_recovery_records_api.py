"""Administrator-only durable human *investigation* record facade.

Separate from PR #126's ephemeral simulation and, crucially, separate
from all migration execution authority. Confirmation can only append a
tamper-evident historical investigation entry. It never acknowledges an
unconfirmed journal intent or changes an HA registry.
"""

from __future__ import annotations

import hmac
import secrets
import time
from functools import partial
from typing import Any

from .const import DOMAIN
from .migration_recovery_confirmation import (
    _fresh_evidence,
    _valid_admin,
    _valid_request,
)
from .migration_recovery_records import (
    append_investigation_record,
    load_investigation_ledger,
)
from .migration_recovery_view import _async_collect_recovery_locked
from .workflow_lock import get_workflow_lock

_PENDING = "_migration_durable_investigation_pending"
_TTL = 180


class RecoveryRecordError(ValueError):
    """Constant sanitized errors only."""


def _non_execution() -> dict[str, Any]:
    return {
        "read_only_google_configuration": True,
        "decision_record_is_not_execution_authorization": True,
        "execution_authorized": False,
        "automatic_recovery_allowed": False,
        "journal_ack_allowed": False,
        "retry_allowed": False,
        "rollback_allowed": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
        "google_home_state_verified": False,
        "observation_atomic_across_processes": False,
    }


async def async_prepare_investigation_record(
    hass: Any, *, administrator_id: str,
    entity_id: str, disposition: str,
) -> dict[str, Any]:
    """Challenge bound to fresh full report and the current ledger head."""
    if not _valid_admin(administrator_id):
        raise RecoveryRecordError("administrator_unavailable")
    if not _valid_request(entity_id, disposition):
        raise RecoveryRecordError("invalid_investigation_disposition")
    async with get_workflow_lock(hass):
        pending = hass.data.setdefault(DOMAIN, {}).setdefault(_PENDING, {})
        pending.pop(administrator_id, None)
        if len(hass.config_entries.async_entries(DOMAIN)) != 1:
            raise RecoveryRecordError("integration_not_uniquely_configured")
        report = await _async_collect_recovery_locked(hass)
        evidence, details = _fresh_evidence(report, entity_id)
        ledger = await hass.async_add_executor_job(
            load_investigation_ledger, hass.config.config_dir
        )
        token = secrets.token_urlsafe(32)
        pending[administrator_id] = {
            "token": token,
            "expires": time.monotonic() + _TTL,
            "entity_id": entity_id,
            "disposition": disposition,
            "evidence": evidence,
            "count": ledger["record_count"],
            "last_sha": ledger["last_record_sha256"],
        }
        return {
            "schema_version": 1,
            "status": "awaiting_durable_investigation_confirmation",
            "entity_id": entity_id,
            "disposition": disposition,
            "confirmation_token": token,
            "expires_in_seconds": _TTL,
            "recovery_evidence_sha256": evidence,
            "expected_record_count": ledger["record_count"],
            "expected_last_record_sha256": ledger["last_record_sha256"],
            **details,
            **_non_execution(),
        }


async def async_confirm_investigation_record(
    hass: Any, *, administrator_id: str,
    entity_id: str, disposition: str,
    confirmation_token: str, confirmed: bool,
    acknowledge_external_uncertainty: bool,
) -> dict[str, Any]:
    """Consume a challenge and persist ONE audit entry after fresh checks."""
    if not _valid_admin(administrator_id):
        raise RecoveryRecordError("administrator_unavailable")
    if (
        not _valid_request(entity_id, disposition)
        or confirmed is not True
        or acknowledge_external_uncertainty is not True
        or not isinstance(confirmation_token, str)
        or not 1 <= len(confirmation_token) <= 256
    ):
        raise RecoveryRecordError("explicit_investigation_confirmation_required")
    async with get_workflow_lock(hass):
        pending = hass.data.setdefault(DOMAIN, {}).get(_PENDING, {})
        proof = pending.get(administrator_id)
        if (
            not isinstance(proof, dict)
            or time.monotonic() >= proof.get("expires", 0)
            or not hmac.compare_digest(
                confirmation_token, proof.get("token", "")
            )
        ):
            raise RecoveryRecordError("challenge_expired_or_invalid")
        # One-use proof is consumed BEFORE inspecting potentially stale data.
        # A failed write or changed state requires a new admin preparation.
        pending.pop(administrator_id, None)
        if (
            proof["entity_id"] != entity_id
            or proof["disposition"] != disposition
        ):
            raise RecoveryRecordError("challenge_scope_mismatch")
        if len(hass.config_entries.async_entries(DOMAIN)) != 1:
            raise RecoveryRecordError("integration_not_uniquely_configured")
        report = await _async_collect_recovery_locked(hass)
        evidence, details = _fresh_evidence(report, entity_id)
        if not hmac.compare_digest(evidence, proof["evidence"]):
            raise RecoveryRecordError("recovery_observation_changed")
        result = await hass.async_add_executor_job(
            partial(
                append_investigation_record,
                hass.config.config_dir,
                expected_record_count=proof["count"],
                expected_last_record_sha256=proof["last_sha"],
                expected_journal_revision=details["journal_revision"],
                expected_journal_evidence_sha256=(
                    details["journal_evidence_sha256"]
                ),
                expected_observed_evidence_sha256=evidence,
                entity_id=entity_id,
                disposition=disposition,
                administrator_id=administrator_id,
            )
        )
        return {
            "schema_version": 1,
            "status": "durable_investigation_recorded_no_execution",
            "record": result["record"],
            "record_count": result["record_count"],
            "record_fsync_completed": True,
            "human_confirmation_received": True,
            "external_effects_acknowledged_as_unknown": True,
            "label_changed": False,
            "journal_changed": False,
            "production_yaml_changed": False,
            **_non_execution(),
        }


async def async_get_investigation_records(hass: Any) -> dict[str, Any]:
    """Read protected history; mark historical evidence stale if different."""
    if len(hass.config_entries.async_entries(DOMAIN)) != 1:
        raise RecoveryRecordError("integration_not_uniquely_configured")
    async with get_workflow_lock(hass):
        ledger = await hass.async_add_executor_job(
            load_investigation_ledger, hass.config.config_dir
        )
        report = await _async_collect_recovery_locked(hass)
        rows = []
        for entry in ledger["records"]:
            try:
                current, _ = _fresh_evidence(report, entry["entity_id"])
            except (ValueError, TypeError, KeyError):
                comparison = "not_revalidated"
            else:
                comparison = (
                    "matching_current_observation"
                    if hmac.compare_digest(
                        current, entry["observed_evidence_sha256"]
                    )
                    else "historical_stale_observation"
                )
            rows.append({
                **entry,
                "evidence_relation": comparison,
                "execution_authorized": False,
            })
        return {
            "schema_version": 1,
            "status": "verified_investigation_history",
            "record_count": ledger["record_count"],
            "last_record_sha256": ledger["last_record_sha256"],
            "records": rows,
            "history_limit": 50,
            "history_read_only": True,
            **_non_execution(),
        }
