"""Conservative, read-only discovery of manual Google Assistant YAML.

This is NOT an effective-exposure oracle or a migration writer. It never
constructs Home Assistant YAML directives, reads secrets, or mutates state.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import yaml
from yaml.events import (
    AliasEvent,
    MappingEndEvent,
    MappingStartEvent,
    SequenceEndEvent,
    SequenceStartEvent,
)
from yaml.nodes import MappingNode, ScalarNode, SequenceNode

MAX_FILE_BYTES = 1024 * 1024
MAX_TOTAL_BYTES = 2 * 1024 * 1024
MAX_FILES = 8
MAX_INCLUDE_DEPTH = 4
MAX_ALIAS_EVENTS = 64
MAX_YAML_DEPTH = 64
MAX_NODES = 20_000


class DiscoveryProblem(Exception):
    """A non-sensitive code describing an unsafe or unsupported input."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _mapping(node: Any) -> dict[str, Any]:
    if not isinstance(node, MappingNode):
        raise DiscoveryProblem("expected_mapping")
    result: dict[str, Any] = {}
    for key, value in node.value:
        if not isinstance(key, ScalarNode) or key.tag.startswith("!"):
            raise DiscoveryProblem("unsupported_mapping_key")
        if key.value == "<<":
            raise DiscoveryProblem("unsupported_yaml_merge")
        if key.value in result:
            raise DiscoveryProblem("duplicate_mapping_key")
        result[key.value] = value
    return result


def _check_graph(node: Any) -> None:
    """Reject duplicate keys and cyclic/excessive node graphs."""
    seen: set[int] = set()
    visiting: set[int] = set()

    def visit(current: Any, depth: int) -> None:
        if depth > MAX_YAML_DEPTH:
            raise DiscoveryProblem("yaml_too_deep")
        identity = id(current)
        if identity in visiting:
            raise DiscoveryProblem("cyclic_yaml_alias")
        if identity in seen:
            return
        seen.add(identity)
        if len(seen) > MAX_NODES:
            raise DiscoveryProblem("yaml_too_complex")
        visiting.add(identity)
        if isinstance(current, MappingNode):
            _mapping(current)
            for key, value in current.value:
                visit(key, depth + 1)
                visit(value, depth + 1)
        elif isinstance(current, SequenceNode):
            for value in current.value:
                visit(value, depth + 1)
        visiting.remove(identity)

    visit(node, 0)


def _bounded_parse(data: str) -> Any:
    depth = 0
    aliases = 0
    try:
        for event in yaml.parse(data, Loader=yaml.BaseLoader):
            if isinstance(event, (MappingStartEvent, SequenceStartEvent)):
                depth += 1
                if depth > MAX_YAML_DEPTH:
                    raise DiscoveryProblem("yaml_too_deep")
            elif isinstance(event, (MappingEndEvent, SequenceEndEvent)):
                depth -= 1
            elif isinstance(event, AliasEvent):
                aliases += 1
                if aliases > MAX_ALIAS_EVENTS:
                    raise DiscoveryProblem("too_many_yaml_aliases")
        node = yaml.compose(data, Loader=yaml.BaseLoader)
    except yaml.YAMLError as exc:
        raise DiscoveryProblem("yaml_syntax_error") from exc
    if node is not None:
        _check_graph(node)
    return node


class _SourceReader:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.locations: list[dict[str, Any]] = []
        self._read_paths: set[Path] = set()
        self.total_bytes = 0

    def load(self, path: Path, *, kind: str, depth: int = 0) -> tuple[Any, Path]:
        if depth > MAX_INCLUDE_DEPTH:
            raise DiscoveryProblem("include_depth_exceeded")
        resolved = path.resolve()
        if not resolved.is_relative_to(self.root):
            raise DiscoveryProblem("include_outside_config")
        if resolved.suffix.lower() not in {".yaml", ".yml"}:
            raise DiscoveryProblem("unsupported_include_type")
        if kind != "main" and (
            resolved.name.lower() in {"secrets.yaml", "secrets.yml"}
            or any(term in resolved.name.lower() for term in (
                "credential", "password", "private_key", "service_account", "token"
            ))
        ):
            raise DiscoveryProblem("sensitive_file_reference")
        if resolved in self._read_paths:
            raise DiscoveryProblem("recursive_or_repeated_include")
        if len(self._read_paths) >= MAX_FILES:
            raise DiscoveryProblem("too_many_included_files")
        if not resolved.is_file():
            raise DiscoveryProblem("include_missing")
        try:
            size = resolved.stat().st_size
            if size > MAX_FILE_BYTES or self.total_bytes + size > MAX_TOTAL_BYTES:
                raise DiscoveryProblem("yaml_file_too_large")
            raw = resolved.read_bytes()
            if (
                len(raw) > MAX_FILE_BYTES
                or self.total_bytes + len(raw) > MAX_TOTAL_BYTES
            ):
                raise DiscoveryProblem("yaml_file_too_large")
            document = _bounded_parse(raw.decode("utf-8"))
        except (OSError, UnicodeError) as exc:
            raise DiscoveryProblem("unreadable_yaml_file") from exc
        self.total_bytes += len(raw)
        self._read_paths.add(resolved)
        self.locations.append(
            {
                "path": resolved.relative_to(self.root).as_posix(),
                "kind": kind,
                "digest_sha256": hashlib.sha256(raw).hexdigest(),
            }
        )
        return document, resolved

    def follow_include(
        self, node: Any, containing_file: Path, *, kind: str, depth: int
    ) -> tuple[Any, Path]:
        if not isinstance(node, ScalarNode) or node.tag != "!include":
            raise DiscoveryProblem("unsupported_include_directive")
        filename = node.value.strip()
        if not filename or Path(filename).is_absolute():
            raise DiscoveryProblem("include_outside_config")
        return self.load(containing_file.parent / filename, kind=kind, depth=depth)


def _scalar_bool(node: Any, field: str) -> bool:
    if not isinstance(node, ScalarNode) or node.tag.startswith("!"):
        raise DiscoveryProblem(f"invalid_{field}")
    if node.value.lower() not in {"true", "false"}:
        raise DiscoveryProblem(f"invalid_{field}")
    return node.value.lower() == "true"


def _entity_details(
    entity_id: str, node: Any, *, source: str, line: int
) -> dict[str, Any]:
    reasons: list[str] = []
    intent = "expose"
    name = None
    room = None
    aliases: list[str] = []

    try:
        options = _mapping(node)
    except DiscoveryProblem:
        options = {}
        reasons.append("invalid_entity_options")

    if "expose" in options:
        try:
            intent = (
                "expose"
                if _scalar_bool(options["expose"], "expose")
                else "exclude"
            )
        except DiscoveryProblem:
            intent = "unknown"
            reasons.append("invalid_expose_value")

    for field in ("name", "room"):
        if field in options:
            option = options[field]
            if isinstance(option, ScalarNode) and not option.tag.startswith("!"):
                if field == "name":
                    name = option.value
                else:
                    room = option.value
            else:
                reasons.append(f"invalid_{field}_option")

    if "aliases" in options:
        value = options["aliases"]
        if isinstance(value, SequenceNode) and all(
            isinstance(item, ScalarNode) and not item.tag.startswith("!")
            for item in value.value
        ):
            aliases = [item.value for item in value.value]
        else:
            reasons.append("invalid_aliases_option")

    if set(options) - {"expose", "name", "room", "aliases"}:
        reasons.append("unhandled_entity_option")

    category = "explicitly_excluded" if intent == "exclude" else "needs_review"
    if not reasons and intent != "exclude":
        reasons.append("registry_and_runtime_not_yet_checked")

    return {
        "entity_id": entity_id,
        "source_path": source,
        "source_line": line,
        "category": category,
        "reasons": reasons,
        "yaml_exposure_intent": intent,
        "before": {
            "exposure": "unknown",
            "name": name,
            "room": room,
            "aliases": aliases,
        },
        "proposed_after": None,
        "available_decisions": [],
    }


def discover_google_assistant(config_dir: str | Path) -> dict[str, Any]:
    """Describe source topology and explicit YAML intent without writing.

    Never treat this report as authorization to apply a migration. HA runtime
    entity registry and Google Assistant effective exposure are not evaluated.
    """
    reader = _SourceReader(Path(config_dir))
    report: dict[str, Any] = {
        "schema_version": 1,
        "mode": "unsupported",
        "source": {"status": "unsupported", "locations": [], "warnings": []},
        "rules": {
            "expose_by_default": "unknown",
            "exposed_domains": [],
            "exposed_domains_declared": None,
            "implicit_exposure_may_change_with_new_entities": False,
            "rule_type": "unknown",
        },
        "counts": {
            "explicit_entries": 0,
            "currently_exposed_known": 0,
            "current_exposure_unknown": 0,
            "migrable": 0,
            "needs_review": 0,
            "explicitly_excluded": 0,
        },
        "entities": [],
        "global_blockers": [],
        "pending_decisions": [],
        "cutover_status": "blocked",
    }

    def block(code: str) -> dict[str, Any]:
        if code not in report["global_blockers"]:
            report["global_blockers"].append(code)
        report["source"]["status"] = "ambiguous"
        return report

    try:
        document, main_file = reader.load(
            reader.root / "configuration.yaml", kind="main"
        )
        main = _mapping(document)
        homeassistant = main.get("homeassistant")
        if isinstance(homeassistant, MappingNode):
            packages = _mapping(homeassistant).get("packages")
            if packages is not None:
                # Current analyzer deliberately cannot prove whether packages
                # also contribute to the Google Assistant configuration.
                block("packages_not_yet_supported")
        elif homeassistant is not None and not isinstance(homeassistant, MappingNode):
            block("unknown_homeassistant_structure")

        google = main.get("google_assistant")
        if google is None:
            cloud = main.get("cloud")
            if isinstance(cloud, MappingNode) and "google_actions" in _mapping(cloud):
                block("cloud_not_manual_ga")
            elif cloud is not None and not isinstance(cloud, MappingNode):
                block("unresolved_cloud_configuration")
            elif not report["global_blockers"]:
                report["mode"] = "new_configuration"
                report["source"]["status"] = "resolved"
                report["cutover_status"] = "not_applicable"
            return report

        report["mode"] = "assisted_migration"
        source_file = main_file
        if isinstance(google, ScalarNode) and google.tag == "!include":
            google, source_file = reader.follow_include(
                google, main_file, kind="google_assistant_include", depth=1
            )
        google_options = _mapping(google)

        default_node = google_options.get("expose_by_default")
        expose_by_default = (
            True if default_node is None
            else _scalar_bool(default_node, "expose_by_default")
        )
        report["rules"]["expose_by_default"] = str(expose_by_default).lower()

        domains_node = google_options.get("exposed_domains")
        report["rules"]["exposed_domains_declared"] = (
            "exposed_domains" in google_options
        )
        if domains_node is not None:
            if not isinstance(domains_node, SequenceNode) or any(
                not isinstance(entry, ScalarNode) or entry.tag.startswith("!")
                for entry in domains_node.value
            ):
                raise DiscoveryProblem("invalid_exposed_domains")
            report["rules"]["exposed_domains"] = [
                entry.value for entry in domains_node.value
            ]

        if expose_by_default:
            report["rules"]["rule_type"] = (
                "domain_limited" if domains_node is not None
                else "default_exposed_domains"
            )
            report["rules"]["implicit_exposure_may_change_with_new_entities"] = (
                domains_node is None or bool(report["rules"]["exposed_domains"])
            )
            report["source"]["warnings"].append("implicit_exposure_enabled")
        else:
            report["rules"]["rule_type"] = "explicit_only"
            if report["rules"]["exposed_domains"]:
                report["source"]["warnings"].append("exposed_domains_inactive")

        config = google_options.get("entity_config")
        if config is not None:
            entity_source = source_file
            if isinstance(config, ScalarNode) and config.tag == "!include":
                config, entity_source = reader.follow_include(
                    config, source_file, kind="entity_config_include", depth=2
                )
            elif isinstance(config, MappingNode):
                report["source"]["warnings"].append("inline_entity_config")
            entity_nodes = _mapping(config)
            for entity_id, entity_node in entity_nodes.items():
                if "." not in entity_id or entity_id.startswith("."):
                    block("invalid_entity_id")
                    continue
                line = entity_node.start_mark.line + 1
                record = _entity_details(
                    entity_id,
                    entity_node,
                    source=entity_source.relative_to(reader.root).as_posix(),
                    line=line,
                )
                report["entities"].append(record)
                if record["yaml_exposure_intent"] == "exclude":
                    report["source"]["warnings"].append("explicit_exclusion")

        report["entities"].sort(key=lambda item: item["entity_id"])
        report["counts"]["explicit_entries"] = len(report["entities"])
        report["counts"]["needs_review"] = sum(
            entry["category"] == "needs_review" for entry in report["entities"]
        )
        report["counts"]["explicitly_excluded"] = sum(
            entry["category"] == "explicitly_excluded"
            for entry in report["entities"]
        )
        # A default-on rule may expose any number of entities absent from
        # entity_config; no meaningful total exists without HA runtime state.
        report["counts"]["current_exposure_unknown"] = (
            None if expose_by_default else len(report["entities"])
        )

        if not report["global_blockers"]:
            report["source"]["status"] = "resolved"
            report["cutover_status"] = "pending_review"
        return report
    except DiscoveryProblem as exc:
        return block(exc.code)
    finally:
        report["source"]["locations"] = reader.locations
        report["source"]["warnings"] = list(
            dict.fromkeys(report["source"]["warnings"])
        )
