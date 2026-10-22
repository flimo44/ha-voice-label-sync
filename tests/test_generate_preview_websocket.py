"""Tests for the generate-preview WebSocket command."""

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

pytest_plugins = ("test_preview_websocket",)


def test_generate_preview_success(websocket_module):
    ws = websocket_module.websocket
    hass = SimpleNamespace(
        config_entries=SimpleNamespace(
            async_entries=Mock(return_value=[object()])
        )
    )
    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    ws.async_run_workflow = AsyncMock(
        return_value=SimpleNamespace(entity_count=32)
    )

    asyncio.run(
        ws.websocket_generate_preview(
            hass, connection, {"id": 1}
        )
    )

    ws.async_run_workflow.assert_awaited_once_with(
        hass,
        hass.config_entries.async_entries.return_value[0],
        dry_run=True,
    )
    connection.send_result.assert_called_once_with(
        1, {"generated": True, "entity_count": 32}
    )
    connection.send_error.assert_not_called()


def test_generate_preview_not_configured(websocket_module):
    ws = websocket_module.websocket
    hass = SimpleNamespace(
        config_entries=SimpleNamespace(
            async_entries=Mock(return_value=[])
        )
    )
    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    ws.async_run_workflow = AsyncMock()

    asyncio.run(
        ws.websocket_generate_preview(
            hass, connection, {"id": 2}
        )
    )

    ws.async_run_workflow.assert_not_awaited()
    connection.send_result.assert_not_called()
    connection.send_error.assert_called_once()
    assert connection.send_error.call_args.args[1] == "not_configured"


def test_generate_preview_failure(websocket_module):
    ws = websocket_module.websocket
    hass = SimpleNamespace(
        config_entries=SimpleNamespace(
            async_entries=Mock(return_value=[object()])
        )
    )
    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    ws.async_run_workflow = AsyncMock(
        side_effect=RuntimeError("Preview failed")
    )

    asyncio.run(
        ws.websocket_generate_preview(
            hass, connection, {"id": 3}
        )
    )

    connection.send_result.assert_not_called()
    connection.send_error.assert_called_once()
    assert connection.send_error.call_args.args[1] == "preview_failed"
