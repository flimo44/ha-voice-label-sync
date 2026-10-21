"""WebSocket API for HA Voice Label Sync."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .const import CONF_OUTPUT, DEFAULT_OUTPUT, DOMAIN
from .preview_compare import PreviewFormatError, analyze_preview

WS_TYPE_GET_PREVIEW = f"{DOMAIN}/get_preview"


def _read_file(path: Path) -> tuple[str | None, str | None]:
    """Read a YAML file, distinguishing missing and read errors."""
    try:
        return path.read_text(encoding="utf-8"), None
    except FileNotFoundError:
        return None, "missing"
    except (OSError, UnicodeError) as exc:
        return None, str(exc)


def _read_and_compare(preview_path: Path, output_path: Path) -> dict[str, Any]:
    """Run disk I/O and YAML parsing off the Home Assistant event loop."""
    preview, preview_error = _read_file(preview_path)
    if preview is None:
        return {
            "available": False,
            "content": "",
            "path": str(preview_path),
            "error": preview_error if preview_error != "missing" else None,
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
        }
    if prod_error and prod_error != "missing":
        analysis["comparison"] = {"status": "unreadable", "reason": prod_error}
    return {
        "available": True,
        "content": preview,
        "path": str(preview_path),
        "production_path": str(output_path),
        **analysis,
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
    result = await hass.async_add_executor_job(
        _read_and_compare, preview_path, output_path
    )
    connection.send_result(msg["id"], result)


def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register the HVLS WebSocket API."""
    websocket_api.async_register_command(hass, websocket_get_preview)
