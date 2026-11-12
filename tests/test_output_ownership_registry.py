"""Durable ownership registry: recovery and safety contract."""


import pytest

from hvls.output_ownership_registry import OwnershipRegistry


def test_record_survives_restart(tmp_path):
    path = tmp_path / "ownership.json"

    registry = OwnershipRegistry(path)
    registry.record_generation(
        entry_id="installation-A",
        output_path="/config/generated.yaml",
        sha256="a" * 64,
    )

    restarted = OwnershipRegistry(path)
    record = restarted.get_record("installation-A")

    assert record is not None
    assert record["output_path"] == "/config/generated.yaml"
    assert record["sha256"] == "a" * 64
    assert record["state"] == "managed"


def test_other_installation_cannot_claim_record(tmp_path):
    path = tmp_path / "ownership.json"

    registry = OwnershipRegistry(path)
    registry.record_generation(
        entry_id="installation-A",
        output_path="/config/generated.yaml",
        sha256="b" * 64,
    )

    restarted = OwnershipRegistry(path)

    assert restarted.get_record("installation-B") is None



def test_pending_operation_survives_restart(tmp_path):
    import hashlib

    path = tmp_path / "ownership.json"
    output = tmp_path / "generated.yaml"
    old = b"ancienne configuration\\n"
    new = b"nouvelle configuration\\n"
    output.write_bytes(old)

    old_sha = hashlib.sha256(old).hexdigest()
    new_sha = hashlib.sha256(new).hexdigest()

    registry = OwnershipRegistry(path)
    registry.record_generation(
        entry_id="installation-A",
        output_path=str(output),
        sha256=old_sha,
    )

    registry.begin_write(
        entry_id="installation-A",
        output_path=str(output),
        expected_sha256=old_sha,
        next_sha256=new_sha,
    )

    restarted = OwnershipRegistry(path)
    record = restarted.get_record("installation-A")

    assert record["state"] == "pending"
    assert record["expected_sha256"] == old_sha
    assert record["next_sha256"] == new_sha
    assert restarted.can_write("installation-A") is False

def test_corrupted_registry_fails_closed(tmp_path):
    path = tmp_path / "ownership.json"
    path.write_text("{invalid json", encoding="utf-8")

    registry = OwnershipRegistry(path)

    assert registry.can_write("installation-A") is False

    with pytest.raises(ValueError):
        registry.record_generation(
            entry_id="installation-A",
            output_path="/config/generated.yaml",
            sha256="a" * 64,
        )

    assert path.read_text(encoding="utf-8") == "{invalid json"


def test_legacy_installation_requires_review(tmp_path):
    path = tmp_path / "ownership.json"

    registry = OwnershipRegistry(path)

    assert registry.get_record("ancienne-installation") is None
    assert registry.can_write("ancienne-installation") is False


def test_completed_write_clears_pending_state(tmp_path):
    import hashlib

    path = tmp_path / "ownership.json"
    output = tmp_path / "generated.yaml"

    old_content = b"ancienne configuration\\n"
    new_content = b"nouvelle configuration\\n"

    output.write_bytes(old_content)

    old_sha = hashlib.sha256(old_content).hexdigest()
    new_sha = hashlib.sha256(new_content).hexdigest()

    registry = OwnershipRegistry(path)
    registry.record_generation(
        entry_id="installation-A",
        output_path=str(output),
        sha256=old_sha,
    )
    registry.begin_write(
        entry_id="installation-A",
        output_path=str(output),
        expected_sha256=old_sha,
        next_sha256=new_sha,
    )

    # Simulate an actual successful output replacement.
    output.write_bytes(new_content)

    registry.complete_write(
        entry_id="installation-A",
        actual_sha256=new_sha,
    )

    restarted = OwnershipRegistry(path)
    record = restarted.get_record("installation-A")

    assert record["state"] == "managed"
    assert record["sha256"] == new_sha
    assert restarted.can_write("installation-A") is True



def test_wrong_completion_digest_refused(tmp_path):
    import hashlib

    path = tmp_path / "ownership.json"
    output = tmp_path / "generated.yaml"
    old = b"ancienne configuration\\n"
    new = b"nouvelle configuration\\n"
    output.write_bytes(old)

    old_sha = hashlib.sha256(old).hexdigest()
    new_sha = hashlib.sha256(new).hexdigest()

    registry = OwnershipRegistry(path)
    registry.record_generation(
        entry_id="installation-A",
        output_path=str(output),
        sha256=old_sha,
    )
    registry.begin_write(
        entry_id="installation-A",
        output_path=str(output),
        expected_sha256=old_sha,
        next_sha256=new_sha,
    )

    with pytest.raises(ValueError):
        registry.complete_write(
            entry_id="installation-A",
            actual_sha256="c" * 64,
        )

    restarted = OwnershipRegistry(path)
    assert restarted.get_record("installation-A")["state"] == "pending"
    assert restarted.can_write("installation-A") is False

def test_completion_refuses_file_not_written(tmp_path):
    import hashlib

    registry = OwnershipRegistry(tmp_path / "ownership.json")
    output = tmp_path / "generated.yaml"

    old = b"ancienne configuration\n"
    new = b"nouvelle configuration\n"
    output.write_bytes(old)

    old_sha = hashlib.sha256(old).hexdigest()
    new_sha = hashlib.sha256(new).hexdigest()

    registry.record_generation(
        entry_id="installation-A",
        output_path=str(output),
        sha256=old_sha,
    )

    registry.begin_write(
        entry_id="installation-A",
        output_path=str(output),
        expected_sha256=old_sha,
        next_sha256=new_sha,
    )

    # The caller claims the new file was written, but it was not.
    with pytest.raises(ValueError):
        registry.complete_write(
            entry_id="installation-A",
            actual_sha256=new_sha,
        )

    assert registry.get_record("installation-A")["state"] == "pending"
    assert output.read_bytes() == old


def test_completion_accepts_verified_file(tmp_path):
    import hashlib

    registry = OwnershipRegistry(tmp_path / "ownership.json")
    output = tmp_path / "generated.yaml"

    old = b"ancienne configuration\n"
    new = b"nouvelle configuration\n"
    output.write_bytes(old)

    old_sha = hashlib.sha256(old).hexdigest()
    new_sha = hashlib.sha256(new).hexdigest()

    registry.record_generation(
        entry_id="installation-A",
        output_path=str(output),
        sha256=old_sha,
    )

    registry.begin_write(
        entry_id="installation-A",
        output_path=str(output),
        expected_sha256=old_sha,
        next_sha256=new_sha,
    )

    output.write_bytes(new)

    registry.complete_write(
        entry_id="installation-A",
        actual_sha256=new_sha,
    )

    assert registry.get_record("installation-A")["state"] == "managed"
    assert registry.get_record("installation-A")["sha256"] == new_sha


def test_begin_write_refuses_unmanaged_existing_file(tmp_path):
    import hashlib

    registry = OwnershipRegistry(tmp_path / "ownership.json")
    output = tmp_path / "manuel.yaml"
    original = b"light.salon:\n  expose: false\n"
    output.write_bytes(original)

    with pytest.raises(ValueError):
        registry.begin_write(
            entry_id="installation-A",
            output_path=str(output),
            expected_sha256=hashlib.sha256(original).hexdigest(),
            next_sha256=hashlib.sha256(b"remplacement\n").hexdigest(),
        )

    assert registry.get_record("installation-A") is None
    assert output.read_bytes() == original


def test_begin_write_refuses_changed_managed_file(tmp_path):
    import hashlib

    registry = OwnershipRegistry(tmp_path / "ownership.json")
    output = tmp_path / "generated.yaml"

    original = b"ancienne generation\n"
    output.write_bytes(original)
    original_sha = hashlib.sha256(original).hexdigest()

    registry.record_generation(
        entry_id="installation-A",
        output_path=str(output),
        sha256=original_sha,
    )

    # External modification after the last HVLS generation.
    modified = b"modification manuelle\n"
    output.write_bytes(modified)

    with pytest.raises(ValueError):
        registry.begin_write(
            entry_id="installation-A",
            output_path=str(output),
            expected_sha256=original_sha,
            next_sha256=hashlib.sha256(b"nouvelle generation\n").hexdigest(),
        )

    assert registry.get_record("installation-A")["state"] == "managed"
    assert output.read_bytes() == modified


def test_begin_create_absent_output(tmp_path):
    import hashlib

    registry = OwnershipRegistry(tmp_path / "ownership.json")
    output = tmp_path / "generated.yaml"
    next_sha = hashlib.sha256(b"nouveau contenu\n").hexdigest()

    registry.begin_create(
        entry_id="installation-A",
        output_path=str(output),
        next_sha256=next_sha,
    )

    record = registry.get_record("installation-A")
    assert record["state"] == "pending_create"
    assert record["next_sha256"] == next_sha
    assert not output.exists()
    assert registry.can_write("installation-A") is False


def test_begin_create_refuses_existing_manual_file(tmp_path):
    import hashlib

    registry = OwnershipRegistry(tmp_path / "ownership.json")
    output = tmp_path / "manuel.yaml"
    original = b"light.salon:\n  expose: false\n"
    output.write_bytes(original)

    with pytest.raises(ValueError):
        registry.begin_create(
            entry_id="installation-A",
            output_path=str(output),
            next_sha256=hashlib.sha256(b"nouveau\n").hexdigest(),
        )

    assert output.read_bytes() == original
    assert registry.get_record("installation-A") is None


def test_begin_create_refuses_existing_ownership_record(tmp_path):
    import hashlib

    registry = OwnershipRegistry(tmp_path / "ownership.json")
    output = tmp_path / "generated.yaml"
    content = b"ancien contenu\n"
    output.write_bytes(content)

    registry.record_generation(
        entry_id="installation-A",
        output_path=str(output),
        sha256=hashlib.sha256(content).hexdigest(),
    )

    with pytest.raises(ValueError):
        registry.begin_create(
            entry_id="installation-A",
            output_path=str(tmp_path / "autre.yaml"),
            next_sha256=hashlib.sha256(b"nouveau\n").hexdigest(),
        )

    assert registry.get_record("installation-A")["state"] == "managed"


def test_pending_create_survives_restart(tmp_path):
    import hashlib

    path = tmp_path / "ownership.json"
    output = tmp_path / "generated.yaml"

    registry = OwnershipRegistry(path)
    registry.begin_create(
        entry_id="installation-A",
        output_path=str(output),
        next_sha256=hashlib.sha256(b"nouveau\n").hexdigest(),
    )

    restarted = OwnershipRegistry(path)

    assert restarted.get_record("installation-A")["state"] == "pending_create"
    assert restarted.can_write("installation-A") is False


def test_complete_create_verifies_real_file(tmp_path):
    import hashlib

    registry = OwnershipRegistry(tmp_path / "ownership.json")
    output = tmp_path / "generated.yaml"
    content = b"light.salon:\\n  expose: true\\n"
    digest = hashlib.sha256(content).hexdigest()

    registry.begin_create(
        entry_id="installation-A",
        output_path=str(output),
        next_sha256=digest,
    )

    registry.create_reserved_output(
        entry_id="installation-A",
        content=content,
    )

    record = registry.get_record("installation-A")
    assert record["state"] == "managed"
    assert record["sha256"] == digest
    assert output.read_bytes() == content


def test_complete_create_refuses_missing_file(tmp_path):
    import hashlib

    registry = OwnershipRegistry(tmp_path / "ownership.json")
    output = tmp_path / "generated.yaml"

    registry.begin_create(
        entry_id="installation-A",
        output_path=str(output),
        next_sha256=hashlib.sha256(b"nouveau\n").hexdigest(),
    )

    with pytest.raises(ValueError):
        registry.complete_create(entry_id="installation-A")

    assert registry.get_record("installation-A")["state"] == "pending_create"
    assert not output.exists()


def test_exclusive_creation_preserves_external_file(tmp_path):
    import hashlib

    registry = OwnershipRegistry(tmp_path / "ownership.json")
    output = tmp_path / "generated.yaml"

    content = b"nouveau fichier HVLS\n"
    registry.begin_create(
        entry_id="installation-A",
        output_path=str(output),
        next_sha256=hashlib.sha256(content).hexdigest(),
    )

    # Un autre programme crée le fichier après notre préparation.
    external = b"configuration utilisateur\n"
    output.write_bytes(external)

    # La création exclusive doit échouer, sans remplacer le fichier.
    with pytest.raises(FileExistsError):
        with output.open("xb") as stream:
            stream.write(content)

    with pytest.raises(ValueError):
        registry.complete_create(entry_id="installation-A")

    assert output.read_bytes() == external
    assert registry.get_record("installation-A")["state"] == "pending_create"


def test_external_identical_file_cannot_be_claimed(tmp_path):
    import hashlib

    registry = OwnershipRegistry(tmp_path / "ownership.json")
    output = tmp_path / "generated.yaml"
    content = b"configuration identique\n"

    registry.begin_create(
        entry_id="installation-A",
        output_path=str(output),
        next_sha256=hashlib.sha256(content).hexdigest(),
    )

    # A different process creates exactly the expected bytes.
    output.write_bytes(content)

    # Identical content does not prove HVLS created the file.
    with pytest.raises(ValueError):
        registry.complete_create(entry_id="installation-A")

    assert output.read_bytes() == content
    assert registry.get_record("installation-A")["state"] == "pending_create"


def test_stale_registry_snapshot_cannot_erase_reservation(tmp_path):
    """An outdated registry revision must not overwrite newer data."""
    import hashlib

    registry_path = tmp_path / "ownership.json"
    registry_a = OwnershipRegistry(registry_path)
    registry_b = OwnershipRegistry(registry_path)

    # A reads an empty registry.
    stale = registry_a._load()

    # B records a reservation.
    registry_b.begin_create(
        entry_id="installation-B",
        output_path=str(tmp_path / "b.yaml"),
        next_sha256=hashlib.sha256(b"contenu B\n").hexdigest(),
    )

    # A attempts to save its outdated snapshot.
    stale["records"]["installation-A"] = {
        "output_path": str(tmp_path / "a.yaml"),
        "next_sha256": hashlib.sha256(b"contenu A\n").hexdigest(),
        "state": "pending_create",
    }

    with pytest.raises(ValueError, match="(?i)concurr|stale|changed"):
        registry_a._save(stale)

    restarted = OwnershipRegistry(registry_path)
    assert restarted.get_record("installation-B") is not None
    assert restarted.get_record("installation-A") is None



def test_registry_respects_interprocess_lock(tmp_path):
    """A separate process must wait while the registry is locked."""
    import fcntl
    import subprocess
    import sys

    registry_path = tmp_path / "ownership.json"
    output = tmp_path / "generated.yaml"
    lock_path = tmp_path / "ownership.json.lock"

    script = """
import sys
from hvls.output_ownership_registry import OwnershipRegistry

print("READY", flush=True)

OwnershipRegistry(sys.argv[1]).begin_create(
    entry_id="installation-B",
    output_path=sys.argv[2],
    next_sha256="a" * 64,
)
"""

    with lock_path.open("a+b") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)

        process = subprocess.Popen(
            [
                sys.executable,
                "-c",
                script,
                str(registry_path),
                str(output),
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        try:
            assert process.stdout.readline().strip() == "READY"

            # Child must NOT complete while the lock is held.
            with pytest.raises(subprocess.TimeoutExpired):
                process.wait(timeout=0.6)
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)

    try:
        stdout, stderr = process.communicate(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.communicate()
        pytest.fail("Registry process remained blocked after unlock")

    assert process.returncode == 0, stderr

    registry = OwnershipRegistry(registry_path)
    record = registry.get_record("installation-B")

    assert record is not None
    assert record["state"] == "pending_create"


def test_two_processes_preserve_both_reservations(tmp_path):
    """Two independent processes must not lose either reservation."""
    import subprocess
    import sys
    import time

    registry_path = tmp_path / "ownership.json"
    start = tmp_path / "start"

    script = """
import sys
import time
from pathlib import Path
from hvls.output_ownership_registry import OwnershipRegistry

registry_path, output_path, entry_id, ready, start = sys.argv[1:]

Path(ready).touch()

deadline = time.monotonic() + 10
while not Path(start).exists():
    if time.monotonic() > deadline:
        sys.exit(3)
    time.sleep(0.01)

OwnershipRegistry(registry_path).begin_create(
    entry_id=entry_id,
    output_path=output_path,
    next_sha256="a" * 64,
)
"""

    processes = []

    try:
        for name in ("A", "B"):
            process = subprocess.Popen(
                [
                    sys.executable,
                    "-c",
                    script,
                    str(registry_path),
                    str(tmp_path / f"{name}.yaml"),
                    f"installation-{name}",
                    str(tmp_path / f"ready-{name}"),
                    str(start),
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            processes.append(process)

        deadline = time.monotonic() + 10

        while not all(
            (tmp_path / f"ready-{name}").exists()
            for name in ("A", "B")
        ):
            assert time.monotonic() < deadline, "Workers not ready"
            assert all(p.poll() is None for p in processes)
            time.sleep(0.01)

        # Release both processes together.
        start.touch()

        for process in processes:
            _, stderr = process.communicate(timeout=10)
            assert process.returncode == 0, stderr

    finally:
        start.touch()
        for process in processes:
            if process.poll() is None:
                process.kill()
            process.communicate()

    registry = OwnershipRegistry(registry_path)

    assert registry.get_record("installation-A")["state"] == "pending_create"
    assert registry.get_record("installation-B")["state"] == "pending_create"
    assert registry._load()["revision"] == 2


def test_lock_released_after_registry_exception(tmp_path, monkeypatch):
    """A failed transaction must release its interprocess lock."""
    import fcntl

    registry_path = tmp_path / "ownership.json"
    registry = OwnershipRegistry(registry_path)

    def simulated_failure(data):
        raise RuntimeError("Simulated registry write failure")

    monkeypatch.setattr(registry, "_save", simulated_failure)

    with pytest.raises(RuntimeError, match="Simulated"):
        registry.begin_create(
            entry_id="installation-A",
            output_path=str(tmp_path / "generated.yaml"),
            next_sha256="a" * 64,
        )

    lock_path = tmp_path / "ownership.json.lock"

    # A new file descriptor must acquire the lock immediately.
    with lock_path.open("a+b") as stream:
        fcntl.flock(
            stream.fileno(),
            fcntl.LOCK_EX | fcntl.LOCK_NB,
        )
        fcntl.flock(stream.fileno(), fcntl.LOCK_UN)

    assert registry_path.exists() is False
