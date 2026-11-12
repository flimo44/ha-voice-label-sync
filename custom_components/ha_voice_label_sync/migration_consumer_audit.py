"""Conservative, read-only audit of possible indirect label consumers.

A native entity-registry update can notify listeners and automation triggers.
This module searches a *bounded subset* of standard HA YAML configuration
without executing it. It does not inspect arbitrary integrations, blueprints,
dynamic templates, external automation engines, or every live HA listener.

No scanning result is ever an approval to stage a label.
"""

from __future__ import annotations

import os
import re
from collections.abc import Mapping
from pathlib import Path
from typing import Any

import yaml
from yaml.nodes import MappingNode, Node, ScalarNode, SequenceNode

_MAX_FILES = 200
_MAX_FILE_BYTES = 1024 * 1024
_MAX_TOTAL_BYTES = 4 * 1024 * 1024
_MAX_NODES = 40_000
_MAX_DEPTH = 48
_STANDARD_FILES = (
    "configuration.yaml", "automations.yaml", "scripts.yaml",
)
_LABEL_FUNCTIONS = re.compile(
    r"\b(?:label_entities|label_devices|label_areas|labels)\s*\("
)
_WRITER = re.compile(r"(?<![a-zA-Z0-9_])ha_voice_label_sync\.generate(?![a-zA-Z0-9_])")
_REGISTRY_EVENT = re.compile(r"(?<![a-zA-Z0-9_])entity_registry_updated(?![a-zA-Z0-9_])")
_BUTTON_PRESS = re.compile(r"(?<![a-zA-Z0-9_])button\.press(?![a-zA-Z0-9_])")
_DYNAMIC_ACTION_KEYS = frozenset({"service_template", "action", "service"})
_COUNT_KEYS = (
    "explicit_hvls_generate_references", "label_template_references",
    "registry_event_references", "button_press_references",
    "dynamic_service_templates",
)


class ConsumerAuditError(ValueError):
    """Sanitized audit failure code only."""


def _new_counts() -> dict[str, int]:
    return dict.fromkeys(_COUNT_KEYS, 0)


def _scope(config_dir: str | Path) -> tuple[list[Path], list[str]]:
    """Limit the scan to standard entrypoints and packages/*.yaml only.

    Never scan secrets.yaml, .storage, custom_components or untrusted
    arbitrary !include paths. Any omission remains explicitly unverified.
    """
    root = Path(config_dir).resolve(strict=True)
    files: list[Path] = []
    reasons: list[str] = []
    for name in _STANDARD_FILES:
        path = root / name
        if path.is_symlink():
            reasons.append("symlink_standard_yaml_unscanned")
        elif path.is_file():
            files.append(path)
        elif name == "configuration.yaml":
            reasons.append("main_configuration_missing")
    packages = root / "packages"
    if packages.is_symlink():
        reasons.append("packages_symlink_unscanned")
    elif packages.is_dir():
        for path in sorted(packages.rglob("*")):
            if path.is_symlink():
                reasons.append("package_symlink_unscanned")
                continue
            if path.is_file() and path.suffix.lower() in {".yaml", ".yml"}:
                files.append(path)
                if len(files) > _MAX_FILES:
                    reasons.append("scan_file_count_limit")
                    break
    if len(files) > _MAX_FILES:
        files = files[:_MAX_FILES]
    return files, list(dict.fromkeys(reasons))


def _scan_nodes(raw: bytes) -> tuple[dict[str, int], list[str]]:
    counts = _new_counts()
    reasons: list[str] = []
    try:
        documents = list(yaml.compose_all(raw, Loader=yaml.BaseLoader))
    except (yaml.YAMLError, UnicodeError, ValueError):
        return counts, ["yaml_not_parsed"]
    pending: list[tuple[Node, str | None, int]] = [
        (node, None, 0) for node in documents if node is not None
    ]
    visited: set[int] = set()
    while pending:
        node, parent_key, depth = pending.pop()
        if depth > _MAX_DEPTH or len(visited) >= _MAX_NODES:
            reasons.append("yaml_tree_scan_limit")
            break
        if id(node) in visited:
            continue
        visited.add(id(node))
        if isinstance(node, MappingNode):
            for key, value in node.value:
                label = key.value if isinstance(key, ScalarNode) else None
                pending.append((value, label, depth + 1))
        elif isinstance(node, SequenceNode):
            pending.extend((value, parent_key, depth + 1) for value in node.value)
        elif isinstance(node, ScalarNode):
            # Never interpret !secret content or execute !include targets.
            if node.tag == "!secret":
                continue
            value = node.value
            if _WRITER.search(value):
                counts["explicit_hvls_generate_references"] += 1
            if _LABEL_FUNCTIONS.search(value):
                counts["label_template_references"] += 1
            if _REGISTRY_EVENT.search(value):
                counts["registry_event_references"] += 1
            if _BUTTON_PRESS.search(value):
                counts["button_press_references"] += 1
            if (
                parent_key in _DYNAMIC_ACTION_KEYS
                and ("{{" in value or "{%" in value)
            ):
                counts["dynamic_service_templates"] += 1
            if node.tag.startswith("!include"):
                reasons.append("unresolved_yaml_include_targets")
    return counts, list(dict.fromkeys(reasons))


def audit_indirect_label_consumers(
    config_dir: str | Path,
    *,
    original_sources: list[Mapping[str, Any]],
    configured_output: str,
    generate_service_registered: bool | None,
) -> dict[str, Any]:
    """Return counts/reason codes ONLY, never YAML, paths or secret values.

    No write-capable method is called. Explicit service use and event
    templates are clues, not exhaustive evidence of loaded HA callbacks.
    """
    if (
        not isinstance(configured_output, str)
        or not isinstance(original_sources, list)
    ):
        raise ConsumerAuditError("invalid_audit_arguments")
    counts = _new_counts()
    warnings: list[str] = []
    scanned = 0
    examined_bytes = 0
    overlap = None

    try:
        root = Path(config_dir).resolve(strict=True)
        if not root.is_dir():
            raise OSError("invalid configuration root")
        output = Path(configured_output)
        output = (
            output.resolve(strict=False)
            if output.is_absolute()
            else (root / output).resolve(strict=False)
        )
        if not output.is_relative_to(root):
            warnings.append("hvls_output_outside_config_directory")
        elif not original_sources:
            warnings.append("original_source_inventory_not_available")
        elif any(
            not isinstance(row, Mapping)
            or not isinstance(row.get("path"), str)
            for row in original_sources
        ):
            warnings.append("original_source_inventory_invalid")
        else:
            overlap = any(
                output == (root / row["path"]).resolve(strict=False)
                for row in original_sources
            )
            if overlap:
                warnings.append("hvls_output_overlaps_manual_google_source")

        files, limited = _scope(root)
        warnings.extend(limited)
        for file in files:
            try:
                size = file.stat().st_size
                if size > _MAX_FILE_BYTES:
                    warnings.append("yaml_file_size_limit")
                    continue
                if examined_bytes + size > _MAX_TOTAL_BYTES:
                    warnings.append("yaml_total_size_limit")
                    break
                # No symlink following: files may change after _scope().
                if file.is_symlink() or not file.resolve().is_relative_to(root):
                    warnings.append("yaml_path_changed_during_scan")
                    continue
                with file.open("rb") as reader:
                    # Reject oversized files even if they grow after stat().
                    raw = reader.read(_MAX_FILE_BYTES + 1)
                if len(raw) > _MAX_FILE_BYTES:
                    warnings.append("yaml_file_size_limit")
                    continue
                examined_bytes += len(raw)
                observed, issues = _scan_nodes(raw)
                scanned += 1
                for key in _COUNT_KEYS:
                    counts[key] += observed[key]
                warnings.extend(issues)
            except (OSError, UnicodeError, yaml.YAMLError):
                warnings.append("yaml_file_unavailable")
    except (OSError, ValueError, RuntimeError):
        warnings.append("standard_configuration_scan_unavailable")
    if generate_service_registered is not False:
        warnings.append("legacy_generate_service_may_be_invoked")
    if counts["explicit_hvls_generate_references"]:
        warnings.append("hvls_generate_referenced_in_standard_yaml")
    if counts["registry_event_references"] or counts["label_template_references"]:
        warnings.append("registry_or_label_dependent_yaml_found")
    if counts["button_press_references"]:
        warnings.append("button_press_target_not_resolved")
    if counts["dynamic_service_templates"]:
        warnings.append("dynamic_service_target_not_resolved")
    # The absence of references is not proof against Python integrations,
    # blueprints, Node-RED, AppDaemon, n8n, UI-managed workflows, etc.
    warnings.append("external_automation_and_registry_listeners_unverified")
    return {
        "schema_version": 1,
        "status": "indirect_effects_unverified",
        "observed_standard_yaml_files": scanned,
        "reference_counts": counts,
        "original_google_source_overlap": overlap,
        "legacy_generate_service_registered": generate_service_registered,
        "reason_codes": list(dict.fromkeys(warnings)),
        "coverage": "limited_standard_yaml_only",
        "all_live_listeners_inspected": False,
        "external_consumers_verified": False,
        "google_home_state_verified": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
        "read_only": True,
    }
