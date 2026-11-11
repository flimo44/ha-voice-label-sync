"""Compare disk-discovered Google YAML with the policy loaded by manual GA.

Read-only: compares only non-secret exposure options. Loaded config is read
from the *active* GoogleConfig runtime object, not a stale config entry copy.
This does not assess Google Home state or authorize migration.
"""

from __future__ import annotations

from collections.abc import Collection, Mapping
from typing import Any

_FIELDS = ("expose", "name", "room", "aliases")
_LOCAL_UNCERTAINTIES = frozenset(
    {
        "invalid_entity_options",
        "invalid_expose_value",
        "invalid_name_option",
        "invalid_room_option",
        "invalid_aliases_option",
        "unhandled_entity_option",
    }
)
_MAX_ENTRIES = 20_000


class PolicyComparisonError(ValueError):
    """Safe machine-readable error; never includes YAML or secret contents."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def _unavailable(code: str) -> dict[str, Any]:
    return {
        "status": "unavailable",
        "reason": code,
        "loaded_policy_checked": False,
        "compared_fields_match": None,
        "cutover_allowed": False,
        "differences": [],
        "rule_changes": [],
        "summary": None,
    }


def _normalize_domains(value: Any, code: str) -> frozenset[str]:
    if isinstance(value, (str, bytes)) or not isinstance(
        value, (list, tuple, set, frozenset)
    ):
        raise PolicyComparisonError(code)
    if len(value) > _MAX_ENTRIES:
        raise PolicyComparisonError(code)
    if any(not isinstance(item, str) or not item for item in value):
        raise PolicyComparisonError(code)
    return frozenset(value)


def _normalize_loaded_entities(value: Any) -> dict[str, dict[str, Any]]:
    if not isinstance(value, Mapping) or len(value) > _MAX_ENTRIES:
        raise PolicyComparisonError("invalid_loaded_entity_config")
    result: dict[str, dict[str, Any]] = {}
    for entity_id, options in value.items():
        if not isinstance(entity_id, str) or "." not in entity_id:
            raise PolicyComparisonError("invalid_loaded_entity_id")
        if not isinstance(options, Mapping):
            raise PolicyComparisonError("invalid_loaded_entity_options")
        if not isinstance(options.get("expose", True), bool):
            raise PolicyComparisonError("invalid_loaded_expose")
        name = options.get("name")
        room = options.get("room")
        aliases = options.get("aliases", [])
        if name is not None and not isinstance(name, str):
            raise PolicyComparisonError("invalid_loaded_name")
        if room is not None and not isinstance(room, str):
            raise PolicyComparisonError("invalid_loaded_room")
        # HA's EnsureList accepts scalar aliases and normalizes to a list.
        if isinstance(aliases, str):
            aliases = [aliases]
        if not isinstance(aliases, (list, tuple)) or any(
            not isinstance(alias, str) for alias in aliases
        ):
            raise PolicyComparisonError("invalid_loaded_aliases")
        result[entity_id] = {
            "expose": options.get("expose", True),
            "name": name,
            "room": room,
            "aliases": tuple(aliases),
        }
    return result


def _disk_entry(entry: Mapping[str, Any]) -> dict[str, Any] | None:
    if _LOCAL_UNCERTAINTIES.intersection(entry.get("reasons", ())):
        return None
    intent = entry.get("yaml_exposure_intent")
    if intent not in {"expose", "exclude"}:
        return None
    details = entry.get("before")
    if not isinstance(details, Mapping):
        return None
    name = details.get("name")
    room = details.get("room")
    aliases = details.get("aliases")
    if (name is not None and not isinstance(name, str)) or (
        room is not None and not isinstance(room, str)
    ):
        return None
    if not isinstance(aliases, list) or any(
        not isinstance(alias, str) for alias in aliases
    ):
        return None
    return {
        "expose": intent == "expose",
        "name": name,
        "room": room,
        "aliases": tuple(aliases),
    }


def compare_disk_and_loaded_policy(
    discovery: Mapping[str, Any],
    loaded_config: Mapping[str, Any],
    *,
    default_exposed_domains: Collection[str],
) -> dict[str, Any]:
    """Compare the *exposure-related* fields without returning actual values.

    Even a perfect match of these fields does not establish that project_id
    or service_account has not changed, that disk hashes are still current,
    or that Google Home shows the same devices.
    """
    if discovery.get("mode") != "assisted_migration":
        return _unavailable("no_resolved_manual_ga_discovery")
    if discovery.get("source", {}).get("status") != "resolved":
        return _unavailable("unresolved_disk_configuration")
    if discovery.get("global_blockers"):
        return _unavailable("disk_configuration_has_blockers")
    if not isinstance(loaded_config, Mapping):
        return _unavailable("loaded_config_not_mapping")

    try:
        rules = discovery["rules"]
        default_flag = rules["expose_by_default"]
        if default_flag not in {"true", "false"}:
            raise PolicyComparisonError("invalid_disk_default_exposure")
        disk_default = default_flag == "true"

        declared_domains = rules.get("exposed_domains_declared")
        if not isinstance(declared_domains, bool):
            raise PolicyComparisonError("unknown_disk_domain_source")
        ha_defaults = _normalize_domains(
            default_exposed_domains, "invalid_ha_default_domains"
        )
        disk_domains = (
            _normalize_domains(
                rules.get("exposed_domains"), "invalid_disk_exposed_domains"
            )
            if declared_domains
            else ha_defaults
        )
        loaded_default = loaded_config.get("expose_by_default", True)
        if not isinstance(loaded_default, bool):
            raise PolicyComparisonError("invalid_loaded_default_exposure")
        loaded_domains = _normalize_domains(
            loaded_config.get("exposed_domains", list(ha_defaults)),
            "invalid_loaded_exposed_domains",
        )
        loaded_entries = _normalize_loaded_entities(
            loaded_config.get("entity_config", {})
        )

        disk_list = discovery["entities"]
        if not isinstance(disk_list, list) or len(disk_list) > _MAX_ENTRIES:
            raise PolicyComparisonError("invalid_disk_entities")
        disk_entries: dict[str, Mapping[str, Any]] = {}
        for entry in disk_list:
            if not isinstance(entry, Mapping):
                raise PolicyComparisonError("invalid_disk_entity")
            entity_id = entry.get("entity_id")
            if not isinstance(entity_id, str) or "." not in entity_id:
                raise PolicyComparisonError("invalid_disk_entity_id")
            if entity_id in disk_entries:
                raise PolicyComparisonError("duplicate_disk_entity")
            disk_entries[entity_id] = entry
    except (PolicyComparisonError, KeyError, TypeError) as exc:
        code = exc.code if isinstance(exc, PolicyComparisonError) else (
            "invalid_discovery_shape"
        )
        return _unavailable(code)

    rule_changes = []
    if disk_default != loaded_default:
        rule_changes.append("expose_by_default")
    if disk_domains != loaded_domains:
        rule_changes.append("exposed_domains")

    differences = []
    counts = {
        "unchanged": 0,
        "changed": 0,
        "added_on_disk": 0,
        "removed_on_disk": 0,
        "unknown": 0,
    }
    for entity_id in sorted(disk_entries.keys() | loaded_entries.keys()):
        disk = disk_entries.get(entity_id)
        loaded = loaded_entries.get(entity_id)
        fields: list[str] = []
        if disk is None:
            status = "removed_on_disk"
        elif (normalized_disk := _disk_entry(disk)) is None:
            # An invalid entry remains uncertain even if not yet loaded.
            status = "unknown"
        elif loaded is None:
            status = "added_on_disk"
        else:
            fields = [
                field
                for field in _FIELDS
                if normalized_disk[field] != loaded[field]
            ]
            status = "changed" if fields else "unchanged"
        counts[status] += 1
        if status != "unchanged":
            differences.append(
                {
                    "entity_id": entity_id,
                    "status": status,
                    "changed_fields": fields,
                }
            )

    if counts["unknown"]:
        status = "partial_unknown"
        match = None
    elif rule_changes or any(
        counts[key] for key in ("changed", "added_on_disk", "removed_on_disk")
    ):
        status = "drift_detected"
        match = False
    else:
        status = "match_compared_fields"
        match = True

    return {
        "status": status,
        "scope": "expose_by_default, exposed_domains, entity expose/name/room/aliases",
        "loaded_policy_checked": True,
        "compared_fields_match": match,
        "rule_changes": rule_changes,
        "differences": differences,
        "summary": {
            "disk_entries": len(disk_entries),
            "loaded_entries": len(loaded_entries),
            **counts,
        },
        "restart_only_options_compared": False,
        "source_freshness_verified": False,
        "google_home_state_verified": False,
        "cutover_allowed": False,
    }


def compare_loaded_google_on_ha(
    hass: Any, discovery: Mapping[str, Any]
) -> dict[str, Any]:
    """Read active manual GoogleConfig on HA's event loop, then compare.

    GoogleConfig._config is a *private Home Assistant runtime API*.
    Check the exact runtime class; future API changes fail closed.
    The raw config is never returned or logged by this module.
    """
    try:
        from homeassistant.components.google_assistant.const import (
            DEFAULT_EXPOSED_DOMAINS,
        )
        from homeassistant.components.google_assistant.http import GoogleConfig
        from homeassistant.config_entries import SOURCE_IMPORT
    except (ImportError, AttributeError):
        return _unavailable("ga_runtime_api_unavailable")

    try:
        entries = hass.config_entries.async_entries("google_assistant")
        imported = [entry for entry in entries if entry.source == SOURCE_IMPORT]
        if len(imported) != 1:
            return _unavailable("manual_ga_entry_not_unique")
        if len(entries) != 1:
            # Coexisting cloud/nonmanual GA needs separate exposure accounting.
            return _unavailable("additional_google_assistant_entries_present")

        runtime = imported[0].runtime_data
        if not isinstance(runtime, GoogleConfig):
            return _unavailable("unexpected_ga_runtime_type")
        loaded_config = runtime._config
        if not isinstance(loaded_config, Mapping):
            return _unavailable("loaded_ga_policy_unavailable")
    except (AttributeError, RuntimeError, TypeError, ValueError):
        return _unavailable("manual_ga_runtime_unavailable")

    return compare_disk_and_loaded_policy(
        discovery,
        loaded_config,
        default_exposed_domains=DEFAULT_EXPOSED_DOMAINS,
    )
