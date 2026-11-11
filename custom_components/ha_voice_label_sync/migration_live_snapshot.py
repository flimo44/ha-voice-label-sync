"""Read-only snapshot of actual HA state and Google Assistant trait support.

This adapter is intentionally NOT wired to a WebSocket, service or migration
writer. Access native HA registries on the HA event-loop thread.
"""

from __future__ import annotations

from collections.abc import Callable, Collection, Iterable, Mapping
from typing import Any


class LiveSnapshotError(ValueError):
    """Invalid or incomplete runtime source: no safe snapshot."""


def _unavailable(reason: str) -> dict[str, Any]:
    return {
        "status": "unavailable",
        "reason": reason,
        "inventory_complete": False,
        "entities": [],
        "default_exposed_domains": None,
        "trait_check_failures": 0,
    }


def build_runtime_snapshot(
    states: Iterable[Any],
    registry_entries: Iterable[Any],
    trait_support: Callable[[Any], bool],
    *,
    default_exposed_domains: Collection[str],
) -> dict[str, Any]:
    """Make a sanitized inventory from genuine state and registry snapshots.

    A trait failure affects ONLY that entity; it becomes unknown, not false.
    There is no storage, state or registry mutation. No entity attributes,
    credentials, labels or diagnostics text from third-party integrations
    enter the result.
    """
    domains = tuple(default_exposed_domains)
    if any(not isinstance(domain, str) or not domain for domain in domains):
        raise LiveSnapshotError("invalid_default_domains")

    registered: dict[str, Any] = {}
    for entry in registry_entries:
        entity_id = getattr(entry, "entity_id", None)
        if not isinstance(entity_id, str) or "." not in entity_id:
            raise LiveSnapshotError("invalid_registry_entity")
        if entity_id in registered:
            raise LiveSnapshotError("duplicate_registry_entity")
        registered[entity_id] = entry

    active: dict[str, Any] = {}
    for state in states:
        entity_id = getattr(state, "entity_id", None)
        if not isinstance(entity_id, str) or "." not in entity_id:
            raise LiveSnapshotError("invalid_state_entity")
        if entity_id in active:
            raise LiveSnapshotError("duplicate_state_entity")
        active[entity_id] = state

    failures = 0
    entities: list[dict[str, Any]] = []
    for entity_id in sorted(registered.keys() | active.keys()):
        entry = registered.get(entity_id)
        state = active.get(entity_id)
        supported: bool | None = None
        if state is not None:
            try:
                outcome = trait_support(state)
                # Only the real HA check's boolean is accepted; a bad mock
                # or changing API is an unknown capability, never "false".
                if isinstance(outcome, bool):
                    supported = outcome
                else:
                    failures += 1
            except Exception:
                # Do not leak exception messages (possibly device attributes).
                failures += 1

        entities.append(
            {
                "entity_id": entity_id,
                "state_present": state is not None,
                "google_traits_supported": supported,
                "registry_present": entry is not None,
                "hidden_by": (
                    None
                    if entry is None or entry.hidden_by is None
                    else "hidden"
                ),
                "entity_category": (
                    None
                    if entry is None or entry.entity_category is None
                    else "auxiliary"
                ),
                "disabled_by": (
                    None
                    if entry is None or entry.disabled_by is None
                    else "disabled"
                ),
            }
        )

    return {
        "status": "partial" if failures else "complete",
        "reason": None,
        "inventory_complete": True,
        "entities": entities,
        "default_exposed_domains": list(domains),
        "trait_check_failures": failures,
    }


def capture_live_google_runtime(hass: Any) -> dict[str, Any]:
    """Snapshot the active HA state machine and Google trait compatibility.

    This synchronous function MUST run on the HA event-loop thread. Import
    native helpers lazily so unsupported versions fail closed, not on module
    import. It does not call Google services or modify HA registries.
    """
    try:
        from homeassistant.components.google_assistant.const import (
            DEFAULT_EXPOSED_DOMAINS,
        )
        from homeassistant.components.google_assistant.helpers import (
            supported_traits_for_state,
        )
        from homeassistant.helpers import entity_registry as er
    except (ImportError, AttributeError):
        return _unavailable("google_assistant_runtime_api_unavailable")

    try:
        states = tuple(hass.states.async_all())
        registry = er.async_get(hass)
        entries = tuple(registry.entities.values())
    except (AttributeError, KeyError, RuntimeError, TypeError, ValueError):
        return _unavailable("ha_state_or_registry_unavailable")

    try:
        return build_runtime_snapshot(
            states,
            entries,
            lambda state: bool(supported_traits_for_state(state)),
            default_exposed_domains=DEFAULT_EXPOSED_DOMAINS,
        )
    except (LiveSnapshotError, AttributeError, TypeError, ValueError):
        return _unavailable("invalid_ha_runtime_snapshot")


def project_discovery_on_live_ha(
    hass: Any,
    discovery: Mapping[str, Any],
) -> dict[str, Any]:
    """Connect real HA facts with the read-only projection from PR #107.

    A snapshot alone cannot establish that the YAML on disk matches the
    Google Assistant config currently loaded in HA, nor Google Home state.
    Therefore runtime_policy_verified=False and cutover_allowed=False.
    """
    snapshot = capture_live_google_runtime(hass)
    if snapshot["status"] == "unavailable":
        return {
            "status": "unavailable",
            "reason": snapshot["reason"],
            "runtime_policy_verified": False,
            "cutover_allowed": False,
        }

    from .migration_exposure import project_manual_google_exposure

    result = project_manual_google_exposure(
        discovery,
        snapshot["entities"],
        default_exposed_domains=snapshot["default_exposed_domains"],
        inventory_complete=snapshot["inventory_complete"],
    )
    return {
        **result,
        "runtime_snapshot_status": snapshot["status"],
        "trait_check_failures": snapshot["trait_check_failures"],
        "runtime_policy_verified": False,
        "cutover_allowed": False,
    }
