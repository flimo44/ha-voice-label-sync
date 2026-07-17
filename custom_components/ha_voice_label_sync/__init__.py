"""HA Voice Label Sync integration."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .services import async_register_services
from .websocket import async_register_websocket_api

PANEL_URL_PATH = "hvls-preview"
PANEL_TITLE = "HVLS Preview"
PANEL_ICON = "mdi:file-search-outline"

async def async_setup(
    hass: HomeAssistant,
    config: dict,
) -> bool:
    """Set up HVLS from YAML."""
    hass.data.setdefault(DOMAIN, {})

    await async_register_services(hass)
    async_register_websocket_api(hass)

    frontend_path = Path(__file__).parent / "frontend"

    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                "/ha_voice_label_sync",
                str(frontend_path),
                False,
            )
        ]
    )

    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL_PATH,
        config={
            "_panel_custom": {
                "name": "hvls-preview-panel",
                "js_url": "/ha_voice_label_sync/hvls-preview-panel.js",
                "embed_iframe": False,
                "trust_external": False,
            }
        },
        require_admin=True,
    )

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
