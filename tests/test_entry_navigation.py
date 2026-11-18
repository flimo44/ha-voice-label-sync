"""Regression tests for native HVLS post-install navigation without HA buttons."""

from __future__ import annotations

import asyncio
import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest


@pytest.fixture
def entry_setup_env(monkeypatch):
    """Import the entry setup using minimal Home Assistant stubs."""
    def module(name, **attrs):
        m = ModuleType(name)
        for key, value in attrs.items():
            setattr(m, key, value)
        monkeypatch.setitem(sys.modules, name, m)
        return m

    homeassistant = module("homeassistant")
    homeassistant.__path__ = []
    components = module("homeassistant.components")
    components.__path__ = []
    frontend = module(
        "homeassistant.components.frontend",
        async_register_built_in_panel=Mock(),
    )
    components.frontend = frontend
    module("homeassistant.components.http", StaticPathConfig=object)
    module("homeassistant.config_entries", ConfigEntry=object)
    module("homeassistant.core", HomeAssistant=object)

    helpers = module("homeassistant.helpers")
    helpers.__path__ = []
    registry = SimpleNamespace(async_get_or_create=Mock())
    device_registry = module(
        "homeassistant.helpers.device_registry",
        async_get=Mock(return_value=registry),
        DeviceEntryType=SimpleNamespace(SERVICE="service"),
    )
    helpers.device_registry = device_registry

    package = module("custom_components")
    package.__path__ = []
    integration = module("custom_components.ha_voice_label_sync")
    integration.__path__ = []

    prefix = "custom_components.ha_voice_label_sync."
    module(
        prefix + "const",
        CONF_LABEL="label",
        CONF_OUTPUT="output",
        DEFAULT_LABEL="google_assistant",
        DEFAULT_OUTPUT="/config/google_assistant_entities.yaml",
        DOMAIN="ha_voice_label_sync",
    )
    module(prefix + "label_setup", ensure_configured_label=Mock())
    module(prefix + "orphaned_new_install", retire_missing_inactive_owner=Mock())
    module(prefix + "services", async_register_services=AsyncMock())
    module(prefix + "websocket", async_register_websocket_api=Mock())

    path = Path("custom_components/ha_voice_label_sync/__init__.py")
    # __init__.py must be loaded under its actual package name:
    # giving it a child name would create an implicit nested package,
    # bypassing the stubs for .label_setup and other relative imports.
    name = "custom_components.ha_voice_label_sync"
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    entry_module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, name, entry_module)
    spec.loader.exec_module(entry_module)
    return entry_module, device_registry, registry


def test_post_install_device_exposes_visit_link_without_buttons(entry_setup_env):
    entry_module, dr, registry = entry_setup_env
    entry = SimpleNamespace(
        entry_id="hvls-instance-1", data={"onboarding_mode": "existing"},
        options={},
    )
    hass = SimpleNamespace(
        data={},
        config=SimpleNamespace(path=Mock()),
        config_entries=SimpleNamespace(async_unload_platforms=AsyncMock()),
    )

    assert asyncio.run(entry_module.async_setup_entry(hass, entry)) is True
    dr.async_get.assert_called_once_with(hass)
    registry.async_get_or_create.assert_called_once_with(
        config_entry_id="hvls-instance-1",
        identifiers={("ha_voice_label_sync", "hvls-instance-1")},
        name="HA Voice Label Sync",
        manufacturer="HA Voice Label Sync",
        model="Google Assistant",
        entry_type="service",
        configuration_url="homeassistant://hvls-preview",
    )
    assert hass.data["ha_voice_label_sync"]["hvls-instance-1"] == {}
    hass.config_entries.async_unload_platforms.assert_not_awaited()

    assert asyncio.run(entry_module.async_unload_entry(hass, entry)) is True
    hass.config_entries.async_unload_platforms.assert_not_awaited()
    assert "hvls-instance-1" not in hass.data["ha_voice_label_sync"]


def test_sidebar_panel_link_matches_visit_url(entry_setup_env):
    entry_module, _, _ = entry_setup_env
    assert entry_module.PANEL_URL_PATH == "hvls-preview"
    assert not Path("custom_components/ha_voice_label_sync/button.py").exists()
