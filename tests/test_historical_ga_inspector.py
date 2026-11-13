"""Non-authorizing historical YAML review in a fixed isolated folder."""

from __future__ import annotations

import ast
import importlib.util
import json
import sys
from pathlib import Path
from types import ModuleType

import pytest

COMPONENT = (
    Path(__file__).resolve().parents[1] / "custom_components" / "ha_voice_label_sync"
)


@pytest.fixture
def inspector(monkeypatch):
    prefix = "_test_historical_ga"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)
    for name in (
        "migration_discovery", "assistant_entity_file", "historical_ga_inspector"
    ):
        full = f"{prefix}.{name}"
        spec = importlib.util.spec_from_file_location(full, COMPONENT / f"{name}.py")
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, full, module)
        spec.loader.exec_module(module)
    return sys.modules[f"{prefix}.historical_ga_inspector"]


def _stage(tmp_path, configuration, *, included=None, entities=None):
    history = tmp_path / "hvls-history-review"
    history.mkdir()
    (history / "configuration.yaml").write_text(configuration, encoding="utf-8")
    if included is not None:
        (history / "google_assistant.yaml").write_text(included, encoding="utf-8")
    if entities is not None:
        (history / "google_assistant_entities.yaml").write_text(
            entities, encoding="utf-8"
        )
        (tmp_path / "google_assistant_entities.yaml").write_text(
            entities, encoding="utf-8"
        )
    return history


def _safe(report):
    assert report["read_only"] is True
    for field in (
        "source_active_verified", "historical_runtime_verified",
        "google_home_state_verified", "migration_authorized", "stage_allowed",
        "apply_allowed", "cutover_allowed",
    ):
        assert report[field] is False


def test_complete_included_history_matches_staged_current_file(inspector, tmp_path):
    ga_config = (
        "expose_by_default: false\n"
        "exposed_domains: [light, switch]\n"
        "entity_config: !include google_assistant_entities.yaml\n"
        "service_account: !include dont_open_service_account.yaml\n"
    )
    entities = (
        "light.one:\n  expose: true\n"
        "light.two:\n  expose: false\n"
        "light.three:\n  name: Secret Name\n"
    )
    _stage(
        tmp_path,
        "google_assistant: !include google_assistant.yaml\n",
        included=ga_config, entities=entities,
    )
    report = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    _safe(report)
    assert report["status"] == "parsed"
    assert report["declaration"] == "included"
    assert report["rules"] == {
        "expose_by_default": "false",
        "expose_by_default_explicit": True,
        "exposed_domains_declared": True,
        "exposed_domains": ["light", "switch"],
    }
    source = report["entity_source"]
    assert source["path"] == "google_assistant_entities.yaml"
    assert source["path_relation"] == "same"
    assert source["file_present"] is True
    assert source["content_relation"] == "identical"
    assert source["counts"]["entries"] == 3
    assert source["counts"]["explicitly_exposed"] == 1
    assert source["counts"]["explicitly_excluded"] == 1
    assert source["counts"]["expose_not_set"] == 1
    data = json.dumps(report)
    assert "Secret Name" not in data
    assert "dont_open_service_account" not in data


def test_direct_yaml_different_historical_contents(inspector, tmp_path):
    _stage(
        tmp_path,
        "google_assistant:\n"
        "  expose_by_default: true\n"
        "  entity_config: !include google_assistant_entities.yaml\n",
        entities="light.one:\n  expose: true\n",
    )
    (tmp_path / "google_assistant_entities.yaml").write_text(
        "light.one:\n  expose: false\n", encoding="utf-8"
    )
    report = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    _safe(report)
    assert report["status"] == "parsed"
    assert report["declaration"] == "direct"
    assert report["rules"]["expose_by_default"] == "true"
    assert report["rules"]["exposed_domains_declared"] is False
    assert report["entity_source"]["content_relation"] == "different"


def test_historical_reference_can_be_found_even_if_file_missing(inspector, tmp_path):
    _stage(
        tmp_path,
        "google_assistant:\n"
        "  expose_by_default: false\n"
        "  entity_config: !include google_assistant_entities.yaml\n",
    )
    report = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    _safe(report)
    assert report["status"] == "review_required"
    assert report["entity_source"]["path_relation"] == "same"
    assert report["entity_source"]["file_present"] is False
    assert report["entity_source"]["content_relation"] == "not_compared"
    assert "historical_entity_file_missing" in report["issues"]


def test_inline_entity_config_is_not_confused_with_selected_file(inspector, tmp_path):
    _stage(
        tmp_path,
        "google_assistant:\n"
        "  expose_by_default: false\n"
        "  entity_config:\n"
        "    light.good:\n"
        "      expose: true\n"
        "    switch.broken:\n"
        "      room: [bad]\n"
        "    light.other:\n"
        "      expose: false\n",
    )
    report = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    _safe(report)
    assert report["entity_source"]["mode"] == "inline"
    assert report["entity_source"]["path_relation"] == "unknown"
    assert report["entity_source"]["counts"]["entries"] == 3
    assert report["entity_source"]["counts"]["entries_with_anomalies"] == 1
    assert report["status"] == "review_required"


@pytest.mark.parametrize(("config", "expected_reason"), [
    ("google_assistant: !include ../outside.yaml\n", "invalid_entity_file_path"),
    ("google_assistant: !include /tmp/steal.yaml\n", "invalid_entity_file_path"),
    ("google_assistant: !include secrets.yaml\n", "sensitive_file_reference"),
    ("google_assistant:\n  entity_config: !include ../private.yaml\n",
     "invalid_entity_file_path"),
    ("homeassistant:\n  packages: !include_dir_named packages\n",
     "packages_not_yet_supported"),
    ("google_assistant:\n  expose_by_default: invalid\n",
     "invalid_expose_by_default"),
    ("google_assistant:\n  exposed_domains: [light, !secret password]\n",
     "invalid_exposed_domains"),
])
def test_unsafe_or_unsupported_configuration_is_blocked(
    inspector, tmp_path, config, expected_reason
):
    _stage(tmp_path, config)
    report = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    _safe(report)
    assert report["status"] == "blocked"
    assert report["reason"] == expected_reason


def test_missing_folder_and_configuration_are_diagnostic(inspector, tmp_path):
    a = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    assert a["status"] == "not_found"
    assert a["reason"] == "historical_review_folder_missing"
    _safe(a)
    (tmp_path / "hvls-history-review").mkdir()
    b = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    assert b["status"] == "not_found"
    assert b["reason"] == "historical_configuration_missing"
    _safe(b)


def test_missing_google_declaration_is_not_historical_proof(inspector, tmp_path):
    _stage(tmp_path, "default_config:\n")
    report = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    assert report["status"] == "review_required"
    assert report["declaration"] == "absent"
    assert "historical_google_assistant_absent" in report["issues"]
    _safe(report)


def test_default_true_is_marked_as_implicit_not_explicit(inspector, tmp_path):
    _stage(tmp_path, "google_assistant:\n  project_id: example\n")
    report = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    assert report["status"] == "review_required"
    assert report["rules"]["expose_by_default"] == "true"
    assert report["rules"]["expose_by_default_explicit"] is False
    assert report["rules"]["exposed_domains_declared"] is False
    _safe(report)


def test_different_entity_include_relative_path_is_not_false_match(
    inspector, tmp_path
):
    history = _stage(
        tmp_path,
        "google_assistant:\n"
        "  entity_config: !include ga/old_entities.yaml\n",
    )
    (history / "ga").mkdir()
    (history / "ga" / "old_entities.yaml").write_text(
        "light.thing:\n  expose: true\n", encoding="utf-8"
    )
    (tmp_path / "google_assistant_entities.yaml").write_text(
        "light.thing:\n  expose: true\n", encoding="utf-8"
    )
    report = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    assert report["status"] == "parsed"
    assert report["entity_source"]["path_relation"] == "different"
    assert report["entity_source"]["content_relation"] == "identical"
    _safe(report)


def test_symlink_folder_main_and_nested_include_refused(inspector, tmp_path):
    root = tmp_path / "hvls-history-review"
    root.symlink_to(tmp_path, target_is_directory=True)
    first = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    assert first["reason"] == "symlink_historical_folder_not_allowed"
    root.unlink()
    root.mkdir()
    (root / "configuration.yaml").symlink_to(tmp_path / "source.yaml")
    second = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    assert second["reason"] == "symlink_historical_file_not_allowed"
    (root / "configuration.yaml").unlink()
    (root / "configuration.yaml").write_text(
        "google_assistant: !include ga/one.yaml\n", encoding="utf-8"
    )
    (root / "ga").symlink_to(tmp_path, target_is_directory=True)
    third = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    assert third["reason"] == "symlink_historical_file_not_allowed"


def test_syntax_errors_and_duplicates_do_not_leak_yaml(inspector, tmp_path):
    history = _stage(
        tmp_path,
        "google_assistant:\n  exposed_domains: [secret_token123\n",
    )
    a = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    assert a["reason"] == "yaml_syntax_error"
    assert "secret_token123" not in json.dumps(a)
    (history / "configuration.yaml").write_text(
        "google_assistant: {}\ngoogle_assistant: {}\n", encoding="utf-8"
    )
    b = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    assert b["reason"] == "duplicate_mapping_key"
    _safe(a)
    _safe(b)


def test_large_historical_file_is_refused(inspector, tmp_path):
    history = _stage(tmp_path, "")
    (history / "configuration.yaml").write_bytes(
        b"x" * (1024 * 1024 + 1)
    )
    report = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    assert report["reason"] == "yaml_file_too_large"
    _safe(report)


def test_no_writes_during_historical_review(inspector, tmp_path, monkeypatch):
    _stage(tmp_path, "google_assistant: {}\n")
    def fail(*_args, **_kwargs):
        raise AssertionError("Unexpected write from historical inspector")

    monkeypatch.setattr(Path, "write_bytes", fail)
    monkeypatch.setattr(Path, "write_text", fail)
    report = inspector.inspect_historical_google_yaml(
        tmp_path, "google_assistant_entities.yaml"
    )
    assert report["status"] == "review_required"
    _safe(report)


def test_websocket_admin_and_executor_contract():
    tree = ast.parse((COMPONENT / "websocket.py").read_text(encoding="utf-8"))
    handler = next(
        item for item in tree.body if isinstance(item, ast.AsyncFunctionDef)
        and item.name == "websocket_inspect_historical_google_yaml"
    )
    assert any(
        isinstance(dec, ast.Attribute) and dec.attr == "require_admin"
        for dec in handler.decorator_list
    )
    code = ast.unparse(handler)
    assert "async_add_executor_job" in code
    assert "inspect_historical_google_yaml" in code
    registry = next(
        item for item in tree.body if isinstance(item, ast.FunctionDef)
        and item.name == "async_register_websocket_api"
    )
    assert "websocket_inspect_historical_google_yaml" in ast.unparse(registry)
