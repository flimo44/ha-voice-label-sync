"""Durable ONE-SHOT consumption rehearsal, never a migration capability.

Reserve and burn records are separate immutable events in an anchored,
private, append-only ledger. "Burn" only writes an audit event: the native
HA registry, stage executor, migration journal and Google YAML are untouched.
An approval-intent record (#132) is *context*, never authorization.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
from datetime import UTC, datetime, timedelta
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
from .migration_execution_approval_records import load_approval_intent_history
from .migration_journal import read_journal

_DIR = "execution-one-shot-rehearsal"
_PURPOSE = "simulated_one_shot_consumption_not_execution_authority"
_ACTION = "stage_one_label_addition"
_RESERVE = "reserve_non_authorizing"
_BURN = "burn_without_execution"
_GENESIS = "0" * 64
_SHA = re.compile(r"^[0-9a-f]{64}$")
_ID = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")
_RECEIPT = re.compile(r"^[0-9a-f]{32}$")
_NAME = re.compile(r"^[0-9]{6}\.json$")
_LIMIT = 2000
_WINDOW_SECONDS = 600
_KEYS = frozenset({
    "schema_version", "purpose", "sequence", "previous_sha256", "record_sha256",
    "event", "receipt_id", "entity_id", "action", "administrator_sha256",
    "baseline_manifest_sha256", "journal_sha256", "journal_revision",
    "draft_sha256", "admission_evidence_sha256", "approval_intent_sha256",
    "reserved_record_sha256", "expires_at_utc", "event_at_utc",
})
_HEAD_KEYS = frozenset({
    "schema_version", "purpose", "record_count", "record_sha256",
    "baseline_manifest_sha256",
})


class OneShotRehearsalError(ValueError):
    """Only fixed error codes, never original YAML or other private data."""


def _hash(value: Any) -> str:
    return hashlib.sha256(_json_bytes(value)).hexdigest()


def _sha(value: Any) -> bool:
    return isinstance(value, str) and _SHA.fullmatch(value) is not None


def _instant(value: Any) -> datetime:
    if not isinstance(value, str) or len(value) > 64:
        raise OneShotRehearsalError("one_shot_timestamp_invalid")
    try:
        stamp = datetime.fromisoformat(value)
    except ValueError as exc:
        raise OneShotRehearsalError("one_shot_timestamp_invalid") from exc
    if stamp.utcoffset() is None:
        raise OneShotRehearsalError("one_shot_timestamp_invalid")
    return stamp


def _non_execution() -> dict[str, Any]:
    return {
        "rehearsal_only": True,
        "approval_intent_is_not_execution_authorization": True,
        "receipt_is_not_execution_capability": True,
        "execution_authorized": False,
        "journal_ack_allowed": False,
        "retry_allowed": False,
        "rollback_allowed": False,
        "stage_allowed": False,
        "apply_allowed": False,
        "cutover_allowed": False,
        "google_home_state_verified": False,
        "external_consumers_verified": False,
        "observation_atomic_across_processes": False,
    }


def _directory(storage: Path, *, create: bool) -> Path | None:
    path = storage / _DIR
    if not path.exists() and not path.is_symlink() and not create:
        return None
    try:
        _private_directory(path, create=create)
    except (BaselineError, OSError, ValueError) as exc:
        raise OneShotRehearsalError("one_shot_directory_unsafe") from exc
    return path


def _read_json(path: Path) -> dict[str, Any]:
    try:
        if path.is_symlink():
            raise OneShotRehearsalError("one_shot_symlink_forbidden")
        raw = _regular_file(path)
        if len(raw) > 4096 or path.stat().st_mode & 0o077:
            raise OneShotRehearsalError("one_shot_file_unsafe")
        parsed = json.loads(raw)
    except (OSError, BaselineError, ValueError, TypeError) as exc:
        raise OneShotRehearsalError("one_shot_unreadable") from exc
    if not isinstance(parsed, dict):
        raise OneShotRehearsalError("one_shot_schema_invalid")
    return parsed


def _record(value: Any, number: int, previous: str, baseline: str) -> dict:
    if (
        not isinstance(value, dict) or set(value) != _KEYS
        or type(value.get("schema_version")) is not int
        or value["schema_version"] != 1
        or value.get("purpose") != _PURPOSE
        or type(value.get("sequence")) is not int
        or value["sequence"] != number
        or value.get("previous_sha256") != previous
        or value.get("baseline_manifest_sha256") != baseline
        or value.get("event") not in {_RESERVE, _BURN}
        or not isinstance(value.get("receipt_id"), str)
        or _RECEIPT.fullmatch(value["receipt_id"]) is None
        or not isinstance(value.get("entity_id"), str)
        or len(value["entity_id"]) > 255
        or _ID.fullmatch(value["entity_id"]) is None
        or value.get("action") != _ACTION
        or type(value.get("journal_revision")) is not int
        or value["journal_revision"] < 0
        or any(not _sha(value.get(k)) for k in (
            "record_sha256", "administrator_sha256", "journal_sha256",
            "draft_sha256", "admission_evidence_sha256",
            "approval_intent_sha256", "reserved_record_sha256",
        ))
    ):
        raise OneShotRehearsalError("one_shot_record_invalid")
    event_at = _instant(value.get("event_at_utc"))
    expires_at = _instant(value.get("expires_at_utc"))
    if expires_at <= event_at and value["event"] == _RESERVE:
        raise OneShotRehearsalError("one_shot_reservation_expired_on_create")
    if _hash({k: v for k, v in value.items() if k != "record_sha256"}) != (
        value["record_sha256"]
    ):
        raise OneShotRehearsalError("one_shot_record_hash_changed")
    return value


def _read(storage: Path, baseline_sha: str) -> tuple[list[dict], dict]:
    directory = _directory(storage, create=False)
    if directory is None:
        return [], {}
    try:
        paths = list(directory.iterdir())
    except OSError as exc:
        raise OneShotRehearsalError("one_shot_directory_unreadable") from exc
    if (
        not paths or len(paths) > _LIMIT + 1
        or any(
            p.name != "head.json" and (
                _NAME.fullmatch(p.name) is None or p.name == "000000.json"
            ) for p in paths
        )
        or not (directory / "head.json").exists()
    ):
        raise OneShotRehearsalError("one_shot_head_missing_or_crash")
    head = _read_json(directory / "head.json")
    if (
        set(head) != _HEAD_KEYS
        or type(head.get("schema_version")) is not int
        or head["schema_version"] != 1
        or head.get("purpose") != _PURPOSE
        or type(head.get("record_count")) is not int
        or not 0 <= head["record_count"] <= _LIMIT
        or head.get("baseline_manifest_sha256") != baseline_sha
        or not _sha(head.get("record_sha256"))
    ):
        raise OneShotRehearsalError("one_shot_head_corrupt")
    records = sorted(
        (p for p in paths if p.name != "head.json"), key=lambda p: p.name
    )
    if len(records) != head["record_count"]:
        raise OneShotRehearsalError("one_shot_head_count_mismatch")
    events: list[dict] = []
    receipts: dict[str, dict[str, Any]] = {}
    previous = _GENESIS
    for n, path in enumerate(records, 1):
        if path.name != f"{n:06d}.json":
            raise OneShotRehearsalError("one_shot_sequence_gap")
        event = _record(_read_json(path), n, previous, baseline_sha)
        ident = event["receipt_id"]
        if event["event"] == _RESERVE:
            if ident in receipts or event["reserved_record_sha256"] != _GENESIS:
                raise OneShotRehearsalError("one_shot_duplicate_or_forged_reservation")
            receipts[ident] = {"reserve": event, "burn": None}
        else:
            prior = receipts.get(ident)
            if prior is None or prior["burn"] is not None:
                raise OneShotRehearsalError("one_shot_replay_or_orphan_burn")
            reserve = prior["reserve"]
            common = (
                "entity_id", "action", "administrator_sha256",
                "baseline_manifest_sha256", "journal_sha256",
                "journal_revision", "draft_sha256",
                "admission_evidence_sha256", "approval_intent_sha256",
                "expires_at_utc",
            )
            if (
                event["reserved_record_sha256"] != reserve["record_sha256"]
                or any(event[k] != reserve[k] for k in common)
                or _instant(event["event_at_utc"])
                > _instant(reserve["expires_at_utc"])
                or _instant(event["event_at_utc"])
                < _instant(reserve["event_at_utc"])
            ):
                raise OneShotRehearsalError("one_shot_burn_scope_invalid")
            prior["burn"] = event
        events.append(event)
        previous = event["record_sha256"]
    if previous != head["record_sha256"]:
        raise OneShotRehearsalError("one_shot_head_hash_mismatch")
    return events, receipts


def _public(event: dict, *, burned: bool, now: datetime) -> dict:
    return {
        "receipt_id": event["receipt_id"], "entity_id": event["entity_id"],
        "action": event["action"], "sequence": event["sequence"],
        "record_sha256": event["record_sha256"],
        "expires_at_utc": event["expires_at_utc"],
        "lifecycle": (
            "burned_without_execution" if burned else
            "expired_unusable" if _instant(event["expires_at_utc"]) <= now
            else "reserved_non_authorizing"
        ),
        **_non_execution(),
    }


def read_one_shot_rehearsals(config_dir: str) -> dict[str, Any]:
    """Verify ALL recorded events and anchored head; no disk writes."""
    try:
        baseline = verify_baseline(config_dir)
        events, receipts = _read(
            storage_directory(config_dir), baseline["manifest_sha256"]
        )
    except (BaselineError, OSError, ValueError, KeyError, TypeError) as exc:
        if isinstance(exc, OneShotRehearsalError):
            raise
        raise OneShotRehearsalError("one_shot_history_unavailable") from exc
    now = datetime.now(UTC)
    return {
        "status": "verified_non_authorizing_reservation_rehearsals",
        "event_count": len(events),
        "head_sha256": events[-1]["record_sha256"] if events else _GENESIS,
        "receipts": [
            _public(x["reserve"], burned=x["burn"] is not None, now=now)
            for x in list(receipts.values())[-50:]
        ],
        "read_only": True,
        "history_not_revalidated_against_live_ha": True,
        **_non_execution(),
    }


def _disk_context(config_dir: str, entity_id: str, admission_sha: str,
                  approval_sha: str, admin_sha: str) -> tuple:
    """Recheck private baseline, source, protected journal, saved draft,
    and latest approval-intent audit. The audit is evidence, NOT permission.
    """
    baseline = verify_baseline(config_dir)
    journal = read_journal(config_dir)
    draft = load_review_draft(config_dir)
    if (
        journal.get("phase") not in {"baseline_ready", "labels_staging"}
        or any(op.get("entity_id") == entity_id
               for op in journal.get("operations", []))
        or draft.get("status") != "saved_unapproved_draft"
        or draft.get("stored_choices_unapproved") is not True
        or draft.get("baseline_manifest_sha256") != baseline["manifest_sha256"]
        or journal.get("baseline_manifest_sha256") != baseline["manifest_sha256"]
        or not isinstance(draft.get("decisions"), dict)
        or not isinstance(draft["decisions"].get(entity_id), dict)
        or draft["decisions"][entity_id].get("action") != "import"
    ):
        raise OneShotRehearsalError("one_shot_protected_admission_conflict")
    _capture_sources(
        Path(config_dir).resolve(strict=True),
        sorted((x["path"], x["digest_sha256"]) for x in baseline["files"]),
    )
    history = load_approval_intent_history(config_dir)
    choices = [
        x for x in history["records"]
        if x["entity_id"] == entity_id
        and x["action"] == _ACTION
        and x["admission_evidence_sha256"] == admission_sha
    ]
    if not choices or choices[-1]["record_sha256"] != approval_sha:
        raise OneShotRehearsalError("one_shot_approval_context_changed")
    return baseline, journal, draft


def _publish(directory: Path, seq: int, record: dict, baseline_sha: str) -> None:
    if seq == 1 and not (directory / "head.json").exists():
        _write_new(directory / "head.json", _json_bytes({
            "schema_version": 1, "purpose": _PURPOSE,
            "record_count": 0, "record_sha256": _GENESIS,
            "baseline_manifest_sha256": baseline_sha,
        }))
        _sync_dir(directory)
    _write_new(directory / f"{seq:06d}.json", _json_bytes(record))
    _sync_dir(directory)
    head = {
        "schema_version": 1, "purpose": _PURPOSE,
        "record_count": seq, "record_sha256": record["record_sha256"],
        "baseline_manifest_sha256": baseline_sha,
    }
    temp = directory / (".head-pending-" + secrets.token_hex(16))
    _write_new(temp, _json_bytes(head))
    os.replace(temp, directory / "head.json")
    _sync_dir(directory)


def append_rehearsal_transition(
    config_dir: str, *, event: str, entity_id: str,
    administrator_id: str, admission_evidence_sha256: str,
    approval_intent_sha256: str, expected_journal_sha256: str,
    expected_draft_sha256: str, expected_event_count: int,
    expected_head_sha256: str, receipt_id: str | None = None,
) -> dict[str, Any]:
    """Append reserve or irreversible burn; NO stage, journal or HA updates."""
    if (
        event not in {_RESERVE, _BURN}
        or not isinstance(entity_id, str) or len(entity_id) > 255
        or _ID.fullmatch(entity_id) is None
        or not isinstance(administrator_id, str)
        or not 0 < len(administrator_id) <= 128
        or not all(_sha(x) for x in (
            admission_evidence_sha256, approval_intent_sha256,
            expected_journal_sha256, expected_draft_sha256,
            expected_head_sha256,
        ))
        or type(expected_event_count) is not int
        or not 0 <= expected_event_count < _LIMIT
        or (event == _BURN and (
            not isinstance(receipt_id, str)
            or _RECEIPT.fullmatch(receipt_id) is None
        ))
        or (event == _RESERVE and receipt_id is not None)
    ):
        raise OneShotRehearsalError("invalid_one_shot_transition_request")
    admin_sha = hashlib.sha256(administrator_id.encode("utf-8")).hexdigest()
    try:
        storage = storage_directory(config_dir)
        with migration_lock(storage):
            baseline, journal, draft = _disk_context(
                config_dir, entity_id, admission_evidence_sha256,
                approval_intent_sha256, admin_sha,
            )
            if (
                _hash(journal) != expected_journal_sha256
                or _hash(draft) != expected_draft_sha256
            ):
                raise OneShotRehearsalError("one_shot_protected_disk_changed")
            events, receipts = _read(storage, baseline["manifest_sha256"])
            previous = events[-1]["record_sha256"] if events else _GENESIS
            if (
                len(events) != expected_event_count
                or previous != expected_head_sha256
            ):
                raise OneShotRehearsalError("one_shot_transition_cas_conflict")
            now = datetime.now(UTC)
            if event == _RESERVE:
                for x in receipts.values():
                    r = x["reserve"]
                    if (
                        r["entity_id"] == entity_id
                        and x["burn"] is None
                        and _instant(r["expires_at_utc"]) > now
                    ):
                        raise OneShotRehearsalError(
                            "one_shot_active_reservation_exists"
                        )
                chosen = secrets.token_hex(16)
                expires = (now + timedelta(
                    seconds=_WINDOW_SECONDS
                )).isoformat()
                reserved_record_sha = _GENESIS
            else:
                chosen = receipt_id
                assert chosen is not None
                found = receipts.get(chosen)
                if (
                    found is None or found["burn"] is not None
                    or _instant(found["reserve"]["expires_at_utc"]) <= now
                ):
                    raise OneShotRehearsalError(
                        "one_shot_expired_missing_or_already_burned"
                    )
                original = found["reserve"]
                if (
                    original["entity_id"] != entity_id
                    or original["administrator_sha256"] != admin_sha
                    or original["action"] != _ACTION
                    or original["admission_evidence_sha256"]
                    != admission_evidence_sha256
                    or original["approval_intent_sha256"]
                    != approval_intent_sha256
                    or original["journal_sha256"] != expected_journal_sha256
                    or original["draft_sha256"] != expected_draft_sha256
                    or original["journal_revision"] != journal["revision"]
                ):
                    raise OneShotRehearsalError("one_shot_burn_context_mismatch")
                expires = original["expires_at_utc"]
                reserved_record_sha = original["record_sha256"]
            record = {
                "schema_version": 1, "purpose": _PURPOSE,
                "sequence": len(events) + 1,
                "previous_sha256": previous, "event": event,
                "receipt_id": chosen, "entity_id": entity_id,
                "action": _ACTION, "administrator_sha256": admin_sha,
                "baseline_manifest_sha256": baseline["manifest_sha256"],
                "journal_sha256": expected_journal_sha256,
                "journal_revision": journal["revision"],
                "draft_sha256": expected_draft_sha256,
                "admission_evidence_sha256": admission_evidence_sha256,
                "approval_intent_sha256": approval_intent_sha256,
                "reserved_record_sha256": reserved_record_sha,
                "expires_at_utc": expires,
                "event_at_utc": now.isoformat(),
            }
            record["record_sha256"] = _hash(record)
            _record(record, len(events) + 1, previous, baseline["manifest_sha256"])
            directory = _directory(storage, create=True)
            assert directory is not None
            _publish(
                directory, len(events) + 1, record,
                baseline["manifest_sha256"],
            )
            return {
                "status": (
                    "one_shot_reserved_non_authorizing"
                    if event == _RESERVE
                    else "one_shot_burned_without_execution"
                ),
                "receipt": _public(
                    record if event == _RESERVE else original,
                    burned=event == _BURN, now=now,
                ),
                "event_count": len(events) + 1,
                "head_sha256": record["record_sha256"],
                "record_fsync_completed": True,
                "head_fsync_completed": True,
                "journal_changed": False,
                "label_changed": False,
                "production_yaml_changed": False,
                **_non_execution(),
            }
    except (BaselineError, OSError, ValueError, TypeError, KeyError) as exc:
        if isinstance(exc, OneShotRehearsalError):
            raise
        raise OneShotRehearsalError("one_shot_transition_storage_unavailable") from exc
