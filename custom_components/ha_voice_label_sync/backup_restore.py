"""Read-only backup browsing and safe, reviewed HVLS YAML restoration."""

from __future__ import annotations

import hmac
import os
import re
import shutil
from datetime import datetime
from pathlib import Path

from hvls import FileWriterError
from hvls.owned_writer import write_owned_output

from .preview_compare import PreviewFormatError, analyze_preview
from .preview_guard import (
    PreviewChangedError,
    preview_digest,
    validate_production_unchanged,
)

MAX_BACKUP_BYTES = 1024 * 1024
_SHA = re.compile(r"[0-9a-f]{64}\Z")


class BackupRestoreError(ValueError):
    """Backup is not safe to read or restore."""


def _backup_directory(output_path: Path) -> Path:
    return output_path.parent / ".hvls_backups"


def _backup_names(output_path: Path) -> list[str]:
    directory = _backup_directory(output_path)
    if not directory.is_dir() or directory.is_symlink():
        return []
    pattern = re.compile(re.escape(output_path.name) + r"\.\d{8}-\d{6}(?:\.(?:auto|safety))?\.bak\Z")
    return sorted(
        (p.name for p in directory.iterdir()
         if pattern.fullmatch(p.name) and p.is_file() and not p.is_symlink()),
        reverse=True,
    )


def _get_backup(output_path: Path, backup_id: str) -> Path:
    if not isinstance(backup_id, str) or backup_id not in _backup_names(output_path):
        raise BackupRestoreError("Backup not found or not permitted.")
    path = _backup_directory(output_path) / backup_id
    if path.is_symlink() or not path.is_file():
        raise BackupRestoreError("Backup is not a regular file.")
    return path


def _read_yaml(path: Path) -> str:
    if path.is_symlink() or not path.is_file():
        raise BackupRestoreError("YAML file is missing or not a regular file.")
    if path.stat().st_size > MAX_BACKUP_BYTES:
        raise BackupRestoreError("YAML file exceeds the maximum supported size.")
    try:
        return path.read_bytes().decode("utf-8")
    except (OSError, UnicodeError) as exc:
        raise BackupRestoreError("Cannot read the YAML file.") from exc


def list_backups(output_path: Path) -> dict:
    """List only backups belonging to the configured production filename."""
    result = []
    for backup_id in _backup_names(output_path):
        try:
            path = _get_backup(output_path, backup_id)
            stat = path.stat()
            content = _read_yaml(path)
            analysis = analyze_preview(content, None)
            if not analysis["summary"]["total"]:
                continue  # Never offer an empty YAML snapshot for restoration.
        except (OSError, BackupRestoreError, PreviewFormatError):
            continue
        result.append({
            "id": backup_id,
            "timestamp": datetime.fromtimestamp(stat.st_mtime).isoformat(
                timespec="seconds"
            ),
            "size": stat.st_size,
            "entities_count": analysis["summary"]["total"],
            "sha256": preview_digest(content),
        })
    return {"backups": result}


def review_backup(output_path: Path, backup_id: str) -> dict:
    """Return a semantic diff with immutable tokens for the selected backup."""
    backup_path = _get_backup(output_path, backup_id)
    candidate = _read_yaml(backup_path)
    try:
        production = _read_yaml(output_path)
    except BackupRestoreError as exc:
        raise BackupRestoreError(
            "Cannot compare: current production YAML is unavailable."
        ) from exc
    try:
        analysis = analyze_preview(candidate, production)
    except PreviewFormatError as exc:
        raise BackupRestoreError(f"Invalid backup YAML: {exc}") from exc
    if analysis["comparison"].get("status") != "ok":
        raise BackupRestoreError("Cannot restore while production YAML is invalid.")
    if not analysis["summary"]["total"]:
        raise BackupRestoreError("Refusing to restore an empty YAML backup.")
    return {
        "backup_id": backup_id,
        "backup_sha256": preview_digest(candidate),
        "production_sha256": preview_digest(production),
        "summary": analysis["summary"],
        "comparison": analysis["comparison"],
    }


def _safety_backup(output_path: Path) -> Path:
    """Create an independent, unique safety backup before replacing production."""
    directory = _backup_directory(output_path)
    if directory.is_symlink():
        raise BackupRestoreError("Backup directory cannot be a symbolic link.")
    directory.mkdir(parents=True, exist_ok=True)
    # The standard backup filename is retained for compatibility with existing lists.
    # Refuse timestamp collisions rather than overwriting any previous backup.
    for attempt in range(10):
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        name = f"{output_path.name}.{stamp}.bak"
        destination = directory / name
        try:
            fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            import time
            time.sleep(0.12)
            continue
        try:
            with os.fdopen(fd, "wb") as target, output_path.open("rb") as source:
                shutil.copyfileobj(source, target)
                target.flush()
                os.fsync(target.fileno())
            return destination
        except BaseException:
            destination.unlink(missing_ok=True)
            raise
    raise BackupRestoreError("Safety backup name already exists. Retry later.")


def restore_reviewed_backup(
    output_path: Path,
    backup_id: str,
    backup_sha256: str,
    production_sha256: str,
    *,
    entry_id: str,
    ownership_registry_path: Path,
) -> dict:
    """Restore only an explicitly reviewed snapshot, after preserving production."""
    if not all(isinstance(value, str) and _SHA.fullmatch(value)
               for value in (backup_sha256, production_sha256)):
        raise BackupRestoreError("Invalid review tokens.")
    backup_path = _get_backup(output_path, backup_id)
    candidate = _read_yaml(backup_path)
    if not hmac.compare_digest(preview_digest(candidate), backup_sha256):
        raise PreviewChangedError("Selected backup changed since the review.")
    current_review = review_backup(output_path, backup_id)
    if not hmac.compare_digest(current_review["production_sha256"], production_sha256):
        raise PreviewChangedError("Production changed since the review.")
    # Re-check bytes on disk immediately before writing.
    validate_production_unchanged(output_path, production_sha256)
    # Recheck the selected backup before the ownership transaction.
    if not hmac.compare_digest(
        preview_digest(_read_yaml(backup_path)), backup_sha256
    ):
        raise PreviewChangedError(
            "Selected backup changed before restore."
        )

    try:
        result = write_owned_output(
            output_path=output_path,
            content=candidate,
            entry_id=entry_id,
            ownership_registry_path=ownership_registry_path,
            backup_directory=_backup_directory(output_path),
            restore_mode=True,
        )
    except (FileWriterError, ValueError) as exc:
        raise BackupRestoreError(
            f"Restore ownership authorization failed: {exc}"
        ) from exc

    if result.backup_path is None:
        raise BackupRestoreError(
            "Restore safety backup was not created."
        )

    return {
        "restored": True,
        "backup_id": backup_id,
        "safety_backup": result.backup_path.name,
        "bytes_written": result.bytes_written,
    }
