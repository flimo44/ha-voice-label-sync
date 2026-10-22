"""Tests for native Home Assistant registry adaptation."""

import importlib.util
import sys
from enum import Enum
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import Mock

import pytest


class Category(Enum):
    DIAGNOSTIC = "diagnostic"


@pytest.mark.parametrize("legacy_devices", [False, True])
def test_native_registry_snapshot(monkeypatch, legacy_devices):
    hass = object()

    entity = SimpleNamespace(
        entity_id="switch.test_lamp",
        name="Lampe test",
        original_name="Test lamp",
        device_id="device_1",
        area_id=None,
        labels={"google_assistant"},
        disabled_by=None,
        hidden_by=None,
        entity_category=None,
    )

    device = SimpleNamespace(id="device_1", area_id="salon")
    area = SimpleNamespace(id="salon", name="Salon")
    label = SimpleNamespace(
        label_id="google_assistant",
        name="Google Assistant",
    )

    device_entries = {"device_1": device} if legacy_devices else [device]
    device_registry = (
        SimpleNamespace(
            devices=device_entries,
            async_get=Mock(side_effect=lambda key: device_entries.get(key)),
        )
        if legacy_devices
        else SimpleNamespace(devices=device_entries)
    )

    registries = {
        "entity_registry": SimpleNamespace(entities={"switch.test_lamp": entity}),
        "device_registry": device_registry,
        "area_registry": SimpleNamespace(areas={"salon": area}),
        "label_registry": SimpleNamespace(labels={"google_assistant": label}),
    }

    ha = ModuleType("homeassistant")
    ha.__path__ = []
    core = ModuleType("homeassistant.core")
    core.HomeAssistant = object
    helpers = ModuleType("homeassistant.helpers")
    helpers.__path__ = []

    monkeypatch.setitem(sys.modules, "homeassistant", ha)
    monkeypatch.setitem(sys.modules, "homeassistant.core", core)
    monkeypatch.setitem(sys.modules, "homeassistant.helpers", helpers)

    for key, namespace in (
        ("entity_registry", "entity"),
        ("device_registry", "device"),
        ("area_registry", "area"),
        ("label_registry", "label"),
    ):
        module = ModuleType(f"homeassistant.helpers.{key}")
        module.async_get = Mock(return_value=registries[key])
        monkeypatch.setitem(
            sys.modules,
            f"homeassistant.helpers.{key}",
            module,
        )
        setattr(helpers, key, module)

    path = (
        Path(__file__).resolve().parents[1]
        / "custom_components/ha_voice_label_sync/ha_registries.py"
    )
    spec = importlib.util.spec_from_file_location("_test_hvls_ha_registries", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    # Device class absent: do not invent one.
    assert module._device_class(hass, entity) is None

    # Registry-provided class.
    entity.device_class = "opening"
    assert module._device_class(hass, entity) == "opening"

    # The live state takes priority over registry metadata.
    live_hass = SimpleNamespace(
        states=SimpleNamespace(
            get=lambda entity_id: SimpleNamespace(attributes={"device_class": "window"})
        )
    )
    assert module._device_class(live_hass, entity) == "window"

    snapshot = module.get_live_registries(hass)

    selected_entity = snapshot["entity_registry"]["data"]["entities"][0]
    selected_device = snapshot["device_registry"]["data"]["devices"][0]
    selected_area = snapshot["area_registry"]["data"]["areas"][0]

    assert selected_entity["device_class"] == "opening"
    assert selected_entity["entity_id"] == "switch.test_lamp"
    assert selected_entity["labels"] == ["google_assistant"]
    assert selected_entity["entity_category"] is None
    assert selected_device["area_id"] == "salon"
    assert selected_area["name"] == "Salon"
    assert snapshot["label_registry"]["data"]["labels"][0]["label_id"] == (
        "google_assistant"
    )
