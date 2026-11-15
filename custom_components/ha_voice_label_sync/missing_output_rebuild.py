"""Reviewed recreation of a missing, previously HVLS-owned YAML.

An absent managed file may be rebuilt using the current HA-label Preview,
without removing ownership metadata or weakening ordinary write checks.
No existing file, symlink, foreign claim, or pending transaction is altered.
"""

from __future__ import annotations

import hashlib
from datetime import datetime
from pathlib import Path

from hvls import FileWriterError
from hvls.models import FileWriteResult
from hvls.output_ownership_registry import OwnershipRegistry
from hvls.owned_writer import _operation_lock, _safe_path

from .restore_guard import assert_not_guarded


def rebuild_missing_owned_output(
    *,
    output_path: str | Path,
    content: str,
    entry_id: str,
    ownership_registry_path: str | Path,
) -> FileWriteResult:
    """Recreate ONLY a disappeared managed output following reviewed Apply.

    The caller must independently bind the approved Preview digest to the
    current HA registries. We verify ownership again under the output lock,
    reserve a durable pending_create transition, and use O_EXCL creation.
    On an interrupted write, the pending record deliberately blocks retries.
    """
    if not isinstance(content, str) or not content.strip():
        raise FileWriterError("Cannot rebuild an empty YAML.")
    if not isinstance(entry_id, str) or not entry_id.strip():
        raise FileWriterError("Missing HVLS installation identity")

    output = _safe_path(output_path)
    registry_file = _safe_path(ownership_registry_path)
    if output in {
        registry_file,
        registry_file.with_name(registry_file.name + ".lock"),
        registry_file.with_name(registry_file.name + ".write.lock"),
    }:
        raise FileWriterError("Output path conflicts with ownership metadata")

    data_bytes = content.encode("utf-8")
    digest = hashlib.sha256(data_bytes).hexdigest()
    with _operation_lock(registry_file):
        _safe_path(output)
        _safe_path(registry_file)
        assert_not_guarded(registry_file, entry_id, output)

        if output.exists() or output.is_symlink():
            raise FileWriterError(
                "Production file reappeared; examine it before rebuilding."
            )
        if not output.parent.is_dir():
            raise FileWriterError("Production directory is unavailable")

        registry = OwnershipRegistry(registry_file)
        state = registry._load()
        records = state["records"]
        record = records.get(entry_id)
        if (
            record is None
            or record.get("state") != "managed"
            or record.get("output_path") != str(output)
        ):
            raise FileWriterError(
                "Missing file is not managed by this HVLS installation."
            )
        registry._ensure_path_not_claimed(records, entry_id, str(output))

        # Pinned HVLS core lacks a missing-file transition API. Keep the
        # existing recorded identity but use its durable pending_create
        # state, which create_reserved_output already verifies and finalizes.
        records[entry_id] = {
            "state": "pending_create",
            "output_path": str(output),
            "next_sha256": digest,
        }
        registry._save(state)
        registry.create_reserved_output(entry_id=entry_id, content=data_bytes)

    return FileWriteResult(
        output_path=output,
        backup_path=None,  # There was no production file to back up.
        bytes_written=len(data_bytes),
        written_at=datetime.now(),
    )
