"""HA Voice Label Sync integration."""

from __future__ import annotations

import logging
from functools import partial
from hashlib import sha256
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr

from hvls import FileWriterError

from .const import (
    CONF_LABEL,
    CONF_OUTPUT,
    DEFAULT_LABEL,
    DEFAULT_OUTPUT,
    DOMAIN,
)
from .label_setup import ensure_configured_label
from .orphaned_new_install import retire_missing_inactive_owner
from .output_path import UnsafeOutputPath, resolve_output_path
from .services import async_register_services
from .websocket import async_register_websocket_api

_LOGGER = logging.getLogger(__name__)

PANEL_URL_PATH = "hvls-preview"
PANEL_TITLE = "HA Voice Label Sync"
PANEL_ICON = "mdi:file-search-outline"


def _panel_js_version(js_path: Path) -> str:
    """Hash the panel asset in the executor, not on the HA event loop."""
    return sha256(js_path.read_bytes()).hexdigest()[:12]


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
    js_version = await hass.async_add_executor_job(_panel_js_version, js_path)

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
        try:
            output = await hass.async_add_executor_job(
                resolve_output_path,
                hass.config.config_dir,
                settings.get(CONF_OUTPUT, DEFAULT_OUTPUT),
            )
            registry = Path(hass.config.path(".hvls", "ownership.json"))
            active_ids = frozenset(
                item.entry_id for item in hass.config_entries.async_entries(DOMAIN)
            )
            retired = await hass.async_add_executor_job(
                partial(
                    retire_missing_inactive_owner,
                    output_path=output,
                    registry_path=registry,
                    entry_id=entry.entry_id,
                    active_entry_ids=active_ids,
                )
            )
        except (UnsafeOutputPath, OSError, ValueError, FileWriterError) as exc:
            _LOGGER.warning("HVLS new output ownership remains protected: %s", exc)
        else:
            if retired:
                _LOGGER.info(
                    "HVLS new install: inactive claim for absent output retired"
                )

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {}

    # Preserve the virtual device formerly supplied by HA button entities,
    # without restoring either unsafe button. Home Assistant exposes
    # configuration_url as a "Visit" link on the integration device.
    registry = dr.async_get(hass)
    registry.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(DOMAIN, entry.entry_id)},
        name=PANEL_TITLE,
        manufacturer="HA Voice Label Sync",
        model="HVLS integration",
        entry_type=dr.DeviceEntryType.SERVICE,
        configuration_url=f"homeassistant://{PANEL_URL_PATH}",
    )
    return True


async def async_unload_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
) -> bool:
    """Unload an HVLS config entry."""

    # No entity platforms are forwarded since the legacy buttons were
    # retired. Do not attempt to unload a platform that was never set up.
    hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    return True
