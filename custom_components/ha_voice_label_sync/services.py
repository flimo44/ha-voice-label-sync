"""Services for HA Voice Label Sync."""

from __future__ import annotations

import logging
from functools import partial
from pathlib import Path

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError

from hvls import (
    FileWriterError,
    GenerationRequest,
    RegistryError,
    WorkflowError,
    run_google_assistant_workflow,
)

from .const import (
    CONF_BACKUP_RETENTION,
    CONF_LABEL,
    CONF_OUTPUT,
    DEFAULT_BACKUP_RETENTION,
    DEFAULT_LABEL,
    DEFAULT_OUTPUT,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)

SERVICE_GENERATE = "generate"

DEFAULT_DOMAINS = frozenset(
    {
        "climate",
        "cover",
        "fan",
        "input_boolean",
        "input_select",
        "light",
        "lock",
        "scene",
        "script",
        "select",
        "switch",
        "vacuum",
    }
)


async def async_register_services(hass: HomeAssistant) -> None:
    """Register integration services."""
    if hass.services.has_service(DOMAIN, SERVICE_GENERATE):
        return

    async def handle_generate(call: ServiceCall) -> None:
        """Generate Google Assistant configuration."""
        entries = hass.config_entries.async_entries(DOMAIN)

        if not entries:
            raise HomeAssistantError(
                "HA Voice Label Sync is not configured."
            )

        entry = entries[0]

        # Options override the values entered during initial setup.
        settings = {
            **entry.data,
            **entry.options,
        }

        label = settings.get(CONF_LABEL, DEFAULT_LABEL)
        output_value = settings.get(CONF_OUTPUT, DEFAULT_OUTPUT)
        backup_retention = settings.get(
            CONF_BACKUP_RETENTION,
            DEFAULT_BACKUP_RETENTION,
        )

        output_path = Path(output_value)

        # Keep relative output paths inside Home Assistant's config directory.
        if not output_path.is_absolute():
            output_path = Path(hass.config.config_dir) / output_path

        storage_path = Path(hass.config.config_dir) / ".storage"

        request = GenerationRequest(
            label=label,
            domains=DEFAULT_DOMAINS,
            output_path=output_path,
            dry_run=False,
        )

        workflow = partial(
            run_google_assistant_workflow,
            request=request,
            storage_path=storage_path,
            backup_retention=backup_retention,
        )

        try:
            result = await hass.async_add_executor_job(workflow)
        except (
            FileWriterError,
            RegistryError,
            WorkflowError,
            OSError,
            ValueError,
        ) as exc:
            _LOGGER.exception("HVLS generation failed")
            raise HomeAssistantError(
                f"HVLS generation failed: {exc}"
            ) from exc

        _LOGGER.info(
            "HVLS generated %s entities in %s",
            result.entity_count,
            output_path,
        )

        await hass.services.async_call(
            "persistent_notification",
            "create",
            {
                "title": "HA Voice Label Sync",
                "message": (
                    f"Configuration generated successfully.\n\n"
                    f"Entities: {result.entity_count}\n"
                    f"Output: `{output_path}`"
                ),
                "notification_id": "ha_voice_label_sync_generate",
            },
            blocking=True,
            context=call.context,
        )

    hass.services.async_register(
        DOMAIN,
        SERVICE_GENERATE,
        handle_generate,
    )
