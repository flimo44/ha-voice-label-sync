"""Private, admin-only read-only preview of future stage execution admission.

Never calls the dormant executor. No approval token can be generated here:
even technically consistent evidence leaves independent execution authority
and external-effects verification explicitly missing.
"""

from __future__ import annotations

import re
from functools import partial
from typing import Any

from .const import CONF_LABEL, DEFAULT_LABEL, DOMAIN
from .migration_decision_draft import load_review_draft
from .migration_execution_admission import _base, assess_stage_admission
from .migration_journal import read_journal
from .migration_review_api import async_build_admin_review
from .migration_review_attestation import load_attestation, review_evidence
from .migration_stage_executor import verify_current_sources
from .migration_write_boundary import capture_native_boundary
from .workflow_lock import get_workflow_lock

_ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")


def _unavailable(entity_id: str | None, reason: str) -> dict[str, Any]:
    result = _base(entity_id, "technical_review_required")
    result["technical_blockers"] = [reason]
    return result


async def async_get_stage_admission_preview(
    hass: Any, *, entity_id: str,
) -> dict[str, Any]:
    """Inspect all server-owned evidence, returning no execution capability."""
    if (
        not isinstance(entity_id, str)
        or len(entity_id) > 255
        or not _ENTITY.fullmatch(entity_id)
    ):
        return _unavailable(None, "invalid_entity_id")
    async with get_workflow_lock(hass):
        entries = hass.config_entries.async_entries(DOMAIN)
        if len(entries) != 1:
            return _unavailable(entity_id, "integration_not_uniquely_configured")
        settings = {**entries[0].data, **entries[0].options}
        label = settings.get(CONF_LABEL, DEFAULT_LABEL)
        if not isinstance(label, str) or not label:
            return _unavailable(entity_id, "configured_label_unavailable")
        config_dir = hass.config.config_dir
        try:
            saved = await hass.async_add_executor_job(
                load_review_draft, config_dir
            )
            if saved.get("status") != "saved_unapproved_draft":
                return _unavailable(entity_id, "fresh_saved_draft_required")
            journal = await hass.async_add_executor_job(
                read_journal, config_dir
            )
            report = await async_build_admin_review(hass, saved["decisions"])
            evidence = review_evidence(report)
            attestation = await hass.async_add_executor_job(
                partial(
                    load_attestation, config_dir,
                    current_evidence=evidence,
                )
            )
            source = report.get("diagnostic", {}).get("source", {})
            if not isinstance(source, dict):
                return _unavailable(entity_id, "source_inventory_unavailable")
            locations = source.get("locations")
            if not isinstance(locations, list):
                return _unavailable(entity_id, "source_inventory_unavailable")
            verified = await hass.async_add_executor_job(
                verify_current_sources,
                config_dir,
                locations,
                journal["baseline_manifest_sha256"],
            )
            # Capture on the native HA event loop after other awaits.
            native = capture_native_boundary(
                hass, entity_id=entity_id,
                configured_label=label, desired_present=True,
            )
            # A concurrent HVLS writer can change private storage between
            # executor reads despite an in-process workflow lock. Fail shut.
            end_journal = await hass.async_add_executor_job(
                read_journal, config_dir
            )
            end_saved = await hass.async_add_executor_job(
                load_review_draft, config_dir
            )
            if end_journal != journal or end_saved != saved:
                return _unavailable(entity_id, "protected_evidence_changed")
            await hass.async_add_executor_job(
                verify_current_sources,
                config_dir,
                locations,
                journal["baseline_manifest_sha256"],
            )
            # Also ensure no native registry drift during disk I/O. This is
            # another OBSERVATION only, never a write-time atomicity claim.
            from .migration_write_boundary import assess_native_boundary

            native_assessment = assess_native_boundary(
                hass, capture=native
            )
            if native_assessment.get("status") != "matched":
                return _unavailable(entity_id, "native_snapshot_changed")
            return assess_stage_admission(
                entity_id=entity_id,
                saved_draft=saved,
                review=report,
                attestation=attestation,
                journal=journal,
                sources_verified=verified,
                native_capture=native,
            )
        except (OSError, ValueError, KeyError, TypeError, RuntimeError, AttributeError):
            return _unavailable(entity_id, "protected_evidence_unavailable")
