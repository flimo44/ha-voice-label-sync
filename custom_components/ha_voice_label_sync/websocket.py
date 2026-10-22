"""WebSocket API for HA Voice Label Sync."""

from __future__ import annotations

from functools import partial
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from hvls import FileWriterError, GenerationRequest, RegistryError, WorkflowError

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
from .ha_registries import get_live_registries
from .preview_apply import apply_reviewed_preview
from .preview_compare import PreviewFormatError, analyze_preview
from .preview_exclusions import analyze_exclusions
from .preview_guard import PreviewChangedError, preview_digest
from .services import DEFAULT_DOMAINS
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


def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register the HVLS WebSocket API."""
    websocket_api.async_register_command(hass, websocket_get_preview)
    websocket_api.async_register_command(hass, websocket_apply_preview)
