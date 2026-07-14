"""Services for HA Voice Label Sync."""

from __future__ import annotations

import logging

from homeassistant.core import HomeAssistant, ServiceCall

_LOGGER = logging.getLogger(__name__)


async def async_register_services(hass: HomeAssistant) -> None:
    """Register integration services."""

    async def handle_generate(call: ServiceCall) -> None:
        """Generate configuration."""
        _LOGGER.info("HVLS generate service called")

    hass.services.async_register(
        "ha_voice_label_sync",
        "generate",
        handle_generate,
    )
