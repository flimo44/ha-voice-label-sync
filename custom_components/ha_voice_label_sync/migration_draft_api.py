"""Administrator-only access to durable, non-authorizing migration drafts.

No methods in this module stage HA labels, edit original Google YAML or
change journal phase. Decisions are persisted only on explicit requests.
"""

from __future__ import annotations

from collections.abc import Mapping
from functools import partial
from typing import Any

from .const import DOMAIN
from .migration_decision_draft import load_review_draft, save_review_draft
from .migration_review_api import async_build_admin_review
from .workflow_lock import get_workflow_lock


class AdminDraftError(ValueError):
    """Machine-readable code without any private YAML content."""


async def async_load_admin_draft(hass: Any) -> dict[str, Any]:
    """Read-only draft restoration for a connected HA administrator."""
    if len(hass.config_entries.async_entries(DOMAIN)) != 1:
        raise AdminDraftError("integration_not_uniquely_configured")
    async with get_workflow_lock(hass):
        return await hass.async_add_executor_job(
            load_review_draft, hass.config.config_dir
        )


async def async_save_admin_draft(
    hass: Any,
    *,
    user_id: str,
    decisions: Mapping[str, Any],
    expected_review_token_sha256: str,
    expected_baseline_manifest_sha256: str,
    expected_journal_revision: int,
    expected_draft_revision: int,
) -> dict[str, Any]:
    """Recheck server-side HA evidence, then CAS the private review draft."""
    if (
        not isinstance(user_id, str) or not 0 < len(user_id) <= 128
        or not isinstance(decisions, Mapping)
        or len(decisions) > 20_000
    ):
        raise AdminDraftError("invalid_administrator_or_choices")
    if len(hass.config_entries.async_entries(DOMAIN)) != 1:
        raise AdminDraftError("integration_not_uniquely_configured")
    async with get_workflow_lock(hass):
        # Do not reuse browser-supplied diagnostic, plan or registry facts.
        current = await async_build_admin_review(hass, decisions)
        diagnostic = current["diagnostic"]
        plan = current["preflight"]
        if (
            current["protected_baseline_status"] != "verified"
            or plan["review_token_sha256"] != expected_review_token_sha256
        ):
            raise AdminDraftError("review_changed_or_baseline_unavailable")

        return await hass.async_add_executor_job(
            partial(
                save_review_draft,
                hass.config.config_dir,
                decisions=decisions,
                allowed_entity_ids={
                    row["entity_id"] for row in diagnostic["entities"]
                },
                source_locations=diagnostic["source"]["locations"],
                source_evidence_sha256=plan["source_evidence_sha256"],
                fresh_review_token_sha256=plan["review_token_sha256"],
                expected_review_token_sha256=expected_review_token_sha256,
                expected_baseline_manifest_sha256=(
                    expected_baseline_manifest_sha256
                ),
                expected_journal_revision=expected_journal_revision,
                expected_draft_revision=expected_draft_revision,
                administrator_id=user_id,
            )
        )
