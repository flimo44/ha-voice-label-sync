"""Read-only backup browsing and safe, reviewed HVLS YAML restoration."""

from __future__ import annotations

import hmac
import json
import os
import re
import shutil
from copy import deepcopy
from datetime import datetime
from pathlib import Path

import yaml

from hvls import FileWriterError, GenerationRequest, run_google_assistant_workflow
from hvls.engine import resolve_label_ids
from hvls.output_ownership_registry import OwnershipRegistry
from hvls.owned_writer import (
    _operation_lock,
    _verify_current_file,
    evaluate_registered_output,
    write_owned_output,
)

from .preview_compare import PreviewFormatError, analyze_preview
from .preview_guard import (
    PreviewChangedError,
    preview_digest,
    validate_production_unchanged,
)
from .restore_guard import clear_guard, create_guard, read_guard

MAX_BACKUP_BYTES = 1024 * 1024
_SHA = re.compile(r"[0-9a-f]{64}\Z")


class BackupRestoreError(ValueError):
    """Backup is not safe to read or restore."""


def _backup_directory(output_path: Path) -> Path:
    return output_path.parent / ".hvls_backups"


def _backup_names(output_path: Path) -> list[str]:
    directory = _backup_directory(output_path)
    if not directory.is_dir() or directory.is_symlink():
        return []
    pattern = re.compile(
        re.escape(output_path.name)
        + r"\.\d{8}-\d{6}(?:\.(?:auto|safety))?\.bak\Z"
    )
    return sorted(
        (p.name for p in directory.iterdir()
         if pattern.fullmatch(p.name) and p.is_file() and not p.is_symlink()),
        reverse=True,
    )


def _get_backup(output_path: Path, backup_id: str) -> Path:
    if not isinstance(backup_id, str) or backup_id not in _backup_names(output_path):
        raise BackupRestoreError("Backup not found or not permitted.")
    path = _backup_directory(output_path) / backup_id
    if path.is_symlink() or not path.is_file():
        raise BackupRestoreError("Backup is not a regular file.")
    return path


def _read_yaml(path: Path) -> str:
    if path.is_symlink() or not path.is_file():
        raise BackupRestoreError("YAML file is missing or not a regular file.")
    if path.stat().st_size > MAX_BACKUP_BYTES:
        raise BackupRestoreError("YAML file exceeds the maximum supported size.")
    try:
        return path.read_bytes().decode("utf-8")
    except (OSError, UnicodeError) as exc:
        raise BackupRestoreError("Cannot read the YAML file.") from exc


def list_backups(output_path: Path) -> dict:
    """List only backups belonging to the configured production filename."""
    result = []
    for backup_id in _backup_names(output_path):
        try:
            path = _get_backup(output_path, backup_id)
            stat = path.stat()
            content = _read_yaml(path)
            analysis = analyze_preview(content, None)
            if not analysis["summary"]["total"]:
                continue  # Never offer an empty YAML snapshot for restoration.
        except (OSError, BackupRestoreError, PreviewFormatError):
            continue
        result.append({
            "id": backup_id,
            "timestamp": datetime.fromtimestamp(stat.st_mtime).isoformat(
                timespec="seconds"
            ),
            "size": stat.st_size,
            "entities_count": analysis["summary"]["total"],
            "sha256": preview_digest(content),
        })
    return {"backups": result}


def review_backup(output_path: Path, backup_id: str) -> dict:
    """Return a semantic diff with immutable tokens for the selected backup."""
    backup_path = _get_backup(output_path, backup_id)
    candidate = _read_yaml(backup_path)
    try:
        production = _read_yaml(output_path)
    except BackupRestoreError as exc:
        raise BackupRestoreError(
            "Cannot compare: current production YAML is unavailable."
        ) from exc
    try:
        analysis = analyze_preview(candidate, production)
    except PreviewFormatError as exc:
        raise BackupRestoreError(f"Invalid backup YAML: {exc}") from exc
    if analysis["comparison"].get("status") != "ok":
        raise BackupRestoreError("Cannot restore while production YAML is invalid.")
    if not analysis["summary"]["total"]:
        raise BackupRestoreError("Refusing to restore an empty YAML backup.")
    return {
        "backup_id": backup_id,
        "backup_sha256": preview_digest(candidate),
        "production_sha256": preview_digest(production),
        "summary": analysis["summary"],
        "comparison": analysis["comparison"],
    }


def _project_restored_yaml(
    candidate: str,
    output_path: Path,
    registries: dict,
    label: str,
    domains: frozenset[str],
    ignored: frozenset[str] = frozenset(),
) -> dict:
    """Simulate desired labels using copies of the live HA registries.

    Report differences that cannot be reconstructed from labels alone
    (renamed rooms/entities, custom YAML attributes, missing entities).
    This function does not modify Home Assistant or files.
    """
    from .preview_compare import _entities

    desired = {
        entity_id for entity_id, fields in _entities(candidate).items()
        if fields.get("expose") is True
    }
    projected = deepcopy(registries)
    label_records = projected["label_registry"]["data"]["labels"]
    candidates, _ = resolve_label_ids(label_records, label)
    matches = {
        entry["label_id"] for entry in label_records
        if entry.get("label_id") in candidates
    }
    if len(matches) != 1:
        return {
            "ready": False,
            "reason": "HVLS label unavailable or ambiguous",
            "comparison": None,
        }
    label_id = next(iter(matches))
    for entity in projected["entity_registry"]["data"]["entities"]:
        if entity["entity_id"] in ignored:
            continue  # Ignored entities keep their current HA labels.
        labels = set(entity.get("labels") or [])
        if entity["entity_id"] in desired:
            labels.add(label_id)
        else:
            labels.discard(label_id)
        entity["labels"] = sorted(labels)

    request = GenerationRequest(
        label=label, domains=domains,
        output_path=output_path, dry_run=True,
    )
    generated = run_google_assistant_workflow(
        request=request, registries=projected,
    ).generation.content
    comparison = analyze_preview(generated, candidate)["comparison"]
    return {
        "ready": comparison["status"] == "ok"
        and comparison["identical_entities"] is True,
        "reason": None,
        "comparison": comparison,
    }


def _compose_reviewed_restore(
    backup: str, production: str, ignored: frozenset[str],
) -> str:
    """Merge selected backup entities while preserving ignored production states.

    The untouched inputs retain their exact text. A real partial merge is
    serialized and reviewed as a new proposal before any write.
    """
    if not ignored:
        return backup
    from .preview_compare import _entities

    desired = _entities(backup).copy()
    current = _entities(production)
    for entity_id in ignored:
        if entity_id in current:
            desired[entity_id] = current[entity_id]
        else:
            desired.pop(entity_id, None)
    if desired == current:
        return production  # No-op stays byte-for-byte identical.
    if desired == _entities(backup):
        return backup
    return yaml.safe_dump(desired, sort_keys=False, allow_unicode=True)


def prepare_backup_preview(
    output_path: Path, backup_id: str,
    backup_sha256: str, production_sha256: str,
    catalog: dict,
    *,
    ignored_entities: list[str] | None = None,
    registries: dict | None = None,
    label: str | None = None,
    domains: frozenset[str] | None = None,
) -> dict:
    """Review the selected backup as a proposal; never write YAML or labels.

    The review includes a projected HA generation when live registry data is
    available. Its readiness is informational until the write transaction
    and recovery protocol have been implemented and tested.
    """
    if not all(
        isinstance(value, str) and _SHA.fullmatch(value)
        for value in (backup_sha256, production_sha256)
    ):
        raise BackupRestoreError("Invalid preview approval fingerprints.")
    review = review_backup(output_path, backup_id)
    if not hmac.compare_digest(review["backup_sha256"], backup_sha256):
        raise PreviewChangedError("Selected backup changed; review it again.")
    if not hmac.compare_digest(
        review["production_sha256"], production_sha256
    ):
        raise PreviewChangedError("Production changed; review it again.")

    backup_content = _read_yaml(_get_backup(output_path, backup_id))
    production = _read_yaml(output_path)
    if preview_digest(backup_content) != backup_sha256:
        raise PreviewChangedError("Selected backup changed during preparation.")
    if preview_digest(production) != production_sha256:
        raise PreviewChangedError("Production changed during preparation.")

    from .preview_compare import _entities

    original_targets = _entities(backup_content)
    original_production = _entities(production)
    original_exposed = {
        eid for eid, fields in original_targets.items()
        if fields.get("expose") is True
    }
    entities = {
        entity["entity_id"]: entity
        for entity in catalog.get("entities", [])
        if isinstance(entity, dict) and isinstance(entity.get("entity_id"), str)
    }
    original_diff = review["comparison"]
    eligible_to_ignore = (
        set(original_diff["added"]) | set(original_diff["removed"]) |
        {row["entity_id"] for row in original_diff["modified"]}
    )
    for entity_id, fields in original_targets.items():
        item = entities.get(entity_id)
        if (
            fields.get("expose") is not True or item is None
            or item.get("eligible") is not True
            or item.get("has_label") is not True
        ):
            eligible_to_ignore.add(entity_id)
    for entity_id, item in entities.items():
        if item.get("has_label") is True and entity_id not in original_exposed:
            eligible_to_ignore.add(entity_id)

    if ignored_entities is None:
        ignored_entities = []
    if (
        not isinstance(ignored_entities, list)
        or len(ignored_entities) > 1000
        or any(not isinstance(eid, str) for eid in ignored_entities)
        or len(ignored_entities) != len(set(ignored_entities))
        or not set(ignored_entities).issubset(eligible_to_ignore)
    ):
        raise BackupRestoreError("Invalid ignored entity selection.")
    ignored = frozenset(ignored_entities)
    content = _compose_reviewed_restore(backup_content, production, ignored)
    if not _entities(content):
        raise BackupRestoreError("Refusing to restore an empty configuration.")

    targets = _entities(content)
    exposed = {
        entity_id for entity_id, fields in targets.items()
        if fields.get("expose") is True
    }
    additions = []
    removals = []
    review_needed = []

    for entity_id, fields in sorted(targets.items()):
        if entity_id in ignored:
            continue
        if fields.get("expose") is not True:
            review_needed.append({
                "entity_id": entity_id, "reason": "not_explicitly_exposed",
            })
            continue
        entity = entities.get(entity_id)
        if entity is None:
            review_needed.append({
                "entity_id": entity_id, "reason": "missing_ha_entity",
            })
        elif entity.get("eligible") is not True:
            review_needed.append({
                "entity_id": entity_id,
                "reason": entity.get("exclusion_reason") or "ineligible",
            })
        elif entity.get("has_label") is not True:
            additions.append(entity_id)

    for entity_id, entity in sorted(entities.items()):
        if entity_id in ignored:
            continue
        if entity.get("has_label") is True and entity_id not in exposed:
            removals.append(entity_id)

    projection = None
    if registries is not None:
        if not isinstance(label, str) or domains is None:
            raise BackupRestoreError("Missing current HVLS generation settings")
        projection = _project_restored_yaml(
            content, output_path, registries, label, domains, ignored,
        )

    label_plan = {
        "add": additions,
        "remove": removals,
        "review": review_needed,
        "current_label_count": catalog.get("labeled"),
    }
    # Approval evidence covers the exact proposed HA label operations and
    # the projected generation, not only the backup and production hashes.
    approval = preview_digest(json.dumps(
        {
            "labels": label_plan, "projection": projection,
            "label": label, "domains": sorted(domains) if domains else None,
            "output": str(output_path),
            "backup_sha256": backup_sha256,
            "production_sha256": production_sha256,
            "ignored_entities": sorted(ignored),
            "target_sha256": preview_digest(content),
        },
        sort_keys=True, ensure_ascii=False,
    ))
    return {
        **review,
        **analyze_preview(content, production),
        "available": True,
        "mode": "restore_preview",
        "content": content,
        "ignored_entities": sorted(ignored),
        "ignore_candidates": sorted(eligible_to_ignore),
        "production_path": str(output_path),
        "path": f"Backup: {backup_id}",
        "preview_sha256": preview_digest(content),
        "production_summary": analyze_preview(production, None)["summary"],
        "label_plan": label_plan,
        "label_plan_sha256": approval,
        "projection": projection,
        "can_apply": False,  # The write API owns the final authorization.
    }


def complete_preview_restoration(
    output_path: Path, ownership_registry_path: Path, *,
    entry_id: str, backup_sha256: str,
) -> dict:
    """Release durable restore hold only for a verified final YAML.

    The caller must first confirm regenerated live HA labels match this YAML.
    Any failure leaves the hold intact to require explicit recovery.
    """
    with _operation_lock(ownership_registry_path):
        guard = read_guard(ownership_registry_path)
        if (
            guard is None or guard["entry_id"] != entry_id
            or guard["output_path"] != str(output_path)
            or guard["restored_sha256"] != backup_sha256
        ):
            raise BackupRestoreError("Restore guard does not match this review")
        validate_production_unchanged(output_path, backup_sha256)
        ownership = evaluate_registered_output(
            output_path, entry_id, ownership_registry_path,
        )
        if ownership.status != "managed" or not ownership.write_allowed:
            raise BackupRestoreError("Restored YAML ownership is inconsistent")
        clear_guard(ownership_registry_path, guard)
        return {"reconciled": True, "production_sha256": backup_sha256}


def _safety_backup(output_path: Path) -> Path:
    """Create an independent, unique safety backup before replacing production."""
    directory = _backup_directory(output_path)
    if directory.is_symlink():
        raise BackupRestoreError("Backup directory cannot be a symbolic link.")
    directory.mkdir(parents=True, exist_ok=True)
    # The standard backup filename is retained for compatibility with existing lists.
    # Refuse timestamp collisions rather than overwriting any previous backup.
    for attempt in range(10):
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        name = f"{output_path.name}.{stamp}.bak"
        destination = directory / name
        try:
            fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            import time
            time.sleep(0.12)
            continue
        try:
            with os.fdopen(fd, "wb") as target, output_path.open("rb") as source:
                shutil.copyfileobj(source, target)
                target.flush()
                os.fsync(target.fileno())
            return destination
        except BaseException:
            destination.unlink(missing_ok=True)
            raise
    raise BackupRestoreError("Safety backup name already exists. Retry later.")


def _entities_nonempty(content: str) -> bool:
    from .preview_compare import _entities
    return bool(_entities(content))


def restore_reviewed_backup(
    output_path: Path,
    backup_id: str,
    backup_sha256: str,
    production_sha256: str,
    *,
    entry_id: str,
    ownership_registry_path: Path,
    prepared_content: str | None = None,
    prepared_sha256: str | None = None,
) -> dict:
    """Restore only an explicitly reviewed snapshot, after preserving production."""
    if not all(isinstance(value, str) and _SHA.fullmatch(value)
               for value in (backup_sha256, production_sha256)):
        raise BackupRestoreError("Invalid review tokens.")
    backup_path = _get_backup(output_path, backup_id)
    candidate = _read_yaml(backup_path)
    if not hmac.compare_digest(preview_digest(candidate), backup_sha256):
        raise PreviewChangedError("Selected backup changed since the review.")
    current_review = review_backup(output_path, backup_id)
    if not hmac.compare_digest(current_review["production_sha256"], production_sha256):
        raise PreviewChangedError("Production changed since the review.")
    # The server supplies only a freshly recomputed proposal. Never accept
    # mismatched partial content or a forged target fingerprint.
    if prepared_content is None:
        target = candidate
    else:
        if (
            not isinstance(prepared_sha256, str)
            or not _SHA.fullmatch(prepared_sha256)
            or preview_digest(prepared_content) != prepared_sha256
        ):
            raise BackupRestoreError("Prepared restoration content changed.")
        target = prepared_content
    if not _entities_nonempty(target):
        raise BackupRestoreError("Refusing an empty restored configuration.")
    target_sha256 = preview_digest(target)

    # Re-check bytes on disk immediately before writing.
    validate_production_unchanged(output_path, production_sha256)
    # Recheck the selected backup before the ownership transaction.
    if not hmac.compare_digest(
        preview_digest(_read_yaml(backup_path)), backup_sha256
    ):
        raise PreviewChangedError(
            "Selected backup changed before restore."
        )

    ownership = evaluate_registered_output(
        output_path, entry_id, ownership_registry_path,
    )
    if ownership.status != "managed" or not ownership.write_allowed:
        raise BackupRestoreError(
            "Restore ownership verification failed before creating the hold"
        )
    # A durable hold is created BEFORE the restore write, so an interruption
    # cannot silently re-enable generation/Apply after a process restart.
    create_guard(
        ownership_registry_path,
        entry_id=entry_id, output_path=output_path,
        backup_id=backup_id, original_sha256=production_sha256,
        restored_sha256=target_sha256,
    )
    # The supported HA endpoints serialize restoration and generation via
    # the shared HA workflow lock. Recheck once more after installing the hold
    # before invoking the existing atomic writer.
    validate_production_unchanged(output_path, production_sha256)
    try:
        result = write_owned_output(
            output_path=output_path,
            content=target,
            entry_id=entry_id,
            ownership_registry_path=ownership_registry_path,
            backup_directory=_backup_directory(output_path),
            restore_mode=True,
        )
    except (FileWriterError, ValueError) as exc:
        raise BackupRestoreError(
            f"Restore ownership authorization failed: {exc}"
        ) from exc

    if result.backup_path is None:
        raise BackupRestoreError(
            "Restore safety backup was not created."
        )

    return {
        "restored": True,
        "backup_id": backup_id,
        "safety_backup": result.backup_path.name,
        "bytes_written": result.bytes_written,
        "reconciliation_required": True,
    }


def resolve_restored_output(
    output_path: Path,
    preview_path: Path,
    *, entry_id: str, ownership_registry_path: Path,
    production_sha256: str, preview_sha256: str,
    resolution: str, confirmed: bool, generated_content: str,
) -> dict:
    """Close a durable restore hold after explicit, fresh administrative review.

    keep_restored requires semantic equality of the generated Preview and
    restored production YAML. keep_current_labels intentionally authorizes a
    *future, separate* Apply, without changing YAML or HA labels here.
    cancel_failed is only for a restoration that did not change production.
    """
    if confirmed is not True or resolution not in {
        "keep_restored", "keep_current_labels", "cancel_failed",
    }:
        raise BackupRestoreError("Explicit restore decision required")
    if not all(isinstance(v, str) and _SHA.fullmatch(v)
               for v in (production_sha256, preview_sha256)):
        raise BackupRestoreError("Invalid reconciliation fingerprints")

    with _operation_lock(ownership_registry_path):
        guard = read_guard(ownership_registry_path)
        if guard is None or guard["entry_id"] != entry_id or (
            guard["output_path"] != str(output_path)
        ):
            raise BackupRestoreError("No matching restoration to reconcile")
        if preview_path.is_symlink() or output_path.is_symlink():
            raise BackupRestoreError("Unsafe reconciliation file")
        production = _read_yaml(output_path)
        preview = _read_yaml(preview_path)
        current_sha = preview_digest(production)
        current_preview_sha = preview_digest(preview)
        if (not hmac.compare_digest(current_sha, production_sha256)
                or not hmac.compare_digest(current_preview_sha, preview_sha256)):
            raise PreviewChangedError("Production or Preview changed; review again")
        # Preview must match a fresh generation from live HA registries, not
        # a stale or manually altered file with the right-looking digest.
        if not isinstance(generated_content, str) or preview != generated_content:
            raise PreviewChangedError(
                "Preview no longer matches live HA labels; regenerate first"
            )

        record = OwnershipRegistry(ownership_registry_path).get_record(entry_id)
        if (record is None or record.get("state") != "managed"
                or record.get("output_path") != str(output_path)
                or record.get("sha256") != current_sha):
            raise BackupRestoreError("Ownership verification failed")
        _verify_current_file(output_path, current_sha)

        expected = (guard["original_sha256"] if resolution == "cancel_failed"
                    else guard["restored_sha256"])
        if not hmac.compare_digest(current_sha, expected):
            raise BackupRestoreError("Restore state changed; manual review required")

        try:
            comparison = analyze_preview(preview, production)["comparison"]
        except PreviewFormatError as exc:
            raise BackupRestoreError("Cannot verify restored YAML") from exc
        if comparison["status"] != "ok":
            raise BackupRestoreError("Reconciliation comparison unavailable")
        if resolution == "keep_restored" and (
            not comparison["identical_entities"]
        ):
            raise BackupRestoreError(
                "Preview is not yet aligned with restored production"
            )
        # A deliberate acceptance of current labels does not apply them to
        # production. The administrator must perform a separate reviewed Apply.
        clear_guard(ownership_registry_path, guard)
    return {
        "resolved": True, "resolution": resolution,
        "production_unchanged": True, "apply_performed": False,
        "comparison": {
            "added": len(comparison["added"]),
            "removed": len(comparison["removed"]),
            "modified": len(comparison["modified"]),
        },
    }
