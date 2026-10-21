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


def get_live_registries(hass: HomeAssistant) -> dict[str, dict[str, Any]]:
    """Snapshot the four native HA registries for the HVLS engine.

    This function must be called from Home Assistant's event loop.
    """
    entities = er.async_get(hass)
    devices = dr.async_get(hass)
    areas = ar.async_get(hass)
    labels = lr.async_get(hass)

    return {
        "entity_registry": {
            "data": {
                "entities": [
                    {
                        "entity_id": entry.entity_id,
                        "name": entry.name,
                        "original_name": entry.original_name,
                        "device_id": entry.device_id,
                        "area_id": entry.area_id,
                        "labels": list(entry.labels),
                        "disabled_by": _value(entry.disabled_by),
                        "hidden_by": _value(entry.hidden_by),
                        "entity_category": _value(entry.entity_category),
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
                    for entry in devices.devices
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
