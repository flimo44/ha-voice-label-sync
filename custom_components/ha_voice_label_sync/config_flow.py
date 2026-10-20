"""Config flow for HA Voice Label Sync."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers.selector import (
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
)

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

from .google_config import read_google_config


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
            ): NumberSelector(
                NumberSelectorConfig(
                    min=0,
                    max=100,
                    step=1,
                    mode=NumberSelectorMode.BOX,
                )
            ),
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
                data={
                    **user_input,
                    CONF_BACKUP_RETENTION: int(user_input[CONF_BACKUP_RETENTION]),
                },
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
        """Display the HVLS configuration menu."""
        return self.async_show_menu(
            step_id="init",
            menu_options=[
                "settings",
                "google_config",
            ],
        )

    async def async_step_settings(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Manage existing HVLS settings."""
        if user_input is not None:
            return self.async_create_entry(
                title="",
                data={
                    **user_input,
                    CONF_BACKUP_RETENTION: int(
                        user_input[CONF_BACKUP_RETENTION]
                    ),
                },
            )

        current_values = {
            **self.config_entry.data,
            **self.config_entry.options,
        }

        return self.async_show_form(
            step_id="settings",
            data_schema=build_schema(current_values),
        )

    async def async_step_google_config(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Display Google Assistant configuration (read-only)."""
        if user_input is not None:
            return self.async_show_menu(
                step_id="init",
                menu_options=["settings", "google_config"],
            )

        path = self.hass.config.path("configuration.yaml")

        result = await self.hass.async_add_executor_job(
            read_google_config,
            path,
        )

        settings = result.get("settings", {})
        warnings = result.get("warnings", [])

        lines = [
            f"Status: {result['status']}",
            "",
        ]

        for key, value in settings.items():
            lines.append(f"{key}: {value}")

        if warnings:
            lines.append("")
            lines.append("Warnings:")
            lines.extend(f"- {warning}" for warning in warnings)

        if result.get("other_keys"):
            lines.append("")
            lines.append(
                "Other parameters: "
                + ", ".join(result["other_keys"])
            )

        return self.async_show_form(
            step_id="google_config",
            data_schema=vol.Schema({}),
            description_placeholders={
                "configuration": "\n\n".join(lines),
            },
        )
