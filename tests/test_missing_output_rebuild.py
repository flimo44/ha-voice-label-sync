"""Missing managed-output recovery must refuse all unsafe file and owner states."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType
from unittest.mock import patch

import pytest

from hvls import FileWriterError
from hvls.output_ownership_registry import OwnershipRegistry
from hvls.owned_writer import evaluate_registered_output, write_owned_output


@pytest.fixture
def repair(monkeypatch):
    prefix = "_test_hvls_missing_output"
    root = (
        Path(__file__).resolve().parents[1]
        / "custom_components" / "ha_voice_label_sync"
    )
    package = ModuleType(prefix)
    package.__path__ = [str(root)]
    monkeypatch.setitem(sys.modules, prefix, package)
    for name in ("restore_guard", "missing_output_rebuild"):
        spec = importlib.util.spec_from_file_location(
            f"{prefix}.{name}", root / f"{name}.py"
        )
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, spec.name, module)
        spec.loader.exec_module(module)
    return sys.modules[f"{prefix}.missing_output_rebuild"]


@pytest.fixture
def owned(tmp_path):
    output = tmp_path / "google_assistant_entities.yaml"
    registry = tmp_path / ".hvls" / "ownership.json"
    backup = tmp_path / ".hvls_backups"
    write_owned_output(
        output_path=output,
        content="switch.old:\n  expose: true\n",
        entry_id="installation-live",
        ownership_registry_path=registry,
        backup_directory=backup,
    )
    retained = tmp_path / "retained-original.yaml"
    output.rename(retained)
    return output, registry, retained


def rebuild(repair, owned, content="switch.new:\n  expose: true\n"):
    output, registry, _ = owned
    return repair.rebuild_missing_owned_output(
        output_path=output, content=content,
        entry_id="installation-live", ownership_registry_path=registry,
    )


def test_missing_managed_yaml_recreated_with_same_owner(repair, owned):
    output, registry, original = owned
    before = OwnershipRegistry(registry).get_record("installation-live")
    assert evaluate_registered_output(
        output, "installation-live", registry
    ).reason_code == "managed_output_missing"
    result = rebuild(repair, owned)
    assert result.backup_path is None
    assert output.read_text(encoding="utf-8") == "switch.new:\n  expose: true\n"
    assert original.read_text(encoding="utf-8") == "switch.old:\n  expose: true\n"
    after = OwnershipRegistry(registry).get_record("installation-live")
    assert after["sha256"] != before["sha256"]
    assert after["state"] == "managed"
    assert evaluate_registered_output(
        output, "installation-live", registry
    ).write_allowed is True


def test_rebuild_refuses_file_reappearing_and_preserves_old_claim(repair, owned):
    output, registry, _ = owned
    content = "switch.manually_restored: {}\n"
    output.write_text(content, encoding="utf-8")
    before = OwnershipRegistry(registry).get_record("installation-live")
    with pytest.raises(FileWriterError, match="reappeared"):
        rebuild(repair, owned)
    assert output.read_text(encoding="utf-8") == content
    assert OwnershipRegistry(registry).get_record("installation-live") == before


def test_rebuild_refuses_foreign_and_pending_ownership(repair, owned):
    output, registry_path, _ = owned
    old_record = OwnershipRegistry(registry_path).get_record("installation-live")
    with pytest.raises(FileWriterError, match="not managed"):
        repair.rebuild_missing_owned_output(
            output_path=output, content="switch.new: {}\n",
            entry_id="other-installation", ownership_registry_path=registry_path,
        )
    assert OwnershipRegistry(registry_path).get_record("installation-live") == old_record

    registry = OwnershipRegistry(registry_path)
    data = registry._load()
    data["records"]["installation-live"] = {
        "output_path": str(output), "state": "pending_create",
        "next_sha256": "a" * 64,
    }
    registry._save(data)
    with pytest.raises(FileWriterError, match="not managed"):
        rebuild(repair, owned)
    assert not output.exists()
    assert OwnershipRegistry(registry_path).get_record(
        "installation-live"
    )["state"] == "pending_create"


def test_rebuild_refuses_unsafe_symlink(repair, owned):
    output, registry, original = owned
    output.symlink_to(original)
    with pytest.raises(FileWriterError):
        rebuild(repair, owned)
    assert original.read_text(encoding="utf-8") == "switch.old:\n  expose: true\n"
    assert OwnershipRegistry(registry).get_record("installation-live")["state"] == "managed"


def test_rebuild_refuses_restore_hold_and_preserves_ownership(repair, owned):
    output, registry_path, _ = owned
    hold = registry_path.parent / "restore_reconciliation.json"
    hold.write_text("{}", encoding="utf-8")
    before = OwnershipRegistry(registry_path).get_record("installation-live")
    with pytest.raises(FileWriterError):
        rebuild(repair, owned)
    assert OwnershipRegistry(registry_path).get_record("installation-live") == before
    assert not output.exists()


def test_failed_exclusive_creation_leaves_durable_pending_for_recovery(
    repair, owned, monkeypatch,
):
    output, registry_path, _ = owned

    def failed_create(self, *, entry_id, content):
        raise ValueError("simulated interrupted create")

    monkeypatch.setattr(OwnershipRegistry, "create_reserved_output", failed_create)
    with pytest.raises(ValueError, match="simulated interrupted"):
        rebuild(repair, owned)
    assert not output.exists()
    state = OwnershipRegistry(registry_path).get_record("installation-live")
    assert state["state"] == "pending_create"
    assert evaluate_registered_output(
        output, "installation-live", registry_path
    ).write_allowed is False


def test_rebuild_does_not_create_without_review_entry_or_content(repair, owned):
    output, registry_path, _ = owned
    with pytest.raises(FileWriterError, match="empty"):
        rebuild(repair, owned, content="")
    with pytest.raises(FileWriterError, match="identity"):
        repair.rebuild_missing_owned_output(
            output_path=output, content="switch.new: {}\n",
            entry_id="", ownership_registry_path=registry_path,
        )
    assert not output.exists()


def test_rebuild_refuses_cross_claim_even_when_primary_owner_exists(repair, owned):
    output, registry_path, _ = owned
    registry = OwnershipRegistry(registry_path)
    data = registry._load()
    data["records"]["another-installation"] = {
        "state": "managed", "output_path": str(output), "sha256": "c" * 64,
    }
    registry._save(data)
    with pytest.raises(ValueError, match="claimed"):
        rebuild(repair, owned)
    assert not output.exists()
    assert registry.get_record("installation-live")["state"] == "managed"
