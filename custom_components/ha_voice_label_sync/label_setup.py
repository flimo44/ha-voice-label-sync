"""Ensure the selected HVLS label exists in Home Assistant's native registry."""

from __future__ import annotations

from homeassistant.core import HomeAssistant
from homeassistant.helpers import label_registry as lr

from .label_update import LabelUpdateError, resolve_unique_label_id


def ensure_configured_label(hass: HomeAssistant, configured_label: str) -> str:
    """Reuse an existing label or create a missing one.

    Must run on the HA event loop. Refuse ambiguous labels and never create
    an empty label or duplicate an existing match.
    """
    if not isinstance(configured_label, str) or not configured_label.strip():
        raise LabelUpdateError("HVLS label name cannot be empty")

    registry = lr.async_get(hass)

    def snapshot() -> list[dict[str, str]]:
        return [
            {"label_id": item.label_id, "name": item.name}
            for item in registry.labels.values()
        ]

    labels = snapshot()
    # The shared resolver also checks normalized name / slug matches.
    from hvls.engine import resolve_label_ids

    candidates, _ = resolve_label_ids(labels, configured_label)
    matches = {
        item["label_id"]
        for item in labels
        if item["label_id"] in candidates
    }
    if matches:
        # In particular, refuse ambiguous normalized matches.
        return resolve_unique_label_id(labels, configured_label)

    # A matching label did not exist: create it once in the native registry.
    # If creation fails, abort setup; don't leave an unusable config entry.
    created = registry.async_create(name=configured_label.strip())
    if created is None:
        raise LabelUpdateError("Home Assistant did not create the HVLS label")

    return resolve_unique_label_id(snapshot(), configured_label)
