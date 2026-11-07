"""Build a read-only catalog of Home Assistant entities for HVLS."""

from __future__ import annotations

from typing import Any

from hvls.engine import (
    resolve_label_ids,
    supported_device_class,
    supported_sensor_class,
)
from hvls.registry import get_registry_items


def build_entity_catalog(
    registries: dict[str, dict[str, Any]],
    label: str,
    domains: frozenset[str] | None = None,
) -> dict[str, Any]:
    """Return entities and their current HVLS label membership."""
    entities = get_registry_items(
        registries["entity_registry"], "entities"
    )
    labels = get_registry_items(
        registries["label_registry"], "labels"
    )
    areas = get_registry_items(
        registries["area_registry"], "areas"
    )
    devices = get_registry_items(
        registries["device_registry"], "devices"
    )

    label_ids, warnings = resolve_label_ids(labels, label)

    area_names = {
        area["area_id"]: area["name"]
        for area in areas
        if area.get("area_id") and area.get("name")
    }
    device_areas = {
        device["id"]: device.get("area_id")
        for device in devices
        if device.get("id")
    }

    catalog = []

    for entity in entities:
        entity_id = entity.get("entity_id")
        if not isinstance(entity_id, str) or "." not in entity_id:
            continue

        area_id = entity.get("area_id")
        if not area_id:
            area_id = device_areas.get(entity.get("device_id"))

        entity_labels = set(entity.get("labels") or [])
        domain = entity_id.split(".", 1)[0]

        exclusion_reason = None

        if domains is not None and domain not in domains:
            exclusion_reason = "domain_not_enabled"
        elif domain == "binary_sensor" and not supported_device_class(entity):
            exclusion_reason = "unsupported_device_class"
        elif domain == "sensor" and not supported_sensor_class(entity):
            exclusion_reason = "unsupported_device_class"
        elif entity.get("disabled_by"):
            exclusion_reason = "disabled"
        elif entity.get("hidden_by"):
            exclusion_reason = "hidden"
        elif entity.get("entity_category") in {"diagnostic", "config"}:
            exclusion_reason = "entity_category"

        catalog.append(
            {
                "entity_id": entity_id,
                "domain": entity_id.split(".", 1)[0],
                "name": str(
                    entity.get("name")
                    or entity.get("original_name")
                    or entity_id
                ),
                "room": area_names.get(area_id, "Sans pièce"),
                "has_label": bool(entity_labels & label_ids),
                "disabled": bool(entity.get("disabled_by")),
                "hidden": bool(entity.get("hidden_by")),
                "category": entity.get("entity_category"),
                "eligible": exclusion_reason is None,
                "exclusion_reason": exclusion_reason,
            }
        )

    catalog.sort(key=lambda item: item["entity_id"])

    return {
        "label": label,
        "label_ids": sorted(label_ids),
        "supported_domains": sorted(domains) if domains is not None else [],
        "warnings": list(warnings),
        "total": len(catalog),
        "labeled": sum(item["has_label"] for item in catalog),
        "entities": catalog,
    }
