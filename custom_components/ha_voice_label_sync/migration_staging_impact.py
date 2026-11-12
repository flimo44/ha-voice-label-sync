"""Read-only pre-staging label impact analysis for loaded *manual* Google.

Manual GoogleConfig.should_expose depends on runtime exposure rules and
visibility, not on HVLS label membership (as of the inspected HA contract).
Reproduce and cross-check that rule against the live runtime BEFORE staging.

This is only a bounded preflight: other label-driven integrations, automations,
Google Home cache and future HA runtime implementations remain unverified.
It MUST NOT be treated as an execution approval or a staging authorization.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

_MAX = 20_000
_REASON_CODES = {
    "loaded_ga_runtime_unavailable",
    "manual_ga_entry_not_unique",
    "additional_ga_entries_present",
    "unexpected_ga_runtime_type",
    "invalid_loaded_policy_shape",
    "native_entity_registry_unavailable",
    "native_google_exposure_unavailable",
    "native_google_exposure_not_bool",
    "loaded_policy_entity_missing",
    "loaded_policy_entity_invalid",
}


class StagingImpactError(ValueError):
    """Fixed diagnostic code only; no sensitive config or file paths."""


def _unavailable(reason: str) -> dict[str, Any]:
    return {
        "status": "unavailable",
        "reason": (
            reason if reason in _REASON_CODES
            else "loaded_ga_runtime_unavailable"
        ),
        "manual_google_policy_checked": False,
        "observations": {},
    }


def capture_loaded_ga_label_impact(
    hass: Any, entity_ids: list[str]
) -> dict[str, Any]:
    """Capture only non-secret Google exposure evidence on the HA event loop.

    No YAML, alias, name, room, PIN, credentials or source path is copied.
    Calling should_expose only observes the currently loaded manual policy;
    neither labels nor Google configuration are changed.
    """
    if (
        not isinstance(entity_ids, list)
        or len(entity_ids) > _MAX
        or any(not isinstance(x, str) or "." not in x for x in entity_ids)
        or len(set(entity_ids)) != len(entity_ids)
    ):
        raise StagingImpactError("invalid_entity_inventory")
    try:
        from homeassistant.components.google_assistant.http import GoogleConfig
        from homeassistant.config_entries import SOURCE_IMPORT
        from homeassistant.helpers import entity_registry as er
    except (ImportError, AttributeError):
        return _unavailable("loaded_ga_runtime_unavailable")

    try:
        entries = hass.config_entries.async_entries("google_assistant")
        manual = [entry for entry in entries if entry.source == SOURCE_IMPORT]
        if len(manual) != 1:
            return _unavailable("manual_ga_entry_not_unique")
        if len(entries) != 1:
            return _unavailable("additional_ga_entries_present")
        runtime = manual[0].runtime_data
        # Exact type is intentional: an override can change the policy
        # independently of the recognized manual GoogleConfig rule.
        if type(runtime) is not GoogleConfig:
            return _unavailable("unexpected_ga_runtime_type")
        config = runtime._config
        if not isinstance(config, Mapping):
            return _unavailable("invalid_loaded_policy_shape")
        default = config.get("expose_by_default")
        domains = config.get("exposed_domains")
        original_entities = config.get("entity_config", {})
        if (
            type(default) is not bool
            or not isinstance(domains, (list, tuple, set, frozenset))
            or len(domains) > _MAX
            or any(not isinstance(x, str) or not x for x in domains)
            or not isinstance(original_entities, Mapping)
            or len(original_entities) > _MAX
        ):
            return _unavailable("invalid_loaded_policy_shape")
        # The native GoogleConfig property uses normalized config entries.
        # Reject an unexpected policy representation instead of guessing.
        registry = er.async_get(hass)
    except (AttributeError, KeyError, RuntimeError, TypeError, ValueError):
        return _unavailable("native_entity_registry_unavailable")

    observations: dict[str, dict[str, Any]] = {}
    for entity_id in entity_ids:
        try:
            entry = registry.async_get(entity_id)
            if entry is None:
                observations[entity_id] = {
                    "status": "native_entity_registry_unavailable"
                }
                continue
            overrides = original_entities.get(entity_id, {})
            if not isinstance(overrides, Mapping):
                observations[entity_id] = {"status": "loaded_policy_entity_invalid"}
                continue
            explicit = overrides.get("expose")
            if explicit is not None and type(explicit) is not bool:
                observations[entity_id] = {"status": "loaded_policy_entity_invalid"}
                continue
            native = runtime.should_expose(entity_id)
            if type(native) is not bool:
                observations[entity_id] = {"status": "native_google_exposure_not_bool"}
                continue
            observations[entity_id] = {
                "status": "captured",
                "native_before": native,
                "explicit_expose": explicit,
                "default_exposure": default,
                "domain_allowed": entity_id.split(".", 1)[0] in domains,
                "auxiliary": (
                    entry.entity_category is not None
                    or entry.hidden_by is not None
                ),
            }
        except (AttributeError, RuntimeError, TypeError, ValueError, KeyError):
            observations[entity_id] = {"status": "native_google_exposure_unavailable"}
    return {
        "status": "captured",
        "manual_google_policy_checked": True,
        "observations": observations,
        "runtime_is_exact_google_config": True,
    }


def _model(exposure: Mapping[str, Any]) -> bool | None:
    if (
        exposure.get("status") != "captured"
        or type(exposure.get("native_before")) is not bool
        or (
            exposure.get("explicit_expose") is not None
            and type(exposure.get("explicit_expose")) is not bool
        )
        or type(exposure.get("default_exposure")) is not bool
        or type(exposure.get("domain_allowed")) is not bool
        or type(exposure.get("auxiliary")) is not bool
    ):
        return None
    explicit = exposure["explicit_expose"]
    if explicit is not None:
        return explicit
    return (
        exposure["default_exposure"]
        and exposure["domain_allowed"]
        and not exposure["auxiliary"]
    )


def assess_label_staging_impact(
    diagnostic: Mapping[str, Any],
    stage_plan: Mapping[str, Any],
    observed: Mapping[str, Any],
) -> dict[str, Any]:
    """Compare current native exposure to a label-only hypothetical update.

    The calculation does NOT mutate a registry. Its after-state leaves
    all exposure rules and visibility unchanged; the only hypothetical
    change is HVLS label membership. It cannot predict other integrations,
    automation triggers, or actual Google Home state.
    """
    if (
        not isinstance(diagnostic, Mapping)
        or not isinstance(stage_plan, Mapping)
        or not isinstance(observed, Mapping)
    ):
        raise StagingImpactError("impact_input_invalid")
    rows = diagnostic.get("entities")
    proposals = stage_plan.get("label_additions_proposed")
    if (
        not isinstance(rows, list)
        or not isinstance(proposals, list)
        or len(rows) > _MAX
        or len(proposals) > _MAX
    ):
        raise StagingImpactError("impact_inventory_invalid")
    entities = [row.get("entity_id") for row in rows if isinstance(row, Mapping)]
    if (
        len(entities) != len(rows)
        or any(not isinstance(x, str) or "." not in x for x in entities)
        or len(set(entities)) != len(entities)
    ):
        raise StagingImpactError("impact_inventory_invalid")
    proposal_ids = []
    for candidate in proposals:
        if not isinstance(candidate, Mapping):
            raise StagingImpactError("impact_proposals_invalid")
        identifier = candidate.get("entity_id")
        if not isinstance(identifier, str) or identifier not in entities:
            raise StagingImpactError("impact_proposals_invalid")
        proposal_ids.append(identifier)
    if len(set(proposal_ids)) != len(proposal_ids):
        raise StagingImpactError("impact_proposals_invalid")
    global_reasons = list(stage_plan.get("global_blockers", []))
    loaded = diagnostic.get("loaded_policy", {})
    if loaded.get("status") != "match_compared_fields":
        global_reasons.append("loaded_manual_policy_not_fully_matching_disk")
    if diagnostic.get("runtime_snapshot", {}).get("status") != "complete":
        global_reasons.append("incomplete_ha_runtime_snapshot")
    if observed.get("status") != "captured":
        global_reasons.append("loaded_manual_ga_impact_unavailable")
    captured = observed.get("observations", {})
    if not isinstance(captured, Mapping):
        captured = {}
        global_reasons.append("impact_capture_invalid")

    details: list[dict[str, Any]] = []
    for entity_id in sorted(proposal_ids):
        record = captured.get(entity_id)
        reasons = []
        projected = None
        before = None
        if not isinstance(record, Mapping):
            reasons.append("native_google_exposure_not_captured")
        else:
            projected = _model(record)
            before = record.get("native_before")
            if projected is None:
                reasons.append("loaded_manual_exposure_model_unknown")
            elif projected != before:
                reasons.append("manual_google_runtime_rule_disagreement")
        details.append({
            "entity_id": entity_id,
            "native_loaded_before": (
                before if type(before) is bool else None
            ),
            "hypothetical_after_label_only": projected,
            "manual_policy_delta_projected": (
                None if projected is None or type(before) is not bool
                else projected != before
            ),
            "status": "needs_review" if reasons else "no_manual_policy_delta_detected",
            "reasons": reasons,
        })
    local_issues = sum(row["status"] == "needs_review" for row in details)
    global_reasons = [
        item for item in dict.fromkeys(global_reasons)
        if isinstance(item, str)
    ]
    if global_reasons:
        status = "global_review_blocked"
    elif local_issues:
        status = "local_review_pending"
    elif not details:
        status = "no_label_additions_proposed"
    else:
        status = "no_manual_policy_delta_detected"

    return {
        "schema_version": 1,
        "status": status,
        "global_blockers": global_reasons,
        "summary": {
            "proposed": len(details),
            "manual_policy_unchanged_projected": len(details) - local_issues,
            "needs_review": local_issues,
        },
        "entities": details,
        "scope_limitations": [
            "external_label_consumers_unverified",
            "google_home_state_unverified",
            "future_ga_runtime_changes_unverified",
            "no_postwrite_native_observation",
        ],
        "manual_policy_only": True,
        "other_label_consumers_verified": False,
        "google_home_state_verified": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
        "read_only": True,
    }
