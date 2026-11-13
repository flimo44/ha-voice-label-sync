"""Regression tests for administrator-only migration diagnostics (PR #110).

Test real parser and exposure projector; mock only the HA runtime interfaces.
"""
from __future__ import annotations

import ast
import asyncio
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

import pytest

COMPONENT = (
    Path(__file__).resolve().parents[1] / "custom_components" / "ha_voice_label_sync"
)


@pytest.fixture
def diagnostic(monkeypatch):
    prefix = "_test_admin_migration"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)

    loaded = {}
    for stem in (
        "migration_discovery",
        "migration_exposure",
        "migration_live_snapshot",
        "migration_loaded_policy",
        "migration_diagnostic",
    ):
        name = f"{prefix}.{stem}"
        spec = importlib.util.spec_from_file_location(name, COMPONENT / f"{stem}.py")
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, name, module)
        spec.loader.exec_module(module)
        loaded[stem] = module
    return loaded["migration_diagnostic"]


def _config(tmp_path: Path, content: str) -> None:
    (tmp_path / "configuration.yaml").write_text(content, encoding="utf-8")


YAML = """
google_assistant:
  project_id: my-private-project
  service_account: !secret PRIVATE_SERVICE_ACCOUNT
  expose_by_default: false
  entity_config:
    light.good:
      expose: true
    light.custom:
      expose: true
      name: VERY_PRIVATE_NAME
      aliases:
        - VERY_PRIVATE_ALIAS
    lock.excluded:
      expose: false
"""


def _entry(entity_id, *, present=True, traits=True, registry=True):
    return {
        "entity_id": entity_id,
        "state_present": present,
        "google_traits_supported": traits,
        "registry_present": registry,
        "hidden_by": None,
        "entity_category": None,
        "disabled_by": None,
    }


def _snapshot(*entities, status="complete", failures=0):
    return {
        "status": status,
        "reason": None,
        "inventory_complete": True,
        "entities": list(entities),
        "default_exposed_domains": ["light", "lock"],
        "trait_check_failures": failures,
    }


def _policy(*, status="match_compared_fields", changes=None, rule_changes=None):
    return {
        "status": status,
        "compared_fields_match": status == "match_compared_fields",
        "rule_changes": rule_changes or [],
        "differences": changes or [],
        "summary": {"disk_entries": 3, "loaded_entries": 3, "unchanged": 3},
        "loaded_policy_checked": True,
    }


def _setup_runtime(monkeypatch, diagnostic, *, snapshot=None, policy=None):
    def snap(_hass):
        return snapshot or _snapshot(
            _entry("light.good"),
            _entry("light.custom"),
            _entry("lock.excluded"),
            _entry("light.unlisted"),
        )

    def compare(_hass, _disk):
        return policy if policy is not None else _policy()

    monkeypatch.setattr(diagnostic, "capture_live_google_runtime", snap)
    monkeypatch.setattr(diagnostic, "compare_loaded_google_on_ha", compare)


def _run(diagnostic, tmp_path: Path):
    calls = []

    async def executor(func, *args):
        calls.append(("executor", func.__name__))
        return func(*args)

    hass = SimpleNamespace(
        config=SimpleNamespace(config_dir=str(tmp_path)),
        async_add_executor_job=executor,
    )
    return asyncio.run(diagnostic.build_admin_migration_diagnostic(hass)), calls


def _by_id(report):
    return {entity["entity_id"]: entity for entity in report["entities"]}


def test_read_only_report_separates_projection_and_google_home(
    diagnostic, monkeypatch, tmp_path
):
    _config(tmp_path, YAML)
    _setup_runtime(monkeypatch, diagnostic)
    report, calls = _run(diagnostic, tmp_path)
    by_id = _by_id(report)

    assert calls == [("executor", "discover_google_assistant")]
    assert report["read_only"] is True
    assert report["cutover_allowed"] is False
    assert report["review_status"] == "pending_review"
    assert report["loaded_policy"]["status"] == "match_compared_fields"
    assert report["source_freshness_verified"] is False
    assert report["google_home_state_verified"] is False
    assert report["disk_projection"]["basis"] == "disk_yaml_only"
    assert report["disk_projection"]["active_runtime_policy_certified"] is False

    assert by_id["light.good"]["category"] == "candidate_for_review"
    assert by_id["light.good"]["disk_ha_sync_projection"] == "exposed"
    assert by_id["light.good"]["active_google_home_state"] == "unknown"
    assert by_id["light.custom"]["category"] == "needs_review"
    assert by_id["light.custom"]["customization_fields_present"] == [
        "name", "aliases"
    ]
    assert by_id["lock.excluded"]["category"] == "explicitly_excluded"
    assert by_id["light.unlisted"]["category"] == "runtime_without_yaml_entry"
    assert report["counts"]["explicit_yaml_entries"] == 3

    serialized = json.dumps(report)
    for secret in (
        "VERY_PRIVATE_NAME", "VERY_PRIVATE_ALIAS",
        "my-private-project", "PRIVATE_SERVICE_ACCOUNT",
        "service_account",
    ):
        assert secret not in serialized
    assert str(tmp_path) not in serialized


def test_drift_on_one_entity_preserves_other_candidates(
    diagnostic, monkeypatch, tmp_path
):
    _config(tmp_path, YAML)
    _setup_runtime(
        monkeypatch,
        diagnostic,
        policy=_policy(
            status="drift_detected",
            changes=[
                {
                    "entity_id": "light.custom",
                    "status": "changed",
                    "changed_fields": ["name", "aliases"],
                }
            ],
        ),
    )
    report, _ = _run(diagnostic, tmp_path)
    entities = _by_id(report)
    assert entities["light.good"]["category"] == "candidate_for_review"
    assert entities["light.custom"]["category"] == "needs_review"
    assert entities["light.custom"]["loaded_policy_difference"]["changed_fields"] == [
        "name", "aliases"
    ]
    assert entities["light.good"]["active_google_home_state"] == "unknown"
    assert report["cutover_allowed"] is False


def test_global_rule_drift_blocks_candidates(
    diagnostic, monkeypatch, tmp_path
):
    _config(tmp_path, YAML)
    _setup_runtime(
        monkeypatch,
        diagnostic,
        policy=_policy(
            status="drift_detected", rule_changes=["expose_by_default"]
        ),
    )
    report, _ = _run(diagnostic, tmp_path)
    assert _by_id(report)["light.good"]["category"] == "needs_review"
    assert report["loaded_policy"]["rule_changes"] == ["expose_by_default"]


def test_one_failed_trait_check_does_not_invalidate_others(
    diagnostic, monkeypatch, tmp_path
):
    _config(tmp_path, YAML)
    snapshot = _snapshot(
        _entry("light.good"),
        _entry("light.custom", traits=None),
        _entry("lock.excluded"),
        status="partial",
        failures=1,
    )
    _setup_runtime(monkeypatch, diagnostic, snapshot=snapshot)
    report, _ = _run(diagnostic, tmp_path)
    assert report["runtime_snapshot"]["status"] == "partial"
    assert report["runtime_snapshot"]["trait_check_failures"] == 1
    assert _by_id(report)["light.good"]["category"] == "candidate_for_review"
    assert _by_id(report)["light.custom"]["disk_ha_sync_projection"] == "unknown"


def test_local_invalid_yaml_option_still_allows_good_entry(
    diagnostic, monkeypatch, tmp_path
):
    bad = YAML.replace(
        "    light.custom:\n      expose: true\n      name: VERY_PRIVATE_NAME\n"
        "      aliases:\n        - VERY_PRIVATE_ALIAS\n",
        "    light.custom:\n      expose: true\n      room: [invalid, list]\n",
    )
    _config(tmp_path, bad)
    _setup_runtime(
        monkeypatch,
        diagnostic,
        policy=_policy(
            status="partial_unknown",
            changes=[
                {
                    "entity_id": "light.custom",
                    "status": "unknown",
                    "changed_fields": [],
                }
            ],
        ),
    )
    report, _ = _run(diagnostic, tmp_path)
    by_id = _by_id(report)
    assert report["review_status"] == "pending_review"
    assert by_id["light.good"]["category"] == "candidate_for_review"
    assert by_id["light.custom"]["category"] == "needs_review"
    assert "invalid_room_option" in by_id["light.custom"]["reasons"]


def test_unavailable_loaded_policy_never_approves_candidates(
    diagnostic, monkeypatch, tmp_path
):
    _config(tmp_path, YAML)
    _setup_runtime(
        monkeypatch,
        diagnostic,
        policy={"status": "unavailable", "reason": "ga_runtime_api_unavailable"},
    )
    report, _ = _run(diagnostic, tmp_path)
    assert _by_id(report)["light.good"]["category"] == "needs_review"
    assert report["loaded_policy"]["status"] == "unavailable"
    assert report["cutover_allowed"] is False


@pytest.mark.parametrize(
    "content",
    [
        "google_assistant: [invalid: yaml\n",
        "google_assistant:\n  expose_by_default: true\n"
        "  expose_by_default: false\n",
    ],
)
def test_global_source_failure_does_not_call_runtime(
    diagnostic, monkeypatch, tmp_path, content
):
    _config(tmp_path, content)

    def forbidden(*_args):
        raise AssertionError("HA runtime cannot be checked against broken source")

    monkeypatch.setattr(diagnostic, "capture_live_google_runtime", forbidden)
    monkeypatch.setattr(diagnostic, "compare_loaded_google_on_ha", forbidden)
    report, _ = _run(diagnostic, tmp_path)
    assert report["review_status"] == "blocked"
    assert report["loaded_policy"]["status"] == "unavailable"
    assert report["entities"] == []
    assert report["cutover_allowed"] is False


def test_new_configuration_skips_migration_runtime(
    diagnostic, monkeypatch, tmp_path
):
    _config(tmp_path, "homeassistant:\n  name: Test instance\n")

    def forbidden(*_args):
        raise AssertionError("No manual Google Assistant runtime is expected")

    monkeypatch.setattr(diagnostic, "capture_live_google_runtime", forbidden)
    monkeypatch.setattr(diagnostic, "compare_loaded_google_on_ha", forbidden)
    report, _ = _run(diagnostic, tmp_path)
    assert report["mode"] == "new_configuration"
    assert report["review_status"] == "not_applicable"
    assert report["counts"]["explicit_yaml_entries"] == 0
    assert report["cutover_allowed"] is False


def test_diagnostic_never_writes_files_or_labels(
    diagnostic, monkeypatch, tmp_path
):
    _config(tmp_path, YAML)
    original = (tmp_path / "configuration.yaml").read_bytes()
    _setup_runtime(monkeypatch, diagnostic)

    def forbidden(*_args, **_kwargs):
        raise AssertionError("Diagnostic attempted an unexpected write")

    monkeypatch.setattr(Path, "write_text", forbidden)
    monkeypatch.setattr(Path, "write_bytes", forbidden)
    report, _ = _run(diagnostic, tmp_path)
    assert report["cutover_allowed"] is False
    assert (tmp_path / "configuration.yaml").read_bytes() == original


def test_websocket_is_admin_only_and_registered():
    """Static wiring guard without requiring the Home Assistant test runtime."""
    tree = ast.parse((COMPONENT / "websocket.py").read_text(encoding="utf-8"))
    handler = next(
        node
        for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "websocket_get_migration_diagnostic"
    )
    assert any(
        isinstance(decorator, ast.Attribute)
        and decorator.attr == "require_admin"
        for decorator in handler.decorator_list
    )
    register = next(
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef)
        and node.name == "async_register_websocket_api"
    )
    assert "websocket_get_migration_diagnostic" in ast.unparse(register)



def test_new_configuration_gives_orphan_evidence_without_claiming_migration(
    diagnostic, monkeypatch, tmp_path
):
    _config(tmp_path, "homeassistant:\n  name: Test\n")
    (tmp_path / "google_assistant_entities.yaml").write_text(
        "light.secret:\n  name: NEVER_ECHO_THIS\n", encoding="utf-8"
    )

    def forbidden(*_args):
        raise AssertionError("Orphan evidence must not trigger HA runtime access")

    monkeypatch.setattr(diagnostic, "capture_live_google_runtime", forbidden)
    monkeypatch.setattr(diagnostic, "compare_loaded_google_on_ha", forbidden)
    report, _ = _run(diagnostic, tmp_path)
    assert report["mode"] == "new_configuration"
    assert report["source"]["unreferenced_google_entity_file_present"] is True
    assert report["review_status"] == "not_applicable"
    assert report["cutover_allowed"] is False
    assert report["entities"] == []
    assert "NEVER_ECHO_THIS" not in json.dumps(report)
    assert str(tmp_path) not in json.dumps(report)
