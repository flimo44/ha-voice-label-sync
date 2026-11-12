"""Safe filesystem writer for generated HVLS configuration."""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import shutil
import stat
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

from ..models import FileWriteResult


class FileWriterError(Exception):
    """Raised when generated configuration cannot be written safely."""



def _verify_expected_output(
    output_path: Path,
    expected_sha256: str,
) -> None:
    """Verify the owned output without following symbolic links."""
    if (
        not isinstance(expected_sha256, str)
        or len(expected_sha256) != 64
        or any(c not in "0123456789abcdef" for c in expected_sha256)
    ):
        raise FileWriterError("Invalid ownership digest")

    try:
        for component in (output_path, *output_path.parents):
            if component.is_symlink():
                raise FileWriterError("Unsafe symbolic link in output path")

        flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
        fd = os.open(output_path, flags)

        with os.fdopen(fd, "rb") as stream:
            before = os.fstat(stream.fileno())

            if not stat.S_ISREG(before.st_mode):
                raise FileWriterError("Output is not a regular file")

            digest = hashlib.sha256()
            for chunk in iter(lambda: stream.read(65536), b""):
                digest.update(chunk)

        after = output_path.lstat()

    except OSError as exc:
        raise FileWriterError(
            "Unable to verify ownership output"
        ) from exc

    if (
        not stat.S_ISREG(after.st_mode)
        or before.st_dev != after.st_dev
        or before.st_ino != after.st_ino
        or not hmac.compare_digest(
            digest.hexdigest(), expected_sha256
        )
    ):
        raise FileWriterError(
            "Output changed since ownership verification"
        )


def create_backup(
    output_path: Path,
    backup_directory: Path,
) -> Path | None:
    """Create a unique backup without overwriting existing backups."""

    if output_path.is_symlink():
        raise FileWriterError("Output cannot be a symbolic link")

    if not output_path.exists():
        return None

    if not output_path.is_file():
        raise FileWriterError("Output is not a regular file")

    if backup_directory.is_symlink():
        raise FileWriterError("Backup directory cannot be a symlink")

    try:
        backup_directory.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise FileWriterError("Cannot create backup directory") from exc

    # Preserve the existing YYYYMMDD-HHMMSS naming format
    # so backup listing and restoration remain compatible.
    base_time = datetime.now()

    for attempt in range(100):
        timestamp = (
            base_time + timedelta(seconds=attempt)
        ).strftime("%Y%m%d-%H%M%S")

        backup_path = backup_directory / (
            f"{output_path.name}.{timestamp}.auto.bak"
        )

        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        flags |= getattr(os, "O_NOFOLLOW", 0)

        try:
            fd = os.open(backup_path, flags, 0o600)
        except FileExistsError:
            continue
        except OSError as exc:
            raise FileWriterError(
                "Cannot create exclusive backup"
            ) from exc

        try:
            with os.fdopen(fd, "wb") as destination:
                source_flags = os.O_RDONLY
                source_flags |= getattr(os, "O_NOFOLLOW", 0)

                with os.fdopen(
                    os.open(output_path, source_flags), "rb"
                ) as original:
                    if not stat.S_ISREG(
                        os.fstat(original.fileno()).st_mode
                    ):
                        raise FileWriterError(
                            "Output is not a regular file"
                        )

                    shutil.copyfileobj(original, destination)

                destination.flush()
                os.fsync(destination.fileno())

            return backup_path

        except BaseException:
            backup_path.unlink(missing_ok=True)
            raise

    raise FileWriterError(
        "Unable to allocate a unique backup filename"
    )


def apply_backup_retention(
    output_path: Path,
    backup_directory: Path,
    retention: int,
) -> None:
    """Keep only the newest backups for an output file.

    A retention value of zero removes all matching backups.
    """
    if (
        isinstance(retention, bool)
        or not isinstance(retention, (int, float))
        or not float(retention).is_integer()
    ):
        raise ValueError("Backup retention must be a whole number")
    retention = int(retention)

    if retention < 0:
        raise ValueError("Backup retention cannot be negative")

    if not backup_directory.exists():
        return

    # Only explicitly classified automatic backups may be purged.
    # Legacy files may contain mandatory safety backups.
    pattern = re.compile(
        re.escape(output_path.name)
        + r"\.\d{8}-\d{6}\.auto\.bak\Z"
    )

    try:
        backups = sorted(
            (
                path
                for path in backup_directory.iterdir()
                if pattern.fullmatch(path.name)
                and path.is_file()
                and not path.is_symlink()
            ),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )

        for backup in backups[retention:]:
            backup.unlink()
    except OSError as exc:
        raise FileWriterError(f"Unable to apply backup retention: {exc}") from exc


def atomic_write(
    output_path: Path,
    content: str,
    *,
    expected_sha256: str | None = None,
) -> int:
    """Write text using a temporary file and atomic replacement.

    The temporary file is created in the destination directory so that
    the final ``os.replace`` operation remains atomic.

    Args:
        output_path: Destination file.
        content: UTF-8 text to write.

    Returns:
        Number of UTF-8 bytes written.

    Raises:
        FileWriterError: If the destination cannot be written safely.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    encoded_content = content.encode("utf-8")
    temporary_path: Path | None = None

    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            dir=output_path.parent,
            prefix=f".{output_path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            temporary_file.write(encoded_content)
            temporary_file.flush()
            os.fsync(temporary_file.fileno())

        # Final verification immediately before atomic replacement.
        if expected_sha256 is not None:
            _verify_expected_output(output_path, expected_sha256)

        os.replace(temporary_path, output_path)

    except (OSError, FileWriterError) as exc:
        if temporary_path is not None:
            try:
                temporary_path.unlink(missing_ok=True)
            except OSError:
                pass

        if isinstance(exc, FileWriterError):
            raise

        raise FileWriterError(f"Unable to write {output_path}: {exc}") from exc

    return len(encoded_content)


def write_with_backup(
    output_path: Path,
    content: str,
    backup_directory: Path,
    retention: int = 5,
    create_backup_enabled: bool = True,
    expected_sha256: str | None = None,
) -> FileWriteResult:
    """Back up the current file and atomically write new content.

    Args:
        output_path: Destination configuration file.
        content: Generated configuration.
        backup_directory: Backup storage directory.
        retention: Maximum number of backups to retain.
        create_backup_enabled: Whether to create a backup before overwriting.

    Returns:
        Structured information about the completed operation.
    """
    # Reject changed files before creating any backup.
    if expected_sha256 is not None:
        _verify_expected_output(output_path, expected_sha256)

    backup_path = (
        create_backup(output_path=output_path, backup_directory=backup_directory)
        if create_backup_enabled
        else None
    )

    bytes_written = atomic_write(
        output_path=output_path,
        content=content,
        expected_sha256=expected_sha256,
    )

    apply_backup_retention(
        output_path=output_path,
        backup_directory=backup_directory,
        retention=retention,
    )

    return FileWriteResult(
        output_path=output_path,
        backup_path=backup_path,
        bytes_written=bytes_written,
        written_at=datetime.now(),
    )
