"""Update one HVLS label in the native Home Assistant entity registry."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import label_registry as lr

from .label_update import (
    LabelUpdateError,
    prepare_label_update,
    resolve_unique_label_id,
)


def update_entity_label(
    hass: HomeAssistant,
    entity_id: str,
    configured_label: str,
    enabled: bool,
    expected_enabled: bool,
) -> dict:
    """Update an entity's HVLS label, preserving all other labels.

    Must be called on the Home Assistant event-loop thread.
    No asynchronous suspension occurs between validation and update.
    """
    entity_registry = er.async_get(hass)
    label_registry = lr.async_get(hass)

    labels = [
        {"label_id": item.label_id, "name": item.name}
        for item in label_registry.labels.values()
    ]

    label_id = resolve_unique_label_id(labels, configured_label)

    entry = entity_registry.async_get(entity_id)
    if entry is None:
        raise LabelUpdateError(f"Entity not found: {entity_id}")

    original_labels = set(entry.labels)

    new_labels = prepare_label_update(
        original_labels,
        label_id,
        enabled,
        expected_enabled,
    )

    # Avoid an unnecessary registry write.
    if new_labels != original_labels:
        entity_registry.async_update_entity(
            entity_id,
            labels=new_labels,
        )

    # Confirm the persisted registry state.
    updated = entity_registry.async_get(entity_id)
    if updated is None:
        raise LabelUpdateError("Entity disappeared after update")

    actual_labels = set(updated.labels)

    if actual_labels != new_labels:
        raise LabelUpdateError(
            "Registry labels do not match the requested update"
        )

    return {
        "entity_id": entity_id,
        "has_label": label_id in actual_labels,
        "label_id": label_id,
        "labels": sorted(actual_labels),
        "changed": new_labels != original_labels,
    }
