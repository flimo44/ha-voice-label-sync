"""Administrator review attestation facade (no staging or cutover paths)."""

from __future__ import annotations

from functools import partial
from typing import Any

from .const import DOMAIN
from .migration_decision_draft import load_review_draft
from .migration_review_api import async_build_admin_review
from .migration_review_attestation import (
    AttestationError,
    attest_review,
    load_attestation,
    review_evidence,
)
from .workflow_lock import get_workflow_lock


async def _fresh_review(hass: Any) -> tuple[dict[str, Any], dict[str, Any]]:
    """Load protected saved choices, recompute native HA state server-side."""
    saved = await hass.async_add_executor_job(
        load_review_draft, hass.config.config_dir
    )
    if saved["status"] != "saved_unapproved_draft":
        raise AttestationError("fresh_saved_draft_required")
    report = await async_build_admin_review(hass, saved["decisions"])
    return saved, report


async def async_get_review_attestation(hass: Any) -> dict[str, Any]:
    """Read and independently reassess the previous human review."""
    if len(hass.config_entries.async_entries(DOMAIN)) != 1:
        raise AttestationError("integration_not_uniquely_configured")
    async with get_workflow_lock(hass):
        evidence = None
        try:
            _, report = await _fresh_review(hass)
            evidence = review_evidence(report)
        except (AttestationError, ValueError, KeyError, TypeError):
            # A stale/invalid review is never described as currently verified.
            evidence = None
        result = await hass.async_add_executor_job(
            partial(
                load_attestation,
                hass.config.config_dir,
                current_evidence=evidence,
            )
        )
        result["fresh_review_evidence"] = evidence
        return result


async def async_attest_admin_review(
    hass: Any,
    *,
    administrator_id: str,
    confirmed: bool,
    acknowledge_issues: bool,
    expected_attestation_revision: int,
    expected_draft_revision: int,
    expected_journal_revision: int,
    expected_baseline_manifest_sha256: str,
    expected_review_evidence_sha256: str,
) -> dict[str, Any]:
    """Require fresh server evidence, current saved draft and explicit consent."""
    if len(hass.config_entries.async_entries(DOMAIN)) != 1:
        raise AttestationError("integration_not_uniquely_configured")
    if confirmed is not True:
        raise AttestationError("explicit_review_confirmation_required")
    async with get_workflow_lock(hass):
        saved, report = await _fresh_review(hass)
        evidence = review_evidence(report)
        if (
            saved["draft_revision"] != expected_draft_revision
            or saved["journal_revision"] != expected_journal_revision
            or saved["baseline_manifest_sha256"]
            != expected_baseline_manifest_sha256
            or evidence["review_evidence_sha256"]
            != expected_review_evidence_sha256
        ):
            raise AttestationError("review_changed_since_confirmation")
        result = await hass.async_add_executor_job(
            partial(
                attest_review,
                hass.config.config_dir,
                expected_attestation_revision=expected_attestation_revision,
                expected_draft_revision=expected_draft_revision,
                expected_baseline_manifest_sha256=(
                    expected_baseline_manifest_sha256
                ),
                expected_journal_revision=expected_journal_revision,
                source_locations=report["diagnostic"]["source"]["locations"],
                current_evidence=report,
                expected_review_evidence_sha256=(
                    expected_review_evidence_sha256
                ),
                administrator_id=administrator_id,
                confirmed=confirmed,
                acknowledge_issues=acknowledge_issues,
            )
        )
        return result
