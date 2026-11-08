"""Safety and regression tests for beta.4 backup review and restore."""

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import pytest


@pytest.fixture
def backup_module(monkeypatch):
    prefix = "_test_hvls_restore"
    package = ModuleType(prefix)
    package.__path__ = []
    monkeypatch.setitem(sys.modules, prefix, package)

    component = (
        Path(__file__).resolve().parents[1] / "custom_components/ha_voice_label_sync"
    )
    for name in ("preview_compare", "preview_guard", "backup_restore"):
        spec = importlib.util.spec_from_file_location(
            f"{prefix}.{name}", component / f"{name}.py"
        )
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, spec.name, module)
        spec.loader.exec_module(module)
    return sys.modules[f"{prefix}.backup_restore"]


@pytest.fixture
def sample(tmp_path):
    production = tmp_path / "google_entities.yaml"
    production.write_text(
        "switch.old:\n  expose: true\nswitch.keep:\n  name: Production\n",
        encoding="utf-8",
    )
    backup_dir = tmp_path / ".hvls_backups"
    backup_dir.mkdir()
    backup_id = "google_entities.yaml.20261108-220000.bak"
    backup = backup_dir / backup_id
    backup.write_text(
        "switch.new:\n  expose: true\nswitch.keep:\n  name: Snapshot\n",
        encoding="utf-8",
    )
    return production, backup_id, backup


def test_list_only_valid_backups(backup_module, sample, tmp_path):
    output, backup_id, _ = sample
    root = output.parent / ".hvls_backups"
    (root / "another_file.20261108-220000.bak").write_text("switch.x: {}\n")
    (root / "google_entities.yaml.20261107-220000.bak").write_text("invalid: [")
    entries = backup_module.list_backups(output)["backups"]
    assert [item["id"] for item in entries] == [backup_id]
    assert len(entries[0]["sha256"]) == 64


def test_review_direction_is_restoration(backup_module, sample):
    output, backup_id, _ = sample
    result = backup_module.review_backup(output, backup_id)
    diff = result["comparison"]
    assert diff["added"] == ["switch.new"]
    assert diff["removed"] == ["switch.old"]
    assert diff["modified"][0]["entity_id"] == "switch.keep"
    assert diff["modified"][0]["fields"]["name"] == {
        "before": "Production", "after": "Snapshot"
    }
    assert diff["identical_text"] is False


def test_restore_creates_mandatory_safety_copy(backup_module, sample):
    output, backup_id, source = sample
    initial = output.read_text()
    review = backup_module.review_backup(output, backup_id)
    result = backup_module.restore_reviewed_backup(
        output, backup_id, review["backup_sha256"], review["production_sha256"]
    )
    assert result["restored"] is True
    assert output.read_text() == source.read_text()
    safety = output.parent / ".hvls_backups" / result["safety_backup"]
    assert safety.is_file()
    assert safety.read_text() == initial
    assert safety.name != backup_id


def test_changed_production_refused(backup_module, sample):
    output, backup_id, _ = sample
    review = backup_module.review_backup(output, backup_id)
    output.write_text("switch.external: {}\n")
    with pytest.raises(backup_module.PreviewChangedError, match="Production changed"):
        backup_module.restore_reviewed_backup(
            output, backup_id, review["backup_sha256"], review["production_sha256"]
        )
    assert output.read_text() == "switch.external: {}\n"


def test_changed_backup_refused(backup_module, sample):
    output, backup_id, source = sample
    review = backup_module.review_backup(output, backup_id)
    source.write_text("switch.changed: {}\n")
    with pytest.raises(backup_module.PreviewChangedError, match="backup changed"):
        backup_module.restore_reviewed_backup(
            output, backup_id, review["backup_sha256"], review["production_sha256"]
        )


@pytest.mark.parametrize(
    "bad_id",
    ["../google_entities.yaml", "../../configuration.yaml",
     "/config/configuration.yaml", "other_file.20261108-220000.bak",
     "google_entities.yaml.20261108-220000.bak/../x"],
)
def test_invalid_backup_ids_refused(backup_module, sample, bad_id):
    output, _, _ = sample
    with pytest.raises(backup_module.BackupRestoreError):
        backup_module.review_backup(output, bad_id)


def test_symlink_backup_never_listed(backup_module, sample):
    output, backup_id, source = sample
    source.unlink()
    source.symlink_to(output)
    assert backup_module.list_backups(output)["backups"] == []
    with pytest.raises(backup_module.BackupRestoreError):
        backup_module.review_backup(output, backup_id)


def test_invalid_tokens_refused(backup_module, sample):
    output, backup_id, _ = sample
    with pytest.raises(backup_module.BackupRestoreError, match="Invalid review"):
        backup_module.restore_reviewed_backup(
            output, backup_id, "invalid", "f" * 64
        )


def test_invalid_production_prevents_review(backup_module, sample):
    output, backup_id, _ = sample
    output.write_text("switch.bad: [")
    with pytest.raises(backup_module.BackupRestoreError, match="invalid"):
        backup_module.review_backup(output, backup_id)


def test_restore_does_not_touch_other_labels(backup_module, sample):
    # Restore writes only the output YAML, never HA registries.
    output, backup_id, _ = sample
    marker = output.parent / "entity_registry.json"
    marker.write_text('{"labels":["google_assistant","other"]}')
    review = backup_module.review_backup(output, backup_id)
    backup_module.restore_reviewed_backup(
        output, backup_id, review["backup_sha256"], review["production_sha256"]
    )
    assert marker.read_text() == '{"labels":["google_assistant","other"]}'


def test_empty_backup_not_offered_or_restored(backup_module, sample):
    output, backup_id, source = sample
    source.write_text("", encoding="utf-8")
    assert backup_module.list_backups(output)["backups"] == []
    with pytest.raises(backup_module.BackupRestoreError, match="empty"):
        backup_module.review_backup(output, backup_id)
