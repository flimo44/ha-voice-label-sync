"""Safely apply an explicitly reviewed HVLS preview."""

from __future__ import annotations

import hmac
import re
from pathlib import Path
from typing import Any

from hvls import GenerationRequest, run_google_assistant_workflow
from hvls.owned_writer import write_owned_output

from .missing_output_rebuild import rebuild_missing_owned_output
from .preview_guard import (
    PreviewChangedError,
    preview_digest,
    validate_preview_content,
    validate_production_unchanged,
)


def apply_reviewed_preview(
    request: GenerationRequest,
    registries: dict[str, dict[str, Any]],
    preview_path: Path,
    reviewed_digest: str,
    backup_retention: int,
    create_backup_enabled: bool,
    *,
    expected_production_digest: str | None,
    entry_id: str,
    ownership_registry_path: Path,
    rebuild_missing: bool = False,
):
    """Regenerate, verify and write exactly the approved YAML."""
    if not isinstance(reviewed_digest, str) or not re.fullmatch(
        r"[0-9a-f]{64}", reviewed_digest
    ):
        raise PreviewChangedError("Invalid Preview confirmation token.")

    try:
        reviewed_content = preview_path.read_bytes().decode("utf-8")
    except (OSError, UnicodeError) as exc:
        raise PreviewChangedError(
            "Preview unavailable. Generate a new Preview."
        ) from exc

    if not hmac.compare_digest(preview_digest(reviewed_content), reviewed_digest):
        raise PreviewChangedError("Preview has changed since it was reviewed.")

    # Recalculate once, without modifying the production output.
    dry_request = GenerationRequest(
        label=request.label,
        domains=request.domains,
        output_path=request.output_path,
        dry_run=True,
    )

    result = run_google_assistant_workflow(
        request=dry_request,
        registries=registries,
    )

    generated = result.generation

    if generated.entity_count == 0:
        raise PreviewChangedError("No entities selected. Production was not modified.")

    validate_preview_content(reviewed_content, generated.content)
    validate_production_unchanged(request.output_path, expected_production_digest)

    # Missing-file recovery is deliberately NOT a normal overwrite: it
    # requires a distinct explicit Apply action, a null prior digest and
    # a verified existing managed claim. The helper rechecks under lock.
    if rebuild_missing:
        if expected_production_digest is not None:
            raise PreviewChangedError(
                "Missing-output recovery requires an absent production file."
            )
        return rebuild_missing_owned_output(
            output_path=request.output_path,
            content=generated.content,
            entry_id=entry_id,
            ownership_registry_path=ownership_registry_path,
        )

    # Write exactly the content that passed validation.
    return write_owned_output(
        output_path=request.output_path,
        content=generated.content,
        entry_id=entry_id,
        ownership_registry_path=ownership_registry_path,
        backup_directory=request.output_path.parent / ".hvls_backups",
        retention=backup_retention,
        create_backup_enabled=create_backup_enabled,
    )
