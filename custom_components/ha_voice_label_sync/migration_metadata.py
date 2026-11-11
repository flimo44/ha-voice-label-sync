"""Read protected manual GA metadata and preview an exact-value overlay.

No WebSocket, service, scheduler, HA state mutation or production writer calls
these functions. The original YAML remains in the PR #111 protected baseline;
this module does not create a second mutable store of private names/aliases.
"""

from __future__ import annotations

import hashlib
import posixpath
import re
from collections.abc import Collection, Mapping
from pathlib import Path
from typing import Any

import yaml
from yaml.nodes import MappingNode, ScalarNode, SequenceNode

from .migration_baseline import (
    _regular_file,
    _relative,
    storage_directory,
    verify_baseline,
)
from .migration_discovery import DiscoveryProblem, _bounded_parse, _mapping

MAX_PREVIEW_BYTES = 2 * 1024 * 1024
MAX_METADATA_ENTITIES = 5000
MAX_TEXT_CHARS = 255
MAX_ALIASES = 32
_ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
_FIELDS = frozenset({"expose", "name", "room", "aliases"})
_METADATA = frozenset({"name", "room", "aliases"})


class MetadataError(ValueError):
    """Sanitized metadata/source issue; no secret text in error messages."""


def _source_files(config_dir: str | Path) -> tuple[dict[str, bytes], str]:
    """Re-verify original snapshot and every copied source before parsing."""
    baseline = verify_baseline(config_dir)
    storage = storage_directory(config_dir)
    base = storage / "baseline" / "files"
    sources: dict[str, bytes] = {}
    for item in baseline["files"]:
        rel = _relative(item["path"])
        path = base
        for part in rel.parts:
            path = path / part
            if path.is_symlink():
                raise MetadataError("baseline_source_symlink")
        data = _regular_file(path)
        if hashlib.sha256(data).hexdigest() != item["digest_sha256"]:
            raise MetadataError("baseline_changed_during_read")
        sources[rel.as_posix()] = data
    return sources, baseline["manifest_sha256"]


def _yaml_node(sources: Mapping[str, bytes], path: str) -> Any:
    if path not in sources:
        raise MetadataError("source_not_in_baseline")
    try:
        return _bounded_parse(sources[path].decode("utf-8"))
    except (UnicodeError, DiscoveryProblem) as exc:
        raise MetadataError("protected_source_invalid_yaml") from exc


def _include(
    node: Any, containing_path: str, sources: Mapping[str, bytes]
) -> tuple[Any, str]:
    if not isinstance(node, ScalarNode) or node.tag != "!include":
        raise MetadataError("unsupported_manual_yaml_topology")
    relative = node.value.strip()
    if (
        not relative
        or relative.startswith("/")
        or "\\" in relative
        or ":" in relative
        or any(part == "" for part in relative.split("/"))
    ):
        raise MetadataError("invalid_include_reference")
    normalized = posixpath.normpath(
        posixpath.join(posixpath.dirname(containing_path), relative)
    )
    if (
        normalized.startswith("../")
        or normalized in (".", "..")
        or normalized not in sources
    ):
        raise MetadataError("include_not_in_protected_baseline")
    return _yaml_node(sources, normalized), normalized


def _text(node: Any, *, field: str) -> str:
    if (
        not isinstance(node, ScalarNode)
        or node.tag != "tag:yaml.org,2002:str"
        or not isinstance(node.value, str)
        or not node.value
        or len(node.value) > MAX_TEXT_CHARS
        or "\x00" in node.value
    ):
        raise MetadataError(f"invalid_{field}")
    # HA's YAML loader resolves plain booleans, numbers and null to typed
    # values. BaseLoader does not; never pretend they were literal strings.
    if node.style is None:
        try:
            interpreted = yaml.safe_load(node.value)
        except yaml.YAMLError as exc:
            raise MetadataError(f"invalid_{field}") from exc
        if not isinstance(interpreted, str):
            raise MetadataError(f"ambiguous_{field}_scalar")
    return node.value


def _aliases(node: Any) -> list[str]:
    if (
        not isinstance(node, SequenceNode)
        or node.tag != "tag:yaml.org,2002:seq"
        or len(node.value) > MAX_ALIASES
    ):
        raise MetadataError("invalid_aliases")
    return [_text(item, field="aliases") for item in node.value]


def _record(entity_id: str, node: Any) -> dict[str, Any]:
    """Only safe explicit values are retained; unsupported option is local."""
    record: dict[str, Any] = {
        "entity_id": entity_id,
        "status": "supported",
        "exposure_intent": "expose",
        "metadata": {},
        "explicit_fields": [],
        "reasons": [],
    }
    try:
        options = _mapping(node)
    except DiscoveryProblem:
        record["reasons"].append("invalid_entity_options")
        options = {}

    for field in options:
        if field not in _FIELDS:
            record["reasons"].append("unsupported_entity_option")
            break

    if "expose" in options:
        exposure = options["expose"]
        if (
            not isinstance(exposure, ScalarNode)
            or exposure.tag != "tag:yaml.org,2002:str"
            or exposure.value.lower() not in {"true", "false"}
        ):
            record["reasons"].append("invalid_expose")
            record["exposure_intent"] = "unknown"
        elif exposure.value.lower() == "false":
            record["exposure_intent"] = "exclude"

    for field in ("name", "room", "aliases"):
        if field not in options:
            continue
        record["explicit_fields"].append(field)
        try:
            record["metadata"][field] = (
                _aliases(options[field]) if field == "aliases"
                else _text(options[field], field=field)
            )
        except MetadataError as exc:
            record["reasons"].append(str(exc))

    record["reasons"] = sorted(set(record["reasons"]))
    if record["reasons"]:
        record["status"] = "needs_review"
        # Never leak partially parsed values from a malformed entity.
        record["metadata"] = {}
    return record


def read_baseline_metadata(config_dir: str | Path) -> dict[str, Any]:
    """Extract only supported explicit GA options from a verified baseline.

    The returned metadata is private *internal* data, not a WebSocket payload.
    Do not log or expose it. The baseline has been copied once, so this does
    not require reading any current production YAML or !secret destination.
    """
    sources, manifest_sha = _source_files(config_dir)
    root = "configuration.yaml"
    main = _yaml_node(sources, root)
    try:
        main_options = _mapping(main)
    except DiscoveryProblem as exc:
        raise MetadataError("protected_main_not_mapping") from exc

    google = main_options.get("google_assistant")
    if google is None:
        raise MetadataError("protected_manual_google_missing")
    used = {root}
    if isinstance(google, ScalarNode):
        google, root = _include(google, root, sources)
        used.add(root)
    try:
        ga_options = _mapping(google)
    except DiscoveryProblem as exc:
        raise MetadataError("protected_google_not_mapping") from exc

    entities = ga_options.get("entity_config")
    if entities is None:
        records: dict[str, Any] = {}
    else:
        if isinstance(entities, ScalarNode):
            entities, entity_source = _include(entities, root, sources)
            used.add(entity_source)
        try:
            entity_nodes = _mapping(entities)
        except DiscoveryProblem as exc:
            raise MetadataError("protected_entities_not_mapping") from exc
        if len(entity_nodes) > MAX_METADATA_ENTITIES:
            raise MetadataError("too_many_manual_entities")
        records = {}
        for entity_id, node in entity_nodes.items():
            if not _ENTITY.fullmatch(entity_id):
                raise MetadataError("protected_entity_id_invalid")
            records[entity_id] = _record(entity_id, node)

    if set(sources) != used:
        raise MetadataError("baseline_source_topology_mismatch")

    return {
        "schema_version": 1,
        "baseline_manifest_sha256": manifest_sha,
        "entities": records,
        "contains_private_values": True,
        "verified_from_protected_baseline": True,
    }


def _generated_entities(content: str) -> dict[str, dict[str, Any]]:
    if not isinstance(content, str):
        raise MetadataError("generated_preview_invalid")
    encoded = content.encode("utf-8")
    if len(encoded) > MAX_PREVIEW_BYTES:
        raise MetadataError("generated_preview_too_large")
    try:
        node = _bounded_parse(content)
        if node is None:
            raise MetadataError("generated_preview_empty")
        entries = _mapping(node)
        if not 0 < len(entries) <= MAX_METADATA_ENTITIES:
            raise MetadataError("generated_preview_entity_count")
        # SafeLoader is used only after checking duplicate mapping keys,
        # depth/aliases, and requiring known option types below.
        loaded = yaml.safe_load(content)
    except (DiscoveryProblem, yaml.YAMLError, RecursionError) as exc:
        raise MetadataError("generated_preview_invalid_yaml") from exc
    if not isinstance(loaded, dict):
        raise MetadataError("generated_preview_not_mapping")

    parsed: dict[str, dict[str, Any]] = {}
    for entity_id, original in loaded.items():
        if not isinstance(entity_id, str) or not _ENTITY.fullmatch(entity_id):
            raise MetadataError("generated_entity_id_invalid")
        if not isinstance(original, dict) or set(original) - _FIELDS:
            raise MetadataError("generated_entity_options_unsupported")
        if original.get("expose") is not True:
            raise MetadataError("generated_entity_not_explicitly_exposed")
        for name in ("name", "room"):
            if name in original and (
                not isinstance(original[name], str)
                or not original[name]
                or len(original[name]) > MAX_TEXT_CHARS
            ):
                raise MetadataError("generated_metadata_invalid")
        if "aliases" in original and (
            not isinstance(original["aliases"], list)
            or len(original["aliases"]) > MAX_ALIASES
            or any(
                not isinstance(value, str)
                or not value
                or len(value) > MAX_TEXT_CHARS
                for value in original["aliases"]
            )
        ):
            raise MetadataError("generated_aliases_invalid")
        parsed[entity_id] = dict(original)
    return parsed


def preview_metadata_overlay(
    generated_yaml: str,
    captured: Mapping[str, Any],
    import_entity_ids: Collection[str],
) -> dict[str, Any]:
    """Return non-applicable preview YAML, never permission for cutover.

    All name/room/alias overrides are exact-value replacements, not inferred
    HA defaults. Unsupported options, explicit exclusions and missing
    selections remain per-entity review problems, not silent data loss.
    """
    if (
        not isinstance(captured, Mapping)
        or captured.get("schema_version") != 1
        or captured.get("verified_from_protected_baseline") is not True
        or not isinstance(captured.get("entities"), Mapping)
    ):
        raise MetadataError("metadata_capture_unverified")
    metadata_rows = captured["entities"]
    if not isinstance(import_entity_ids, (list, tuple, set, frozenset)):
        raise MetadataError("import_selection_invalid")
    selections = list(import_entity_ids)
    if (
        any(not isinstance(v, str) or not _ENTITY.fullmatch(v) for v in selections)
        or len(selections) != len(set(selections))
    ):
        raise MetadataError("import_selection_invalid")

    original_generated = _generated_entities(generated_yaml)
    generated = {key: dict(value) for key, value in original_generated.items()}
    rows: list[dict[str, Any]] = []
    count = 0
    # Never silently expose an entity present in an existing HVLS selection
    # but absent from the explicit import decisions. This is a global preview
    # hold: the generated YAML cannot be treated as migration-safe.
    unreviewed_generated = sorted(set(generated) - set(selections))
    for entity_id in sorted(selections):
        manual = metadata_rows.get(entity_id)
        problems = []
        status = "preserved"
        present = entity_id in generated
        if not present:
            problems.append("not_selected_in_generated_yaml")
        if manual is not None:
            if not isinstance(manual, Mapping):
                problems.append("manual_metadata_invalid")
            elif manual.get("exposure_intent") == "exclude":
                problems.append("explicitly_excluded")
            elif manual.get("status") != "supported":
                problems.append("unsupported_manual_entity_options")
            elif manual.get("exposure_intent") != "expose":
                problems.append("unknown_manual_exposure")
            elif not isinstance(manual.get("metadata"), Mapping):
                problems.append("manual_metadata_invalid")
        if problems:
            status = "needs_review"
            # A conflicted selected entity is never emitted as exposed.
            generated.pop(entity_id, None)
        else:
            override = manual["metadata"] if manual is not None else {}
            if set(override) - _METADATA:
                problems.append("unsupported_metadata_fields")
            for field, value in override.items():
                if field in ("name", "room"):
                    if (
                        not isinstance(value, str)
                        or not value
                        or len(value) > MAX_TEXT_CHARS
                        or "\x00" in value
                    ):
                        problems.append("invalid_imported_metadata")
                elif field == "aliases":
                    if (
                        not isinstance(value, list)
                        or len(value) > MAX_ALIASES
                        or any(
                            not isinstance(alias, str)
                            or not alias
                            or len(alias) > MAX_TEXT_CHARS
                            or "\x00" in alias
                            for alias in value
                        )
                    ):
                        problems.append("invalid_imported_aliases")
            if problems:
                status = "needs_review"
                generated.pop(entity_id, None)
            else:
                for field, value in override.items():
                    # Preserve including explicitly empty aliases lists.
                    generated[entity_id][field] = (
                        list(value) if field == "aliases" else value
                    )
                count += len(override)
        rows.append({
            "entity_id": entity_id,
            "status": status,
            "fields_preserved": (
                sorted(manual["metadata"]) if status == "preserved" and manual
                else []
            ),
            "reasons": problems,
        })

    for entity_id in unreviewed_generated:
        rows.append({
            "entity_id": entity_id,
            "status": "needs_review",
            "fields_preserved": [],
            "reasons": ["generated_entity_not_approved_for_migration"],
        })
    # A manual entity not selected for import needs a separate Keep/Disable/
    # Remove decision. A future cutover must prove effective exposure parity.
    unresolved = sorted(set(metadata_rows) - set(selections))
    rows.extend({
        "entity_id": entity_id,
        "status": "not_imported",
        "fields_preserved": [],
        "reasons": ["manual_entry_requires_cutover_decision"],
    } for entity_id in unresolved)

    # Do not claim this preview includes all effective GA exposed entities.
    # The manual excluded entities stay out of the generated result; this
    # module does not create an automatic expose:false replacement either.
    if not generated or unreviewed_generated:
        output = None
    else:
        output = yaml.safe_dump(
            generated,
            allow_unicode=True,
            sort_keys=False,
            default_flow_style=False,
            width=1000,
        )
        if _generated_entities(output) != generated:
            raise MetadataError("preview_roundtrip_mismatch")

    return {
        "schema_version": 1,
        "status": "read_only_metadata_preview",
        "content": output,
        "baseline_manifest_sha256": captured.get("baseline_manifest_sha256"),
        "summary": {
            "generated_entities": len(original_generated),
            "preview_entities": len(generated),
            "metadata_fields_preserved": count,
            "needs_review": sum(r["status"] == "needs_review" for r in rows),
            "manual_entries_not_imported": len(unresolved),
            "unreviewed_generated_entities": len(unreviewed_generated),
        },
        "entities": rows,
        "read_only": True,
        "apply_allowed": False,
        "cutover_allowed": False,
        "google_home_state_verified": False,
    }
