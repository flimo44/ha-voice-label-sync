"""Core entity selection engine for HA Voice Label Sync."""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Collection
from typing import Any

from .models import GenerationRequest, SelectedEntity, SelectionResult
from .registry import get_registry_items


def slugify(value: str) -> str:
    """Normalize a Home Assistant label for comparison."""
    normalized = unicodedata.normalize("NFKD", value.strip().lower())
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_value = ascii_value.replace(" ", "_").replace("-", "_")
    ascii_value = re.sub(r"[^a-z0-9_]", "", ascii_value)
    return re.sub(r"_+", "_", ascii_value).strip("_")


def resolve_label_ids(
    labels: Collection[dict[str, Any]],
    label_name: str,
) -> tuple[frozenset[str], tuple[str, ...]]:
    """Resolve a label name or normalized label identifier.

    Args:
        labels: Home Assistant label registry entries.
        label_name: Label name or identifier requested by the user.

    Returns:
        Matching label identifiers and any generated warnings.
    """
    wanted_slug = slugify(label_name)
    identifiers = {label_name, wanted_slug}
    found = False

    for label in labels:
        name = str(label.get("name") or "")
        label_id = str(label.get("label_id") or "")

        if (
            label_id == label_name
            or name == label_name
            or slugify(name) == wanted_slug
        ):
            if label_id:
                identifiers.add(label_id)
            found = True

    warnings: tuple[str, ...] = ()

    if not found:
        warnings = (
            f"No Home Assistant label matches '{label_name}'.",
        )

    return frozenset(identifiers), warnings


def select_entities(
    request: GenerationRequest,
    entity_registry: dict[str, Any],
    device_registry: dict[str, Any],
    area_registry: dict[str, Any],
    label_registry: dict[str, Any],
) -> SelectionResult:
    """Select Home Assistant entities matching a generation request.

    This function performs no file writing and produces no backend-specific
    configuration.

    Args:
        request: Selection and generation parameters.
        entity_registry: Parsed Home Assistant entity registry.
        device_registry: Parsed Home Assistant device registry.
        area_registry: Parsed Home Assistant area registry.
        label_registry: Parsed Home Assistant label registry.

    Returns:
        A structured selection result.
    """
    entity_entries = get_registry_items(entity_registry, "entities")
    device_entries = get_registry_items(device_registry, "devices")
    area_entries = get_registry_items(area_registry, "areas")
    label_entries = get_registry_items(label_registry, "labels")

    label_ids, warnings = resolve_label_ids(
        label_entries,
        request.label,
    )

    devices = {
        str(device["id"]): device
        for device in device_entries
        if device.get("id")
    }

    areas: dict[str, str] = {}

    for area in area_entries:
        area_id = area.get("area_id") or area.get("id")

        if not area_id:
            continue

        area_id = str(area_id)
        areas[area_id] = str(area.get("name") or area_id)

    selected: list[SelectedEntity] = []
    domain_counts: dict[str, int] = {}

    for entity in entity_entries:
        entity_id = entity.get("entity_id")

        if not isinstance(entity_id, str) or "." not in entity_id:
            continue

        domain, object_id = entity_id.split(".", 1)

        if domain not in request.domains:
            continue

        if entity.get("disabled_by") or entity.get("hidden_by"):
            continue

        if entity.get("entity_category") in {"diagnostic", "config"}:
            continue

        entity_labels = set(entity.get("labels") or [])

        if not entity_labels.intersection(label_ids):
            continue

        device_id = entity.get("device_id")
        device = devices.get(str(device_id)) if device_id else None

        name = (
            entity.get("name")
            or entity.get("original_name")
            or object_id.replace("_", " ").title()
        )

        area_id = entity.get("area_id") or (device or {}).get("area_id")
        room = areas.get(str(area_id)) if area_id else None

        selected.append(
            SelectedEntity(
                entity_id=entity_id,
                domain=domain,
                name=str(name),
                room=room,
            )
        )

        domain_counts[domain] = domain_counts.get(domain, 0) + 1

    selected.sort(
        key=lambda item: (
            item.room or "",
            item.domain,
            item.name,
            item.entity_id,
        )
    )

    if not selected:
        warnings += (
            "No entity matched the requested label and domains.",
        )

    return SelectionResult(
        entities=tuple(selected),
        domain_counts=domain_counts,
        warnings=warnings,
    )
