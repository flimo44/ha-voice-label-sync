"""Read-only assistant entity YAML inspection regression tests."""

from __future__ import annotations

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
    prefix = "_test_assistant_entity"
    package = ModuleType(prefix)
    package.__path__ = [str(COMPONENT)]
    monkeypatch.setitem(sys.modules, prefix, package)
    for stem in ("migration_discovery", "assistant_entity_file"):
        name = f"{prefix}.{stem}"
        spec = importlib.util.spec_from_file_location(name, COMPONENT / f"{stem}.py")
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, name, module)
        spec.loader.exec_module(module)
    return sys.modules[f"{prefix}.assistant_entity_file"]


def test_valid_file_does_not_approve_migration(inspector, tmp_path):
    (tmp_path / "entities.yaml").write_text(
        "light.kitchen:\n  expose: true\n"
        "switch.exclude:\n  expose: false\n"
        "light.other:\n  name: Room lamp\n",
        encoding="utf-8",
    )
    report = inspector.inspect_google_entity_file(tmp_path, "entities.yaml")
    assert report["status"] == "parsed"
    assert report["counts"] == {
        "entries": 3,
        "requested_exposure": 2,
        "explicitly_exposed": 1,
        "explicitly_excluded": 1,
        "expose_not_set": 1,
        "invalid_expose": 0,
        "entries_with_anomalies": 0,
    }
    assert report["read_only"] is True
    assert report["source_active_verified"] is False
    assert report["google_home_state_verified"] is False
    for key in ("migration_authorized", "stage_allowed", "apply_allowed",
                "cutover_allowed"):
        assert report[key] is False
    assert "Room lamp" not in json.dumps(report)


def test_local_anomalies_are_counted_not_global_blockers(inspector, tmp_path):
    (tmp_path / "entities.yaml").write_text(
        "light.good:\n  expose: true\n"
        "light.bad:\n  expose: not_boolean\n"
        "switch.unknown:\n  room: [invalid, list]\n"
        "invalid-id:\n  expose: true\n",
        encoding="utf-8",
    )
    report = inspector.inspect_google_entity_file(tmp_path, "entities.yaml")
    assert report["status"] == "review_required"
    assert report["counts"]["entries"] == 4
    assert report["counts"]["requested_exposure"] == 2
    assert report["counts"]["explicitly_exposed"] == 1
    assert report["counts"]["explicitly_excluded"] == 0
    assert report["counts"]["expose_not_set"] == 1
    assert report["counts"]["invalid_expose"] == 1
    assert report["counts"]["entries_with_anomalies"] == 3
    assert {i["code"] for i in report["issues"]} == {
        "invalid_expose_value", "invalid_room_option", "invalid_entity_id",
    }
    assert report["cutover_allowed"] is False


@pytest.mark.parametrize("path", [
    "/etc/passwd", "../secrets.yaml", "sub/../../entities.yaml",
    ".storage/core.config_entries", "config\\entities.yaml",
    "secrets.yaml", "nested/service_account.yaml",
    "configuration.yaml", "entities.txt", "", "a//b.yaml",
    "a/./b.yaml", "nested/auth.yaml",
])
def test_unsafe_paths_refused(inspector, tmp_path, path):
    report = inspector.inspect_google_entity_file(tmp_path, path)
    assert report["status"] == "blocked"
    assert report["reason"] in {
        "invalid_entity_file_path", "sensitive_file_reference",
    }


def test_symlinks_refused_including_nested(inspector, tmp_path):
    outside = tmp_path.parent / "outside_hvls_entity_test.yaml"
    (tmp_path / "external.yaml").symlink_to(outside)
    report = inspector.inspect_google_entity_file(tmp_path, "external.yaml")
    assert report["reason"] == "symlink_entity_file_not_allowed"
    (tmp_path / "inner").mkdir()
    (tmp_path / "shortcut").symlink_to(tmp_path / "inner", target_is_directory=True)
    report = inspector.inspect_google_entity_file(tmp_path, "shortcut/entities.yaml")
    assert report["reason"] == "symlink_entity_file_not_allowed"


def test_file_missing_and_syntax_errors_are_sanitized(inspector, tmp_path):
    missing = inspector.inspect_google_entity_file(tmp_path, "entities.yaml")
    assert missing["reason"] == "include_missing"
    (tmp_path / "entities.yaml").write_text(
        "light.bad: [ broken\n", encoding="utf-8",
    )
    invalid = inspector.inspect_google_entity_file(tmp_path, "entities.yaml")
    assert invalid["status"] == "blocked"
    assert invalid["reason"] == "yaml_syntax_error"
    assert "broken" not in json.dumps(invalid)


def test_duplicate_keys_are_refused(inspector, tmp_path):
    (tmp_path / "entities.yaml").write_text(
        "light.a:\n  expose: true\nlight.a:\n  expose: false\n",
        encoding="utf-8",
    )
    result = inspector.inspect_google_entity_file(tmp_path, "entities.yaml")
    assert result["status"] == "blocked"
    assert result["reason"] == "duplicate_mapping_key"


def test_file_does_not_disclose_private_customizations(inspector, tmp_path):
    (tmp_path / "entities.yaml").write_text(
        "light.first:\n"
        "  name: VERY_PRIVATE_NAME\n"
        "  aliases: [VERY_PRIVATE_ALIAS]\n"
        "  room: VERY_PRIVATE_ROOM\n",
        encoding="utf-8",
    )
    report = inspector.inspect_google_entity_file(tmp_path, "entities.yaml")
    serialized = json.dumps(report)
    assert report["status"] == "parsed"
    for secret in ("VERY_PRIVATE_NAME", "VERY_PRIVATE_ALIAS", "VERY_PRIVATE_ROOM"):
        assert secret not in serialized


def test_file_check_never_writes(inspector, tmp_path, monkeypatch):
    (tmp_path / "entities.yaml").write_text(
        "light.a:\n  expose: true\n", encoding="utf-8",
    )
    def forbid_write(*_args, **_kwargs):
        raise AssertionError("Unexpected write")

    monkeypatch.setattr(Path, "write_bytes", forbid_write)
    monkeypatch.setattr(Path, "write_text", forbid_write)
    report = inspector.inspect_google_entity_file(tmp_path, "entities.yaml")
    assert report["status"] == "parsed"


def test_large_file_cannot_be_inspected(inspector, tmp_path):
    (tmp_path / "entities.yaml").write_bytes(b"x" * (1024 * 1024 + 1))
    report = inspector.inspect_google_entity_file(tmp_path, "entities.yaml")
    assert report["status"] == "blocked"
    assert report["reason"] == "yaml_file_too_large"


def test_inspector_websocket_is_admin_only_and_executor_offloaded():
    import ast

    tree = ast.parse((COMPONENT / "websocket.py").read_text(encoding="utf-8"))
    handler = next(
        node for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "websocket_inspect_assistant_entity_file"
    )
    assert any(
        isinstance(dec, ast.Attribute) and dec.attr == "require_admin"
        for dec in handler.decorator_list
    )
    code = ast.unparse(handler)
    assert "async_add_executor_job" in code
    assert "inspect_google_entity_file" in code
    register = next(
        node for node in tree.body
        if isinstance(node, ast.FunctionDef)
        and node.name == "async_register_websocket_api"
    )
    assert "websocket_inspect_assistant_entity_file" in ast.unparse(register)


def test_wrong_yaml_root_keys_are_not_echoed(inspector, tmp_path):
    (tmp_path / "entities.yaml").write_text(
        "SENSITIVE_ADMIN_PASSWORD: top-secret\n"
        "light.safe:\n  expose: true\n",
        encoding="utf-8",
    )
    report = inspector.inspect_google_entity_file(tmp_path, "entities.yaml")
    assert report["counts"]["entries_with_anomalies"] == 1
    assert report["issue_examples"][0]["entity_id"] is None
    assert "SENSITIVE_ADMIN_PASSWORD" not in json.dumps(report)
    assert "top-secret" not in json.dumps(report)

def test_empty_expose_key_is_not_counted_as_explicit_true(inspector, tmp_path):
    (tmp_path / "entities.yaml").write_text(
        "light.named:\n  name: Lamp\n"
        "light.false:\n  expose: false\n"
        "light.true:\n  expose: true\n"
        "switch.invalid:\n  expose: definitely\n"
        "switch.bad_structure: yes\n",
        encoding="utf-8",
    )
    report = inspector.inspect_google_entity_file(tmp_path, "entities.yaml")
    counts = report["counts"]
    assert counts["entries"] == 5
    assert counts["explicitly_exposed"] == 1
    assert counts["explicitly_excluded"] == 1
    assert counts["expose_not_set"] == 1
    assert counts["invalid_expose"] == 1
    # A malformed options mapping is an issue, not proof of any intent.
    assert counts["entries_with_anomalies"] == 2
    assert counts["requested_exposure"] == 2
    assert report["source_active_verified"] is False
    assert report["migration_authorized"] is False


def test_all_expose_omitted_does_not_claim_exposure(inspector, tmp_path):
    (tmp_path / "entities.yaml").write_text(
        "light.one:\n  name: One\n"
        "light.two:\n  room: Living\n",
        encoding="utf-8",
    )
    report = inspector.inspect_google_entity_file(tmp_path, "entities.yaml")
    assert report["status"] == "parsed"
    assert report["counts"]["requested_exposure"] == 2  # legacy only
    assert report["counts"]["explicitly_exposed"] == 0
    assert report["counts"]["expose_not_set"] == 2
    assert report["counts"]["explicitly_excluded"] == 0
    assert report["google_home_state_verified"] is False
