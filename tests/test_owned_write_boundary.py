"""Shared HVLS ownership-aware filesystem write boundary."""

import hashlib

import pytest

from hvls import FileWriterError


def write(tmp_path, output, content, entry_id="installation-A"):
    from hvls.owned_writer import write_owned_output

    return write_owned_output(
        output_path=output,
        content=content,
        entry_id=entry_id,
        ownership_registry_path=tmp_path / ".hvls" / "ownership.json",
        backup_directory=tmp_path / "backups",
        retention=10,
        create_backup_enabled=True,
    )


def test_first_generation_creates_owned_file(tmp_path):
    from hvls.output_ownership_registry import OwnershipRegistry

    output = tmp_path / "generated.yaml"
    content = "light.salon:\n  expose: true\n"

    result = write(tmp_path, output, content)

    assert output.read_text(encoding="utf-8") == content
    assert result.backup_path is None

    registry = OwnershipRegistry(tmp_path / ".hvls" / "ownership.json")
    record = registry.get_record("installation-A")

    assert record["state"] == "managed"
    assert record["sha256"] == hashlib.sha256(content.encode()).hexdigest()


def test_managed_regeneration_preserves_backup(tmp_path):
    output = tmp_path / "generated.yaml"
    first = "light.salon:\n  expose: true\n"
    second = "light.cuisine:\n  expose: true\n"

    write(tmp_path, output, first)
    result = write(tmp_path, output, second)

    assert output.read_text(encoding="utf-8") == second
    assert result.backup_path is not None
    assert result.backup_path.read_text(encoding="utf-8") == first


def test_existing_manual_file_is_never_adopted(tmp_path):
    output = tmp_path / "manual.yaml"
    original = b"light.manual:\n  expose: false\n"
    output.write_bytes(original)

    with pytest.raises(
        (FileWriterError, ValueError),
        match=r"(?i)ownership|unmanaged|unauthorized|not owned",
    ):
        write(tmp_path, output, "light.salon: {}\n")

    assert output.read_bytes() == original
    assert not (tmp_path / "backups").exists()


def test_manually_modified_managed_file_is_protected(tmp_path):
    output = tmp_path / "generated.yaml"

    write(tmp_path, output, "light.original: {}\n")
    modified = b"light.manual_change: {}\n"
    output.write_bytes(modified)

    with pytest.raises((FileWriterError, ValueError)):
        write(tmp_path, output, "light.new: {}\n")

    assert output.read_bytes() == modified


def test_second_installation_cannot_claim_output(tmp_path):
    output = tmp_path / "generated.yaml"
    original = "light.original: {}\n"

    write(tmp_path, output, original, entry_id="installation-A")

    with pytest.raises((FileWriterError, ValueError)):
        write(
            tmp_path,
            output,
            "light.other: {}\n",
            entry_id="installation-B",
        )

    assert output.read_text(encoding="utf-8") == original


def test_dangling_symlink_is_not_created_or_overwritten(tmp_path):
    target = tmp_path / "missing.yaml"
    output = tmp_path / "generated.yaml"
    output.symlink_to(target)

    with pytest.raises((FileWriterError, ValueError)):
        write(tmp_path, output, "light.test: {}\n")

    assert output.is_symlink()
    assert not target.exists()
