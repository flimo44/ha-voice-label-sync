"""Button entities for HA Voice Label Sync."""

from __future__ import annotations

from typing import override

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import (
    AddConfigEntryEntitiesCallback,
)

from .const import DOMAIN, NAME
from .services import async_run_workflow


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up HVLS buttons from a config entry."""
    async_add_entities(
        [
            HVLSPreviewButton(entry),
            HVLSGenerateButton(entry),
        ]
    )


class HVLSButtonBase(ButtonEntity):
    """Base class for HVLS buttons."""

    _attr_has_entity_name = True

    def __init__(self, entry: ConfigEntry, action_name: str) -> None:
        """Initialize an HVLS button."""
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_{action_name}"

        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=NAME,
            manufacturer="HA Voice Label Sync",
            model="HVLS integration",
        )


class HVLSPreviewButton(HVLSButtonBase):
    """Preview the generated voice assistant configuration."""

    _attr_name = "Preview configuration"
    _attr_icon = "mdi:file-search-outline"

    def __init__(self, entry: ConfigEntry) -> None:
        """Initialize the Preview button."""
        super().__init__(entry, "preview")

    @override
    async def async_press(self) -> None:
        """Run a preview without writing the output file."""
        await async_run_workflow(
            self.hass,
            self._entry,
            dry_run=True,
        )


class HVLSGenerateButton(HVLSButtonBase):
    """Generate the voice assistant configuration."""

    _attr_name = "Generate configuration"
    _attr_icon = "mdi:file-sync-outline"

    def __init__(self, entry: ConfigEntry) -> None:
        """Initialize the Generate button."""
        super().__init__(entry, "generate")

    @override
    async def async_press(self) -> None:
        """Generate and write the configured output file."""
        await async_run_workflow(
            self.hass,
            self._entry,
            dry_run=False,
        )