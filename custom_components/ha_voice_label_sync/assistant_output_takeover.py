"""Explicit, backup-first takeover of a previously unmanaged HVLS entity YAML.

This is not a Google Assistant migration or an Apply. Production bytes are
preserved; an admin may explicitly entrust the existing output to HVLS only
after reviewing the differences with a current Preview.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import stat
from pathlib import Path

from hvls.output_ownership_registry import OwnershipRegistry
from hvls.owned_writer import (
    _create_unique_safety_backup,
    _operation_lock,
    _safe_path,
    _verify_current_file,
    evaluate_registered_output,
)

from .assistant_entity_file import inspect_google_entity_file
from .preview_compare import PreviewFormatError, analyze_preview

_SHA = re.compile(r"[0-9a-f]{64}\Z")
_MAX_BYTES = 2 * 1024 * 1024


class ExistingOutputTakeoverError(ValueError):
    """Refuse a takeover without changing production or granting permission."""


def _read_verified_text(path: Path) -> tuple[str, str]:
    """Read a bounded, regular file and verify its inode and digest."""
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    with os.fdopen(os.open(path, flags), "rb") as stream:
        before = os.fstat(stream.fileno())
        if not stat.S_ISREG(before.st_mode) or before.st_size > _MAX_BYTES:
            raise ExistingOutputTakeoverError("Invalid YAML file size or type")
        data = stream.read(_MAX_BYTES + 1)
        if len(data) > _MAX_BYTES:
            raise ExistingOutputTakeoverError("YAML file exceeds the safe limit")
        digest = hashlib.sha256(data).hexdigest()
    _verify_current_file(path, digest)
    try:
        return data.decode("utf-8"), digest
    except UnicodeDecodeError as exc:
        raise ExistingOutputTakeoverError("Invalid UTF-8 YAML") from exc


def _review(
    *, config_dir: str | Path, output_path: str | Path,
    preview_path: str | Path, registry_path: str | Path,
    entry_id: str, selected_relative_path: str,
) -> dict:
    if not isinstance(entry_id, str) or not entry_id.strip():
        raise ExistingOutputTakeoverError("HVLS identity unavailable")
    root = Path(config_dir).resolve()
    output = _safe_path(output_path)
    preview = _safe_path(preview_path)
    registry_file = _safe_path(registry_path)
    if not output.is_relative_to(root) or output == preview or output == registry_file:
        raise ExistingOutputTakeoverError("Configured output path is not safe")
    try:
        relative = output.relative_to(root).as_posix()
    except ValueError as exc:
        raise ExistingOutputTakeoverError("Output is outside HA config") from exc
    if selected_relative_path != relative:
        raise ExistingOutputTakeoverError("Selected file is not the configured output")

    ownership = evaluate_registered_output(output, entry_id, registry_file)
    if ownership.reason_code != "unmanaged_output":
        raise ExistingOutputTakeoverError("Output is not an unmanaged regular file")
    report = inspect_google_entity_file(root, relative)
    if report["status"] not in {"parsed", "review_required"} or (
        report["adoption_entries_complete"] is not True
    ):
        raise ExistingOutputTakeoverError("Selected YAML cannot be safely inspected")

    old_text, old_sha = _read_verified_text(output)
    if report["file_sha256"] != old_sha:
        raise ExistingOutputTakeoverError("YAML changed during inspection")
    preview_text, preview_sha = _read_verified_text(preview)
    try:
        analysis = analyze_preview(preview_text, old_text)
    except PreviewFormatError as exc:
        raise ExistingOutputTakeoverError("YAML comparison unavailable") from exc
    comparison = analysis["comparison"]
    if comparison.get("status") != "ok":
        raise ExistingOutputTakeoverError("YAML comparison is incomplete")
    return {
        "eligible": True, "selected_path": relative,
        "production_sha256": old_sha, "preview_sha256": preview_sha,
        "entities": report["counts"]["entries"],
        "issues": report["counts"]["entries_with_anomalies"],
        "changes": {
            "added": len(comparison["added"]),
            "removed": len(comparison["removed"]),
            "modified": len(comparison["modified"]),
        },
        "output": output, "registry": registry_file,
    }


def prepare_existing_output_takeover(
    *, config_dir: str | Path, output_path: str | Path,
    preview_path: str | Path, registry_path: str | Path,
    entry_id: str, selected_relative_path: str,
) -> dict:
    """Prepare a display-only digest-locked report, never write anything."""
    result = _review(
        config_dir=config_dir, output_path=output_path,
        preview_path=preview_path, registry_path=registry_path,
        entry_id=entry_id, selected_relative_path=selected_relative_path,
    )
    return {key: value for key, value in result.items()
            if key not in {"output", "registry"}}


def confirm_existing_output_takeover(
    *, config_dir: str | Path, output_path: str | Path,
    preview_path: str | Path, registry_path: str | Path,
    entry_id: str, selected_relative_path: str,
    production_sha256: str, preview_sha256: str,
    confirmed: bool,
) -> dict:
    """Preserve original bytes and then register ownership under writer lock."""
    if confirmed is not True or not all(
        isinstance(value, str) and _SHA.fullmatch(value)
        for value in (production_sha256, preview_sha256)
    ):
        raise ExistingOutputTakeoverError("Explicit confirmation required")

    registry_file = _safe_path(registry_path)
    with _operation_lock(registry_file):
        report = _review(
            config_dir=config_dir, output_path=output_path,
            preview_path=preview_path, registry_path=registry_path,
            entry_id=entry_id, selected_relative_path=selected_relative_path,
        )
        if not hmac.compare_digest(report["production_sha256"], production_sha256) or (
            not hmac.compare_digest(report["preview_sha256"], preview_sha256)
        ):
            raise ExistingOutputTakeoverError(
                "File or Preview changed; review again"
            )
        output = report["output"]
        backups = _safe_path(output.parent / ".hvls_backups")
        if backups == output or backups == registry_file:
            raise ExistingOutputTakeoverError("Unsafe backup destination")
        if backups.exists() and not backups.is_dir():
            raise ExistingOutputTakeoverError("Backup directory unavailable")

        # Mandatory unique, fsynced, SHA-checked copy BEFORE ownership change.
        safety_copy = _create_unique_safety_backup(
            output, backups, production_sha256
        )
        _verify_current_file(output, production_sha256)

        # record_generation is not a standalone adoption authorization.
        # Here it is used only after an admin-confirmed, fresh SHA comparison,
        # server-verified unmanaged status, the common writer lock and mandatory
        # verified safety backup. No production write is performed.
        registry = OwnershipRegistry(registry_file)
        registry.record_generation(
            entry_id=entry_id, output_path=str(output),
            sha256=production_sha256,
        )
        ownership = evaluate_registered_output(output, entry_id, registry_file)
        if not ownership.write_allowed or ownership.status != "managed":
            raise ExistingOutputTakeoverError(
                "Ownership was recorded but requires verification"
            )
        return {
            "taken_over": True, "backup_name": safety_copy.name,
            "production_unchanged": True, "apply_performed": False,
        }
