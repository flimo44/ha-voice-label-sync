"""Regression tests for fresh installation after removing the old YAML."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import pytest

from hvls import FileWriterError
from hvls.output_ownership_registry import OwnershipRegistry
from hvls.owned_writer import evaluate_registered_output


@pytest.fixture
def repair(monkeypatch):
    prefix = "_test_new_install_orphan"
    root = (
        Path(__file__).resolve().parents[1]
        / "custom_components" / "ha_voice_label_sync"
    )
    package = ModuleType(prefix)
    package.__path__ = [str(root)]
    monkeypatch.setitem(sys.modules, prefix, package)
    for module_name in ("restore_guard", "orphaned_new_install"):
        path = root / f"{module_name}.py"
        spec = importlib.util.spec_from_file_location(
            f"{prefix}.{module_name}", path
        )
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, spec.name, module)
        spec.loader.exec_module(module)
    return sys.modules[f"{prefix}.orphaned_new_install"]


@pytest.fixture
def paths(tmp_path):
    output = tmp_path / "google_assistant_entities.yaml"
    registry_path = tmp_path / ".hvls" / "ownership.json"
    OwnershipRegistry(registry_path).record_generation(
        entry_id="old-installation",
        output_path=str(output),
        sha256="a" * 64,
    )
    return output, registry_path


def retire(repair, paths, active=frozenset({"new-installation"})):
    output, registry_path = paths
    return repair.retire_missing_inactive_owner(
        output_path=output,
        registry_path=registry_path,
        entry_id="new-installation",
        active_entry_ids=active,
    )


def test_absent_yaml_inactive_owner_is_released_without_creating_file(
    repair, paths,
):
    output, registry_path = paths
    assert evaluate_registered_output(
        output, "new-installation", registry_path
    ).reason_code == "owned_by_other_installation"
    assert retire(repair, paths) is True
    assert not output.exists()
    assert OwnershipRegistry(registry_path).get_record("old-installation") is None
    allowed = evaluate_registered_output(
        output, "new-installation", registry_path
    )
    assert (allowed.status, allowed.write_allowed) == ("new", True)
    assert retire(repair, paths) is False


def test_existing_file_never_released_or_overwritten(repair, paths):
    output, registry_path = paths
    original = b"switch.pump:\n  expose: true\n"
    output.write_bytes(original)
    assert retire(repair, paths) is False
    assert output.read_bytes() == original
    assert OwnershipRegistry(registry_path).get_record(
        "old-installation"
    ) is not None


def test_active_owner_stays_protected(repair, paths):
    assert retire(
        repair, paths, frozenset({"old-installation", "new-installation"})
    ) is False
    assert OwnershipRegistry(paths[1]).get_record("old-installation") is not None


def test_pending_reservation_stays_protected(repair, paths):
    output, registry_path = paths
    registry = OwnershipRegistry(registry_path)
    # Another installation's pending first creation is not abandoned safely.
    other_path = output.parent / "another.yaml"
    registry.begin_create(
        entry_id="pending", output_path=str(other_path),
        next_sha256="b" * 64,
    )
    assert retire(repair, paths) is True
    assert registry.get_record("pending")["state"] == "pending_create"
    assert other_path.exists() is False


def test_pending_same_output_never_released(repair, tmp_path):
    output = tmp_path / "google_assistant_entities.yaml"
    registry_path = tmp_path / ".hvls" / "ownership.json"
    registry = OwnershipRegistry(registry_path)
    registry.begin_create(
        entry_id="old-installation", output_path=str(output),
        next_sha256="a" * 64,
    )
    assert retire(repair, (output, registry_path)) is False
    assert registry.get_record("old-installation")["state"] == "pending_create"


def test_restore_hold_prevents_orphan_cleanup(repair, paths):
    output, registry_path = paths
    from hvls.owned_writer import _safe_path

    guard_path = registry_path.parent / "restore_reconciliation.json"
    guard_path.write_text("{}", encoding="utf-8")
    with pytest.raises(FileWriterError):
        retire(repair, paths)
    assert OwnershipRegistry(registry_path).get_record("old-installation")
    assert guard_path.exists()
    assert _safe_path(output) == output


def test_symlink_output_remains_protected(repair, paths):
    output, registry_path = paths
    real = output.parent / "old-renamed.yaml"
    real.write_text("switch.saved: {}\n", encoding="utf-8")
    output.symlink_to(real)
    with pytest.raises(FileWriterError):
        retire(repair, paths)
    assert real.read_text(encoding="utf-8") == "switch.saved: {}\n"
    assert OwnershipRegistry(registry_path).get_record("old-installation")


def test_new_owner_with_existing_claim_is_not_cleared(repair, paths):
    output, registry_path = paths
    # The new entry itself already being managed is not a fresh installation.
    registry = OwnershipRegistry(registry_path)
    other = output.parent / "other.yaml"
    registry.record_generation(
        entry_id="new-installation", output_path=str(other),
        sha256="b" * 64,
    )
    assert retire(repair, paths) is False
    assert registry.get_record("old-installation") is not None
    assert registry.get_record("new-installation") is not None
