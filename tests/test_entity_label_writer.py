"""Tests for HVLS native entity label updates."""

import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import Mock

import pytest

ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / "custom_components/ha_voice_label_sync"


@pytest.fixture
def writer(monkeypatch):
    prefix = "_test_hvls_writer"

    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)

    ha = ModuleType("homeassistant")
    ha.__path__ = []

    core = ModuleType("homeassistant.core")
    core.HomeAssistant = object

    helpers = ModuleType("homeassistant.helpers")
    helpers.__path__ = []

    entity_module = ModuleType("homeassistant.helpers.entity_registry")
    label_module = ModuleType("homeassistant.helpers.label_registry")

    monkeypatch.setitem(sys.modules, "homeassistant", ha)
    monkeypatch.setitem(sys.modules, "homeassistant.core", core)
    monkeypatch.setitem(sys.modules, "homeassistant.helpers", helpers)
    monkeypatch.setitem(
        sys.modules, "homeassistant.helpers.entity_registry", entity_module
    )
    monkeypatch.setitem(
        sys.modules, "homeassistant.helpers.label_registry", label_module
    )

    helpers.entity_registry = entity_module
    helpers.label_registry = label_module

    # Load the real helper without executing HA integration __init__.py.
    helper_name = f"{prefix}.label_update"
    helper_spec = importlib.util.spec_from_file_location(
        helper_name, COMPONENT / "label_update.py"
    )
    helper = importlib.util.module_from_spec(helper_spec)
    monkeypatch.setitem(sys.modules, helper_name, helper)
    helper_spec.loader.exec_module(helper)

    writer_name = f"{prefix}.entity_label_writer"
    writer_spec = importlib.util.spec_from_file_location(
        writer_name, COMPONENT / "entity_label_writer.py"
    )
    module = importlib.util.module_from_spec(writer_spec)
    monkeypatch.setitem(sys.modules, writer_name, module)
    writer_spec.loader.exec_module(module)

    entry = SimpleNamespace(labels={"salon"})
    entities = {"switch.lampe": entry}

    def update(entity_id, labels):
        entities[entity_id].labels = set(labels)

    registry = SimpleNamespace(
        async_get=Mock(side_effect=lambda entity_id: entities.get(entity_id)),
        async_update_entity=Mock(side_effect=update),
    )

    label_registry = SimpleNamespace(
        labels={
            "google_assistant": SimpleNamespace(
                label_id="google_assistant",
                name="Google Assistant",
            )
        }
    )

    entity_module.async_get = Mock(return_value=registry)
    label_module.async_get = Mock(return_value=label_registry)

    return SimpleNamespace(
        module=module,
        registry=registry,
        labels=label_registry,
        entities=entities,
        hass=object(),
    )


def call_update(writer, enabled, expected, entity_id="switch.lampe"):
    return writer.module.update_entity_label(
        writer.hass,
        entity_id,
        "Google Assistant",
        enabled,
        expected,
    )


def test_add_label(writer):
    result = call_update(writer, True, False)

    assert result["changed"] is True
    assert result["has_label"] is True
    assert result["labels"] == ["google_assistant", "salon"]
    writer.registry.async_update_entity.assert_called_once()


def test_remove_label(writer):
    writer.entities["switch.lampe"].labels.add("google_assistant")

    result = call_update(writer, False, True)

    assert result["changed"] is True
    assert result["has_label"] is False
    assert result["labels"] == ["salon"]


def test_noop_does_not_write(writer):
    result = call_update(writer, False, False)

    assert result["changed"] is False
    writer.registry.async_update_entity.assert_not_called()


def test_stale_state_refused(writer):
    with pytest.raises(writer.module.LabelUpdateError):
        call_update(writer, False, True)

    writer.registry.async_update_entity.assert_not_called()


def test_unknown_entity_refused(writer):
    with pytest.raises(writer.module.LabelUpdateError):
        call_update(writer, True, False, "switch.inconnu")

    writer.registry.async_update_entity.assert_not_called()


def test_missing_label_refused(writer):
    writer.labels.labels.clear()

    with pytest.raises(writer.module.LabelUpdateError):
        call_update(writer, True, False)

    writer.registry.async_update_entity.assert_not_called()


def test_unconfirmed_write_refused(writer):
    # Simulate an update API that returns without changing the entry.
    writer.registry.async_update_entity.side_effect = None

    with pytest.raises(writer.module.LabelUpdateError):
        call_update(writer, True, False)
