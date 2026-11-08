"""Tests for the HVLS Preview WebSocket endpoint."""

import asyncio
import importlib.util
import sys
from datetime import UTC
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import Mock

import pytest


@pytest.fixture
def websocket_module(monkeypatch):
    prefix = "_test_hvls_ws"
    package = ModuleType(prefix)
    package.__path__ = []
    monkeypatch.setitem(sys.modules, prefix, package)

    ha = ModuleType("homeassistant")
    ha.__path__ = []
    core = ModuleType("homeassistant.core")
    core.HomeAssistant = object

    components = ModuleType("homeassistant.components")
    components.__path__ = []

    websocket_api = ModuleType("homeassistant.components.websocket_api")
    websocket_api.ActiveConnection = object

    def passthrough(*args, **kwargs):
        def decorator(func):
            return func

        return decorator

    websocket_api.require_admin = lambda func: func
    websocket_api.async_response = lambda func: func
    websocket_api.websocket_command = passthrough
    websocket_api.async_register_command = Mock()

    voluptuous = ModuleType("voluptuous")
    voluptuous.Required = lambda value: value
    voluptuous.Any = lambda *validators: validators
    voluptuous.Any = lambda *validators: validators

    monkeypatch.setitem(sys.modules, "homeassistant", ha)
    monkeypatch.setitem(sys.modules, "homeassistant.core", core)
    monkeypatch.setitem(sys.modules, "homeassistant.components", components)
    monkeypatch.setitem(
        sys.modules, "homeassistant.components.websocket_api", websocket_api
    )
    monkeypatch.setitem(sys.modules, "voluptuous", voluptuous)

    components.websocket_api = websocket_api

    # Load the actual HVLS constants to prevent stale test mocks.
    const_name = f"{prefix}.const"
    const_path = (
        Path(__file__).resolve().parents[1]
        / "custom_components/ha_voice_label_sync/const.py"
    )
    const_spec = importlib.util.spec_from_file_location(const_name, const_path)
    const = importlib.util.module_from_spec(const_spec)
    monkeypatch.setitem(sys.modules, const_name, const)
    const_spec.loader.exec_module(const)

    compare = ModuleType(f"{prefix}.preview_compare")
    compare.PreviewFormatError = type("PreviewFormatError", (Exception,), {})
    compare.analyze_preview = Mock()

    exclusions = ModuleType(f"{prefix}.preview_exclusions")
    exclusions.analyze_exclusions = Mock(
        return_value=[
            {
                "entity_id": "binary_sensor.fenetre",
                "name": "Fenêtre séjour",
                "reason": "domain_not_enabled",
                "detail": "Domain 'binary_sensor' is not enabled",
            }
        ]
    )

    registries = ModuleType(f"{prefix}.ha_registries")
    registries.get_live_registries = Mock(
        return_value={"entity_registry": {"data": {"entities": []}}}
    )

    catalog = ModuleType(f"{prefix}.entity_catalog")
    catalog.build_entity_catalog = Mock(
        return_value={
            "label": "google_assistant",
            "total": 1,
            "labeled": 1,
            "entities": [
                {
                    "entity_id": "switch.pompe",
                    "has_label": True,
                    "eligible": True,
                    "exclusion_reason": None,
                }
            ],
        }
    )
    monkeypatch.setitem(
        sys.modules, f"{prefix}.entity_catalog", catalog
    )

    writer = ModuleType(f"{prefix}.entity_label_writer")
    writer.update_entity_label = Mock(
        return_value={
            "entity_id": "switch.pompe",
            "has_label": True,
            "label_id": "google_assistant",
            "labels": ["google_assistant", "salon"],
            "changed": True,
        }
    )
    monkeypatch.setitem(
        sys.modules, f"{prefix}.entity_label_writer", writer
    )

    # Import the actual eligibility guard rather than a permissive mock.
    label_name = f"{prefix}.label_update"
    label_path = const_path.with_name("label_update.py")
    label_spec = importlib.util.spec_from_file_location(label_name, label_path)
    label_update = importlib.util.module_from_spec(label_spec)
    monkeypatch.setitem(sys.modules, label_name, label_update)
    label_spec.loader.exec_module(label_update)

    services = ModuleType(f"{prefix}.services")
    services.DEFAULT_DOMAINS = frozenset({"switch"})
    services.async_run_workflow = Mock()

    for name, module in (
        ("const", const),
        ("preview_compare", compare),
        ("preview_exclusions", exclusions),
        ("ha_registries", registries),
        ("services", services),
    ):
        monkeypatch.setitem(sys.modules, f"{prefix}.{name}", module)

    path = (
        Path(__file__).resolve().parents[1]
        / "custom_components/ha_voice_label_sync/websocket.py"
    )

    spec = importlib.util.spec_from_file_location(f"{prefix}.websocket", path)
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, spec.name, module)
    # Load the real Preview guard in the isolated test package.
    guard_name = f"{prefix}.preview_guard"
    guard_path = path.with_name("preview_guard.py")
    guard_spec = importlib.util.spec_from_file_location(guard_name, guard_path)
    guard_module = importlib.util.module_from_spec(guard_spec)
    monkeypatch.setitem(sys.modules, guard_name, guard_module)
    guard_spec.loader.exec_module(guard_module)

    # Mock the new beta.4 backup module in the existing isolated WebSocket tests.
    # Dedicated backup_restore tests exercise the real filesystem implementation.
    backup_module = ModuleType(f"{prefix}.backup_restore")
    backup_module.BackupRestoreError = type("BackupRestoreError", (ValueError,), {})
    backup_module.list_backups = Mock(return_value={"backups": []})
    backup_module.review_backup = Mock()
    backup_module.restore_reviewed_backup = Mock()
    monkeypatch.setitem(sys.modules, f"{prefix}.backup_restore", backup_module)

    # Mock dependencies of the apply_preview WebSocket command.
    apply_module = ModuleType(f"{prefix}.preview_apply")
    apply_module.apply_reviewed_preview = Mock()
    monkeypatch.setitem(sys.modules, f"{prefix}.preview_apply", apply_module)

    lock_module = ModuleType(f"{prefix}.workflow_lock")
    lock_module.get_workflow_lock = lambda hass: asyncio.Lock()
    monkeypatch.setitem(sys.modules, f"{prefix}.workflow_lock", lock_module)

    spec.loader.exec_module(module)

    module._read_and_compare_real = module._read_and_compare
    module._read_and_compare = Mock(
        return_value={
            "available": True,
            "content": "switch.pompe:\n  expose: true\n",
            "summary": {"total": 1},
        }
    )

    return SimpleNamespace(
        websocket=module,
        registries=registries,
        exclusions=exclusions,
    )


def make_hass():
    async def executor_job(func, *args):
        return func(*args)

    return SimpleNamespace(
        config=SimpleNamespace(
            path=lambda *args: "/config/" + "/".join(args),
            config_dir="/config",
        ),
        config_entries=SimpleNamespace(
            async_entries=lambda domain: [
                SimpleNamespace(
                    data={"label": "google_assistant"},
                    options={},
                )
            ]
        ),
        async_add_executor_job=executor_job,
    )


def test_websocket_returns_exclusions(websocket_module):
    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    asyncio.run(
        websocket_module.websocket.websocket_get_preview(
            make_hass(), connection, {"id": 7}
        )
    )

    connection.send_error.assert_not_called()
    connection.send_result.assert_called_once()

    msg_id, result = connection.send_result.call_args.args
    assert msg_id == 7
    assert result["exclusions"]["count"] == 1
    assert result["exclusions"]["entities"][0]["entity_id"] == ("binary_sensor.fenetre")

    websocket_module.exclusions.analyze_exclusions.assert_called_once()


def test_websocket_registry_error(websocket_module):
    websocket_module.registries.get_live_registries.side_effect = ValueError(
        "registry unavailable"
    )

    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    asyncio.run(
        websocket_module.websocket.websocket_get_preview(
            make_hass(), connection, {"id": 8}
        )
    )

    connection.send_result.assert_not_called()
    connection.send_error.assert_called_once()

    assert connection.send_error.call_args.args[1] == "registry_error"


def test_websocket_exclusion_error(websocket_module):
    websocket_module.exclusions.analyze_exclusions.side_effect = ValueError(
        "invalid labels"
    )

    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    asyncio.run(
        websocket_module.websocket.websocket_get_preview(
            make_hass(), connection, {"id": 9}
        )
    )

    connection.send_result.assert_not_called()
    connection.send_error.assert_called_once()

    assert connection.send_error.call_args.args[1] == "exclusion_error"


def test_apply_websocket_not_configured(websocket_module):
    hass = make_hass()
    hass.config_entries.async_entries = lambda domain: []
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())

    asyncio.run(
        websocket_module.websocket.websocket_apply_preview(
            hass,
            connection,
            {
                "id": 21,
                "preview_sha256": "a" * 64,
                "production_sha256": None,
            },
        )
    )

    connection.send_result.assert_not_called()
    connection.send_error.assert_called_once()
    assert connection.send_error.call_args.args[1] == "not_configured"


def test_apply_websocket_success(websocket_module, tmp_path):
    from datetime import datetime

    from hvls.models import FileWriteResult

    output = tmp_path / "production.yaml"
    backup = tmp_path / ".hvls_backups" / "production.yaml.bak"

    websocket_module.websocket.apply_reviewed_preview.return_value = FileWriteResult(
        output_path=output,
        backup_path=backup,
        bytes_written=42,
        written_at=datetime.now(UTC),
    )

    hass = make_hass()
    hass.config.config_dir = str(tmp_path)
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())

    asyncio.run(
        websocket_module.websocket.websocket_apply_preview(
            hass,
            connection,
            {
                "id": 22,
                "preview_sha256": "a" * 64,
                "production_sha256": "b" * 64,
            },
        )
    )

    connection.send_error.assert_not_called()
    connection.send_result.assert_called_once()

    msg_id, result = connection.send_result.call_args.args
    assert msg_id == 22
    assert result["applied"] is True
    assert result["bytes_written"] == 42
    assert result["backup_path"] == str(backup)

    apply_call = websocket_module.websocket.apply_reviewed_preview.call_args
    assert apply_call.args[3] == "a" * 64
    assert apply_call.kwargs["expected_production_digest"] == "b" * 64


def test_apply_websocket_rejects_changed_preview(websocket_module):
    PreviewChangedError = websocket_module.websocket.PreviewChangedError

    websocket_module.websocket.apply_reviewed_preview.side_effect = PreviewChangedError(
        "Preview has changed."
    )

    hass = make_hass()
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())

    asyncio.run(
        websocket_module.websocket.websocket_apply_preview(
            hass,
            connection,
            {
                "id": 23,
                "preview_sha256": "a" * 64,
                "production_sha256": None,
            },
        )
    )

    connection.send_result.assert_not_called()
    connection.send_error.assert_called_once()
    assert connection.send_error.call_args.args[1] == "apply_failed"


def test_apply_websocket_rejects_changed_production(websocket_module):
    PreviewChangedError = websocket_module.websocket.PreviewChangedError

    websocket_module.websocket.apply_reviewed_preview.side_effect = PreviewChangedError(
        "Production has changed."
    )

    hass = make_hass()
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())

    asyncio.run(
        websocket_module.websocket.websocket_apply_preview(
            hass,
            connection,
            {
                "id": 24,
                "preview_sha256": "a" * 64,
                "production_sha256": "b" * 64,
            },
        )
    )

    connection.send_result.assert_not_called()
    connection.send_error.assert_called_once()
    assert connection.send_error.call_args.args[1] == "apply_failed"


def test_get_entities_returns_catalog(websocket_module):
    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    asyncio.run(
        websocket_module.websocket.websocket_get_entities(
            make_hass(), connection, {"id": 101}
        )
    )

    connection.send_error.assert_not_called()
    connection.send_result.assert_called_once()

    msg_id, result = connection.send_result.call_args.args
    assert msg_id == 101
    assert result["total"] == 1
    assert result["labeled"] == 1
    assert result["entities"][0]["entity_id"] == "switch.pompe"


def test_get_entities_registry_error(websocket_module):
    websocket_module.registries.get_live_registries.side_effect = (
        ValueError("registry unavailable")
    )
    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    asyncio.run(
        websocket_module.websocket.websocket_get_entities(
            make_hass(), connection, {"id": 102}
        )
    )

    connection.send_result.assert_not_called()
    connection.send_error.assert_called_once()
    assert connection.send_error.call_args.args[1] == "registry_error"


def test_get_entities_without_configuration(websocket_module):
    hass = make_hass()
    hass.config_entries.async_entries = lambda domain: []

    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    asyncio.run(
        websocket_module.websocket.websocket_get_entities(
            hass, connection, {"id": 103}
        )
    )

    connection.send_result.assert_not_called()
    connection.send_error.assert_called_once()
    assert connection.send_error.call_args.args[1] == "not_configured"


def test_set_entity_label_success(websocket_module):
    ws = websocket_module.websocket
    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    asyncio.run(
        ws.websocket_set_entity_label(
            make_hass(),
            connection,
            {
                "id": 201,
                "entity_id": "switch.pompe",
                "enabled": True,
                "expected_enabled": False,
            },
        )
    )

    connection.send_error.assert_not_called()
    connection.send_result.assert_called_once()

    msg_id, result = connection.send_result.call_args.args
    assert msg_id == 201
    assert result["has_label"] is True
    assert result["changed"] is True


def test_set_entity_label_refused(websocket_module):
    ws = websocket_module.websocket
    ws.update_entity_label.side_effect = (
        ws.LabelUpdateError("HVLS label changed")
    )

    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    asyncio.run(
        ws.websocket_set_entity_label(
            make_hass(),
            connection,
            {
                "id": 202,
                "entity_id": "switch.pompe",
                "enabled": False,
                "expected_enabled": True,
            },
        )
    )

    connection.send_result.assert_not_called()
    assert connection.send_error.call_args.args[1] == "label_update_refused"


def test_set_entity_label_not_configured(websocket_module):
    ws = websocket_module.websocket
    hass = make_hass()
    hass.config_entries.async_entries = lambda domain: []

    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    asyncio.run(
        ws.websocket_set_entity_label(
            hass,
            connection,
            {
                "id": 203,
                "entity_id": "switch.pompe",
                "enabled": True,
                "expected_enabled": False,
            },
        )
    )

    connection.send_result.assert_not_called()
    assert connection.send_error.call_args.args[1] == "not_configured"


@pytest.mark.parametrize("reason", [
    "domain_not_enabled",
    "unsupported_device_class",
    "disabled",
    "hidden",
    "entity_category",
])
def test_set_entity_label_websocket_refuses_ineligible_add(websocket_module, reason):
    ws = websocket_module.websocket
    ws.build_entity_catalog.return_value = {
        "entities": [{
            "entity_id": "switch.pompe",
            "eligible": False,
            "exclusion_reason": reason,
        }]
    }
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_set_entity_label(
        make_hass(), connection, {
            "id": 301, "entity_id": "switch.pompe",
            "enabled": True, "expected_enabled": False,
        }
    ))
    connection.send_result.assert_not_called()
    assert connection.send_error.call_args.args[1] == "label_update_refused"
    ws.update_entity_label.assert_not_called()


def test_set_entity_label_websocket_allows_ineligible_removal(websocket_module):
    ws = websocket_module.websocket
    ws.build_entity_catalog.return_value = {
        "entities": [{
            "entity_id": "switch.pompe",
            "eligible": False,
            "exclusion_reason": "disabled",
        }]
    }
    ws.update_entity_label.return_value = {
        "entity_id": "switch.pompe", "has_label": False, "changed": True,
    }
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_set_entity_label(
        make_hass(), connection, {
            "id": 302, "entity_id": "switch.pompe",
            "enabled": False, "expected_enabled": True,
        }
    ))
    connection.send_error.assert_not_called()
    assert connection.send_result.call_args.args[1]["has_label"] is False
    ws.update_entity_label.assert_called_once()
    ws.build_entity_catalog.assert_not_called()


def test_set_entity_label_websocket_refuses_missing_entity(websocket_module):
    ws = websocket_module.websocket
    ws.build_entity_catalog.return_value = {"entities": []}
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_set_entity_label(
        make_hass(), connection, {
            "id": 303, "entity_id": "switch.unknown",
            "enabled": True, "expected_enabled": False,
        }
    ))
    connection.send_result.assert_not_called()
    assert connection.send_error.call_args.args[1] == "label_update_refused"
    ws.update_entity_label.assert_not_called()
