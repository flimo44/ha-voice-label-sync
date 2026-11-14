"""Safety and regression tests for beta.4 backup review and restore."""

import hashlib
import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import pytest


def restore(backup_module, output, backup_id, backup_sha, production_sha):
    return backup_module.restore_reviewed_backup(
        output,
        backup_id,
        backup_sha,
        production_sha,
        entry_id="test-installation",
        ownership_registry_path=output.parent / ".hvls" / "ownership.json",
    )


def make_owned(output):
    from hvls.owned_writer import write_owned_output

    content = output.read_text(encoding="utf-8")
    output.unlink()

    write_owned_output(
        output_path=output,
        content=content,
        entry_id="test-installation",
        ownership_registry_path=output.parent / ".hvls" / "ownership.json",
        backup_directory=output.parent / ".hvls_backups",
    )


@pytest.fixture
def backup_module(monkeypatch):
    prefix = "_test_hvls_restore"
    package = ModuleType(prefix)
    package.__path__ = []
    monkeypatch.setitem(sys.modules, prefix, package)

    component = (
        Path(__file__).resolve().parents[1] / "custom_components/ha_voice_label_sync"
    )
    for name in ("preview_compare", "preview_guard", "restore_guard", "backup_restore"):
        spec = importlib.util.spec_from_file_location(
            f"{prefix}.{name}", component / f"{name}.py"
        )
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, spec.name, module)
        spec.loader.exec_module(module)
    module = sys.modules[f"{prefix}.backup_restore"]
    module._guard = sys.modules[f"{prefix}.restore_guard"]
    return module


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



def test_backup_candidate_prepares_preview_and_labels_without_mutating_files(
    backup_module, tmp_path,
):
    """52→40-equivalent removal and 40→52 addition use the same direction."""
    output = tmp_path / "google_entities.yaml"
    output.write_text(
        "switch.a:\n  expose: true\nswitch.b:\n  expose: true\n",
        encoding="utf-8",
    )
    backup_dir = tmp_path / ".hvls_backups"
    backup_dir.mkdir()
    backup_id = "google_entities.yaml.20261114-010000.bak"
    backup = backup_dir / backup_id
    backup.write_text(
        "switch.a:\n  expose: true\nswitch.c:\n  expose: true\n",
        encoding="utf-8",
    )
    catalog = {"labeled": 2, "entities": [
        {"entity_id": "switch.a", "eligible": True, "has_label": True},
        {"entity_id": "switch.b", "eligible": True, "has_label": True},
        {"entity_id": "switch.c", "eligible": True, "has_label": False},
    ]}
    review = backup_module.review_backup(output, backup_id)
    before = output.read_bytes()
    result = backup_module.prepare_backup_preview(
        output, backup_id, review["backup_sha256"],
        review["production_sha256"], catalog,
    )
    assert result["mode"] == "restore_preview"
    assert result["can_apply"] is False
    assert result["production_summary"]["total"] == 2
    assert result["summary"]["total"] == 2
    assert result["comparison"]["added"] == ["switch.c"]
    assert result["comparison"]["removed"] == ["switch.b"]
    assert result["label_plan"]["add"] == ["switch.c"]
    assert result["label_plan"]["remove"] == ["switch.b"]
    assert result["label_plan"]["review"] == []
    assert output.read_bytes() == before
    assert backup.read_bytes() == result["content"].encode()
    assert not (tmp_path / ".hvls").exists()


def test_backup_candidate_lists_missing_or_ineligible_entities_for_review(
    backup_module, tmp_path,
):
    output = tmp_path / "google_entities.yaml"
    output.write_text("switch.a:\n  expose: true\n", encoding="utf-8")
    backups = tmp_path / ".hvls_backups"
    backups.mkdir()
    backup_id = "google_entities.yaml.20261114-010001.bak"
    (backups / backup_id).write_text(
        "switch.a:\n  expose: true\n"
        "switch.disabled:\n  expose: true\n"
        "switch.missing:\n  expose: true\n"
        "switch.no_expose:\n  name: Old\n",
        encoding="utf-8",
    )
    catalog = {"labeled": 1, "entities": [
        {"entity_id": "switch.a", "eligible": True, "has_label": True},
        {"entity_id": "switch.disabled", "eligible": False, "has_label": False,
         "exclusion_reason": "disabled"},
    ]}
    review = backup_module.review_backup(output, backup_id)
    result = backup_module.prepare_backup_preview(
        output, backup_id, review["backup_sha256"],
        review["production_sha256"], catalog,
    )
    reasons = {entry["entity_id"]: entry["reason"]
               for entry in result["label_plan"]["review"]}
    assert reasons == {
        "switch.disabled": "disabled",
        "switch.missing": "missing_ha_entity",
        "switch.no_expose": "not_explicitly_exposed",
    }
    assert result["label_plan"]["add"] == []


def test_backup_candidate_rejects_stale_production_and_backup(
    backup_module, tmp_path,
):
    output = tmp_path / "google_entities.yaml"
    output.write_text("switch.a:\n  expose: true\n", encoding="utf-8")
    backups = tmp_path / ".hvls_backups"
    backups.mkdir()
    backup_id = "google_entities.yaml.20261114-010002.bak"
    backup = backups / backup_id
    backup.write_text("switch.b:\n  expose: true\n", encoding="utf-8")
    review = backup_module.review_backup(output, backup_id)
    output.write_text("switch.changed:\n  expose: true\n", encoding="utf-8")
    with pytest.raises(backup_module.PreviewChangedError, match="Production changed"):
        backup_module.prepare_backup_preview(
            output, backup_id, review["backup_sha256"],
            review["production_sha256"], {"entities": []},
        )
    output.write_text("switch.a:\n  expose: true\n", encoding="utf-8")
    backup.write_text("switch.changed:\n  expose: true\n", encoding="utf-8")
    with pytest.raises(backup_module.PreviewChangedError, match="backup changed|Selected backup changed"):
        backup_module.prepare_backup_preview(
            output, backup_id, review["backup_sha256"],
            review["production_sha256"], {"entities": []},
        )

def test_restore_creates_mandatory_safety_copy(backup_module, sample):
    output, backup_id, source = sample
    make_owned(output)
    initial = output.read_text()
    review = backup_module.review_backup(output, backup_id)
    result = restore(backup_module,
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
        restore(backup_module,
            output, backup_id, review["backup_sha256"], review["production_sha256"]
        )
    assert output.read_text() == "switch.external: {}\n"


def test_changed_backup_refused(backup_module, sample):
    output, backup_id, source = sample
    review = backup_module.review_backup(output, backup_id)
    source.write_text("switch.changed: {}\n")
    with pytest.raises(backup_module.PreviewChangedError, match="backup changed"):
        restore(backup_module,
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
        restore(backup_module,
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
    make_owned(output)
    marker = output.parent / "entity_registry.json"
    marker.write_text('{"labels":["google_assistant","other"]}')
    review = backup_module.review_backup(output, backup_id)
    restore(backup_module,
        output, backup_id, review["backup_sha256"], review["production_sha256"]
    )
    assert marker.read_text() == '{"labels":["google_assistant","other"]}'


def test_empty_backup_not_offered_or_restored(backup_module, sample):
    output, backup_id, source = sample
    source.write_text("", encoding="utf-8")
    assert backup_module.list_backups(output)["backups"] == []
    with pytest.raises(backup_module.BackupRestoreError, match="empty"):
        backup_module.review_backup(output, backup_id)


def test_restore_refuses_unmanaged_production(backup_module, sample, tmp_path):
    """Reviewed backup tokens do not prove ownership of production."""
    from hvls import FileWriterError

    output, backup_id, _ = sample
    original = output.read_bytes()
    backup_directory = tmp_path / ".hvls_backups"
    existing_backups = {p.name for p in backup_directory.iterdir()}

    review = backup_module.review_backup(output, backup_id)

    with pytest.raises(
        (backup_module.BackupRestoreError, FileWriterError),
        match=r"(?i)ownership|unmanaged|not owned|unauthorized",
    ):
        restore(backup_module,
            output,
            backup_id,
            review["backup_sha256"],
            review["production_sha256"],
        )

    assert output.read_bytes() == original
    assert {p.name for p in backup_directory.iterdir()} == existing_backups


def test_restore_refuses_externally_modified_owned_file(
    backup_module, sample, tmp_path
):
    """A valid review cannot override a broken ownership digest."""
    from hvls import FileWriterError
    from hvls.owned_writer import write_owned_output

    output, backup_id, _ = sample
    original_owned_content = "switch.owned:\n  expose: true\n"

    # Replace the test fixture with a genuinely HVLS-owned output.
    output.unlink()

    write_owned_output(
        output_path=output,
        content=original_owned_content,
        entry_id="test-installation",
        ownership_registry_path=tmp_path / ".hvls" / "ownership.json",
        backup_directory=tmp_path / ".hvls_backups",
    )

    # Simulate a manual modification BEFORE the review.
    external_content = b"switch.manual_change:\n  expose: true\n"
    output.write_bytes(external_content)

    # Review hashes match the modified production, but ownership does not.
    review = backup_module.review_backup(output, backup_id)

    with pytest.raises(
        (backup_module.BackupRestoreError, FileWriterError),
        match=r"(?i)ownership|unmanaged|changed|not owned|unauthorized",
    ):
        restore(backup_module,
            output,
            backup_id,
            review["backup_sha256"],
            review["production_sha256"],
        )

    assert output.read_bytes() == external_content


def test_restore_updates_ownership_digest(backup_module, sample):
    """Restore records SHA and holds future HVLS writes until reconciled."""
    from hvls import FileWriterError
    from hvls.output_ownership_registry import OwnershipRegistry
    from hvls.owned_writer import write_owned_output

    output, backup_id, backup = sample
    make_owned(output)
    review = backup_module.review_backup(output, backup_id)
    restore(
        backup_module, output, backup_id,
        review["backup_sha256"], review["production_sha256"],
    )
    registry_path = output.parent / ".hvls" / "ownership.json"
    record = OwnershipRegistry(registry_path).get_record("test-installation")
    assert record["state"] == "managed"
    assert record["sha256"] == hashlib.sha256(backup.read_bytes()).hexdigest()
    assert backup_module._guard.guard_path(registry_path).is_file()
    with pytest.raises(FileWriterError, match="reconciliation"):
        backup_module._guard.assert_not_guarded(
            registry_path, "test-installation", output,
        )
    preview_path = output.parent / ".hvls" / "preview.yaml"
    preview_path.write_text("switch.new:\n  expose: true\n")
    result = backup_module.resolve_restored_output(
        output, preview_path, entry_id="test-installation",
        ownership_registry_path=registry_path,
        production_sha256=backup_module.preview_digest(output.read_text()),
        preview_sha256=backup_module.preview_digest(preview_path.read_text()),
        resolution="keep_current_labels", confirmed=True,
        generated_content=preview_path.read_text(),
    )
    assert result["resolved"] is True
    assert result["apply_performed"] is False
    assert backup_module._guard.read_guard(registry_path) is None
    write_owned_output(
        output_path=output,
        content="switch.after_restore:\n  expose: true\n",
        entry_id="test-installation",
        ownership_registry_path=registry_path,
        backup_directory=output.parent / ".hvls_backups",
    )
    assert "switch.after_restore:" in output.read_text()

def test_generation_retention_preserves_restore_safety_backup(
    backup_module, sample
):
    """Ordinary retention must not remove mandatory Restore safety copies."""
    from hvls.owned_writer import write_owned_output

    output, backup_id, _ = sample
    make_owned(output)

    review = backup_module.review_backup(output, backup_id)

    result = restore(
        backup_module,
        output,
        backup_id,
        review["backup_sha256"],
        review["production_sha256"],
    )

    safety_path = output.parent / ".hvls_backups" / result["safety_backup"]
    safety_content = safety_path.read_bytes()

    preview_path = output.parent / ".hvls" / "preview.yaml"
    preview_path.write_text(output.read_text())
    backup_module.resolve_restored_output(
        output, preview_path, entry_id="test-installation",
        ownership_registry_path=output.parent / ".hvls" / "ownership.json",
        production_sha256=backup_module.preview_digest(output.read_text()),
        preview_sha256=backup_module.preview_digest(preview_path.read_text()),
        resolution="keep_restored", confirmed=True,
        generated_content=preview_path.read_text(),
    )

    write_owned_output(
        output_path=output,
        content="switch.new_generation:\n  expose: true\n",
        entry_id="test-installation",
        ownership_registry_path=output.parent / ".hvls" / "ownership.json",
        backup_directory=output.parent / ".hvls_backups",
        retention=0,
    )

    assert safety_path.exists()
    assert safety_path.read_bytes() == safety_content


def test_restore_safety_backup_remains_reviewable(backup_module, sample):
    """Safety backups must remain discoverable and restorable."""
    output, backup_id, _ = sample
    make_owned(output)

    review = backup_module.review_backup(output, backup_id)

    result = restore(
        backup_module,
        output,
        backup_id,
        review["backup_sha256"],
        review["production_sha256"],
    )

    safety_id = result["safety_backup"]
    assert safety_id.endswith(".safety.bak")

    listed_ids = {
        item["id"]
        for item in backup_module.list_backups(output)["backups"]
    }

    assert safety_id in listed_ids
    assert backup_id in listed_ids

    safety_review = backup_module.review_backup(output, safety_id)
    assert safety_review["backup_id"] == safety_id



def test_restore_reconcile_real_three_four_cycle(backup_module, tmp_path):
    """Restore 4 and block HVLS Apply that would rewrite the old 3."""
    from hvls import FileWriterError

    output = tmp_path / "google_entities.yaml"
    preview_dir = tmp_path / ".hvls"
    preview_dir.mkdir()
    registry_path = preview_dir / "ownership.json"
    backup_dir = tmp_path / ".hvls_backups"
    backup_dir.mkdir()
    preview_path = preview_dir / "preview.yaml"
    original = (
        "switch.one:\n  expose: true\n"
        "switch.two:\n  expose: true\n"
        "switch.three:\n  expose: true\n"
    )
    restored = original + "switch.piscine_chauffage:\n  expose: true\n"
    output.write_text(original)
    make_owned(output)
    backup_id = "google_entities.yaml.20261113-150000.bak"
    (backup_dir / backup_id).write_text(restored)
    preview_path.write_text(original)
    review = backup_module.review_backup(output, backup_id)
    result = restore(
        backup_module, output, backup_id,
        review["backup_sha256"], review["production_sha256"],
    )
    assert result["reconciliation_required"] is True
    assert output.read_text() == restored
    assert backup_module.analyze_preview(
        preview_path.read_text(), output.read_text()
    )["comparison"]["removed"] == ["switch.piscine_chauffage"]
    with pytest.raises(FileWriterError, match="reconciliation"):
        backup_module._guard.assert_not_guarded(
            registry_path, "test-installation", output,
        )
    assert output.read_text() == restored
    preview_path.write_text(restored)
    resolved = backup_module.resolve_restored_output(
        output, preview_path, entry_id="test-installation",
        ownership_registry_path=registry_path,
        production_sha256=backup_module.preview_digest(restored),
        preview_sha256=backup_module.preview_digest(restored),
        resolution="keep_restored", confirmed=True,
        generated_content=preview_path.read_text(),
    )
    assert resolved["resolved"] is True
    assert resolved["production_unchanged"] is True
    assert output.read_text() == restored
    assert backup_module._guard.read_guard(registry_path) is None

def test_restore_reconciliation_refuses_unaligned_or_stale(
    backup_module, sample
):
    output, backup_id, _ = sample
    make_owned(output)
    review = backup_module.review_backup(output, backup_id)
    restore(
        backup_module, output, backup_id,
        review["backup_sha256"], review["production_sha256"],
    )
    registry_path = output.parent / ".hvls" / "ownership.json"
    preview_path = output.parent / ".hvls" / "preview.yaml"
    preview_path.write_text("switch.only_three:\n  expose: true\n")
    current = backup_module.preview_digest(output.read_text())
    preview_sha = backup_module.preview_digest(preview_path.read_text())
    common = dict(
        entry_id="test-installation", ownership_registry_path=registry_path,
        production_sha256=current, preview_sha256=preview_sha,
    )
    with pytest.raises(backup_module.BackupRestoreError, match="not yet aligned"):
        backup_module.resolve_restored_output(
            output, preview_path, **common,
            resolution="keep_restored", confirmed=True,
        generated_content=preview_path.read_text(),
        )
    with pytest.raises(backup_module.BackupRestoreError, match="Explicit"):
        backup_module.resolve_restored_output(
            output, preview_path, **common,
            resolution="keep_current_labels", confirmed=False,
            generated_content=preview_path.read_text(),
        )
    with pytest.raises(backup_module.PreviewChangedError, match="changed"):
        backup_module.resolve_restored_output(
            output, preview_path,
            **{**common, "preview_sha256": "f" * 64},
            resolution="keep_current_labels", confirmed=True,
        generated_content=preview_path.read_text(),
        )
    assert backup_module._guard.guard_path(registry_path).is_file()
    assert "switch.new" in output.read_text()



def test_restore_failure_keeps_guard_until_explicit_cancel(
    backup_module, sample, monkeypatch
):
    from hvls import FileWriterError

    output, backup_id, _ = sample
    make_owned(output)
    original = output.read_bytes()
    review = backup_module.review_backup(output, backup_id)

    def fail_before_write(**_kwargs):
        raise FileWriterError("simulated crash before disk write")

    monkeypatch.setattr(backup_module, "write_owned_output", fail_before_write)
    with pytest.raises(backup_module.BackupRestoreError):
        restore(
            backup_module, output, backup_id,
            review["backup_sha256"], review["production_sha256"],
        )
    registry_path = output.parent / ".hvls" / "ownership.json"
    assert output.read_bytes() == original
    assert backup_module._guard.guard_path(registry_path).exists()
    with pytest.raises(FileWriterError, match="reconciliation"):
        backup_module._guard.assert_not_guarded(
            registry_path, "test-installation", output,
        )
    preview_path = output.parent / ".hvls" / "preview.yaml"
    preview_path.write_text(output.read_text())
    resolved = backup_module.resolve_restored_output(
        output, preview_path, entry_id="test-installation",
        ownership_registry_path=registry_path,
        production_sha256=backup_module.preview_digest(output.read_text()),
        preview_sha256=backup_module.preview_digest(preview_path.read_text()),
        generated_content=preview_path.read_text(),
        resolution="cancel_failed", confirmed=True,
    )
    assert resolved["resolved"] is True
    assert not backup_module._guard.guard_path(registry_path).exists()
    assert output.read_bytes() == original

def test_corrupt_guard_fails_closed_for_hvls_writes(backup_module, tmp_path):
    from hvls import FileWriterError

    output = tmp_path / "google_entities.yaml"
    output.write_text("switch.one:\n  expose: true\n")
    make_owned(output)
    registry = tmp_path / ".hvls" / "ownership.json"
    backup_module._guard.guard_path(registry).write_text("{invalid")
    with pytest.raises(FileWriterError, match="restore guard"):
        backup_module._guard.assert_not_guarded(
            registry, "test-installation", output,
        )
    assert "switch.one" in output.read_text()

def test_reconciliation_rejects_forged_or_stale_preview(
    backup_module, sample
):
    output, backup_id, _ = sample
    make_owned(output)
    review = backup_module.review_backup(output, backup_id)
    restore(
        backup_module, output, backup_id,
        review["backup_sha256"], review["production_sha256"],
    )
    preview = output.parent / ".hvls" / "preview.yaml"
    preview.write_text(output.read_text())
    with pytest.raises(backup_module.PreviewChangedError, match="live HA labels"):
        backup_module.resolve_restored_output(
            output, preview, entry_id="test-installation",
            ownership_registry_path=output.parent / ".hvls" / "ownership.json",
            production_sha256=backup_module.preview_digest(output.read_text()),
            preview_sha256=backup_module.preview_digest(preview.read_text()),
            generated_content="switch.different:\n  expose: true\n",
            resolution="keep_restored", confirmed=True,
        )
