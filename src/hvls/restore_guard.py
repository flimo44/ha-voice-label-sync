"""Durable restoration barrier shared by HVLS output writers.

A restored YAML is intentionally not silently replaced by another generation.
Creating the guard precedes the restore write, and removing it requires a
separate, reviewed decision. An unreadable guard always fails closed.
"""

from __future__ import annotations

import json
import os
import re
import stat
from pathlib import Path

from .writers import FileWriterError

_SHA = re.compile(r"[0-9a-f]{64}\Z")
_MAX_GUARD_BYTES = 4096
_NAME = "restore_reconciliation.json"


def guard_path(registry_path: str | Path) -> Path:
    return Path(registry_path).parent / _NAME


def _fsync_directory(directory: Path) -> None:
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
    fd = os.open(directory, flags)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def read_guard(registry_path: str | Path) -> dict | None:
    """Return a validated guard, or fail closed on corruption/symlinks."""
    path = guard_path(registry_path)
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(path, flags)
    except FileNotFoundError:
        return None
    except OSError as exc:
        raise FileWriterError("Restore guard is unreadable") from exc

    try:
        with os.fdopen(fd, "rb") as stream:
            info = os.fstat(stream.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_size > _MAX_GUARD_BYTES:
                raise FileWriterError("Invalid restore guard file")
            content = stream.read(_MAX_GUARD_BYTES + 1)
        if len(content) > _MAX_GUARD_BYTES:
            raise FileWriterError("Restore guard too large")
        guard = json.loads(content)
    except (OSError, ValueError, TypeError) as exc:
        raise FileWriterError("Invalid restore guard content") from exc

    if (
        not isinstance(guard, dict)
        or set(guard) != {
            "version", "entry_id", "output_path", "original_sha256",
            "restored_sha256", "backup_id",
        }
        or guard["version"] != 1
        or not all(isinstance(guard.get(k), str) and guard[k]
                   for k in ("entry_id", "output_path", "backup_id"))
        or not all(isinstance(guard.get(k), str) and _SHA.fullmatch(guard[k])
                   for k in ("original_sha256", "restored_sha256"))
    ):
        raise FileWriterError("Invalid restore guard content")
    return guard


def assert_not_guarded(
    registry_path: str | Path, entry_id: str, output_path: str | Path,
) -> None:
    """Refuse every non-restore writer while any reconciliation is pending."""
    guard = read_guard(registry_path)
    if guard is not None:
        raise FileWriterError(
            "Restore reconciliation required before generating production YAML"
        )


def create_guard(
    registry_path: str | Path, *, entry_id: str, output_path: str | Path,
    backup_id: str, original_sha256: str, restored_sha256: str,
) -> dict:
    """Install the hold durably BEFORE restoring. Never replace an old hold."""
    if not all(isinstance(v, str) and _SHA.fullmatch(v)
               for v in (original_sha256, restored_sha256)):
        raise FileWriterError("Invalid restore guard hashes")
    guard = {
        "version": 1, "entry_id": entry_id, "output_path": str(output_path),
        "backup_id": backup_id,
        "original_sha256": original_sha256,
        "restored_sha256": restored_sha256,
    }
    if not isinstance(entry_id, str) or not entry_id.strip():
        raise FileWriterError("Missing restore identity")
    path = guard_path(registry_path)
    if path.is_symlink() or not path.parent.is_dir():
        raise FileWriterError("Unsafe restore guard path")
    encoded = json.dumps(guard, sort_keys=True).encode("utf-8")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    flags |= getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(path, flags, 0o600)
    except FileExistsError as exc:
        raise FileWriterError("A previous restoration requires reconciliation") from exc
    with os.fdopen(fd, "wb") as stream:
        stream.write(encoded)
        stream.flush()
        os.fsync(stream.fileno())
    _fsync_directory(path.parent)
    return guard


def clear_guard(
    registry_path: str | Path, expected_guard: dict,
) -> None:
    """Remove exactly the previously verified guard; caller holds writer lock."""
    actual = read_guard(registry_path)
    if actual is None or actual != expected_guard:
        raise FileWriterError("Restore guard changed; review again")
    path = guard_path(registry_path)
    path.unlink()
    _fsync_directory(path.parent)
