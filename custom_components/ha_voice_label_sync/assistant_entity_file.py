"""Read-only inspection of a user-selected Google Assistant entity YAML file.

This inspector is independent of migration discovery and approval. A valid
standalone entity file is NOT proof of active Google Assistant exposure.
"""

from __future__ import annotations

from pathlib import Path, PurePosixPath
from typing import Any

from yaml.nodes import MappingNode

from .migration_discovery import (
    DiscoveryProblem,
    _entity_details,
    _mapping,
    _SourceReader,
)

MAX_PATH_CHARS = 240
MAX_ISSUE_EXAMPLES = 20


def _safe_relative_yaml_path(value: Any) -> PurePosixPath:
    """Limit administrator choices to ordinary YAML files inside HA config."""
    if not isinstance(value, str) or not 1 <= len(value) <= MAX_PATH_CHARS:
        raise DiscoveryProblem("invalid_entity_file_path")
    if "\\" in value or "\x00" in value:
        raise DiscoveryProblem("invalid_entity_file_path")
    path = PurePosixPath(value)
    if (
        path.is_absolute()
        or any(
            part in {"", ".", ".."} or part.startswith(".")
            for part in value.split("/")
        )
        or path.suffix.lower() not in {".yaml", ".yml"}
    ):
        raise DiscoveryProblem("invalid_entity_file_path")
    if path.name.lower() in {
        "configuration.yaml", "configuration.yml",
        "secrets.yaml", "secrets.yml",
    } or any(
        word in part.lower()
        for part in path.parts
        for word in ("secret", "credential", "password", "token", "private_key",
                     "service_account", "auth", "oauth")
    ):
        raise DiscoveryProblem("sensitive_file_reference")
    return path


def inspect_google_entity_file(config_dir: str | Path, relative_path: str) -> dict[str, Any]:
    """Summarize entity declarations without loading secrets or mutating state.

    Not an active-source oracle. Never infer live exposure, import readiness,
    or permission to migrate from this analysis.
    """
    report: dict[str, Any] = {
        "schema_version": 1,
        "read_only": True,
        "status": "blocked",
        "reason": None,
        "counts": {
            "entries": 0,
            "requested_exposure": 0,
            "explicitly_excluded": 0,
            "entries_with_anomalies": 0,
        },
        "issues": [],
        "issue_examples": [],
        "source_active_verified": False,
        "google_home_state_verified": False,
        "migration_authorized": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
    }
    try:
        relative = _safe_relative_yaml_path(relative_path)
        reader = _SourceReader(Path(config_dir))
        file_path = reader.root.joinpath(*relative.parts)
        # Do not follow symlinks, including in intermediary directories.
        current = reader.root
        for part in relative.parts:
            current = current / part
            if current.is_symlink():
                raise DiscoveryProblem("symlink_entity_file_not_allowed")
        document, _ = reader.load(file_path, kind="entity_config_include")
        entries = _mapping(document)
        counts = report["counts"]
        reasons_by_code: dict[str, int] = {}
        for entity_id, node in entries.items():
            counts["entries"] += 1
            invalid_id = (
                "." not in entity_id or entity_id.startswith(".")
                or entity_id.endswith(".") or entity_id.count(".") != 1
            )
            if invalid_id:
                reasons = ["invalid_entity_id"]
            elif not isinstance(node, MappingNode):
                reasons = ["invalid_entity_options"]
            else:
                record = _entity_details(
                    entity_id, node, source=relative.as_posix(),
                    line=node.start_mark.line + 1,
                )
                reasons = [
                    reason for reason in record["reasons"]
                    if reason != "registry_and_runtime_not_yet_checked"
                ]
                if record["yaml_exposure_intent"] == "exclude":
                    counts["explicitly_excluded"] += 1
                elif record["yaml_exposure_intent"] == "expose":
                    counts["requested_exposure"] += 1
            if reasons:
                counts["entries_with_anomalies"] += 1
                for code in sorted(set(reasons)):
                    reasons_by_code[code] = reasons_by_code.get(code, 0) + 1
                if len(report["issue_examples"]) < MAX_ISSUE_EXAMPLES:
                    report["issue_examples"].append({
                        "entity_id": entity_id,
                        "line": node.start_mark.line + 1,
                        "reasons": sorted(set(reasons)),
                    })
        report["issues"] = [
            {"code": code, "count": amount}
            for code, amount in sorted(reasons_by_code.items())
        ]
        report["status"] = (
            "review_required" if counts["entries_with_anomalies"] else "parsed"
        )
    except DiscoveryProblem as exc:
        report["reason"] = exc.code
    except (OSError, RuntimeError, ValueError):
        report["reason"] = "entity_file_unavailable"
    return report
