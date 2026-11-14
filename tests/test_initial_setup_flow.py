"""Tests du vrai config flow avec dépendances HA simulées."""

import asyncio
import importlib.util
import sys
import types
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
COMPONENT = ROOT / "custom_components/ha_voice_label_sync"


@pytest.fixture
def environment(monkeypatch):
    """Load the actual config_flow without installing Home Assistant."""

    class FakeConfigFlow:
        def __init_subclass__(cls, **kwargs):
            super().__init_subclass__()

        async def async_set_unique_id(self, value):
            self.unique_id = value

        def _abort_if_unique_id_configured(self):
            pass

        def async_show_form(self, **kwargs):
            return {"type": "form", **kwargs}

        def async_create_entry(self, **kwargs):
            return {"type": "create_entry", **kwargs}

    class FakeSelector:
        def __init__(self, *args, **kwargs):
            pass

        def __call__(self, value):
            return value

    modules = {}

    def module(name, package=False):
        result = types.ModuleType(name)
        if package:
            result.__path__ = []
        modules[name] = result
        return result

    module("homeassistant", True)

    ce = module("homeassistant.config_entries")
    ce.ConfigFlow = FakeConfigFlow
    ce.OptionsFlow = type("OptionsFlow", (), {})
    ce.ConfigEntry = type("ConfigEntry", (), {})

    core = module("homeassistant.core")
    core.callback = lambda fn: fn

    data_flow = module("homeassistant.data_entry_flow")
    data_flow.FlowResult = dict

    module("homeassistant.helpers", True)
    selector = module("homeassistant.helpers.selector")
    selector.NumberSelector = FakeSelector
    selector.NumberSelectorConfig = FakeSelector
    selector.NumberSelectorMode = types.SimpleNamespace(BOX="box")

    package_name = "hvls_initial_flow_test"
    package = module(package_name, True)
    package.__path__ = [str(COMPONENT)]

    labels = []
    label_setup = module(package_name + ".label_setup")

    class LabelUpdateError(Exception):
        pass

    def ensure_label(hass, name):
        labels.append(name)
        if name == "invalid_label":
            raise LabelUpdateError("Simulated failure")

    label_setup.ensure_configured_label = ensure_label
    label_update = module(package_name + ".label_update")
    label_update.LabelUpdateError = LabelUpdateError

    for name, obj in modules.items():
        monkeypatch.setitem(sys.modules, name, obj)

    fullname = package_name + ".config_flow"
    spec = importlib.util.spec_from_file_location(
        fullname, COMPONENT / "config_flow.py"
    )
    assert spec and spec.loader

    loaded = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, fullname, loaded)
    spec.loader.exec_module(loaded)

    return loaded, labels


def make_flow(environment, directory):
    module, labels = environment

    class Config:
        language = "fr"

        def path(self, *parts):
            return str(directory.joinpath(*parts))

    class Hass:
        config = Config()

        async def async_add_executor_job(self, function, *args):
            return function(*args)

    flow = module.HVLSConfigFlow()
    flow.hass = Hass()
    return flow, labels


def values(output, label="google_assistant"):
    return {
        "backend": "google_assistant",
        "label": label,
        "output": str(output),
        "backup_retention": 10,
        "create_backup": True,
    }


def run(flow, data=None):
    return asyncio.run(flow.async_step_user(data))


def test_initial_form_detects_existing_manual_yaml(
    tmp_path, environment
):
    source = tmp_path / "manual.yaml"
    content = b"light.salon:\n  expose: true\n"
    source.write_bytes(content)

    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config: !include manual.yaml\n",
        encoding="utf-8",
    )

    flow, labels = make_flow(environment, tmp_path)
    result = run(flow)

    assert result["type"] == "form"
    assert result["step_id"] == "user"
    diagnostic = result["description_placeholders"]["diagnostic"]
    assert "manual.yaml" in diagnostic
    assert "Aucune adoption automatique" in diagnostic
    assert source.read_bytes() == content
    assert labels == []


def test_existing_google_source_can_be_selected_without_any_file_write(
    tmp_path, environment
):
    source = tmp_path / "manual.yaml"
    original = b"switch.pump:\n  expose: true\n  name: Manual\n"
    source.write_bytes(original)
    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config: !include manual.yaml\n",
        encoding="utf-8",
    )

    flow, labels = make_flow(environment, tmp_path)
    result = run(flow, values(source))

    assert result["type"] == "create_entry"
    assert result["data"]["output"] == str(source)
    assert source.read_bytes() == original
    assert labels == ["google_assistant"]
    assert not (tmp_path / ".hvls").exists()
    assert not (tmp_path / ".hvls_backups").exists()


def test_existing_unreferenced_output_can_be_configured_but_not_modified(
    tmp_path, environment
):
    (tmp_path / "configuration.yaml").write_text(
        "default_config:\n", encoding="utf-8"
    )
    output = tmp_path / "google_assistant_entities.yaml"
    original = b"do not overwrite\n"
    output.write_bytes(original)

    flow, labels = make_flow(environment, tmp_path)
    result = run(flow, values(output))

    assert result["type"] == "create_entry"
    assert result["data"]["output"] == str(output)
    assert output.read_bytes() == original
    assert labels == ["google_assistant"]
    assert not (tmp_path / ".hvls").exists()
    assert not (tmp_path / ".hvls_backups").exists()


def test_changing_to_safe_output_allows_configuration(
    tmp_path, environment
):
    source = tmp_path / "manual.yaml"
    source.write_bytes(b"manual\n")

    (tmp_path / "configuration.yaml").write_text(
        "google_assistant:\n"
        "  entity_config: !include manual.yaml\n",
        encoding="utf-8",
    )

    flow, labels = make_flow(environment, tmp_path)

    first = run(flow, values(source))
    assert first["type"] == "create_entry"
    assert first["data"]["output"] == str(source)
    assert source.read_bytes() == b"manual\n"

    output = tmp_path / "generated.yaml"
    second = run(flow, values(output))

    assert second["type"] == "create_entry"
    assert second["data"]["output"] == str(output)
    assert labels == ["google_assistant", "google_assistant"]
    assert source.read_bytes() == b"manual\n"
    assert not output.exists()


def test_label_failure_keeps_diagnostic(
    tmp_path, environment
):
    (tmp_path / "configuration.yaml").write_text(
        "default_config:\n", encoding="utf-8"
    )

    flow, labels = make_flow(environment, tmp_path)

    result = run(
        flow,
        values(tmp_path / "generated.yaml", "invalid_label"),
    )

    assert result["type"] == "form"
    assert result["errors"]["base"] == "label_setup_failed"
    assert "diagnostic" in result["description_placeholders"]


def test_initial_form_translations_are_complete():
    import json

    for filename in (
        "strings.json",
        "translations/en.json",
        "translations/fr.json",
    ):
        path = COMPONENT / filename
        data = json.loads(path.read_text(encoding="utf-8"))

        assert "{diagnostic}" in data["config"]["step"]["user"]["description"]

        for error in (
            "source_output_conflict",
            "existing_output_not_owned",
            "unsafe_output_path",
        ):
            assert error in data["config"]["error"]
