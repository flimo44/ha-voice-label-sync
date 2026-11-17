"""Adapt native Home Assistant registries to the HVLS core format."""

from __future__ import annotations

from enum import Enum
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import (
    area_registry as ar,
)
from homeassistant.helpers import (
    device_registry as dr,
)
from homeassistant.helpers import (
    entity_registry as er,
)
from homeassistant.helpers import (
    label_registry as lr,
)


def _value(value: Any) -> Any:
    """Convert an enum to its serialized value."""
    return value.value if isinstance(value, Enum) else value


def _device_class(hass: HomeAssistant, entry: Any) -> str | None:
    """Get the effective device class, preferring the current HA state."""
    states = getattr(hass, "states", None)
    state = states.get(entry.entity_id) if states is not None else None

    if state is not None:
        value = state.attributes.get("device_class")
        if value is not None:
            return str(_value(value))

    value = getattr(entry, "device_class", None)
    if value is None:
        value = getattr(entry, "original_device_class", None)

    return str(_value(value)) if value is not None else None


def _text(value: Any) -> str | None:
    """Return a non-empty, stripped string, or None."""
    return (value.strip() or None) if isinstance(value, str) else None


def _display_name(entry: Any, device_entries: dict[str, Any]) -> str | None:
    """Return the entity name written to the Google Assistant YAML.

    Entities using ``has_entity_name`` store only their own part (for
    example "Temperature") in ``original_name``; Home Assistant prefixes the
    device name. Writing that bare part gave Google several identical names,
    so only that case is prefixed with the device name.

    Every other name is deliberately kept as before, so existing voice names
    do not change: a user-defined registry name is used as typed, and an
    entity without any name keeps the engine's object ID fallback.
    """
    if user_name := _text(getattr(entry, "name", None)):
        return user_name

    original = _text(getattr(entry, "original_name", None))
    if original and getattr(entry, "has_entity_name", False) is True:
        device = device_entries.get(entry.device_id) if entry.device_id else None
        device_name = _text(getattr(device, "name_by_user", None)) or _text(
            getattr(device, "name", None)
        )
        if device_name and not original.startswith(device_name):
            return f"{device_name} {original}"
    return original


def get_live_registries(hass: HomeAssistant) -> dict[str, dict[str, Any]]:
    """Snapshot the four native HA registries for the HVLS engine.

    This function must be called from Home Assistant's event loop.
    """
    entities = er.async_get(hass)
    devices = dr.async_get(hass)
    areas = ar.async_get(hass)
    labels = lr.async_get(hass)

    device_entries = {
        entry.id: entry
        for entry in (
            devices.async_get(item) if isinstance(item, str) else item
            for item in devices.devices
        )
        if entry is not None
    }

    return {
        "entity_registry": {
            "data": {
                "entities": [
                    {
                        "entity_id": entry.entity_id,
                        # Effective display name (see _display_name).
                        "name": _display_name(entry, device_entries),
                        "original_name": entry.original_name,
                        "device_id": entry.device_id,
                        "area_id": entry.area_id,
                        "labels": list(entry.labels),
                        "disabled_by": _value(entry.disabled_by),
                        "hidden_by": _value(entry.hidden_by),
                        "entity_category": _value(entry.entity_category),
                        "device_class": _device_class(hass, entry),
                    }
                    for entry in entities.entities.values()
                ]
            }
        },
        "device_registry": {
            "data": {
                "devices": [
                    {
                        "id": entry.id,
                        "area_id": entry.area_id,
                    }
                    for entry in device_entries.values()
                ]
            }
        },
        "area_registry": {
            "data": {
                "areas": [
                    {
                        "area_id": entry.id,
                        "name": entry.name,
                    }
                    for entry in areas.areas.values()
                ]
            }
        },
        "label_registry": {
            "data": {
                "labels": [
                    {
                        "label_id": entry.label_id,
                        "name": entry.name,
                    }
                    for entry in labels.labels.values()
                ]
            }
        },
    }
