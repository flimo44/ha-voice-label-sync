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

from .label_update import ensure_entity_eligible_for_addition, resolve_unique_label_id
from .missing_output_rebuild import rebuild_missing_owned_output
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


def _backup_kind(backup_id: str) -> str:
    if backup_id.endswith(".auto.bak"):
        return "auto"
    if backup_id.endswith(".safety.bak"):
        return "safety"
    return "legacy"


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
            "kind": _backup_kind(backup_id),
            "timestamp": datetime.fromtimestamp(stat.st_mtime).isoformat(
                timespec="seconds"
            ),
            "size": stat.st_size,
            "entities_count": analysis["summary"]["total"],
            "sha256": preview_digest(content),
        })
    return {"backups": result}


def preview_backup_cleanup(
    output_path: Path, ownership_registry_path: Path, *, keep: int = 10,
) -> dict:
    """Preview explicit deletion of older, readable backups of one output.

    Safety and legacy backups are NEVER pruned automatically. A currently
    unresolved restore guard prohibits cleanup altogether.
    """
    if type(keep) is not int or not (1 <= keep <= 100):
        raise BackupRestoreError("Invalid backup history limit.")
    if read_guard(ownership_registry_path) is not None:
        raise BackupRestoreError(
            "A restoration needs reconciliation; backup cleanup is disabled."
        )
    backups = list_backups(output_path)["backups"]
    # Bind ALL accepted names and hashes, not just proposed deletions.
    evidence = preview_digest(json.dumps({
        "output": str(output_path),
        "keep": keep,
        "files": [[entry["id"], entry["sha256"]] for entry in backups],
    }, sort_keys=True, ensure_ascii=False))
    return {
        "keep": keep,
        "total": len(backups),
        "kept": backups[:keep],
        "to_delete": backups[keep:],
        "evidence_sha256": evidence,
    }


def apply_backup_cleanup(
    output_path: Path, ownership_registry_path: Path, *,
    keep: int, evidence_sha256: str, confirmed: bool,
    delete_ids: list[str] | None = None,
) -> dict:
    """Delete the administrator's exact reviewed selection.

    The default retains compatibility with clients that approve the
    suggested older-backup cleanup. Explicit selections may retain older
    backups or include a more recent backup. At least one must survive.

    Must run under the shared HA workflow lock; do not delete while a
    durable restoration hold exists or if inventory hashes changed.
    """
    if (
        confirmed is not True
        or not isinstance(evidence_sha256, str)
        or not _SHA.fullmatch(evidence_sha256)
    ):
        raise BackupRestoreError("Explicit valid cleanup approval required.")
    plan = preview_backup_cleanup(
        output_path, ownership_registry_path, keep=keep
    )
    if not hmac.compare_digest(plan["evidence_sha256"], evidence_sha256):
        raise BackupRestoreError(
            "Backup history changed since preview; review again."
        )
    all_entries = plan["kept"] + plan["to_delete"]
    allowed = {entry["id"]: entry for entry in all_entries}
    if delete_ids is None:
        selected = {entry["id"] for entry in plan["to_delete"]}
    else:
        if (
            not isinstance(delete_ids, list)
            or len(delete_ids) > 5000
            or any(not isinstance(name, str) for name in delete_ids)
            or len(set(delete_ids)) != len(delete_ids)
            or any(name not in allowed for name in delete_ids)
        ):
            raise BackupRestoreError("Invalid cleanup selection.")
        selected = set(delete_ids)
    if not selected:
        raise BackupRestoreError("No backups selected for deletion.")
    if len(selected) >= len(all_entries):
        raise BackupRestoreError("At least one backup must be retained.")
    to_delete = [entry for entry in all_entries if entry["id"] in selected]

    # Check all selected files BEFORE the first deletion. Never trust the
    # browser's proposed list or hashes as write authorization.
    for entry in to_delete:
        candidate = _get_backup(output_path, entry["id"])
        if not hmac.compare_digest(
            preview_digest(_read_yaml(candidate)), entry["sha256"]
        ):
            raise BackupRestoreError(
                "A backup changed during cleanup; nothing deleted."
            )
    deleted = []
    for entry in to_delete:
        candidate = _get_backup(output_path, entry["id"])
        candidate.unlink()
        deleted.append(entry["id"])
    return {
        "deleted_count": len(deleted),
        "kept_count": len(all_entries) - len(deleted),
    }


def prepare_manual_label_preview(
    output_path: Path, catalog: dict, registries: dict,
    label: str, domains: frozenset[str], changes: list[dict],
    *, recovery: bool = False,
) -> dict:
    """Simulate checked/unchecked HVLS labels before writing ANY HA state.

    Approval hashes bind the complete live HA registry snapshot, the current
    YAML, the configuration and the precise requested entity label changes.
    Changes are only made by the separately reviewed Apply WebSocket.
    """
    if (
        not isinstance(changes, list)
        or not (0 if recovery else 1) <= len(changes) <= (500 if recovery else 100)
        or any(
            not isinstance(item, dict)
            or set(item) != {"entity_id", "enabled"}
            or not isinstance(item["entity_id"], str)
            or type(item["enabled"]) is not bool
            for item in changes
        )
    ):
        raise BackupRestoreError("Invalid entity label selection.")
    wanted = {item["entity_id"]: item["enabled"] for item in changes}
    if len(wanted) != len(changes):
        raise BackupRestoreError("Duplicate entity changes in Preview.")
    current = {item["entity_id"]: item for item in catalog["entities"]}
    label_records = registries["label_registry"]["data"]["labels"]
    label_id = resolve_unique_label_id(label_records, label)
    add, remove = [], []
    for entity_id, enabled in sorted(wanted.items()):
        item = current.get(entity_id)
        if item is None:
            raise BackupRestoreError(f"Entity not found: {entity_id}")
        if item["has_label"] is enabled:
            raise BackupRestoreError(f"Label state changed: {entity_id}")
        ensure_entity_eligible_for_addition(item, enabled)
        (add if enabled else remove).append(entity_id)

    production = None
    if output_path.is_symlink():
        raise BackupRestoreError("Production cannot be a symlink.")
    if output_path.exists():
        production = _read_yaml(output_path)
        # Do not overwrite a malformed or unrecognized production YAML.
        analyze_preview(production, None)

    projected = deepcopy(registries)
    for item in projected["entity_registry"]["data"]["entities"]:
        entity_id = item.get("entity_id")
        if entity_id not in wanted:
            continue
        labels = set(item.get("labels") or [])
        if wanted[entity_id]:
            labels.add(label_id)
        else:
            labels.discard(label_id)
        item["labels"] = sorted(labels)

    request = GenerationRequest(
        label=label, domains=domains,
        output_path=output_path, dry_run=True,
    )
    generation = run_google_assistant_workflow(
        request=request, registries=projected,
    ).generation
    if generation.entity_count == 0:
        # An empty selection may be intentional: permit it only when a
        # non-recovery, explicitly reviewed label-removal proposal clears an
        # existing production configuration. All other empty projections
        # remain refused (notably recovery and accidental additions).
        deliberate_last_removal = (
            not recovery
            and bool(remove)
            and not add
            and production is not None
            and analyze_preview(production, None)["summary"]["total"] > 0
        )
        if not deliberate_last_removal:
            raise BackupRestoreError(
                "No selected entities would remain; production was not modified."
            )
    analysis = analyze_preview(generation.content, production)
    if recovery:
        # The old file is the selection source; current HA determines
        # whether each selected entity can still be generated.
        from .preview_compare import _entities

        if production is None:
            raise BackupRestoreError("No old YAML to recover.")
        expected = {
            entity_id for entity_id, options in _entities(production).items()
            if options.get("expose") is True
            and current.get(entity_id, {}).get("eligible") is True
        }
        # Current HA labels also represent deliberate selections made after
        # the old YAML was created. Preserve them during recovery.
        expected.update(
            entity_id for entity_id, item in current.items()
            if item.get("eligible") is True and item.get("has_label") is True
        )
        if set(_entities(generation.content)) != expected:
            raise BackupRestoreError(
                "Recovery Preview differs from eligible old YAML entities."
            )
    if analysis["comparison"]["status"] not in {"ok", "missing"}:
        raise BackupRestoreError("Cannot compare current production YAML.")
    production_sha = preview_digest(production) if production is not None else None
    target_sha = preview_digest(generation.content)
    snapshot_sha = preview_digest(json.dumps(
        registries, sort_keys=True, ensure_ascii=False,
    ))
    approval = preview_digest(json.dumps({
        "label": label, "domains": sorted(domains),
        "output": str(output_path), "production": production_sha,
        "target": target_sha, "snapshot": snapshot_sha,
        "recovery": recovery,
        "changes": sorted(
            [{"entity_id": eid, "enabled": enabled}
             for eid, enabled in wanted.items()],
            key=lambda item: item["entity_id"],
        ),
    }, sort_keys=True, ensure_ascii=False))
    return {
        "mode": "label_preview", "recovery": recovery, "available": True,
        "content": generation.content, "path": "Proposition HVLS",
        "production_path": str(output_path),
        "production_sha256": production_sha,
        "preview_sha256": target_sha,
        "label_plan_sha256": approval,
        "label_plan": {
            "add": add, "remove": remove, "review": [],
        },
        "changes": [{"entity_id": eid, "enabled": wanted[eid]}
                    for eid in sorted(wanted)],
        "projection": {"ready": True, "snapshot_sha256": snapshot_sha},
        "production_summary": (
            analyze_preview(production, None)["summary"]
            if production is not None else None
        ),
        **analysis,
        "can_apply": False,
    }


def _read_optional_production(output_path: Path) -> str | None:
    """Absence is recoverable; a present unreadable YAML is never treated as absent."""
    if output_path.is_symlink():
        raise BackupRestoreError("Production is a symbolic link.")
    if not output_path.exists():
        return None
    production = _read_yaml(output_path)
    try:
        analyze_preview(production, None)
    except PreviewFormatError as exc:
        raise BackupRestoreError("Current production YAML is invalid.") from exc
    return production


def review_backup(output_path: Path, backup_id: str) -> dict:
    """Review a snapshot even if HVLS-managed production was deleted."""
    backup_path = _get_backup(output_path, backup_id)
    candidate = _read_yaml(backup_path)
    production = _read_optional_production(output_path)
    try:
        analysis = analyze_preview(candidate, production)
    except PreviewFormatError as exc:
        raise BackupRestoreError(f"Invalid backup YAML: {exc}") from exc
    if analysis["comparison"].get("status") not in {"ok", "missing"}:
        raise BackupRestoreError("Cannot compare current production YAML.")
    if not analysis["summary"]["total"]:
        raise BackupRestoreError("Refusing to restore an empty YAML backup.")
    return {
        "backup_id": backup_id,
        "backup_sha256": preview_digest(candidate),
        "production_sha256": (
            preview_digest(production) if production is not None else None
        ),
        "production_missing": production is None,
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
    """Public projection summary (see _project_with_generated)."""
    projection, _ = _project_with_generated(
        candidate, output_path, registries, label, domains, ignored,
    )
    return projection


def _project_with_generated(
    candidate: str,
    output_path: Path,
    registries: dict,
    label: str,
    domains: frozenset[str],
    ignored: frozenset[str] = frozenset(),
) -> tuple[dict, str | None]:
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
        }, None
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
    }, generated


# Only these YAML fields may take their current Home Assistant value when an
# administrator restores an entity "with current values". Exposure, entity
# IDs and any other option still have to match the backup exactly.
REFRESHABLE_FIELDS = frozenset({"name", "room"})
# Every option the HVLS generator writes for an entity.
GENERATED_FIELDS = frozenset({"expose", "name", "room"})


def _refresh_candidates(projection: dict | None) -> list[str]:
    """Entities whose only projected differences are their name or room."""
    comparison = (projection or {}).get("comparison") or {}
    if comparison.get("status") != "ok":
        return []
    return sorted(
        row["entity_id"] for row in comparison.get("modified", [])
        if row.get("fields") and set(row["fields"]) <= REFRESHABLE_FIELDS
    )


def _apply_current_values(
    content: str, generated: str, refreshed: frozenset[str],
) -> str:
    """Use the generated name/room for the selected entities only."""
    if not refreshed:
        return content
    from .preview_compare import _entities

    desired = {
        entity_id: dict(options)
        for entity_id, options in _entities(content).items()
    }
    current = _entities(generated)
    for entity_id in sorted(refreshed):
        if entity_id not in desired or entity_id not in current:
            raise BackupRestoreError("Current values unavailable; review again.")
        for field in REFRESHABLE_FIELDS:
            if field in current[entity_id]:
                desired[entity_id][field] = current[entity_id][field]
            else:
                desired[entity_id].pop(field, None)
    return yaml.safe_dump(desired, sort_keys=False, allow_unicode=True)


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


def _prepare_backup_preview_core(
    output_path: Path, backup_id: str,
    backup_sha256: str, production_sha256: str | None,
    catalog: dict,
    *,
    ignored_entities: list[str] | None = None,
    refreshed_entities: list[str] | None = None,
    registries: dict | None = None,
    label: str | None = None,
    domains: frozenset[str] | None = None,
) -> dict:
    """Review the selected backup as a proposal; never write YAML or labels.

    ``refreshed_entities`` restores entities whose only differences are
    their name/room with the values Home Assistant generates today.

    The review includes a projected HA generation when live registry data is
    available. Its readiness is informational until the write transaction
    and recovery protocol have been implemented and tested.
    """
    if (
        not isinstance(backup_sha256, str)
        or not _SHA.fullmatch(backup_sha256)
        or (
            production_sha256 is not None
            and (
                not isinstance(production_sha256, str)
                or not _SHA.fullmatch(production_sha256)
            )
        )
    ):
        raise BackupRestoreError("Invalid preview approval fingerprints.")
    review = review_backup(output_path, backup_id)
    if not hmac.compare_digest(review["backup_sha256"], backup_sha256):
        raise PreviewChangedError("Selected backup changed; review it again.")
    if review["production_sha256"] != production_sha256:
        raise PreviewChangedError("Production changed; review it again.")

    backup_content = _read_yaml(_get_backup(output_path, backup_id))
    production = _read_optional_production(output_path)
    if preview_digest(backup_content) != backup_sha256:
        raise PreviewChangedError("Selected backup changed during preparation.")
    if (preview_digest(production) if production is not None else None) != (
        production_sha256
    ):
        raise PreviewChangedError("Production changed during preparation.")

    # When YAML is missing, the live HA registry is the safe baseline for
    # ignoring obsolete entries or preserving previously labeled entities.
    # This is only a simulation, never mislabeled as production statistics.
    baseline = production
    if production is None:
        if registries is None or not isinstance(label, str) or domains is None:
            raise BackupRestoreError("Live HA registry required for missing YAML.")
        request = GenerationRequest(
            label=label, domains=domains, output_path=output_path, dry_run=True,
        )
        baseline = run_google_assistant_workflow(
            request=request, registries=registries,
        ).generation.content

    from .preview_compare import _entities

    original_targets = _entities(backup_content)
    original_exposed = {
        eid for eid, fields in original_targets.items()
        if fields.get("expose") is True
    }
    entities = {
        entity["entity_id"]: entity
        for entity in catalog.get("entities", [])
        if isinstance(entity, dict) and isinstance(entity.get("entity_id"), str)
    }
    original_diff = (
        analyze_preview(backup_content, baseline)["comparison"]
        if production is None else review["comparison"]
    )
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
    content = _compose_reviewed_restore(backup_content, baseline, ignored)
    if not _entities(content):
        raise BackupRestoreError("Refusing to restore an empty configuration.")

    # Name/room-only differences can be restored with current HA values.
    # Candidates are derived from the ignore-composed backup, so they do not
    # depend on the refresh choice itself.
    refresh_candidates: list[str] = []
    refresh_details: dict[str, dict] = {}
    if refreshed_entities is None:
        refreshed_entities = []
    if (
        not isinstance(refreshed_entities, list)
        or len(refreshed_entities) > 1000
        or any(not isinstance(eid, str) for eid in refreshed_entities)
        or len(refreshed_entities) != len(set(refreshed_entities))
    ):
        raise BackupRestoreError("Invalid current-value selection.")
    if registries is not None and isinstance(label, str) and domains is not None:
        first, generated = _project_with_generated(
            content, output_path, registries, label, domains, ignored,
        )
        refresh_candidates = _refresh_candidates(first)
        refresh_details = {
            row["entity_id"]: row["fields"]
            for row in (first.get("comparison") or {}).get("modified", [])
            if row["entity_id"] in refresh_candidates
        }
    if (
        not set(refreshed_entities).issubset(refresh_candidates)
        or set(refreshed_entities) & ignored
    ):
        raise BackupRestoreError("Invalid current-value selection.")
    refreshed = frozenset(refreshed_entities)
    if refreshed:
        content = _apply_current_values(content, generated, refreshed)

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
            "refreshed_entities": sorted(refreshed),
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
        "refreshed_entities": sorted(refreshed),
        "refresh_candidates": refresh_candidates,
        "refresh_details": refresh_details,
        "production_path": str(output_path),
        "path": f"Backup: {backup_id}",
        "preview_sha256": preview_digest(content),
        "production_summary": (
            analyze_preview(production, None)["summary"]
            if production is not None else None
        ),
        "label_plan": label_plan,
        "label_plan_sha256": approval,
        "projection": projection,
        "can_apply": False,  # The write API owns the final authorization.
    }


def _projection_blockers(result: dict) -> set[str]:
    """Entities still preventing labels from reproducing the restore YAML."""
    comparison = (result.get("projection") or {}).get("comparison") or {}
    if comparison.get("status") != "ok":
        return set()
    return (
        set(comparison.get("added", [])) | set(comparison.get("removed", []))
        | {row["entity_id"] for row in comparison.get("modified", [])}
    )


def _restore_plan(result: dict, backup_content: str, catalog: dict) -> dict:
    """Classify every affected entity for the restore plan table.

    Display data derived from an already validated result. It grants no
    authority: Apply still re-runs the full preparation and approval checks.
    """
    from .preview_compare import _entities

    entities = {
        item["entity_id"]: item for item in catalog.get("entities", [])
        if isinstance(item, dict) and isinstance(item.get("entity_id"), str)
    }
    backup = _entities(backup_content)
    final = {
        entity_id for entity_id, fields in _entities(result["content"]).items()
        if fields.get("expose") is True
    }
    ignored = set(result["ignored_entities"])
    refreshed = set(result["refreshed_entities"])
    candidates = set(result["ignore_candidates"])
    refreshable = set(result["refresh_candidates"])
    blockers = _projection_blockers(result) - refreshed
    rows = []
    for entity_id in sorted(set(backup) | {
        eid for eid, item in entities.items() if item.get("has_label") is True
    }):
        item = entities.get(entity_id)
        labeled = bool(item and item.get("has_label") is True)
        fields = backup.get(entity_id)
        row = {"entity_id": entity_id, "reason": None, "fields": None}
        if fields is None:
            row["case"] = "removed"
            row["choice"] = "keep" if entity_id in ignored else "remove"
            row["choices"] = (
                ["remove", "keep"] if entity_id in candidates else [row["choice"]]
            )
        elif fields.get("expose") is not True or item is None or (
            item.get("eligible") is not True
        ):
            row["case"] = "impossible"
            row["choice"] = "out"
            row["choices"] = []
            row["reason"] = (
                "not_explicitly_exposed" if fields.get("expose") is not True
                else "missing_ha_entity" if item is None
                else item.get("exclusion_reason") or "ineligible"
            )
        elif entity_id in refreshable:
            row["case"] = "renamed"
            row["fields"] = result["refresh_details"].get(entity_id)
            row["choice"] = (
                "current" if entity_id in refreshed
                else "out" if entity_id in ignored else "pending"
            )
            row["choices"] = ["current"] + (
                ["out"] if entity_id in candidates else []
            )
        elif entity_id in blockers or set(fields) - GENERATED_FIELDS:
            # HVLS only generates expose/name/room: other backup options
            # (aliases, ...) can never be reproduced from HA labels.
            row["case"] = "conflict"
            row["fields"] = sorted(set(fields) - GENERATED_FIELDS) or None
            row["choice"] = "out" if entity_id in ignored else "pending"
            row["choices"] = ["out"] if entity_id in candidates else []
        elif not labeled:
            row["case"] = "added"
            row["choice"] = "out" if entity_id in ignored else "in"
            row["choices"] = (
                ["in", "out"] if entity_id in candidates else [row["choice"]]
            )
        else:
            row["case"] = "unchanged"
            row["choice"] = "out" if entity_id in ignored else "in"
            row["choices"] = []
        rows.append(row)

    plan = result["label_plan"]
    labeled_now = {
        eid for eid, item in entities.items() if item.get("has_label") is True
    }
    summary = {
        "exposed_after": len(final),
        "added": len(plan["add"]),
        "already_exposed": len(final & labeled_now),
        "removed": len(plan["remove"]),
        "current_values": len(refreshed),
        "not_restored": sum(
            1 for row in rows
            if row["case"] != "removed" and row["choice"] == "out"
        ),
        "pending": sum(1 for row in rows if row["choice"] == "pending"),
    }
    return {"rows": rows, "summary": summary}


def prepare_backup_preview(
    output_path: Path, backup_id: str,
    backup_sha256: str, production_sha256: str | None,
    catalog: dict,
    *,
    ignored_entities: list[str] | None = None,
    refreshed_entities: list[str] | None = None,
    registries: dict | None = None,
    label: str | None = None,
    domains: frozenset[str] | None = None,
    recommended: bool = False,
) -> dict:
    """Review the selected backup as a proposal; never write YAML or labels.

    With ``recommended``, start from the backup's intended result: entities
    that cannot be regenerated (or differ in non-refreshable options) are not
    restored, and name/room-only differences use current HA values. Every
    step is a complete, validated preparation; the returned explicit lists
    are what the administrator approves and what Apply re-checks.
    """
    def run(ignored: list[str], refreshed: list[str]) -> dict:
        return _prepare_backup_preview_core(
            output_path, backup_id, backup_sha256, production_sha256, catalog,
            ignored_entities=ignored, refreshed_entities=refreshed,
            registries=registries, label=label, domains=domains,
        )

    if recommended:
        if ignored_entities or refreshed_entities:
            raise BackupRestoreError(
                "The recommended selection starts without explicit choices."
            )
        result = run([], [])
        candidates = set(result["ignore_candidates"])
        ignored = {
            row["entity_id"] for row in result["label_plan"]["review"]
        } & candidates
        result = run(sorted(ignored), [])
        refreshed = set(result["refresh_candidates"])
        result = run(sorted(ignored), sorted(refreshed))
        # Remaining differences (custom options, ...) cannot be reproduced:
        # leave those entities out by default, once, then stop.
        remaining = (_projection_blockers(result) - refreshed) & candidates
        if remaining - ignored:
            ignored |= remaining
            result = run(sorted(ignored), [])
            refreshed &= set(result["refresh_candidates"])
            result = run(sorted(ignored), sorted(refreshed - ignored))
    else:
        result = run(ignored_entities, refreshed_entities)

    backup_content = _read_yaml(_get_backup(output_path, backup_id))
    plan = _restore_plan(result, backup_content, catalog)
    return {**result, "restore_rows": plan["rows"],
            "restore_summary": plan["summary"]}


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
    production_sha256: str | None,
    *,
    entry_id: str,
    ownership_registry_path: Path,
    prepared_content: str | None = None,
    prepared_sha256: str | None = None,
) -> dict:
    """Restore only an explicitly reviewed snapshot, after preserving production."""
    if (
        not isinstance(backup_sha256, str) or not _SHA.fullmatch(backup_sha256)
        or (
            production_sha256 is not None
            and (
                not isinstance(production_sha256, str)
                or not _SHA.fullmatch(production_sha256)
            )
        )
    ):
        raise BackupRestoreError("Invalid review tokens.")
    backup_path = _get_backup(output_path, backup_id)
    candidate = _read_yaml(backup_path)
    if not hmac.compare_digest(preview_digest(candidate), backup_sha256):
        raise PreviewChangedError("Selected backup changed since the review.")
    current_review = review_backup(output_path, backup_id)
    if current_review["production_sha256"] != production_sha256:
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
    missing_managed = (
        production_sha256 is None
        and ownership.reason_code == "managed_output_missing"
    )
    if not missing_managed and (
        ownership.status != "managed" or not ownership.write_allowed
    ):
        raise BackupRestoreError(
            "Restore ownership verification failed before creating the hold"
        )
    # A durable hold is created BEFORE the restore write, so an interruption
    # cannot silently re-enable generation/Apply after a process restart.
    create_guard(
        ownership_registry_path,
        entry_id=entry_id, output_path=output_path,
        backup_id=backup_id,
        original_sha256=production_sha256 or preview_digest(""),
        restored_sha256=target_sha256,
    )
    # The shared HA workflow lock serializes restores with other operations.
    # A missing-file recovery creates exclusively and preserves the guard
    # until labels and YAML have been reconciled.
    validate_production_unchanged(output_path, production_sha256)
    try:
        if missing_managed:
            result = rebuild_missing_owned_output(
                output_path=output_path,
                content=target,
                entry_id=entry_id,
                ownership_registry_path=ownership_registry_path,
                restore_backup_id=backup_id,
            )
        else:
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

    if result.backup_path is None and not missing_managed:
        raise BackupRestoreError(
            "Restore safety backup was not created."
        )

    return {
        "restored": True,
        "backup_id": backup_id,
        "safety_backup": (
            result.backup_path.name if result.backup_path else None
        ),
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
