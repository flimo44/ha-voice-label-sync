"""Administrator read-only migration review facade for the HVLS panel.

The facade is intentionally non-authorizing. Every request takes a fresh
sanitized diagnostic and event-loop-native registry observations; it never
captures the protected baseline, transitions a journal, writes labels/YAML,
or changes V1 settings. The simulation runs off the HA event loop.
"""

from __future__ import annotations

from collections.abc import Mapping
from functools import partial
from typing import Any

from .const import CONF_LABEL, DEFAULT_LABEL
from .ha_registries import get_live_registries
from .migration_baseline import BaselineError, verify_baseline
from .migration_cutover_review import build_readonly_migration_review
from .migration_diagnostic import build_admin_migration_diagnostic
from .migration_stage_executor import _current_catalog
from .migration_stage_plan import build_reviewed_stage_plan
from .migration_staging_impact import (
    assess_label_staging_impact,
    capture_loaded_ga_label_impact,
)
from .services import DEFAULT_DOMAINS


class MigrationReviewError(ValueError):
    """Sanitized migration review failure; never contains private values."""


def _offline_review(
    config_dir: str,
    diagnostic: Mapping[str, Any],
    decisions: Mapping[str, Any],
    facts: Mapping[str, Any],
    registries: Mapping[str, Any],
    configured_label: str,
    label_id: str,
    impact_capture: Mapping[str, Any],
) -> dict[str, Any]:
    """Pure planning and optional baseline-backed simulation in an executor."""
    plan = build_reviewed_stage_plan(
        diagnostic, decisions, facts, label_id=label_id
    )
    impact = assess_label_staging_impact(diagnostic, plan, impact_capture)
    baseline_status = "unavailable"
    simulation = None
    try:
        baseline = verify_baseline(config_dir)
    except (BaselineError, OSError, TypeError, ValueError):
        # Missing, incomplete or corrupted: no automatic baseline creation.
        baseline_status = "not_verified"
    else:
        baseline_status = "verified"
        simulation = build_readonly_migration_review(
            config_dir,
            diagnostic,
            decisions,
            facts,
            registries,
            configured_label=configured_label,
            domains=DEFAULT_DOMAINS,
            expected_baseline_manifest_sha256=baseline["manifest_sha256"],
        )
    return {
        "schema_version": 1,
        "diagnostic": diagnostic,
        "preflight": plan,
        "pre_stage_impact": impact,
        "simulation": simulation,
        "protected_baseline_status": baseline_status,
        "read_only": True,
        "apply_allowed": False,
        "cutover_allowed": False,
        "google_home_state_verified": False,
    }


async def async_build_admin_review(
    hass: Any, decisions: Mapping[str, Any]
) -> dict[str, Any]:
    """Combine fresh HA observations with optional private offline simulation.

    Must be entered on Home Assistant's event loop. No privileged operation
    may rely on these preliminary decisions as a later write authorization.
    """
    if not isinstance(decisions, Mapping) or len(decisions) > 20_000:
        raise MigrationReviewError("invalid_review_decisions")
    entries = hass.config_entries.async_entries("ha_voice_label_sync")
    if len(entries) != 1:
        raise MigrationReviewError("integration_not_uniquely_configured")
    configured_label = {
        **entries[0].data, **entries[0].options
    }.get(CONF_LABEL, DEFAULT_LABEL)
    if not isinstance(configured_label, str) or not configured_label:
        raise MigrationReviewError("invalid_configured_label")

    diagnostic = await build_admin_migration_diagnostic(hass)

    # These three snapshots run sequentially on HA's event loop, without a
    # suspension between native identity/membership and registry snapshot.
    registries = get_live_registries(hass)
    entity_ids = [row["entity_id"] for row in diagnostic["entities"]]
    label_id, facts = _current_catalog(hass, configured_label, entity_ids)
    # The GoogleConfig oracle is queried ONLY on the HA event loop. Do not
    # leak the private runtime config into the executor or WebSocket result.
    imported = [
        entity_id for entity_id in entity_ids
        if isinstance(decisions.get(entity_id), Mapping)
        and decisions[entity_id].get("action") == "import"
    ]
    impact_capture = capture_loaded_ga_label_impact(hass, imported)

    return await hass.async_add_executor_job(
        partial(
            _offline_review,
            hass.config.config_dir,
            diagnostic,
            decisions,
            facts,
            registries,
            configured_label,
            label_id,
            impact_capture,
        )
    )
