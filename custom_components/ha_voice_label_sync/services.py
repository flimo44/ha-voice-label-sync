"""Services for HA Voice Label Sync."""

from __future__ import annotations

import logging
from functools import partial
from pathlib import Path
from tempfile import NamedTemporaryFile

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Context, HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError

from hvls import (
    FileWriterError,
    GenerationRequest,
    RegistryError,
    WorkflowError,
    WorkflowResult,
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

def _write_preview_file(
    preview_path: Path,
    content: str,
) -> None:
    """Write preview content atomically."""
    preview_path.parent.mkdir(parents=True, exist_ok=True)

    temporary_path: Path | None = None

    try:
        with NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=preview_path.parent,
            prefix=f".{preview_path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_file.write(content)
            temporary_path = Path(temporary_file.name)

        temporary_path.replace(preview_path)
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()

async def async_run_workflow(
    hass: HomeAssistant,
    entry: ConfigEntry,
    *,
    dry_run: bool,
    context: Context | None = None,
) -> WorkflowResult:
    """Run the HVLS workflow for one config entry."""
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

    if not output_path.is_absolute():
        output_path = Path(hass.config.config_dir) / output_path

    storage_path = Path(hass.config.config_dir) / ".storage"

    request = GenerationRequest(
        label=label,
        domains=DEFAULT_DOMAINS,
        output_path=output_path,
        dry_run=dry_run,
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
        operation = "preview" if dry_run else "generation"
        _LOGGER.exception("HVLS %s failed", operation)

        raise HomeAssistantError(
            f"HVLS {operation} failed: {exc}"
        ) from exc

    domain_counts = result.generation.domain_counts

    domain_summary = "\n".join(
        f"- {domain}: {count}"
        for domain, count in sorted(domain_counts.items())
    )

    if not domain_summary:
        domain_summary = "- No matching entity"

    warnings = "\n".join(
        f"- {warning}"
        for warning in result.generation.warnings
    )

    if dry_run:
        preview_path = Path(
            hass.config.path(
                ".hvls",
                "preview.yaml",
            )
        )

        await hass.async_add_executor_job(
            _write_preview_file,
            preview_path,
            result.generation.content,
        )

        title = "HA Voice Label Sync — Preview"
        message = (
            f"Preview generated successfully.\n\n"
            f"**Label:** `{label}`\n\n"
            f"**Entities found:** {result.entity_count}\n\n"
            f"**By domain:**\n{domain_summary}\n\n"
            f"**Preview file:** `{preview_path}`\n\n"
            f"Production file unchanged:\n"
            f"`{output_path}`"
        )
        notification_id = "ha_voice_label_sync_preview"
    else:
        title = "HA Voice Label Sync"
        message = (
            f"Configuration generated successfully.\n\n"
            f"**Entities:** {result.entity_count}\n\n"
            f"**By domain:**\n{domain_summary}\n\n"
            f"**Output:** `{output_path}`"
        )
        notification_id = "ha_voice_label_sync_generate"

    if warnings:
        message += f"\n\n**Warnings:**\n{warnings}"

    await hass.services.async_call(
        "persistent_notification",
        "create",
        {
            "title": title,
            "message": message,
            "notification_id": notification_id,
        },
        blocking=True,
        context=context,
    )

    _LOGGER.info(
        "HVLS %s completed with %s entities",
        "preview" if dry_run else "generation",
        result.entity_count,
    )

    return result


async def async_run_workflow(
    hass: HomeAssistant,
    entry: ConfigEntry,
    *,
    dry_run: bool,
    context: Context | None = None,
) -> WorkflowResult:
    """Run the HVLS workflow for one config entry."""
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

    if not output_path.is_absolute():
        output_path = Path(hass.config.config_dir) / output_path

    storage_path = Path(hass.config.config_dir) / ".storage"

    request = GenerationRequest(
        label=label,
        domains=DEFAULT_DOMAINS,
        output_path=output_path,
        dry_run=dry_run,
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
        operation = "preview" if dry_run else "generation"
        _LOGGER.exception("HVLS %s failed", operation)

        raise HomeAssistantError(
            f"HVLS {operation} failed: {exc}"
        ) from exc

    domain_counts = result.generation.domain_counts

    domain_summary = "\n".join(
        f"- {domain}: {count}"
        for domain, count in sorted(domain_counts.items())
    )

    if not domain_summary:
        domain_summary = "- No matching entity"

    warnings = "\n".join(
        f"- {warning}"
        for warning in result.generation.warnings
    )

    if dry_run:
        preview_content = result.generation.content.strip()

        title = "HA Voice Label Sync — Preview"
        message = (
            f"Preview completed.\n\n"
            f"**Label:** `{label}`\n\n"
            f"**Entities found:** {result.entity_count}\n\n"
            f"**By domain:**\n{domain_summary}\n\n"
            f"**Output:** `{output_path}`\n\n"
            f"**Generated YAML:**\n\n"
            f"```yaml\n{preview_content}\n```\n\n"
            f"No file was modified."
        )
        notification_id = "ha_voice_label_sync_preview"
    else:
        title = "HA Voice Label Sync"
        message = (
            f"Configuration generated successfully.\n\n"
            f"**Entities:** {result.entity_count}\n\n"
            f"**By domain:**\n{domain_summary}\n\n"
            f"**Output:** `{output_path}`"
        )
        notification_id = "ha_voice_label_sync_generate"

    if warnings:
        message += f"\n\n**Warnings:**\n{warnings}"

    await hass.services.async_call(
        "persistent_notification",
        "create",
        {
            "title": title,
            "message": message,
            "notification_id": notification_id,
        },
        blocking=True,
        context=context,
    )

    _LOGGER.info(
        "HVLS %s completed with %s entities",
        "preview" if dry_run else "generation",
        result.entity_count,
    )

    return result


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

        await async_run_workflow(
            hass,
            entries[0],
            dry_run=False,
            context=call.context,
        )

    hass.services.async_register(
        DOMAIN,
        SERVICE_GENERATE,
        handle_generate,
    )