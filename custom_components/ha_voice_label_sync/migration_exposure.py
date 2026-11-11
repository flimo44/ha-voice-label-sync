"""Conservative read-only Google Assistant SYNC exposure projection.

The model follows Home Assistant manual Google Assistant exposure precedence.
It cannot infer Google trait support or observe Google Home device state.
"""

from __future__ import annotations

from collections.abc import Collection, Mapping
from typing import Any

EXPOSED = "exposed"
NOT_EXPOSED = "not_exposed"
UNKNOWN = "unknown"


def _auxiliary_status(entity: Mapping[str, Any]) -> bool | None:
    """A hidden or categorized HA registry entity is excluded by default."""
    registered = entity.get("registry_present")
    if registered is False:
        return False
    if registered is not True:
        return None
    if "hidden_by" not in entity or "entity_category" not in entity:
        return None
    return entity["hidden_by"] is not None or entity["entity_category"] is not None


def _rule_exposure(
    entry: Mapping[str, Any] | None,
    runtime: Mapping[str, Any] | None,
    *,
    default_enabled: bool,
    allowed_domains: frozenset[str] | None,
    domain: str,
) -> tuple[bool | None, str]:
    """Compute manual Google Assistant should_expose before trait filtering."""
    if entry is not None:
        intent = entry.get("yaml_exposure_intent")
        if intent == "exclude":
            return False, "explicitly_excluded"
        if intent == "expose":
            # HA ENTITY_SCHEMA defaults expose=true for entity_config records.
            return True, "explicitly_exposed"
        if intent != "inherit":
            return None, "invalid_explicit_expose"

    if not default_enabled:
        return False, "default_deny"
    if allowed_domains is None:
        return None, "default_domains_not_resolved"
    if domain not in allowed_domains:
        return False, "domain_not_exposed_by_default"
    if runtime is None:
        return None, "registry_visibility_unknown"
    auxiliary = _auxiliary_status(runtime)
    if auxiliary is None:
        return None, "registry_visibility_unknown"
    if auxiliary:
        return False, "hidden_or_auxiliary_entity"
    return True, "implicitly_exposed"


def _sync_status(
    rule: bool | None,
    reason: str,
    runtime: Mapping[str, Any] | None,
    *,
    inventory_complete: bool,
) -> tuple[str, list[str]]:
    """Estimate inclusion in HA SYNC, not visibility in Google Home."""
    if rule is False:
        return NOT_EXPOSED, [reason]
    if runtime is None:
        if inventory_complete:
            return NOT_EXPOSED, [reason, "no_active_state"]
        return UNKNOWN, [reason, "runtime_entity_unavailable"]

    active = runtime.get("state_present")
    if active is False:
        return NOT_EXPOSED, [reason, "no_active_state"]
    if active is not True:
        return UNKNOWN, [reason, "active_state_unknown"]
    if rule is None:
        return UNKNOWN, [reason]

    traits_supported = runtime.get("google_traits_supported")
    if traits_supported is False:
        return NOT_EXPOSED, [reason, "google_traits_unsupported"]
    if traits_supported is not True:
        return UNKNOWN, [reason, "google_traits_not_verified"]
    return EXPOSED, [reason]


def project_manual_google_exposure(
    discovery: Mapping[str, Any],
    runtime_entities: Collection[Mapping[str, Any]],
    *,
    default_exposed_domains: Collection[str] | None = None,
    inventory_complete: bool = False,
) -> dict[str, Any]:
    """Project HA manual Google SYNC exposure without I/O or any write.

    The caller must supply the actual state machine and entity registry facts.
    google_traits_supported must come from HA's actual Google trait check.
    If YAML omits exposed_domains, pass the HA runtime's default domains.
    A partial runtime inventory must not set inventory_complete to True.

    This never authorizes a cutover or claims Google Home device parity.
    """
    if discovery.get("mode") != "assisted_migration":
        return {
            "status": "unavailable",
            "reason": "not_a_resolved_manual_google_config",
            "entities": [],
            "summary": None,
            "cutover_allowed": False,
        }
    if discovery.get("source", {}).get("status") != "resolved":
        return {
            "status": "unavailable",
            "reason": "unresolved_source_configuration",
            "entities": [],
            "summary": None,
            "cutover_allowed": False,
        }
    if discovery.get("global_blockers"):
        return {
            "status": "unavailable",
            "reason": "global_blockers_present",
            "entities": [],
            "summary": None,
            "cutover_allowed": False,
        }

    rules = discovery["rules"]
    flag = rules.get("expose_by_default")
    if flag not in {"true", "false"}:
        return {
            "status": "unavailable",
            "reason": "unknown_default_exposure",
            "entities": [],
            "summary": None,
            "cutover_allowed": False,
        }

    default_enabled = flag == "true"
    # Legacy discovery shorthand: default_all_supported actually means
    # exposed_domains was omitted. HA then uses DEFAULT_EXPOSED_DOMAINS,
    # a bounded list, not all supported domains.
    if rules.get("rule_type") == "default_all_supported":
        allowed = (
            frozenset(default_exposed_domains)
            if default_exposed_domains is not None
            else None
        )
    else:
        allowed = frozenset(rules.get("exposed_domains", []))

    yaml_entries = {entry["entity_id"]: entry for entry in discovery["entities"]}
    runtime: dict[str, Mapping[str, Any]] = {}
    for entity in runtime_entities:
        identifier = entity.get("entity_id")
        if not isinstance(identifier, str) or "." not in identifier:
            raise ValueError("Invalid runtime entity identifier")
        if identifier in runtime:
            raise ValueError("Duplicate runtime entity identifier")
        runtime[identifier] = entity

    rows: list[dict[str, Any]] = []
    counts = {EXPOSED: 0, NOT_EXPOSED: 0, UNKNOWN: 0}
    for entity_id in sorted(yaml_entries.keys() | runtime.keys()):
        entry = yaml_entries.get(entity_id)
        current = runtime.get(entity_id)
        domain = entity_id.split(".", 1)[0]
        exposure_rule, rule_reason = _rule_exposure(
            entry,
            current,
            default_enabled=default_enabled,
            allowed_domains=allowed,
            domain=domain,
        )
        state, reasons = _sync_status(
            exposure_rule,
            rule_reason,
            current,
            inventory_complete=inventory_complete,
        )

        if entry and entry.get("reasons"):
            invalid = any(
                issue.startswith("invalid_") or issue == "unhandled_entity_option"
                for issue in entry["reasons"]
            )
            if invalid:
                state = UNKNOWN
                reasons = [*reasons, "source_entity_requires_validation"]

        registered = current.get("registry_present") if current else None
        if registered is False:
            reasons.append("entity_without_registry_entry")
        if current and current.get("disabled_by") is not None:
            reasons.append("disabled_in_registry")

        counts[state] += 1
        rows.append(
            {
                "entity_id": entity_id,
                "domain": domain,
                "yaml_entry_present": entry is not None,
                "yaml_exposure_intent": (
                    entry.get("yaml_exposure_intent") if entry else "not_configured"
                ),
                "manual_ga_rule_exposes": exposure_rule,
                "ha_sync_exposure": state,
                "reasons": list(dict.fromkeys(reasons)),
                "registry_present": registered,
                "google_home_state": UNKNOWN,
            }
        )

    return {
        "status": "read_only_projection",
        "meaning": "HA manual Google Assistant SYNC, not Google Home state",
        "source_rule_type": rules.get("rule_type"),
        "default_domains_resolved": not default_enabled or allowed is not None,
        "inventory_complete": inventory_complete,
        "entities": rows,
        "summary": {
            "considered": len(rows),
            "exposed": counts[EXPOSED],
            "not_exposed": counts[NOT_EXPOSED],
            "unknown": counts[UNKNOWN],
        },
        "cutover_allowed": False,
    }
