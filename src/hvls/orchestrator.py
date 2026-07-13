"""Workflow orchestration for HA Voice Label Sync."""

from __future__ import annotations

from pathlib import Path

from .backends import render_google_assistant
from .engine import select_entities
from .models import GenerationRequest, WorkflowResult
from .registry import load_json
from .writers import write_with_backup


class WorkflowError(Exception):
    """Raised when an HVLS workflow cannot be completed safely."""


def run_google_assistant_workflow(
    request: GenerationRequest,
    storage_path: Path,
    backup_directory: Path | None = None,
    backup_retention: int = 5,
) -> WorkflowResult:
    """Run the complete Google Assistant generation workflow.

    Args:
        request: Generation parameters.
        storage_path: Home Assistant ``.storage`` directory.
        backup_directory: Optional directory used for backups.
        backup_retention: Maximum number of backups to retain.

    Returns:
        Structured workflow result.

    Raises:
        WorkflowError: If writing is requested but no entity matches.
    """
    entity_registry = load_json(
        storage_path / "core.entity_registry"
    )
    device_registry = load_json(
        storage_path / "core.device_registry"
    )
    area_registry = load_json(
        storage_path / "core.area_registry"
    )
    label_registry = load_json(
        storage_path / "core.label_registry"
    )

    selection = select_entities(
        request=request,
        entity_registry=entity_registry,
        device_registry=device_registry,
        area_registry=area_registry,
        label_registry=label_registry,
    )

    generation = render_google_assistant(selection)

    if request.dry_run:
        return WorkflowResult(
            generation=generation,
            write_result=None,
            dry_run=True,
        )

    # Safety rule: an incorrect label must never silently replace an existing
    # configuration with an empty generated file.
    if generation.entity_count == 0:
        raise WorkflowError(
            "Generation returned no entity; output file was not modified."
        )

    resolved_backup_directory = (
        backup_directory
        if backup_directory is not None
        else request.output_path.parent / ".hvls_backups"
    )

    write_result = write_with_backup(
        output_path=request.output_path,
        content=generation.content,
        backup_directory=resolved_backup_directory,
        retention=backup_retention,
    )

    return WorkflowResult(
        generation=generation,
        write_result=write_result,
        dry_run=False,
    )
