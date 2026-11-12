"""Recovery, isolation and concurrency tests for the HVLS writer."""

import multiprocessing
from pathlib import Path

import pytest

from hvls import FileWriterError
from hvls.output_ownership_registry import OwnershipRegistry
from hvls import owned_writer


def write(root, content, *, entry_id="A", registry_path=None, retention=10):
    output = root / "generated.yaml"
    registry = registry_path or root / ".hvls" / "ownership.json"

    return owned_writer.write_owned_output(
        output_path=output,
        content=content,
        entry_id=entry_id,
        ownership_registry_path=registry,
        backup_directory=root / "backups",
        retention=retention,
        create_backup_enabled=True,
    )


def registry(root):
    return OwnershipRegistry(root / ".hvls" / "ownership.json")


def test_failed_creation_keeps_pending_reservation(tmp_path, monkeypatch):
    def fail_create(self, *, entry_id, content):
        raise ValueError("Simulated creation interruption")

    with monkeypatch.context() as patch:
        patch.setattr(OwnershipRegistry, "create_reserved_output", fail_create)

        with pytest.raises(ValueError):
            write(tmp_path, "light.test: {}\n")

    assert not (tmp_path / "generated.yaml").exists()
    assert registry(tmp_path).get_record("A")["state"] == "pending_create"

    # No automatic retry after an interrupted transaction.
    with pytest.raises((FileWriterError, ValueError)):
        write(tmp_path, "light.test: {}\n")


def test_failed_replacement_keeps_pending_state(tmp_path, monkeypatch):
    output = tmp_path / "generated.yaml"
    original = "light.original: {}\n"
    write(tmp_path, original)

    with monkeypatch.context() as patch:
        def disk_failure(**kwargs):
            raise OSError("Simulated disk failure")

        patch.setattr(owned_writer, "write_with_backup", disk_failure)

        with pytest.raises(OSError):
            write(tmp_path, "light.updated: {}\n")

    assert output.read_text() == original
    assert registry(tmp_path).get_record("A")["state"] == "pending"

    with pytest.raises((FileWriterError, ValueError)):
        write(tmp_path, "light.updated: {}\n")


def test_failed_registry_confirmation_blocks_retry(tmp_path, monkeypatch):
    output = tmp_path / "generated.yaml"
    write(tmp_path, "light.original: {}\n")
    updated = "light.updated: {}\n"

    with monkeypatch.context() as patch:
        def fail_confirmation(self, *, entry_id, actual_sha256):
            raise ValueError("Simulated registry confirmation failure")

        patch.setattr(OwnershipRegistry, "complete_write", fail_confirmation)

        with pytest.raises(ValueError):
            write(tmp_path, updated)

    # File changed, but registry did not confirm the transaction.
    assert output.read_text() == updated
    assert registry(tmp_path).get_record("A")["state"] == "pending"

    with pytest.raises((FileWriterError, ValueError)):
        write(tmp_path, updated)


def test_external_creation_during_reservation_is_not_overwritten(
    tmp_path, monkeypatch
):
    output = tmp_path / "generated.yaml"
    external = b"light.external: {}\n"

    original_method = OwnershipRegistry.create_reserved_output

    def external_race(self, *, entry_id, content):
        output.write_bytes(external)
        return original_method(self, entry_id=entry_id, content=content)

    with monkeypatch.context() as patch:
        patch.setattr(
            OwnershipRegistry, "create_reserved_output", external_race
        )

        with pytest.raises((FileWriterError, ValueError)):
            write(tmp_path, "light.generated: {}\n")

    assert output.read_bytes() == external
    assert registry(tmp_path).get_record("A")["state"] == "pending_create"


def test_corrupted_registry_is_not_silently_replaced(tmp_path):
    path = tmp_path / ".hvls" / "ownership.json"
    path.parent.mkdir()
    path.write_text("{invalid", encoding="utf-8")

    with pytest.raises((FileWriterError, ValueError)):
        write(tmp_path, "light.test: {}\n")

    assert path.read_text(encoding="utf-8") == "{invalid"
    assert not (tmp_path / "generated.yaml").exists()


def test_registry_cannot_be_same_file_as_output(tmp_path):
    output = tmp_path / "generated.yaml"

    with pytest.raises((FileWriterError, ValueError)):
        write(
            tmp_path,
            "light.test: {}\n",
            registry_path=output,
        )

    # Even a refused operation must not create a corrupt output.
    assert not output.exists()


def test_invalid_retention_is_rejected_before_creation(tmp_path):
    with pytest.raises((FileWriterError, ValueError)):
        write(tmp_path, "light.test: {}\n", retention=-1)

    assert not (tmp_path / "generated.yaml").exists()
    assert registry(tmp_path).get_record("A") is None


def _race_worker(root, entry_id, start, results):
    try:
        from hvls.owned_writer import write_owned_output

        directory = Path(root)
        start.wait(timeout=10)

        write_owned_output(
            output_path=directory / "generated.yaml",
            content=f"light.{entry_id.lower()}: {{}}\n",
            entry_id=entry_id,
            ownership_registry_path=directory / ".hvls" / "ownership.json",
            backup_directory=directory / "backups",
        )

        results.put("written")

    except (FileWriterError, ValueError):
        results.put("refused")
    except Exception as exc:
        results.put(f"unexpected: {type(exc).__name__}: {exc}")


def test_two_processes_cannot_claim_same_output(tmp_path):
    # Docker's Linux environment supports fork and flock.
    ctx = multiprocessing.get_context("fork")
    start = ctx.Event()
    results = ctx.Queue()

    processes = [
        ctx.Process(
            target=_race_worker,
            args=(str(tmp_path), entry_id, start, results),
        )
        for entry_id in ("A", "B")
    ]

    for process in processes:
        process.start()

    start.set()

    for process in processes:
        process.join(timeout=10)
        if process.is_alive():
            process.terminate()
            process.join(timeout=5)

    assert all(process.exitcode == 0 for process in processes)

    outcomes = [results.get(timeout=5) for _ in processes]

    assert sorted(outcomes) == ["refused", "written"]

    records = registry(tmp_path)._load()["records"]
    assert len(records) == 1
    assert next(iter(records.values()))["state"] == "managed"


def test_external_edit_during_write_must_not_be_overwritten(
    tmp_path, monkeypatch
):
    """An external edit after the initial check must survive."""
    output = tmp_path / "generated.yaml"

    write(tmp_path, "light.original: {}\n")

    external_content = b"light.external_change: {}\n"
    original_writer = owned_writer.write_with_backup

    def simulate_external_edit(**kwargs):
        # Simulate an independent application changing the YAML
        # immediately before the existing filesystem writer runs.
        output.write_bytes(external_content)
        return original_writer(**kwargs)

    monkeypatch.setattr(
        owned_writer,
        "write_with_backup",
        simulate_external_edit,
    )

    with pytest.raises((FileWriterError, ValueError)):
        write(tmp_path, "light.updated: {}\n")

    assert output.read_bytes() == external_content


def test_generation_never_overwrites_existing_backup(
    tmp_path, monkeypatch
):
    """A standard generation must preserve an existing safety backup."""
    from datetime import datetime
    import hvls.writers.filesystem as filesystem

    class FrozenDatetime:
        @staticmethod
        def now():
            return datetime(2026, 11, 12, 12, 34, 56)

    original = "light.original: {}\n"
    write(tmp_path, original)

    directory = tmp_path / "backups"
    directory.mkdir(exist_ok=True)

    # Simulate a safety backup created earlier in the same second.
    existing = directory / "generated.yaml.20261112-123456.bak"
    protected_content = b"IRREPLACEABLE SAFETY BACKUP\n"
    existing.write_bytes(protected_content)

    monkeypatch.setattr(filesystem, "datetime", FrozenDatetime)

    result = write(tmp_path, "light.updated: {}\n")

    # The original safety copy must remain untouched.
    assert existing.read_bytes() == protected_content

    # A distinct backup must preserve the pre-generation YAML.
    assert result.backup_path is not None
    assert result.backup_path != existing
    assert result.backup_path.read_text() == original

    assert (
        tmp_path / "generated.yaml"
    ).read_text() == "light.updated: {}\n"
