"""Regression tests for asynchronous HVLS frontend asset registration."""

from __future__ import annotations

import asyncio
import hashlib
import importlib.util
import sys
import threading
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest


@pytest.fixture
def hvls_setup(monkeypatch):
    """Import the real __init__.py with minimal simulated Home Assistant."""
    modules = {}

    def module(name, package=False, **values):
        result = ModuleType(name)
        if package:
            result.__path__ = []
        for key, value in values.items():
            setattr(result, key, value)
        monkeypatch.setitem(sys.modules, name, result)
        modules[name] = result
        return result

    module("homeassistant", package=True)
    components = module("homeassistant.components", package=True)
    frontend = module(
        "homeassistant.components.frontend",
        async_register_built_in_panel=Mock(),
    )
    components.frontend = frontend
    module("homeassistant.components.http",
           StaticPathConfig=lambda url, path, cache: (url, path, cache))
    module("homeassistant.config_entries", ConfigEntry=object)
    module("homeassistant.core", HomeAssistant=object)
    module("homeassistant.helpers", package=True)
    module("homeassistant.helpers.device_registry",
           async_get=Mock(), DeviceEntryType=SimpleNamespace(SERVICE="service"))

    module("hvls", FileWriterError=type("FileWriterError", (Exception,), {}))
    package = "_test_hvls_asset_setup"
    module(package, package=True)
    module(
        f"{package}.const",
        CONF_LABEL="label",
        CONF_OUTPUT="output",
        DEFAULT_LABEL="google_assistant",
        DEFAULT_OUTPUT="google_assistant_entities.yaml",
        DOMAIN="ha_voice_label_sync",
    )
    module(f"{package}.label_setup", ensure_configured_label=Mock())
    module(f"{package}.orphaned_new_install",
           retire_missing_inactive_owner=Mock())
    module(
        f"{package}.output_path",
        UnsafeOutputPath=type("UnsafeOutputPath", (ValueError,), {}),
        resolve_output_path=Mock(),
    )
    services = module(
        f"{package}.services", async_register_services=AsyncMock(),
    )
    websocket = module(
        f"{package}.websocket", async_register_websocket_api=Mock(),
    )

    path = (
        Path(__file__).resolve().parents[1]
        / "custom_components/ha_voice_label_sync/__init__.py"
    )
    spec = importlib.util.spec_from_file_location(f"{package}.__init__", path)
    integration = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, spec.name, integration)
    spec.loader.exec_module(integration)
    return SimpleNamespace(
        integration=integration, frontend=frontend,
        services=services, websocket=websocket,
    )


def _hass():
    jobs = []
    registered = []

    async def executor_job(function, *args):
        jobs.append((function, args))
        return await asyncio.to_thread(function, *args)

    async def register_paths(paths):
        registered.extend(paths)

    hass = SimpleNamespace(
        data={},
        async_add_executor_job=executor_job,
        http=SimpleNamespace(async_register_static_paths=register_paths),
    )
    return hass, jobs, registered


def test_panel_hash_matches_exact_asset_content(hvls_setup, tmp_path):
    script = tmp_path / "panel.js"
    script.write_bytes(b"const revision = 3;\n")
    expected = hashlib.sha256(script.read_bytes()).hexdigest()[:12]
    assert hvls_setup.integration._panel_js_version(script) == expected


def test_setup_reads_asset_in_executor_not_event_loop(hvls_setup, monkeypatch):
    payload = b"customElements.define('hvls-preview-panel', class {});"
    expected = hashlib.sha256(payload).hexdigest()[:12]
    threads = []
    main_thread = threading.get_ident()
    original = Path.read_bytes

    def guarded_read(path):
        if path.name == "hvls-preview-panel.js":
            threads.append(threading.get_ident())
            return payload
        return original(path)

    monkeypatch.setattr(Path, "read_bytes", guarded_read)
    hass, jobs, registered = _hass()
    assert asyncio.run(hvls_setup.integration.async_setup(hass, {})) is True
    assert threads and all(thread != main_thread for thread in threads)
    assert len(jobs) == 1
    assert jobs[0][0] is hvls_setup.integration._panel_js_version
    assert len(registered) == 1
    assert registered[0][0] == "/ha_voice_label_sync"
    hvls_setup.services.async_register_services.assert_awaited_once_with(hass)
    hvls_setup.websocket.async_register_websocket_api.assert_called_once_with(hass)

    options = hvls_setup.frontend.async_register_built_in_panel.call_args.kwargs
    assert options["config"]["_panel_custom"]["js_url"].endswith(
        f"/hvls-preview-panel.js?v={expected}"
    )
    assert options["require_admin"] is True


def test_failed_asset_read_never_registers_broken_panel(
    hvls_setup, monkeypatch,
):
    original = Path.read_bytes

    def fail_asset(path):
        if path.name == "hvls-preview-panel.js":
            raise OSError("panel missing")
        return original(path)

    monkeypatch.setattr(Path, "read_bytes", fail_asset)
    hass, _, registered = _hass()
    with pytest.raises(OSError, match="panel missing"):
        asyncio.run(hvls_setup.integration.async_setup(hass, {}))
    assert registered == []
    hvls_setup.frontend.async_register_built_in_panel.assert_not_called()
