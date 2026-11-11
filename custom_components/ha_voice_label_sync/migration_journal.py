"""Durable, compare-and-swap migration journal (no label or YAML mutations).

Each future label mutation must be preceded by an intent record. An intent
found after restart is ambiguous and requires review: this module never
guesses that a label operation succeeded. It NEVER calls HA registries.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from .migration_baseline import (
    BaselineError,
    _json_bytes,
    _regular_file,
    _sync_dir,
    _verified_baseline,
    migration_lock,
    storage_directory,
)

MAX_JOURNAL_BYTES = 1024 * 1024
MAX_OPERATIONS = 2000
_SHA = re.compile(r"^[0-9a-f]{64}$")
_IDENTIFIER = re.compile(r"^[a-zA-Z0-9_.:-]{1,128}$")
_ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
_PHASES = {
    "baseline_ready": {"labels_staging", "rollback_pending"},
    "labels_staging": {"labels_staged", "rollback_pending"},
    "labels_staged": {"review_pending", "rollback_pending"},
    "review_pending": {"cutover_prepared", "rollback_pending"},
    "cutover_prepared": {"reload_pending", "rollback_pending"},
    "reload_pending": {"google_validation_pending", "rollback_pending"},
    "google_validation_pending": {"complete", "rollback_pending"},
    "complete": {"rollback_pending"},
    "rollback_pending": {"rolled_back"},
    "rolled_back": set(),
}
_OP_STATES = {"intent", "applied", "rolled_back"}


class JournalError(ValueError):
    """Machine-readable error; no source, state attributes or secret values."""


def _valid_id(value: Any) -> bool:
    return isinstance(value, str) and bool(_IDENTIFIER.fullmatch(value))


def _check_revision(value: Any) -> None:
    if type(value) is not int or value < 0:
        raise JournalError("invalid_revision")


def _validated(data: Any, baseline_sha: str) -> dict[str, Any]:
    if not isinstance(data, dict) or set(data) != {
        "schema_version", "baseline_manifest_sha256", "revision",
        "phase", "operations",
    }:
        raise JournalError("journal_invalid")
    if data["schema_version"] != 1 or data["baseline_manifest_sha256"] != baseline_sha:
        raise JournalError("journal_baseline_mismatch")
    _check_revision(data["revision"])
    if not isinstance(data["phase"], str) or data["phase"] not in _PHASES:
        raise JournalError("journal_invalid_phase")
    operations = data["operations"]
    if not isinstance(operations, list) or len(operations) > MAX_OPERATIONS:
        raise JournalError("journal_invalid_operations")
    identifiers, entities = set(), set()
    for operation in operations:
        if not isinstance(operation, dict) or set(operation) != {
            "operation_id", "entity_id", "registry_id", "label_id",
            "expected_before", "expected_after", "status",
        }:
            raise JournalError("journal_invalid_operations")
        op_id = operation["operation_id"]
        entity_id = operation["entity_id"]
        if (
            not _valid_id(op_id)
            or not isinstance(entity_id, str)
            or not _ENTITY.fullmatch(entity_id)
            or not _valid_id(operation["registry_id"])
            or not _valid_id(operation["label_id"])
            or type(operation["expected_before"]) is not bool
            or type(operation["expected_after"]) is not bool
            or operation["expected_before"] == operation["expected_after"]
            or not isinstance(operation["status"], str)
            or operation["status"] not in _OP_STATES
            or op_id in identifiers
            or entity_id in entities
        ):
            raise JournalError("journal_invalid_operations")
        identifiers.add(op_id)
        entities.add(entity_id)
    return data


def _journal_file(storage: Path) -> Path:
    return storage / "journal.json"


def _read(storage: Path) -> dict[str, Any]:
    baseline_sha = _verified_baseline(storage)["manifest_sha256"]
    path = _journal_file(storage)
    if path.is_symlink():
        raise JournalError("journal_invalid_file")
    try:
        metadata = path.stat()
        if metadata.st_mode & 0o077 or metadata.st_size > MAX_JOURNAL_BYTES:
            raise JournalError("journal_invalid_file")
        raw = _regular_file(path)
        document = json.loads(raw)
    except (OSError, ValueError, UnicodeDecodeError, BaselineError) as exc:
        if isinstance(exc, JournalError):
            raise
        raise JournalError("journal_unavailable") from exc
    return _validated(document, baseline_sha)


def _new_file(path: Path, raw: bytes) -> None:
    fd = os.open(
        path,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0),
        0o600,
    )
    try:
        with os.fdopen(fd, "wb", closefd=False) as output:
            output.write(raw)
            output.flush()
            os.fsync(fd)
    finally:
        os.close(fd)


def _atomic_replace(storage: Path, data: dict[str, Any]) -> None:
    raw = _json_bytes(data)
    if len(raw) > MAX_JOURNAL_BYTES:
        raise JournalError("journal_size_limit")
    if list(storage.glob(".journal-pending-*")):
        raise JournalError("interrupted_journal_write")
    pending = storage / (".journal-pending-" + os.urandom(12).hex())
    try:
        _new_file(pending, raw)
        os.replace(pending, _journal_file(storage))
        _sync_dir(storage)
    finally:
        pending.unlink(missing_ok=True)


def initialize_journal(config_dir: str | Path) -> dict[str, Any]:
    """Initialize only after verified baseline exists; never reset old journal."""
    storage = storage_directory(config_dir)
    with migration_lock(storage):
        baseline_sha = _verified_baseline(storage)["manifest_sha256"]
        path = _journal_file(storage)
        if path.exists() or path.is_symlink():
            return _read(storage)
        if not _SHA.fullmatch(baseline_sha):
            raise JournalError("journal_baseline_mismatch")
        data = {
            "schema_version": 1,
            "baseline_manifest_sha256": baseline_sha,
            "revision": 0,
            "phase": "baseline_ready",
            "operations": [],
        }
        _new_file(path, _json_bytes(data))
        _sync_dir(storage)
        return _read(storage)


def read_journal(config_dir: str | Path) -> dict[str, Any]:
    """Read-only verification; refuses corrupt baselines and journals."""
    return _read(storage_directory(config_dir))


def _mutate(config_dir: str | Path, expected_revision: int, change) -> dict[str, Any]:
    _check_revision(expected_revision)
    storage = storage_directory(config_dir)
    with migration_lock(storage):
        current = _read(storage)
        if current["revision"] != expected_revision:
            raise JournalError("journal_revision_conflict")
        revised = json.loads(json.dumps(current))
        change(revised)
        _validated(revised, current["baseline_manifest_sha256"])
        revised["revision"] += 1
        _atomic_replace(storage, revised)
        return _read(storage)


def advance_phase(
    config_dir: str | Path, phase: str, *, expected_revision: int
) -> dict[str, Any]:
    """Record phase progression only; never perform the claimed external step."""
    def change(data: dict[str, Any]) -> None:
        if phase not in _PHASES[data["phase"]]:
            raise JournalError("phase_transition_refused")
        if (
            phase == "labels_staged"
            and any(op["status"] != "applied" for op in data["operations"])
        ):
            raise JournalError("unresolved_label_intents")
        if (
            phase == "rolled_back"
            and any(op["status"] != "rolled_back" for op in data["operations"])
        ):
            raise JournalError("unresolved_label_rollback")
        data["phase"] = phase

    return _mutate(config_dir, expected_revision, change)


def record_label_intent(
    config_dir: str | Path,
    *,
    operation_id: str,
    entity_id: str,
    registry_id: str,
    label_id: str,
    expected_before: bool,
    expected_after: bool,
    expected_revision: int,
) -> dict[str, Any]:
    """Durably record one exact planned label toggle BEFORE any label write."""
    operation = {
        "operation_id": operation_id,
        "entity_id": entity_id,
        "registry_id": registry_id,
        "label_id": label_id,
        "expected_before": expected_before,
        "expected_after": expected_after,
        "status": "intent",
    }

    def change(data: dict[str, Any]) -> None:
        if data["phase"] != "labels_staging":
            raise JournalError("label_intent_wrong_phase")
        if len(data["operations"]) >= MAX_OPERATIONS:
            raise JournalError("too_many_label_operations")
        data["operations"].append(operation)

    return _mutate(config_dir, expected_revision, change)


def mark_label_applied(
    config_dir: str | Path,
    operation_id: str,
    *,
    registry_id: str,
    current_membership: bool,
    expected_revision: int,
) -> dict[str, Any]:
    """Acknowledge an externally completed toggle, only after fresh HA CAS.

    Pending intents after crash must NOT be acknowledged automatically; the
    caller must have just performed and verified the actual toggle.
    """
    def change(data: dict[str, Any]) -> None:
        if data["phase"] != "labels_staging":
            raise JournalError("label_apply_wrong_phase")
        operation = next(
            (op for op in data["operations"] if op["operation_id"] == operation_id),
            None,
        )
        if operation is None or operation["status"] != "intent":
            raise JournalError("label_intent_unavailable")
        if (
            operation["registry_id"] != registry_id
            or type(current_membership) is not bool
            or current_membership != operation["expected_after"]
        ):
            raise JournalError("label_apply_conflict")
        operation["status"] = "applied"

    return _mutate(config_dir, expected_revision, change)


def mark_label_rolled_back(
    config_dir: str | Path,
    operation_id: str,
    *,
    registry_id: str,
    current_membership: bool,
    expected_revision: int,
) -> dict[str, Any]:
    """Acknowledge a separately verified reversal without touching other labels."""
    def change(data: dict[str, Any]) -> None:
        if data["phase"] != "rollback_pending":
            raise JournalError("label_rollback_wrong_phase")
        operation = next(
            (op for op in data["operations"] if op["operation_id"] == operation_id),
            None,
        )
        if operation is None or operation["status"] != "applied":
            raise JournalError("label_rollback_unavailable")
        if (
            operation["registry_id"] != registry_id
            or type(current_membership) is not bool
            or current_membership != operation["expected_before"]
        ):
            raise JournalError("label_rollback_conflict")
        operation["status"] = "rolled_back"

    return _mutate(config_dir, expected_revision, change)


def recovery_report(
    config_dir: str | Path, observed: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    """Classify uncertainty; never infer success from intent or modify labels.

    Observations must be obtained from the actual HA registry on its event
    loop by a future authorized caller, not from stale diagnostic output.
    """
    journal = read_journal(config_dir)
    rows = []
    for operation in journal["operations"]:
        entity_id = operation["entity_id"]
        current = observed.get(entity_id)
        if not isinstance(current, dict):
            status = "entity_unavailable"
        elif current.get("registry_id") != operation["registry_id"]:
            status = "registry_identity_changed"
        elif type(current.get("has_label")) is not bool:
            status = "membership_unknown"
        elif operation["status"] == "intent":
            status = "unconfirmed_intent"
        elif operation["status"] == "applied":
            status = (
                "applied_verified"
                if current["has_label"] == operation["expected_after"]
                else "membership_changed"
            )
        else:
            status = (
                "rollback_verified"
                if current["has_label"] == operation["expected_before"]
                else "membership_changed"
            )
        rows.append(
            {
                "operation_id": operation["operation_id"],
                "entity_id": entity_id,
                "status": status,
                "needs_review": status not in {
                    "applied_verified", "rollback_verified"
                },
            }
        )
    return {
        "phase": journal["phase"],
        "revision": journal["revision"],
        "operations": rows,
        "needs_review": any(item["needs_review"] for item in rows),
        "cutover_allowed": False,
    }
