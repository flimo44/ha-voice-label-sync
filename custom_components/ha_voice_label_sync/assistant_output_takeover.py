"""Explicit, backup-first takeover of a previously unmanaged HVLS entity YAML.

This is not a Google Assistant migration or an Apply. Production bytes are
preserved; an admin may explicitly entrust the existing output to HVLS only
after reviewing the differences with a current Preview.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
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
from .restore_guard import read_guard

_SHA = re.compile(r"[0-9a-f]{64}\Z")
_MAX_BYTES = 2 * 1024 * 1024
_LOGGER = logging.getLogger(__name__)


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
    active_entry_ids: frozenset[str] | None = None,
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
    previous_id = None
    registry = OwnershipRegistry(registry_file)
    registry_data = registry._load()
    if ownership.reason_code == "owned_by_other_installation":
        # Do NOT reclaim an installation Home Assistant still knows.
        if not active_entry_ids or entry_id not in active_entry_ids:
            raise ExistingOutputTakeoverError(
                "Active Home Assistant installation cannot be verified"
            )
        matched = [
            (owner_id, record)
            for owner_id, record in registry_data["records"].items()
            if record.get("output_path") == str(output)
        ]
        if len(matched) != 1:
            raise ExistingOutputTakeoverError("Ambiguous previous owner")
        previous_id, record = matched[0]
        if (
            previous_id in active_entry_ids or previous_id == entry_id
            or record["state"] != "managed"
        ):
            raise ExistingOutputTakeoverError(
                "Existing ownership is still active or incomplete"
            )
        if read_guard(registry_file) is not None:
            raise ExistingOutputTakeoverError(
                "Previous recovery must be completed before reassignment"
            )
    elif ownership.reason_code != "unmanaged_output":
        raise ExistingOutputTakeoverError(
            "Output is neither unmanaged nor owned by an inactive installation"
        )
    report = inspect_google_entity_file(root, relative)
    if report["status"] not in {"parsed", "review_required"} or (
        report["adoption_entries_complete"] is not True
    ):
        raise ExistingOutputTakeoverError("Selected YAML cannot be safely inspected")

    old_text, old_sha = _read_verified_text(output)
    if report["file_sha256"] != old_sha:
        raise ExistingOutputTakeoverError("YAML changed during inspection")
    previous_sha = record["sha256"] if previous_id is not None else None
    recorded_sha_mismatch = previous_sha is not None and (
        not hmac.compare_digest(previous_sha, old_sha)
    )
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
        "previous_entry_id": previous_id,
        "previous_sha256": previous_sha,
        "recorded_sha_mismatch": recorded_sha_mismatch,
        "ownership_revision": registry_data["revision"],
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
    active_entry_ids: frozenset[str] | None = None,
) -> dict:
    """Prepare a display-only digest-locked report, never write anything."""
    result = _review(
        config_dir=config_dir, output_path=output_path,
        preview_path=preview_path, registry_path=registry_path,
        entry_id=entry_id, selected_relative_path=selected_relative_path,
        active_entry_ids=active_entry_ids,
    )
    return {key: value for key, value in result.items()
            if key not in {"output", "registry"}}


def _transfer_inactive_owner_compat(
    registry: OwnershipRegistry, *,
    previous_entry_id: str, entry_id: str, output_path: str,
    sha256: str, previous_sha256: str, expected_revision: int,
) -> None:
    """Use the pinned PyPI core, which predates the owner-transfer method.

    This fallback reproduces the core's guarded registry transition while
    the enclosing takeover holds HVLS's cross-process output write lock.
    Remove when the pinned PyPI package includes transfer_inactive_owner.
    """
    native = getattr(registry, "transfer_inactive_owner", None)
    if callable(native):
        native(
            previous_entry_id=previous_entry_id, entry_id=entry_id,
            output_path=output_path, sha256=sha256,
            previous_sha256=previous_sha256,
            expected_revision=expected_revision,
        )
        return

    registry._validate_entry(previous_entry_id, output_path)
    registry._validate_entry(entry_id, output_path)
    registry._validate_sha(sha256)
    registry._validate_sha(previous_sha256)
    if previous_entry_id == entry_id:
        raise ValueError("Transfer must change owner")
    if type(expected_revision) is not int or expected_revision < 0:
        raise ValueError("Invalid ownership revision")

    data = registry._load()
    if data["revision"] != expected_revision:
        raise ValueError("Ownership record changed since approval")
    records = data["records"]
    previous = records.get(previous_entry_id)
    if (
        previous is None or previous.get("state") != "managed"
        or previous.get("output_path") != output_path
        or previous.get("sha256") != previous_sha256
        or entry_id in records
    ):
        raise ValueError("Previous ownership state cannot be transferred")
    registry._ensure_path_not_claimed(records, previous_entry_id, output_path)
    del records[previous_entry_id]
    records[entry_id] = {
        "output_path": output_path, "sha256": sha256, "state": "managed",
    }
    registry._save(data)


def confirm_existing_output_takeover(
    *, config_dir: str | Path, output_path: str | Path,
    preview_path: str | Path, registry_path: str | Path,
    entry_id: str, selected_relative_path: str,
    production_sha256: str, preview_sha256: str,
    confirmed: bool, previous_entry_id: str | None = None,
    previous_sha256: str | None = None,
    ownership_revision: int | None = None,
    acknowledge_changed_output: bool = False,
    active_entry_ids: frozenset[str] | None = None,
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
            active_entry_ids=active_entry_ids,
        )
        if (
            report["previous_entry_id"] != previous_entry_id
            or (previous_entry_id is not None and (
                report["ownership_revision"] != ownership_revision
                or report["previous_sha256"] != previous_sha256
            ))
        ):
            raise ExistingOutputTakeoverError(
                "Ownership changed since Preview; refresh required"
            )
        if not hmac.compare_digest(report["production_sha256"], production_sha256) or (
            not hmac.compare_digest(report["preview_sha256"], preview_sha256)
        ):
            raise ExistingOutputTakeoverError(
                "File or Preview changed; review again"
            )
        if (report["recorded_sha_mismatch"] and
                acknowledge_changed_output is not True):
            raise ExistingOutputTakeoverError(
                "Previous owner managed a DIFFERENT YAML. "
                "Explicit changed-file approval is required"
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
        try:
            if previous_entry_id is not None:
                _transfer_inactive_owner_compat(
                    registry,
                    previous_entry_id=previous_entry_id,
                    entry_id=entry_id,
                    output_path=str(output),
                    sha256=production_sha256,
                    previous_sha256=previous_sha256,
                    expected_revision=ownership_revision,
                )
            else:
                registry.record_generation(
                    entry_id=entry_id, output_path=str(output),
                    sha256=production_sha256,
                )
        except (OSError, ValueError):
            # Keep the exact underlying reason in HA's private log. The
            # WebSocket error only carries a non-sensitive step identifier.
            _LOGGER.exception(
                "HVLS recovery: ownership registration failed after "
                "verified safety backup; production YAML was not overwritten"
            )
            raise ExistingOutputTakeoverError(
                "ownership_registration_failed_after_backup"
            ) from None
        ownership = evaluate_registered_output(output, entry_id, registry_file)
        if not ownership.write_allowed or ownership.status != "managed":
            raise ExistingOutputTakeoverError(
                "Ownership was recorded but requires verification"
            )
        return {
            "taken_over": True, "backup_name": safety_copy.name,
            "production_unchanged": True, "apply_performed": False,
            "reinstalled": previous_entry_id is not None,
            "replaced_file_recovered": report["recorded_sha_mismatch"],
        }
