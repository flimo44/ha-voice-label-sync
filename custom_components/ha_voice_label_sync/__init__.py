"""HA Voice Label Sync integration."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .services import async_register_services


async def async_setup(
    hass: HomeAssistant,
    config: dict,
) -> bool:
    """Set up HVLS from YAML."""
    hass.data.setdefault(DOMAIN, {})

    await async_register_services(hass)

    return True


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Set up HVLS from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {}

    await hass.config_entries.async_forward_entry_setups(
        entry,
        ["button"],
    )

    return True


async def async_unload_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Unload an HVLS config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(
        entry,
        ["button"],
    )

    if unloaded:
        hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)

    return unloaded
