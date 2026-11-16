"""Tests for Home Assistant service error handling."""

import asyncio
import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest


@pytest.fixture
def services_module(monkeypatch):
    """Load services.py without importing Home Assistant."""

    def install(name, **attributes):
        module = ModuleType(name)
        for key, value in attributes.items():
            setattr(module, key, value)
        monkeypatch.setitem(sys.modules, name, module)
        return module

    ha = install("homeassistant")
    ha.__path__ = []

    install("homeassistant.config_entries", ConfigEntry=object)
    install(
        "homeassistant.core",
        Context=object,
        HomeAssistant=object,
        ServiceCall=object,
    )

    class HomeAssistantError(Exception):
        pass

    install(
        "homeassistant.exceptions",
        HomeAssistantError=HomeAssistantError,
    )

    package = install("custom_components")
    package.__path__ = []

    integration = install("custom_components.ha_voice_label_sync")
    integration.__path__ = []

    base = Path(__file__).resolve().parents[1]
    component = base / "custom_components/ha_voice_label_sync"

    for name in ("const", "ha_registries", "workflow_lock", "restore_guard"):
        fullname = f"custom_components.ha_voice_label_sync.{name}"

        if name == "ha_registries":
            install(fullname, get_live_registries=Mock())
        elif name == "workflow_lock":
            import asyncio

            install(fullname, get_workflow_lock=lambda hass: asyncio.Lock())
        elif name == "restore_guard":
            install(fullname, assert_not_guarded=Mock())
        else:
            spec = importlib.util.spec_from_file_location(
                fullname,
                component / "const.py",
            )
            module = importlib.util.module_from_spec(spec)
            monkeypatch.setitem(sys.modules, fullname, module)
            spec.loader.exec_module(module)

    fullname = "custom_components.ha_voice_label_sync.services"
    spec = importlib.util.spec_from_file_location(
        fullname,
        component / "services.py",
    )
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, fullname, module)
    spec.loader.exec_module(module)

    return module


def make_hass(tmp_path):
    """Create a minimal HA service environment."""

    async def executor_job(function, *args):
        return function(*args)

    return SimpleNamespace(
        config=SimpleNamespace(
            config_dir=str(tmp_path),
            path=lambda *parts: str(tmp_path.joinpath(*parts)),
        ),
        async_add_executor_job=AsyncMock(side_effect=executor_job),
        services=SimpleNamespace(
            async_call=AsyncMock(),
        ),
    )


def make_entry():
    return SimpleNamespace(
        data={},
        options={},
    )


def test_registry_snapshot_failure(services_module, tmp_path, monkeypatch):
    """Registry errors must become HomeAssistantError."""

    monkeypatch.setattr(
        services_module,
        "get_live_registries",
        Mock(side_effect=AttributeError("invalid registry")),
    )

    hass = make_hass(tmp_path)

    with pytest.raises(
        services_module.HomeAssistantError,
        match="HVLS registry snapshot failed",
    ):
        asyncio.run(
            services_module.async_run_workflow(
                hass,
                make_entry(),
                dry_run=True,
            )
        )

    hass.async_add_executor_job.assert_not_awaited()
    hass.services.async_call.assert_not_awaited()


def test_preview_write_failure(services_module, tmp_path, monkeypatch):
    """Preview file errors must become HomeAssistantError."""

    monkeypatch.setattr(
        services_module,
        "get_live_registries",
        Mock(return_value={}),
    )

    generation = SimpleNamespace(
        content="test preview",
        domain_counts={"switch": 1},
        warnings=[],
    )

    result = SimpleNamespace(
        generation=generation,
        entity_count=1,
    )

    monkeypatch.setattr(
        services_module,
        "run_google_assistant_workflow",
        Mock(return_value=result),
    )

    monkeypatch.setattr(
        services_module,
        "_write_preview_file",
        Mock(side_effect=OSError("disk full")),
    )

    hass = make_hass(tmp_path)

    with pytest.raises(
        services_module.HomeAssistantError,
        match="HVLS preview file write failed",
    ):
        asyncio.run(
            services_module.async_run_workflow(
                hass,
                make_entry(),
                dry_run=True,
            )
        )

    assert hass.async_add_executor_job.await_count == 2
    hass.services.async_call.assert_not_awaited()
    assert not (tmp_path / "google_assistant_entities.yaml").exists()



@pytest.mark.parametrize("existing_file", [False, True])
def test_legacy_direct_generation_refused_before_any_write(
    services_module, tmp_path, monkeypatch, existing_file
):
    """An old button or direct caller must not modify production YAML."""
    output = tmp_path / "google_assistant_entities.yaml"
    if existing_file:
        output.write_bytes(b"light.original:\n  expose: true\n")
    original = output.read_bytes() if existing_file else None

    registry_read = Mock()
    generation = Mock()
    monkeypatch.setattr(services_module, "get_live_registries", registry_read)
    monkeypatch.setattr(services_module, "run_google_assistant_workflow", generation)
    hass = make_hass(tmp_path)

    with pytest.raises(
        services_module.HomeAssistantError,
        match="Direct YAML generation is disabled",
    ):
        asyncio.run(
            services_module.async_run_workflow(
                hass, make_entry(), dry_run=False,
            )
        )

    registry_read.assert_not_called()
    generation.assert_not_called()
    hass.async_add_executor_job.assert_not_awaited()
    hass.services.async_call.assert_not_awaited()
    assert output.read_bytes() == original if existing_file else not output.exists()


def test_registered_legacy_service_fails_explicitly_without_writing(
    services_module, tmp_path, monkeypatch
):
    """Existing automations get a clear refusal, not a silent write."""
    hass = make_hass(tmp_path)
    hass.services.has_service = Mock(return_value=False)
    hass.services.async_register = Mock()
    hass.config_entries = SimpleNamespace(
        async_entries=Mock(return_value=[make_entry()])
    )
    generator = Mock()
    monkeypatch.setattr(services_module, "run_google_assistant_workflow", generator)

    asyncio.run(services_module.async_register_services(hass))
    hass.services.async_register.assert_called_once()
    domain, service_name, handler = hass.services.async_register.call_args.args
    assert (domain, service_name) == ("ha_voice_label_sync", "generate")

    with pytest.raises(
        services_module.HomeAssistantError,
        match="review the Preview",
    ):
        asyncio.run(handler(SimpleNamespace(context=object())))

    generator.assert_not_called()
    hass.config_entries.async_entries.assert_not_called()
    assert not (tmp_path / "google_assistant_entities.yaml").exists()


def test_legacy_button_platform_not_forwarded():
    """Neither old HA button is active after a fresh integration setup."""
    import ast

    code = Path(
        "custom_components/ha_voice_label_sync/__init__.py"
    ).read_text(encoding="utf-8")
    module = ast.parse(code)
    setup_entry = next(
        node for node in module.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "async_setup_entry"
    )
    assert not any(
        isinstance(node, ast.Attribute)
        and node.attr == "async_forward_entry_setups"
        for node in ast.walk(setup_entry)
    )
    assert not Path("custom_components/ha_voice_label_sync/button.py").exists()
