"""WebSocket API for HA Voice Label Sync."""

from __future__ import annotations

from functools import partial
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from hvls import FileWriterError, GenerationRequest, RegistryError, WorkflowError

from .backup_restore import (
    BackupRestoreError,
    list_backups,
    restore_reviewed_backup,
    review_backup,
)
from .const import (
    CONF_BACKUP_RETENTION,
    CONF_CREATE_BACKUP,
    CONF_LABEL,
    CONF_OUTPUT,
    DEFAULT_BACKUP_RETENTION,
    DEFAULT_CREATE_BACKUP,
    DEFAULT_LABEL,
    DEFAULT_OUTPUT,
    DOMAIN,
)
from .entity_catalog import build_entity_catalog
from .entity_label_writer import update_entity_label
from .ha_registries import get_live_registries
from .label_update import LabelUpdateError, ensure_entity_eligible_for_addition
from .preview_apply import apply_reviewed_preview
from .preview_compare import PreviewFormatError, analyze_preview
from .preview_exclusions import analyze_exclusions
from .preview_guard import PreviewChangedError, preview_digest
from .services import DEFAULT_DOMAINS, async_run_workflow
from .workflow_lock import get_workflow_lock

WS_TYPE_GET_PREVIEW = f"{DOMAIN}/get_preview"


def _read_file(path: Path) -> tuple[str | None, str | None]:
    """Read a YAML file, distinguishing missing and read errors."""
    try:
        return path.read_bytes().decode("utf-8"), None
    except FileNotFoundError:
        return None, "missing"
    except (OSError, UnicodeError) as exc:
        return None, str(exc)


def _read_and_compare(preview_path: Path, output_path: Path) -> dict[str, Any]:
    """Read and compare Preview and production off the HA event loop."""
    preview, preview_error = _read_file(preview_path)

    if preview is None:
        return {
            "available": False,
            "content": "",
            "path": str(preview_path),
            "error": preview_error if preview_error != "missing" else None,
            "can_apply": False,
            "preview_sha256": None,
            "production_sha256": None,
        }

    production, prod_error = _read_file(output_path)

    try:
        analysis = analyze_preview(preview, production)
    except PreviewFormatError as exc:
        return {
            "available": True,
            "content": preview,
            "path": str(preview_path),
            "error": f"Preview cannot be analyzed: {exc}",
            "can_apply": False,
            "preview_sha256": None,
            "production_sha256": None,
        }

    production_readable = prod_error is None or prod_error == "missing"

    if not production_readable:
        analysis["comparison"] = {
            "status": "unreadable",
            "reason": prod_error,
        }

    return {
        "available": True,
        "content": preview,
        "path": str(preview_path),
        "production_path": str(output_path),
        **analysis,
        "can_apply": production_readable,
        "preview_sha256": preview_digest(preview),
        "production_sha256": (
            preview_digest(production) if production is not None else None
        ),
    }


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_GET_PREVIEW})
async def websocket_get_preview(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return preview, read-only statistics and production differences."""
    preview_path = Path(hass.config.path(".hvls", "preview.yaml"))
    entries = hass.config_entries.async_entries(DOMAIN)
    settings = {**entries[0].data, **entries[0].options} if entries else {}
    output_path = Path(settings.get(CONF_OUTPUT, DEFAULT_OUTPUT))
    if not output_path.is_absolute():
        output_path = Path(hass.config.config_dir) / output_path
    # Native HA registries must be accessed on the event-loop thread.
    try:
        registries = get_live_registries(hass)
    except (KeyError, AttributeError, TypeError, ValueError) as exc:
        connection.send_error(
            msg["id"],
            "registry_error",
            f"Unable to read Home Assistant registries: {exc}",
        )
        return

    label = settings.get(CONF_LABEL, DEFAULT_LABEL)

    result = await hass.async_add_executor_job(
        _read_and_compare, preview_path, output_path
    )
    try:
        excluded = await hass.async_add_executor_job(
            analyze_exclusions,
            registries,
            label,
            DEFAULT_DOMAINS,
        )
    except (KeyError, AttributeError, TypeError, ValueError) as exc:
        connection.send_error(
            msg["id"],
            "exclusion_error",
            f"Unable to analyze excluded entities: {exc}",
        )
        return

    result["exclusions"] = {
        "count": len(excluded),
        "entities": excluded,
    }
    connection.send_result(msg["id"], result)


WS_TYPE_APPLY_PREVIEW = f"{DOMAIN}/apply_preview"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_APPLY_PREVIEW,
        vol.Required("preview_sha256"): str,
        vol.Required("production_sha256"): vol.Any(None, str),
    }
)
async def websocket_apply_preview(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Apply exactly the reviewed Preview, or refuse the write."""
    async with get_workflow_lock(hass):
        entries = hass.config_entries.async_entries(DOMAIN)
        if not entries:
            connection.send_error(
                msg["id"], "not_configured", "HVLS is not configured."
            )
            return

        settings = {**entries[0].data, **entries[0].options}
        output_path = Path(settings.get(CONF_OUTPUT, DEFAULT_OUTPUT))
        if not output_path.is_absolute():
            output_path = Path(hass.config.config_dir) / output_path

        request = GenerationRequest(
            label=settings.get(CONF_LABEL, DEFAULT_LABEL),
            domains=DEFAULT_DOMAINS,
            output_path=output_path,
            dry_run=True,
        )
        preview_path = Path(hass.config.path(".hvls", "preview.yaml"))

        try:
            registries = get_live_registries(hass)
            result = await hass.async_add_executor_job(
                partial(
                    apply_reviewed_preview,
                    request,
                    registries,
                    preview_path,
                    msg["preview_sha256"],
                    int(
                        settings.get(
                            CONF_BACKUP_RETENTION,
                            DEFAULT_BACKUP_RETENTION,
                        )
                    ),
                    settings.get(CONF_CREATE_BACKUP, DEFAULT_CREATE_BACKUP),
                    expected_production_digest=msg["production_sha256"],
                )
            )
        except (
            PreviewChangedError,
            FileWriterError,
            RegistryError,
            WorkflowError,
            OSError,
            ValueError,
            TypeError,
            KeyError,
            AttributeError,
        ) as exc:
            connection.send_error(msg["id"], "apply_failed", str(exc))
            return

        connection.send_result(
            msg["id"],
            {
                "applied": True,
                "output_path": str(result.output_path),
                "bytes_written": result.bytes_written,
                "backup_path": (
                    str(result.backup_path) if result.backup_path is not None else None
                ),
            },
        )



WS_TYPE_GENERATE_PREVIEW = f"{DOMAIN}/generate_preview"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {vol.Required("type"): WS_TYPE_GENERATE_PREVIEW}
)
async def websocket_generate_preview(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Regenerate Preview without writing to production."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        connection.send_error(
            msg["id"], "not_configured", "HVLS is not configured."
        )
        return

    try:
        result = await async_run_workflow(
            hass, entries[0], dry_run=True
        )
    except Exception as exc:
        connection.send_error(
            msg["id"], "preview_failed", str(exc)
        )
        return

    connection.send_result(
        msg["id"],
        {"generated": True, "entity_count": result.entity_count},
    )


WS_TYPE_GET_ENTITIES = f"{DOMAIN}/get_entities"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {vol.Required("type"): WS_TYPE_GET_ENTITIES}
)
async def websocket_get_entities(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return current HA entities and HVLS label membership."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        connection.send_error(
            msg["id"], "not_configured", "HVLS is not configured."
        )
        return

    settings = {**entries[0].data, **entries[0].options}
    label = settings.get(CONF_LABEL, DEFAULT_LABEL)

    try:
        # Native HA registries must be read on the event-loop thread.
        registries = get_live_registries(hass)
        catalog = await hass.async_add_executor_job(
            build_entity_catalog, registries, label, DEFAULT_DOMAINS
        )
    except (KeyError, AttributeError, TypeError, ValueError) as exc:
        connection.send_error(
            msg["id"], "registry_error", str(exc)
        )
        return

    connection.send_result(msg["id"], catalog)


WS_TYPE_SET_ENTITY_LABEL = f"{DOMAIN}/set_entity_label"


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_SET_ENTITY_LABEL,
        vol.Required("entity_id"): str,
        vol.Required("enabled"): bool,
        vol.Required("expected_enabled"): bool,
    }
)
async def websocket_set_entity_label(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Update exactly one entity's HVLS label, without generating YAML."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        connection.send_error(
            msg["id"], "not_configured", "HVLS is not configured."
        )
        return

    settings = {**entries[0].data, **entries[0].options}
    configured_label = settings.get(CONF_LABEL, DEFAULT_LABEL)

    try:
        # Entire read/check/write sequence runs on the HA event loop.
        # Do not add an await between these operations.
        if msg["enabled"]:
            registries = get_live_registries(hass)
            catalog = build_entity_catalog(
                registries, configured_label, DEFAULT_DOMAINS
            )
            entity = next(
                (item for item in catalog["entities"]
                 if item["entity_id"] == msg["entity_id"]),
                None,
            )
            ensure_entity_eligible_for_addition(entity, msg["enabled"])

        result = update_entity_label(
            hass,
            msg["entity_id"],
            configured_label,
            msg["enabled"],
            msg["expected_enabled"],
        )
    except LabelUpdateError as exc:
        connection.send_error(msg["id"], "label_update_refused", str(exc))
        return
    except (ValueError, TypeError, KeyError, AttributeError) as exc:
        connection.send_error(msg["id"], "label_update_failed", str(exc))
        return

    connection.send_result(msg["id"], result)



WS_TYPE_LIST_BACKUPS = f"{DOMAIN}/list_backups"
WS_TYPE_REVIEW_BACKUP = f"{DOMAIN}/review_backup"
WS_TYPE_RESTORE_BACKUP = f"{DOMAIN}/restore_backup"


def _configured_output(hass: HomeAssistant) -> Path:
    """Resolve the output path from the active HA integration settings."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        raise BackupRestoreError("HVLS is not configured.")
    settings = {**entries[0].data, **entries[0].options}
    path = Path(settings.get(CONF_OUTPUT, DEFAULT_OUTPUT))
    if not path.is_absolute():
        path = Path(hass.config.config_dir) / path
    config_root = Path(hass.config.config_dir).resolve()
    if not path.resolve().is_relative_to(config_root):
        raise BackupRestoreError("Production output must be inside the HA config directory.")
    if path.is_symlink():
        raise BackupRestoreError("Production output cannot be a symbolic link.")
    return path


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_LIST_BACKUPS})
async def websocket_list_backups(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List known HVLS backups without exposing arbitrary file paths."""
    try:
        path = _configured_output(hass)
        result = await hass.async_add_executor_job(list_backups, path)
    except (BackupRestoreError, OSError, ValueError) as exc:
        connection.send_error(msg["id"], "backup_list_failed", str(exc))
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_REVIEW_BACKUP,
    vol.Required("backup_id"): str,
})
async def websocket_review_backup(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Compare a selected backup with the current production file."""
    try:
        path = _configured_output(hass)
        result = await hass.async_add_executor_job(review_backup, path, msg["backup_id"])
    except (BackupRestoreError, OSError, ValueError) as exc:
        connection.send_error(msg["id"], "backup_review_failed", str(exc))
        return
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command({
    vol.Required("type"): WS_TYPE_RESTORE_BACKUP,
    vol.Required("backup_id"): str,
    vol.Required("backup_sha256"): str,
    vol.Required("production_sha256"): str,
})
async def websocket_restore_backup(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Only restore a backup confirmed against current production."""
    async with get_workflow_lock(hass):
        try:
            path = _configured_output(hass)
            result = await hass.async_add_executor_job(
                restore_reviewed_backup,
                path,
                msg["backup_id"],
                msg["backup_sha256"],
                msg["production_sha256"],
            )
        except (
            BackupRestoreError,
            PreviewChangedError,
            FileWriterError,
            OSError,
            ValueError,
        ) as exc:
            connection.send_error(msg["id"], "backup_restore_failed", str(exc))
            return
        connection.send_result(msg["id"], result)


def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register the HVLS WebSocket API."""
    websocket_api.async_register_command(hass, websocket_get_preview)
    websocket_api.async_register_command(hass, websocket_get_entities)
    websocket_api.async_register_command(hass, websocket_set_entity_label)
    websocket_api.async_register_command(hass, websocket_apply_preview)
    websocket_api.async_register_command(hass, websocket_generate_preview)
    websocket_api.async_register_command(hass, websocket_list_backups)
    websocket_api.async_register_command(hass, websocket_review_backup)
    websocket_api.async_register_command(hass, websocket_restore_backup)
