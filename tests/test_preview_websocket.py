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
    voluptuous.Optional = lambda value, default=None: value
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
    backup_module.preview_backup_cleanup = Mock()
    backup_module.apply_backup_cleanup = Mock()
    backup_module.review_backup = Mock()
    backup_module.prepare_backup_preview = Mock()
    backup_module.prepare_manual_label_preview = Mock()
    backup_module.complete_preview_restoration = Mock()
    backup_module.restore_reviewed_backup = Mock()
    backup_module.resolve_restored_output = Mock()
    monkeypatch.setitem(sys.modules, f"{prefix}.backup_restore", backup_module)

    restore_guard_module = ModuleType(f"{prefix}.restore_guard")
    restore_guard_module.assert_not_guarded = Mock()
    restore_guard_module.create_guard = Mock()
    restore_guard_module.read_guard = Mock(return_value=None)
    monkeypatch.setitem(
        sys.modules, f"{prefix}.restore_guard", restore_guard_module
    )

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
                    entry_id="test-installation",
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
    assert apply_call.kwargs["entry_id"] == "test-installation"
    assert apply_call.kwargs["ownership_registry_path"] == Path(
        "/config/.hvls/ownership.json"
    )


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


def _setup_reviewed_restore(websocket_module, *, remove_ids=()):
    """Fixture for a reproducible, previously reviewed restore proposal."""
    ws = websocket_module.websocket
    ws.prepare_backup_preview.reset_mock()
    ws.restore_reviewed_backup.reset_mock()
    ws.complete_preview_restoration.reset_mock()
    ws.update_entity_label.reset_mock()
    ws.restore_reviewed_backup.return_value = {
        "restored": True, "safety_backup": "safety.bak",
    }
    ws.complete_preview_restoration.return_value = {"reconciled": True}
    ws.prepare_backup_preview.return_value = {
        "label_plan_sha256": "c" * 64,
        "projection": {"ready": True},
        "label_plan": {
            "add": [],
            "remove": list(remove_ids),
            "review": [], "current_label_count": len(remove_ids),
        },
        "content": "switch.kept:\\n  expose: true\\n",
        "preview_sha256": "f" * 64,
        "comparison": {"status": "ok", "identical_entities": False,
                       "identical_text": False},
        "summary": {"total": 40},
    }
    ws.build_entity_catalog = Mock(return_value={
        "entities": [
            {"entity_id": item, "has_label": True, "eligible": True}
            for item in remove_ids
        ],
    })
    ws.run_google_assistant_workflow = Mock(return_value=SimpleNamespace(
        generation=SimpleNamespace(
            content="switch.kept:\\n  expose: true\\n",
        ),
    ))
    ws.analyze_preview = Mock(return_value={"comparison": {
        "status": "ok", "identical_entities": True,
    }})
    return ws


def test_reviewed_restore_applies_yaml_then_labels_and_verifies(
    websocket_module,
):
    ws = _setup_reviewed_restore(
        websocket_module, remove_ids=("switch.b", "switch.c"),
    )
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_apply_backup_preview(
        make_hass(), connection, {
            "id": 801, "backup_id": "backup.bak",
            "backup_sha256": "a" * 64,
            "production_sha256": "b" * 64,
            "label_plan_sha256": "c" * 64,
        },
    ))
    connection.send_error.assert_not_called()
    result = connection.send_result.call_args.args[1]
    assert result["applied"] is True
    assert result["reconciled"] is True
    assert result["yaml_entities"] == 40
    assert result["label_removals"] == 2
    assert ws.restore_reviewed_backup.call_count == 1
    assert ws.update_entity_label.call_count == 2
    assert all(
        call.args[3:] == (False, True)
        for call in ws.update_entity_label.call_args_list
    )
    assert ws.complete_preview_restoration.call_count == 1


def test_changed_restore_label_plan_refuses_all_writes(websocket_module):
    ws = _setup_reviewed_restore(websocket_module)
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_apply_backup_preview(
        make_hass(), connection, {
            "id": 802, "backup_id": "backup.bak",
            "backup_sha256": "a" * 64,
            "production_sha256": "b" * 64,
            "label_plan_sha256": "d" * 64,
        },
    ))
    connection.send_result.assert_not_called()
    assert connection.send_error.call_args.args[1] == (
        "backup_preview_apply_refused"
    )
    ws.restore_reviewed_backup.assert_not_called()
    ws.update_entity_label.assert_not_called()
    ws.complete_preview_restoration.assert_not_called()


def test_partial_restore_never_claims_success_or_clears_guard(websocket_module):
    ws = _setup_reviewed_restore(
        websocket_module, remove_ids=("switch.b",),
    )
    ws.update_entity_label.side_effect = ws.LabelUpdateError("HA rejected label")
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_apply_backup_preview(
        make_hass(), connection, {
            "id": 803, "backup_id": "backup.bak",
            "backup_sha256": "a" * 64,
            "production_sha256": "b" * 64,
            "label_plan_sha256": "c" * 64,
        },
    ))
    connection.send_result.assert_not_called()
    assert connection.send_error.call_args.args[1] == (
        "restoration_requires_reconciliation"
    )
    ws.restore_reviewed_backup.assert_called_once()
    ws.complete_preview_restoration.assert_not_called()


def test_writer_failure_after_guard_creation_reports_recovery(
    websocket_module,
):
    ws = _setup_reviewed_restore(websocket_module)
    ws.restore_reviewed_backup.side_effect = ws.FileWriterError(
        "simulated interruption after guard installation"
    )
    ws.read_guard.return_value = {
        "entry_id": "test-installation", "output_path": "/config/output.yaml",
    }
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_apply_backup_preview(
        make_hass(), connection, {
            "id": 805, "backup_id": "backup.bak",
            "backup_sha256": "a" * 64,
            "production_sha256": "b" * 64,
            "label_plan_sha256": "c" * 64,
        },
    ))
    assert connection.send_error.call_args.args[1] == (
        "restoration_requires_reconciliation"
    )
    ws.update_entity_label.assert_not_called()
    ws.complete_preview_restoration.assert_not_called()


def test_final_yaml_drift_leaves_restoration_protected(websocket_module):
    ws = _setup_reviewed_restore(websocket_module)
    ws.analyze_preview.return_value = {"comparison": {
        "status": "ok", "identical_entities": False,
    }}
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_apply_backup_preview(
        make_hass(), connection, {
            "id": 804, "backup_id": "backup.bak",
            "backup_sha256": "a" * 64,
            "production_sha256": "b" * 64,
            "label_plan_sha256": "c" * 64,
        },
    ))
    assert connection.send_error.call_args.args[1] == (
        "restoration_requires_reconciliation"
    )
    ws.complete_preview_restoration.assert_not_called()


def test_legacy_direct_restore_endpoint_refuses_write(websocket_module):
    """Even an old client cannot restore production before Preview validation."""
    ws = websocket_module.websocket
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_restore_backup(
        make_hass(), connection, {
            "id": 301,
            "backup_id": "test.bak",
            "backup_sha256": "a" * 64,
            "production_sha256": "b" * 64,
        },
    ))
    connection.send_result.assert_not_called()
    assert connection.send_error.call_args.args[1] == "restore_requires_preview"


def test_backup_preview_endpoint_is_read_only_and_preserves_identity(
    websocket_module,
):
    """The staged restore reads HA labels but does not write anything."""
    ws = websocket_module.websocket
    ws.prepare_backup_preview.return_value = {
        "available": True,
        "mode": "restore_preview",
        "can_apply": False,
        "content": "switch.pompe:\\n  expose: true\\n",
        "production_summary": {"total": 40},
        "summary": {"total": 52},
        "comparison": {"status": "ok", "added": ["switch.new"],
                       "removed": [], "modified": [], "unchanged": 40},
    }
    ws.update_entity_label.reset_mock()
    ws.apply_reviewed_preview.reset_mock()
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_prepare_backup_preview(
        make_hass(), connection, {
            "id": 302,
            "backup_id": "test.bak",
            "backup_sha256": "a" * 64,
            "production_sha256": "b" * 64,
            "entry_id": "forged-id",
        },
    ))
    connection.send_error.assert_not_called()
    assert connection.send_result.call_args.args[1]["can_apply"] is False
    call = ws.prepare_backup_preview.call_args
    assert call.args[0] == Path("/config/google_assistant_entities.yaml")
    assert call.args[1:4] == ("test.bak", "a" * 64, "b" * 64)
    assert isinstance(call.args[4], dict)
    ws.update_entity_label.assert_not_called()
    ws.apply_reviewed_preview.assert_not_called()



def test_preview_disables_apply_for_unmanaged_yaml(
    websocket_module, tmp_path
):
    """Readable manual YAML must never enable Apply."""
    ws = websocket_module.websocket

    output = tmp_path / "manual.yaml"
    output.write_text(
        "switch.manual:\n  expose: true\n",
        encoding="utf-8",
    )

    preview_dir = tmp_path / ".hvls"
    preview_dir.mkdir()
    (preview_dir / "preview.yaml").write_text(
        "switch.generated:\n  expose: true\n",
        encoding="utf-8",
    )

    registry_path = preview_dir / "ownership.json"
    assert not registry_path.exists()

    ws._read_and_compare = ws._read_and_compare_real
    ws.analyze_preview.return_value = {
        "summary": {"total": 1},
        "comparison": {"status": "ok"},
    }

    hass = make_hass()
    hass.config.config_dir = str(tmp_path)
    hass.config.path = lambda *parts: str(
        tmp_path.joinpath(*parts)
    )
    hass.config_entries.async_entries = lambda domain: [
        SimpleNamespace(
            entry_id="test-installation",
            data={
                "label": "google_assistant",
                "output": "manual.yaml",
            },
            options={},
        )
    ]

    connection = SimpleNamespace(
        send_result=Mock(),
        send_error=Mock(),
    )

    before = output.read_bytes()

    asyncio.run(
        ws.websocket_get_preview(
            hass,
            connection,
            {"id": 501},
        )
    )

    connection.send_error.assert_not_called()

    result = connection.send_result.call_args.args[1]

    assert result["available"] is True
    assert result["can_apply"] is False
    assert result["ownership"]["status"] == "unmanaged"
    assert result["ownership"]["reason"]

    # The diagnostic must be completely read-only.
    assert output.read_bytes() == before
    assert not registry_path.exists()



@pytest.mark.parametrize(
    ("production_count", "preview_count", "expected_added", "expected_removed"),
    [(40, 52, 12, 0), (52, 40, 0, 12)],
)
def test_readonly_preview_keeps_production_statistics_separate_from_proposal(
    websocket_module, tmp_path, production_count, preview_count,
    expected_added, expected_removed,
):
    """The stats never switch to Preview counts when restore changes direction."""
    ws = websocket_module.websocket
    real_spec = importlib.util.spec_from_file_location(
        "_test_hvls_real_compare",
        Path(__file__).resolve().parents[1]
        / "custom_components/ha_voice_label_sync/preview_compare.py",
    )
    real_compare = importlib.util.module_from_spec(real_spec)
    real_spec.loader.exec_module(real_compare)
    ws.analyze_preview = real_compare.analyze_preview
    ws.PreviewFormatError = real_compare.PreviewFormatError

    output = tmp_path / "google_assistant_entities.yaml"
    preview = tmp_path / "preview.yaml"
    def yaml_entities(count):
        return "".join(
            f"switch.test_{index}:\n  expose: true\n" for index in range(count)
        )
    output.write_text(yaml_entities(production_count), encoding="utf-8")
    preview.write_text(yaml_entities(preview_count), encoding="utf-8")

    before = output.read_bytes()
    result = ws._read_and_compare_real(preview, output)
    assert result["production_summary"]["total"] == production_count
    assert result["summary"]["total"] == preview_count
    assert len(result["comparison"]["added"]) == expected_added
    assert len(result["comparison"]["removed"]) == expected_removed
    assert result["production_sha256"] is not None
    assert output.read_bytes() == before


def test_production_statistics_survive_missing_or_invalid_preview(
    websocket_module, tmp_path,
):
    """Stats describe production even if no Preview can be displayed."""
    ws = websocket_module.websocket
    real_spec = importlib.util.spec_from_file_location(
        "_test_hvls_real_compare_missing_preview",
        Path(__file__).resolve().parents[1]
        / "custom_components/ha_voice_label_sync/preview_compare.py",
    )
    real_compare = importlib.util.module_from_spec(real_spec)
    real_spec.loader.exec_module(real_compare)
    ws.analyze_preview = real_compare.analyze_preview
    ws.PreviewFormatError = real_compare.PreviewFormatError
    output = tmp_path / "google_assistant_entities.yaml"
    preview = tmp_path / "preview.yaml"
    output.write_text("switch.real:\n  expose: true\n", encoding="utf-8")
    first = ws._read_and_compare_real(preview, output)
    assert first["available"] is False
    assert first["production_summary"]["total"] == 1
    preview.write_text("broken: [", encoding="utf-8")
    second = ws._read_and_compare_real(preview, output)
    assert second["available"] is True
    assert second["error"]
    assert second["production_summary"]["total"] == 1


def test_invalid_or_missing_production_never_uses_preview_as_statistics(
    websocket_module, tmp_path,
):
    """If the real production is unavailable, dashboard totals stay unknown."""
    ws = websocket_module.websocket
    real_spec = importlib.util.spec_from_file_location(
        "_test_hvls_real_compare_invalid_production",
        Path(__file__).resolve().parents[1]
        / "custom_components/ha_voice_label_sync/preview_compare.py",
    )
    real_compare = importlib.util.module_from_spec(real_spec)
    real_spec.loader.exec_module(real_compare)
    ws.analyze_preview = real_compare.analyze_preview
    ws.PreviewFormatError = real_compare.PreviewFormatError
    output = tmp_path / "google_assistant_entities.yaml"
    preview = tmp_path / "preview.yaml"
    preview.write_text("switch.preview:\n  expose: true\n", encoding="utf-8")
    absent = ws._read_and_compare_real(preview, output)
    assert absent["summary"]["total"] == 1
    assert absent["production_summary"] is None
    output.write_text("broken: [", encoding="utf-8")
    invalid = ws._read_and_compare_real(preview, output)
    assert invalid["production_summary"] is None
    assert invalid["production_summary_error"] is not None


def test_server_apply_is_blocked_while_restore_is_unresolved(websocket_module):
    ws = websocket_module.websocket
    ws.assert_not_guarded.side_effect = ws.FileWriterError(
        "Restore reconciliation required"
    )
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_apply_preview(
        make_hass(), connection,
        {"id": 911, "preview_sha256": "a" * 64,
         "production_sha256": "b" * 64},
    ))
    assert connection.send_error.call_args.args[1] == "apply_failed"
    ws.apply_reviewed_preview.assert_not_called()


def test_preview_refuses_apply_from_persistent_restore_hold(websocket_module):
    ws = websocket_module.websocket
    ws.evaluate_registered_output = Mock(return_value=SimpleNamespace(
        status="managed", write_allowed=True,
        reason_code="verified_owned_output", reason="Verified",
    ))
    ws.read_guard.return_value = {
        "entry_id": "test-installation",
        "output_path": ws.DEFAULT_OUTPUT,
        "original_sha256": "c" * 64,
        "restored_sha256": "d" * 64,
    }
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_get_preview(
        make_hass(), connection, {"id": 912},
    ))
    connection.send_error.assert_not_called()
    result = connection.send_result.call_args.args[1]
    assert result["ownership"]["reason_code"] == (
        "restore_reconciliation_required"
    )
    assert result["ownership"]["write_allowed"] is False
    assert result["can_apply"] is False


def test_restore_resolution_regenerates_from_live_labels(websocket_module):
    ws = websocket_module.websocket
    ws.run_google_assistant_workflow = Mock(return_value=SimpleNamespace(
        generation=SimpleNamespace(content="switch.generated:\n  expose: true\n"),
    ))
    ws.resolve_restored_output = Mock(return_value={
        "resolved": True, "production_unchanged": True,
        "apply_performed": False,
    })
    connection = SimpleNamespace(send_result=Mock(), send_error=Mock())
    asyncio.run(ws.websocket_resolve_restored_output(
        make_hass(), connection,
        {"id": 913, "preview_sha256": "a" * 64,
         "production_sha256": "b" * 64,
         "resolution": "keep_restored", "confirmed": True},
    ))
    connection.send_error.assert_not_called()
    ws.resolve_restored_output.assert_called_once()
    assert ws.resolve_restored_output.call_args.kwargs["generated_content"] == (
        "switch.generated:\n  expose: true\n"
    )
    assert ws.resolve_restored_output.call_args.kwargs["entry_id"] == (
        "test-installation"
    )
