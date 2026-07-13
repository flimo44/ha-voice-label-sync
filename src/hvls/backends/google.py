"""Google Assistant YAML backend for HA Voice Label Sync."""

from __future__ import annotations

import json
import re

from ..models import GenerationResult, SelectionResult

YAML_RESERVED_WORDS = {
    "y",
    "yes",
    "n",
    "no",
    "true",
    "false",
    "on",
    "off",
    "null",
    "~",
    "none",
}

YAML_QUOTING_PATTERN = r'[:#{}\[\],&*?|\-<>=!%@`"\']'


def yaml_escape(value: object) -> str:
    """Return a value safe for use as a YAML string scalar."""
    text = str(value).strip()

    if not text:
        return '""'

    if text.lower() in YAML_RESERVED_WORDS:
        return json.dumps(text, ensure_ascii=False)

    if re.fullmatch(r"[+-]?\d+(\.\d+)?", text):
        return json.dumps(text, ensure_ascii=False)

    if re.search(YAML_QUOTING_PATTERN, text):
        return json.dumps(text, ensure_ascii=False)

    return text


def render_google_assistant(
    selection: SelectionResult,
) -> GenerationResult:
    """Render selected entities as Google Assistant entity configuration.

    Args:
        selection: Neutral entities selected by the HVLS engine.

    Returns:
        Generated YAML and structured generation metadata.
    """
    lines = [
        "# Fichier généré automatiquement.",
        "# Ne pas modifier à la main.",
        "# Ajouter/retirer l'étiquette HA pour gérer l'exposition Google Assistant.",
        "",
    ]

    current_room: str | None | object = object()

    for entity in selection.entities:
        if entity.room != current_room:
            current_room = entity.room
            lines.append(f"# --- {entity.room or 'Sans pièce'} ---")

        lines.append(f"{entity.entity_id}:")
        lines.append("  expose: true")
        lines.append(f"  name: {yaml_escape(entity.name)}")

        if entity.room:
            lines.append(f"  room: {yaml_escape(entity.room)}")

        lines.append("")

    content = "\n".join(lines).rstrip() + "\n"

    return GenerationResult(
        content=content,
        entities=selection.entities,
        domain_counts=dict(selection.domain_counts),
        warnings=selection.warnings,
    )
