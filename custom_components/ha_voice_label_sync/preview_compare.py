"""Read-only summary and semantic comparison of HVLS preview YAML."""

from __future__ import annotations

from collections import Counter
from difflib import unified_diff
from typing import Any

import yaml


class PreviewFormatError(ValueError):
    """Preview or production content cannot be safely interpreted."""


def _entities(content: str) -> dict[str, dict[str, Any]]:
    """Load an HVLS entity mapping without modifying any YAML file."""
    try:
        data = yaml.safe_load(content)
    except yaml.YAMLError as exc:
        raise PreviewFormatError(f"Invalid YAML: {exc}") from exc
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise PreviewFormatError("Expected a YAML mapping of entity IDs.")
    result = {}
    for entity_id, options in data.items():
        if not isinstance(entity_id, str) or "." not in entity_id:
            raise PreviewFormatError(f"Invalid entity ID: {entity_id!r}")
        if not isinstance(options, dict):
            raise PreviewFormatError(f"Invalid options for {entity_id}.")
        result[entity_id] = options
    return result


def analyze_preview(preview: str, production: str | None) -> dict[str, Any]:
    """Summarize Preview, and compare to production when readable.

    `production=None` means missing or inaccessible: never report it as no change.
    """
    current = _entities(preview)
    domain_counts = Counter(entity_id.split(".", 1)[0] for entity_id in current)
    room_counts = Counter(
        str(fields.get("room") or "Sans pièce") for fields in current.values()
    )
    rooms = {room for room in room_counts if room != "Sans pièce"}
    summary = {
        "total": len(current),
        "rooms": len(rooms),
        "without_room": room_counts.get("Sans pièce", 0),
        "domains": dict(sorted(domain_counts.items())),
        "by_room": dict(sorted(room_counts.items())),
    }
    response: dict[str, Any] = {"summary": summary, "comparison": {"status": "missing"}}
    if production is None:
        return response
    try:
        previous = _entities(production)
    except PreviewFormatError as exc:
        response["comparison"] = {"status": "invalid", "reason": str(exc)}
        return response

    added = sorted(current.keys() - previous.keys())
    removed = sorted(previous.keys() - current.keys())
    common = current.keys() & previous.keys()
    modified = []
    for entity_id in sorted(common):
        before, after = previous[entity_id], current[entity_id]
        if before != after:
            fields = {}
            for key in sorted(before.keys() | after.keys()):
                if before.get(key) != after.get(key) or (key in before) != (
                    key in after
                ):
                    fields[key] = {
                        "before": str(before[key]) if key in before else None,
                        "after": str(after[key]) if key in after else None,
                    }
            modified.append({"entity_id": entity_id, "fields": fields})

    identical = len(added) == len(removed) == len(modified) == 0
    diff = "".join(
        unified_diff(
            production.splitlines(keepends=True),
            preview.splitlines(keepends=True),
            fromfile="Production",
            tofile="Preview",
        )
    )
    response["comparison"] = {
        "status": "ok",
        "added": added,
        "removed": removed,
        "modified": modified,
        "unchanged": len(common) - len(modified),
        "identical_entities": identical,
        "identical_text": production == preview,
        "unified_diff": diff,
    }
    return response
