"""Durable *review attestation*, never an execution approval or capability.

A human can attest that the saved draft and its observed risks were reviewed.
The record is separate from the draft and transaction journal. It cannot
authorize staging, changing Google YAML, reloading, or cutover.
"""

from __future__ import annotations

import hashlib
import json
import os
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
from .migration_decision_draft import _verified_draft
from .migration_journal import JournalError, read_journal
from .migration_stage_executor import MigrationStageError, verify_current_sources

_FILENAME = "review-attestation.json"
_MAX_BYTES = 16 * 1024
_ALLOWED_FIELDS = {
    "schema_version", "purpose", "revision",
    "baseline_manifest_sha256", "journal_revision",
    "draft_revision", "draft_review_token_sha256",
    "review_evidence_sha256", "reviewed_by_sha256",
    "reviewed_at_utc", "observed_issues", "acknowledged_issues",
}
_STATES = {"reviewed_with_open_issues", "reviewed_without_detected_issues"}


class AttestationError(ValueError):
    """Machine-readable, never containing original names or YAML values."""


def _digest(value: Any) -> str:
    try:
        raw = json.dumps(
            value, ensure_ascii=False, sort_keys=True,
            separators=(",", ":"), allow_nan=False,
        ).encode("utf-8")
    except (ValueError, TypeError, UnicodeError) as exc:
        raise AttestationError("review_evidence_invalid") from exc
    if len(raw) > 16 * 1024 * 1024:
        raise AttestationError("review_evidence_too_large")
    return hashlib.sha256(raw).hexdigest()


def review_evidence(report: Mapping[str, Any]) -> dict[str, Any]:
    """Fingerprint whole fresh diagnostics and private-preview digest.

    Never return raw diagnostic in this attestation payload. No downstream
    writer should ever treat this hash as a migration authorization.
    """
    if not isinstance(report, Mapping):
        raise AttestationError("review_unavailable")
    diag, plan, simulation, impact, consumers = (
        report.get("diagnostic"), report.get("preflight"),
        report.get("simulation"), report.get("pre_stage_impact"),
        report.get("indirect_consumer_audit"),
    )
    if (
        not isinstance(diag, Mapping)
        or not isinstance(plan, Mapping)
        or report.get("protected_baseline_status") != "verified"
        or not isinstance(simulation, Mapping)
        or not isinstance(impact, Mapping)
        or not isinstance(consumers, Mapping)
        or consumers.get("read_only") is not True
        or consumers.get("stage_allowed") is not False
        or consumers.get("cutover_allowed") is not False
        or consumers.get("external_consumers_verified") is not False
        or diag.get("read_only") is not True
        or plan.get("read_only") is not True
        or simulation.get("read_only") is not True
        or impact.get("read_only") is not True
        or impact.get("stage_allowed") is not False
        or impact.get("cutover_allowed") is not False
        or impact.get("other_label_consumers_verified") is not False
        or impact.get("google_home_state_verified") is not False
        or plan.get("cutover_allowed") is not False
        or simulation.get("cutover_allowed") is not False
        or simulation.get("stage_review_token_sha256")
        != plan.get("review_token_sha256")
        or not isinstance(plan.get("review_token_sha256"), str)
        or len(plan["review_token_sha256"]) != 64
    ):
        raise AttestationError("complete_readonly_review_required")
    # The full projection may include local anomalies; they must remain
    # visible and never silently become a label-staging authorization.
    summary = simulation.get("summary")
    if not isinstance(summary, Mapping):
        raise AttestationError("invalid_review_summary")
    issues = (
        bool(plan.get("global_blockers"))
        or bool(simulation.get("global_blockers"))
        or (
            isinstance(summary.get("needs_review"), int)
            and summary["needs_review"] > 0
        )
        or simulation.get("status") != "hypothetical_preview_consistent"
        or plan.get("summary", {}).get("needs_review", 0) > 0
        or impact.get("status") not in {
            "no_manual_policy_delta_detected",
            "no_label_additions_proposed",
        }
        or bool(impact.get("global_blockers"))
        or impact.get("summary", {}).get("needs_review", 0) > 0
        # The bounded scan cannot certify all HA/third-party listeners.
        # An attestation can only record the unverified observation.
        or consumers.get("status") != "indirect_effects_unverified"
        or bool(consumers.get("reason_codes", []))
    )
    if (
        type(summary.get("needs_review")) is not int
        or summary["needs_review"] < 0
        or type(summary.get("considered")) is not int
        or summary["considered"] <= 0
    ):
        raise AttestationError("invalid_review_summary")
    return {
        "review_evidence_sha256": _digest({
            "diagnostic": diag, "plan": plan, "simulation": simulation,
            "pre_stage_impact": impact,
            "indirect_consumer_audit": consumers,
        }),
        "review_token_sha256": plan["review_token_sha256"],
        "observed_issues": bool(issues),
        "inventory_count": summary["considered"],
        "status": (
            "reviewed_with_open_issues" if issues
            else "reviewed_without_detected_issues"
        ),
        "review_does_not_prove_google_home_parity": True,
        "apply_allowed": False,
        "cutover_allowed": False,
    }


def _file(storage: Path) -> Path:
    return storage / _FILENAME


def _read(storage: Path, baseline_sha: str) -> dict[str, Any] | None:
    path = _file(storage)
    if path.is_symlink():
        raise AttestationError("attestation_invalid_file")
    if not path.exists():
        return None
    try:
        meta = path.stat()
        if meta.st_size > _MAX_BYTES or meta.st_mode & 0o077:
            raise AttestationError("attestation_invalid_file")
        data = json.loads(_regular_file(path))
    except (BaselineError, OSError, ValueError, UnicodeError) as exc:
        if isinstance(exc, AttestationError):
            raise
        raise AttestationError("attestation_unreadable") from exc
    if (
        not isinstance(data, dict)
        or set(data) != _ALLOWED_FIELDS
        or data.get("schema_version") != 1
        or data.get("purpose") != "review_attested_not_authorized"
        or type(data.get("revision")) is not int
        or data["revision"] < 0
        or data.get("baseline_manifest_sha256") != baseline_sha
        or type(data.get("journal_revision")) is not int
        or data["journal_revision"] < 0
        or type(data.get("draft_revision")) is not int
        or data["draft_revision"] < 0
        or any(
            not isinstance(data.get(key), str)
            or len(data[key]) != 64
            or any(c not in "0123456789abcdef" for c in data[key])
            for key in (
                "draft_review_token_sha256",
                "review_evidence_sha256",
                "reviewed_by_sha256",
            )
        )
        or not isinstance(data.get("reviewed_at_utc"), str)
        or type(data.get("observed_issues")) is not bool
        or type(data.get("acknowledged_issues")) is not bool
        or (data["observed_issues"] and not data["acknowledged_issues"])
    ):
        raise AttestationError("attestation_invalid_document")
    return data


def _public(
    attestation: dict[str, Any] | None, *,
    stale: bool = False,
    reported_evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    observed = attestation is not None and attestation["observed_issues"]
    status = (
        "not_attested" if attestation is None
        else "stale_review_attestation" if stale
        else "reviewed_with_open_issues" if observed
        else "reviewed_without_detected_issues"
    )
    return {
        "schema_version": 1,
        "status": status,
        "attestation_revision": (
            -1 if attestation is None else attestation["revision"]
        ),
        "bound_draft_revision": (
            None if attestation is None else attestation["draft_revision"]
        ),
        "observed_issues": (
            None if attestation is None else observed
        ),
        "reviewed_at_utc": (
            None if attestation is None else attestation["reviewed_at_utc"]
        ),
        "fresh_review_evidence": reported_evidence,
        "review_is_not_execution_authorization": True,
        "google_home_state_verified": False,
        "apply_allowed": False,
        "cutover_allowed": False,
    }


def load_attestation(
    config_dir: str | Path,
    *,
    current_evidence: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Return an attestation status, stale unless fresh proof matches.

    Loading without live evidence cannot claim that the attestation remains
    valid. Consumers must run a fresh server review to verify its status.
    """
    try:
        storage = storage_directory(config_dir)
        journal = read_journal(config_dir)
        baseline_sha = _verified_baseline(storage)["manifest_sha256"]
        attestation = _read(storage, baseline_sha)
        draft = _verified_draft(storage, baseline_sha)
        stale = attestation is not None and (
            draft is None
            or draft["revision"] != attestation["draft_revision"]
            or draft["review_token_sha256"]
            != attestation["draft_review_token_sha256"]
            or journal["revision"] != attestation["journal_revision"]
            or journal["phase"] != "baseline_ready"
            or bool(journal["operations"])
            or not isinstance(current_evidence, Mapping)
            or current_evidence.get("review_evidence_sha256")
            != attestation["review_evidence_sha256"]
            or current_evidence.get("review_token_sha256")
            != attestation["draft_review_token_sha256"]
        )
        return _public(attestation, stale=stale)
    except (BaselineError, JournalError, OSError, ValueError) as exc:
        if isinstance(exc, AttestationError):
            raise
        raise AttestationError("attestation_storage_unavailable") from exc


def _atomic_write(storage: Path, document: dict[str, Any]) -> None:
    raw = _json_bytes(document)
    if len(raw) > _MAX_BYTES:
        raise AttestationError("attestation_too_large")
    if list(storage.glob(".review-attestation-pending-*")):
        raise AttestationError("interrupted_attestation_write")
    pending = storage / (".review-attestation-pending-" + os.urandom(12).hex())
    try:
        fd = os.open(
            pending,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL
            | getattr(os, "O_NOFOLLOW", 0),
            0o600,
        )
        try:
            with os.fdopen(fd, "wb", closefd=False) as output:
                output.write(raw)
                output.flush()
                os.fsync(output.fileno())
        finally:
            os.close(fd)
        os.replace(pending, _file(storage))
        _sync_dir(storage)
    finally:
        pending.unlink(missing_ok=True)


def attest_review(
    config_dir: str | Path,
    *,
    expected_attestation_revision: int,
    expected_draft_revision: int,
    expected_baseline_manifest_sha256: str,
    expected_journal_revision: int,
    source_locations: list[dict[str, Any]],
    current_evidence: Mapping[str, Any],
    expected_review_evidence_sha256: str,
    administrator_id: str,
    confirmed: bool,
    acknowledge_issues: bool,
) -> dict[str, Any]:
    """Write an observational human attestation under protected CAS.

    Authorizes no further action. Caller MUST compute current_evidence from
    a fresh server-only HA diagnostic and saved draft, never a browser value.
    """
    evidence = review_evidence(current_evidence)
    if (
        confirmed is not True
        or type(acknowledge_issues) is not bool
        or (evidence["observed_issues"] and not acknowledge_issues)
        or type(expected_attestation_revision) is not int
        or expected_attestation_revision < -1
        or type(expected_draft_revision) is not int
        or expected_draft_revision < 0
        or type(expected_journal_revision) is not int
        or expected_journal_revision < 0
        or not isinstance(administrator_id, str)
        or not 0 < len(administrator_id) <= 128
        or expected_review_evidence_sha256
        != evidence["review_evidence_sha256"]
        or not isinstance(expected_baseline_manifest_sha256, str)
        or len(expected_baseline_manifest_sha256) != 64
    ):
        raise AttestationError("explicit_review_confirmation_required")
    try:
        storage = storage_directory(config_dir)
        with migration_lock(storage):
            journal = read_journal(config_dir)
            baseline_sha = _verified_baseline(storage)["manifest_sha256"]
            if (
                journal["phase"] != "baseline_ready"
                or journal["operations"]
                or journal["revision"] != expected_journal_revision
                or baseline_sha != expected_baseline_manifest_sha256
            ):
                raise AttestationError("baseline_or_journal_changed")
            try:
                verify_current_sources(
                    config_dir, source_locations, baseline_sha
                )
            except MigrationStageError as exc:
                raise AttestationError("original_sources_changed") from exc
            draft = _verified_draft(storage, baseline_sha)
            if (
                draft is None
                or draft["revision"] != expected_draft_revision
                or draft["journal_revision_at_review"]
                != journal["revision"]
                or draft["source_evidence_sha256"] is None
                or draft["review_token_sha256"]
                != evidence["review_token_sha256"]
            ):
                raise AttestationError("draft_changed_or_not_saved")
            prior = _read(storage, baseline_sha)
            revision = -1 if prior is None else prior["revision"]
            if revision != expected_attestation_revision:
                raise AttestationError("attestation_revision_conflict")
            record = {
                "schema_version": 1,
                "purpose": "review_attested_not_authorized",
                "revision": revision + 1,
                "baseline_manifest_sha256": baseline_sha,
                "journal_revision": journal["revision"],
                "draft_revision": draft["revision"],
                "draft_review_token_sha256": draft["review_token_sha256"],
                "review_evidence_sha256": evidence["review_evidence_sha256"],
                "reviewed_by_sha256": hashlib.sha256(
                    administrator_id.encode("utf-8")
                ).hexdigest(),
                "reviewed_at_utc": datetime.now(UTC).isoformat(),
                "observed_issues": evidence["observed_issues"],
                "acknowledged_issues": acknowledge_issues,
            }
            _atomic_write(storage, record)
            return _public(record)
    except (BaselineError, JournalError, OSError, ValueError) as exc:
        if isinstance(exc, AttestationError):
            raise
        raise AttestationError("attestation_storage_unavailable") from exc
