#!/usr/bin/env python3
"""Local-only preflight for an *isolated* Home Assistant migration test VM.

Never modifies a Home Assistant config or verifies network isolation.
Only emits a sanitized summary: NO YAML contents, entity names/IDs, paths,
secrets, registry entries, aliases, service-account keys or credentials.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path
from typing import Any

_ROOT = Path(__file__).resolve().parents[1]
_DISCOVERY_PATH = (
    _ROOT / "custom_components/ha_voice_label_sync/migration_discovery.py"
)
_MAX_CONFIG_YAML_BYTES = 1024 * 1024
_SHA = re.compile(r"^[a-f0-9]{64}$")

# Detection is deliberately about *configured surfaces*, not activity.
# UI-only integrations and services loaded from .storage may not appear here.
_RISK_KEYS = {
    "google_assistant": "google_assistant_cloud_effects",
    "cloud": "home_assistant_cloud_effects",
    "mqtt": "mqtt_external_messages",
    "automation": "automations_can_operate_real_equipment",
    "script": "scripts_can_operate_real_equipment",
    "rest_command": "http_external_commands",
    "shell_command": "shell_side_effects",
    "notify": "external_notifications",
    "webhook": "webhook_external_callbacks",
    "homekit": "homekit_external_effects",
    "alexa": "alexa_external_effects",
    "node_red": "node_red_external_automations",
    "zha": "zigbee_hardware_possible",
    "zwave_js": "zwave_hardware_possible",
    "modbus": "modbus_hardware_possible",
    "recorder": "recorder_db_external_possible",
}

try:
    sys.dont_write_bytecode = True
    _spec = importlib.util.spec_from_file_location(
        "_hvls_beta_vm_migration_discovery", _DISCOVERY_PATH
    )
    if _spec is None or _spec.loader is None:
        raise RuntimeError("migration_discovery_module_missing")
    _discovery = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_discovery)
except (OSError, ImportError, RuntimeError) as exc:
    # This path is only an installation error; do not echo path contents.
    raise SystemExit("preflight_dependency_unavailable") from exc


def _empty(status: str) -> dict[str, Any]:
    """No status may be treated as proof that staging is safe."""
    return {
        "schema_version": 1,
        "status": status,
        "read_only": True,
        "vm_identity_verified": False,
        "vm_network_isolation_verified": False,
        "vm_restore_test_verified": False,
        "external_integrations_isolated": False,
        "runtime_storage_integrations_inspected": False,
        "historical_v020_upgrade_verified": False,
        "production_runtime_touched": False,
        "migration_execution_authorized": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
        "google_home_state_verified": False,
        "external_effects_verified": False,
        "ha_version_marker_present": False,
        "storage_directory_present": False,
        "source": {
            "mode": "unknown",
            "status": "unavailable",
            "source_file_count": 0,
            "fingerprint_sha256": None,
            "explicit_entity_count": 0,
            "explicit_exclusion_count": 0,
            "entries_requiring_review_count": 0,
            "global_blockers": [],
            "warning_codes": [],
            "implicitly_exposed_entities_possible": False,
        },
        "potential_side_effect_categories": [],
        "uninspected_runtime_integrations_possible": True,
        "human_vm_isolation_check_required": True,
        "human_restore_drill_required": True,
        "contains_private_configuration_in_output": False,
    }


def _external_surfaces(root: Path) -> list[str]:
    """Read ONLY configuration.yaml, parse top-level key NAMES, not values."""
    path = root / "configuration.yaml"
    try:
        if path.is_symlink() or not path.is_file():
            return ["configuration_yaml_unreadable_or_linked"]
        if path.stat().st_size > _MAX_CONFIG_YAML_BYTES:
            return ["configuration_yaml_unreadable_or_linked"]
        raw = path.read_bytes()
        if len(raw) > _MAX_CONFIG_YAML_BYTES:
            return ["configuration_yaml_unreadable_or_linked"]
        node = _discovery._bounded_parse(raw.decode("utf-8"))
        top = _discovery._mapping(node)
    except (OSError, UnicodeError, ValueError, _discovery.DiscoveryProblem):
        return ["configuration_yaml_unreadable_or_linked"]
    return sorted({
        _RISK_KEYS[key]
        for key in top
        if key in _RISK_KEYS
    })


def inspect_vm_configuration(
    config_dir: str | Path, *, expected_source_sha256: str | None = None,
) -> dict[str, Any]:
    """Safely summarize a potential test VM directory without writes.

    This is a *local evidence inventory*, NOT a VM/network safety gate.
    It deliberately cannot return readiness or authorization, since
    .storage, loaded integrations and external network paths are unknown.
    """
    result = _empty("human_isolation_review_required")
    if expected_source_sha256 is not None and (
        not isinstance(expected_source_sha256, str)
        or _SHA.fullmatch(expected_source_sha256) is None
    ):
        return _empty("invalid_expected_fingerprint")
    try:
        root = Path(config_dir).expanduser()
        if root.is_symlink() or not root.is_dir():
            return _empty("config_directory_unavailable_or_linked")
        if (root / "configuration.yaml").is_symlink():
            return _empty("configuration_yaml_linked")
        result["ha_version_marker_present"] = (
            (root / ".HA_VERSION").is_file()
        )
        result["storage_directory_present"] = (
            (root / ".storage").is_dir()
        )
        result["potential_side_effect_categories"] = _external_surfaces(root)
        discovery = _discovery.discover_google_assistant(root)
    except (OSError, ValueError, RuntimeError, TypeError):
        return _empty("configuration_cannot_be_inspected")

    src = discovery.get("source")
    counts = discovery.get("counts")
    rules = discovery.get("rules")
    if not all(isinstance(x, dict) for x in (src, counts, rules)):
        return _empty("discovery_report_unusable")

    locations = src.get("locations", [])
    valid_locations = (
        isinstance(locations, list)
        and 0 < len(locations) <= _discovery.MAX_FILES
        and all(
            isinstance(x, dict)
            and isinstance(x.get("path"), str)
            and isinstance(x.get("digest_sha256"), str)
            and _SHA.fullmatch(x["digest_sha256"])
            for x in locations
        )
    )
    # Derived digest exposes neither source text nor relative file names.
    # The relative names are included *inside* the SHA input to bind the
    # topology and disallow a moved/renamed include from comparing equal.
    sha = None
    if valid_locations:
        canonical = json.dumps(
            sorted(
                (x["path"], x["digest_sha256"])
                for x in locations
            ),
            ensure_ascii=False, separators=(",", ":"),
        ).encode("utf-8")
        sha = hashlib.sha256(canonical).hexdigest()

    result["source"] = {
        "mode": discovery.get("mode", "unknown"),
        "status": src.get("status", "unavailable"),
        "source_file_count": len(locations) if isinstance(locations, list) else 0,
        "fingerprint_sha256": sha,
        "explicit_entity_count": counts.get("explicit_entries", 0),
        "explicit_exclusion_count": counts.get("explicitly_excluded", 0),
        "entries_requiring_review_count": counts.get("needs_review", 0),
        "global_blockers": sorted(set(discovery.get("global_blockers", []))),
        "warning_codes": sorted(set(src.get("warnings", []))),
        "implicitly_exposed_entities_possible": bool(
            rules.get("implicit_exposure_may_change_with_new_entities", False)
        ),
    }
    if src.get("status") != "resolved" or discovery.get("global_blockers"):
        result["status"] = "manual_yaml_discovery_blocked"
    elif sha is None:
        result["status"] = "source_fingerprint_unavailable"
    elif expected_source_sha256 is not None and sha != expected_source_sha256:
        result["status"] = "manual_yaml_changed_since_reference"
    # The best status is still 'human_isolation_review_required'!
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Read-only, local-only migration test-VM config inventory; "
            "NOT network isolation or execution authorization."
        ),
    )
    parser.add_argument(
        "--config-dir", required=True,
        help="Path of an OFFLINE COPY / isolated test VM HA config, never prod.",
    )
    parser.add_argument(
        "--expected-source-sha256",
        help="Reference fingerprint previously printed by this script.",
    )
    args = parser.parse_args(argv)
    result = inspect_vm_configuration(
        args.config_dir,
        expected_source_sha256=args.expected_source_sha256,
    )
    print(json.dumps(
        result, indent=2, ensure_ascii=False, sort_keys=True,
    ))
    return 0 if result["status"] == "human_isolation_review_required" else 2


if __name__ == "__main__":
    raise SystemExit(main())
