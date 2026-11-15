"""HA Voice Label Sync integration."""

from __future__ import annotations

import logging
from functools import partial
from hashlib import sha256
from pathlib import Path

from hvls import FileWriterError

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    CONF_LABEL, CONF_OUTPUT, DEFAULT_LABEL, DEFAULT_OUTPUT, DOMAIN,
)
from .orphaned_new_install import retire_missing_inactive_owner
from .label_setup import ensure_configured_label
from .services import async_register_services
from .websocket import async_register_websocket_api

_LOGGER = logging.getLogger(__name__)

PANEL_URL_PATH = "hvls-preview"
PANEL_TITLE = "HA Voice Label Sync"
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

    # Change the resource URL whenever its content changes.
    js_path = frontend_path / "hvls-preview-panel.js"
    js_version = sha256(js_path.read_bytes()).hexdigest()[:12]

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
                "js_url": (
                    f"/ha_voice_label_sync/hvls-preview-panel.js?v={js_version}"
                ),
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
    # Also repair V1 installations configured before label auto-provisioning.
    settings = {**entry.data, **entry.options}
    ensure_configured_label(hass, settings.get(CONF_LABEL, DEFAULT_LABEL))

    # A deliberate NEW setup can follow an uninstall that left a missing
    # output claimed by the old entry. Retire only that orphaned metadata:
    # no YAML or label is created/modified until a reviewed Preview Apply.
    if settings.get("onboarding_mode") == "new":
        output = Path(settings.get(CONF_OUTPUT, DEFAULT_OUTPUT))
        if not output.is_absolute():
            output = Path(hass.config.config_dir) / output
        registry = Path(hass.config.path(".hvls", "ownership.json"))
        active_ids = frozenset(
            item.entry_id for item in hass.config_entries.async_entries(DOMAIN)
        )
        try:
            retired = await hass.async_add_executor_job(
                partial(
                    retire_missing_inactive_owner,
                    output_path=output,
                    registry_path=registry,
                    entry_id=entry.entry_id,
                    active_entry_ids=active_ids,
                )
            )
        except (OSError, ValueError, FileWriterError) as exc:
            _LOGGER.warning("HVLS new output ownership remains protected: %s", exc)
        else:
            if retired:
                _LOGGER.info(
                    "HVLS new install: inactive claim for absent output retired"
                )

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
