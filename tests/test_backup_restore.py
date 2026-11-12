"""Safety and regression tests for beta.4 backup review and restore."""

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
    """Restore must record the new SHA and permit later generation."""
    import hashlib

    from hvls.output_ownership_registry import OwnershipRegistry
    from hvls.owned_writer import write_owned_output

    output, backup_id, backup = sample
    make_owned(output)

    review = backup_module.review_backup(output, backup_id)

    restore(
        backup_module,
        output,
        backup_id,
        review["backup_sha256"],
        review["production_sha256"],
    )

    registry_path = output.parent / ".hvls" / "ownership.json"
    record = OwnershipRegistry(registry_path).get_record("test-installation")

    assert record["state"] == "managed"
    assert record["sha256"] == hashlib.sha256(
        backup.read_bytes()
    ).hexdigest()

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
