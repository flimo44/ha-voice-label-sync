"""Safe filesystem writer for generated HVLS configuration."""

from __future__ import annotations

import os
import shutil
import tempfile
from datetime import datetime
from pathlib import Path

from ..models import FileWriteResult


class FileWriterError(Exception):
    """Raised when generated configuration cannot be written safely."""


def create_backup(
    output_path: Path,
    backup_directory: Path,
) -> Path | None:
    """Create a timestamped backup of an existing output file.

    Args:
        output_path: Generated configuration file to back up.
        backup_directory: Directory where backups are stored.

    Returns:
        Path of the created backup, or ``None`` if the output file does
        not exist yet.

    Raises:
        FileWriterError: If the backup cannot be created.
    """
    if not output_path.exists():
        return None

    if not output_path.is_file():
        raise FileWriterError(
            f"Output path is not a regular file: {output_path}"
        )

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_directory.mkdir(parents=True, exist_ok=True)

    backup_path = backup_directory / (
        f"{output_path.name}.{timestamp}.bak"
    )

    try:
        shutil.copy2(output_path, backup_path)
    except OSError as exc:
        raise FileWriterError(
            f"Unable to create backup {backup_path}: {exc}"
        ) from exc

    return backup_path


def apply_backup_retention(
    output_path: Path,
    backup_directory: Path,
    retention: int,
) -> None:
    """Keep only the newest backups for an output file.

    A retention value of zero removes all matching backups.
    """
    if retention < 0:
        raise ValueError("Backup retention cannot be negative")

    if not backup_directory.exists():
        return

    pattern = f"{output_path.name}.*.bak"

    try:
        backups = sorted(
            backup_directory.glob(pattern),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )

        for backup in backups[retention:]:
            backup.unlink()
    except OSError as exc:
        raise FileWriterError(
            f"Unable to apply backup retention: {exc}"
        ) from exc


def atomic_write(
    output_path: Path,
    content: str,
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

        os.replace(temporary_path, output_path)

    except OSError as exc:
        if temporary_path is not None:
            try:
                temporary_path.unlink(missing_ok=True)
            except OSError:
                pass

        raise FileWriterError(
            f"Unable to write {output_path}: {exc}"
        ) from exc

    return len(encoded_content)


def write_with_backup(
    output_path: Path,
    content: str,
    backup_directory: Path,
    retention: int = 5,
) -> FileWriteResult:
    """Back up the current file and atomically write new content.

    Args:
        output_path: Destination configuration file.
        content: Generated configuration.
        backup_directory: Backup storage directory.
        retention: Maximum number of backups to retain.

    Returns:
        Structured information about the completed operation.
    """
    backup_path = create_backup(
        output_path=output_path,
        backup_directory=backup_directory,
    )

    bytes_written = atomic_write(
        output_path=output_path,
        content=content,
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
