"""Administrator-only read-only migration diagnostic.

Combines disk discovery, the HA event-loop snapshot and the *loaded* manual
Google Assistant exposure-policy comparison. It deliberately never authorizes
label import, file generation, reload, or migration cutover.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any

from .migration_discovery import discover_google_assistant
from .migration_exposure import project_manual_google_exposure
from .migration_live_snapshot import capture_live_google_runtime
from .migration_loaded_policy import compare_loaded_google_on_ha

_CODE = re.compile(r"^[a-z][a-z0-9_]{0,79}$")
_FIELDS = frozenset({"expose", "name", "room", "aliases"})
_EXPOSURES = frozenset({"exposed", "not_exposed", "unknown"})
_DIFF_STATES = frozenset(
    {"changed", "added_on_disk", "removed_on_disk", "unknown"}
)


def _code(value: Any) -> str:
    """Permit machine-readable reason codes only, never arbitrary exception text."""
    return value if isinstance(value, str) and _CODE.fullmatch(value) else "unknown"


def _codes(value: Any) -> list[str]:
    if not isinstance(value, (list, tuple)):
        return []
    return [_code(item) for item in value]


def _unavailable(reason: str) -> dict[str, Any]:
    return {"status": "unavailable", "reason": reason}


def _policy_view(policy: Mapping[str, Any]) -> dict[str, Any]:
    """Explicit allowlist: no names, rooms, aliases or loaded HA configuration."""
    differences: list[dict[str, Any]] = []
    for diff in policy.get("differences", []):
        if not isinstance(diff, Mapping):
            continue
        differences.append(
            {
                "entity_id": diff["entity_id"],
                "status": (
                    diff["status"]
                    if diff.get("status") in _DIFF_STATES
                    else "unknown"
                ),
                "changed_fields": [
                    field
                    for field in diff.get("changed_fields", [])
                    if field in _FIELDS
                ],
            }
        )
    raw_summary = policy.get("summary")
    summary = (
        {
            key: raw_summary[key]
            for key in (
                "disk_entries", "loaded_entries", "unchanged", "changed",
                "added_on_disk", "removed_on_disk", "unknown",
            )
            if key in raw_summary and type(raw_summary[key]) is int
        }
        if isinstance(raw_summary, Mapping)
        else None
    )
    return {
        "status": _code(policy.get("status")),
        "reason": _code(policy.get("reason")) if policy.get("reason") else None,
        "compared_fields_match": (
            policy.get("compared_fields_match")
            if policy.get("compared_fields_match") in (True, False, None)
            else None
        ),
        "rule_changes": [
            name
            for name in policy.get("rule_changes", [])
            if name in {"expose_by_default", "exposed_domains"}
        ],
        "differences": differences,
        "summary": summary,
        "source_freshness_verified": False,
        "google_home_state_verified": False,
    }


def compose_admin_diagnostic(
    discovery: Mapping[str, Any],
    snapshot: Mapping[str, Any],
    projection: Mapping[str, Any],
    policy: Mapping[str, Any],
) -> dict[str, Any]:
    """Build the strictly sanitized response, including local anomaly details.

    A projection based on disk YAML is never labelled as the active policy.
    Matching a subset of policy fields is not proof of Google Home parity.
    """
    mode = discovery.get("mode")
    source = discovery.get("source", {})
    source_status = source.get("status", "ambiguous")
    blocked = bool(discovery.get("global_blockers")) or source_status != "resolved"
    if mode == "new_configuration" and not blocked:
        review_status = "not_applicable"
    elif blocked or mode != "assisted_migration":
        review_status = "blocked"
    else:
        review_status = "pending_review"

    policy_view = _policy_view(policy)
    projection_ok = projection.get("status") == "read_only_projection"
    projection_by_id = (
        {row["entity_id"]: row for row in projection["entities"]}
        if projection_ok
        else {}
    )
    disk_by_id = {
        row["entity_id"]: row
        for row in discovery.get("entities", [])
    }
    drift_by_id = {
        row["entity_id"]: row
        for row in policy_view["differences"]
    }

    entities = []
    for entity_id in sorted(disk_by_id.keys() | projection_by_id.keys()):
        disk = disk_by_id.get(entity_id)
        projected = projection_by_id.get(entity_id)
        intent = disk.get("yaml_exposure_intent") if disk else "not_configured"
        reasons = _codes(disk.get("reasons", [])) if disk else []
        if projected:
            reasons.extend(_codes(projected.get("reasons", [])))
        reasons = list(dict.fromkeys(reasons))
        projected_exposure = (
            projected.get("ha_sync_exposure") if projected else "unknown"
        )
        if projected_exposure not in _EXPOSURES:
            projected_exposure = "unknown"

        before = disk.get("before", {}) if disk else {}
        custom_fields = (
            [
                name
                for name in ("name", "room", "aliases")
                if before.get(name)
            ]
            if isinstance(before, Mapping)
            else []
        )
        if disk is None:
            category = (
                "implicitly_exposed"
                if projected_exposure == "exposed"
                else "runtime_without_yaml_entry"
            )
        elif intent == "exclude":
            category = "explicitly_excluded"
        elif (
            not blocked
            and policy_view["status"] in {
                "match_compared_fields", "partial_unknown", "drift_detected"
            }
            and not policy_view["rule_changes"]
            and entity_id not in drift_by_id
            and snapshot.get("status") in {"complete", "partial"}
            and projected_exposure == "exposed"
            and projected is not None
            and projected.get("registry_present") is True
            and not custom_fields
            and all(
                reason in {"registry_and_runtime_not_yet_checked", "explicitly_exposed"}
                for reason in reasons
            )
        ):
            # A review candidate, NOT a validated or authorized import.
            category = "candidate_for_review"
        else:
            category = "needs_review"

        entities.append(
            {
                "entity_id": entity_id,
                "category": category,
                "yaml_exposure_intent": _code(intent),
                "disk_ha_sync_projection": projected_exposure,
                "active_google_home_state": "unknown",
                "reasons": reasons,
                "customization_fields_present": custom_fields,
                "loaded_policy_difference": drift_by_id.get(entity_id),
            }
        )

    counts = {key: 0 for key in (
        "candidate_for_review",
        "needs_review",
        "explicitly_excluded",
        "implicitly_exposed",
        "runtime_without_yaml_entry",
    )}
    for item in entities:
        counts[item["category"]] += 1

    locations = []
    for location in source.get("locations", []):
        # Discovery only ever returns relative paths inside the HA config root.
        locations.append(
            {
                "path": location["path"],
                "kind": _code(location.get("kind")),
                "digest_sha256": location.get("digest_sha256"),
            }
        )

    rules = discovery.get("rules", {})
    return {
        "schema_version": 1,
        "read_only": True,
        "mode": _code(mode),
        "review_status": review_status,
        "source": {
            "status": _code(source_status),
            "locations": locations,
            "warnings": _codes(source.get("warnings", [])),
            "unreferenced_google_entity_file_present": (
                source.get("unreferenced_google_entity_file_present") is True
                if mode == "new_configuration" else False
            ),
        },
        "rules": {
            "expose_by_default": _code(rules.get("expose_by_default")),
            "exposed_domains_declared": rules.get("exposed_domains_declared"),
            "implicit_exposure_may_change_with_new_entities": rules.get(
                "implicit_exposure_may_change_with_new_entities"
            ),
        },
        "global_blockers": _codes(discovery.get("global_blockers", [])),
        "runtime_snapshot": {
            "status": _code(snapshot.get("status")),
            "reason": (
                _code(snapshot.get("reason"))
                if snapshot.get("reason") else None
            ),
            "trait_check_failures": snapshot.get("trait_check_failures", 0),
        },
        "loaded_policy": policy_view,
        "disk_projection": {
            "status": _code(projection.get("status")),
            "reason": (
                _code(projection.get("reason"))
                if projection.get("reason") else None
            ),
            "basis": "disk_yaml_only",
            "active_runtime_policy_certified": False,
            "summary": projection.get("summary") if projection_ok else None,
        },
        "counts": {
            "explicit_yaml_entries": len(disk_by_id),
            **counts,
        },
        "entities": entities,
        "source_freshness_verified": False,
        "google_home_state_verified": False,
        "cutover_allowed": False,
    }


async def build_admin_migration_diagnostic(hass: Any) -> dict[str, Any]:
    """Read files in executor, then inspect HA state and loaded GA on HA loop."""
    discovery = await hass.async_add_executor_job(
        discover_google_assistant, hass.config.config_dir
    )
    snapshot: dict[str, Any] = _unavailable("source_not_resolved")
    projection: dict[str, Any] = _unavailable("source_not_resolved")
    policy: dict[str, Any] = _unavailable("source_not_resolved")

    if (
        discovery.get("mode") == "assisted_migration"
        and discovery.get("source", {}).get("status") == "resolved"
        and not discovery.get("global_blockers")
    ):
        # These adapters MUST be called on the HA event loop, not the executor.
        snapshot = capture_live_google_runtime(hass)
        policy = compare_loaded_google_on_ha(hass, discovery)
        if snapshot.get("status") != "unavailable":
            projection = project_manual_google_exposure(
                discovery,
                snapshot["entities"],
                default_exposed_domains=snapshot["default_exposed_domains"],
                inventory_complete=snapshot["inventory_complete"],
            )
        else:
            projection = _unavailable("ha_runtime_snapshot_unavailable")

    return compose_admin_diagnostic(discovery, snapshot, projection, policy)
