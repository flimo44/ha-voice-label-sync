"""Tests for the admin-only, non-writing migration review adapter."""

from __future__ import annotations

import ast
import asyncio
import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import Mock

import pytest

COMPONENT = (
    Path(__file__).resolve().parents[1] / "custom_components" / "ha_voice_label_sync"
)


@pytest.fixture
def facade(monkeypatch):
    prefix = "_test_hvls_admin_review"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)

    const = ModuleType(f"{prefix}.const")
    const.CONF_LABEL = "label"
    const.DEFAULT_LABEL = "google_assistant"
    services = ModuleType(f"{prefix}.services")
    services.DEFAULT_DOMAINS = frozenset({"light", "switch"})

    registry = ModuleType(f"{prefix}.ha_registries")
    registry.get_live_registries = Mock(return_value={
        "entity_registry": {"data": {"entities": []}},
        "label_registry": {"data": {"labels": []}},
    })

    baseline = ModuleType(f"{prefix}.migration_baseline")
    baseline.BaselineError = type("BaselineError", (ValueError,), {})
    baseline.verify_baseline = Mock(return_value={
        "manifest_sha256": "a" * 64,
    })

    plan = ModuleType(f"{prefix}.migration_stage_plan")
    plan.build_reviewed_stage_plan = Mock(return_value={
        "summary": {"needs_review": 1, "proposed_label_additions": 0},
        "entities": [{"entity_id": "light.test", "status": "needs_review"}],
        "apply_allowed": False, "cutover_allowed": False,
    })

    simulation = ModuleType(f"{prefix}.migration_cutover_review")
    simulation.build_readonly_migration_review = Mock(return_value={
        "status": "hypothetical_preview_consistent",
        "entities": [],
        "cutover_allowed": False,
        "candidate_yaml_sha256": "c" * 64,
    })

    diagnostic = ModuleType(f"{prefix}.migration_diagnostic")
    async def read_diagnostic(_hass):
        return {
            "schema_version": 1,
            "entities": [{"entity_id": "light.test"}],
            "source": {"locations": []},
            "cutover_allowed": False,
        }
    diagnostic.build_admin_migration_diagnostic = read_diagnostic

    executor = ModuleType(f"{prefix}.migration_stage_executor")
    executor._current_catalog = Mock(return_value=(
        "google_assistant",
        {"light.test": {
            "registry_id": "native_id_01",
            "label_present": False,
            "eligible": True,
        }},
    ))

    dependencies = (
        const, services, registry, baseline, plan,
        simulation, diagnostic, executor,
    )
    for dep in dependencies:
        monkeypatch.setitem(sys.modules, dep.__name__, dep)

    name = f"{prefix}.migration_review_api"
    spec = importlib.util.spec_from_file_location(
        name, COMPONENT / "migration_review_api.py"
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, name, module)
    spec.loader.exec_module(module)

    calls = []
    async def execute(fn, *args):
        calls.append("executor")
        return fn(*args)

    hass = SimpleNamespace(
        config=SimpleNamespace(config_dir="/unused/test/config"),
        config_entries=SimpleNamespace(
            async_entries=lambda domain: [
                SimpleNamespace(
                    data={"label": "google_assistant"}, options={}
                )
            ]
        ),
        async_add_executor_job=execute,
    )
    return SimpleNamespace(
        module=module, hass=hass, calls=calls,
        baseline=baseline, plan=plan,
        simulation=simulation, registry=registry,
        executor=executor,
    )


def _run(facade, decisions=None):
    return asyncio.run(
        facade.module.async_build_admin_review(
            facade.hass, decisions if decisions is not None else {}
        )
    )


def test_verified_baseline_produces_review_without_any_write(facade):
    request = {"light.test": {"action": "keep"}}
    result = _run(facade, request)
    assert facade.calls == ["executor"]
    assert facade.registry.get_live_registries.call_count == 1
    assert facade.executor._current_catalog.call_count == 1
    assert facade.plan.build_reviewed_stage_plan.call_count == 1
    facade.simulation.build_readonly_migration_review.assert_called_once()
    assert result["protected_baseline_status"] == "verified"
    assert result["simulation"]["candidate_yaml_sha256"] == "c" * 64
    assert result["read_only"] is True
    assert result["apply_allowed"] is False
    assert result["cutover_allowed"] is False
    assert result["google_home_state_verified"] is False


def test_missing_baseline_still_returns_diagnostic_and_safe_plan(facade):
    facade.baseline.verify_baseline.side_effect = (
        facade.baseline.BaselineError("baseline_missing")
    )
    result = _run(facade, {"light.test": {"action": "import"}})
    assert result["diagnostic"]["entities"][0]["entity_id"] == "light.test"
    assert result["preflight"]["summary"]["needs_review"] == 1
    assert result["protected_baseline_status"] == "not_verified"
    assert result["simulation"] is None
    assert result["apply_allowed"] is False
    facade.simulation.build_readonly_migration_review.assert_not_called()


def test_corrupted_baseline_is_never_automatically_replaced(facade):
    facade.baseline.verify_baseline.side_effect = (
        facade.baseline.BaselineError("baseline_corrupt")
    )
    result = _run(facade)
    assert result["protected_baseline_status"] == "not_verified"
    assert result["simulation"] is None
    assert facade.calls == ["executor"]


def test_invalid_decisions_fail_before_any_snapshot(facade):
    with pytest.raises(
        facade.module.MigrationReviewError,
        match="invalid_review_decisions",
    ):
        _run(facade, ["invalid"])
    facade.registry.get_live_registries.assert_not_called()
    facade.plan.build_reviewed_stage_plan.assert_not_called()


def test_multiple_integration_config_entries_fail_closed(facade):
    facade.hass.config_entries.async_entries = lambda domain: [
        SimpleNamespace(data={}, options={}),
        SimpleNamespace(data={}, options={}),
    ]
    with pytest.raises(
        facade.module.MigrationReviewError,
        match="integration_not_uniquely_configured",
    ):
        _run(facade)
    facade.registry.get_live_registries.assert_not_called()


def test_configuration_label_passed_through_to_current_native_catalog(facade):
    _run(facade, {"light.test": {"action": "import"}})
    assert facade.executor._current_catalog.call_args.args[1] == (
        "google_assistant"
    )
    assert facade.executor._current_catalog.call_args.args[2] == [
        "light.test"
    ]


def test_read_only_websocket_handler_is_admin_only_and_registered():
    tree = ast.parse(
        (COMPONENT / "websocket.py").read_text(encoding="utf-8")
    )
    handler = next(
        node for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "websocket_get_migration_review"
    )
    assert any(
        isinstance(d, ast.Attribute) and d.attr == "require_admin"
        for d in handler.decorator_list
    )
    handler_source = ast.get_source_segment(
        (COMPONENT / "websocket.py").read_text(encoding="utf-8"),
        handler,
    )
    assert "async_build_admin_review" in handler_source
    assert "apply_reviewed_preview" not in handler_source
    assert "stage_one_approved_label" not in handler_source
    register = next(
        node for node in tree.body
        if isinstance(node, ast.FunctionDef)
        and node.name == "async_register_websocket_api"
    )
    assert "websocket_get_migration_review" in ast.unparse(register)
