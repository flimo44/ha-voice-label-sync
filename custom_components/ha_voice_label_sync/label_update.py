"""Safe preparation of a single HVLS entity label change."""

from __future__ import annotations


class LabelUpdateError(ValueError):
    """A requested label change is unsafe or inconsistent."""


def prepare_label_update(
    current_labels: set[str],
    label_id: str,
    enabled: bool,
    expected_enabled: bool,
) -> set[str]:
    """Return new labels, preserving unrelated labels.

    Refuse stale requests rather than overwriting a concurrent change.
    """
    if not label_id:
        raise LabelUpdateError("Missing HVLS label identifier")

    if not isinstance(enabled, bool) or not isinstance(expected_enabled, bool):
        raise LabelUpdateError("Expected boolean label states")

    current = set(current_labels)
    actual_enabled = label_id in current

    if actual_enabled != expected_enabled:
        raise LabelUpdateError(
            "HVLS label changed since the last refresh"
        )

    if enabled:
        return current | {label_id}

    return current - {label_id}


def resolve_unique_label_id(
    labels: list[dict],
    configured_label: str,
) -> str:
    """Resolve exactly one existing HA label ID for a write operation."""
    from hvls.engine import resolve_label_ids

    candidates, _ = resolve_label_ids(labels, configured_label)

    existing_ids = {
        item["label_id"]
        for item in labels
        if isinstance(item.get("label_id"), str)
        and item["label_id"]
    }

    matches = candidates & existing_ids

    if not matches:
        raise LabelUpdateError(
            f"HVLS label '{configured_label}' does not exist"
        )

    if len(matches) != 1:
        raise LabelUpdateError(
            f"Ambiguous HVLS label '{configured_label}': "
            f"{sorted(matches)}"
        )

    return next(iter(matches))
