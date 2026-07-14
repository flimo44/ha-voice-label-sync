"""Config flow for HA Voice Label Sync."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult

from .const import (
    BACKEND_GOOGLE_ASSISTANT,
    CONF_BACKEND,
    CONF_BACKUP_RETENTION,
    CONF_CREATE_BACKUP,
    CONF_LABEL,
    CONF_OUTPUT,
    DEFAULT_BACKEND,
    DEFAULT_BACKUP_RETENTION,
    DEFAULT_CREATE_BACKUP,
    DEFAULT_LABEL,
    DEFAULT_OUTPUT,
    DOMAIN,
    NAME,
)


def build_schema(
    values: dict[str, Any] | None = None,
) -> vol.Schema:
    """Build the HVLS configuration schema."""
    values = values or {}

    return vol.Schema(
        {
            vol.Required(
                CONF_BACKEND,
                default=values.get(CONF_BACKEND, DEFAULT_BACKEND),
            ): vol.In(
                {
                    BACKEND_GOOGLE_ASSISTANT: "Google Assistant",
                }
            ),
            vol.Required(
                CONF_LABEL,
                default=values.get(CONF_LABEL, DEFAULT_LABEL),
            ): str,
            vol.Required(
                CONF_OUTPUT,
                default=values.get(CONF_OUTPUT, DEFAULT_OUTPUT),
            ): str,
            vol.Required(
                CONF_BACKUP_RETENTION,
                default=values.get(
                    CONF_BACKUP_RETENTION,
                    DEFAULT_BACKUP_RETENTION,
                ),
            ): vol.All(int, vol.Range(min=0, max=100)),
            vol.Required(
                CONF_CREATE_BACKUP,
                default=values.get(
                    CONF_CREATE_BACKUP,
                    DEFAULT_CREATE_BACKUP,
                ),
            ): bool,
        }
    )


class HVLSConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for HVLS."""

    VERSION = 1

    async def async_step_user(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Handle the initial setup step."""
        if user_input is not None:
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()

            return self.async_create_entry(
                title=NAME,
                data=user_input,
            )

        return self.async_show_form(
            step_id="user",
            data_schema=build_schema(),
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: ConfigEntry,
    ) -> HVLSOptionsFlow:
        """Create the HVLS options flow."""
        return HVLSOptionsFlow()


class HVLSOptionsFlow(config_entries.OptionsFlow):
    """Handle HVLS integration options."""

    async def async_step_init(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Manage HVLS options."""
        if user_input is not None:
            return self.async_create_entry(
                title="",
                data=user_input,
            )

        current_values = {
            **self.config_entry.data,
            **self.config_entry.options,
        }

        return self.async_show_form(
            step_id="init",
            data_schema=build_schema(current_values),
        )
