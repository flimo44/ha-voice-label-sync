"""Durable ADMIN APPROVAL INTENT evidence, emphatically NOT stage authority.

Strict private append-only chain + independently updated head to detect
truncation and incomplete writes. A record is only an audit fact about a
human's stated intent. No future executor may accept it as an approval token.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
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
    _write_new,
    migration_lock,
    storage_directory,
    verify_baseline,
)
from .migration_decision_draft import load_review_draft
from .migration_journal import read_journal

_SUBDIR = "execution-approval-intent-evidence"
_HEAD = "head.json"
_PURPOSE = "administrator_approval_intent_evidence_not_execution_authority"
_ACTION = "stage_one_label_addition"
_SHA = re.compile(r"^[0-9a-f]{64}$")
_ENTITY = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
_SEQUENCE = re.compile(r"^[0-9]{6}\.json$")
_GENESIS = "0" * 64
_MAX_ENTRIES = 1000
_HEAD_KEYS = frozenset({
    "schema_version", "purpose", "record_count", "record_sha256",
    "baseline_manifest_sha256",
})
_RECORD_KEYS = frozenset({
    "schema_version", "purpose", "sequence", "previous_sha256",
    "record_sha256", "baseline_manifest_sha256", "journal_revision",
    "journal_sha256", "saved_draft_sha256", "admission_evidence_sha256",
    "entity_id", "action", "administrator_id_sha256", "confirmed_at_utc",
})


class ApprovalEvidenceError(ValueError):
    """Sanitized, constant storage error codes only."""


def _hash(value: Any) -> str:
    return hashlib.sha256(_json_bytes(value)).hexdigest()


def _sha(value: Any) -> bool:
    return isinstance(value, str) and _SHA.fullmatch(value) is not None


def _safe(record: dict[str, Any]) -> dict[str, Any]:
    """No administrator identifier, source content or approval credential."""
    return {
        "sequence": record["sequence"],
        "entity_id": record["entity_id"],
        "action": record["action"],
        "confirmed_at_utc": record["confirmed_at_utc"],
        "record_sha256": record["record_sha256"],
        "admission_evidence_sha256": record["admission_evidence_sha256"],
        "journal_revision": record["journal_revision"],
        "approval_intent_is_not_execution_authorization": True,
        "execution_authorized": False,
        "journal_ack_allowed": False,
        "retry_allowed": False,
        "rollback_allowed": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
    }


def _directory(storage: Path, *, create: bool) -> Path | None:
    path = storage / _SUBDIR
    if not path.exists() and not path.is_symlink() and not create:
        return None
    try:
        _private_directory(path, create=create)
    except (OSError, BaselineError, ValueError) as exc:
        raise ApprovalEvidenceError("approval_history_directory_unsafe") from exc
    return path


def _read_private_json(path: Path) -> dict[str, Any]:
    try:
        raw = _regular_file(path)
        if len(raw) > 4096 or path.stat().st_mode & 0o077:
            raise ApprovalEvidenceError("approval_history_file_unsafe")
        result = json.loads(raw)
    except (OSError, BaselineError, TypeError, ValueError) as exc:
        raise ApprovalEvidenceError("approval_history_file_unreadable") from exc
    if not isinstance(result, dict):
        raise ApprovalEvidenceError("approval_history_file_invalid")
    return result


def _verified_record(
    value: Any, sequence: int, predecessor: str, baseline_sha: str,
) -> dict[str, Any]:
    if (
        not isinstance(value, dict)
        or set(value) != _RECORD_KEYS
        or type(value.get("schema_version")) is not int
        or value["schema_version"] != 1
        or value.get("purpose") != _PURPOSE
        or type(value.get("sequence")) is not int
        or value["sequence"] != sequence
        or value.get("previous_sha256") != predecessor
        or value.get("baseline_manifest_sha256") != baseline_sha
        or type(value.get("journal_revision")) is not int
        or value["journal_revision"] < 0
        or not isinstance(value.get("entity_id"), str)
        or len(value["entity_id"]) > 255
        or _ENTITY.fullmatch(value["entity_id"]) is None
        or value.get("action") != _ACTION
        or any(
            not _sha(value.get(k)) for k in (
                "record_sha256", "journal_sha256", "saved_draft_sha256",
                "admission_evidence_sha256", "administrator_id_sha256",
            )
        )
        or not isinstance(value.get("confirmed_at_utc"), str)
        or len(value["confirmed_at_utc"]) > 64
    ):
        raise ApprovalEvidenceError("approval_record_schema_invalid")
    try:
        timestamp = datetime.fromisoformat(value["confirmed_at_utc"])
    except ValueError as exc:
        raise ApprovalEvidenceError("approval_record_timestamp_invalid") from exc
    if timestamp.utcoffset() is None:
        raise ApprovalEvidenceError("approval_record_timestamp_invalid")
    if _hash({k: v for k, v in value.items() if k != "record_sha256"}) != (
        value["record_sha256"]
    ):
        raise ApprovalEvidenceError("approval_record_hash_changed")
    return value


def _read(storage: Path, baseline_sha: str) -> list[dict[str, Any]]:
    directory = _directory(storage, create=False)
    if directory is None:
        return []
    try:
        items = list(directory.iterdir())
    except OSError as exc:
        raise ApprovalEvidenceError("approval_history_unreadable") from exc
    if not items or len(items) > _MAX_ENTRIES + 1:
        raise ApprovalEvidenceError("approval_history_interrupted_or_full")
    if any(
        x.name != _HEAD and (
            _SEQUENCE.fullmatch(x.name) is None or x.name == "000000.json"
        )
        for x in items
    ):
        raise ApprovalEvidenceError("approval_history_unexpected_file")
    if not any(x.name == _HEAD for x in items):
        raise ApprovalEvidenceError("approval_history_head_missing")
    head = _read_private_json(directory / _HEAD)
    if (
        set(head) != _HEAD_KEYS
        or type(head.get("schema_version")) is not int
        or head["schema_version"] != 1
        or head.get("purpose") != _PURPOSE
        or type(head.get("record_count")) is not int
        or not 0 <= head["record_count"] <= _MAX_ENTRIES
        or head.get("baseline_manifest_sha256") != baseline_sha
        or not _sha(head.get("record_sha256"))
    ):
        raise ApprovalEvidenceError("approval_history_head_invalid")
    entries = sorted(
        (p for p in items if p.name != _HEAD), key=lambda p: p.name
    )
    if len(entries) != head["record_count"]:
        raise ApprovalEvidenceError("approval_history_head_count_mismatch")
    history: list[dict[str, Any]] = []
    previous = _GENESIS
    for n, path in enumerate(entries, 1):
        if path.name != f"{n:06d}.json":
            raise ApprovalEvidenceError("approval_history_sequence_gap")
        record = _verified_record(
            _read_private_json(path), n, previous, baseline_sha
        )
        history.append(record)
        previous = record["record_sha256"]
    if head["record_sha256"] != previous:
        raise ApprovalEvidenceError("approval_history_head_digest_mismatch")
    return history


def load_approval_intent_history(config_dir: str) -> dict[str, Any]:
    """Verify full chain AND anchored head without touching any files."""
    try:
        baseline = verify_baseline(config_dir)
        history = _read(
            storage_directory(config_dir), baseline["manifest_sha256"]
        )
    except (BaselineError, OSError, ValueError, TypeError) as exc:
        if isinstance(exc, ApprovalEvidenceError):
            raise
        raise ApprovalEvidenceError("approval_history_unavailable") from exc
    return {
        "status": "verified_approval_intent_evidence_only",
        "record_count": len(history),
        "last_record_sha256": history[-1]["record_sha256"]
        if history else _GENESIS,
        "records": [_safe(r) for r in history[-50:]],
        "read_only": True,
        "history_is_not_execution_authorization": True,
        "execution_authorized": False,
        "stage_allowed": False,
        "journal_ack_allowed": False,
        "cutover_allowed": False,
    }


def append_approval_intent_evidence(
    config_dir: str, *,
    expected_record_count: int,
    expected_last_record_sha256: str,
    expected_journal_sha256: str,
    expected_journal_revision: int,
    expected_draft_sha256: str,
    admission_evidence_sha256: str,
    entity_id: str,
    action: str,
    administrator_id: str,
) -> dict[str, Any]:
    """Only authorized write: one NON-executable, append-only audit fact."""
    if (
        type(expected_record_count) is not int
        or not 0 <= expected_record_count < _MAX_ENTRIES
        or not all(_sha(x) for x in (
            expected_last_record_sha256, expected_journal_sha256,
            expected_draft_sha256, admission_evidence_sha256,
        ))
        or type(expected_journal_revision) is not int
        or expected_journal_revision < 0
        or not isinstance(entity_id, str) or len(entity_id) > 255
        or _ENTITY.fullmatch(entity_id) is None
        or action != _ACTION
        or not isinstance(administrator_id, str)
        or not 0 < len(administrator_id) <= 128
    ):
        raise ApprovalEvidenceError("invalid_approval_evidence_request")
    try:
        storage = storage_directory(config_dir)
        with migration_lock(storage):
            baseline = verify_baseline(config_dir)
            baseline_sha = baseline["manifest_sha256"]
            journal = read_journal(config_dir)
            if (
                journal["revision"] != expected_journal_revision
                or journal["phase"] not in ("baseline_ready", "labels_staging")
                or _hash(journal) != expected_journal_sha256
                or any(
                    x.get("entity_id") == entity_id
                    for x in journal["operations"]
                )
            ):
                raise ApprovalEvidenceError("approval_journal_changed_or_unsafe")
            draft = load_review_draft(config_dir)
            choices = draft.get("decisions")
            choice = choices.get(entity_id) if isinstance(choices, dict) else None
            if (
                draft.get("status") != "saved_unapproved_draft"
                or draft.get("stored_choices_unapproved") is not True
                or not isinstance(choice, dict)
                or choice.get("action") != "import"
                or _hash(draft) != expected_draft_sha256
                or draft.get("baseline_manifest_sha256") != baseline_sha
                or journal.get("baseline_manifest_sha256") != baseline_sha
            ):
                raise ApprovalEvidenceError("approval_draft_changed_or_unsafe")
            expected_sources = sorted(
                (item["path"], item["digest_sha256"])
                for item in baseline["files"]
            )
            _capture_sources(
                Path(config_dir).resolve(strict=True), expected_sources
            )

            history = _read(storage, baseline_sha)
            previous = history[-1]["record_sha256"] if history else _GENESIS
            if (
                len(history) != expected_record_count
                or previous != expected_last_record_sha256
            ):
                raise ApprovalEvidenceError("approval_history_cas_conflict")

            directory = _directory(storage, create=True)
            assert directory is not None
            if not history and not (directory / _HEAD).exists():
                initial_head = {
                    "schema_version": 1, "purpose": _PURPOSE,
                    "record_count": 0, "record_sha256": _GENESIS,
                    "baseline_manifest_sha256": baseline_sha,
                }
                _write_new(directory / _HEAD, _json_bytes(initial_head))
                _sync_dir(directory)

            seq = len(history) + 1
            record = {
                "schema_version": 1, "purpose": _PURPOSE,
                "sequence": seq, "previous_sha256": previous,
                "baseline_manifest_sha256": baseline_sha,
                "journal_revision": journal["revision"],
                "journal_sha256": expected_journal_sha256,
                "saved_draft_sha256": expected_draft_sha256,
                "admission_evidence_sha256": admission_evidence_sha256,
                "entity_id": entity_id, "action": action,
                "administrator_id_sha256": hashlib.sha256(
                    administrator_id.encode("utf-8")
                ).hexdigest(),
                "confirmed_at_utc": datetime.now(UTC).isoformat(),
            }
            record["record_sha256"] = _hash(record)
            _verified_record(record, seq, previous, baseline_sha)
            _write_new(
                directory / f"{seq:06d}.json", _json_bytes(record)
            )
            _sync_dir(directory)

            # Independent HEAD is updated last. If a crash interrupts the
            # record/head sequence, the count/digest mismatch blocks ALL
            # further appends; no implicit repair or silent overwrites.
            head = {
                "schema_version": 1, "purpose": _PURPOSE,
                "record_count": seq, "record_sha256": record["record_sha256"],
                "baseline_manifest_sha256": baseline_sha,
            }
            tmp = directory / (".head-pending-" + secrets.token_hex(16))
            _write_new(tmp, _json_bytes(head))
            os.replace(tmp, directory / _HEAD)
            _sync_dir(directory)
            return {
                "status": "durable_approval_intent_recorded_no_execution",
                "record": _safe(record),
                "record_count": seq,
                "record_fsync_completed": True,
                "history_head_fsync_completed": True,
                "approval_intent_is_not_execution_authorization": True,
                "execution_authorized": False,
                "journal_ack_allowed": False,
                "retry_allowed": False,
                "rollback_allowed": False,
                "stage_allowed": False,
                "apply_allowed": False,
                "cutover_allowed": False,
                "label_changed": False,
                "journal_changed": False,
                "production_yaml_changed": False,
            }
    except (BaselineError, OSError, ValueError, TypeError, KeyError) as exc:
        if isinstance(exc, ApprovalEvidenceError):
            raise
        raise ApprovalEvidenceError("approval_evidence_append_failed") from exc
