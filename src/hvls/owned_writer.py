"""Ownership-aware HVLS output writer.

Only HVLS-created, registered outputs may be updated.
The registry remains pending after an interrupted operation.
"""

from __future__ import annotations

import fcntl
import hashlib
import hmac
import os
import stat
import time
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from .models import FileWriteResult
from .output_ownership_registry import OwnershipRegistry
from .writers import FileWriterError, atomic_write, write_with_backup


def _safe_path(value: str | Path) -> Path:
    """Reject relative traversal and symbolic links in all components."""
    path = Path(value)

    if not path.is_absolute() or ".." in path.parts:
        raise FileWriterError("Unsafe ownership path")

    for component in (path, *path.parents):
        if component.is_symlink():
            raise FileWriterError("Unsafe symbolic link in ownership path")

    return path.resolve(strict=False)


@contextmanager
def _operation_lock(registry_path: Path):
    """Serialize complete HVLS output transactions across processes."""
    lock_path = _safe_path(
        registry_path.with_name(registry_path.name + ".write.lock")
    )

    lock_path.parent.mkdir(parents=True, exist_ok=True)

    flags = os.O_RDWR | os.O_CREAT
    flags |= getattr(os, "O_NOFOLLOW", 0)
    flags |= getattr(os, "O_CLOEXEC", 0)

    try:
        fd = os.open(lock_path, flags, 0o600)
    except OSError as exc:
        raise FileWriterError("Unable to acquire ownership lock") from exc

    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise FileWriterError("Invalid ownership lock")

        fcntl.flock(fd, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(fd, fcntl.LOCK_UN)
    finally:
        os.close(fd)


def _verify_current_file(path: Path, expected_sha256: str) -> None:
    """Recheck contents and inode before replacing a managed output."""
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)

    try:
        fd = os.open(path, flags)

        with os.fdopen(fd, "rb") as stream:
            before = os.fstat(stream.fileno())

            if not stat.S_ISREG(before.st_mode):
                raise FileWriterError("Managed output is not a regular file")

            digest = hashlib.sha256()

            for chunk in iter(lambda: stream.read(65536), b""):
                digest.update(chunk)

        after = path.lstat()

        if (
            not stat.S_ISREG(after.st_mode)
            or before.st_dev != after.st_dev
            or before.st_ino != after.st_ino
            or not hmac.compare_digest(
                digest.hexdigest(), expected_sha256
            )
        ):
            raise FileWriterError(
                "Managed output changed before replacement"
            )

    except OSError as exc:
        raise FileWriterError(
            "Unable to verify managed output"
        ) from exc



def _create_unique_safety_backup(
    output: Path,
    directory: Path,
    expected_sha256: str,
) -> Path:
    """Preserve verified production in a new, exclusive backup."""
    directory.mkdir(parents=True, exist_ok=True)

    for _ in range(10):
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        destination = directory / f"{output.name}.{stamp}.safety.bak"

        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        flags |= getattr(os, "O_NOFOLLOW", 0)

        try:
            fd = os.open(destination, flags, 0o600)
        except FileExistsError:
            time.sleep(0.12)
            continue

        try:
            digest = hashlib.sha256()

            with os.fdopen(fd, "wb") as target:
                source_flags = os.O_RDONLY
                source_flags |= getattr(os, "O_NOFOLLOW", 0)
                source_fd = os.open(output, source_flags)

                with os.fdopen(source_fd, "rb") as stream:
                    if not stat.S_ISREG(
                        os.fstat(stream.fileno()).st_mode
                    ):
                        raise FileWriterError(
                            "Production is not a regular file"
                        )

                    for chunk in iter(
                        lambda: stream.read(65536), b""
                    ):
                        digest.update(chunk)
                        target.write(chunk)

                target.flush()
                os.fsync(target.fileno())

            if not hmac.compare_digest(
                digest.hexdigest(), expected_sha256
            ):
                raise FileWriterError(
                    "Production changed during safety backup"
                )

            _verify_current_file(output, expected_sha256)
            return destination

        except BaseException:
            destination.unlink(missing_ok=True)
            raise

    raise FileWriterError(
        "Unique safety backup name unavailable"
    )


def write_owned_output(
    *,
    output_path: str | Path,
    content: str,
    entry_id: str,
    ownership_registry_path: str | Path,
    backup_directory: str | Path,
    retention: int = 10,
    create_backup_enabled: bool = True,
    restore_mode: bool = False,
) -> FileWriteResult:
    """Create or regenerate a verified HVLS-owned YAML.

    This is a filesystem transaction, not a migration/adoption API.
    An unresolved pending state requires explicit recovery.
    """
    if not isinstance(content, str):
        raise FileWriterError("Generated content must be text")

    if not isinstance(entry_id, str) or not entry_id.strip():
        raise FileWriterError("Missing installation identity")

    output = _safe_path(output_path)
    registry_path = _safe_path(ownership_registry_path)
    backups = _safe_path(backup_directory)

    # Validate retention before creating output or ownership records.
    # Reject booleans: bool is a subclass of int in Python.
    if type(retention) is not int or retention < 0:
        raise FileWriterError("Invalid backup retention")

    # The output must never overwrite ownership metadata or lock files.
    reserved_paths = {
        registry_path,
        registry_path.with_name(registry_path.name + ".lock"),
        registry_path.with_name(registry_path.name + ".write.lock"),
    }

    if (
        output in reserved_paths
        or backups in reserved_paths
        or output == backups
    ):
        raise FileWriterError("Unsafe ownership path collision")

    if not output.parent.is_dir():
        raise FileWriterError("Output parent directory does not exist")

    if backups.exists() and not backups.is_dir():
        raise FileWriterError("Backup destination is not a directory")

    encoded = content.encode("utf-8")
    next_sha256 = hashlib.sha256(encoded).hexdigest()

    with _operation_lock(registry_path):
        # Recheck paths after acquiring the cross-process lock.
        _safe_path(output)
        _safe_path(registry_path)
        _safe_path(backups)

        registry = OwnershipRegistry(registry_path)
        record = registry.get_record(entry_id)

        if record is None:
            if restore_mode:
                raise FileWriterError(
                    "Restore requires an owned managed output"
                )

            # An unknown existing file is never automatically adopted.
            if output.exists() or output.is_symlink():
                raise FileWriterError(
                    "Unmanaged output: ownership not established"
                )

            # Durable reservation BEFORE touching the output.
            registry.begin_create(
                entry_id=entry_id,
                output_path=str(output),
                next_sha256=next_sha256,
            )

            # O_EXCL prevents overwriting an existing destination.
            # This method also verifies and records the created file.
            registry.create_reserved_output(
                entry_id=entry_id,
                content=encoded,
            )

            return FileWriteResult(
                output_path=output,
                backup_path=None,
                bytes_written=len(encoded),
                written_at=datetime.now(),
            )

        if (
            record.get("state") != "managed"
            or record.get("output_path") != str(output)
        ):
            raise FileWriterError(
                "Ownership record does not authorize this output"
            )

        expected_sha256 = record["sha256"]

        # Durable pending state and first content verification.
        registry.begin_write(
            entry_id=entry_id,
            output_path=str(output),
            expected_sha256=expected_sha256,
            next_sha256=next_sha256,
        )

        # A second verification, immediately before the existing writer.
        # Any failure leaves the registry pending for controlled recovery.
        _safe_path(output)
        _verify_current_file(output, expected_sha256)

        if restore_mode:
            # Mandatory safety backup, independent of normal settings.
            safety_path = _create_unique_safety_backup(
                output, backups, expected_sha256
            )

            bytes_written = atomic_write(
                output_path=output,
                content=content,
                expected_sha256=expected_sha256,
            )

            result = FileWriteResult(
                output_path=output,
                backup_path=safety_path,
                bytes_written=bytes_written,
                written_at=datetime.now(),
            )
        else:
            result = write_with_backup(
                output_path=output,
                content=content,
                backup_directory=backups,
                retention=retention,
                create_backup_enabled=create_backup_enabled,
                expected_sha256=expected_sha256,
            )

        # Commit managed state only after verifying actual output bytes.
        registry.complete_write(
            entry_id=entry_id,
            actual_sha256=next_sha256,
        )

        return result
