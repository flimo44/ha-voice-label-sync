"""Durable *non-authorizing* migration review drafts with CAS and audit evidence.

Only explicit administrator requests write this private file. Never use a
saved draft as permission to stage labels or cut over Google Assistant.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from collections.abc import Mapping
from datetime import UTC, datetime
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
from .migration_journal import JournalError, _read as _read_journal
from .migration_stage_executor import MigrationStageError, verify_current_sources
from .migration_stage_plan import _decision_data, _valid_entity_id

_FILE = "review-draft.json"
_MAX_BYTES = 1024 * 1024
_MAX_CHOICES = 20_000
_SHA = re.compile(r"^[0-9a-f]{64}$")
_ALLOWED_PHASE = "baseline_ready"
_FIELDS = {
    "schema_version", "purpose", "revision", "baseline_manifest_sha256",
    "journal_revision_at_review", "journal_phase_at_review",
    "source_evidence_sha256", "review_token_sha256", "decisions",
    "reviewed_by_sha256", "updated_at_utc",
}
_ACTIONS = {"import", "keep", "disable", "remove"}


class DecisionDraftError(ValueError):
    """Sanitized code; never log private YAML, names, rooms or aliases."""


def _sha(value: Any) -> bool:
    return isinstance(value, str) and bool(_SHA.fullmatch(value))


def _check_choice(value: Any) -> dict[str, Any]:
    action, metadata, ack, sensitive = _decision_data(value)
    if action not in _ACTIONS:
        raise DecisionDraftError("invalid_entity_decision")
    # Canonicalize to a bounded allow-list. No arbitrary client fields.
    result: dict[str, Any] = {"action": action}
    if metadata is not None:
        result["metadata_policy"] = metadata
    if ack:
        result["acknowledge_change"] = True
    if sensitive:
        result["acknowledge_sensitive_exposure"] = True
    return result


def _choices(decisions: Any, *, allowed_ids: set[str] | None = None) -> dict[str, Any]:
    if not isinstance(decisions, Mapping) or len(decisions) > _MAX_CHOICES:
        raise DecisionDraftError("invalid_decision_inventory")
    clean: dict[str, Any] = {}
    for entity_id, decision in decisions.items():
        if not _valid_entity_id(entity_id):
            raise DecisionDraftError("invalid_entity_id")
        if allowed_ids is not None and entity_id not in allowed_ids:
            raise DecisionDraftError("decision_for_unknown_entity")
        clean[entity_id] = _check_choice(decision)
    return dict(sorted(clean.items()))


def _draft_path(storage: Path) -> Path:
    return storage / _FILE


def _verified_draft(storage: Path, baseline_sha: str) -> dict[str, Any] | None:
    path = _draft_path(storage)
    if path.is_symlink():
        raise DecisionDraftError("draft_invalid_file")
    if not path.exists():
        return None
    try:
        meta = path.stat()
        if meta.st_mode & 0o077 or meta.st_size > _MAX_BYTES:
            raise DecisionDraftError("draft_invalid_file")
        raw = _regular_file(path)
        data = json.loads(raw)
    except (BaselineError, OSError, UnicodeError, ValueError) as exc:
        if isinstance(exc, DecisionDraftError):
            raise
        raise DecisionDraftError("draft_unavailable_or_corrupt") from exc
    if (
        not isinstance(data, dict)
        or set(data) != _FIELDS
        or data.get("schema_version") != 1
        or data.get("purpose") != "admin_review_draft_non_authorizing"
        or type(data.get("revision")) is not int
        or data["revision"] < 0
        or data.get("baseline_manifest_sha256") != baseline_sha
        or not _sha(data.get("source_evidence_sha256"))
        or not _sha(data.get("review_token_sha256"))
        or not _sha(data.get("reviewed_by_sha256"))
        or type(data.get("journal_revision_at_review")) is not int
        or data["journal_revision_at_review"] < 0
        or data.get("journal_phase_at_review") != _ALLOWED_PHASE
        or not isinstance(data.get("updated_at_utc"), str)
    ):
        raise DecisionDraftError("draft_invalid_document")
    data["decisions"] = _choices(data.get("decisions"))
    return data


def _new_file(path: Path, content: bytes) -> None:
    try:
        fd = os.open(
            path,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0),
            0o600,
        )
    except OSError as exc:
        raise DecisionDraftError("draft_write_unavailable") from exc
    try:
        with os.fdopen(fd, "wb", closefd=False) as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
    finally:
        os.close(fd)


def _atomic_commit(storage: Path, content: bytes) -> None:
    if len(content) > _MAX_BYTES:
        raise DecisionDraftError("draft_size_limit")
    if list(storage.glob(".review-draft-pending-*")):
        raise DecisionDraftError("interrupted_draft_write")
    pending = storage / (".review-draft-pending-" + os.urandom(12).hex())
    try:
        _new_file(pending, content)
        os.replace(pending, _draft_path(storage))
        _sync_dir(storage)
    finally:
        pending.unlink(missing_ok=True)


def _public_status(
    draft: dict[str, Any] | None, journal: dict[str, Any],
    baseline_sha: str, *, include_decisions: bool
) -> dict[str, Any]:
    stale = draft is not None and (
        draft["journal_revision_at_review"] != journal["revision"]
        or journal["phase"] != _ALLOWED_PHASE
    )
    status = (
        "not_saved" if draft is None
        else "stale_journal" if stale
        else "saved_unapproved_draft"
    )
    result = {
        "schema_version": 1,
        "status": status,
        "draft_revision": -1 if draft is None else draft["revision"],
        "journal_revision": journal["revision"],
        "journal_phase": journal["phase"],
        "baseline_manifest_sha256": baseline_sha,
        "saved_decision_count": 0 if draft is None else len(draft["decisions"]),
        "source_evidence_sha256": (
            None if draft is None else draft["source_evidence_sha256"]
        ),
        "review_token_sha256": (
            None if draft is None else draft["review_token_sha256"]
        ),
        "stored_choices_unapproved": True,
        "read_only_google_configuration": True,
        "apply_allowed": False,
        "cutover_allowed": False,
    }
    if include_decisions:
        result["decisions"] = {} if draft is None else draft["decisions"]
    return result


def load_review_draft(config_dir: str | Path) -> dict[str, Any]:
    """Read saved choices without changing files; flag stale journal evidence."""
    try:
        storage = storage_directory(config_dir)
        journal = _read_journal(storage)
        baseline_sha = journal["baseline_manifest_sha256"]
        draft = _verified_draft(storage, baseline_sha)
        return _public_status(
            draft, journal, baseline_sha, include_decisions=True
        )
    except (BaselineError, JournalError, OSError, ValueError) as exc:
        if isinstance(exc, DecisionDraftError):
            raise
        raise DecisionDraftError("draft_storage_unavailable") from exc


def save_review_draft(
    config_dir: str | Path,
    *,
    decisions: Mapping[str, Any],
    allowed_entity_ids: set[str],
    source_locations: list[dict[str, Any]],
    source_evidence_sha256: str,
    fresh_review_token_sha256: str,
    expected_review_token_sha256: str,
    expected_baseline_manifest_sha256: str,
    expected_journal_revision: int,
    expected_draft_revision: int,
    administrator_id: str,
) -> dict[str, Any]:
    """Persist user *choices*, never approval, using baseline and journal CAS.

    All evidence comes from a newly computed server-side diagnostic/stage
    plan. Caller must run after a fresh HA snapshot under the shared
    workflow lock; this function additionally uses a cross-process lock.
    """
    if (
        not _sha(expected_baseline_manifest_sha256)
        or not _sha(source_evidence_sha256)
        or not _sha(fresh_review_token_sha256)
        or not _sha(expected_review_token_sha256)
        or expected_review_token_sha256 != fresh_review_token_sha256
        or type(expected_journal_revision) is not int
        or expected_journal_revision < 0
        or type(expected_draft_revision) is not int
        or expected_draft_revision < -1
        or not isinstance(administrator_id, str)
        or not 0 < len(administrator_id) <= 128
    ):
        raise DecisionDraftError("stale_or_invalid_review_confirmation")
    clean = _choices(decisions, allowed_ids=allowed_entity_ids)
    try:
        storage = storage_directory(config_dir)
        with migration_lock(storage):
            journal = _read_journal(storage)
            baseline_sha = _verified_baseline(storage)["manifest_sha256"]
            if (
                baseline_sha != expected_baseline_manifest_sha256
                or journal["baseline_manifest_sha256"] != baseline_sha
            ):
                raise DecisionDraftError("baseline_identity_conflict")
            if (
                journal["phase"] != _ALLOWED_PHASE
                or journal["operations"]
                or journal["revision"] != expected_journal_revision
            ):
                raise DecisionDraftError("journal_changed_or_not_ready")
            try:
                verify_current_sources(
                    config_dir, source_locations, baseline_sha
                )
            except MigrationStageError as exc:
                raise DecisionDraftError("original_sources_changed") from exc
            prior = _verified_draft(storage, baseline_sha)
            revision = -1 if prior is None else prior["revision"]
            if revision != expected_draft_revision:
                raise DecisionDraftError("draft_revision_conflict")
            new_draft = {
                "schema_version": 1,
                "purpose": "admin_review_draft_non_authorizing",
                "revision": revision + 1,
                "baseline_manifest_sha256": baseline_sha,
                "journal_revision_at_review": journal["revision"],
                "journal_phase_at_review": journal["phase"],
                "source_evidence_sha256": source_evidence_sha256,
                "review_token_sha256": fresh_review_token_sha256,
                "decisions": clean,
                "reviewed_by_sha256": hashlib.sha256(
                    administrator_id.encode("utf-8")
                ).hexdigest(),
                "updated_at_utc": datetime.now(UTC).isoformat(),
            }
            _atomic_commit(storage, _json_bytes(new_draft))
            return _public_status(
                new_draft, journal, baseline_sha, include_decisions=False
            )
    except (BaselineError, JournalError, OSError, ValueError) as exc:
        if isinstance(exc, DecisionDraftError):
            raise
        raise DecisionDraftError("draft_storage_unavailable") from exc
