"""Isolated, non-authorizing review of manually extracted historical GA YAML.

Only reads files within a fixed dedicated folder under the HA configuration
directory, plus the explicitly selected current entity file for hash comparison.
Never reads backup archives, secret includes, HA storage, or live GA state.
"""

from __future__ import annotations

from pathlib import Path
import re
from typing import Any

from yaml.nodes import MappingNode, ScalarNode, SequenceNode

from .assistant_entity_file import _safe_relative_yaml_path
from .migration_discovery import (
    DiscoveryProblem,
    _entity_details,
    _mapping,
    _scalar_bool,
    _SourceReader,
)

REVIEW_DIR = "hvls-history-review"
MAX_EXPOSED_DOMAINS = 32
SAFE_DOMAIN = re.compile(r"^[a-z][a-z0-9_]{0,39}$")


class _IsolatedReader(_SourceReader):
    """Use existing bounded parser while refusing symlinks and unsafe paths."""

    def load(self, path: Path, *, kind: str, depth: int = 0) -> tuple[Any, Path]:
        try:
            relative = path.relative_to(self.root)
        except ValueError as exc:
            raise DiscoveryProblem("include_outside_review_directory") from exc
        if kind != "historical_main":
            _safe_relative_yaml_path(relative.as_posix())
        elif relative.as_posix() != "configuration.yaml":
            raise DiscoveryProblem("invalid_historical_main")
        current = self.root
        for component in relative.parts:
            if component in {".", ".."} or component.startswith("."):
                raise DiscoveryProblem("invalid_historical_path")
            current = current / component
            if current.is_symlink():
                raise DiscoveryProblem("symlink_historical_file_not_allowed")
        return super().load(path, kind=kind, depth=depth)


def _follow_safe_include(
    reader: _IsolatedReader,
    node: Any,
    containing: Path,
    *,
    kind: str,
    depth: int,
) -> tuple[Any, Path, str]:
    if not isinstance(node, ScalarNode) or node.tag != "!include":
        raise DiscoveryProblem("unsupported_include_directive")
    filename = node.value.strip()
    relative = _safe_relative_yaml_path(filename)
    containing_parent = containing.relative_to(reader.root).parent
    combined = containing_parent / Path(*relative.parts)
    _safe_relative_yaml_path(combined.as_posix())
    document, actual = reader.load(reader.root / combined, kind=kind, depth=depth)
    return document, actual, combined.as_posix()


def _entity_counts(mapping: dict[str, Any], source: str) -> dict[str, int]:
    result = {
        "entries": 0,
        "explicitly_exposed": 0,
        "explicitly_excluded": 0,
        "expose_not_set": 0,
        "invalid_expose": 0,
        "entries_with_anomalies": 0,
    }
    for entity_id, entity_node in mapping.items():
        result["entries"] += 1
        invalid_id = (
            entity_id.count(".") != 1 or entity_id.startswith(".")
            or entity_id.endswith(".")
        )
        if invalid_id or not isinstance(entity_node, MappingNode):
            result["entries_with_anomalies"] += 1
            continue
        detail = _entity_details(
            entity_id, entity_node, source=source,
            line=entity_node.start_mark.line + 1,
        )
        reasons = [
            reason for reason in detail["reasons"]
            if reason != "registry_and_runtime_not_yet_checked"
        ]
        if reasons:
            result["entries_with_anomalies"] += 1
        opts = _mapping(entity_node)
        if "expose" not in opts:
            result["expose_not_set"] += 1
        elif detail["yaml_exposure_intent"] == "exclude":
            result["explicitly_excluded"] += 1
        elif detail["yaml_exposure_intent"] == "expose":
            result["explicitly_exposed"] += 1
        else:
            result["invalid_expose"] += 1
    return result


def inspect_historical_google_yaml(
    config_dir: str | Path, current_entity_path: str
) -> dict[str, Any]:
    """Review one explicitly staged historical YAML tree in read-only mode.

    The isolated configuration is not necessarily the one ever loaded by HA.
    Even identical files / explicit references do NOT authorize migration.
    """
    report: dict[str, Any] = {
        "schema_version": 1,
        "read_only": True,
        "status": "blocked",
        "reason": None,
        "review_folder": REVIEW_DIR,
        "declaration": "unknown",
        "rules": {
            "expose_by_default": "unknown",
            "expose_by_default_explicit": None,
            "exposed_domains_declared": None,
            "exposed_domains": [],
        },
        "entity_source": {
            "mode": "unknown",
            "path": None,
            "path_relation": "unknown",
            "file_present": None,
            "content_relation": "not_compared",
            "counts": None,
        },
        "issues": [],
        "source_active_verified": False,
        "historical_runtime_verified": False,
        "google_home_state_verified": False,
        "migration_authorized": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
    }
    try:
        selected = _safe_relative_yaml_path(current_entity_path)
        config_root = Path(config_dir).resolve()
        history_root = config_root / REVIEW_DIR
        if history_root.is_symlink():
            raise DiscoveryProblem("symlink_historical_folder_not_allowed")
        if not history_root.is_dir():
            report["status"] = "not_found"
            report["reason"] = "historical_review_folder_missing"
            return report

        reader = _IsolatedReader(history_root)
        try:
            main_node, main_file = reader.load(
                reader.root / "configuration.yaml", kind="historical_main"
            )
        except DiscoveryProblem as exc:
            if exc.code == "include_missing":
                report["status"] = "not_found"
                report["reason"] = "historical_configuration_missing"
                return report
            raise
        main = _mapping(main_node)
        homeassistant = main.get("homeassistant")
        if homeassistant is not None:
            if not isinstance(homeassistant, MappingNode):
                raise DiscoveryProblem("unknown_homeassistant_structure")
            if "packages" in _mapping(homeassistant):
                raise DiscoveryProblem("packages_not_yet_supported")

        google = main.get("google_assistant")
        if google is None:
            report["declaration"] = "absent"
            report["status"] = "review_required"
            report["issues"].append("historical_google_assistant_absent")
            return report
        ga_file = main_file
        if isinstance(google, ScalarNode) and google.tag == "!include":
            google, ga_file, _ = _follow_safe_include(
                reader, google, main_file, kind="historical_google_include",
                depth=1,
            )
            report["declaration"] = "included"
        else:
            report["declaration"] = "direct"
        ga = _mapping(google)

        default = ga.get("expose_by_default")
        report["rules"]["expose_by_default"] = (
            "true" if default is None or _scalar_bool(default, "expose_by_default")
            else "false"
        )
        report["rules"]["expose_by_default_explicit"] = default is not None

        domains = ga.get("exposed_domains")
        report["rules"]["exposed_domains_declared"] = domains is not None
        if domains is not None:
            if not isinstance(domains, SequenceNode) or len(domains.value) > MAX_EXPOSED_DOMAINS:
                raise DiscoveryProblem("invalid_exposed_domains")
            safe_domains: list[str] = []
            for item in domains.value:
                if (
                    not isinstance(item, ScalarNode)
                    or item.tag.startswith("!")
                    or not SAFE_DOMAIN.fullmatch(item.value)
                ):
                    raise DiscoveryProblem("invalid_exposed_domains")
                safe_domains.append(item.value)
            report["rules"]["exposed_domains"] = safe_domains

        entity = ga.get("entity_config")
        if entity is None:
            report["entity_source"]["mode"] = "not_declared"
            report["issues"].append("historical_entity_config_absent")
        elif isinstance(entity, MappingNode):
            report["entity_source"]["mode"] = "inline"
            report["entity_source"]["counts"] = _entity_counts(
                _mapping(entity), ga_file.relative_to(reader.root).as_posix()
            )
            report["issues"].append("historical_inline_entity_config")
        elif isinstance(entity, ScalarNode) and entity.tag == "!include":
            filename = _safe_relative_yaml_path(entity.value.strip())
            target = ga_file.relative_to(reader.root).parent / Path(*filename.parts)
            path = _safe_relative_yaml_path(target.as_posix()).as_posix()
            source = report["entity_source"]
            source["mode"] = "include"
            source["path"] = path
            source["path_relation"] = (
                "same" if path == selected.as_posix() else "different"
            )
            try:
                entity_data, entity_file, _ = _follow_safe_include(
                    reader, entity, ga_file,
                    kind="historical_entity_include", depth=2,
                )
            except DiscoveryProblem as exc:
                if exc.code != "include_missing":
                    raise
                source["file_present"] = False
                report["issues"].append("historical_entity_file_missing")
            else:
                source["file_present"] = True
                source["counts"] = _entity_counts(
                    _mapping(entity_data),
                    entity_file.relative_to(reader.root).as_posix(),
                )
                # Compare on-disk SHA256 only; never return YAML values, hashes
                # or any private customization from either file.
                historical_digest = reader.locations[-1]["digest_sha256"]
                live_reader = _IsolatedReader(config_root)
                try:
                    live_reader.load(
                        live_reader.root / Path(*selected.parts),
                        kind="current_entity_reference",
                    )
                except DiscoveryProblem:
                    report["issues"].append("selected_current_entity_unavailable")
                else:
                    current_digest = live_reader.locations[-1]["digest_sha256"]
                    source["content_relation"] = (
                        "identical" if historical_digest == current_digest
                        else "different"
                    )
        else:
            raise DiscoveryProblem("unsupported_entity_config_directive")

        report["status"] = "review_required" if report["issues"] else "parsed"
    except DiscoveryProblem as exc:
        report["status"] = "blocked"
        report["reason"] = exc.code
    except (OSError, ValueError, RuntimeError):
        report["status"] = "blocked"
        report["reason"] = "historical_review_unavailable"
    return report
