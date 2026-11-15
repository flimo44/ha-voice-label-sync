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
from .google_config import (
    check_entity_config,
    initial_setup_output_error,
    inspect_initial_setup,
    read_google_config,
    render_initial_setup_diagnostic,
)
from .label_setup import ensure_configured_label
from .label_update import LabelUpdateError
from .output_path import UnsafeOutputPath, resolve_output_path


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
        """First contact: ask what the user wishes to do, not for paths."""
        report = await self.hass.async_add_executor_job(
            inspect_initial_setup,
            self.hass.config.path(),
            self.hass.config.path(DEFAULT_OUTPUT),
        )
        existing = report["output_status"] == "existing"
        french = str(
            getattr(self.hass.config, "language", "en")
        ).lower().startswith("fr")
        if french:
            hint = (
                "Un fichier YAML existe déjà ; il restera intact."
                if existing else "Aucun fichier YAML HVLS habituel détecté."
            )
        else:
            hint = (
                "An existing YAML file was found; it will remain unchanged."
                if existing else "No standard HVLS YAML file was detected."
            )
        return self.async_show_menu(
            step_id="user",
            menu_options=["new", "existing"],
            description_placeholders={"detected_file": hint},
        )

    async def async_step_new(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Create a new HVLS selection, never overwrite an existing output."""
        return await self._async_step_configure("new", user_input)

    async def async_step_existing(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Reuse a preexisting YAML only after separate Assistant review."""
        return await self._async_step_configure("existing", user_input)

    async def _async_step_configure(
        self, mode: str, user_input: dict[str, Any] | None,
    ) -> FlowResult:
        """Show technical defaults only after the user's initial choice."""
        if mode not in {"new", "existing"}:
            raise ValueError("Invalid onboarding choice")
        # A user choosing "new" must not accidentally select an old file.
        # Keep a simple root-level path so the writer's parent exists.
        original = await self.hass.async_add_executor_job(
            inspect_initial_setup,
            self.hass.config.path(),
            self.hass.config.path(DEFAULT_OUTPUT),
        )
        suggested_output = (
            self.hass.config.path("google_assistant_entities_hvls.yaml")
            if mode == "new" and original["output_status"] == "existing"
            else self.hass.config.path(DEFAULT_OUTPUT)
        )
        values = user_input or {CONF_OUTPUT: suggested_output}
        output = values.get(CONF_OUTPUT, suggested_output)
        report = await self.hass.async_add_executor_job(
            inspect_initial_setup, self.hass.config.path(), output,
        )
        placeholders = {
            "diagnostic": render_initial_setup_diagnostic(
                report, getattr(self.hass.config, "language", "en"),
            ),
        }

        if user_input is not None:
            error = initial_setup_output_error(report)
            if (
                error is None and mode == "new"
                and report["output_status"] == "existing"
            ):
                error = "new_output_exists"
            if (
                error is None and mode == "existing"
                and report["output_status"] != "existing"
            ):
                error = "existing_source_missing"
            if error:
                return self.async_show_form(
                    step_id=mode,
                    data_schema=build_schema(user_input),
                    errors={"base": error},
                    description_placeholders=placeholders,
                )

            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            try:
                ensure_configured_label(self.hass, user_input[CONF_LABEL])
            except (LabelUpdateError, ValueError, OSError):
                return self.async_show_form(
                    step_id=mode,
                    data_schema=build_schema(user_input),
                    errors={"base": "label_setup_failed"},
                    description_placeholders=placeholders,
                )

            return self.async_create_entry(
                title=NAME,
                data={
                    **user_input,
                    "onboarding_mode": mode,  # Guidance only; never write authority.
                    CONF_BACKUP_RETENTION: int(
                        user_input[CONF_BACKUP_RETENTION]
                    ),
                },
            )

        return self.async_show_form(
            step_id=mode,
            data_schema=build_schema(values),
            description_placeholders=placeholders,
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
            # Options must obey the same path boundary as onboarding and Apply.
            try:
                await self.hass.async_add_executor_job(
                    resolve_output_path,
                    self.hass.config.path(),
                    user_input[CONF_OUTPUT],
                )
            except UnsafeOutputPath:
                return self.async_show_form(
                    step_id="settings",
                    data_schema=build_schema(user_input),
                    errors={"base": "unsafe_output_path"},
                )
            try:
                ensure_configured_label(self.hass, user_input[CONF_LABEL])
            except (LabelUpdateError, ValueError, OSError):
                return self.async_show_form(
                    step_id="settings",
                    data_schema=build_schema(user_input),
                    errors={"base": "label_setup_failed"},
                )
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
        current_values.setdefault(
            CONF_OUTPUT, self.hass.config.path(DEFAULT_OUTPUT),
        )

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

        exposure_status = {
            "enabled": "Activé",
            "enabled_default": "Activé (valeur par défaut de Home Assistant)",
            "disabled": "Désactivé",
            "unknown": "Non déterminé",
        }.get(google.get("expose_by_default_state"), "Non déterminé")

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
                    f"{exposure_status}"
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
