"""Explain why labeled entities are excluded from HVLS generation."""

from __future__ import annotations

from typing import Any

from hvls.engine import resolve_label_ids, supported_device_class
from hvls.registry import get_registry_items


def analyze_exclusions(
    registries: dict[str, dict[str, Any]],
    label: str,
    domains: frozenset[str],
) -> list[dict[str, str]]:
    """Return labeled entities excluded by the current core selection rules."""
    entities = get_registry_items(registries["entity_registry"], "entities")
    labels = get_registry_items(registries["label_registry"], "labels")

    label_ids, _ = resolve_label_ids(labels, label)
    excluded = []

    for entity in entities:
        entity_id = entity.get("entity_id")

        if not isinstance(entity_id, str) or "." not in entity_id:
            continue

        if not set(entity.get("labels") or []).intersection(label_ids):
            continue

        domain = entity_id.split(".", 1)[0]

        # Preserve the same filtering order as hvls.engine.select_entities.
        if domain not in domains:
            reason = "domain_not_enabled"
            detail = f"Domain '{domain}' is not enabled"
        elif domain == "binary_sensor" and not supported_device_class(entity):
            reason = "unsupported_device_class"
            detail = (
                f"Unsupported device class: {entity.get('device_class') or '(missing)'}"
            )
        elif entity.get("disabled_by"):
            reason = "disabled"
            detail = "Entity is disabled"
        elif entity.get("hidden_by"):
            reason = "hidden"
            detail = "Entity is hidden"
        elif entity.get("entity_category") in {"diagnostic", "config"}:
            reason = "entity_category"
            detail = "Configuration or diagnostic entity"
        else:
            continue

        excluded.append(
            {
                "entity_id": entity_id,
                "name": str(
                    entity.get("name") or entity.get("original_name") or entity_id
                ),
                "domain": domain,
                "reason": reason,
                "detail": detail,
            }
        )

    return sorted(excluded, key=lambda item: item["entity_id"])
