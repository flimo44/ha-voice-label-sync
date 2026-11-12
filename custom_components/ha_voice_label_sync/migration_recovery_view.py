"""Administrator-only read-only recovery triage for assisted migration.

Reconcile a protected, immutable journal with a fresh native HA registry
observation. Never replay, acknowledge or undo an operation. Even an apparently
matched registry state is NOT evidence that Google Home is up to date.
"""

from __future__ import annotations

from functools import partial
from pathlib import Path
from typing import Any

from .const import DOMAIN
from .migration_baseline import (
    BaselineError,
    _capture_sources,
    verify_baseline,
)
from .migration_journal import JournalError, read_journal, recovery_report
from .workflow_lock import get_workflow_lock


class RecoveryViewError(ValueError):
    """Non-sensitive failure code."""


def _answer(status: str, *, reason: str | None = None) -> dict[str, Any]:
    """Never grant a mutation authority from this diagnostic."""
    return {
        "schema_version": 1,
        "status": status,
        "reason": reason,
        "phase": None,
        "journal_revision": None,
        "source_integrity": "not_verified",
        "needs_review": status != "not_initialized",
        "summary": {"total": 0, "unconfirmed": 0, "other_issues": 0},
        "operations": [],
        "observation_atomic_across_processes": False,
        "read_only": True,
        "automatic_recovery_allowed": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
        "google_home_state_verified": False,
    }


def _read_disk_snapshot(config_dir: str) -> dict[str, Any]:
    """Read without creating directories, files, baseline or journal."""
    storage = Path(config_dir) / ".storage" / "hvls_migration"
    if not storage.exists() and not storage.is_symlink():
        return {"status": "not_initialized"}
    try:
        baseline = verify_baseline(config_dir)
        journal = read_journal(config_dir)
    except (BaselineError, JournalError, OSError, TypeError, ValueError):
        return {"status": "unavailable"}
    return {
        "status": "loaded",
        "baseline_files": baseline["files"],
        "journal": journal,
    }


def _native_observations(hass: Any, operations: list[dict[str, Any]]) -> tuple[
    dict[str, dict[str, Any]], dict[str, bool]
]:
    """Capture event-loop native state with no await and no mutation."""
    from homeassistant.helpers import entity_registry as er
    from homeassistant.helpers import label_registry as lr

    registry = er.async_get(hass)
    label_registry = lr.async_get(hass)
    observations = {}
    labels_exist = {}
    for op in operations:
        entity_id = op["entity_id"]
        label_id = op["label_id"]
        labels_exist[entity_id] = label_id in label_registry.labels
        entry = registry.async_get(entity_id)
        if entry is None:
            continue
        observations[entity_id] = {
            "registry_id": entry.id,
            "has_label": label_id in entry.labels,
        }
    return observations, labels_exist


def _finalize_disk_snapshot(
    config_dir: str,
    previous: dict[str, Any],
    observations: dict[str, dict[str, Any]],
    labels_exist: dict[str, bool],
) -> dict[str, Any]:
    """Re-read the journal to spot concurrent edits; classify without writes."""
    report = _answer("unavailable", reason="journal_changed_or_unreadable")
    original = previous["journal"]
    try:
        classified = recovery_report(config_dir, observations)
        current = read_journal(config_dir)
    except (BaselineError, JournalError, OSError, TypeError, ValueError):
        return report
    if current != original or classified["revision"] != original["revision"]:
        return _answer("snapshot_changed", reason="journal_changed_during_observation")

    source_status = "verified_unchanged"
    try:
        _capture_sources(
            Path(config_dir).resolve(strict=True),
            sorted(
                (item["path"], item["digest_sha256"])
                for item in previous["baseline_files"]
            ),
        )
    except (BaselineError, OSError, TypeError, ValueError):
        source_status = "changed_or_unavailable"

    rows = []
    unconfirmed = 0
    other_issues = 0
    for operation, observed in zip(
        original["operations"], classified["operations"], strict=True
    ):
        entity_id = operation["entity_id"]
        membership = observations.get(entity_id, {}).get("has_label")
        label_exists = labels_exist.get(entity_id) is True
        status = observed["status"]
        if not label_exists:
            status = "label_identity_missing"
        issue = (
            observed["needs_review"] is True
            or not label_exists
        )
        if operation["status"] == "intent":
            unconfirmed += 1
        elif issue:
            other_issues += 1
        rows.append({
            "entity_id": entity_id,
            "operation_status": operation["status"],
            "observed_status": status,
            "membership": (
                "present" if membership is True else
                "absent" if membership is False else "unknown"
            ),
            "registry_identity_matches": (
                observations.get(entity_id, {}).get("registry_id")
                == operation["registry_id"]
            ),
            "label_identity_exists": label_exists,
            "needs_review": issue,
        })

    # Non-baseline phases without an operation are also not an approval.
    phase = original["phase"]
    issues = (
        source_status != "verified_unchanged"
        or any(row["needs_review"] for row in rows)
        or (phase not in ("baseline_ready", "rolled_back"))
    )
    result = _answer("review_required" if issues else "observed_no_pending")
    result.update({
        "phase": phase,
        "journal_revision": original["revision"],
        "source_integrity": source_status,
        "needs_review": issues,
        "summary": {
            "total": len(rows),
            "unconfirmed": unconfirmed,
            "other_issues": other_issues,
        },
        "operations": rows,
    })
    return result


async def async_get_admin_migration_recovery(hass: Any) -> dict[str, Any]:
    """Read private journal and current native registry under shared HA lock."""
    if len(hass.config_entries.async_entries(DOMAIN)) != 1:
        raise RecoveryViewError("integration_not_uniquely_configured")
    async with get_workflow_lock(hass):
        config_dir = hass.config.config_dir
        disk = await hass.async_add_executor_job(
            _read_disk_snapshot, config_dir
        )
        if disk["status"] != "loaded":
            return _answer(
                disk["status"],
                reason=(
                    "protected_journal_or_baseline_invalid"
                    if disk["status"] == "unavailable" else None
                ),
            )
        try:
            observed, labels_exist = _native_observations(
                hass, disk["journal"]["operations"]
            )
        except (ImportError, AttributeError, RuntimeError, KeyError, TypeError):
            return _answer(
                "unavailable", reason="native_registries_unavailable"
            )
        return await hass.async_add_executor_job(
            partial(
                _finalize_disk_snapshot,
                config_dir,
                disk,
                observed,
                labels_exist,
            )
        )
