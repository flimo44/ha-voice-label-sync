"""Google Assistant YAML backend for HA Voice Label Sync."""

from __future__ import annotations

import json

from ..models import GenerationResult, SelectionResult


def _one_line(value: object) -> str:
    """Collapse ALL Unicode whitespace, including YAML line separators.

    A Home Assistant room name is also rendered in a YAML comment, so raw
    newlines and Unicode separators must never reach that comment.
    """
    return " ".join(str(value).split())


def yaml_escape(value: object) -> str:
    """Emit a YAML string scalar, never a numeric/bool/null YAML value.

    JSON's double-quoted strings are YAML-compatible. Normalize Unicode
    whitespace first so U+0085, U+2028 and U+2029 cannot act as YAML
    line breaks. Keep ordinary non-ASCII characters readable in the file.
    """
    return json.dumps(_one_line(value), ensure_ascii=False)

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
            lines.append(f"# --- {_one_line(entity.room or 'Sans pièce')} ---")

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
