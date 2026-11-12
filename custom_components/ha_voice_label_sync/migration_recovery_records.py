"""Append-only *investigation* audit records, not recovery authorization.

Every record captures a human decision to INVESTIGATE an unresolved
migration operation. Files are never edited or removed. Each record is
protected by the baseline/journal CAS, chained SHA-256, a private 0700
directory, and a 0600 O_EXCL file. A crash/corruption fails closed.
None of these records can authorize label/YAML writes, journal ACK, retry,
rollback or Google Assistant cutover.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .migration_baseline import (
    BaselineError,
    _capture_sources,
    _json_bytes,
    _private_directory,
    _regular_file,
    _sync_dir,
    migration_lock,
    storage_directory,
    verify_baseline,
)
from .migration_journal import JournalError, read_journal

_DIR = "recovery-investigation-records"
_MAX_RECORDS = 1000
_SHA = re.compile(r"^[0-9a-f]{64}$")
_ID = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
_GENESIS = "0" * 64
_DISPOSITIONS = frozenset({
    "inspect_external_effects",
    "quarantine_for_investigation",
    "defer_until_further_evidence",
})
_KEYS = frozenset({
    "schema_version", "purpose", "sequence", "previous_sha256",
    "record_sha256", "baseline_manifest_sha256",
    "journal_revision", "journal_evidence_sha256",
    "observed_evidence_sha256", "entity_id", "disposition",
    "reviewed_by_sha256", "reviewed_at_utc",
})
_PURPOSE = "human_investigation_record_not_execution_authority"


class RecoveryLedgerError(ValueError):
    """Fixed safe error code only. Never return private file content."""


def _digest(value: Any) -> str:
    return hashlib.sha256(_json_bytes(value)).hexdigest()


def _journal_digest(journal: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(
        journal, sort_keys=True, separators=(",", ":"),
        ensure_ascii=False, allow_nan=False,
    ).encode("utf-8")).hexdigest()


def _public(record: dict[str, Any]) -> dict[str, Any]:
    """Do not expose the persisted admin hash or other private internals."""
    return {
        "sequence": record["sequence"],
        "entity_id": record["entity_id"],
        "disposition": record["disposition"],
        "journal_revision": record["journal_revision"],
        "journal_evidence_sha256": record["journal_evidence_sha256"],
        "observed_evidence_sha256": record["observed_evidence_sha256"],
        "record_sha256": record["record_sha256"],
        "reviewed_at_utc": record["reviewed_at_utc"],
        "record_is_not_execution_authorization": True,
        "execution_authorized": False,
        "journal_ack_allowed": False,
        "retry_allowed": False,
        "rollback_allowed": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
    }


def _directory(storage: Path, *, create: bool) -> Path | None:
    path = storage / _DIR
    if not path.exists() and not path.is_symlink() and not create:
        return None
    try:
        _private_directory(path, create=create)
    except (BaselineError, OSError, ValueError) as exc:
        raise RecoveryLedgerError("ledger_directory_unavailable") from exc
    return path


def _verified_record(value: Any, sequence: int, previous: str,
                     baseline: str) -> dict[str, Any]:
    if (
        not isinstance(value, dict)
        or set(value) != _KEYS
        or value.get("schema_version") != 1
        or value.get("purpose") != _PURPOSE
        or type(value.get("sequence")) is not int
        or value["sequence"] != sequence
        or value.get("previous_sha256") != previous
        or value.get("baseline_manifest_sha256") != baseline
        or type(value.get("journal_revision")) is not int
        or value["journal_revision"] < 0
        or not isinstance(value.get("entity_id"), str)
        or not _ID.fullmatch(value["entity_id"])
        or value.get("disposition") not in _DISPOSITIONS
        or any(
            not isinstance(value.get(k), str)
            or not _SHA.fullmatch(value[k])
            for k in (
                "record_sha256", "journal_evidence_sha256",
                "observed_evidence_sha256", "reviewed_by_sha256",
            )
        )
        or not isinstance(value.get("reviewed_at_utc"), str)
        or len(value["reviewed_at_utc"]) > 64
    ):
        raise RecoveryLedgerError("ledger_record_invalid")
    try:
        stamp = datetime.fromisoformat(value["reviewed_at_utc"])
    except ValueError as exc:
        raise RecoveryLedgerError("ledger_record_invalid") from exc
    if stamp.tzinfo is None or stamp.utcoffset() is None:
        raise RecoveryLedgerError("ledger_record_invalid")
    raw_without_sha = {
        k: v for k, v in value.items() if k != "record_sha256"
    }
    if value["record_sha256"] != _digest(raw_without_sha):
        raise RecoveryLedgerError("ledger_record_hash_invalid")
    return value


def _read(storage: Path, baseline: str) -> list[dict[str, Any]]:
    directory = _directory(storage, create=False)
    if directory is None:
        return []
    try:
        paths = list(directory.iterdir())
    except OSError as exc:
        raise RecoveryLedgerError("ledger_directory_unreadable") from exc
    if len(paths) > _MAX_RECORDS:
        raise RecoveryLedgerError("ledger_capacity_or_interrupted_write")
    if any(
        not re.fullmatch(r"[0-9]{6}\.json", path.name)
        or path.name == "000000.json"
        for path in paths
    ):
        raise RecoveryLedgerError("ledger_unexpected_file_or_crash")
    paths.sort(key=lambda path: path.name)
    records = []
    previous = _GENESIS
    for sequence, path in enumerate(paths, start=1):
        if path.name != f"{sequence:06d}.json":
            raise RecoveryLedgerError("ledger_gap_or_truncation")
        try:
            if path.is_symlink() or path.stat().st_size > 4096:
                raise RecoveryLedgerError("ledger_record_invalid")
            raw = _regular_file(path)
            if len(raw) > 4096 or path.stat().st_mode & 0o077:
                raise RecoveryLedgerError("ledger_record_invalid")
            parsed = json.loads(raw)
        except (BaselineError, OSError, TypeError, ValueError) as exc:
            raise RecoveryLedgerError("ledger_record_unreadable") from exc
        item = _verified_record(parsed, sequence, previous, baseline)
        records.append(item)
        previous = item["record_sha256"]
    return records


def load_investigation_ledger(config_dir: str) -> dict[str, Any]:
    """Read and verify full local hash chain; no filesystem writes."""
    try:
        storage = storage_directory(config_dir)
        baseline = verify_baseline(config_dir)
        records = _read(storage, baseline["manifest_sha256"])
    except (BaselineError, JournalError, OSError, TypeError, ValueError) as exc:
        if isinstance(exc, RecoveryLedgerError):
            raise
        raise RecoveryLedgerError("ledger_storage_unavailable") from exc
    return {
        "status": "verified_readonly_ledger",
        "record_count": len(records),
        "last_record_sha256": records[-1]["record_sha256"]
        if records else _GENESIS,
        "records": [_public(item) for item in records[-50:]],
        "read_only": True,
        "history_is_not_execution_authorization": True,
        "execution_authorized": False,
        "stage_allowed": False,
        "cutover_allowed": False,
    }


def append_investigation_record(
    config_dir: str, *,
    expected_record_count: int,
    expected_last_record_sha256: str,
    expected_journal_revision: int,
    expected_journal_evidence_sha256: str,
    expected_observed_evidence_sha256: str,
    entity_id: str,
    disposition: str,
    administrator_id: str,
) -> dict[str, Any]:
    """Persist ONE reviewed investigation, never modify journal/labels/YAML."""
    if (
        type(expected_record_count) is not int
        or not 0 <= expected_record_count < _MAX_RECORDS
        or type(expected_journal_revision) is not int
        or expected_journal_revision < 0
        or not isinstance(expected_last_record_sha256, str)
        or not _SHA.fullmatch(expected_last_record_sha256)
        or not isinstance(expected_journal_evidence_sha256, str)
        or not _SHA.fullmatch(expected_journal_evidence_sha256)
        or not isinstance(expected_observed_evidence_sha256, str)
        or not _SHA.fullmatch(expected_observed_evidence_sha256)
        or not isinstance(entity_id, str) or not _ID.fullmatch(entity_id)
        or disposition not in _DISPOSITIONS
        or not isinstance(administrator_id, str)
        or not 0 < len(administrator_id) <= 128
    ):
        raise RecoveryLedgerError("ledger_record_request_invalid")
    try:
        storage = storage_directory(config_dir)
        with migration_lock(storage):
            baseline = verify_baseline(config_dir)
            journal = read_journal(config_dir)
            if (
                journal["phase"] != "labels_staging"
                or journal["revision"] != expected_journal_revision
                or _journal_digest(journal)
                != expected_journal_evidence_sha256
            ):
                raise RecoveryLedgerError("journal_changed_during_confirmation")
            _capture_sources(
                Path(config_dir).resolve(strict=True),
                sorted(
                    (item["path"], item["digest_sha256"])
                    for item in baseline["files"]
                ),
            )
            records = _read(storage, baseline["manifest_sha256"])
            last_sha = records[-1]["record_sha256"] if records else _GENESIS
            if (
                len(records) != expected_record_count
                or last_sha != expected_last_record_sha256
            ):
                raise RecoveryLedgerError("ledger_changed_since_prepare")
            directory = _directory(storage, create=True)
            assert directory is not None
            sequence = len(records) + 1
            record = {
                "schema_version": 1, "purpose": _PURPOSE,
                "sequence": sequence,
                "previous_sha256": last_sha,
                "baseline_manifest_sha256": baseline["manifest_sha256"],
                "journal_revision": journal["revision"],
                "journal_evidence_sha256": expected_journal_evidence_sha256,
                "observed_evidence_sha256": expected_observed_evidence_sha256,
                "entity_id": entity_id, "disposition": disposition,
                "reviewed_by_sha256": hashlib.sha256(
                    administrator_id.encode("utf-8")
                ).hexdigest(),
                "reviewed_at_utc": datetime.now(UTC).isoformat(),
            }
            record["record_sha256"] = _digest(record)
            _verified_record(
                record, sequence, last_sha, baseline["manifest_sha256"]
            )
            # O_EXCL means a crash/foreign file can never be overwritten.
            # A partially created file is deliberately not cleaned up:
            # subsequent reads fail closed and require manual inspection.
            target = directory / f"{sequence:06d}.json"
            flags = (
                os.O_WRONLY | os.O_CREAT | os.O_EXCL
                | getattr(os, "O_NOFOLLOW", 0)
            )
            fd = os.open(target, flags, 0o600)
            try:
                with os.fdopen(fd, "wb", closefd=False) as handle:
                    handle.write(_json_bytes(record))
                    handle.flush()
                    os.fsync(handle.fileno())
            finally:
                os.close(fd)
            _sync_dir(directory)
            return {
                "status": "investigation_recorded_no_execution",
                "record": _public(record),
                "record_count": sequence,
                "last_record_sha256": record["record_sha256"],
                "record_is_not_execution_authorization": True,
                "journal_ack_allowed": False, "retry_allowed": False,
                "rollback_allowed": False, "stage_allowed": False,
                "apply_allowed": False, "cutover_allowed": False,
                "execution_authorized": False,
                "production_yaml_changed": False,
                "label_changed": False,
                "journal_changed": False,
            }
    except (BaselineError, JournalError, OSError, TypeError, ValueError) as exc:
        if isinstance(exc, RecoveryLedgerError):
            raise
        raise RecoveryLedgerError("ledger_write_failed_or_unsafe") from exc
