"""Regression tests for automatic first-run HA label provisioning."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import Mock

import pytest

ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / "custom_components/ha_voice_label_sync"


@pytest.fixture
def label_setup(monkeypatch):
    prefix = "_test_hvls_label_setup"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)

    ha = ModuleType("homeassistant")
    ha.__path__ = []
    core = ModuleType("homeassistant.core")
    core.HomeAssistant = object
    helpers = ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    lr = ModuleType("homeassistant.helpers.label_registry")

    monkeypatch.setitem(sys.modules, "homeassistant", ha)
    monkeypatch.setitem(sys.modules, "homeassistant.core", core)
    monkeypatch.setitem(sys.modules, "homeassistant.helpers", helpers)
    monkeypatch.setitem(sys.modules, "homeassistant.helpers.label_registry", lr)
    helpers.label_registry = lr

    # Use actual resolver via the installed HVLS core.
    name = f"{prefix}.label_update"
    spec = importlib.util.spec_from_file_location(
        name, COMPONENT / "label_update.py"
    )
    helper = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, name, helper)
    spec.loader.exec_module(helper)

    name = f"{prefix}.label_setup"
    spec = importlib.util.spec_from_file_location(
        name, COMPONENT / "label_setup.py"
    )
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, name, module)
    spec.loader.exec_module(module)

    registry = SimpleNamespace(labels={})

    def create(name):
        label_id = name.strip().lower().replace(" ", "_")
        entry = SimpleNamespace(label_id=label_id, name=name)
        registry.labels[label_id] = entry
        return entry

    registry.async_create = Mock(side_effect=create)
    lr.async_get = Mock(return_value=registry)
    return SimpleNamespace(module=module, registry=registry)


def test_first_install_creates_default_label(label_setup):
    assert (
        label_setup.module.ensure_configured_label(object(), "google_assistant")
        == "google_assistant"
    )
    label_setup.registry.async_create.assert_called_once_with(
        name="google_assistant"
    )


def test_existing_label_is_reused(label_setup):
    label_setup.registry.labels["google_assistant"] = SimpleNamespace(
        label_id="google_assistant", name="Google Assistant"
    )
    assert (
        label_setup.module.ensure_configured_label(object(), "google_assistant")
        == "google_assistant"
    )
    label_setup.registry.async_create.assert_not_called()


def test_custom_label_created_once(label_setup):
    label_setup.module.ensure_configured_label(object(), "My Voice Label")
    label_setup.module.ensure_configured_label(object(), "My Voice Label")
    label_setup.registry.async_create.assert_called_once()


def test_ambiguous_label_rejected_without_creation(label_setup):
    label_setup.registry.labels = {
        "google_assistant": SimpleNamespace(
            label_id="google_assistant", name="Google Assistant"
        ),
        "another": SimpleNamespace(
            label_id="another", name="Google-Assistant"
        ),
    }
    with pytest.raises(label_setup.module.LabelUpdateError, match="Ambiguous"):
        label_setup.module.ensure_configured_label(object(), "Google Assistant")
    label_setup.registry.async_create.assert_not_called()


@pytest.mark.parametrize("bad_label", ["", "  ", None])
def test_empty_label_rejected(label_setup, bad_label):
    with pytest.raises(label_setup.module.LabelUpdateError):
        label_setup.module.ensure_configured_label(object(), bad_label)
    label_setup.registry.async_create.assert_not_called()


def test_create_fails_without_success(label_setup):
    label_setup.registry.async_create.side_effect = RuntimeError("Disk full")
    with pytest.raises(RuntimeError, match="Disk full"):
        label_setup.module.ensure_configured_label(object(), "google_assistant")


def test_registry_did_not_persist_creation(label_setup):
    label_setup.registry.async_create.side_effect = lambda name: SimpleNamespace(
        label_id="google_assistant", name=name
    )
    with pytest.raises(label_setup.module.LabelUpdateError, match="does not exist"):
        label_setup.module.ensure_configured_label(object(), "google_assistant")
