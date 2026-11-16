"""Repair a stale output *reservation* after explicit fresh installation.

This never creates, modifies or adopts a YAML file. A missing production
file may be regenerated normally from the current Home Assistant labels.
An active owner, a pending transaction, a present file or a restore hold
always prevents retiring an old claim.
"""

from __future__ import annotations

from pathlib import Path

from hvls.output_ownership_registry import OwnershipRegistry
from hvls.owned_writer import _operation_lock, _safe_path

from .restore_guard import assert_not_guarded


def retire_missing_inactive_owner(
    *,
    output_path: str | Path,
    registry_path: str | Path,
    entry_id: str,
    active_entry_ids: frozenset[str],
) -> bool:
    """Retire exactly one inactive managed claim for an absent first output.

    The output never gets touched; an existing file remains protected.
    This is metadata housekeeping, not an authorization to write YAML.
    """
    if not isinstance(entry_id, str) or not entry_id:
        raise ValueError("New installation identity unavailable")
    output = _safe_path(output_path)
    registry_file = _safe_path(registry_path)

    with _operation_lock(registry_file):
        # Refuse silently if the scenario is not an absent, safe first output.
        if output.exists() or output.is_symlink() or not output.parent.is_dir():
            return False
        assert_not_guarded(registry_file, entry_id, output)
        registry = OwnershipRegistry(registry_file)
        data = registry._load()
        records = data["records"]
        if entry_id in records:
            return False

        matches = [
            (owner_id, record)
            for owner_id, record in records.items()
            if record["output_path"] == str(output)
        ]
        if len(matches) != 1:
            return False
        previous_id, previous = matches[0]
        if previous_id in active_entry_ids or previous.get("state") != "managed":
            return False

        # Recheck missing file and guard before any registry mutation.
        if output.exists() or output.is_symlink():
            return False
        assert_not_guarded(registry_file, entry_id, output)
        del records[previous_id]
        registry._save(data)  # Atomic, revision-checked update.
        return True
