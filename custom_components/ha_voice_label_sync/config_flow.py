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
from .google_config import check_entity_config, read_google_config


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
        """Manage HVLS options."""
        if user_input is not None:
            return self.async_create_entry(
                title="",
                data={
                    **user_input,
                    CONF_BACKUP_RETENTION: int(user_input[CONF_BACKUP_RETENTION]),
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
        """Display a read-only Google Assistant diagnostic."""
        if user_input is not None:
            return await self.async_step_init()

        config_dir = self.hass.config.path()
        config_file = self.hass.config.path("configuration.yaml")

        google = await self.hass.async_add_executor_job(read_google_config, config_file)

        current_values = {
            **self.config_entry.data,
            **self.config_entry.options,
        }

        output = current_values.get(CONF_OUTPUT, DEFAULT_OUTPUT)

        check = await self.hass.async_add_executor_job(
            check_entity_config,
            google,
            output,
            config_dir,
        )

        settings = google.get("settings", {})

        def safe(value: Any) -> str:
            """Escape Markdown and prevent multiline injection."""
            value = str(value).replace("\r", " ").replace("\n", " ")
            for char in ("\\", "`", "*", "_", "[", "]", "|", "<", ">"):
                value = value.replace(char, "\\" + char)
            return value

        def enabled(value: Any) -> str:
            if value is None:
                return "Non renseigné"
            text = str(value).lower()
            if text == "true":
                return "Activé"
            if text == "false":
                return "Désactivé"
            return "Non déterminé"

        lines = ["## Configuration Google Assistant", ""]

        if google["status"] == "found":
            lines.append("✅ **Configuration détectée**")
        else:
            lines.append(
                "⚠️ **Configuration non disponible :** " + safe(google["status"])
            )

        lines.extend(
            [
                "",
                "### Paramètres",
                "",
                (
                    "- **Project ID :** "
                    f"{safe(settings.get('project_id', 'Non renseigné'))}"
                ),
                (f"- **Report State :** {enabled(settings.get('report_state'))}"),
                (
                    "- **Exposition automatique :** "
                    f"{enabled(settings.get('expose_by_default'))}"
                ),
                (
                    "- **Compte de service :** "
                    f"{safe(settings.get('service_account', 'Non renseigné'))}"
                ),
                "",
                "### Contrôle du fichier YAML",
                "",
            ]
        )

        status = check["status"]
        if status == "ok":
            lines.append("✅ **Fichier présent et chemins identiques**")
        elif status == "file_missing":
            lines.append("❌ **Fichier Google Assistant introuvable**")
        elif status == "path_mismatch":
            lines.append("⚠️ **Chemin différent de la sortie HVLS**")
        elif status == "entity_config_missing":
            lines.append("⚠️ **Paramètre entity_config absent**")
        else:
            lines.append("⚠️ **Contrôle non validé :** " + safe(status))

        if status in ("ok", "file_missing", "path_mismatch"):
            lines.extend(
                [
                    "",
                    "#### Vérifications détaillées",
                    "",
                    "- Fichier Google Assistant : "
                    + ("✅ Présent" if check["file_exists"] else "❌ Absent"),
                    "- Correspondance avec HVLS : "
                    + ("✅ Identique" if check["paths_match"] else "⚠️ Différente"),
                ]
            )

        if google.get("warnings"):
            lines.extend(["", "### Avertissements", ""])
            lines.extend("- ⚠️ " + safe(warning) for warning in google["warnings"])

        return self.async_show_form(
            step_id="google_config",
            data_schema=vol.Schema({}),
            description_placeholders={
                "configuration": "\n".join(lines),
            },
        )
