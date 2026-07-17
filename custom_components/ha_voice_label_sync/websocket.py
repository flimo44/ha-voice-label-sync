"""WebSocket API for HA Voice Label Sync."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .const import DOMAIN

WS_TYPE_GET_PREVIEW = f"{DOMAIN}/get_preview"


def _read_preview_file(preview_path: Path) -> str | None:
    """Read the generated Preview file."""
    try:
        return preview_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return None


@websocket_api.require_admin
@websocket_api.async_response
@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_GET_PREVIEW,
    }
)
async def websocket_get_preview(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the generated Preview YAML."""
    preview_path = Path(
        hass.config.path(
            ".hvls",
            "preview.yaml",
        )
    )

    content = await hass.async_add_executor_job(
        _read_preview_file,
        preview_path,
    )

    connection.send_result(
        msg["id"],
        {
            "available": content is not None,
            "content": content or "",
            "path": str(preview_path),
        },
    )


def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register the HVLS WebSocket API."""
    websocket_api.async_register_command(
        hass,
        websocket_get_preview,
    )
