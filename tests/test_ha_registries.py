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


def _load_with_registries(monkeypatch, registries):
    """Load ha_registries.py against stubbed native HA registries."""
    ha = ModuleType("homeassistant")
    ha.__path__ = []
    core = ModuleType("homeassistant.core")
    core.HomeAssistant = object
    helpers = ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    monkeypatch.setitem(sys.modules, "homeassistant", ha)
    monkeypatch.setitem(sys.modules, "homeassistant.core", core)
    monkeypatch.setitem(sys.modules, "homeassistant.helpers", helpers)
    for key in registries:
        module = ModuleType(f"homeassistant.helpers.{key}")
        module.async_get = Mock(return_value=registries[key])
        monkeypatch.setitem(sys.modules, f"homeassistant.helpers.{key}", module)
        setattr(helpers, key, module)
    path = (
        Path(__file__).resolve().parents[1]
        / "custom_components/ha_voice_label_sync/ha_registries.py"
    )
    spec = importlib.util.spec_from_file_location("_test_hvls_names", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _entity(entity_id, **overrides):
    values = {
        "entity_id": entity_id,
        "name": None,
        "original_name": None,
        "has_entity_name": False,
        "device_id": None,
        "area_id": None,
        "labels": set(),
        "disabled_by": None,
        "hidden_by": None,
        "entity_category": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def _names(monkeypatch, entities, hass=None, devices=()):
    registries = {
        "entity_registry": SimpleNamespace(
            entities={item.entity_id: item for item in entities}
        ),
        "device_registry": SimpleNamespace(devices=list(devices)),
        "area_registry": SimpleNamespace(areas={}),
        "label_registry": SimpleNamespace(labels={}),
    }
    module = _load_with_registries(monkeypatch, registries)
    snapshot = module.get_live_registries(hass or object())
    return {
        item["entity_id"]: item["name"]
        for item in snapshot["entity_registry"]["data"]["entities"]
    }


def test_has_entity_name_is_prefixed_with_device_name(monkeypatch):
    device = SimpleNamespace(
        id="dev", area_id=None, name="Capteur salon", name_by_user=None,
    )
    renamed = SimpleNamespace(
        id="dev2", area_id=None, name="Sonoff", name_by_user="Prise bureau",
    )
    names = _names(
        monkeypatch,
        [
            _entity("sensor.t", original_name="Température",
                    has_entity_name=True, device_id="dev"),
            _entity("sensor.h", original_name="Humidité",
                    has_entity_name=True, device_id="dev"),
            # Main feature of the device: no entity part.
            _entity("switch.p", has_entity_name=True, device_id="dev2"),
        ],
        devices=[device, renamed],
    )
    assert names == {
        "sensor.t": "Capteur salon Température",
        "sensor.h": "Capteur salon Humidité",
        "switch.p": "Prise bureau",
    }


def test_user_name_and_legacy_entities_are_unchanged(monkeypatch):
    device = SimpleNamespace(id="dev", area_id=None, name="Hub", name_by_user=None)
    names = _names(
        monkeypatch,
        [
            # A registry name override replaces the whole friendly name.
            _entity("light.a", name="  Plafonnier ", original_name="Light",
                    has_entity_name=True, device_id="dev"),
            _entity("light.b", original_name="Lampe legacy", device_id="dev"),
            _entity("light.c"),
        ],
        devices=[device],
    )
    assert names == {
        "light.a": "Plafonnier",
        "light.b": "Lampe legacy",
        "light.c": None,  # The engine then falls back to the object ID.
    }


def test_live_friendly_name_takes_priority(monkeypatch):
    states = {
        "sensor.t": SimpleNamespace(attributes={"friendly_name": "Salon T°"}),
        "sensor.u": SimpleNamespace(attributes={"friendly_name": "   "}),
    }
    hass = SimpleNamespace(states=SimpleNamespace(get=states.get))
    names = _names(
        monkeypatch,
        [
            _entity("sensor.t", original_name="Température",
                    has_entity_name=True),
            _entity("sensor.u", original_name="Humidité"),
        ],
        hass=hass,
    )
    assert names == {"sensor.t": "Salon T°", "sensor.u": "Humidité"}
