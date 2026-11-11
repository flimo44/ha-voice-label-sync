"""Dormant, single-entity journaled label staging for assisted migration.

No WebSocket, service, startup hook or UI calls this entry point. A future
admin-only reviewed action must authorize each invocation. Never writes YAML,
alters Google Assistant, or changes unrelated labels.
"""

from __future__ import annotations

import hmac
import re
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from .migration_baseline import (
    BaselineError,
    _capture_sources,
    verify_baseline,
)
from .migration_journal import (
    JournalError,
    mark_label_applied,
    read_journal,
    record_label_intent,
)
from .migration_stage_plan import build_reviewed_stage_plan

_SHA = re.compile(r"^[0-9a-f]{64}$")


class MigrationStageError(ValueError):
    """Sanitized error code for a rejected or uncertain operation."""


def verify_current_sources(
    config_dir: str | Path,
    locations: list[dict[str, Any]],
    baseline_manifest_sha256: str,
) -> dict[str, Any]:
    """Rehash every original YAML file against an immutable verified baseline.

    Runs in a HA executor; it reads no !secret targets and creates no files.
    All files must still have the exact baseline bytes (not merely same paths).
    """
    if (
        not isinstance(baseline_manifest_sha256, str)
        or not _SHA.fullmatch(baseline_manifest_sha256)
        or not isinstance(locations, list)
    ):
        raise MigrationStageError("invalid_source_confirmation")
    try:
        baseline = verify_baseline(config_dir)
        if not hmac.compare_digest(
            baseline["manifest_sha256"], baseline_manifest_sha256
        ):
            raise MigrationStageError("baseline_confirmation_changed")
        saved = sorted(
            (item["path"], item["digest_sha256"])
            for item in baseline["files"]
        )
        actual = sorted(
            (item["path"], item["digest_sha256"])
            for item in locations
        )
        if actual != saved or not saved:
            raise MigrationStageError("source_inventory_changed")
        _capture_sources(Path(config_dir).resolve(strict=True), saved)
    except (BaselineError, OSError, KeyError, TypeError, ValueError) as exc:
        if isinstance(exc, MigrationStageError):
            raise
        raise MigrationStageError("source_or_baseline_unavailable") from exc
    return {"verified": True, "manifest_sha256": baseline_manifest_sha256}


def _current_catalog(
    hass: Any,
    configured_label: str,
    entity_ids: list[str],
) -> tuple[str, dict[str, dict[str, Any]]]:
    """Observe actual HA registry IDs and eligibility on the event loop."""
    from homeassistant.helpers import entity_registry as er

    from .entity_catalog import build_entity_catalog
    from .ha_registries import get_live_registries
    from .label_update import resolve_unique_label_id
    from .services import DEFAULT_DOMAINS

    registries = get_live_registries(hass)
    label_id = resolve_unique_label_id(
        registries["label_registry"]["data"]["labels"], configured_label
    )
    catalog = build_entity_catalog(registries, configured_label, DEFAULT_DOMAINS)
    eligibility = {
        entry["entity_id"]: entry.get("eligible")
        for entry in catalog["entities"]
    }
    native = er.async_get(hass)
    facts: dict[str, dict[str, Any]] = {}
    for entity_id in entity_ids:
        entry = native.async_get(entity_id)
        if entry is None:
            continue
        facts[entity_id] = {
            "registry_id": entry.id,
            "label_present": label_id in entry.labels,
            "eligible": eligibility.get(entity_id),
        }
    return label_id, facts


def _check_pending(
    journal: Mapping[str, Any],
    *,
    expected_revision: int,
    entity_id: str,
) -> None:
    if journal.get("revision") != expected_revision:
        raise MigrationStageError("journal_revision_changed")
    if journal.get("phase") != "labels_staging":
        raise MigrationStageError("labels_staging_phase_required")
    # No second mutation for the same entity, including after a restart:
    # 'intent' may have been written before or after HA was updated.
    if any(op.get("entity_id") == entity_id for op in journal["operations"]):
        raise MigrationStageError("entity_already_has_migration_operation")


def _write_one_ha_label(
    hass: Any, *,
    entity_id: str,
    expected_registry_id: str,
    label_id: str,
    configured_label: str,
) -> None:
    """Native registry CAS, check and write in one event-loop call, no await."""
    from homeassistant.helpers import entity_registry as er

    from .label_update import prepare_label_update

    fresh_id, facts = _current_catalog(hass, configured_label, [entity_id])
    if fresh_id != label_id:
        raise MigrationStageError("label_identity_changed")
    actual = facts.get(entity_id)
    if (
        actual is None
        or actual["registry_id"] != expected_registry_id
        or actual["eligible"] is not True
        or actual["label_present"] is not False
    ):
        raise MigrationStageError("registry_prewrite_conflict")

    registry = er.async_get(hass)
    entry = registry.async_get(entity_id)
    if entry is None or entry.id != expected_registry_id:
        raise MigrationStageError("registry_prewrite_conflict")
    before = set(entry.labels)
    after = prepare_label_update(
        before, label_id, enabled=True, expected_enabled=False
    )
    if len(after - before) != 1 or after - before != {label_id}:
        raise MigrationStageError("unexpected_label_delta")
    registry.async_update_entity(entity_id, labels=after)
    updated = registry.async_get(entity_id)
    if (
        updated is None
        or updated.id != expected_registry_id
        or set(updated.labels) != after
    ):
        raise MigrationStageError("registry_postwrite_conflict")


async def stage_one_approved_label(
    hass: Any,
    *,
    entity_id: str,
    decisions: Mapping[str, Any],
    expected_review_token_sha256: str,
    expected_baseline_manifest_sha256: str,
    expected_journal_revision: int,
    operation_id: str,
    configured_label: str,
    admin_approved: bool,
) -> dict[str, Any]:
    """Stage one approved, metadata-free addition with an intent-before-write.

    Requirements:
      - An independent future administrator-only UI verifies the user action.
      - The exact reviewed plan token matches a *fresh* diagnostic + registry.
      - The verified baseline and all original files still match disk.
      - The journal is already in the explicit labels_staging phase.
      - A durable intent is written BEFORE the native HA label mutation.

    If HA or the post-write acknowledgement fails, the remaining 'intent'
    must be investigated manually. Never retry this operation automatically.
    """
    if admin_approved is not True:
        raise MigrationStageError("explicit_admin_approval_required")
    if (
        not isinstance(expected_review_token_sha256, str)
        or not _SHA.fullmatch(expected_review_token_sha256)
        or not isinstance(expected_baseline_manifest_sha256, str)
        or not _SHA.fullmatch(expected_baseline_manifest_sha256)
    ):
        raise MigrationStageError("invalid_review_or_baseline_token")
    if not isinstance(decisions, Mapping) or type(expected_journal_revision) is not int:
        raise MigrationStageError("invalid_review_request")
    if not isinstance(entity_id, str) or not isinstance(operation_id, str):
        raise MigrationStageError("invalid_operation_identifier")
    if not isinstance(configured_label, str) or not configured_label:
        raise MigrationStageError("invalid_label_configuration")

    from .migration_diagnostic import build_admin_migration_diagnostic
    from .workflow_lock import get_workflow_lock

    async with get_workflow_lock(hass):
        diagnostic = await build_admin_migration_diagnostic(hass)
        if diagnostic.get("source", {}).get("status") != "resolved":
            raise MigrationStageError("source_not_resolved")
        entity_ids = [item["entity_id"] for item in diagnostic["entities"]]
        label_id, facts = _current_catalog(hass, configured_label, entity_ids)
        stage_plan = build_reviewed_stage_plan(
            diagnostic, decisions, facts, label_id=label_id
        )
        if not hmac.compare_digest(
            stage_plan["review_token_sha256"], expected_review_token_sha256
        ):
            raise MigrationStageError("review_expired")
        if stage_plan["global_blockers"]:
            raise MigrationStageError("global_stage_blocker")
        proposed = [
            item for item in stage_plan["label_additions_proposed"]
            if item["entity_id"] == entity_id
        ]
        if len(proposed) != 1:
            raise MigrationStageError("entity_not_approved_for_import")
        selected = proposed[0]

        # Disk comparisons are isolated from HA's event-loop thread.
        root = hass.config.config_dir
        await hass.async_add_executor_job(
            verify_current_sources,
            root,
            diagnostic["source"]["locations"],
            expected_baseline_manifest_sha256,
        )
        journal = await hass.async_add_executor_job(read_journal, root)
        _check_pending(
            journal,
            expected_revision=expected_journal_revision,
            entity_id=entity_id,
        )

        # An intent is durable before there can be any registry mutation.
        committed = await hass.async_add_executor_job(
            lambda: record_label_intent(
                root,
                operation_id=operation_id,
                entity_id=entity_id,
                registry_id=selected["registry_id"],
                label_id=selected["label_id"],
                expected_before=False,
                expected_after=True,
                expected_revision=expected_journal_revision,
            )
        )

        # The second disk CAS occurs after writing the intent. If it fails,
        # the intent remains pending for review and no label is touched.
        await hass.async_add_executor_job(
            verify_current_sources,
            root,
            diagnostic["source"]["locations"],
            expected_baseline_manifest_sha256,
        )

        # Absolutely no await across native registry read / CAS / write.
        _write_one_ha_label(
            hass,
            entity_id=entity_id,
            expected_registry_id=selected["registry_id"],
            label_id=selected["label_id"],
            configured_label=configured_label,
        )

        # Failure here leaves a recoverable, *unconfirmed* intent.
        final = await hass.async_add_executor_job(
            lambda: mark_label_applied(
                root,
                operation_id,
                registry_id=selected["registry_id"],
                current_membership=True,
                expected_revision=committed["revision"],
            )
        )
        return {
            "entity_id": entity_id,
            "operation_id": operation_id,
            "journal_revision": final["revision"],
            "status": "label_staged",
            "cutover_allowed": False,
            "metadata_preservation_verified": False,
            "google_home_state_verified": False,
        }
